---
file: YYC3-全链路闭环操作指导目录.md
description: YYC3-AI-API-Token-Console 全链路闭环操作指导 — 教科书级目录与章节操作要点（结合项目实际）
author: AI Tutor <YYC3-Intelligent-Application-Implementation-Expert>
version: v1.0.0
created: 2026-09-29
updated: 2026-09-29
status: active
tags: [handbook],[closed-loop],[operations],[onboarding]
category: manual
---

# 📖 YYC³ Token Console — 全链路闭环操作指导目录

> **定位**：本项目从「新会话接入」到「归档衔接」全生命周期的教科书级操作目录。每章给出：定位 → 操作步骤 → 关键命令 → 事实源 → 验收标准。
> **适用对象**：AI 导师（主）与人类开发者（通用参考）。
> **使用方式**：按当前所处链路环节跳转对应卷章；卷首总目录树可作导航地图。
> **事实源优先级**：代码实况 > [AGENTS.md](../AGENTS.md) > [衔接报告](./YYC3-全量落地实施总结与衔接报告.md) > 本目录（本目录是路径指导，不是状态记录）。

---

## 总目录树

```
卷首 导读与本目录使用法
第一卷 入职与认知 —— 环境感知 / 代码审计 / 红线
  第1章 环境自诊断与依赖就绪
  第2章 上下文读取与代码审计
  第3章 架构分层与红线清单
第二卷 上下文衔接 —— 跨会话连续性
  第4章 新会话启动七步法
  第5章 断点续传与上下文传递
  第6章 衔接报告（单一事实源）读写规范
第三卷 开发循环 —— YYC³ PDCA+
  第7章 Plan：任务规划与节点目标
  第8章 Do：执行日志与关键操作确认
  第9章 Check：验收自检
  第10章 Act + Archive：处置与归档
第四卷 质量门禁 —— 提交前必过
  第11章 本地门禁矩阵（八项）
  第12章 死代码治理（knip 基线制）
  第13章 依赖治理（版本铁律与季度核对）
  第14章 体量与反模式守护（size / ast-grep / guardrail）
第五卷 提交与集成 —— 从 commit 到线上
  第15章 Conventional Commits 分组提交法
  第16章 CI 六阶段监控与失败处置
  第17章 Pages 部署链与线上快验
第六卷 PWA 专项 —— 离线与安装链路
  第18章 Service Worker 预缓存体系
  第19章 人工验证清单使用法（附录 A/B/C）
  第20章 观察项（OBS）生命周期管理
第七卷 文档闭环 —— 会话资产沉淀
  第21章 会话文档四件套（00/01/02/03）
  第22章 会话总结与资产索引补登
  第23章 归档与历史治理
第八卷 应急与诊断 —— 实战判例
  第24章 环境故障自诊断
  第25章 实战判例库（批12-15 沉淀）
附录
  A 命令速查表
  B 文档资产索引
  C 全链路闭环流程总览（文字版）
```

---

# 第一卷 入职与认知

## 第1章 环境自诊断与依赖就绪

**定位**：任何操作之前，先证明「这台机器 + 这个仓库」处于可构建状态。
**前置**：本机已安装 Node 22 与 pnpm 11（CI 同版本，见 [ci.yml](../.github/workflows/ci.yml) `env`）。

**操作步骤**：

1. 进入仓库根目录，运行一键体检：

   ```bash
   pnpm doctor        # Node/pnpm 版本、依赖策略、构建链体检（scripts/doctor.mjs）
   ```

2. 体检报错时按提示修复（常见：node 版本不符、pnpm store 损坏）。
3. 安装依赖（严格锁文件，禁止 `--no-frozen-lockfile` 心存侥幸）：

   ```bash
   pnpm install --frozen-lockfile
   ```

4. 启动开发服务器验证（端口铁律：**3030 起**）：

   ```bash
   pnpm dev           # vite --port 3030
   ```

