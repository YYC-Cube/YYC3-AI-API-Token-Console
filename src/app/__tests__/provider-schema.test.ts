/**
 * provider-schema.test.ts — 声明式提供商 JSON 校验测试 (Phase 3 / Task 3.3)
 * ========================================================================
 * node 项目 (unit 档): JSON 数据 + zod schema 静态校验, 零外部依赖。
 * 新增提供商只改 builtin-providers.json, 本测试自动守护其合法性。
 */

import { describe, it, expect } from "vitest";
import { builtinProvidersSchema } from "../config/providers/provider-schema";
import builtinProviders from "../config/providers/builtin-providers.json";

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

  // ── schema v2 protocol 字段 (批11 / Phase 4-4.5 微改: models 语义防漂移) ──

  it("protocol 全量声明且值合法 (models 语义可机读, 防漂移测试化)", () => {
    const VALID = ["chat", "image", "tts", "video", "score"] as const;
    for (const p of builtinProviders) {
      expect(
        VALID.includes(p.protocol as (typeof VALID)[number]),
        `提供商 ${p.id} 的 protocol "${p.protocol as string}" 不合法`
      ).toBe(true);
    }
  });

  it("yyc3-* 本地服务群 protocol 与服务语义对齐 (FamilyDrama 消费字段化基础)", () => {
    const byId = Object.fromEntries(builtinProviders.map((p) => [p.id, p.protocol]));
    expect(byId["yyc3-comfyui"]).toBe("image");
    expect(byId["yyc3-syncnet"]).toBe("score");
    expect(byId["yyc3-tts"]).toBe("tts");
    expect(byId["yyc3-h3"]).toBe("video");
  });
});
