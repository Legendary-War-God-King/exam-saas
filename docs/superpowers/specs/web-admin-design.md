# Next.js 管理后台 设计文档

> Huang-bao-sheng Phase 1 | 2026-05-28

## 1. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Next.js 14 (Pages Router) | WZRY 验证过，与后端一致的栈 |
| 样式 | Tailwind CSS 3 | 同上 |
| 状态 | zustand (auth store) | 轻量，无 Provider 包裹 |
| HTTP | axios + interceptor | 自动注入 JWT，401 跳登录 |
| 语言 | TypeScript (strict) | 全栈一致 |
| 包管理 | pnpm (workspace with backend/) | 同项目 workspace |

## 2. 目录结构

```
web/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .eslintrc.json
├── src/
│   ├── pages/
│   │   ├── _app.tsx              # Layout wrapper
│   │   ├── login.tsx             # /login
│   │   ├── dashboard/
│   │   │   ├── index.tsx         # /dashboard 首页统计
│   │   │   ├── users.tsx         # /dashboard/users
│   │   │   ├── question-banks/
│   │   │   │   ├── index.tsx     # /dashboard/question-banks
│   │   │   │   └── [id].tsx      # /dashboard/question-banks/[id]
│   │   │   └── exams/
│   │   │       ├── index.tsx     # /dashboard/exams
│   │   │       ├── [id].tsx      # /dashboard/exams/[id] 详情+分析
│   │   │       └── result.tsx    # /dashboard/exams/result?id=&examId=
│   │   └── index.tsx             # 根路径重定向到 /login
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar + Header + 内容区
│   │   ├── Sidebar.tsx           # 导航菜单
│   │   └── ProtectedRoute.tsx    # JWT 检查，未登录跳/login
│   ├── lib/
│   │   ├── api.ts                # axios 实例 + interceptor
│   │   └── store.ts              # zustand auth store
│   └── styles/
│       └── globals.css           # Tailwind directives
```

## 3. API 层

### axios 实例 (lib/api.ts)

```typescript
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### 代理 (next.config.mjs)

```javascript
async rewrites() {
  return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }];
}
```

## 4. 状态管理 (zustand)

```typescript
interface AuthState {
  user: { id: string; name: string; email: string; role: string } | null;
  accessToken: string | null;
  tenantId: string | null;
  login: (user, token, tenantId) => void;
  logout: () => void;
}
```

## 5. 页面详情

### 5.1 /login

- 表单：email + password
- POST /auth/login → 成功后存 zustand + localStorage
- 跳转 /dashboard
- 错误提示：中文"邮箱或密码错误"
- 已登录用户访问 /login → 重定向 /dashboard

### 5.2 /dashboard (首页)

- 调用 GET /exams + GET /question-banks
- 统计卡片：考试数量、题库数量、用户数量
- 最近考试列表（前 5 条）

### 5.3 /dashboard/users

- GET /tenant/users → 表格（name, email, role, 状态, 操作）
- 搜索框 + 角色筛选下拉
- 创建按钮 → Modal 表单（name, email）→ POST /tenant/users → 显示 tempPassword
- 启用/禁用按钮 → PATCH /tenant/users/:id

### 5.4 /dashboard/question-banks

- GET /question-banks → 卡片列表（名称 + 题目数量）
- 创建按钮 → Modal（name, description）→ POST /question-banks
- 点击卡片进入 /dashboard/question-banks/[id]
- 删除按钮（软删除）

### 5.5 /dashboard/question-banks/[id]

- GET /question-banks/:id → 题库信息头
- GET /question-banks/:id/questions → 题目表格（题型/题干/难度/答案）
- 创建题目 → Modal 表单（type/content/options/answer/difficulty/tags）
- 批量导入 → Modal textarea（JSON 格式）→ POST /question-banks/:id/questions/import
- 编辑/删除题目

### 5.6 /dashboard/exams

- GET /exams → 表格（title, status, 题目数, 操作）
- 状态标签：DRAFT(灰) / PUBLISHED(绿) / IN_PROGRESS(蓝) / FINISHED(橙)
- 创建按钮 → Modal（title/description/timeLimit/passScore/antiCheat）
- 点击标题进入 /dashboard/exams/[id]

### 5.7 /dashboard/exams/[id]

- GET /exams/:id → 考试信息 + 已选题目列表
- 添加题目：从题库选题 → POST /exams/:id/questions
- 移除题目、调整分值/排序
- 发布按钮 → PATCH /exams/:id/publish → 显示 accessCode
- Tab 切换：试卷 / 成绩分析
- 成绩分析：GET /exams/:id/statistics + /exams/:id/analysis + /exams/:id/results
- 导出 CSV 按钮

### 5.8 /dashboard/exams/result

- GET /exams/:examId/results → 单个学生成绩详情
- 查询参数 ?examId=&studentId=

## 6. Shared Components

| 组件 | 用途 |
|------|------|
| Layout | Sidebar + 顶栏 + `<main>{children}</main>` |
| Sidebar | 导航：首页/用户管理/题库管理/考试管理 |
| ProtectedRoute | 检查 zustand token，无 token → redirect /login |
| Modal | 通用弹窗（表单/确认） |
| Pagination | 分页组件 |
| StatusBadge | 状态标签（考试/用户状态） |

## 7. Auth 流程

```
/login → POST /auth/login → 存 accessToken/refreshToken → zustand + localStorage
          ↓
ProtectedRoute → 检查 zustand accessToken → 有 → 渲染页面
                                          → 无 → redirect /login
          ↓
axios response 401 → 清 token → redirect /login
```

## 8. 不做

- 注册页（管理端不注册）
- 学生端（这是 H5 项目，不在 web/ 范围）
- 忘记密码 / 重置密码
- 多语言 / i18n
- 暗色模式
