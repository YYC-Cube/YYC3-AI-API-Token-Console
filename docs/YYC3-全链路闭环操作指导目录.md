---
file: YYC3-全链路闭环操作指导目录.md
description: YYC3-AI-API-Token-Console 全链路闭环操作指导 — 教科书级目录与全正文（结合项目实际，批12-17 实战沉淀）
author: AI Tutor <YYC3-Intelligent-Application-Implementation-Expert>
version: v2.0.0
created: 2026-09-29
updated: 2026-10-02
status: active
tags: [handbook],[closed-loop],[operations],[onboarding]
category: manual
---

# 📖 YYC³ Token Console — 全链路闭环操作指导（教科书级全正文）

> **定位**：本项目从「新会话接入」到「归档衔接」全生命周期的教科书级操作手册。每章五要素：**定位 → 操作步骤 → 关键命令 → 事实源 → 验收标准**；高风险环节附「常见失败与处置」。
> **适用对象**：AI 导师（主）与人类开发者（通用参考）。
> **使用方式**：按当前所处链路环节跳转卷章；总目录树作导航地图；附录 A 供日常速查。
> **事实源优先级**：代码实况 > [AGENTS.md](../AGENTS.md) > [衔接报告](./YYC3-全量落地实施总结与衔接报告.md) > 本手册（本手册是路径指导，不是状态记录）。

## 读者矩阵

| 读者 | 首读路径 | 日常查阅 |
| --- | --- | --- |
| 新任 AI 导师 | 第一卷 → 第二卷 → 附录 A | 第6章（衔接报告规范）、第11章（门禁） |
| 接手中断任务 | 第4章七步法 → 第5章断点续传 | 第25章判例库 |
| 功能开发者 | 第三卷 → 第四卷 → 第五卷 | 第7/11/15 章 |
| PWA/发布相关 | 第六卷 → 第17章 | 第19章清单回填规范 |
| 运维排障 | 第24章 → 第25章 | 附录 A 恢复段 |

## 术语表

| 术语 | 释义 |
| --- | --- |
| 闭环判据 | ①-⑨ 环无断环、每环有文档落点、每环有验收证据（附录 C） |
| 单一事实源 | 衔接报告——分析+规划+交付唯一权威记录 |
| 自动化终界 | 某验证项自动化手段穷尽点；之后诚实留人工并留证据链 |
| 基线只减不增 | 守护类基线（体量/knip/覆盖率）只许下调且须留证，禁止上调 |
| 前挂账回顾 | 衔接报告 §8.3 中历批挂账处置结果的链式记录 |
| OBS | 观察项（Observation）：存疑现象走「提出→观测→判定」三段生命周期 |
| 判例 | 实战沉淀的「现象/根因/正解」三元组（第25章） |
| 四件套 | 会话文档 00/01/02/03（第21章） |

---

## 总目录树

```
卷首 导读 / 读者矩阵 / 术语表
第一卷 入职与认知
  第1章 环境自诊断与依赖就绪
  第2章 上下文读取与代码审计
  第3章 架构分层与红线清单
第二卷 上下文衔接
  第4章 新会话启动七步法
  第5章 断点续传与上下文传递
  第6章 衔接报告（单一事实源）读写规范
第三卷 开发循环（YYC³ PDCA+）
  第7章 Plan：任务规划与节点目标
  第8章 Do：执行日志与关键操作确认
  第9章 Check：验收自检
  第10章 Act + Archive：处置与归档
第四卷 质量门禁
  第11章 本地门禁矩阵（八项）
  第12章 死代码治理（knip 基线制）
  第13章 依赖治理（版本铁律与季度核对）
  第14章 体量与反模式守护
第五卷 提交与集成
  第15章 Conventional Commits 分组提交法
  第16章 CI 六阶段监控与失败处置
  第17章 Pages 部署链与线上快验
第六卷 PWA 专项
  第18章 Service Worker 预缓存体系
  第19章 人工验证清单使用法
  第20章 观察项（OBS）生命周期管理
第七卷 文档闭环
  第21章 会话文档四件套
  第22章 会话总结与资产索引补登
  第23章 归档与历史治理
第八卷 应急与诊断
  第24章 环境故障自诊断
  第25章 实战判例库
附录
  A 命令速查表
  B 文档资产索引（全集）
  C 全链路闭环流程总览
  D 会话文档模板骨架（00/01/02/03 精简版）
  E 门禁-CI 映射对照表
```

---

# 第一卷 入职与认知

## 第1章 环境自诊断与依赖就绪

**定位**：任何操作之前，先证明「这台机器 + 这个仓库」处于可构建状态。环境异常时的排障入口见第24章。
**前置**：Node 22 + pnpm 11（CI 同版本，见 [ci.yml](../.github/workflows/ci.yml) `env` 段）。

**操作步骤**：

1. 一键体检：

   ```bash
   pnpm doctor        # scripts/doctor.mjs: Node/pnpm 版本、依赖策略、构建链体检
   ```

2. 体检输出解读：

   | 检查项 | 期望 | 失败处置 |
   | --- | --- | --- |
   | Node 版本 | 22.x | nvm 安装/切换；禁用系统 node |
   | pnpm 版本 | 11.x | `corepack` 或官方脚本安装 |
   | 依赖策略 | frozen-lockfile 可用 | 检查 pnpm-workspace.yaml 完整性 |
   | 构建链 | vite/ast-grep 可执行 | 重装依赖；查 allowBuilds 白名单 |

3. 严格安装（禁 `--no-frozen-lockfile`）：

   ```bash
   pnpm install --frozen-lockfile
   ```

4. 开发服务器验证（**端口铁律：3030 起**）：

   ```bash
   pnpm dev           # vite --port 3030；局域网联调用 pnpm dev:host
   ```