**事实源**：[package.json](../package.json) `scripts` 段；[scripts/doctor.mjs](../scripts/doctor.mjs)。
**验收**：`pnpm doctor` 全绿 + `http://localhost:3030` 可访问。

## 第2章 上下文读取与代码审计

**定位**：以底层代码为基形成全局认知——不读代码直接给方案视为无效输出。
**前置**：第1章完成。

**操作步骤**（Phase 1-4 标准入职）：

1. **环境感知**：按序读 [AGENTS.md](../AGENTS.md)（工作总纲）→ [src/app/\_\_tests\_\_/AGENTS.md](../src/app/__tests__/AGENTS.md) 与 [src/app/hooks/AGENTS.md](../src/app/hooks/AGENTS.md)（局部细则）→ [package.json](../package.json)（依赖清单）。
2. **代码审计**：入口链 `src/main.tsx` → `src/app/App.tsx` → [src/app/routes.ts](../src/app/routes.ts)（**路由表唯一事实源**）；分层架构 `components → hooks → lib → types`（eslint boundaries 强制）；状态策略 = localStorage（轻配置）+ IndexedDB（[src/app/lib/yyc3-storage.ts](../src/app/lib/yyc3-storage.ts) 统一封装）。
3. **工作空间初始化**：`docs/` 下建会话目录（命名 `{主题}-{标识}-{YYYYMMDD}`，参考 [YYC3-批15-桌面侧自动化收口会话总结.md](./YYC3-批15-桌面侧自动化收口会话总结.md) 先例）。
4. **输出审核报告**：架构分析 / 问题发现 / 风险评估 / 改进建议（模板见团队协同开发文档 §2.3）。

**事实源**：[AGENTS.md](../AGENTS.md) 目录导读表；团队规范《AI 协同开发文档》§一。
**验收**：能不查资料答出「入口链、分层方向、路由事实源、存储策略」四问。

## 第3章 架构分层与红线清单

**定位**：红线是绝对禁止项，违反任何一条即返工。

**六条红线**：

| # | 红线 | 强制手段 |
| --- | --- | --- |
| 1 | 零上游代码级依赖（禁止 submodule / 未声明复制） | 人工审查 + 出处声明（衔接报告 §2） |
| 2 | 零硬编码密钥（敏感配置走环境变量） | gitleaks + 构建产物零密钥断言（CI Build 阶段） |
| 3 | 禁止裸 `new WebSocket(...)`，须经 `globalThis` 解析 | ast-grep 规则（[scripts/ast-grep/](../scripts/ast-grep/)） |
| 4 | 依赖版本精确锁定（无 `^`/`~`），高频工具族走 catalog；overrides 必带「原因+复核日期」注释 | 人工审查 + [pnpm-workspace.yaml](../pnpm-workspace.yaml) |
| 5 | 不做超出当前任务的重构（改动最小化） | 自律 + code review |
| 6 | shadcn/ui 生成物（`src/app/components/ui/`）禁手改，改造走 wrapper | 自律 + review |

**架构分层**（依赖方向，违反即 CI 阻断）：

```
components → hooks → lib → types
   components 可直引 lib/types；hooks 禁引 components；lib 禁引 hooks/components
```

**验收**：提交 diff 与红线逐条比对通过。

---

# 第二卷 上下文衔接

## 第4章 新会话启动七步法

**定位**：任何新会话（无论 AI 或人）接手的唯一标准入口。

**操作步骤**：

```
Step 1 定位最新工作目录        → git log --oneline -5 + ls docs/
Step 2 读上次会话 03-总结      → 「下次会话启动指南」段
Step 3 读 02-执行日志尾部      → 最后在做什么
Step 4 读 01-任务规划          → 哪些已完成/进行中
Step 5 验证代码状态            → git status（须干净）+ 门禁抽查
Step 6 决定：续用/新建会话目录
Step 7 向用户确认衔接点        → 「我已了解上次进度，从 XXX 继续？」
```

**事实源**：[衔接报告 §8.2「上次中断点」](./YYC3-全量落地实施总结与衔接报告.md)。
**验收**：能复述上次中断点（精确到文件/函数）与 TOP 3 优先级。

