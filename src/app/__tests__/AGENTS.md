# AGENTS.md — 测试目录细则

> 上级: [仓库总纲](../../AGENTS.md) · 本目录为全仓库唯一测试存放点

## 分级结构（测试分级门禁）

| 档位 | 命名约定 | CI 默认 | 外部依赖 |
| --- | --- | --- | --- |
| **unit** | `*.test.tsx`（dom 项目）/ `*.test.ts`（node 项目） | ✅ 跑 | 零外部依赖（网络/DB 全 mock 或 stub） |
| **integration** | `*.integration.test.{ts,tsx}` | ❌ 本地跑 | 需真实端点时设 `YYC3_TEST_INTEGRATION=1` 显式开启 |
| **e2e** | `e2e/*.spec.ts`（未来） | ❌ | 独立工具链 |

- CI 只跑 `pnpm test:unit`；全量本地 `pnpm test`。
- **unit 红线**：出现真实网络请求 / 真实 IndexedDB / 真实 WebSocket 即违规——一律 `vi.stubGlobal` / mock。

## 环境与 Setup

- dom 项目（`*.test.tsx`）: jsdom + `setup.ts`（含 jest-dom matchers、WebSocket Mock 等）
- node 项目（`*.test.ts`）: node 环境，测试纯函数（lib 层为主）
- 环境由 `vitest.config.ts` projects 自动匹配扩展名，**不要**在文件内手写 `// @vitest-environment`

## 硬约定（历史事故教训）

1. **WebSocket 必须 mock**：经 `globalThis.WebSocket` stub 注入，组件侧已统一经 globalThis 解析。
2. **测试数据自包含**：不依赖执行顺序、不共享可变状态；`beforeEach` 重建 localStorage/IndexedDB mock。
3. **计数类断言用语义选择器**：`getAllByText` / `role` 优先，避免脆弱的 CSS 选择器。
4. **断言品牌文案与数据常量对齐源码**（如 GPU-H100-01），改源码文案须同步改测试。

## 覆盖率

- 基线锁定: lines 38 / functions 31 / branches 36 / statements 36（`vitest.config.ts` thresholds，与 `codecov.yml` 同源）
- 爬坡节奏: 每月 +2%，见 [`docs/YYC3-开发者文档/CICD.md`](../../../docs/YYC3-开发者文档/CICD.md)
- 新增代码不得拉低整体基线；核心链路（hooks/lib）优先补测。

## 运行命令

```bash
pnpm test                # 全量（本地）
pnpm test:unit           # 仅 unit（CI 同款）
pnpm test:coverage       # 覆盖率 + 门槛校验
pnpm test -- src/app/__tests__/Dashboard.test.tsx   # 单文件
```
