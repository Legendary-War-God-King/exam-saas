# Exam SaaS — 进度日志

> 分支: main | CI: 🔄 | 阶段: 用户管理模块完成
> 下一步: 题库 CRUD + Excel 导入 (Week 3-4)
> 阻塞: 无

## 2026-05-27

### Day 0: 基础设施骨架 ✅

**交付:**
- Docker Compose (PostgreSQL 17 + Redis 7 + Nginx)
- NestJS 骨架 (strictTypeChecked + Swagger + Helmet + CORS)
- Prisma 空 schema
- Sentry (`@sentry/nestjs`, DSN 已配置)
- 健康检查 `GET /api/v1/health`
- GitHub Actions CI (lint → test → build, pnpm 10.33.2)

**验证:**
- ✅ `pnpm lint` — 0 errors
- ✅ `pnpm test` — 1 passed
- ✅ `pnpm test:e2e` — 1 passed
- ✅ `pnpm build` — succeeded
- ✅ Docker 三容器 running
- ✅ CI 全绿 (4 commits, 2 fixes: cache-dependency-path + pnpm version pin)
- ✅ Sentry DSN 配置完毕

**项目文件 (24 files):**
```
企业级项目/
├── .github/workflows/ci.yml
├── .npmrc
├── .prettierrc / .prettierignore / .gitignore
├── pnpm-workspace.yaml / pnpm-lock.yaml
├── infra/docker-compose.yml + nginx/nginx.conf + .env.example
├── backend/
│   ├── package.json / tsconfig.json / nest-cli.json / eslint.config.mjs
│   ├── .env.example
│   ├── prisma/schema.prisma (空)
│   ├── src/main.ts (Sentry + global pipes + Swagger + Helmet)
│   ├── src/app.module.ts / app.controller.ts / app.service.ts
│   └── test/app.e2e-spec.ts / jest-e2e.json
└── docs/开题报告.md
```

**GitHub:** https://github.com/Legendary-War-God-King/exam-saas

**后悔日志:** 进入计划模式前没先确认 Day 0 具体范围，写了 43 文件的计划被用户否定。规则：模糊指令先问范围再计划。

---

### Auth 模块 ✅

**Phase 1-4: 设计 → 任务规划 → TDD 实现**

**交付:**
- Prisma schema: Tenant + User 模型 (Plan/UserRole 枚举)
- prisma.config.ts: Prisma 7 迁移配置
- AuthService: register / login / refresh (bcrypt salt=12)
- JWT: Access 15min + Refresh 7d, HS256, payload {sub, tenant_id, role, type}
- DTO: RegisterDto / LoginDto / RefreshDto (class-validator)
- Controller: 3 路由 + Swagger + @Throttle(5/min, 3/hour)
- Guards: JwtAuthGuard + RolesGuard + TenantGuard (全局注入 tenant_id)
- Seed: prisma/seed.ts (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD 环境变量)
- Bcrypt 测试 hash 用 hashSync 动态生成，不硬编码

**验证:**
- ✅ `pnpm lint` — 0 errors
- ✅ `pnpm test` — 14 passed (4 suites: auth.service + roles.guard + tenant.guard + app.controller)
- ✅ `pnpm build` — 0 errors
- ✅ `prisma migrate dev` — add_tenant_user 成功
- ✅ CI 全绿 (3 fixes: lockfile sync + prisma generate in CI + bcrypt test hash)

**CI 修复历程:**
1. cache-dependency-path → 根目录 pnpm-lock.yaml
2. pnpm latest → 10.33.2 (minimumReleaseAge 策略)
3. 加 --frozen-lockfile → 删 @types/bcryptjs 后重建 lockfile
4. Lint 60 错误 → CI 加 prisma generate 步骤
5. DTO strictPropertyInitialization → 属性加 `!` 断言

**后悔日志:** 本地 lint 通过但 CI Lint 爆 60 个错误 — Prisma client 类型在 CI 上没生成。以后加 ORM 的 CI pipeline 第一时间配 prisma generate。

---

### 用户管理模块 ✅

**Phase 1-4: 设计 → TDD 实现**

**交付:**
- Schema: mustChangePassword + disabledAt (migration `add_user_management_fields`)
- GET /auth/me: JWT Guard, 含 Tenant 关联 (3 e2e cases)
- POST /auth/set-password: Temp JWT 验证，改密后签发正式双 Token
- POST /tenant/users: ADMIN 创建 TEACHER, 8 位随机密码，tempPassword 仅一次可见
- GET /tenant/users: 分页+搜索(name/email)+角色筛选，自动过滤本租户
- PATCH /tenant/users/:id: enable/disable，防自禁 (403)
- login: disabledAt→403, mustChangePassword→temp JWT (type: "set-password", 30min)
- DTO: RegisterDto / LoginDto / RefreshDto / SetPasswordDto / CreateUserDto / UpdateUserDto

**验证:**
- ✅ `pnpm lint` — 0 errors
- ✅ `pnpm test` — 16 passed (4 suites: auth.service + roles.guard + tenant.guard + app.controller)
- ✅ `pnpm test:e2e` — 4 passed (app + auth-me)
- ✅ `pnpm build` — 0 errors

**后悔日志:** Prisma migrate 后没 regenerate client，build TSC 报 7 个类型错误（新字段不存在）。以后 migrate 后立即 prisma generate。