## 第5章 断点续传与上下文传递

**定位**：会话意外中断后的恢复协议。

**恢复优先级**：

1. 最新 03-总结文档（结尾即断点）
2. 02-执行日志最后几条
3. `git diff` 未提交更改
4. 对照 01-任务规划确认进度

**上下文引用统一格式**（写入文档时）：

```markdown
<!-- CONTEXT_LINK:start -->
{ "source": "来源会话目录", "type": "decision/problem/solution/config",
  "summary": "一句话摘要", "location": "具体文件路径", "relevance": "为何重要" }
<!-- CONTEXT_LINK:end -->
```

**验收**：新会话零提问即可从断点继续。

## 第6章 衔接报告（单一事实源）读写规范

**定位**：[YYC3-全量落地实施总结与衔接报告.md](./YYC3-全量落地实施总结与衔接报告.md) 是全项目「分析+规划+交付」的唯一事实源，每批任务**开工前读、收尾前写**。

**写规范（收尾四处更新，缺一不可）**：

| 位置 | 更新内容 |
| --- | --- |
| frontmatter `version` | 递增小版本（v2.13.0 → v2.14.0） |
| §8.2 上次中断点 | 本批完整记录：做了什么/怎么验证/技术要点沉淀 |
| §8.3 当前优先级 | 刷新 TOP 优先级 + 「前挂账回顾」链 |
| §九 变更历史表 | 追加一行：日期/版本/变更内容/触发指令 |

**读规范**：入职先读 §8.2-8.3；查历史判例先读 §九。

**验收**：四处 diff 齐全；§九新行含触发指令原文。

---

# 第三卷 开发循环

## 第7章 Plan：任务规划与节点目标

**定位**：执行有规划、规划有节点、节点有目标、目标可评估。

**操作步骤**：

1. 拆解任务至 SMART 粒度，写入 `01-任务规划与节点目标.md`（阶段表 + Task 分解 + 里程碑 + 风险）。
2. 明确每任务的**验收标准**（可执行命令或可观测断言）与**依赖关系**。
3. 标注自动化边界：哪些步骤可自动化实证、哪些诚实留人工（判例：PWA 清单 §1.1 的「自动化终界」方法论）。

**事实源**：会话 `01-` 文档模板（团队协同开发文档 §2.3）。
**验收**：每个 Task 有验收标准 + 完成标记（⬜/🔄/✅/❌）。

## 第8章 Do：执行日志与关键操作确认

**定位**：实时记录，操作可追溯。

**操作步骤**：

1. 每完成一个操作单元，即时追加 `02-执行日志与进度跟踪.md`（操作类型/涉及文件/详情/验证结果/状态/下一步）。
2. **关键操作前先确认**：删文件、改 CI、动配置、强推等操作先向用户说明。
3. 遇阻塞立即上报，不蛮力重试（换路径或 AskUserQuestion 对齐）。

**验收**：日志与 git diff 一一对应，无「幽灵操作」。

## 第9章 Check：验收自检

**定位**：对照第7章验收标准逐条自证。

**操作步骤**：

1. 跑本地门禁矩阵（第11章）——全绿才算 Check 通过。
2. 功能类改动：Playwright/vitest 实证断言（判例：PWA 断网深链四断言）。
3. 记录实际数字与预期数字的对照（如测试用例数变化链路：1993+3=1996）。

**验收**：所有验收标准有 ✅ 证据（命令输出/断言结果）。

## 第10章 Act + Archive：处置与归档

**定位**：通过→标记完成；不通过→根因分析后修复；收尾→四件套归档。

**操作步骤**：Act（修复或进入下一任务）→ Archive（更新 02 日志进度总览 → 生成 03 总结 → 更新衔接报告四处 → §8.4 索引补登新文档）。

**验收**：会话结束检查清单（团队协同开发文档 §4.1）全过。

---

# 第四卷 质量门禁

## 第11章 本地门禁矩阵（八项）

