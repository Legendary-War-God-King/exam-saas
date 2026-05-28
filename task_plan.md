# Web Admin — 任务规划

> Huang-bao-sheng Phase 2 | 2026-05-28

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 | ✅ | 设计文档 (docs/superpowers/specs/web-admin-design.md) |
| Phase 2 | 🔄 | 任务规划 (本文件) |
| Phase 3 | ⬜ | 详细实施计划 |
| Phase 4 | ⬜ | TDD 实现 |
| Phase 5 | ⬜ | 前端设计 (frontend-design) |
| Phase 6 | ⬜ | Code Review |
| Phase 7 | ⬜ | Verification (webapp-testing + Playwright) |
| Release Gate | ⬜ | 安全 / 性能 / a11y |

## 决策

- 路由修正：`/dashboard/exams/[id]/result?studentId=` 替代 `/dashboard/exams/result`
- Pages Router（不是 App Router），和 WZRY 一致
- 不安装 shadcn/ui，纯 Tailwind 手写组件
- axios 基座 `/api/v1`，next.config.mjs rewrites 代理到 localhost:4000