**构建脚本白名单机制**：原生依赖 postinstall 受 [pnpm-workspace.yaml](../pnpm-workspace.yaml) `allowBuilds` 拦截（当前白名单：@ast-grep/cli / @tailwindcss/oxide / esbuild / unrs-resolver，均带复核日期）。新增原生依赖须同步补录并注释。

**事实源**：[package.json](../package.json) scripts；[scripts/doctor.mjs](../scripts/doctor.mjs)。
**验收**：doctor 全绿 + `http://localhost:3030` 可访问。

## 第2章 上下文读取与代码审计

**定位**：以底层代码为基形成全局认知——**不读代码直接给方案视为无效输出**。

**操作步骤（Phase 1-4 标准入职）**：

1. **环境感知**（按序读）：
   - [AGENTS.md](../AGENTS.md)：项目一句话/技术栈/硬性门禁/红线/分层/目录导读/工作流
   - [src/app/\_\_tests\_\_/AGENTS.md](../src/app/__tests__/AGENTS.md)、[src/app/hooks/AGENTS.md](../src/app/hooks/AGENTS.md)：局部细则
   - [package.json](../package.json)：scripts + 依赖清单
   - [衔接报告 §8.2-8.3](./YYC3-全量落地实施总结与衔接报告.md)：上次中断点与当前优先级

2. **代码审计**：

   | 审计对象 | 要点 | 事实源 |
   | --- | --- | --- |
   | 入口链 | `src/main.tsx → src/app/App.tsx → routes.ts` | routes.ts 是**路由表唯一事实源** |
   | 分层架构 | `components → hooks → lib → types`（eslint boundaries 强制） | eslint.config.js |
   | 状态策略 | localStorage（轻配置）+ IndexedDB（大数据） | [src/app/lib/yyc3-storage.ts](../src/app/lib/yyc3-storage.ts) 统一封装 |
   | 提供商配置 | JSON + zod 声明式，新增提供商零代码 | [src/app/config/providers/](../src/app/config/providers/) |
   | 测试布局 | 116 文件 ~1996 用例，三 project 分级 | [src/app/\_\_tests\_\_/](../src/app/__tests__/) |

3. **工作空间初始化**：`docs/` 建会话目录 `{主题}-{标识}-{YYYYMMDD}`（先例：`YYC3-批15-桌面侧自动化收口会话总结.md`）。
4. **输出审核报告**（审计型会话）：架构/质量/配置/安全/评分/建议六段（模板见附录 D-00）。

**四问自测**（答不出即未完成审计）：入口链？分层方向？路由事实源？存储策略？
**验收**：四问全答 + 会话目录就绪。

## 第3章 架构分层与红线清单

**定位**：红线是绝对禁止项，违反任何一条即返工。

**六条红线**：

| # | 红线 | 强制手段 | 违例处置 |
| --- | --- | --- | --- |
| 1 | 零上游代码级依赖（禁 submodule/未声明复制；借鉴思想与模式须声明出处） | 人工审查 + 出处声明（衔接报告 §2） | 整段移除重写 |
| 2 | 零硬编码密钥（敏感配置走环境变量） | gitleaks（全历史）+ 构建产物零密钥断言 | 立即撤销密钥 + 历史清洗评估 |
| 3 | 禁裸 `new WebSocket(...)`，须经 `globalThis` 解析 | ast-grep 规则（[scripts/ast-grep/](../scripts/ast-grep/)，6 规则 × ts/tsx） | 按 `globalThis.WebSocket` 改写 |
| 4 | 依赖精确锁定（无 `^`/`~`）；高频工具族走 catalog；overrides 必带「原因+复核日期」 | [pnpm-workspace.yaml](../pnpm-workspace.yaml) 审查 | 改精确版本或迁 catalog |
| 5 | 不做超出当前任务的重构（改动最小化） | 自律 + review | 拆独立任务 |
| 6 | shadcn/ui 生成物（`src/app/components/ui/`）禁手改，改造走 wrapper | 自律 + review | 还原生成物 + 建 wrapper |

**架构分层**（违反即 CI 阻断；例外清单只减不增）：

```
components → hooks → lib → types
  components 可直引 lib/types
  hooks 禁引 components
  lib 禁引 hooks/components
```

**验收**：提交 diff 与六红线逐条比对通过；分层 import 方向合法。

---

# 第二卷 上下文衔接

## 第4章 新会话启动七步法

**定位**：任何新会话接手的唯一标准入口。

| Step | 动作 | 命令/来源 | 判定 |
| --- | --- | --- | --- |
| 1 | 定位最新工作目录 | `git log --oneline -5` + `ls docs/` | 找到最新批次的提交与文档 |
| 2 | 读上次 03-总结 | 「下次会话启动指南」段 | 能复述 TOP 3 优先级 |
| 3 | 读 02-执行日志尾部 | 最后几条记录 | 知道最后在做什么 |
| 4 | 读 01-任务规划 | 任务状态列 | 区分已完成/进行中/未开始 |
| 5 | 验证代码状态 | `git status`（须干净）+ 门禁抽查 | 工作区无未提交改动 |
| 6 | 续用或新建会话目录 | 同主题续用；新主题新建 | 目录命名合规 |
| 7 | 向用户确认衔接点 | 「我已了解上次进度，从 XXX 继续？」 | 用户认可后开工 |

**事实源**：[衔接报告 §8.2「上次中断点」](./YYC3-全量落地实施总结与衔接报告.md)。
**验收**：零提问复述断点（精确到文件/函数）+ TOP 3。

## 第5章 断点续传与上下文传递

**定位**：会话意外中断后的恢复协议。

**恢复优先级**（从上到下，命中即止）：

1. 最新 03-总结文档（结尾即断点）
2. 02-执行日志最后几条
3. `git diff` 未提交更改（含 stash 清点）
4. 对照 01-任务规划确认进度

