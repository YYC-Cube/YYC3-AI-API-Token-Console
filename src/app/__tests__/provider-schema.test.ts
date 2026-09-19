/**
 * provider-schema.test.ts — 声明式提供商 JSON 校验测试 (Phase 3 / Task 3.3)
 * ========================================================================
 * node 项目 (unit 档): JSON 数据 + zod schema 静态校验, 零外部依赖。
 * 新增提供商只改 builtin-providers.json, 本测试自动守护其合法性。
 */

import { describe, expect, it } from "vitest";
import builtinProviders from "../config/providers/builtin-providers.json";
import { builtinProvidersSchema } from "../config/providers/provider-schema";

describe("builtin-providers.json 声明式校验", () => {
  it("通过 zod schema 校验 (新增提供商零代码改动的前提)", () => {
    const result = builtinProvidersSchema.safeParse(builtinProviders);
    if (!result.success) {
      // 输出具体字段错误便于定位 JSON 手误
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`提供商声明不合法 → ${issues}`);
    }
    expect(result.success).toBe(true);
  });

  it("id 无重复 (localStorage 合并去重依赖唯一 id)", () => {
    const ids = builtinProviders.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Ollama 本地提供商存在且免密 (自动识别链路依赖)", () => {
    const ollama = builtinProviders.find((p) => p.isLocal);
    expect(ollama).toBeDefined();
    expect(ollama?.requiresApiKey).toBe(false);
  });
});
