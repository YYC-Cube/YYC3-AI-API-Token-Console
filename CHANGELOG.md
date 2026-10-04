# 更新日志 | Changelog

本项目的所有重要变更记录于此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。
All notable changes are documented here. Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer 2.0.0](https://semver.org/).

> 变更提交申请 changelog submissions: <dev@yanyucloud.com>

## [Unreleased]

### Added 新增

- **覆盖率爬坡第三批（hooks 中段四文件，全局 lines 56.49 → 61.91）**: useLocalDatabase 44.2→99.63（+25：AbortError/5xx 重试/4xx 不重试/后端成功/备份恢复/密码编码）· useLocalFileSystem 47.94→100（+10：CRUD/导入导出/快速操作）· useTerminal 55.32→99.65（+28：env 命令/cpim 子命令/ai 意图矩阵/Unix 命令/补全，新建测试文件）· useModelProvider 56.86→99.34（+23：CRUD/Ollama 真实 fetch 路径/schema 兜底/导入导出/合并去重）；全局 lines 56.49→61.91 / branches 49.91→55.72 / functions 45.83→49.62 / statements 54.0→59.71；单测 2202→2301（+99）；顺带识别 3 处不可达死代码（saveProviders 外层 catch 自吞 / aiTextToCli 巡查跳转子项 / 补全大写 GPU-* 永不匹配）——登记 knip 候选观察
  coverage ramp batch 3: four mid-tier hooks to 99-100%; global lines 56.49→61.91, tests 2202→2301

- **覆盖率爬坡第二批（hooks 层主战场，全局 lines 47.37 → 56.49）**: AGENTS.md 钦点核心 Hook 补测四连——useWebSocketData 3.3→99.17%（+23 用例：重连/心跳/快照链路，globalThis WebSocket stub）· useSettingsStore 6.66→100%（+14）· useBigModelSDK 1.42→95.35%（+31：fetch mock/SDK 调用分支）· useHostFileSystem 0.57→98.56%（+54：File System Access API 最小契约 stub）；全局四指标 lines 47.37→56.49 / branches 45.71→49.91 / functions 41.68→45.83 / statements 45.57→54.0；单测 2080→2202（+122）；零生产代码改动、零新增依赖
  coverage ramp batch 2 (hooks): four core hooks to 95-100%; global lines 47.37→56.49, tests 2080→2202

- **e2e /models 提供商矩阵探针固化（批18 临时探针转常驻守护）**: 新增 `e2e/models.spec.ts` 3 用例——路由冒烟（/console/models 挂载）+ UI 登录后 24 提供商 label 全量渲染（18 云 + 6 本地，与 builtin-providers.json 单一事实源对齐，exact 匹配消除前缀包含）+ 页面健康（零 pageerror）；固化 console 鉴权形态 UI 登录前置（App.tsx 前端门卫 → supabaseClient console 分支 → HttpOnly Cookie），登录次数压至 2 次（限流 5 次/5 分钟窗口内与 auth.spec 合计 4 次 ≤ 5）；providers 扩容/改名后渲染回归即时拦截
  e2e /models probe hardened: 24-provider rendering guard with UI login flow, rate-limit-aware

- **覆盖率补测三连（P2 低覆盖文件清零）**: network-utils 48.1→100%（+21 用例，fetch 经 vi.stubGlobal mock）· error-handler 69→100%（+22 用例，错误分类/提取/分级纯函数分支）· yyc3-storage 42.7→100%（+23 用例，vi.stubGlobal 注入最小 IndexedDB/BroadcastChannel stub + vi.resetModules 动态重导入，零新增依赖）；全局覆盖率 lines 45.31→47.37 / branches 44.44→45.71 / functions 40.09→41.68 / statements 43.59→45.57 全线上升；单测 2004→2080（+76）
  coverage triple-fill: network-utils/error-handler/yyc3-storage all to 100% lines; global coverage up across all four metrics

### Refactored 重构

- **lint 84 警告清零（84 → 0）**: 48 文件未消费导入/解构/参数批量清理——codemod 安全摘除 31 绑定（eslint+tsc 双复验，2 文件回滚留证）+ 手动定点修复 64 项（类型导入 13 / lucide 图标 10 / 解构未用 23 / 未用参数 `_` 前缀 13 / catch err 可选绑定），并级联清理 9 条次生未用（FamilyHome 5 图标导入 / AIFamilyCenterPage now+useEffect 块 / ArchitectureAudit useI18n / DevGuidePage useContext / ProviderEditorModal useI18n）；lint 0 error 0 warning、typecheck 0 错、单测 1997+7 全绿
  lint warnings cleared 84→0 across 48 files (imports/destructure/args + 9 cascaded); triple-verified green

### Fixed 修复

- **verifyDepsBeforeRun 复原 install（doctor 唯一 warning 清零，12/12 + 0 warning）**: 溯源发现 2026-09-24 `1dc16c7`（第四轮 boundaries 修复）将其无说明改为 `false`（commit message 与 diff 均无解释，疑似依赖调试临时关闭未复原）——与 Phase 1 Task 1.1 验收口径、doctor 8 项供应链策略清单、workspace 注释三方矛盾；本次复原为 `install` 并附溯源注释（防再次误改），`pnpm run` 系列实测无副作用（lockfile 一致时仅快速校验），doctor 供应链检查「8 项齐备」
  verifyDepsBeforeRun restored to install (silent drift in 1dc16c7); doctor now 12/12 with zero warnings

- **yyc3-icons.ts 注释计数漂移修正（32 → 36，四处）**: 头部目录树自列 6+5+14+7+4=36 项、REMOTE_FILE_MANIFEST 36 项、守护测试 36 断言三源一致，注释头部「32 PNG」/「32 文件」×3 处为笔误；顺带登记新观察：本地 public/yyc3-icons 实存 29/36（缺 7 个 iOS Settings/Notification 专项图标，manifest/PWA 消费的 14 项全部在位，download-icons.sh 可补全，非阻塞）
  yyc3-icons comment count fixed 32→36 (tree/manifest/tests all say 36); local assets 29/36 noted as P3 observation

- **doctor Node 版本硬对齐校验（漂移防复发闭环）**: 原检查 `>= 22` 会放行 Node 26 漂移（判例：vitest4/jsdom `localStorage undefined` 群发 158 失败）——改为「主版本必须 = 22」与 CI 对齐，失败时输出 PATH 修复命令与判例引用（操作手册第 24/25 章）；`pnpm doctor` 12/12 复验通过
  doctor.mjs now hard-blocks Node major ≠ 22 (CI-aligned), with actionable PATH fix in the error message

### Added 新增

- **yyc3-icons 守护测试（覆盖率 0 → 100% 首补）**: 新增 `yyc3-icons.test.tsx` 7 用例——icons/iconsCDN 45 键 1:1 对齐、本地路径 BASE_URL 挂载、CDN Raw 前缀+末段空格编码、handleIconError 回退与防循环守卫（jsdom URL 序列化形态断言）、pwaManifestIcons 14 项结构、REMOTE_FILE_MANIFEST 36 项唯一性
  yyc3-icons coverage 0→100: 7 structural guard tests for icon config + CDN fallback chain

### Refactored 重构

- **no-explicit-any 全量清零（81 → 0）**: 16 个文件的显式 `any` 全部转型——catch 块统一 `err instanceof Error` / `errMessage()` 提取；浏览器非标准 API 经最小契约 interface 扩展（`WindowWithDirectoryPicker` / `NavigatorWithConnection` / `PerformanceWithMemory` / `RegistrationWithSync` / `MinimalSpeechRecognition`）；动态数据经 `Record<string, unknown>` / 具名联合收窄（`NodeStatusType` / `LogLevel` / `RecentOpEntry["status"]` / `keyof AlertThreshold`）；`globalThis.WebSocket` 经 `{ WebSocket?: typeof WebSocket }` 解析。lint 警告 216 → 121，typecheck 0 错，1965 用例全绿
  All 81 explicit `any` eliminated across 16 files: typed error handling, minimal-contract interfaces for non-standard browser APIs, and precise union narrowing; lint warnings 216 → 121
- **SystemSettings.tsx Facade+Siblings 拆分（基线 4 → 3）**: 1373 行巨型设置组件拆分为 193 行主壳（侧栏导航 + 分区路由 + 操作条）+ 6 个领域 sibling（settings/ 目录：APIEndpointConfig 223 / ModelManagementSection 227 / sections-admin 215 / sections-connect 198 / sections-core 306 / shared 122，全部 ≤306 行）；12 个设置分区路由与测试 mock 契约保持兼容（1965 用例全绿）；顺带消除 2 处 `as any`（ModelManagementSection 类型契约化，SettingsToggles 替代裸 Record）
  SystemSettings.tsx split into 193-line shell + 6 domain siblings under settings/; test mock contracts intact; 2 `as any` removed via typed props
- **eslint boundaries v7 语法修复（隐性失效根治）**: eslint-plugin-boundaries 7.2 下原 v5/v6 legacy 语法（`mode:"full"` / bare selector）静默失效（仅告警不拦截，组合根跨层引用漏检）；重写为 v7 语法（`boundaries/files` file descriptor + category，policies `from: { file: { categories } }`；组合根与 tests 的 allow 采用数组 OR 语义覆盖「element 类型 + 组合根单文件」双目标）；例外清单保持为空，lint 0 错误 216 警告
  eslint-plugin-boundaries v7 migration: legacy syntax was silently not enforcing; rewritten with file descriptors + category-based policies (allow arrays = OR semantics)
- **knip 死类型清零**: dashboard-stores.ts 移除未消费的 `StoredNode` re-export（基线比对恢复 0 error）
  Removed unconsumed StoredNode re-export; knip baseline back to green
- **types/index.ts Facade+Siblings 拆分（基线首个清零项）**: 1781 行巨型类型文件按 37 分区领域聚类为 6 个 sibling（core 233 / network-sync 129 / ui-shared 443 / ai-provider 371 / ops-monitor 522 / design-system 139），index.ts 收敛为 14 行 Facade 稳定重导出 — 116 处消费方 import 路径零改动；体量基线 5 → 4（§6.6 只减不增首次兑现）
  types/index.ts split into 6 domain siblings via Facade pattern; consumers untouched; size baseline 5 → 4
- **lint warnings 首批治理（295 → 216）**: `scripts/lint-warn-codemod.mjs` 安全移除 121 个未用导入绑定（eslint 单文件复验 + 全量 tsc 复验双保险，语义不符自动回滚单文件）；useWebSocketData → stores 分层豁免同步清零（§6.7 例外清单转空）；剩余 `no-explicit-any`(84) / `exhaustive-deps`(22) 挂账渐进
  First lint pass: 121 unused import bindings removed with dual re-verification; boundaries exemption cleared; remainder deferred

### Fixed 修复

- **404.html 未进 dist 产物（Task 3.6 缺陷补修）**: 线上深链 `/settings` 实测命中 GitHub Pages 默认 404 页而非自定义回退页 — 根因为 404.html 位于仓库根目录、Vite 仅拷贝 `public/`；移入 `public/404.html` 后进入 dist。HTTP 验证: 首页/manifest/图标全 200
  404.html moved into `public/` so Vite copies it to dist; live deep-link fallback now uses our page instead of GitHub Pages default

- **ast-grep 守护静默失效根治 + boundaries v7 真正生效（P0 门禁防腐）**: ① ast-grep 6 条规则原统一 `language: tsx`，ast-grep 0.45.3 中 language 与文件扩展名强绑定（单值枚举，不支持数组），致全部 `.ts` 文件被漏扫（含 `useWebSocketData.ts` 裸 `new WebSocket`）；拆分为 ts/tsx 双语言共 12 个规则文件。② `useWebSocketData.ts` 裸 `new WebSocket` 改为经 `globalThis.WebSocket` 解析（对齐红线 #3）。③ eslint-plugin-boundaries 7.2 需 `eslint-import-resolver-typescript` 解析相对路径（否则 `to` element 恒为 unknown 致规则失效），新增该 devDependency 并配 `import/resolver`，`allowBuilds` 追加 `unrs-resolver`。反向验证：植入 `.ts`/`.tsx` 裸 WS 与 `lib→stores` 违规样本均被拦截；lint 0 error / astgrep 0 违规 / 1965 用例全绿
  ast-grep silent-failure fix (per-file-extension split to ts/tsx) + boundaries v7 truly enforced via eslint-import-resolver-typescript; reverse-verified both guards now intercept violations

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
