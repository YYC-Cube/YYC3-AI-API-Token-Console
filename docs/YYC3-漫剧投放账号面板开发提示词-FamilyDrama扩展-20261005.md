---
file: YYC3-漫剧投放账号面板开发提示词-FamilyDrama扩展-20261005.md
description: Token-Console 新功能开发提示词——在 AI Family「漫剧生产线」页（FamilyDrama）扩展「多平台账号与投放配置」区块，承载 G5 漫剧产线的平台矩阵展示、账号台账编辑（CRUD）、发布清单勾选与数据导入导出（对接漫剧仓运营账本）；含已核实项目实况速览、数据契约、组件范式约束、安全红线与验收标准，可直接投喂新会话执行
author: YanYuCloudCube AI Tutor <admin@0379.email>
version: v1.0.0
created: 2026-10-05
updated: 2026-10-05
status: active
tags: [开发提示词, FamilyDrama, 投放面板, 多平台账号, G5, localStorage]
category: prompt
language: zh-CN
related_docs: YYC3-设置与变量指南/README.md,YYC3-全局导航功能架构可视化.md
cross_repo: YYC3-AI-Family-Comic-Drama/docs/YYC3-63-运营反哺窗口与台账方案-20261005.md（§七 平台矩阵）, YYC3-70（§4.1 判定线）, YYC3-73（执行推进总结）
---

# 漫剧投放账号面板 · 开发提示词（FamilyDrama 扩展）

## 一、使用说明

| 属性 | 说明 |
| ---- | ---- |
| 用法 | 新会话直接粘贴 §二 全文；或发引导语（§2.0）令 AI 自行读取本文档 |
| 适用 | Token-Console（本仓）功能迭代会话 |
| 前置 | 已通读 `docs/YYC3-设置与变量指南/README.md`（四套设置体系）更佳，非必需 |

## 二、提示词正文

### 2.0 引导语

```text
请读取 docs/YYC3-漫剧投放账号面板开发提示词-FamilyDrama扩展-20261005.md，
按 §2.3 任务规格实现（先读 §2.2 实况与现有 FamilyDrama.tsx，禁止跳过读码直接动手），
完成后按 §2.7 验收标准自检并汇报。
```

### 2.1 角色与使命

你是 **YYC³ Token-Console 前端工程师**：React 18 + TS + Vite + Tailwind 技术栈，遵循本仓既有组件范式（GlassCard/FadeIn/lucide 图标/createLocalStore 本地持久化）。使命：为 AI Family「漫剧生产线」页新增**投放运营域**能力——多平台账号台账与发布配置的可视化编辑，作为 G5 漫剧产线（跨仓 YYC3-AI-Family-Comic-Drama）运营窗口的前端驾驶舱。

### 2.2 项目实况速览（已核实，禁止未经读码推翻）

| 项 | 实况 |
| -- | ---- |
| 漫剧页路由 | `ai-family-sub/:subpage` → `AIFamilyRouter.tsx` L31 `drama: FamilyDrama`；路由**已存在，勿新增路由** |
| 现页面 | `src/app/components/ai-family/FamilyDrama.tsx`（265 行）——只读生产看板：五服务健康探针（gateway:25080/comfyui:41888/syncnet:42218/tts:42118/ollama:11434）+ 网关指标 30s 轮询 + 生产链六环节 + 分层边界声明 |
| 本地存储范式 | `src/app/lib/create-local-store.ts`：`createLocalStore<T extends {id:string}>(key, defaults)` → CRUD + `exportData()/importData()/reset()` 全套 |
| 存储键命名 | `yyc3-family-*` 范式（FamilyUISettings.tsx L60-64）→ 本功能用 **`yyc3-drama-distribution`** |
| UI 范式 | GlassCard（`components/GlassCard`）+ FadeIn 动效 + lucide-react 图标 + 深色玻璃风（页背景渐变见 FamilyDrama L171） |
| 质量门禁 | `pnpm typecheck` / `pnpm lint` / `pnpm build`（v5 路由级代码分割，新增组件须可 lazy 或随 FamilyDrama chunk） |

### 2.3 任务规格（在 FamilyDrama 页新增「投放运营」区块，位于现有生产链区块之后）

**区块 A · 平台矩阵卡片**（只读展示 + 启用开关）：四组卡片，数据种子见 §2.4——

| 组 | 平台 | 角色标签 | G5 判定 |
| -- | ---- | -------- | ------- |
| 主采数 | B站 | 横版 1920×1080 | ✅ 唯一入账（P0/P1 窗口采数） |
| 国内分发 | 抖音 | 原生竖版 1080×1920 | ❌ 涨粉蓄水 |
| 海外分发 | TikTok / YouTube Shorts | 竖版（待英配字幕） | ❌ 后置开号 |
| 长线 pitch | DramaBox / YourChannel | 整季投递 | — 攒季投递 |

每卡片：启用/停用 toggle（存 localStorage）+ 账号状态徽标（取自区块 B 对应账号）。

**区块 B · 账号台账（核心，CRUD 编辑）**：基于 `createLocalStore` 实现——

