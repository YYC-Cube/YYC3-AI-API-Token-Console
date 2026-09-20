# 更新日志 | Changelog

本项目的所有重要变更记录于此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。
All notable changes are documented here. Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer 2.0.0](https://semver.org/).

> 变更提交申请 changelog submissions: <dev@yanyucloud.com>

## [Unreleased]

### Refactored 重构

- **types/index.ts Facade+Siblings 拆分（基线首个清零项）**: 1781 行巨型类型文件按 37 分区领域聚类为 6 个 sibling（core 233 / network-sync 129 / ui-shared 443 / ai-provider 371 / ops-monitor 522 / design-system 139），index.ts 收敛为 14 行 Facade 稳定重导出 — 116 处消费方 import 路径零改动；体量基线 5 → 4（§6.6 只减不增首次兑现）
  types/index.ts split into 6 domain siblings via Facade pattern; consumers untouched; size baseline 5 → 4
- **lint warnings 首批治理（295 → 216）**: `scripts/lint-warn-codemod.mjs` 安全移除 121 个未用导入绑定（eslint 单文件复验 + 全量 tsc 复验双保险，语义不符自动回滚单文件）；useWebSocketData → stores 分层豁免同步清零（§6.7 例外清单转空）；剩余 `no-explicit-any`(84) / `exhaustive-deps`(22) 挂账渐进
  First lint pass: 121 unused import bindings removed with dual re-verification; boundaries exemption cleared; remainder deferred

### Fixed 修复

- **404.html 未进 dist 产物（Task 3.6 缺陷补修）**: 线上深链 `/settings` 实测命中 GitHub Pages 默认 404 页而非自定义回退页 — 根因为 404.html 位于仓库根目录、Vite 仅拷贝 `public/`；移入 `public/404.html` 后进入 dist。HTTP 验证: 首页/manifest/图标全 200
  404.html moved into `public/` so Vite copies it to dist; live deep-link fallback now uses our page instead of GitHub Pages default

### Security 安全

- **CORS 网段收敛（首轮遗留 P1 闭环）**: `deploy/server.mjs` 由「全放行 `*`」改为**默认仅同源**（不回 CORS 头），经 `ALLOW_ORIGIN`（精确来源白名单）/ `ALLOW_ORIGIN_CIDR`（IPv4 网段，如 `192.168.3.0/24`）按需放行；`ALLOW_ORIGIN="*"` 显式恢复旧行为（仅限可信内网）。启动横幅显示当前 CORS 模式；运行时验证 9 项场景全绿（默认拒绝/CIDR 命中与拒绝/域名拒绝/协议端口不匹配拒绝/通配/非法条目跳过）
  CORS convergence: same-origin by default; opt-in allowlist (`ALLOW_ORIGIN`) and IPv4 CIDR (`ALLOW_ORIGIN_CIDR`); `*` restores legacy wildcard; startup banner shows active mode; 9 runtime scenarios verified

### Added 新增

- **文档三合一（v2.0.0）**: 深度分析 + 实施规划 + Phase 2-4 总结合并为[全量落地实施总结与衔接报告](./docs/YYC3-全量落地实施总结与衔接报告.md)（单一事实源：27 项借鉴项全景处置标记 + 五维得分刷新至 94 + 跨会话衔接指南）；原文档 4 份移入 `docs/archive/`
  Documentation consolidation: analysis + planning + delivery merged into single source of truth; originals archived

- **工程纪律体系（可借鉴项 Phase 2）**: AGENTS.md 分层投放（根/`__tests__`/`hooks`）· Facade+Siblings 拆分规范（§6.6 + 体量门禁基线只减不增）· 测试分级门禁（unit/integration/e2e 三档，CI 默认只跑 unit）· knip 死代码基线锁定 · 覆盖率月度爬坡机制（基线 38/31/36/36，+2%/月）
  Engineering discipline: layered AGENTS.md · Facade+Siblings splitting spec · tiered test gates · knip baseline · monthly coverage ramp
- **架构防腐体系（可借鉴项 Phase 3）**: eslint-plugin-boundaries import 分层契约（§6.7）· Footprint Ladder 六档评审表 + PR 模板档位字段（§6.9）· providers 声明式接入（JSON + zod，9 提供商）· checkpoint 恢复管线（崩溃续跑/步骤幂等，5 用例）· `pnpm doctor` 12 项自诊断 · SPA 404 回退精细化（静态资源不回退 + 深链还原）· ast-grep 结构化守护 6 条规则（§6.8）
  Architecture hygiene: import boundaries · Footprint Ladder review · declarative providers · checkpoint pipeline · doctor self-diagnosis · SPA 404 fallback · 6 ast-grep rules
- **Phase 4 缓行台账**: 九项智能化储备（token 评测/分块/GraphRAG/HITL 等）带触发条件固化于规划文档 §4.4，季度评审核对
  Phase 4 backlog: 9 deferred items with trigger conditions, quarterly review
- **依赖治理补完**: 13 个 `^` 漂移依赖精确锁定（@codemirror 全套/react-swipeable 等），doctor 零漂移
  Dependency pinning: 13 caret-drifted deps locked exact
- **实施总结报告**: [全量落地实施总结与衔接报告](./docs/YYC3-全量落地实施总结与衔接报告.md)（v2.0.0，含 Phase 2-4 交付记录）
  Implementation summary report for Phase 2-4 rollout

### Changed 变更

- **CI 五阶段流水线升级**: Lint 并入 import 分层边界；Build 阶段新增纪律三件套（ast-grep 扫描 / 体量门禁 / knip 基线）；test:ci 切换 test:unit 分级档
  CI pipeline upgraded to five stages with discipline trio in Build; test:ci switched to tiered test:unit

- **GitHub Pages 自动部署**: `pages.yml` 工作流 — main CI 全绿后自动构建部署至 **<https://token.yyc3.vip**（自定义域名根路径> + CNAME 构建时注入）
  GitHub Pages auto-deploy: auto build & deploy on green main CI to token.yyc3.vip
- **Codecov 覆盖率看板**: ci.yml 上报 `coverage/lcov.info`，项目级目标与本地 thresholds 同源；README 覆盖率徽章升级为动态真实数据
  Codecov dashboard: coverage upload + source-aligned target + dynamic badge

### Changed 变更（早期）

- **CI 五阶段流水线（初版）**: 新增 Lint 门禁（ESLint 9 flat config，0 errors 门槛），test/security job 依赖 [typecheck, lint]
  CI pipeline extended to five stages with a new Lint gate (ESLint 9, zero-errors)
- **测试依赖迁移 devDependencies**: vitest / jsdom / testing-library / coverage-v8 / axe-core 全部移出生产依赖，生产依赖瘦身
  Test tooling moved to devDependencies, slimming production deps

### Fixed 修复

- ESLint 接入治理存量错误 61 → 0：App.tsx `arguments` → rest 参数、DataEditorTables/ArchitectureAudit 表达式语句、FINAL-AUDIT-REPORT 冗余转义、Node 脚本 globals 配置
  Fixed all pre-existing lint errors (61 → 0) via targeted refactors

---

### 计划 Planned

- `v0.2.0`: 推理矩阵多主机调度视图（M4 Max + iMac + NAS 拓扑可视化）
- `v0.2.0`: 报表导出 PDF 引擎（当前 CSV/JSON 基础上扩展）
- `v0.2.0`: AI 诊断建议闭环回写告警规则引擎

---

## [0.1.0] - 2026-09-18

### Added 新增

- **六大功能域**: 监控中心（数据监控/一键跟进/巡查模式/告警规则）· 运维管理（操作中心/文件管理/数据库管理/闭环/报表导出）· AI 智能（API 矩阵/辅助决策/诊断）· AI Family（12 小时钟盘/Family 中心）· 开发规范（设计系统/开发指南）· 系统管理（审计/用户/安全/PWA/环境变量）
  Six functional domains: Monitoring · Ops · AI · AI Family · Dev Standards · Admin
- **全端图标体系**: Android / Web / iOS / macOS / watchOS 五平台 32+ PNG，物理源 + 逻辑源 + CDN 回退四级兜底
  Full-platform icon system: 5 platforms, 32+ PNGs, four-level fallback chain
- **PWA 全链路**: manifest 13 档图标 + useYYC3Head 运行时注入 + 离线模式 + 安装引导
  PWA full-chain: manifest + runtime head injection + offline mode + install prompt
- **双语 i18n**: zh-CN / en-US 全量语言包，一致性测试保障
  Bilingual i18n guarded by consistency tests
- **零依赖部署**: deploy/server.mjs（Node 原生 http）静态托管 + Ollama 反向代理 + launchd/nginx 配置
  Zero-dependency deploy server with Ollama reverse proxy + launchd/nginx configs
- **质量门禁**: TypeScript strict + Vitest 4 双项目工作区（140+ 测试）+ 覆盖率 80% 门槛 + axe-core a11y 审计
  Quality gates: TS strict + Vitest dual-project (140+ tests) + 80% coverage + a11y audit
- **CI/CD**: GitHub Actions 四阶段流水线（typecheck→test→scan→build）+ tag 驱动发布
  CI/CD: four-stage pipeline + tag-driven release
- **仓库治理**: 标签体系 / Issue-PR 模板 / 贡献指南 / 安全策略 / 行为准则 / Apache-2.0 LICENSE
  Repo governance: labels / Issue-PR templates / contributing / security / CoC / license
- **文档体系**: 标规文档（五维驱动/开发标准/文档闭环/图标可视化/多端适配）+ 模版闭环 + 验收体系 + 开发者文档全套
  Documentation: team standards + template loop + acceptance system + full developer docs

### Fixed 修复

- package.json 规范化：`@figma/my-make-file` → `yyc3-ai-api-token-console`（团队 `yyc3-` 前缀命名标准）
  package.json normalized to team naming standard
- Issue 模板归位 `.github/ISSUE_TEMPLATE/`（原散落于 `.github/` 根，GitHub 无法识别）
  Issue templates relocated for GitHub recognition
- 冗余 CI 配置合并：`monorepo-ci.yml` 归档至 `src/app/ci/`，`github-actions-ci.yml` 同步对齐现役流水线
  Redundant CI configs consolidated

### Security 安全

- 全量环境变量隔离（`.env` gitignore + `.env.example` 白名单）
  Full env isolation with gitignore + example whitelist
- gitleaks 密钥扫描闸（CI + pre-commit 双层）
  gitleaks secret scanning at both CI and pre-commit layers

---

## 版本语义 | Versioning Semantics

| 变更类型 Change | 版本位 Bump |
| ---------------- | ------------- |
| 破坏性变更 Breaking | MAJOR |
| 新功能/新文档 Feature/Docs addition | MINOR |
| 缺陷修复/笔误 Bug fix/Typos | PATCH |

> 发布由 `v*.*.*` 标签自动触发 Release 流水线（见 [RELEASE.md](./docs/YYC3-开发者文档/RELEASE.md)）。
> Releases auto-trigger on `v*.*.*` tags (see RELEASE.md).

[Unreleased]: https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/releases/tag/v0.1.0

---

<div align="center">

**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司 · Yanyu Intelligent Technology Co., Ltd.

</div>