**定位**：提交前必过，与 CI 六阶段一一映射。

| # | 命令 | 通过标准 | 失败处置 |
| --- | --- | --- | --- |
| 1 | `pnpm typecheck` | tsc strict 0 errors | 按 tsc 定位修类型，禁 `any` 逃逸 |
| 2 | `pnpm lint` | eslint 0 errors + import 分层边界（boundaries） | 违反分层→改 import 结构，例外清单只减不增 |
| 3 | `pnpm test:unit` | unit-dom + unit-node 全过（基线见 AGENTS.md） | 单测失败→先判定「代码错」还是「测试锁过期行为」 |
| 4 | `pnpm test:coverage` | 覆盖率基线锁定（38/31/36/36，月度爬坡） | 只增不减；降覆盖率需显式说明 |
| 5 | `pnpm build` | 构建成功 + inject-precache 注入产物清单 | 看构建输出「已注入 N 项」；N=0 即异常 |
| 6 | `pnpm astgrep` | 6 规则 × ts/tsx 零命中 | 命中即反模式（如裸 WebSocket），按规则改写 |
| 7 | `pnpm size:check` | 文件体量基线只减不增 | 超限拆文件；基线下调须留证 |
| 8 | `node scripts/knip-check.mjs` | 死代码基线 files/dependencies 归零态维持 | 新增未用导出→删除或入基线（只减不增） |

**执行口径**：完整链一条命令串行跑（任一失败即停）：

```bash
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm astgrep \
  && pnpm size:check && node scripts/knip-check.mjs && pnpm build
```

**验收**：七连跑全绿 + `pnpm build` 输出含「已注入 N 项产物清单」。

## 第12章 死代码治理（knip 基线制）

**定位**：死代码零容忍，但删除必须证据链完整——「批量复核方法论」。

**操作步骤**：

1. `node scripts/knip-check.mjs` 列出嫌疑文件/导出/依赖。
2. 逐项取证：`git grep -l "<符号名>"` 查消费方；读 [src/app/routes.ts](../src/app/routes.ts) 判定「重定向兜底的伪入口」vs「彻底 404」（判例：批12 的 15 处伪导航入口删除，重定向路由本身保留以兼容旧收藏）。
3. **有活跃消费者的保留**（判例：useTerminal/useLocalFileSystem 曾被判死实活）。
4. 处置：DeleteFile 归档移除（禁留「// removed」尸体注释）→ 同步清 i18n 键 / 路由表 / 导航入口 / 测试用例。
5. 下调 [knip.config.ts](../knip.config.ts) 基线并留证：`日期 批次 下调原因`。

**验收**：knip 全绿 + `git grep` 证明零残留引用 + 基线注释可追溯。

## 第13章 依赖治理（版本铁律与季度核对）

**定位**：依赖是供应链攻击面与体积来源，精确锁定 + 定期核对。

**操作步骤**：

1. 新增依赖：版本**精确锁定**（无 `^`/`~`）；UI 高频族进 [pnpm-workspace.yaml](../pnpm-workspace.yaml) catalog；overrides 必带「原因+复核日期」注释。
2. 季度核对窗口（下次 **2027-03**）：对 knip 报告的未用依赖逐项证据链复核——「真死移除（连 lockfile）」vs「真实消费被 knip 盲区误报 → 白名单留证」（判例：批13 date-fns 真死移除 + 30 项 radix 生态白名单）。
3. 白名单判定基准：shadcn/ui 生成物同名依赖（radix 系）、cn() 链（cva/clsx/tailwind-merge）、Tailwind 插件经 CSS `@import` 消费（tw-animate-css）。

**事实源**：[knip.config.ts](../knip.config.ts) 注释沿革；[AGENTS.md](../AGENTS.md) 红线 4。
**验收**：BASELINE 只减不增；每条白名单有消费路径注释。

## 第14章 体量与反模式守护

**定位**：防止文件熵增与模式劣化。

**操作步骤**：