```
字段（DistributionAccount）：
  id: string                    // 如 "bilibili-main"
  platform: string              // bilibili | douyin | tiktok | youtube | dramabox | yourchannel
  nickname: string              // 账号昵称（仅元数据）
  status: "未开号" | "已开号" | "实名中" | "已实名"
  g5_role: "采数" | "分发" | "pitch" | "无"
  note: string                  // 备注
```

交互：卡片列表 + 「新增账号」弹层/内联表单 + 行内编辑 + 删除确认；编辑即写 localStorage 即时生效。

**区块 C · 发布清单（勾选矩阵）**：行=集（sdxl-prod-001~006），列=已启用平台；单元格三态勾选（未投/已投/已过审）；同样持久化（并入同一存储键的 `publish_matrix` 字段）。

**区块 D · 数据同步（导入导出）**：`exportData()/importData()` 按钮对——导出 JSON 结构与漫剧仓 `docs/ops/g5-ops-ledger.json` 的 `plan` 域**字段兼容**（platforms/phases 可映射），实现跨仓手工同步闭环；导入失败给出行级错误提示。

### 2.4 数据契约（默认种子，对齐漫剧仓 2026-10-05 定案）

```json
{
  "version": 1,
  "platforms": [
    {"id":"bilibili","group":"主采数","enabled":true,"aspect":"1920x1080","g5":"primary"},
    {"id":"douyin","group":"国内分发","enabled":true,"aspect":"1080x1920","g5":"none"},
    {"id":"tiktok","group":"海外分发","enabled":false,"aspect":"1080x1920","g5":"none"},
    {"id":"youtube","group":"海外分发","enabled":false,"aspect":"1080x1920","g5":"none"},
    {"id":"dramabox","group":"长线pitch","enabled":false,"aspect":"-","g5":"none"},
    {"id":"yourchannel","group":"长线pitch","enabled":false,"aspect":"-","g5":"none"}
  ],
  "accounts": [],
  "publish_matrix": {"episodes": ["sdxl-prod-001","sdxl-prod-002","sdxl-prod-003","sdxl-prod-004","sdxl-prod-005","sdxl-prod-006"], "cells": {}}
}
```

### 2.5 实现约束

1. **不动**：现有服务探针/网关指标/生产链区块与「分层边界」声明；路由表；其他页面
2. **组件范式**：新 UI 一律 GlassCard + FadeIn + lucide 图标 + 内联 style 字号（对齐 FamilyDrama 既有 0.6-1.15rem 阶梯），不引入新依赖
3. **存储**：仅 `yyc3-drama-distribution` 一个键；首次访问写入种子并标记 `version:1`（后续迁移按版本判断）
4. **状态提示**：账号 status 联动区块 A 徽标；全部账号「未开号」时区块顶部提示「等待 B站开号 → M2 窗口启动（YYC3-70 §4.1）」

### 2.6 安全红线（违反任一视为无效交付）

1. **凭证零入库**：账号密码/cookie/API 凭证**不得**出现在任何字段、localStorage、日志——面板只管元数据（昵称/状态/角色），凭证留各平台原生后台（对齐本仓 FamilyModelSettings「密钥仅存本地」的更严版：本面板连本地都不存）
2. **分层边界不变**：本页仍是看板+配置层；生产执行不在本页发起（勿添加任何「发布」按钮——发布动作在各平台原生后台人工完成）
3. 数据诚实：发布清单三态由用户勾选，不做任何自动推断

### 2.7 验收标准（全部满足才算完成）

- [ ] `pnpm typecheck` 0 error；`pnpm lint` 0 error；`pnpm build` 成功（FamilyDrama chunk 正常分割）
- [ ] 区块 A/B/C/D 全部渲染；账号 CRUD 即时持久化（刷新页面状态保留）
- [ ] 导出 JSON 可再导入复原（round-trip 一致）；与 ledger plan 域字段兼容映射在代码注释中说明
- [ ] 无凭证字段；发布清单默认全「未投」
- [ ] 深色玻璃风与现页一致（无样式突兀）；响应式（md 断点网格）

### 2.8 工作流（PDCA+）

读码（FamilyDrama/create-local-store/GlassCard）→ Plan（组件拆分与类型定义先列）→ Do（实现四区块）→ Check（§2.7 全项自检 + 截图留证）→ Archive（更新本仓衔接报告 + CHANGELOG）

## 三、附录：跨仓上下文（按需读取，本仓无依赖）

| 仓 | 文档 | 用途 |
| -- | ---- | ---- |
| YYC3-AI-Family-Comic-Drama | docs/YYC3-63 §七（平台矩阵定案）/ YYC3-70 §4.1（判定线）/ YYC3-73（推进总结） | 种子数据的决策依据；导入导出对端契约（`docs/ops/g5-ops-ledger.json` plan 域） |

> 维护约定：功能落地后在本文件追加「实现记录」节（组件清单 + 提交号），并将 §2.3 规格标注完成态。

## 变更历史

| 版本 | 日期 | 内容 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-10-05 | 创建：FamilyDrama 扩展投放账号面板完整开发提示词（实况核实于本仓 `6656979` 基线） | AI Tutor |
