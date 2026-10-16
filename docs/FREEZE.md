# 冻结声明 — FREEZE（S22 / 2026-10-17）

> **本仓库文档与门禁体系自 2026-10-17 起进入冻结状态。**
> 冻结 = 收尾阶段（S16-S22）产出的**架构/运维/发布/交接文档**与**门禁体系**为权威基线；
> 后续变更按 [docs/release/CHANGE-MANAGEMENT.md](./release/CHANGE-MANAGEMENT.md) 分级流程走，不做未分级改动。

## 冻结范围

| 对象 | 冻结级别 | 例外 |
| --- | --- | --- |
| ADR-001~014（docs/architecture/） | 内容冻结（Superseded 流程才可变） | 新 ADR 追加自由 |
| 门禁体系（16 命令 + 四基线 + 20 探针） | 配置冻结（改动=C3 须 ADR） | 基线**下调**自由（附证据） |
| 故障树/自愈剧本/值守清单（docs/ops/） | 结构冻结（15 树框架） | 新判例追加节点自由 |
| SSOT-INDEX / DOC-HEALTH | 结构冻结 | 每评分周期更新 |
| AGENTS.md 红线与门禁速查 | 内容冻结（红线只增） | 判例追加自由 |
| 术语表（8 Agent/12 钟盘口径） | 随代码 | 组件改名时同步 |

## 冻结期变更规则

1. 一切变更走 C0-C4 分级（C4 须架构师+发布官双人）；
2. C3+ 必须附 ADR（新决策新文件，禁改冻结版 ADR 原文）；
3. 门禁配置改动（tsconfig/eslint/基线 JSON）必须附 guardrail-probe 复跑证据；
4. **main 禁 force-push**（分支保护既有）。

## 解冻条件

| 条件 | 动作 |
| --- | --- |
| 缺陷修复（P0/P1） | 走 hotfix 通道（FREEZE-POLICY §二），修复后本冻结自动延续 |
| 大规模特性开发重启 | 发布官解冻 + 本声明更新「冻结解除于 <日期>」 |
| NAS/ECS 运维窗口 | 不涉文档冻结（运维走 ops.mjs/Runbook） |

## 冻结期已知开口（不阻塞冻结，见 KNOWN-GAPS.md）

L-06 jti 持久化 · L-07 e2e 登录态工程化 · L-10 json-reporter 复测 · L-11 coverage 口径 · L-12b 图表种子（产品定义）· 后端 deploy key + compose 终验 · NAS 自然重启终验 · 根级历史 md archive 化 · ECS console-server 若滞后则同步（当前已同步至 gzip 版）。

## 冻结期值守承诺

值守交接按 ONCALL-CHECKLIST 每次执行；三端健康按 RUNBOOK §1 探针；事故按 INCIDENT-LOG 归档——**文档冻结不免除值守责任**。
