# Auth 模块设计文档

> 版本: V1.0 | 日期: 2026-05-28 | 状态: 设计完毕

## 1. 概述

教师/管理员通过邮箱+密码认证，JWT 双 Token 机制，租户级数据隔离。

## 2. 数据模型

### Tenant

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | |
| name | String | 租户名称 |
| plan | Enum(FREE/PRO/ENTERPRISE) | 默认 FREE |
| created_at | DateTime | |
| updated_at | DateTime | |

### User

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (PK) | |
| tenant_id | uuid (FK → Tenant) | 所属租户 |
| role | Enum(ADMIN/TEACHER) | 默认 TEACHER |
| name | String | 显示名 |
| email | String | 登录邮箱 |
| password_hash | String | bcrypt salt=12 |
| created_at | DateTime | |
| updated_at | DateTime | |

约束: `UNIQUE(tenant_id, email)`

## 3. API 设计

### POST /api/v1/auth/register

创建租户 + 首个 ADMIN。一个请求完成两步（事务）：

```
Request:
{
  "tenantName": "阳光培训中心",
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "Abc12345"
}

Response (201):
{
  "tenant": { "id": "...", "name": "阳光培训中心" },
  "user": { "id": "...", "name": "张三", "email": "...", "role": "ADMIN" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

校验:
- email 格式 `IsEmail()`
- password `@MinLength(8)`
- tenantName `@MinLength(2)`

### POST /api/v1/auth/login

```
Request:
{
  "email": "zhangsan@example.com",
  "password": "Abc12345"
}

Response (200):
{
  "accessToken": "...",
  "refreshToken": "...",
  "tenantId": "...",
  "user": { "id": "...", "name": "...", "role": "..." }
}
```

错误:
- 401: 邮箱或密码错误（模糊提示，防枚举）
- 429: 超过频率限制

### POST /api/v1/auth/refresh

```
Request:
{ "refreshToken": "..." }

Response (200):
{ "accessToken": "...", "refreshToken": "..." }
```

## 4. JWT 设计

| 参数 | 值 |
|------|----|
| 算法 | HS256 |
| 密钥 | `JWT_SECRET` / `REFRESH_SECRET` 环境变量，启动时硬校验，缺失抛 Error |
| Access Token 过期 | 15 分钟 |
| Refresh Token 过期 | 7 天 |
| Payload | `{ sub: user_id, tenant_id, role, type: "access"\|"refresh" }` |

Refresh Token 轮换: 每次 refresh 签发新 Refresh Token，旧 Token 立即失效。

## 5. Guard 体系

```
JwtAuthGuard      — 验证 Access Token，注入 req.user
RolesGuard        — @Roles(ADMIN) 装饰器，限制 ADMIN 操作
TenantGuard       — 全局 Guard，从 req.user.tenant_id 提取租户，注入 req.tenant
```

TenantGuard 层级:

```
请求 → JwtAuthGuard → RolesGuard → TenantGuard → Controller
```

## 6. 安全措施

| 措施 | 实现 |
|------|------|
| 密码哈希 | bcrypt, salt=12 |
| JWT 签名 | HS256, 密钥存 .env |
| 密码校验 | `@MinLength(8)`，允许所有字符 |
| 登录限流 | Redis, 5 次/分钟/IP |
| 注册限流 | Redis, 3 次/小时/IP |
| 租户隔离 | TenantGuard 全局注入 tenant_id，所有 Prisma 查询追加 `where: { tenantId }` |
| 错误提示 | 登录失败返回 "邮箱或密码错误"，不区分用户不存在 vs 密码错误 |

## 7. Seed 脚本

`backend/prisma/seed.ts`:

```typescript
// 读取环境变量: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
// 创建第一个 Tenant + ADMIN User
// 幂等: 检查 ADMIN 已存在则跳过
```

运行: `pnpm prisma db seed`

首次部署流程:
1. 配置 .env 中的 SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
2. docker compose up -d (postgres)
3. pnpm prisma migrate deploy
4. pnpm prisma db seed
5. 用 seed 账号登录，开始使用

## 8. 不做 (V2+)

- 邮箱验证
- 忘记密码 / 重置密码
- 学生端登录（Week 5-6）
- OAuth / SSO
- 多因素认证
- 子账号邀请流程

## 9. 文件清单 (Phase 2-4 产出)

```
backend/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/register.dto.ts
│   ├── dto/login.dto.ts
│   ├── dto/refresh.dto.ts
│   └── strategies/jwt.strategy.ts
├── common/guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
├── common/decorators/
│   └── roles.decorator.ts
prisma/
├── schema.prisma (Tenant + User)
└── seed.ts
```
