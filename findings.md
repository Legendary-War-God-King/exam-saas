# Web Admin — 发现记录

> 2026-05-28

## 已知

- 后端 6 个 Controller，40 个端点，全部已验证通过
- 后端运行在 localhost:4000，前缀 /api/v1
- 后端已有 CORS (允许 localhost:3000)
- JWT: Bearer token, 15min 过期, POST /auth/refresh 刷新
- WZRY Gamer 前端可作为 Next.js 14 Pages Router 参考
- web/ 目录不存在，需要从头创建

## 坑位预警

1. **Next.js rewrites** — 开发环境代理到 localhost:4000，生产需 nginx
2. **JWT 过期** — 15min 过期，axios interceptor 需处理 refresh 逻辑
3. **Tailwind v3 vs v4** — 后端项目已配好 v3，前端也用 v3 保持一致
4. **Pages Router** — 不能用 app/ 目录，全部在 pages/ 下
5. **zustand persist** — 可选 localStorage 持久化，避免刷新丢登录态
