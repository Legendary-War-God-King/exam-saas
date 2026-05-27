# Agent 工作流检查点

Huang-bao-sheng 7 phase + 4 agent 审查点。每个 agent 覆盖的技能盲区不同：

---

## Phase 4: Implementation (TDD) → Minimal Change Engineer

**补充的技能盲区**（7 条铁律中 6 条 Huang-bao-sheng 没有）：

- 只碰任务要求的文件，不"顺手修"
- 三个相似行别急着抽函数——等第 4 个
- Bug 修复不带"改进"
- 每行改动必须能回答"任务需要改这一行吗"

**调用方式**：

```
Use Minimal Change Engineer to review my diff.
Task was: [exact task description].
Flag every line not required by the task.
```

---

## Phase 6: Code Review → Code Reviewer

**与 Huang-bao-sheng Phase 6 的差异**：

- Huang 是质检（查什么），它是导师（解释为什么 + 下次怎么写对）
- Huang 有 14 类 Bug 清单，它有三級（🔴🟡💭）+ 教怎么写对
- 审计报告是事后的，Code Reviewer 是事中的

**调用方式**：

```
Use Code Reviewer to review commit range X..Y.
Focus: correctness, security, maintainability, performance.
```

---

## Phase 7: Verification → Reality Checker

**与 Huang-bao-sheng Phase 7 的差异**：

- Huang 的验证是"跑一遍确认我没错"
- Reality Checker 是"跑一遍证明我错了"
- 核心差异不是步骤，是心态：默认打回

**调用方式**：

```
Use Reality Checker to verify this feature.
Default to NEEDS WORK. Require evidence for every claim.
Run tsc, lint, test, coverage — cross-check output against report.
```

---

## Sprint 里程碑 → SRE

**Huang-bao-sheng 完全没有的领域**：

- SLO/错误预算
- 可观测性三支柱（Metrics/Logs/Traces）
- 容量规划 + Toil 自动化
- 混沌工程 + 事故响应

**调用方式**：

```
Use SRE to review observability posture.
Check: SLOs defined? p95 latency measured?
Alert rules? Toil automated? Health-check depth?
```

---

## 不用 agent 的东西

- Phase 1-3、Phase 5：人在做决策
- Format/Lint：pre-commit hook 已拦
- TSC 类型检查：自己跑 `tsc --noEmit`
