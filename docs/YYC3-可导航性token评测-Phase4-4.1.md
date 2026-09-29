---
file: YYC3-可导航性token评测-Phase4-4.1.md
description: Phase 4-4.1 可导航性 token 评测 (bench.py 思路最小版) — 上帝文件拆分前后三点对比
author: AI Tutor <yyc3-batch10>
version: v1.0.0
created: 2026-09-29
updated: 2026-09-29
status: stable
tags: [phase4],[4.1],[benchmark],[navigation]
category: report
---

# 📐 可导航性 token 评测 — Phase 4-4.1 最小版

> Phase 4-4.1 触发条件「任一上帝文件拆分 PR 合入」已命中（批7 `37fe765` + 批8 `bef1cea`，2026-09-28）。
> 本评测为用户决策「启动最小版」的交付物：bench.py 思路（定位符号所需 token 计数）的零依赖启发式简化。

## 一、评测方法

- **脚本**: [`scripts/nav-token-bench.mjs`](../scripts/nav-token-bench.mjs)（零依赖，node >= 20）
- **模型**:
  1. 解析 `src/**/*.ts(x)` 静态 import 图（含 `import()` 动态导入——routes lazy 路由表为主链路）
  2. 从入口 `src/main.tsx` BFS 至每个目标文件的最短路径
  3. 导航成本 = 路径上全部文件 token 之和；token = **chars/4 近似估算（非 tiktoken 精确值，仅用于同脚本口径下的相对对比）**
- **复现命令**:

```bash
rm -rf /tmp/nav-bench && mkdir -p /tmp/nav-bench/{a,b,c}
git archive 37fe765^ | tar -x -C /tmp/nav-bench/a   # 批7 拆分前
git archive bef1cea^ | tar -x -C /tmp/nav-bench/b   # 批8 拆分前
git archive HEAD      | tar -x -C /tmp/nav-bench/c  # 当前
node scripts/nav-token-bench.mjs /tmp/nav-bench/a /tmp/nav-bench/b /tmp/nav-bench/c \
  --label 批7拆分前,批8拆分前,HEAD当前 --json /tmp/nav-bench/result.json
```

## 二、评测结果（2026-09-29 实测）

### 2.1 功能域对比（域内最大导航成本 tok）

| 功能域 | 批7拆分前 | 批8拆分前 | HEAD当前 | 拆分收益 |
| --- | --- | --- | --- | --- |
| AIFamilyDoc | **16687** | 10851 | **10851** | **-35.0%** |
| ServiceTest | **18408** | 14590 | **14590** | **-20.7%** |
| DataEditor | — (unreachable) | — (unreachable) | — (unreachable) | 见 §2.3 审计发现 |

### 2.2 拆分对象明细（Facade 主壳瘦身）

| 目标文件 | 时点 | 自身 tok | 深度 | 导航成本 tok | 变化 |
| --- | --- | --- | --- | --- | --- |
| AIFamilyDesignDoc.tsx | 批7拆分前 | 11756 | 3 | 16687 | 基线 |
| AIFamilyDesignDoc.tsx | HEAD (Facade) | **611** | 3 | **5542** | 自身 **-94.8%** / 导航 **-66.8%** |
| ServiceConnectionTest.tsx | 批7拆分前 | 13477 | 3 | 18408 | 基线 |
| ServiceConnectionTest.tsx | HEAD (Facade) | 4192 | 3 | **9123** | 自身 **-68.9%** / 导航 **-50.4%** |

拆分后 siblings（按需加载，导航成本 7282–14590 tok）替代了拆分前「到达任一功能语义必须读完整上帝文件」的成本模型——域内最大成本下降 21–35%，且单文件上限从 ~13.5k tok 降至 ~5.1k tok（sections-a.tsx 5309）。

### 2.3 审计发现：DataEditor 域全时点 unreachable

- `routes.ts` L113：`/data-editor` 路由已 `Navigate to="/database"` 重定向
- `DataEditorPanel.tsx`（批8 拆分后的 1886 tok 主壳）与 `data-editor/*` 7 个 siblings 在生产链路中**无任何挂载点**（仅 `__tests__/DataEditorPanel.test.tsx` 引用）
- 结论：批8 拆分对象当前为**生产未挂载代码**（knip 基线已认可存量）。处置建议挂账 P3：恢复挂载或归档移除，需产品决策，不在本批范围

## 三、Phase 4-4.1 处置结论

✅ **已处置（最小版达标）**：拆分收益量化成立——可导航性（定位功能的 token 成本）显著下降，Facade+Siblings 模式有效。后续上帝文件拆分 PR 合入时重跑本脚本即可增量对比。

## 附录：完整 JSON 结果

见仓库根执行 §一复现命令输出 `/tmp/nav-bench/result.json`（含每目标 depth/路径链/navTokens 全量数据，体积原因不入库）。