1. `pnpm size:check`：单文件行数超基线即拆（拆分粒度按职责，不按行数凑）。
2. `pnpm astgrep`：6 条反模式规则（WebSocket/定时器等），新规则进 [scripts/ast-grep/](../scripts/ast-grep/)。
3. `pnpm guardrail-probe`：门禁探针自检（验证守护体系本身有效）。
4. `pnpm nav:bench`：导航 token 体量评测（路由/导航改动后跑）。

**验收**：三项全绿；新反模式有对应新规则。

---

# 第五卷 提交与集成

## 第15章 Conventional Commits 分组提交法

**定位**：一提交一语义，diff 可审。

**操作步骤**：

1. `git status` + `git diff` 复核（含 IDE eslint autofix 联动改动核验——SearchReplace 后 linter 自动清理属预期，需人工确认）。
2. 按语义分组提交（判例：批12 三分组 = refactor 死代码 / feat SW / docs 清单）。
3. 消息格式：`type(scope): 中文摘要` + 正文要点，HEREDOC 传入；敏感文件（.env 等）禁提交。
4. 文档与代码同批交付时，代码先行、docs 收尾两个提交（保持 CI 对代码提交的可归因性）。

**验收**：`git log --oneline -N` 每行自解释；`git show --stat` 分组边界清晰。

## 第16章 CI 六阶段监控与失败处置

**定位**：推送不是终点，CI 全绿才是。

**流水线结构**（[ci.yml](../.github/workflows/ci.yml)）：🔍 Typecheck → 🧹 Lint(含 boundaries) → 🧪 Test(unit+基线) → 🛡️ Security Scan(gitleaks 全历史) → 🎭 E2E(Playwright) → 📦 Build(ast-grep/探针/体量/knip + 产物零密钥)。

**操作步骤**：

```bash
git push origin main && sleep 18 && gh run list --limit 1   # 拿 run id
gh run watch <run-id> --exit-status                          # 阻塞监控至终态
```

**失败处置顺序**：读失败 job 日志 → 本地复现（对应第11章命令）→ 根因修复（禁「再推一次试试」）→ 如 gitleaks 误报按其 allowlist 机制处理并留证。

**验收**：`gh run watch` 退出码 0。

## 第17章 Pages 部署链与线上快验

**定位**：CI 全绿 → Pages 自动部署（[pages.yml](../.github/workflows/pages.yml) `workflow_run`）→ 线上快验。

**部署链要点**：

- 构建必须走 **`pnpm build` 完整链**（vite build + inject-precache 清单注入）——裸 `vite build` 会绕过注入致线上 SW 预缓存退化（判例：批12 `703af5f` 修复）。
- CNAME 兜底：`public/CNAME → token.yyc3.vip`，工作流含防御性重建。
- 单实例并发：Pages 部署排队不取消，避免状态不一致。

**线上快验清单**：

```bash
curl -s https://token.yyc3.vip/sw.js | rg "PRECACHE_MANIFEST|prewarmAssets|ignoreVary" | head -5
# ① 清单非空（99 项量级） ② prewarmAssets 存在 ③ 四处 ignoreVary 存在
```

**验收**：三特征全命中 + 浏览器实访首页正常。

---

# 第六卷 PWA 专项

## 第18章 Service Worker 预缓存体系

**定位**：断网深链可用的三重保障——注入、预热、命中。

**架构要点**（[public/sw.js](../public/sw.js) + [scripts/inject-precache.mjs](../scripts/inject-precache.mjs)）：

1. **源文件占位**：`const PRECACHE_MANIFEST = [];`——构建后由 inject-precache 扫描 `dist/assets/` 注入 dist/sw.js（幂等防呆：占位符缺失拒绝盲写、空清单拒绝注入）。
2. **install 预热**：prewarmAssets 逐条 `fetch(cache:"reload")` + 手动 `cache.put`（SW 内 fetch 不过自身 handler），单条失败容忍。
3. **Vary 根因**：`/assets/*` 响应带 `Vary: Origin`，SW 预热请求与页面 module script 请求头不匹配 → `ignoreVary: true` **四处统一**（cacheFirst/staleWhileRevalidate/壳回退/预热去重）。
4. **守护测试**：sw-register.test.tsx 结构守护三用例（占位符存在 / install 调预热 / 按行校验 ignoreVary）——改 sw.js 必跑。
5. **体积观测**：inject-precache 挂 6MB 阈值告警（`PREWARM_WARN_MB` 可调，超限 `::warning` 非阻断）。

