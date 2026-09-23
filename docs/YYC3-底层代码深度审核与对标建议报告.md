# YYC³ AI API Token Console — 底层代码深度审核与对标建议报告

> 报告日期：2026-09-24
> 审核对象：`YYC3-AI-API-Token-Console`（纯前端 SPA，`token.yyc3.vip`）
> 审核方式：底层源码逐层精读 + 全量质量门禁实测 + 与四大同类大数据项目（open-webui / hermes-agent / dify / ragflow）核心技术对标
> 性质：有依托的工程审核报告，所有结论均标注文件路径与行号（`文件:行`）可复现验证

---

## 0. 执行摘要

本项目在**工程纪律与供应链治理**上达到了同类项目第一梯队水平（dify 级 pnpm 治理完整落地、ragflow 级分级测试与检查点管线、声明式提供商接入均已真实实现），测试体系扎实（1965 用例全绿）。但深度审核发现一个**关键结构性风险**：项目的"架构防腐自动化"（Phase 3 核心）两条防线——**ESLint 分层契约**与 **ast-grep 结构化守护**——均因"配置语法落后于工具版本"而处于**静默失效**状态，且已被真实代码违规穿透（`hooks → stores` 跨层引用、裸 `new WebSocket`）。这意味着 CI 目前是"绿灯但门禁空心"，与文档宣称的"违反分层即阻断"存在事实落差。

**一句话结论**：架构骨架优秀、测试扎实、供应链治理一流，但"防腐门禁本身需要防腐"——建议以 P0 级动作修复两条失效防线并补上"门禁有效性回归测试"，否则历史欠账会持续累积。

---

## 1. 审核范围与方法

| 维度 | 覆盖内容 |
| --- | --- |
| 底层代码 | `src/app/lib/**`（16 文件）、`src/app/hooks/**`（30 文件）、`src/app/stores/**`、`src/app/config/providers/**`、`src/app/types/**` |
| 质量门禁 | 逐条实跑 `typecheck` / `lint` / `test:unit` / `build` / `astgrep` / `knip-check` / `size-check` |
| 架构契约 | `eslint.config.js` 分层边界、`scripts/ast-grep/*`、`pnpm-workspace.yaml` 供应链策略 |
| 对标 | 读 `docs/YYC3-GitHub-四大AI项目对比分析与可借鉴项.md` + `docs/YYC3-全量落地实施总结与衔接报告.md`，与四大项目核心技术逐项对照 |

---

## 2. 质量门禁实测结果（有依托）

| 门禁 | 结果 | 关键数据 | 判定 |
| --- | --- | --- | --- |
| `pnpm typecheck` | 通过 | `tsc --noEmit` 0 error | ✅ |
| `pnpm lint` | 通过（表面） | `0 errors, 216 warnings`（阈值 `--max-warnings 500`） | ⚠️ 见 §5-P0 |
| `pnpm test:unit` | 通过 | 116 文件 / **1965 用例全绿**（27.13s） | ✅ |
| `pnpm build` | 通过 | 主 chunk `index-*.js` **2551.77 kB（gzip 746.99 kB）**，超 500kB 告警线 5 倍 | ⚠️ 见 §5-P1 |
| `pnpm astgrep` | 通过（表面） | 0 违规，但 6 条规则**未真正生效** | ⚠️ 见 §5-P0 |
| `knip-check` | 通过 | devDependencies 5→4 | ✅ |
| `size-check` | 通过 | 0 warning / 0 error | ✅ |
| 覆盖率 | 基线锁定 | lines 38 / func 31 / branch 36 / stmt 36（`vitest.config.ts:74-79`） | ⚠️ 偏低 |

**审核中发现的关键矛盾**：上表"通过"的 `lint` 与 `astgrep` 两项，经针对性复验均存在"门禁空心"问题，详见 §5-P0。这是本报告最需要团队重视的结论。

---

## 3. 底层架构深度分析

### 3.1 分层与依赖（`eslint.config.js:79-117`）
- 设计正确：`components → hooks → lib → types` 单向依赖，`stores` 位于 `lib` 之上、`hooks` 之下。
- 但**实现失效**（§5-P0-1）：`eslint-plugin-boundaries` 已升级到 **7.2.0**，而配置仍是 v5/v6 的 legacy 语法（`mode: "full"`、`rules` 选项、bare string selector、`${...}` 模板），插件只输出 deprecation 告警、不再实际拦截跨层引用。

