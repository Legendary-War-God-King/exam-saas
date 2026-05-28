# Exam SaaS — 进度日志

> 分支: main | CI: ✅ | 阶段: V1 后台完成
> 下一步: 前端 Next.js Web 管理端 或 V2 迭代
> 阻塞: 无

## 2026-05-27

### Day 0: 基础设施骨架 ✅

**交付:** Docker(PostgreSQL+Redis+Nginx), NestJS 骨架, Prisma 空 schema, Sentry, 健康检查, CI
**验证:** lint ✅ | test ✅ | e2e ✅ | build ✅ | CI ✅
**后悔日志:** 进入计划模式前没先确认 Day 0 具体范围，写了 43 文件的计划被用户否定。

---

### Auth 模块 ✅

**交付:** Tenant+User 模型, AuthService(register/login/refresh), JWT(Access 15min + Refresh 7d HS256), DTO 6 个, Guards(JwtAuth/Roles/Tenant), Seed 脚本
**验证:** lint ✅ | test 14/14 ✅ | build ✅ | CI ✅
**修复:** JwtModule registerAsync, bcrypt hash 动态生成, Prisma generate in CI
**后悔日志:** 本地 lint 过但 CI 爆 60 错误 — Prisma client 类型在 CI 上没生成。

---

### 用户管理模块 ✅

**交付:** mustChangePassword+disabledAt, GET /auth/me, POST /auth/set-password(Temp JWT), POST/GET/PATCH /tenant/users
**验证:** lint ✅ | test 16/16 ✅ | e2e 4/4 ✅ | build ✅
**后悔日志:** Prisma migrate 后没 regenerate client → TSC 7 个类型错误。

---

## 2026-05-28

### 题库管理模块 ✅

**交付:** QuestionBank+Question+QuestionType 枚举, 题库CRUD(5)+题目CRUD(5)+JSON批量导入, 软删除(deletedAt)
**验证:** lint ✅ | test 16/16 ✅ | build ✅

---

### 考试管理模块 ✅

**交付:** Exam+ExamQuestion+ExamStatus, 考试CRUD(5)+组卷(添加/移除/排序分值)+发布(生成6位码)
**规则:** 发布≥1题, DRAFT可删, 发布后不可改题目
**验证:** lint ✅ | test 16/16 ✅ | build ✅

---

### 学生端模块 ✅

**交付:** Student+ExamRecord+Answer+RecordStatus, Student auth(学号+考试码→Student JWT), 获取题目(不含答案), 单题作答, 交卷(超时保护), 自动评分
**验证:** lint ✅ | test 16/16 ✅ | build ✅

---

### 成绩分析模块 ✅

**交付:** 成绩列表(分页), 统计(avg/max/min/median/passRate/分数段分布), 题目分析(correctRate/选项分布/实际难度), CSV导出
**验证:** lint ✅ | test 16/16 ✅ | build ✅

---

### 防作弊 + 安全审计 + Release Gate ✅

**交付:** Redis(Service+Module), heartbeat(10s TTL), cheat-event(ZSET), 交卷超时检查(startTime+timeLimit+5min), AuditInterceptor(非GET请求审计日志), CI Security Audit(--audit-level=high)
**验证:** lint ✅ | test 16/16 ✅ | build ✅ | API 全链路 20/20 ✅

---

## V1 最终状态

| 指标 | 值 |
|------|----|
| 数据表 | 9/9 (Tenant, User, Student, QuestionBank, Question, Exam, ExamQuestion, ExamRecord, Answer) |
| 模块 | 6 (auth, tenant, question-bank, exam, student, common) |
| API 端点 | 30+ |
| 单元测试 | 16 (4 suites) |
| E2E 测试 | 4 |
| Lint | 0 errors, 0 warnings (strictTypeChecked) |
| CI | lint → security audit → prisma generate → test → build |
| GitHub | 55 commits, https://github.com/Legendary-War-God-King/exam-saas |
| 设计文档 | 5 份 (auth-design + 用户管理 + 题库管理 + 考试管理 + 学生端 + 成绩分析) |

**后悔日志 (V1 总):**
1. 计划前先确认范围，不自行扩展
2. CI pipeline 加 ORM 必须配 prisma generate
3. Prisma migrate 后立即 regenerate client
4. 网络不稳定时优先用 npmmirror 镜像
5. strictTypeChecked 要求所有 DTO 属性加 `!` 或初始化