**红线**：禁手改 dist/（构建产物）；sw.js 改动必须同步守护测试。

**验收**：`pnpm build` 注入 N>0 项 + 守护测试过 + 线上快验三特征命中。

## 第19章 人工验证清单使用法

**定位**：[PWA 清单](./YYC3-PWA浏览器人工验证清单.md) 是 PWA 验证单一台账——验证行 ⬜/✅/🔒 状态机 + 附录操作清单。

**操作步骤**：

1. 自动化验证先行（Playwright/CDP/a11y），能证则证到「自动化终界」（判例：批12→15 五级递进：合成事件→等价模拟→真实 Chrome→CDP 协议→OS 级 AXPress）。
2. 每轮结果回填对应行（结果列写实证细节 + 日期），不动历史轮次记录。
3. 不可自动化项诚实标 🔒 并注明阻塞点（物理设备/像素视觉），禁「推定通过」冒充实证——但**证据链完整的推定可标注「推定闭环 + 像素留人工可选」**（判例：§1.1.4）。
4. 附录 A/B/C 操作清单执行后逐行回填，组完成删组级 🔒 声明。

**验收**：清单状态与实证记录一致；每行可追溯到验证手段。

## 第20章 观察项（OBS）生命周期

**定位**：存疑现象不轻判，走「提出 → 观测 → 判定」三段。

**操作步骤**：

1. **提出**：写入衔接报告观察项（编号 OBS-N + 现象 + 观测手段）。
2. **观测**：下轮任务携带观测（判例：OBS-1 @vite 请求三重取证）。
3. **判定**：修复闭环（OBS-5 预缓存）或非缺陷关闭（OBS-1 扩展注入，三重证据）——两态均回填台账。
4. 常态观测项挂接自动化（判例：预热体积 → `pnpm build` 阈值告警）。

**验收**：无悬空 OBS；每项有终态与证据。

---

# 第七卷 文档闭环

## 第21章 会话文档四件套（00/01/02/03）

**定位**：PDCA+ 的文档投影，会话结束检查清单的载体。

| 文档 | 生成时机 | 核心段 |
| --- | --- | --- |
| 00-项目现状审核报告 | 会话开始（入职/审计型会话） | 架构概览/质量评估/配置审计/综合评分 |
| 01-任务规划与节点目标 | Plan 阶段 | 阶段表/Task 分解/里程碑/风险 |
| 02-执行日志与进度跟踪 | Do 全程实时 | 操作日志条目 + 进度总览表 |
| 03-总结文档与状态同步 | Archive 阶段 | 成果/决策/问题/启动指南/统计 |

**轻量豁免**：一行级小改动可仅更新 02 日志 + 衔接报告一句话；「有记录」优先于「形式全」。

**验收**：四件套齐（或豁免理由明确）+ 状态标记无悬空。

## 第22章 会话总结与资产索引补登

**定位**：专题会话沉淀独立总结文档（判例：批14/批15 总结），并补登衔接报告 §8.4 资产索引。

**操作步骤**：

1. 按 03-总结模板生成 `docs/YYC3-批N-{主题}会话总结.md`（八大段：会话信息/成果/决策/配置变更/问题与解决/日志同步/启动指南/统计）。
2. 衔接报告 §8.4 文档资产索引追加条目（链接 + 一句话角色）。
3. 独立提交（`docs(report): …`）推送 + CI 监控。

**验收**：§8.4 可索引到全部活跃专题文档；总结含「下次启动指南」。

## 第23章 归档与历史治理

