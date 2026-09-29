/**
 * provider-schema.ts — 提供商声明式接入 Schema (Phase 3 / Task 3.3)
 * =================================================================
 * 思想来源: ragflow「模型提供商 JSON 声明式接入」(L2 思想重实现, YYC³ 原创代码)
 *
 * 新增提供商流程: 编辑 builtin-providers.json → 校验自动生效, 零代码改动。
 * (用户级自定义提供商仍走 localStorage, 不受本文件约束)
 */

import { z } from "zod/mini";

// zod/mini 形态 (批6 减包): 无链式方法, 长度/可选等校验走 check(顶层构造器) ——
// 语义与 classic 等价 (min(1)=minLength(1), url=z.url(), literal().optional=z.optional(literal))
export const builtinProviderSchema = z.object({
  id: z.string().check(z.minLength(1)),
  label: z.string().check(z.minLength(1)),
  baseUrl: z.url(),
  authType: z.enum(["bearer", "api-key", "none"]),
  // schema v2 (批11 / Phase 4-4.5 微改): models 语义消歧 —
  // 该提供商 models 列表的协议族 (checkpoint 文件名/音色名/评分版本不再与 chat 模型混淆)
  protocol: z.optional(z.enum(["chat", "image", "tts", "video", "score"])),
  models: z.array(z.string()),
  requiresApiKey: z.boolean(),
  isLocal: z.boolean(),
  isBuiltin: z.optional(z.literal(true)),
});

export const builtinProvidersSchema = z.array(builtinProviderSchema);