### 3.2 存储层（`lib/yyc3-storage.ts`、`lib/create-local-store.ts`）
- **双层缓存**：localStorage（轻量配置）+ IndexedDB（大数据，14 个 store）+ BroadcastChannel 多标签页同步，设计清晰。
- **亮点**：`onblocked` / `onversionchange` 主动关闭 stale 连接（`yyc3-storage.ts:70-87`），连接失效自动重开（`getDB()` 内 `objectStoreNames` 探测，`:103-123`），这是同类前端项目少见的稳健处理。
- **通用工厂** `createLocalStore` 消除了各 hook 的硬编码 CRUD 重复。

### 3.3 实时通信层（`hooks/useWebSocketData.ts`）
- 架构设计正确：WS 连接 → 断线降级模拟数据 → 节流更新（注释声称 100ms 节流）。
- 但存在三处实现偏差：① 裸 `new WebSocket`（`:142`）违反红线；② 模拟刷新是 `setInterval` 2s 全量 `setState`，无真正的 requestAnimationFrame/时间片节流；③ 重连无退避上限，`reconnectCount` 只增不减。
- 正确示范在同目录 `lib/network-utils.ts:126`：`(globalThis as any).WebSocket` 解析，测试可 stub——这条约定应全仓统一。

### 3.4 模型接入层（`hooks/useBigModelSDK.ts`、`config/providers/*`）
- **真实能力**：`sendMessage` / `sendMessageStream` 完整实现了 OpenAI-compatible + Ollama 两种协议的真实 `fetch` 调用、SSE 流式解析（`:536-561`）、CORS 代理转发、友好错误归类（`friendlyError` 区分 CORS/401/429/5xx）。
- **声明式提供商**（`provider-schema.ts:12-23` + `builtin-providers.json`）：zod 校验 + 9 个内置提供商，新增厂商零代码改动，借鉴 ragflow 到位。
- 默认无 Key 时走 Mock（`isMock` 判定 `:260`），演示/开发体验友好。

### 3.5 批量任务层（`lib/batch/checkpoint.ts`）
- **检查点恢复管线**完整实现：崩溃续跑（`lastStepIndex+1`）、步骤幂等、恰好一次语义（`runWithCheckpoint` `:113-142`），持久化复用既有 `committedChanges` store，无新增基础设施。
- 借鉴 ragflow 摄取管线检查点模式，L2 重实现为原创代码，属本仓工程化最扎实的一块。

### 3.6 错误处理层（`lib/error-handler.ts`）
- 错误分类（网络/解析/认证/运行时等 7 类）、localStorage 快写 + IndexedDB 异步双写（`:52-70`）、全局 `unhandledrejection`/`error` 监听、`trySafe` 元组包装，闭环完整。
- 与 `figma-error-filter` 配合做 Figma iframe 平台噪声拦截，思路成熟。

---

## 4. 亮点（有依托）

1. **供应链治理达一线水平**（`pnpm-workspace.yaml`）：`saveExact`/`dedupeDirectDeps`/`engineStrict`/`strictDepBuilds`/`blockExoticSubdeps`/`trustPolicy: no-downgrade` 六项全开，且 `trustPolicyExclude` 逐条注明"原因+复核日期"，规范程度超过多数开源项目。
2. **测试三档分级 + 覆盖率门槛**（`vitest.config.ts:24-79`）：unit-dom(jsdom)/unit-node(node)/integration(默认禁用需 `YYC3_TEST_INTEGRATION=1`)，红线"零外部依赖、网络/WS/IndexedDB 一律 mock"，1965 用例全绿。
3. **检查点管线**（`lib/batch/checkpoint.ts`）：恰好一次语义实现严谨。
4. **声明式提供商接入**（`config/providers/*`）：zod + JSON，零代码扩展。
5. **体量门禁只减不增**（`scripts/check-size.mjs`）：4 个超标存量文件基线锁定，增长即阻断。
6. **Facade+Siblings 拆分**：`types/index.ts` 从 1781 行拆为 14 行 Facade + 6 领域 sibling，治理有实绩。
7. **统一 BroadcastChannel 工厂**（`lib/broadcast-channel.ts`）：消除单例泄漏与重复 new/close。