**上下文引用统一格式**（跨文档引用时必须包裹）：

```markdown
<!-- CONTEXT_LINK:start -->
{ "source": "YYC3-批15-桌面侧自动化收口会话总结.md",
  "type": "decision",
  "summary": "A2 原生对话框采用 a11y AXPress 点击而非 Return 键注入",
  "location": "docs/YYC3-批15-桌面侧自动化收口会话总结.md §二",
  "relevance": "同类 OS 自动化任务的路线选型先例" }
<!-- CONTEXT_LINK:end -->
```

**验收**：新会话零提问即可从断点继续；引用可点可溯。

## 第6章 衔接报告（单一事实源）读写规范

**定位**：[YYC3-全量落地实施总结与衔接报告.md](./YYC3-全量落地实施总结与衔接报告.md) 是全项目唯一权威记录——**开工前读，收尾前写**。

**写规范（收尾四处更新，缺一不可）**：

| 位置 | 更新内容 | 示例 |
| --- | --- | --- |
| frontmatter `version` | 小版本递增 | v2.13.0 → v2.14.0 |
| §8.2 上次中断点 | 本批完整记录（做了什么/怎么验证/技术沉淀） | 见批12-15 各段 |
| §8.3 当前优先级 | 刷新优先级 + 追加「前挂账回顾」链 | 批15 前挂账回顾行 |
| §九 变更历史表 | 追加一行：日期/版本/变更内容/**触发指令原文** | v2.13.0 行 |

**读规范场景表**：

| 场景 | 读哪 | 找什么 |
| --- | --- | --- |
| 新会话入职 | §8.2 + §8.3 | 断点 + 优先级 |
| 查历史决策 | §九 变更史 + 对应批次记录 | 决策背景与指令原文 |
| 查观察项 | §8.3 挂账链 + PWA 清单 §六 | OBS 状态 |
| 找文档 | §8.4 资产索引 | 全部活跃专题文档 |

**验收**：四处 diff 齐全；§九新行含触发指令原文。

---

# 第三卷 开发循环（YYC³ PDCA+）

## 第7章 Plan：任务规划与节点目标

**定位**：执行有规划、规划有节点、节点有目标、目标可评估。

**操作步骤**：

1. 拆解任务至 SMART 粒度，写入 `01-任务规划与节点目标.md`（骨架见附录 D-01）：
   - 阶段表（Phase / 目标 / 交付物 / 状态 ⬜🔄✅❌）
   - Task 分解（目标/验收标准/依赖/风险点/完成标记）
   - 里程碑表 + 资源需求
2. 每任务验收标准必须**可执行或可观测**（命令、断言、清单项）。
3. 标注**自动化边界**：先声明该步骤能自动化到什么程度、余下人工项是什么（方法论先例：PWA §1.1 五级递进——合成事件 → 等价模拟 → 真实浏览器 → CDP 协议 → OS 级）。
4. 风险登记：每风险写「触发条件 + 应对动作」，不写「注意」二字了事。

**验收**：每个 Task 有可执行验收标准 + 完成标记；风险项有应对动作。

## 第8章 Do：执行日志与关键操作确认

**定位**：实时记录、操作可追溯、危险动作有确认。

**02 日志条目格式**（每操作单元一条）：

```markdown
### {YYYY-MM-DD HH:MM} - {操作摘要}
**操作类型**: 新增功能 / Bug修复 / 重构 / 配置变更 / 文档
**涉及文件**: [file.tsx](src/path/file.tsx)
**操作详情**: 做了什么、为什么
**验证结果**: [x] 命令与结果
**当前状态**: ✅ / ⚠️ / ❌ / 🔒
**下一步**: …
```

**关键操作确认清单**（执行前必须向用户说明）：

| 操作 | 确认要点 |
| --- | --- |
| 删除文件 | 死代码证据链是否完整（第12章） |
| 改 CI/工作流 | 影响的流水线阶段与门禁语义 |
| 改 sw.js/构建链 | 守护测试是否同步（第18章） |
| 强推/历史改写 | 仅在用户明确要求时；main 禁 |
| OS 自动化（权限/注入） | 授权范围与产物清理计划 |

**验收**：日志与 git diff 一一对应，无幽灵操作。

## 第9章 Check：验收自检

**定位**：对照第7章验收标准逐条自证，证据说话。

**操作步骤**：

1. 跑第11章八门禁串行链——全绿才算 Check 通过。
2. 功能改动加断言实证（vitest/Playwright），禁「看起来对了」。
3. **数字链路法**：涉及增删用例/文件时，记录前后数字及推导（判例：2007 − 11 死文件测试 − 1 键用例 + 3 守护 = 1996）。
4. 结果回填 02 日志验证结果段。

**验收**：所有验收标准有 ✅ 证据；数字链路可复算。

## 第10章 Act + Archive：处置与归档

**定位**：通过→完成；不通过→根因修复（禁盲目重试）；收尾→归档闭环。

**Act 决策树**：

```
门禁/断言失败
  ├─ 可定位根因 → 修复 → 重跑 Check
  ├─ 不能定位 → 换诊断路径（第24/25章）→ 仍不能 → AskUserQuestion
  └─ 属环境/权限阻塞 → 诚实标 🔒 + 留恢复路径
```

**Archive 清单**：更新 02 进度总览 → 生成 03 总结（第22章）→ 衔接报告四处更新（第6章）→ 新文档 §8.4 补登 → 临时产物清理（脚本/profile/安装物）。

**验收**：团队协同开发文档 §4.1 会话结束检查清单全过。

---

# 第四卷 质量门禁

## 第11章 本地门禁矩阵（八项）

**定位**：提交前必过；与 CI 六阶段一一映射（对照见附录 E）。

| # | 命令 | 通过标准 | 失败处置 |
| --- | --- | --- | --- |
| 1 | `pnpm typecheck` | tsc strict 0 errors | 修类型；禁 `any` 逃逸与 `@ts-ignore` 滥用 |
| 2 | `pnpm lint` | 0 errors（warnings 上限 500）+ import boundaries | 分层违例改结构；例外清单只减不增 |
| 3 | `pnpm test:unit` | unit-dom + unit-node 全过 | 先判定「代码错」vs「测试锁过期行为」，禁改断言迁就错误 |
| 4 | `pnpm test:coverage` | 覆盖率基线锁定（38/31/36/36，月度爬坡） | 只增不减；下降需显式理由 |
| 5 | `pnpm build` | 构建成功 + inject-precache 注入 N>0 项 | N=0 即清单失效，查 dist/assets 与占位符 |
| 6 | `pnpm astgrep` | 6 规则 × ts/tsx 零命中 | 命中即反模式（如裸 WebSocket），按规则改写 |
| 7 | `pnpm size:check` | 文件体量基线只减不增 | 超限拆文件；基线下调须留证 |
| 8 | `node scripts/knip-check.mjs` | **七类基线**全不超（files 0 / dependencies 0 / devDependencies 4 / exports 11 / types 3 / duplicates 1 / binaries 1，见 [knip.config.ts](../knip.config.ts)） | 新增死代码→删除；下调基线须注释留证 |

**串行执行口径**（任一失败即停）：

```bash
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm astgrep \
  && pnpm size:check && node scripts/knip-check.mjs && pnpm build
```

**验收**：七连跑全绿 + build 输出「已注入 N 项产物清单」。

## 第12章 死代码治理（knip 基线制）

**定位**：死代码零容忍，删除必须证据链完整。

**操作步骤（批量复核方法论）**：

1. `node scripts/knip-check.mjs` 列嫌疑项（files/exports/types/duplicates 分类）。
2. 逐项取证：`git grep -ln "<符号名>"` 查消费方。
3. 读 [src/app/routes.ts](../src/app/routes.ts) 判定入口性质——**重定向兜底的伪入口 = 死入口删，重定向路由本身保留**（兼容旧收藏；判例：批12 hostFiles/performance 等 15 处）。
4. 有活跃消费者的保留（判例：useTerminal/useLocalFileSystem 曾被判死实活）。
5. 处置：DeleteFile 归档（禁留 `// removed` 尸体注释）→ **连带闭环**：i18n 键 / 路由表 / 导航入口（Sidebar/TopBar/BottomNav/CommandPalette）/ 测试用例 / 架构事实表同步清理。
6. 下调 [knip.config.ts](../knip.config.ts) `BASELINE_COUNTS` 并追加注释：`日期 批次 下调原因`。

**验收**：knip 全绿 + `git grep` 零残留 + 基线注释可追溯。

## 第13章 依赖治理（版本铁律与季度核对）

**定位**：依赖是供应链攻击面与体积来源；精确锁定 + 定期核对。

**新增依赖 SOP**：

1. 版本**精确锁定**（无 `^`/`~`）；UI 高频族进 [pnpm-workspace.yaml](../pnpm-workspace.yaml) `catalog`（当前：vite/vitest/coverage/eslint 族/tailwind 族/@vitejs/plugin-react）。
2. 原生二进制依赖同步补 `allowBuilds` 白名单（带复核日期）。
3. overrides 每条必带「原因 + 复核日期」（判例：vite catalog 收敛含 GHSA 补丁注记）。
4. 新增后跑第11章全门禁 + `pnpm knip` 查增量。

**季度核对 checklist**（下次窗口 **2027-03**）：

1. `pnpm knip` 列未用依赖，逐项 `git grep` 取证。
2. 二分法处置：**真死**→package.json 移除（连 lockfile，判例：date-fns）；**盲区误报**→[knip.config.ts](../knip.config.ts) `UI_ECOSYSTEM_WHITELIST` 白名单留证。
3. 白名单判定基准：shadcn/ui 生成物同名依赖（26 radix ↔ ui/ 同名组件）、cn() 链（cva/clsx/tailwind-merge → ui/utils.ts）、CSS `@import` 消费（tw-animate-css → tailwind.css）。
4. 新增 shadcn/ui 组件时**同步补录**白名单。
5. 基线注释追加核对记录；BASELINE 只减不增。

**验收**：BASELINE 七类不超 + 每条白名单有消费路径注释。

## 第14章 体量与反模式守护

**定位**：防文件熵增与模式劣化。

| 工具 | 命令 | 守护内容 |
| --- | --- | --- |
| check-size | `pnpm size:check` | 单文件行数基线只减不增（existsSync 过滤 git 索引滞后文件） |
| ast-grep | `pnpm astgrep` | 6 反模式规则 × ts/tsx（WebSocket/定时器等） |
| guardrail-probe | `pnpm guardrail-probe` | 门禁探针自检（验证守护体系本身有效） |
| nav-token-bench | `pnpm nav:bench` | 导航 token 体量评测（路由/导航改动后跑） |

**新反模式 SOP**：发现劣化模式 → [scripts/ast-grep/](../scripts/ast-grep/) 增规则（yaml）→ 双语言验证（ts/tsx）→ 全仓扫描清存量 → 基线纳入 CI。

**验收**：四工具全绿；新劣化模式有对应新规则。

---

# 第五卷 提交与集成

## 第15章 Conventional Commits 分组提交法

**定位**：一提交一语义，diff 可审、CI 可归因。

**操作步骤**：

1. 复核：`git status` + `git diff`——**含 IDE eslint autofix 联动改动核验**（SearchReplace 后 VSCode 自动清理未用 import/尾逗号属预期效果，逐块确认后纳入提交）。
2. 按语义分组（判例：批12 三分组 = refactor 死代码 / feat SW / docs 清单）；代码先行、docs 收尾两个提交。
3. 消息格式（HEREDOC 传入保证换行）：

   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): 中文摘要（一句）

   正文要点 1；要点 2；要点 3。
   EOF
   )"
   ```

4. type 词汇表：feat/fix/refactor/docs/test/chore/ci/build；scope 取模块名（sw/pwa/arch/report/guide…）。
5. 敏感文件（.env/credentials）禁提交——gitleaks 会拦，但别靠它兜底。

**验收**：`git log --oneline -N` 每行自解释；`git show --stat` 分组边界清晰。

## 第16章 CI 六阶段监控与失败处置

**定位**：推送不是终点，CI 全绿才是。

**流水线结构**（[ci.yml](../.github/workflows/ci.yml)，push main/develop + 所有 PR；concurrency 同 ref 取消旧跑）：

| 阶段 | job | 门禁语义 |
| --- | --- | --- |
| 🔍 Typecheck | tsc --noEmit | strict 0 errors |
| 🧹 Lint | eslint | 0 errors + boundaries |
| 🧪 Test | vitest unit 分级 | 全过 + 基线 |
| 🛡️ Security | gitleaks | **全历史**扫描零密钥 |
| 🎭 E2E | Playwright | auth 链路全过 |
| 📦 Build | vite build + 工程纪律 | ast-grep/探针/体量/knip + 产物零密钥 |

**监控命令**：

```bash
git push origin main && sleep 18 && gh run list --limit 1   # 拿 run id
gh run watch <run-id> --exit-status                          # 阻塞至终态
```

**失败处置矩阵**：

| 失败阶段 | 首查 | 典型根因 |
| --- | --- | --- |
| Typecheck | 本地复跑 | 本地/CI node 版本差 |
| Lint | 本地复跑 | IDE autofix 未提交干净 |
| Test | 失败用例日志 | 时序余量/环境差（判例：jsdom import.meta.url） |
| Security | 命中文件 | 真密钥（立即撤销）vs 误报（allowlist 留证） |
| E2E | trace/截图 | 断言时序；线上数据变化 |
| Build | 工程纪律段 | knip 超基线/体量超限/产物含密钥 |

**验收**：`gh run watch` 退出码 0。

## 第17章 Pages 部署链与线上快验

**定位**：CI 全绿 → Pages 自动部署 → 线上快验，交付最后一公里。

**部署时序**（[pages.yml](../.github/workflows/pages.yml)）：

```
CI success (main) → workflow_run 触发 → pnpm build 完整链
  → CNAME 兜底校验 → upload dist → deploy → token.yyc3.vip
（单实例并发：新部署排队不取消，避免 Pages 状态不一致）
```

**铁律**：构建必须走 **`pnpm build` 完整链**——裸 `vite build` 绕过 inject-precache 注入，线上 SW 预缓存退化空清单（判例：批12 `703af5f`）。

**线上快验清单**：

```bash
# ① 清单非空（99 项量级）② prewarmAssets 存在 ③ ignoreVary 存在
curl -s https://token.yyc3.vip/sw.js | rg "PRECACHE_MANIFEST|prewarmAssets|ignoreVary" | head -5
```

**常见部署故障**：部署成功但页面 404 → 查 Pages Source 设置（须 GitHub Actions）；资源 404 → 查 base 配置（根路径部署 base=/）；SW 不更新 → skipWaiting + 强刷。

**验收**：三特征命中 + 实访正常 + （PWA 改动时）断网深链复测。

---

# 第六卷 PWA 专项

## 第18章 Service Worker 预缓存体系

**定位**：断网深链可用的三重保障——注入、预热、命中。

**架构五要点**（[public/sw.js](../public/sw.js) + [scripts/inject-precache.mjs](../scripts/inject-precache.mjs)）：

1. **构建时注入**：源文件保持占位符 `const PRECACHE_MANIFEST = [];`，构建后 inject-precache 递归扫描 `dist/assets/*.js|css` 注入 dist/sw.js（相对 scope 形式 `"assets/xxx"`，根/子路径部署通用）。幂等防呆：占位符缺失 `exit(1)` 拒绝盲写；空清单拒绝注入。
2. **install 预热**：prewarmAssets 逐条 `fetch(new Request(url, {cache:"reload"}))` + 手动 `cache.put`（**SW 内 fetch 不经过自身 fetch handler**）+ 去重检查（`cache.match(url, {ignoreVary:true})` 已有则跳过）；单条失败容忍不阻塞安装，断网安装由 cacheFirst 按需补齐。
3. **Vary: Origin 根因**：vite preview/Pages 对 `/assets/*` 响应带 `Vary: Origin`（module script CORS 协商）；SW 预热请求（无 Origin）与页面请求（crossorigin 带 Origin）Vary 校验不匹配 → MISS。内容寻址 hash 文件名下 Vary 无语义 → **四处 match 统一 `ignoreVary: true`**（cacheFirst / staleWhileRevalidate / 壳回退 handleNavigate / 预热去重）。
4. **结构守护测试**：[sw-register.test.tsx](../src/app/__tests__/sw-register.test.tsx) 三用例（占位符存在 / install 调预热 / 按行校验 ignoreVary）——**改 sw.js 必跑**；jsdom 下源码读取用 `resolve(process.cwd(), "public/sw.js")`。
5. **体积观测**：inject-precache 挂 6MB 阈值告警（`PREWARM_WARN_MB` 可调，超限 CI `::warning` 非阻断；当前实测 ~2.91MB 正常）。

**红线**：禁手改 dist/；sw.js 改动必须同步守护测试；match 新增处必须带 ignoreVary。

**验收**：build 注入 N>0 + 守护测试过 + 第17章线上三特征 + 断网深链实测（`ctx.setOffline` 直达非首页路由，bodyLen>0）。

## 第19章 人工验证清单使用法

**定位**：[PWA 清单](./YYC3-PWA浏览器人工验证清单.md) 是 PWA 验证单一台账。

**验证行状态机**：⬜ 待办 → 🔄 进行中 → ✅ 通过 / ❌ 缺陷（转 §六） / 🔒 阻塞（注明阻塞点）。

**操作步骤**：

1. **自动化先行**，按五级递进穷尽手段：合成事件 → 等价模拟 → 真实浏览器（channel:chrome）→ CDP 协议（getInstallabilityErrors）→ OS 级（a11y/AXPress）。
2. 每轮回填对应行：结果列写**实证细节 + 日期**，不动历史轮次记录。
3. 不可自动化项诚实标 🔒；禁推定冒充实证——但**证据链完整的推定**可标「推定闭环 + 像素留人工可选」（判例：§1.1.4：`getInstallabilityErrors=[]` + 真实 bip ×3 + 对话框应用名 a11y dump）。
4. 附录 A/B/C 操作清单执行后逐行回填；组完成删组级 🔒 声明（判例：批15 后 §1.1 桌面侧声明「自动化空间用尽」）。
5. 新验证轮在 §七 追加轮次记录段。

**验收**：清单状态与实证一致；每行可追溯验证手段与日期。

## 第20章 观察项（OBS）生命周期

**定位**：存疑现象不轻判，走三段生命周期。

**台账格式**（登记于衔接报告 + PWA 清单 §六）：

```markdown
| OBS-N | 现象 | 首见批次 | 观测手段 | 状态(观测中/已判定) | 终态与证据 |
```

**生命周期**：

```
提出(编号+现象+手段) → 观测(下轮任务携带复测) → 判定
  ├─ 修复闭环: 确认缺陷 → 修复 → 回归验证 (判例: OBS-5 预缓存三重修复)
  └─ 非缺陷关闭: 三重取证排除 (判例: OBS-1 @vite 请求 = 扩展注入探测)
```

**常态观测自动化**：可量化的观测项挂接流水线（判例：预热体积 → build 阈值告警），生命周期止于机制化。

**验收**：无悬空 OBS；每项有终态与证据。

---

# 第七卷 文档闭环

## 第21章 会话文档四件套

**定位**：PDCA+ 的文档投影；命名 `{序号}-{标准名}.md`。

| 文档 | 时机 | 核心段 | 精简骨架 |
| --- | --- | --- | --- |
| 00-项目现状审核报告 | 入职/审计会话开始 | 架构/质量/配置/安全/评分/建议 | 附录 D-00 |
| 01-任务规划与节点目标 | Plan | 阶段表/Task/里程碑/风险 | 附录 D-01 |
| 02-执行日志与进度跟踪 | Do 全程实时 | 操作日志 + 进度总览 | 附录 D-02 |
| 03-总结文档与状态同步 | Archive | 成果/决策/问题/启动指南/统计 | 附录 D-03 |

**轻量豁免**：一行级小改动可仅更新 02 + 衔接报告一句话——「有记录」优先于「形式全」。
**YAML front matter**：file/description/author/version/created/updated/status/tags/category 十字段齐全（门禁见团队协同开发文档 §6.2）。

**验收**：四件套齐（或豁免理由明确）；front matter 完整；状态无悬空。

## 第22章 会话总结与资产索引补登

**定位**：专题会话沉淀独立总结文档 + 衔接报告 §8.4 可索引。

**03-总结八大段**（范本：[批15 总结](./YYC3-批15-桌面侧自动化收口会话总结.md)）：会话信息 / 成果（已完成+进行中+未完成三表）/ 关键决策 / 配置变更 / 问题与解决 / 日志同步状态 / **下次启动指南**（快速恢复命令 + TOP 3 + 断点精确位置）/ 统计数据。

**操作步骤**：

1. 按模板生成 `docs/YYC3-批N-{主题}会话总结.md`。
2. 衔接报告 §8.4 追加条目：`| [链接](./文件.md) | 一句话角色 |`。
3. 独立提交（`docs(report): …`）推送 + CI 监控。

**验收**：§8.4 可索引全部活跃专题文档；总结含启动指南。

## 第23章 归档与历史治理

**定位**：docs/ 活跃区只留「会被再次读到」的文档。

**操作步骤**：

1. 历史全文（深度分析/审计原文/旧规划）入 [docs/archive/](./archive/)；活跃区留摘要与链接。
2. 本地参考目录（团队规范等）不入远程库（.gitignore 治理）。
3. 过期规划文档标 `status: superseded` 而非删除（保留决策脉络）。
4. 归档目录维护说明（archive/ 内 README 或索引段）。

**验收**：docs/ 顶层无陈旧活跃文档；归档可检索。

---

# 第八卷 应急与诊断

## 第24章 环境故障自诊断

**定位**：新机初始化或环境异常的第一响应。

**诊断流程**：`pnpm doctor` → 定位类别 → 按矩阵处置 → 复检。

**故障矩阵**：

| 现象 | 根因 | 处置 |
| --- | --- | --- |
| `command not found: node/head` 等 | lazy_nvm 惰性加载破坏非交互 PATH | `export PATH="/usr/bin:/bin:/opt/homebrew/bin:$PATH"` 或新开终端 |
| `osascript -25211 不允许辅助访问` | 辅助功能未授权（进程查询与 UI 树是**两级**授权） | 系统设置 → 隐私与安全性 → 辅助功能 → 添加宿主应用；授权即时生效，轮询复探（45s/75s） |
| `screencapture could not create image` | 屏幕录制未授权 | 按需授权，或改走 a11y/协议路线 |
| launchPersistentContext 崩溃 kill EPERM | Chrome 驻留进程持 SingletonLock | `pgrep -f "user-data-dir=..."` 定位精确 kill；脚本结尾加兜底 kill |
| 异 profile 启动被转交 | macOS Chrome 单进程模型 | 先清全部 Chrome 实例再启动（批13/14 成功正因当时无实例） |
| Playwright channel:chrome 报错 | 本机无 Google Chrome | 安装 Chrome 或回落 chromium |
| `pnpm install` 构建脚本被拦 | 原生依赖未入 allowBuilds | pnpm-workspace.yaml 补录 + 复核日期 |
| vitest jsdom 全灭（`localStorage.clear` undefined ×7 文件） | 本地 node 被 homebrew 升至 v26，与 CI 22 漂移（vitest4/jsdom 兼容破坏） | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` 后跑门禁；注意 nvm.sh 实际缺失（zshrc 惰性加载空转），勿信 `nvm use` |

**验收**：doctor 全绿；探针命令按权限矩阵预期通过或明确报告阻塞。

## 第25章 实战判例库（批12-17 沉淀）

**定位**：已付费学费换来的边界认知，遇同类问题先查此库；新判例入库须附「现象/根因/正解」三要素。

| 判例 | 现象 | 根因与正解 |
| --- | --- | --- |
| Vary: Origin 缓存 MISS | 断网深链 ERR_FAILED；SW 拦截但 match MISS | assets 带 `Vary: Origin`，预热/页面请求头不匹配 → 四处 `ignoreVary: true` |
| Pages 绕过注入 | 线上 sw.js 清单为空 | workflow 裸 `vite build` 绕过 build 链 → 统一 `pnpm build` |
| macOS Chrome 单进程 | 异 profile 启动报「正在现有会话中打开」 | 全 profile 共享一个浏览器进程 → 先清实例 |
| SingletonLock 驻留 | launchPersistentContext 崩溃 kill EPERM | 安装 PWA 后后台驻留（--no-startup-window）→ 精确 kill + 脚本兜底 |
| AppleScript `path` 保留字 | scan handler 报「不能获得 "path"」 | `path` 是 System Events 保留字 → 形参改 `pfx` |
| Chromium UI 树不可见 | System Events 下 toolbar 元素缺失 | browser UI a11y 仅对 VoiceOver 级 AT 构建 → 协议级推定 + 人工可选 |
| vitest jsdom import.meta.url | fileURLToPath 报 scheme 错误 | jsdom 下为 http scheme → `resolve(process.cwd(), ...)` |
| 正则嵌套括号截断 | `[^)]*` 提前截断漏检 | split("\n") 按行检查 |
| IDE eslint autofix 联动 | git diff 出现「非预期改动」 | SearchReplace 后 VSCode 自动清理 → 属预期，核验纳入 |
| 伪导航入口 | 入口点击被静默跳转 | 指向重定向路由 = 死入口删；重定向路由保留兼容收藏 |
| 权限弹窗挡 bip | beforeinstallprompt 不触发 | 安装性探测触发 Chrome 权限弹窗 → a11y 先点「允许」 |
| app shim 不可控 | `open -a` 拉起欢迎页 | shim 按系统 LastUsed profile 定位 → 同 profile `--app` 等价复验 |
| AppleEvent 超时 -1712 | tell Chrome 无响应 | 无窗口驻留进程不响应 AppleEvent → ps 级进程处置 |
| 时序余量不足 | 合成事件后断言偶发 false | 等待时间给余量（1.2s 不够用 1.5s+）；轮询代替单次等待 |
| Node 版本漂移 | 本地门禁 158 测试环境级失败（CI 却绿） | homebrew 自动升级 node 大版本 → 固定 `/opt/homebrew/opt/node@22/bin` 前置 PATH；失败特征=「localStorage undefined 群发」即环境级，先查 `node -v` 再查代码 |

**验收**：新判例三要素齐全；跨批引用可溯（CONTEXT_LINK）。

---

# 附录

## 附录 A 命令速查表

```bash
# ── 环境 ─────────────────────────────────────────────
pnpm doctor                     # 环境一键体检
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"  # node 22 对齐 CI（homebrew node 已漂 26, 见第24章）
pnpm install --frozen-lockfile  # 严格安装
pnpm dev                        # 开发服务器 :3030
pnpm dev:host                   # 局域网联调
pnpm preview                    # 预览构建产物 :3030

# ── 门禁（提交前八项）────────────────────────────────
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm astgrep \
  && pnpm size:check && node scripts/knip-check.mjs && pnpm build
pnpm test:coverage              # 覆盖率基线（月度爬坡）
pnpm knip                       # knip 明细查看

# ── 专项工具 ─────────────────────────────────────────
pnpm guardrail-probe            # 门禁探针自检
pnpm nav:bench                  # 导航 token 评测
pnpm test:e2e                   # Playwright E2E
pnpm test:integration           # 集成测试（显式开关 YYC3_TEST_INTEGRATION=1）
pnpm lint:fix                   # eslint 自动修复

# ── 交付 ─────────────────────────────────────────────
git push origin main && sleep 18 && gh run list --limit 1
gh run watch <run-id> --exit-status
curl -s https://token.yyc3.vip/sw.js | rg "PRECACHE_MANIFEST|prewarmAssets|ignoreVary"

# ── 上下文恢复 ───────────────────────────────────────
git log --oneline -5 && git status
ls -t docs/*.md | head -5

# ── OS 自动化排障（判例库配套）────────────────────────
export PATH="/usr/bin:/bin:/opt/homebrew/bin:$PATH"   # PATH 异常急救
pgrep -fl "user-data-dir=/tmp"                          # Chrome 驻留探测
osascript -e 'tell application "System Events" to tell process "Finder" to count windows'
```

## 附录 B 文档资产索引（全集）

| 文档 | 角色 |
| --- | --- |
| [AGENTS.md](../AGENTS.md)（根 + __tests__ + hooks 三层） | AI 协同上下文入口 |
| [衔接报告](./YYC3-全量落地实施总结与衔接报告.md) | **单一事实源**（§8.2 断点 / §8.3 优先级 / §8.4 资产索引 / §九变更史） |
| [PWA 清单](./YYC3-PWA浏览器人工验证清单.md) | PWA 验证单一台账（正文 §1-§四 + §五判定 + §六缺陷 + §七轮次 + 附录 A/B/C） |
| [批14 总结](./YYC3-批14-真机项收口会话总结.md) / [批15 总结](./YYC3-批15-桌面侧自动化收口会话总结.md) | 阶段总结范本（03 模板落地） |
| [Provider 新增指南](./YYC3-Provider新增指南.md) | 声明式配置零代码扩接 |
| [Provider 审计 Phase4](./YYC3-Provider声明式配置达标审计-Phase4-4.5.md) / [可导航性评测](./YYC3-可导航性token评测-Phase4-4.1.md) | Phase4 专项台账 |
| [开发者文档](./YYC3-开发者文档/CICD.md)（CICD/ARCHITECTURE/SECURITY/RELEASE/CONTRIBUTING 等 8 件） | 门禁与爬坡操作手册 |
| [icon 系统设计](./yyc3-icon-system-design.md) / [全局导航架构可视化](./YYC3-全局导航功能架构可视化.md) | 设计资产 |
| [archive/](./archive/) | 历史会话与过期文档 |
| 本手册 | 全链路操作导航（路径指导，非状态记录） |

## 附录 C 全链路闭环流程总览

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
闭环判据：①-⑨ 无断环、每环有文档落点、每环有验收证据。
```

## 附录 D 会话文档模板骨架（精简版）

### D-00 项目现状审核报告

```markdown
---
file: 00-项目现状审核报告.md
description/author/version/created/updated/status/tags/category
---
# 📊 项目现状审核报告
## 基本信息（项目/日期/导师/范围/基线 commit）
## 一、架构概览（技术栈表 + 模块依赖）
## 二、代码质量评估（✅符合 / ⚠️待改进 / 🔴风险 三表）
## 三、配置审计（已确认 / 待确认 两表）
## 四、安全评估（密钥检查清单 + 建议）
## 五、综合评分（六维 0-100）
## 六、下一步行动建议（P0/P1/P2）
**审核结论**: 通过 / 有条件通过 / 需整改
```

### D-01 任务规划与节点目标

```markdown
# 📋 任务规划与节点目标
## 一、总体目标
## 二、阶段划分（Phase/名称/目标/交付物/状态⬜🔄✅❌）
## 三、详细任务分解（每 Task: 目标/验收标准/依赖/风险/完成标记）
## 四、里程碑节点
## 五、资源需求
## 六、变更记录
```

### D-02 执行日志与进度跟踪

```markdown
# 📒 执行日志
### {时间} - {摘要}（操作类型/涉及文件/详情/验证结果/状态/下一步）
--- （逐条追加）
### 进度总览（任务/计划%/实际%/偏差/原因）
```

### D-03 总结文档与状态同步

```markdown
# 📝 会话总结与状态同步
## 会话信息
## 一、成果（✅已完成 / 🔄进行中需衔接 / ❌未完成及原因 三表）
## 二、关键决策记录（决策/背景/选择/原因）
## 三、配置变更记录
## 四、问题与解决方案（问题/方案/经验教训）
## 五、日志同步状态（各文档同步矩阵）
## 六、下次会话启动指南 🚀（快速恢复命令 + TOP 3 + 断点精确位置）
## 七、统计数据
```

## 附录 E 门禁-CI 映射对照表

| 本地门禁 | CI 阶段 | 说明 |
| --- | --- | --- |
| pnpm typecheck | 🔍 Typecheck | 同命令 |
| pnpm lint | 🧹 Lint | 同命令（含 boundaries） |
| pnpm test:unit | 🧪 Test | CI 另加 junit 报告（test:ci） |
| pnpm test:coverage | （本地为主） | 基线月度爬坡，CI 不强制 |
| pnpm build | 📦 Build | CI 叠加工件零密钥断言 |
| pnpm astgrep | 📦 Build 内 | 工程纪律段 |
| pnpm size:check | 📦 Build 内 | 工程纪律段 |
| knip-check | 📦 Build 内 | 工程纪律段 |
| — | 🛡️ Security | gitleaks 全历史（本地无对应） |
| — | 🎭 E2E | Playwright（本地 test:e2e 可复现） |

---

## 维护约定

- 本手册随流程演进更新（新判例/新门禁/新工具链），版本号递增并在下方追加变更行。
- 章节内容与 AGENTS.md/衔接报告冲突时，以后者为准并回改本手册。
- 每批会话若产生新判例，**同步入库第25章**；若流程变化，同步改对应章节与附录 A/E。

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0.0 | 2026-09-29 | 初版：八卷 25 章 + 三附录，锚定批12-15 实战沉淀（批16，`6f9e808`） |
| v2.0.0 | 2026-10-02 | 全正文补全：25 章逐章扩至五要素全量（失败处置矩阵/判例引用/数字链路）；判例库 12→14；附录 3→5（新增 D 模板骨架、E 门禁-CI 映射）；读者矩阵与术语表；修正 knip 七类基线口径（批17） |
| v2.1.0 | 2026-10-02 | 判例入库（批18 首例按维护约定执行）：Node 26 漂移判例入第24章故障矩阵 + 第25章判例库；附录 A 环境段补 node@22 PATH 对齐行 |

---

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」
**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
