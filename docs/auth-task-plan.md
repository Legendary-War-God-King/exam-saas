# Auth 模块 — 任务规划

> Phase 2 | 原则: TDD 红绿重构，每功能提交，≤10 文件

## 任务拆解

### T1: Prisma 建表 + 迁移

- [ ] `schema.prisma`: 加 Tenant + User 模型（Enums: Plan, UserRole 已有）
- [ ] `npx prisma migrate dev --name add_tenant_user`
- [ ] 验证: `prisma db push --dry-run` 无变更

### T2: AuthService (register)

- [ ] `AuthService.register(dto)`: 创建 Tenant + User (ADMIN)，事务保证
- [ ] 先写 test: 注册成功返回 token / 重复邮箱 409 / 密码 <8 位 400 / tenantName 空 400
- [ ] 实现
- [ ] 验证: `pnpm test -- auth.service`

### T3: AuthService (login)

- [ ] `AuthService.login(dto)`: 查 User + 验 bcrypt + 签发 JWT
- [ ] 先写 test: 登录成功 / 邮箱不存在 401 / 密码错误 401
- [ ] 实现
- [ ] 验证: `pnpm test -- auth.service`

### T4: AuthService (refresh)

- [ ] `AuthService.refresh(token)`: 验 Refresh + 轮换签发
- [ ] 先写 test: refresh 成功 / 过期 Token 401 / 伪造 Token 401
- [ ] 实现
- [ ] 验证: `pnpm test -- auth.service`

### T5: JWT + Passport Strategy

- [ ] `JwtStrategy`: `passport-jwt` 从 Authorization Bearer 提取，查 Redis 黑名单
- [ ] `AuthService.generateTokens()`: 签发 Access + Refresh
- [ ] 验证: `pnpm test -- jwt.strategy`

### T6: AuthController

- [ ] `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- [ ] Swagger 装饰器
- [ ] 先写 test (Supertest e2e): 各路由及错误码
- [ ] 实现
- [ ] 验证: `pnpm test:e2e`

### T7: Guards + Decorators

- [ ] `JwtAuthGuard`: extend AuthGuard('jwt')
- [ ] `RolesGuard`: 读 `@Roles()` 装饰器，匹配 `req.user.role`
- [ ] `TenantGuard`: 从 `req.user.tenant_id` 注入 `req.tenant`，全局应用
- [ ] `@Roles()` 装饰器
- [ ] 先写 test
- [ ] 实现
- [ ] 验证: `pnpm test -- guard`

### T8: Redis 限流

- [ ] `AuthController` 加 `@Throttle()` 装饰器: login 5/min, register 3/hour
- [ ] 安装 `@nestjs/throttler` + `@nest-lab/throttler-storage-redis`
- [ ] 验证: e2e test 连发 6 次登录请求，第 6 次 429

### T9: Seed 脚本

- [ ] `prisma/seed.ts`: 读 SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD 环境变量
- [ ] 幂等: ADMIN 已存在则跳过
- [ ] 验证: 空库运行 `prisma db seed` → 能登录

## 依赖关系

```
T1 (建表)
 └─ T2 (register) ── T5 (JWT) ── T6 (controller)
     └─ T3 (login) ── T5           └─ T8 (限流)
         └─ T4 (refresh)           └─ T7 (guards)
                                   
T9 (seed) — 独立，T1 完成后可并行
```

## 提交计划

| Commit | 包含 | 文件数 |
|--------|------|--------|
| `feat: T1 Prisma schema add Tenant + User` | schema.prisma + migration | ~3 |
| `feat: T2 AuthService.register` | auth.service + test + dto | ~5 |
| `feat: T3 AuthService.login` | auth.service + test | ~3 |
| `feat: T4 AuthService.refresh` | auth.service + test | ~3 |
| `feat: T5 JWT strategy + token generation` | jwt.strategy + auth.service | ~3 |
| `feat: T6 AuthController + e2e` | controller + e2e test | ~4 |
| `feat: T7 Guards + decorators` | 3 guards + 1 decorator + tests | ~8 |
| `feat: T8 Redis rate limiting` | throttler config + e2e update | ~3 |
| `feat: T9 Seed script` | seed.ts | ~1 |

## 验证清单

- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm test` — unit tests all green
- [ ] `pnpm test:e2e` — e2e tests all green
- [ ] `pnpm build` — no TSC errors
- [ ] 手动: register → login → access protected route → refresh → 登录失败 6 次触发 429