---

## 5. 问题与风险（按优先级，有依托）

### P0 — 门禁失效（架构防腐核心防线，最高优先级）

**P0-1：ESLint 分层契约静默失效**
- 证据：`useWebSocketData.ts:39` 存在 `import { nodeStore } from "../stores/dashboard-stores"`（`hooks → stores` 跨层，违反 `eslint.config.js:109` 的 `{ from: "hooks", allow: ["hooks","lib","types"] }`），但 `npx eslint src/app/hooks/useWebSocketData.ts` 返回 **0 error**。
- 根因：`eslint-plugin-boundaries` 已升级 7.2.0，配置仍为 v5/v6 legacy（`mode:"full"`/`rules`/bare selector/`${...}`），插件仅输出 deprecation 告警。
- 讽刺点：`eslint.config.js:107-108` 注释自称"useWebSocketData → stores 豁免已于 2026-09-20 消除（节点数据读取改为 lib 层注入），首个豁免清零"，但实际代码仍引用 stores——注释与实现已脱节。

**P0-2：ast-grep 6 条守护规则静默失效**
- 证据：`scripts/ast-grep/rules/no-bare-websocket.yml:2` 声明 `language: tsx`，但实测 `ast-grep run --lang tsx` 返回空 `[]`，`--lang ts` 才能匹配；`pnpm astgrep` 全仓扫描返回 0 违规。
- 连带违规：`useWebSocketData.ts:142` 裸 `const ws = new WebSocket(wsUrl)` 违反 AGENTS.md 红线 #3，未被任何门禁拦截。
- 影响：硬编码密钥（`no-hardcoded-secret-literal`）、`innerHTML`、`document.write`、`process.env`、字符串定时器共 6 条守护全部失效。

**P0-3：缺少"门禁有效性"回归测试**
- 上述两条防线失效未被 CI 发现，根因是没有任何测试"断言门禁必须能拦住已知违规样本"。这是防腐体系的元缺陷。

### P1 — 安全与性能

**P1-1：硬编码默认凭据与内网地址**
- `supabaseClient.ts:36-43` 硬编码 `admin123` / `dev123` 明文密码（Mock 模式，但属演示泄露风险）。
- `env-config.ts:83-86` 默认硬编码内网 `192.168.3.1:3118`、集群标识 `CN-EAST-PROD-01`。
- `supabaseClient.ts:147-156` `ghostSignIn` 无条件创建 admin 级会话，认证形同虚设（生产部署前必须经 env 开关收口）。

**P1-2：数据库密码仅 btoa 混淆**
- `useLocalDatabase.ts:330-338` `encodePassword` 用 `btoa`（Base64），注释自认 "NOT real encryption"，DB 连接密码持久化于 IndexedDB。

**P1-3：主 bundle 体积超标 5 倍**
- `build` 主 chunk 2551.77 kB（gzip 746.99 kB）。`routes.ts:21-43` 根组件大量**静态 import**（`DataMonitoring`/`DatabaseManager`/`SystemSettings` 等），仅 AI Family 三个页面 lazy；MUI + Recharts + CodeMirror 全量打入主包。首屏加载压力大。

**P1-4：WebSocket 无心跳/无重连上限**
- `useWebSocketData.ts` 无心跳保活，`onclose` 无条件 5s 重连且 `reconnectCount` 只增不减（`:190-202`），长断线场景会无限重连。

### P2 — 数据一致性与工程治理

**P2-1：Mock 数据三处不一致**
- `db-queries.ts:44-50`（LLaMA-70B `avg_latency_ms:120`、5 模型）vs `useLocalDatabase.ts:225`（`latency 45`、模型集不同）vs `dashboard-stores.ts:23-33`（9 节点、模型 DeepSeek-V3/GLM-4 等）——三套默认数据互相矛盾，同一"模型/节点"在不同页面显示不同指标。

