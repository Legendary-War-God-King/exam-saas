# Exam SaaS

## 技术栈

- 后端: NestJS 11 + TypeScript
- 前端 (待建): Next.js 14 + React 18 + Tailwind CSS 3
- 数据库: PostgreSQL 17 + Redis 7 (ioredis)
- ORM: Prisma 7
- 包管理: pnpm workspace

## 目录结构

/
├── backend/        NestJS API (端口 4000)
├── infra/          Docker Compose + Nginx
├── .github/        CI/CD (GitHub Actions)
└── docs/           设计文档

## 启动命令

开发: cd infra && docker compose up -d && cd ../backend && pnpm start:dev
测试: cd backend && pnpm test:cov
E2E: cd backend && pnpm test:e2e

## 项目约定

- ESLint strictTypeChecked: 4/4 规则全部 error
- 测试优先级: service > helper/util > controller
- 每个 commit <=10 文件，一件事
- 详见 CHECKPOINTS.md 了解 agent 检查点