**定位**：docs/ 活跃区只留「会被再次读到」的文档。

**操作步骤**：

1. 历史全文（深度分析/审计/规划原文）入 [docs/archive/](./archive/)，活跃区留摘要与链接。
2. 本地参考目录（团队规范等）不入远程库（.gitignore 治理）。
3. 过期规划文档标注 status: superseded 而非删除（保留决策脉络）。

**验收**：docs/ 顶层无陈旧活跃文档；归档有目录说明。

---

# 第八卷 应急与诊断

## 第24章 环境故障自诊断

**定位**：新机初始化或环境异常的第一响应。

**操作步骤**：

1. `pnpm doctor` 全链体检（Node/pnpm/依赖策略/构建链）。
2. **终端 PATH 异常**（判例：lazy_nvm 惰性加载致 `command not found: node/head`）→ 显式 `export PATH="/usr/bin:/bin:/opt/homebrew/bin:$PATH"` 或新开终端。
3. **OS 自动化权限**（判例：批15）——辅助功能（System Events UI 树）与屏幕录制（screencapture）是两级授权；`-25211` = 未授权辅助功能，系统设置 → 隐私与安全性按需开启。
4. Playwright channel:chrome 需本机装有 Google Chrome；持久化上下文 profile 用后即删。

**验收**：doctor 全绿；探针命令按权限矩阵预期通过或明确报告阻塞。

## 第25章 实战判例库（批12-15 沉淀）

**定位**：已付费学费换来的边界认知，遇同类问题先查此库。

| 判例 | 现象 | 根因与正解 |
| --- | --- | --- |
| Vary: Origin 缓存 MISS | 断网深链 ERR_FAILED，SW 拦截但 match MISS | vite/Pages 对 assets 带 `Vary: Origin`；SW 预热(无 Origin)与页面请求(有 Origin)不匹配 → 四处 `ignoreVary: true` |
| Pages 绕过注入 | 线上 sw.js 清单为空 | workflow 裸 `vite build` 绕过 package.json build 链 → 统一走 `pnpm build` |
| macOS Chrome 单进程 | 异 profile 启动报「正在现有会话中打开」 | 所有 profile 共享一个浏览器进程，新启动被转交 → 先清驻留进程（`pgrep -f "user-data-dir=..."`） |
| SingletonLock 驻留 | launchPersistentContext 崩溃 kill EPERM | 安装 PWA 后 Chrome 后台驻留（--no-startup-window）→ 精确 kill 主进程，脚本结尾加兜底 |
| AppleScript `path` 保留字 | scan handler 报「不能获得 "path"」 | `path` 是 System Events 保留字 → handler 形参改 `pfx` |
| Chromium UI 树不可见 | System Events 下 toolbar 元素缺失 | Chromium browser UI a11y 仅对 VoiceOver 级 AT 构建 → 像素取证走协议级推定 + 人工可选 |
| vitest jsdom import.meta.url | fileURLToPath 报 scheme 错误 | jsdom 下 import.meta.url 为 http → 用 `resolve(process.cwd(), ...)` |
| 正则嵌套括号截断 | `[^)]*` 提前截断漏检 | 改 split("\n") 按行检查 |
| IDE eslint autofix 联动 | git diff 出现「非预期改动」 | SearchReplace 后 VSCode 自动清理未用 import/尾逗号 → 属预期，核验后纳入提交 |
| 伪导航入口 | 入口点击被静默跳转 | 入口 path 指向重定向路由 = 死入口删；重定向路由本身保留兼容旧收藏 |
| 权限弹窗挡 bip | beforeinstallprompt 不触发 | 安装性探测触发 Chrome 权限弹窗 → a11y 先点「允许」清障 |
| app shim 不可控 | `open -a` 拉起欢迎页 | shim 按系统 LastUsed profile 定位 → 受控验证走同 profile `--app` 等价复验 |

**验收**：新判例入库需附「现象/根因/正解」三要素。

---

# 附录

## 附录 A 命令速查表