**P2-2：App.tsx 全局覆盖 console 的 hack**
- `App.tsx:72-108` 覆盖 `console.error`/`console.warn`，用字符串匹配拦截 Recharts "duplicate key" 与 Figma 平台噪声。这是"掩盖问题"而非"修复问题"（Recharts 重复 key 的根因是 `useWebSocketData.ts:65-72` 为 time 字段拼计数器后缀的绕过式处理）。

**P2-3：Supabase Mock 是空壳**
- `supabaseClient.ts:123-137` `from().select()` 链的 `_mockQuery` 恒返回空数组；`db-queries.ts` 实际走 localStorage。两套数据源并存，未来接真实 Supabase 时迁移成本被低估。

**P2-4：工程欠账**
- 216 个 lint warning（`no-explicit-any` 84 处、大量 unused-vars），`--max-warnings 500` 阈值过宽。
- 4 个超标组件（`SystemSettings 1373` / `ServiceConnectionTest 1265` / `AIFamilyDesignDoc 1217` / `DataEditorPanel 1188`）被基线锁定"只减不增"但迟迟未拆。
- 覆盖率基线低（38/31/36/36），核心链路 `useWebSocketData` 的 WS 消息路由、`checkpoint` 恰好一次均未被充分覆盖。

---

## 6. 与同类型大数据应用核心技术对标

> 对标事实源：`docs/YYC3-GitHub-四大AI项目对比分析与可借鉴项.md` + `docs/YYC3-全量落地实施总结与衔接报告.md`

| 能力维度 | 四大项目标杆做法 | 本项目现状 | 对标结论 |
| --- | --- | --- | --- |
| **供应链治理** | dify：pnpm workspace + `catalog:` + only-allow + 严格 lock | 完整落地且更细（`trustPolicy: no-downgrade`） | 🟢 达标/超越 |
| **分层契约** | dify：import-linter 强制，违者无法合入 | eslint-plugin-boundaries 7.2 配 legacy 配置 | 🔴 **失效** |
| **AST 结构化守护** | dify：`ast_grep_guard.py` AST 级拦截 | ast-grep 6 规则，`language:tsx` 失效 | 🔴 **失效** |
| **模型提供商声明式** | ragflow：`conf/models/` 50+ 厂商 JSON | zod + JSON 9 个内置提供商 | 🟡 达标（规模小） |
| **分级测试** | ragflow：摄取管线完整 pytest | 三档 + 1965 用例，集成测试默认禁用 | 🟡 达标（覆盖率低） |
| **检查点/管线** | ragflow：摄取管线 DSL + checkpoint | `runWithCheckpoint` 恰好一次 | 🟢 达标 |
| **密钥强制** | open-webui：`WEBUI_SECRET_KEY` 无回退、缺则拒启 | ghost 模式无条件绕过认证 | 🔴 偏弱 |
| **依赖注释纪律** | hermes-agent：精确锁定 + 逐条注释动因 | `overrides`/`trustPolicyExclude` 逐条注释 | 🟢 达标 |

**核心判断**：本项目在"工程纪律的上半场"（供应链、锁定、测试、体量）已对齐甚至超越标杆；但在"架构防腐自动化的下半场"（分层契约、AST 守护）出现**工具版本与配置脱节导致的防线失守**，这恰是 dify/ragflow 最强调、也最值钱的部分。补齐这两条防线，项目的工程化水平才能名副其实地站上一线。

---

## 7. 建议（可落地生成闭环）

> 采用项目自身"监测→分析→决策→执行→验证→优化"六层闭环组织，每条建议给出**动作 → 验收标准 → 优先级**。建议按 P0 → P1 → P2 顺序落地，每轮完成后重新跑全量门禁形成闭环。

### 闭环 1（P0）门禁防腐修复 —— 最优先

