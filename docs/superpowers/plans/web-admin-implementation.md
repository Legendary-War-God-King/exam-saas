# Web Admin — 实施计划

> Phase 3 | 每个 task 2-5 分钟, 零 TODO, 零 "略"

## Task 0: 项目脚手架 (5 min)

**步骤：**
1. `mkdir -p D:/实习项目/企业级项目/web/src/{pages/dashboard/{question-banks,exams},components,lib,styles}`
2. 写 `web/package.json`:
```json
{
  "name": "@exam-saas/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18",
    "axios": "^1.7.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.35",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```
3. 写 `web/tsconfig.json` — 严格模式, paths `@/*` → `./src/*`
4. 写 `web/next.config.mjs` — rewrites `/api/*` → `http://localhost:4000/api/*`, poweredByHeader: false
5. 写 `web/tailwind.config.ts` — content: `./src/**/*.{ts,tsx}`
6. 写 `web/postcss.config.mjs`
7. 写 `web/.eslintrc.json` — extends next/core-web-vitals + next/typescript
8. 写 `web/src/styles/globals.css` — @tailwind base/components/utilities
9. `pnpm install`

**验收：** `pnpm dev` 启动 Next.js，访问 localhost:3000 不报错

---

## Task 1: API 层 + Auth Store (3 min)

**文件 1.1 — `web/src/lib/api.ts`:**
```typescript
import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

**文件 1.2 — `web/src/lib/store.ts`:**
```typescript
import { create } from 'zustand';

interface User { id: string; name: string; email: string; role: string; }

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  login: (user: User, accessToken: string, refreshToken: string, tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: null,
  tenantId: null,
  login: (user, accessToken, refreshToken, tenantId) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, refreshToken, tenantId });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, tenantId: null });
  },
}));
```

**验收：** TypeScript 编译无错误

---

## Task 2: Shared 组件 (5 min)

**文件 2.1 — `web/src/components/ProtectedRoute.tsx`:**
```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  if (!accessToken) return null;
  return <>{children}</>;
}
```

**文件 2.2 — `web/src/components/Sidebar.tsx`:**
```tsx
import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/dashboard', label: '首页', icon: 'H' },
  { href: '/dashboard/users', label: '用户管理', icon: 'U' },
  { href: '/dashboard/question-banks', label: '题库管理', icon: 'Q' },
  { href: '/dashboard/exams', label: '考试管理', icon: 'E' },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-lg font-bold mb-6">Exam SaaS</h1>
      <nav className="space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
              router.pathname.startsWith(l.href) ? 'bg-gray-700' : 'hover:bg-gray-800'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center bg-gray-600 rounded text-xs">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

**文件 2.3 — `web/src/components/Layout.tsx`:**
```tsx
import { useAuthStore } from '@/lib/store';
import Sidebar from './Sidebar';

export default function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user?.name}</span>
            <button onClick={logout} className="text-red-500 hover:underline">退出</button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

**文件 2.4 — `web/src/components/Modal.tsx`:**
```tsx
export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

**验收：** 组件文件存在，lint 无错误

---

## Task 3: /login 页面 (3 min)

**文件 — `web/src/pages/login.tsx`:**
- 表单: email + password, 提交调 POST /auth/login
- 成功后: `useAuthStore.login(user, accessToken, refreshToken, tenantId)` → router.push('/dashboard')
- 错误: 显示红色文字 "邮箱或密码错误"
- 已登录: `useEffect` 检测 accessToken → redirect /dashboard

**验收：** 访问 localhost:3000/login, 输入 admin@test.com / Admin123456 → 跳转 dashboard

---

## Task 4: _app.tsx + 首页 (3 min)

**文件 4.1 — `web/src/pages/_app.tsx`:**
```tsx
import type { AppProps } from 'next/app';
import '@/styles/globals.css';
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

**文件 4.2 — `web/src/pages/index.tsx`:**
```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}
```

**文件 4.3 — `web/src/pages/dashboard/index.tsx`:**
- ProtectedRoute + Layout 包裹
- 调 GET /question-banks + GET /exams + GET /tenant/users
- 3 张统计卡片: 题库数 / 考试数 / 用户数
- 最近考试列表 (前 5 条, 含状态标签)

**验收：** /dashboard 显示统计卡片

---

## Task 5: 用户管理页面 (4 min)

**文件 — `web/src/pages/dashboard/users.tsx`:**
- GET /tenant/users → 表格
- 搜索框 → filter, 角色下拉 → filter
- 创建按钮 → Modal → 表单(name/email) → POST /tenant/users → alert 显示 tempPassword
- 启用/禁用按钮 → PATCH /tenant/users/:id { action: "enable"|"disable" }

**验收：** 表格展示用户, 创建教师弹 tempPassword, 禁用按钮可点击

---

## Task 6: 题库列表 + 题目管理 (5 min)

**文件 6.1 — `web/src/pages/dashboard/question-banks/index.tsx`:**
- GET /question-banks → 卡片网格 (name + 题目数)
- 创建 → Modal
- 点击卡片 → router.push

**文件 6.2 — `web/src/pages/dashboard/question-banks/[id].tsx`:**
- GET /question-banks/:id + GET /question-banks/:id/questions
- 题目表格 (题型/题干/难度/答案)
- 创建题目 → Modal 表单 (type/content/options/answer/difficulty/tags)
- 批量导入 → Modal textarea → POST import
- 编辑/删除题目

**验收：** 卡片列表 → 点击进详情 → 题目表格 → 创建题目 → 批量导入

---

## Task 7: 考试管理页面 (5 min)

**文件 7.1 — `web/src/pages/dashboard/exams/index.tsx`:**
- GET /exams → 表格 + 状态标签 + 创建 Modal

**文件 7.2 — `web/src/pages/dashboard/exams/[id].tsx`:**
- GET /exams/:id → 考试信息 + 已选题目标
- 添加题目 → Modal (从题库选)
- 发布 → PATCH publish → 显示 accessCode
- Tab: 试卷 | 成绩分析
- 成绩 Tab: GET statistics + GET analysis + GET results
- CSV 导出按钮

**文件 7.3 — `web/src/pages/dashboard/exams/result.tsx`:**
- 路由: /dashboard/exams/[examId]/result?studentId=
- GET /exams/:examId/results → 单个学生详情

**验收：** 考试列表 → 创建 → 添加题目 → 发布 → 看 accessCode → 成绩分析 Tab

---

## Task 8: Phase 5 前端设计 (2 min)

调用 `frontend-design` 审查：
- 字体: Noto Sans SC (中文字体)
- 色彩: 不是默认 Tailwind 蓝, 用 brand color
- 动效: 卡片入场 stagger

---

## Task 9: Phase 6 Code Review (2 min)

整个 diff 跑 Code Reviewer, 关注 security (XSS/CSRF), performance, correctness.

---

## Task 10: Phase 7 验证 (3 min)

1. `pnpm dev` 确认运行
2. `Skill("webapp-testing")` — Playwright 浏览器测试
3. 验证: 登录 → 题库 → 考试 → 成绩 完整流程
4. 截图存 docs/verification/
