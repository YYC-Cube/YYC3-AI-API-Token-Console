# AGENTS.md — YYC³ AI 导师工作总纲

> 面向 AI 协同开发的结构化上下文。AI 导师进入本仓库请先读本文件，再按子目录细则深入。
> 团队规范全景: `docs/YYC3-AI-Family-团队规范/标规文档/YYC3-团队通用-开发文档.md`（本地参考，不入远程库；协作条款已收敛至本文件与开发者文档）

## 项目一句话

YYC³ AI API Token Console — 本地闭环多端推理矩阵数据看盘系统（纯前端 SPA，GitHub Pages 部署 `token.yyc3.vip`）。

## 技术栈（以 package.json 实况为准）

| 层 | 技术 |
| --- | --- |
| 构建 | Vite 6 + @vitejs/plugin-react（版本统一在 `pnpm-workspace.yaml` catalog） |
| UI | React 18 + Tailwind 4 + Radix UI 全家桶 + shadcn/ui + MUI 7 + Recharts + CodeMirror 6 |
| 路由 | react-router 7（`createBrowserRouter`，SPA + NotFound 兜底） |
| 测试 | Vitest 4（projects: unit-dom/unit-node/integration）+ Testing Library + @vitest/coverage-v8 |
| 包管理 | pnpm 11（严格供应链策略，见 `pnpm-workspace.yaml`） |

## 硬性门禁（提交前必过）

```bash
pnpm typecheck      # tsc strict, 0 errors
pnpm lint           # eslint 0 errors + import 分层边界 (boundaries)
pnpm test:unit      # vitest 分级单测 (unit-dom + unit-node, 1965+ 用例)
pnpm test:coverage  # 覆盖率基线锁定 (38/31/36/36, 月度爬坡)
pnpm build          # 产物零密钥断言见 CI
pnpm astgrep        # ast-grep 反模式扫描 (6 条规则)
pnpm size:check     # 文件体量门禁 (基线只减不增)
node scripts/knip-check.mjs  # 死代码基线门禁
```

## 红线（绝对禁止）

1. **零上游代码级依赖** — 本仓库借鉴四大 AI 项目（open-webui/hermes-agent/dify/ragflow）的思想与模式，但禁止 submodule / 依赖包 / 未声明复制。出处: [`docs/YYC3-全量落地实施总结与衔接报告.md`](docs/YYC3-全量落地实施总结与衔接报告.md) §2
2. **零硬编码密钥** — 敏感配置走环境变量；CI 有 gitleaks + 构建产物零密钥断言。
3. **禁止裸 `new WebSocket(...)`** — 必须经 `globalThis` 解析（测试环境 stub 依赖此约定），ast-grep 规则强制。
4. **依赖版本铁律** — 精确锁定（无 `^`/`~`），高频工具族走 catalog；overrides 必带「原因+复核日期」注释。
5. **不做超出当前任务的重构** — 改动最小化，避免顺手改无关代码。

## 架构分层（依赖方向，eslint 强制）

```
components → hooks → lib → types
     └────────────────┘
   components 可直接引 lib/types；hooks 禁止引 components；lib 禁止引 hooks/components
```

- 入口: `src/main.tsx` → `src/app/App.tsx` → `src/app/routes.ts`（路由表唯一事实源）
- 状态: localStorage（轻配置）+ IndexedDB（大数据，`src/app/lib/yyc3-storage.ts` 统一封装）
- 违反分层 → CI 阻断（例外清单只减不增，见 `eslint.config.js` boundaries 段）

## 目录导读

| 目录 | 职责 | 局部细则 |
| --- | --- | --- |
| `src/app/__tests__/` | 全部测试（116 文件，~1965 用例） | [该目录 AGENTS.md](src/app/__tests__/AGENTS.md) |
| `src/app/hooks/` | 全局 Hooks（28 个） | [该目录 AGENTS.md](src/app/hooks/AGENTS.md) |
| `src/app/components/ui/` | shadcn/ui 生成物，**禁手改**（改造走 wrapper） | — |
| `src/app/lib/` | 纯逻辑层（无 UI 依赖；`lib/batch/checkpoint.ts` 检查点管线） | — |
| `src/app/config/providers/` | 提供商声明式配置（JSON + zod，新增提供商零代码改动） | — |
| `scripts/` | 架构守护脚本（ast-grep / check-size / knip-check / doctor） | — |
| `docs/` | 开发者文档 + 规划/总结报告（团队规范等本地参考目录不入远程库） | — |

## 工作流（YYC³ PDCA+）

1. 读上下文（本文件 + 目标目录 AGENTS.md + 相关源码）
2. 更新/查阅 [`docs/YYC3-全量落地实施总结与衔接报告.md`](docs/YYC3-全量落地实施总结与衔接报告.md)（分析+规划+交付单一事实源；协作条款全文见本地 `docs/YYC3-AI-Family-团队规范/标规文档/YYC3-团队通用-开发文档.md`，不入远程库）
3. 实施 → 跑门禁 → 提交（Conventional Commits，中文描述）
4. 会话结束前沉淀总结报告至 `docs/`

## 自诊断

新机初始化或环境异常时: `pnpm doctor`（Node/pnpm 版本、依赖策略、构建链一键体检）
