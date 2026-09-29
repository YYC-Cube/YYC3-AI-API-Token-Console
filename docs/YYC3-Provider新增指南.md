---
file: YYC3-Provider新增指南.md
description: 新增推理提供商五分钟接入指南 (声明式 JSON, 零代码改动)
author: AI Tutor <批11>
version: v1.0.0
created: 2026-09-29
updated: 2026-09-29
status: active
tags: [provider],[guide],[declarative-config]
category: guide
---

# 🔌 新增推理提供商指南（五分钟接入）

> 本项目提供商接入为**声明式**：只改一个 JSON 文件，schema 校验测试自动守护，零代码改动。
> 思想来源: ragflow「模型提供商 JSON 声明式接入」（L2 思想重实现，YYC³ 原创代码）。

## 涉及文件

| 文件 | 职责 |
| --- | --- |
| [builtin-providers.json](../src/app/config/providers/builtin-providers.json) | 提供商声明（唯一需要编辑的文件） |
| [provider-schema.ts](../src/app/config/providers/provider-schema.ts) | zod/mini schema（字段契约，一般不需要改） |
| [provider-schema.test.ts](../src/app/__tests__/provider-schema.test.ts) | 守护测试（自动校验你新增的条目） |
| [useModelProvider.ts](../src/app/hooks/useModelProvider.ts) | 运行时消费（IIFE safeParse，失败降级空列表） |

## 三步接入

### Step 1 — 编辑 JSON 条目

在 `builtin-providers.json` 数组末尾追加条目（字段顺序建议保持一致）：

```json
{
  "id": "my-provider",
  "label": "My Provider",
  "baseUrl": "https://api.example.com/v1",
  "authType": "bearer",
  "protocol": "chat",
  "models": ["my-model-v1"],
  "requiresApiKey": true,
  "isLocal": false,
  "isBuiltin": true
}
```

### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string, 非空 | **全局唯一**（与 localStorage 用户自定义提供商合并去重依赖唯一性） |
| `label` | string, 非空 | UI 显示名 |
| `baseUrl` | URL | API 根地址（`z.url()` 校验） |
| `authType` | `"bearer"` \| `"api-key"` \| `"none"` | 认证方式 |
| `protocol` | `"chat"` \| `"image"` \| `"tts"` \| `"video"` \| `"score"` | **schema v2 新增**：models 列表的协议族语义（见下节） |
| `models` | string[] | 模型清单（语义由 `protocol` 消歧） |
| `requiresApiKey` | boolean | 是否必须配置密钥 |
| `isLocal` | boolean | 本地服务（影响自动识别链路） |
| `isBuiltin` | `true`（可选） | 内置标记 |

### Step 2 — 跑守护测试

```bash
pnpm test:unit -- provider-schema
```

测试自动校验：schema 合法性 / id 无重复 / Ollama 免密存在 / **protocol 全量声明且值合法** / yyc3-* 服务群语义对齐。失败时输出具体字段错误，按提示修 JSON 即可。

### Step 3 — 运行时验证

`pnpm dev` → 打开「模型管理」（/models）确认新提供商出现在列表中；若 JSON 不合法，控制台会有 `[useModelProvider] builtin-providers.json 校验失败` 日志并降级为空列表（不崩溃）。

## protocol 字段语义（schema v2）

`models` 数组里是什么语义的东西，由 `protocol` 一句话定死，消除「checkpoint 文件名 / 音色名 / 评分版本与 chat 模型混排」的漂移：

| protocol | models 里放什么 | 示例 |
| --- | --- | --- |
| `chat` | 对话/补全模型 | `glm-4-plus`, `deepseek-chat` |
| `image` | 文生图 checkpoint / 绘图模型 | `DreamShaper_8_pruned.safetensors` |
| `tts` | 音色名 | `zh_CN-huayan-medium` |
| `video` | 图生视频模型 | `h3-pruned-preview` |
| `score` | 评分模型版本 | `syncnet_v2` |

下游（如 FamilyDrama 服务群）可基于 `protocol` 字段化消费，替代「yyc3-* 前缀 + 人工注释」的隐式对齐。

## 常见问题

- **要不要改 `provider-schema.ts`？** 不需要。仅当引入全新字段时才扩展 schema（保持 optional + 补守护测试）。
- **用户自定义提供商受此约束吗？** 不受。用户级自定义走 localStorage，不经过本 schema。
- **家族新服务（yyc3-*）接入约定**：`id` 用 `yyc3-<服务名>`，`isLocal: true`，`protocol` 按上表选，并在 [FamilyDrama.tsx](../src/app/components/ai-family/FamilyDrama.tsx) 服务清单同步登记。

---

> 关联: [Provider 声明式配置达标审计（Phase 4-4.5）](./YYC3-Provider声明式配置达标审计-Phase4-4.5.md) · [全量落地实施总结与衔接报告](./YYC3-全量落地实施总结与衔接报告.md)