```bash
# ── 环境 ─────────────────────────────────────────────
pnpm doctor                    # 环境一键体检
pnpm install --frozen-lockfile # 严格安装
pnpm dev                       # 开发服务器 :3030
pnpm preview                   # 预览构建产物 :3030

# ── 门禁（提交前八项）────────────────────────────────
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm astgrep \
  && pnpm size:check && node scripts/knip-check.mjs && pnpm build
pnpm test:coverage             # 覆盖率基线
pnpm knip                      # knip 明细查看

# ── 专项 ─────────────────────────────────────────────
pnpm guardrail-probe           # 门禁探针自检
pnpm nav:bench                 # 导航 token 评测
pnpm test:e2e                  # Playwright E2E
pnpm test:integration          # 集成测试（显式开关）

# ── 交付 ─────────────────────────────────────────────
git push origin main && sleep 18 && gh run list --limit 1
gh run watch <run-id> --exit-status
curl -s https://token.yyc3.vip/sw.js | rg "PRECACHE_MANIFEST|prewarmAssets|ignoreVary"

# ── 上下文恢复 ───────────────────────────────────────
git log --oneline -5 && git status
ls -t docs/*.md | head -5
```

## 附录 B 文档资产索引

| 文档 | 角色 |
| --- | --- |
| [AGENTS.md](../AGENTS.md)（×3 层） | AI 协同上下文（根/测试/hooks） |
| [衔接报告](./YYC3-全量落地实施总结与衔接报告.md) | **单一事实源**（§8.2 断点/§8.3 优先级/§8.4 资产索引/§九变更史） |
| [PWA 清单](./YYC3-PWA浏览器人工验证清单.md) | PWA 验证单一台账（正文 + 附录 A/B/C） |
| [批14 总结](./YYC3-批14-真机项收口会话总结.md) / [批15 总结](./YYC3-批15-桌面侧自动化收口会话总结.md) | 阶段总结范本（03-模板落地） |
| [Provider 新增指南](./YYC3-Provider新增指南.md) | 声明式配置零代码扩接 |
| [开发者文档](./YYC3-开发者文档/CICD.md) | 门禁与爬坡操作手册 |
| 本目录 | 全链路操作导航（路径指导，非状态记录） |

## 附录 C 全链路闭环流程总览（文字版）

```
┌────────────────────────────────────────────────────────────────┐
│ ① 入职    doctor → 读 AGENTS → 审计代码 → 建会话目录          │
│    ↓                                                            │
│ ② 衔接    七步法 → 读 03/02/01 → git 验证 → 确认断点          │
│    ↓                                                            │
│ ③ 规划    01 文档 → SMART 任务 → 验收标准 + 自动化边界        │
│    ↓                                                            │
│ ④ 执行    02 日志实时 → 关键操作先确认 → 阻塞即上报           │
│    ↓                                                            │
│ ⑤ 检查    八门禁串行 → 断言实证 → 数字链路对照                │
│    ↓                                                            │
│ ⑥ 交付    分组 Conventional Commits → push → gh run watch     │
│    ↓                                                            │
│ ⑦ 部署    CI 六阶段全绿 → Pages 自动 → 线上快验三特征         │
│    ↓                                                            │
│ ⑧ 归档    四件套 → 衔接报告四处更新 → §8.4 补登 → 总结文档    │
│    ↓                                                            │
│ ⑨ 衔接    TOP 3 优先级 + 断点精确位置 → 回到 ②                │
└────────────────────────────────────────────────────────────────┘
闭环判据：任何一轮任务，①-⑨ 无断环、每环有文档落点、每环有验收证据。
```

---

## 维护约定

- 本目录随流程演进更新（新增判例/新门禁/新工具链），版本号递增并在此追加变更行。
- 章节内容与 AGENTS.md/衔接报告冲突时，以后者为准并回改本目录。

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0.0 | 2026-09-29 | 初版：八卷 25 章 + 三附录，锚定批12-15 实战沉淀 |

---

> 「***YanYuCloudCube***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」
**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
