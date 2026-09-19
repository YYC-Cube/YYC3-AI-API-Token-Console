/**
 * provider-schema.ts — 提供商声明式接入 Schema (Phase 3 / Task 3.3)
 * =================================================================
 * 思想来源: ragflow「模型提供商 JSON 声明式接入」(L2 思想重实现, YYC³ 原创代码)
 *
 * 新增提供商流程: 编辑 builtin-providers.json → 校验自动生效, 零代码改动。
 * (用户级自定义提供商仍走 localStorage, 不受本文件约束)
 */

import { z } from "zod";

export const builtinProviderSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  baseUrl: z.string().url(),
  authType: z.enum(["bearer", "api-key", "none"]),
  models: z.array(z.string()),
  requiresApiKey: z.boolean(),
  isLocal: z.boolean(),
  isBuiltin: z.literal(true).optional(),
});

export const builtinProvidersSchema = z.array(builtinProviderSchema);
