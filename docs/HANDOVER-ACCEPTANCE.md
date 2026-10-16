# 交接验收单 — HANDOVER ACCEPTANCE（S22 终验）

> 验收人签名处留空：本文档由**交接方**（AI 协同产出）准备，由**接手方**逐项勾选签收。
> 全部勾选 = 交接完成；任一不通过 = 交接方限期补正。

## A. 文档交接（接手方逐个打开确认可读）

- [ ] SSOT-INDEX.md 八域索引与实际文件一一对应（抽查 5 链接可点开）
- [ ] DOC-HEALTH.md 五维评分与改进项清晰
- [ ] FREEZE.md 冻结范围/规则/解冻条件明确
- [ ] ADR-INDEX 14 条可导航；任抽 3 条 ADR 六章节齐全
- [ ] ARCHITECTURE/CONTRACTS/BOUNDARIES 三件与代码现状一致（抽查 boundaries 表 + 契约表）
- [ ] SCRIPTS-INDEX 41 入口；EXIT-CODES 与实测一致
- [ ] RUNBOOK/FAULT-TREE/SELF-HEAL 可操作（抽 1 棵树走一遍命令）
- [ ] METRICS-DICT 与 :8000/metrics 实测一致（抽 3 指标）
- [ ] FOLLOWUP-GUIDE.md（开发者文档）与 KNOWN-GAPS.md 开口一致

## B. 环境与访问交接

- [ ] NAS SSH（yyc3-45:9557）可达 + sudo 免密
- [ ] ECS SSH（yyc3-33）可达
- [ ] NAS console 密码文件可读（/home/YYC3/.yyc3-console-cred）
- [ ] ECS console 密码文件可读（/root/.yyc3-console-cred）
- [ ] 本地 `pnpm run doctor` 12/12
- [ ] Playwright 浏览器就绪（e2e 可跑）

## C. 服务与门禁交接（现场演示）

- [ ] NAS：`ops.mjs verify` 七项 PASS（现场）
- [ ] ECS：auth/status enabled（现场）
- [ ] 公网：api.0379.world auth/status（现场）
- [ ] `pnpm test:e2e` 13/13（现场）
- [ ] `pnpm guardrail-probe` 20/20（现场）

## D. 知识交接（口述考核）

- [ ] 能复述三端拓扑与六域路由分布
- [ ] 能说出 jti 吊销/审计/内容协商三个安全面
- [ ] 能指出 FAULT-TREE 对应自己最可能遇到的三类报警
- [ ] 能解释四基线棘轮为什么"只减不增"
- [ ] 知道 8 项遗留开口的触发条件（KNOWN-GAPS）

## E. 签收

| 项 | 交接方 | 接手方 |
| --- | --- | --- |
| 日期 | 2026-10-17 | |
| 签名/确认 | AI 协同（首席架构师角色） | ____________ |
| 备注 | 冻结已生效（FREEZE.md） | 异常项回写 KNOWN-GAPS |

> 验收依据：S15 终判 PASS（docs/audit/20261017T0200-s15-final/）+ S16-S21 六阶段产出（docs/architecture|ops|observability|release|scripts|handover/）。
