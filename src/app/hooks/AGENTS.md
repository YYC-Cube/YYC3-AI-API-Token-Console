# AGENTS.md — Hooks 目录细则

> 上级: [仓库总纲](../../../AGENTS.md) · 本目录收纳全部全局 Hooks（28 个）

## 分层铁律

- **禁止 import components/**（任何形式）——分层方向 `components → hooks → lib → types`，eslint boundaries 阻断。
- 允许 import: `react`、`../lib/*`、`../types`、`../i18n/*`、第三方库。
- 需要反向通知组件层时，返回值/回调上抛，绝不直接操作组件。

## 编写规范

1. **一个 Hook 一个关注点**；超过 ~250 行或 CC>25 触发拆分评审（Facade+Siblings 规范，协同开发文档 §6.6）。
2. **副作用一律可清理**：`useEffect` 返回 cleanup；事件监听/定时器/订阅不得泄漏。
3. **持久化走统一封装**：
   - 轻配置 → `usePersistedState`（localStorage，带 max 裁剪）
   - 大数据 → `../lib/yyc3-storage.ts`（IndexedDB + BroadcastChannel 同步）
   - 禁止组件/Hook 直接裸写 `localStorage.setItem` 新 key（新 key 必须注册进 `LOCALSTORAGE_KEYS`）。
4. **网络访问统一出口**：WebSocket 经 `globalThis` 解析（测试 stub 依赖）；fetch 走 lib 层封装。
5. **TS strict 全开**：返回类型显式标注；禁 `any` 对外暴露（内部容错 `catch { }` 除外）。

## 测试要求

- 核心 Hook（`useWebSocketData` / `useBigModelSDK` / `useModelProvider` / `usePersistedState`）优先补单测——覆盖率爬坡主战场。
- Hook 测试放 `../__tests__/`，用 `renderHook` + `act`；真实网络一律 mock。

## 命名与导出

- 文件名 = Hook 名 = 导出名（`useXxx.ts` → `export function useXxx`）。
- 新 Hook 必须在本文件登记一行（名称 + 一句话职责），保持 AI 导师进入即得全景。