| 层 | 动作 | 验收标准 | 优先级 |
| --- | --- | --- | --- |
| 监测 | CI 增加"门禁有效性"探针：临时提交含已知违规样本的 fixture，断言 `lint`/`astgrep` 必须失败 | 探针红灯 → 证明门禁真实有效 | P0 |
| 决策 | 确认 eslint-plugin-boundaries 7.x 正确语法；确认 ast-grep 0.45.3 对 tsx 的正确 language 标识 | 形成配置语法基线文档 | P0 |
| 执行 | ① 重写 `eslint.config.js` boundaries 段为 v7 语法（`policies` + `to:{element:{type}}`）；② 修复 `useWebSocketData.ts:39` 的 stores 引用（改经 lib 层注入，兑现注释承诺）；③ 修 `no-bare-websocket.yml` 的 `language`；④ 修 `useWebSocketData.ts:142` 裸 `new WebSocket` 为 `globalThis` 解析 | 违规样本被拦；`pnpm lint`/`pnpm astgrep` 对已知违规返回非 0 | P0 |
| 验证 | 回跑 7 项门禁 + 新增探针测试 | 全绿且探针证明防线有效 | P0 |
| 优化 | 将探针纳入 `scripts/doctor.mjs` 与 CI 固定阶段 | 门禁失效可被 CI 自动发现 | P0 |

### 闭环 2（P1）安全收敛

- **认证收口**：`ghostSignIn` 增加 env 开关（仅 `ENABLE_MOCK_MODE` 且非生产可用），默认凭据移出源码走环境变量。验收：生产构建不含明文 `admin123`。
- **凭据加密**：DB 密码从 `btoa` 改 Web Crypto `SubtleCrypto` 加密，或明确标注"演示模式禁用于生产"并 UI 提示。验收：`gitleaks` + `no-hardcoded-secret-literal` 恢复后仍绿。
- **WS 健壮性**：增加心跳保活、指数退避重连上限（如 6 次后进入"需手动重连"），`reconnectCount` 封顶。

### 闭环 3（P1）性能与首屏

- **拆包**：`vite.config.ts` 增加 `build.rollupOptions.output.manualChunks` 将 MUI / Recharts / CodeMirror 独立分包；`routes.ts` 根组件全面 lazy（`React.lazy`）。验收：主 chunk gzip 降到 < 250 kB，首屏 LCP 改善。
- **渲染节流**：`useWebSocketData` 用 `useReducer` 合并高频状态更新，模拟刷新改 rAF 时间片。

### 闭环 4（P2）数据一致性与工程治理

- **单一 Mock 数据源**：将 `db-queries.ts` / `useLocalDatabase.ts` / `dashboard-stores.ts` 三处默认数据收敛到 `stores/dashboard-stores.ts` 单一导出。验收：三页面模型/节点指标一致。
- **移除 console hack**：删除 `App.tsx:72-108` 全局 console 覆盖；修复 Recharts 重复 key 的根因（数据源唯一 key），Figma 噪声改由 `error-handler` 统一过滤。
- **覆盖率爬坡**：聚焦 `useWebSocketData` 消息路由、`checkpoint` 恰好一次、`useBigModelSDK` 流式解析三处核心链路写单测，月 +2% 爬坡（对齐 `docs/YYC3-开发者文档/CICD.md`）。
- **超标组件拆分**：继续 Facade+Siblings 拆 `SystemSettings`/`ServiceConnectionTest`/`AIFamilyDesignDoc`/`DataEditorPanel`，逐个移出 `check-size.mjs` 基线。

---

## 附：审核结论一览

| 项 | 评分（5 分制） | 一句话 |
| --- | --- | --- |
| 供应链治理 | ⭐⭐⭐⭐⭐ | dify 级治理完整落地 |
| 测试体系 | ⭐⭐⭐⭐ | 1965 用例全绿，覆盖率待爬坡 |
| 架构分层设计 | ⭐⭐⭐⭐ | 设计正确，**执行失效** |
| 结构化守护 | ⭐⭐ | 6 规则**静默失效** |
| 数据一致性 | ⭐⭐⭐ | 三处 Mock 数据矛盾 |
| 性能/体量 | ⭐⭐ | 主包超阈值 5 倍 |
| 安全收敛 | ⭐⭐⭐ | 默认凭据/明文密码/ghost 绕过 |

**总体**：这是一份"骨架优秀、纪律一流、但防腐防线失守"的工程现状。优先修复 P0 门禁空心问题并建立"门禁有效性探针"，是让这套工程化体系真正可信的关键一步；其余为可排期的常规治理项。

> 注：本报告所有结论均可通过文中标注的 `文件:行` 复现验证。财务/金融类分析不在本报告范围（本项目为基础设施看盘系统，非金融业务）。
