/**
 * useModelProvider.test.tsx
 * ==========================
 * useModelProvider Hook 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModelProvider, MODEL_PROVIDERS } from "../hooks/useModelProvider";
import type { ModelProviderDef, OllamaModel } from "../types";

describe("useModelProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("MODEL_PROVIDERS 注册表", () => {
    it("应有 24 个提供商（18 云端 + 6 本地: Ollama + 5 生产服务 yyc3-*）", () => {
      expect(MODEL_PROVIDERS.length).toBe(24);
    });

    it("批18 扩容: 应含三大缺失云厂与聚合商 (Anthropic/Gemini/Qwen/混元/星火/MiniMax/阶跃/xAI/硅基流动/OpenRouter)", () => {
      for (const id of [
        "anthropic",
        "gemini",
        "qwen",
        "hunyuan",
        "spark",
        "minimax",
        "stepfun",
        "xai",
        "siliconflow",
        "openrouter",
      ]) {
        const svc = MODEL_PROVIDERS.find((p) => p.id === id);
        expect(svc, id).toBeDefined();
        expect(svc?.isLocal, id).toBe(false);
        expect(svc?.protocol, id).toBe("chat");
        expect(svc?.models.length, id).toBeGreaterThan(0);
      }
    });

    it("应含本地生产服务群（网关/ComfyUI/SyncNet/TTS/H3）", () => {
      for (const id of ["yyc3-gateway", "yyc3-comfyui", "yyc3-syncnet", "yyc3-tts", "yyc3-h3"]) {
        const svc = MODEL_PROVIDERS.find((p) => p.id === id);
        expect(svc, id).toBeDefined();
        expect(svc?.isLocal, id).toBe(true);
      }
    });

    it("应含 Z.ai", () => {
      const zhipu = MODEL_PROVIDERS.find((p) => p.id === "zhipu");
      expect(zhipu).toBeDefined();
      expect(zhipu!.label).toBe("Z.ai");
      expect(zhipu!.requiresApiKey).toBe(true);
      expect(zhipu!.isLocal).toBe(false);
    });

    it("应含 OpenAI", () => {
      const openai = MODEL_PROVIDERS.find((p) => p.id === "openai");
      expect(openai).toBeDefined();
      expect(openai!.authType).toBe("bearer");
      expect(openai!.models.length).toBeGreaterThanOrEqual(4);
    });

    it("应含 Ollama (本地)", () => {
      const ollama = MODEL_PROVIDERS.find((p) => p.id === "ollama");
      expect(ollama).toBeDefined();
      expect(ollama!.isLocal).toBe(true);
      expect(ollama!.requiresApiKey).toBe(false);
      expect(ollama!.authType).toBe("none");
    });

    it("应含 DeepSeek", () => {
      expect(MODEL_PROVIDERS.find((p) => p.id === "deepseek")).toBeDefined();
    });

    it("应含 Kimi-CN 和 Kimi-Global", () => {
      expect(MODEL_PROVIDERS.find((p) => p.id === "kimi-cn")).toBeDefined();
      expect(MODEL_PROVIDERS.find((p) => p.id === "kimi-global")).toBeDefined();
    });

    it("应含火山引擎系列", () => {
      expect(MODEL_PROVIDERS.find((p) => p.id === "volcengine")).toBeDefined();
      expect(MODEL_PROVIDERS.find((p) => p.id === "volcengine-plan")).toBeDefined();
    });
  });

  describe("Hook 基本功能", () => {
    it("初始应无已配置模型", () => {
      const { result } = renderHook(() => useModelProvider());
      expect(result.current.configuredModels.length).toBe(0);
    });

    it("addModel 应添加一个模型", () => {
      const { result } = renderHook(() => useModelProvider());
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-test-123");
      });
      expect(result.current.configuredModels.length).toBe(1);
      expect(result.current.configuredModels[0].model).toBe("gpt-4o");
      expect(result.current.configuredModels[0].providerId).toBe("openai");
    });

    it("removeModel 应删除一个模型", () => {
      const { result } = renderHook(() => useModelProvider());
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-test-123");
      });
      const id = result.current.configuredModels[0].id;
      act(() => {
        result.current.removeModel(id);
      });
      expect(result.current.configuredModels.length).toBe(0);
    });

    it("testConnection 应更新状态为 active", async () => {
      const { result } = renderHook(() => useModelProvider());
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-test-123");
      });
      const id = result.current.configuredModels[0].id;
      await act(async () => {
        await result.current.testConnection(id);
      });
      expect(result.current.configuredModels[0].status).toBe("active");
    });

    it("modalOpen 控制应正常工作", () => {
      const { result } = renderHook(() => useModelProvider());
      expect(result.current.modalOpen).toBe(false);
      act(() => result.current.openModal());
      expect(result.current.modalOpen).toBe(true);
      act(() => result.current.closeModal());
      expect(result.current.modalOpen).toBe(false);
    });

    it("stats 应正确计算", () => {
      const { result } = renderHook(() => useModelProvider());
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-test-123");
        result.current.addModel("zhipu", "glm-4-flash", "key-456");
      });
      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.providers).toBe(2);
    });

    it("fetchOllamaModels 应获取模型 (Mock fallback)", async () => {
      const { result } = renderHook(() => useModelProvider());
      await act(async () => {
        await result.current.fetchOllamaModels();
      });
      // Mock fallback returns the full offline model registry
      expect(result.current.ollamaModels.length).toBe(6);
    });
  });
});

// ============================================================
//  覆盖率补测 (第三批 P2) — CRUD / Ollama 真实路径 / 导入导出 / 合并去重
// ============================================================

describe("useModelProvider 覆盖率补测", () => {
  const PROVIDERS_KEY = "yyc3_model_providers";

  const fetchMock = vi.fn();

  const OM = (name: string): OllamaModel => ({
    name,
    model: name,
    modified_at: "2026-03-01T00:00:00Z",
    size: 1024,
    digest: `digest-${name}`,
    details: { parent_model: "", format: "gguf", family: "test", parameter_size: "7B", quantization_level: "Q4" },
  });

  const CUSTOM_PROVIDER_INPUT = {
    label: "My Custom LLM",
    baseUrl: "https://custom.example.com/v1",
    authType: "api-key" as const,
    models: ["custom-model-a"],
    requiresApiKey: true,
    isLocal: false,
  };

  function makeSavedProvider(overrides: Partial<ModelProviderDef> = {}): ModelProviderDef {
    return {
      id: "saved-custom",
      label: "Saved Custom",
      baseUrl: "https://saved.example.com",
      authType: "api-key",
      models: ["saved-m"],
      requiresApiKey: true,
      isLocal: false,
      isCustom: true,
      createdAt: 1,
      ...overrides,
    };
  }

  /** 挂载 hook 并冲刷挂载时的 fetchOllamaModels effect */
  async function mount() {
    const { result } = renderHook(() => useModelProvider());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    return result;
  }

  beforeEach(() => {
    localStorage.clear();
    // 挂载 effect 的 Ollama 拉取默认快速失败 → Mock fallback (无定时器开销)
    fetchMock.mockReset().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    // jsdom 无 AbortSignal.timeout 时补齐 (fetch mock 不消费 signal)
    if (typeof AbortSignal.timeout !== "function") {
      vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----------------------------------------------------------
  //  loadProviders 分支
  // ----------------------------------------------------------

  describe("loadProviders 分支", () => {
    it("localStorage 已有保存值时合并补入缺失的内置服务商", async () => {
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify([
        makeSavedProvider(),
        makeSavedProvider({ id: "openai", label: "Saved OpenAI", isBuiltin: true, isCustom: undefined }),
      ]));

      const result = await mount();

      // 已保存 2 个 (自定义 + openai 覆盖) + 缺失内置补入
      expect(result.current.providers.length).toBeGreaterThanOrEqual(24);
      expect(result.current.providers.find((p) => p.id === "openai")?.label).toBe("Saved OpenAI");
      expect(result.current.providers.find((p) => p.id === "saved-custom")?.label).toBe("Saved Custom");
      expect(result.current.providers.find((p) => p.id === "anthropic")).toBeDefined();
    });

    it("localStorage 值非法 JSON 时回退内置默认", async () => {
      localStorage.setItem(PROVIDERS_KEY, "{broken json");

      const result = await mount();

      expect(result.current.providers.length).toBe(24);
    });
  });

  // ----------------------------------------------------------
  //  服务商 CRUD
  // ----------------------------------------------------------

  describe("服务商 CRUD", () => {
    it("addProvider 生成 custom id 并入列持久化", async () => {
      const result = await mount();
      const before = result.current.providers.length;

      let created: ModelProviderDef | undefined;
      act(() => {
        created = result.current.addProvider(CUSTOM_PROVIDER_INPUT);
      });

      expect(created?.id).toMatch(/^custom-/);
      expect(created?.isCustom).toBe(true);
      expect(created?.isBuiltin).toBe(false);
      expect(created?.createdAt).toBeGreaterThan(0);
      expect(result.current.providers.length).toBe(before + 1);
      expect(result.current.stats.customProviders).toBe(1);
      // 持久化
      expect(localStorage.getItem(PROVIDERS_KEY)).toContain("My Custom LLM");
    });

    it("updateProvider 同步 label/baseUrl 到已配置模型", async () => {
      const result = await mount();
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-x");
      });

      act(() => {
        result.current.updateProvider("openai", { label: "OpenAI v2", baseUrl: "https://api.openai.com/v2" });
      });

      const provider = result.current.providers.find((p) => p.id === "openai");
      expect(provider?.label).toBe("OpenAI v2");
      expect(provider?.updatedAt).toBeDefined();
      expect(result.current.configuredModels[0].providerLabel).toBe("OpenAI v2");
      expect(result.current.configuredModels[0].baseUrl).toBe("https://api.openai.com/v2");
    });

    it("updateProvider 仅更新 models 时不同步已配置模型", async () => {
      const result = await mount();
      act(() => {
        result.current.addModel("openai", "gpt-4o", "sk-x");
      });
      const labelBefore = result.current.configuredModels[0].providerLabel;

      act(() => {
        result.current.updateProvider("openai", { models: ["gpt-4o", "new-model"] });
      });

      expect(result.current.providers.find((p) => p.id === "openai")?.models).toContain("new-model");
      expect(result.current.configuredModels[0].providerLabel).toBe(labelBefore);
    });

    it("removeProvider 内置不可删, 自定义删除并级联删模型", async () => {
      const result = await mount();
      let customId = "";
      act(() => {
        customId = result.current.addProvider(CUSTOM_PROVIDER_INPUT).id;
      });
      act(() => {
        result.current.addModel(customId, "custom-model-a", "k");
        result.current.addModel("openai", "gpt-4o", "k");
      });
      expect(result.current.configuredModels.length).toBe(2);

      // 内置服务商本身不可删 (实现现状: 其名下已配置模型仍会被级联清理)
      act(() => {
        result.current.removeProvider("openai");
      });
      expect(result.current.providers.find((p) => p.id === "openai")).toBeDefined();
      expect(result.current.configuredModels.length).toBe(1);
      expect(result.current.configuredModels[0].providerId).toBe(customId);

      // 自定义删除 → 级联删除其模型 (openai 的模型已在上一部级联清理)
      act(() => {
        result.current.removeProvider(customId);
      });
      expect(result.current.providers.find((p) => p.id === customId)).toBeUndefined();
      expect(result.current.configuredModels).toEqual([]);
    });

    it("resetProvider 恢复内置默认, 未知 id 无操作", async () => {
      const result = await mount();
      act(() => {
        result.current.updateProvider("openai", { label: "Changed" });
      });
      expect(result.current.providers.find((p) => p.id === "openai")?.label).toBe("Changed");

      act(() => {
        result.current.resetProvider("openai");
      });
      expect(result.current.providers.find((p) => p.id === "openai")?.label).toBe("OpenAI");

      const before = result.current.providers.length;
      act(() => {
        result.current.resetProvider("no-such-id");
      });
      expect(result.current.providers.length).toBe(before);
    });

    it("addModelToProvider 新增与去重, removeModelFromProvider 移除", async () => {
      const result = await mount();

      act(() => {
        result.current.addModelToProvider("openai", "brand-new-model");
      });
      expect(result.current.providers.find((p) => p.id === "openai")?.models).toContain("brand-new-model");

      const countAfterFirst = result.current.providers.find((p) => p.id === "openai")!.models.length;
      act(() => {
        result.current.addModelToProvider("openai", "brand-new-model");
      });
      expect(result.current.providers.find((p) => p.id === "openai")!.models.length).toBe(countAfterFirst);

      act(() => {
        result.current.removeModelFromProvider("openai", "brand-new-model");
      });
      expect(result.current.providers.find((p) => p.id === "openai")?.models).not.toContain("brand-new-model");
    });
  });

  // ----------------------------------------------------------
  //  Ollama fetch 路径
  // ----------------------------------------------------------

  describe("Ollama fetch 路径", () => {
    it("真实响应成功: 设置模型并同步 ollama provider", async () => {
      const result = await mount();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [OM("llama3:8b"), OM("qwen2:7b")] }) });

      let models: OllamaModel[] | undefined;
      await act(async () => {
        models = await result.current.fetchOllamaModels();
      });

      expect(models?.length).toBe(2);
      expect(result.current.ollamaModels.map((m) => m.name)).toEqual(["llama3:8b", "qwen2:7b"]);
      expect(result.current.ollamaError).toBeNull();
      expect(result.current.ollamaLoading).toBe(false);
      expect(result.current.providers.find((p) => p.id === "ollama")?.models).toEqual(["llama3:8b", "qwen2:7b"]);
      expect(result.current.stats.ollamaCount).toBe(2);
    });

    it("自定义 baseUrl 直连并剥尾部斜杠", async () => {
      const result = await mount();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [OM("m1")] }) });

      await act(async () => {
        await result.current.fetchOllamaModels("http://192.168.3.9:11434/");
      });

      expect(fetchMock).toHaveBeenCalledWith("http://192.168.3.9:11434/api/tags", expect.anything());
      expect(result.current.providers.find((p) => p.id === "ollama")?.baseUrl).toBe("http://192.168.3.9:11434/");
    });

    it("空模型列表不回写 provider models", async () => {
      const result = await mount();
      // 挂载 fallback 已同步 6 个 → 空成功响应不应清空
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });

      await act(async () => {
        await result.current.fetchOllamaModels();
      });

      expect(result.current.ollamaModels).toEqual([]);
      expect(result.current.providers.find((p) => p.id === "ollama")!.models.length).toBe(6);
    });

    it("HTTP 非 2xx 抛错回退 Mock 并带错误信息", async () => {
      const result = await mount();
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

      await act(async () => {
        await result.current.fetchOllamaModels();
      });

      expect(result.current.ollamaModels.length).toBe(6);
      expect(result.current.ollamaError).toContain("HTTP 503");
    });

    it("非 Error 拒绝原因 String() 化", async () => {
      const result = await mount();
      fetchMock.mockRejectedValueOnce("boom-string");

      await act(async () => {
        await result.current.fetchOllamaModels();
      });

      expect(result.current.ollamaError).toContain("boom-string");
    });
  });

  // ----------------------------------------------------------
  //  availableModels 合并去重
  // ----------------------------------------------------------

  describe("availableModels 合并", () => {
    it("云端模型 + Ollama 去重合并", async () => {
      const result = await mount();
      // 挂载 fallback 已注入 6 个 Mock Ollama 模型 (codegeex4:latest 等)
      act(() => {
        result.current.addModel("openai", "gpt-4o", "k");
        result.current.addModel("ollama", "codegeex4:latest", "");
      });

      const names = result.current.availableModels.map((m) => m.name);
      // 已配置的 ollama 模型以配置项形态出现, 不再重复出现 live 条目
      expect(names).toContain("gpt-4o (OpenAI)");
      expect(names).toContain("codegeex4:latest (Ollama (本地))");
      expect(names).not.toContain("codegeex4:latest"); // 无重复裸名条目
      // 其余 ollama 模型以 live 形态存在
      expect(names).toContain("qwen2.5:7b");

      const openaiEntry = result.current.availableModels.find((m) => m.id.startsWith("openai-"));
      expect(openaiEntry?.isLocal).toBe(false);
      const liveEntry = result.current.availableModels.find((m) => m.id === "ollama-live-qwen2.5:7b");
      expect(liveEntry?.isLocal).toBe(true);
      expect(liveEntry?.provider).toBe("Ollama (本地)");
    });
  });

  // ----------------------------------------------------------
  //  已配置模型 CRUD 边界
  // ----------------------------------------------------------

  describe("已配置模型 CRUD 边界", () => {
    it("addModel 未知 provider 返回 undefined 不入列", async () => {
      const result = await mount();

      let ret: unknown = "sentinel";
      act(() => {
        ret = result.current.addModel("no-such-provider", "m", "k");
      });

      expect(ret).toBeUndefined();
      expect(result.current.configuredModels).toEqual([]);
    });

    it("addModel 自定义 baseUrl / proxyUrl 优先, 默认回落 provider baseUrl", async () => {
      const result = await mount();

      let withCustom: { baseUrl: string; proxyUrl?: string } | undefined;
      act(() => {
        withCustom = result.current.addModel("openai", "gpt-4o", "k", "https://proxy.example.com/v1", "https://cors.example.com/");
      });
      expect(withCustom?.baseUrl).toBe("https://proxy.example.com/v1");
      expect(withCustom?.proxyUrl).toBe("https://cors.example.com/");

      let fallback: { baseUrl: string; proxyUrl?: string } | undefined;
      act(() => {
        fallback = result.current.addModel("openai", "gpt-4o-mini", "k");
      });
      expect(fallback?.baseUrl).toBe("https://api.openai.com/v1");
      expect(fallback?.proxyUrl).toBeUndefined();
    });

    it("updateModel 局部更新字段", async () => {
      const result = await mount();
      act(() => {
        result.current.addModel("openai", "gpt-4o", "k");
      });
      const id = result.current.configuredModels[0].id;

      act(() => {
        result.current.updateModel(id, { status: "error", apiKey: "k2" });
      });

      expect(result.current.configuredModels[0].status).toBe("error");
      expect(result.current.configuredModels[0].apiKey).toBe("k2");
      expect(result.current.stats.active).toBe(0);
    });
  });

  // ----------------------------------------------------------
  //  导入 / 导出
  // ----------------------------------------------------------

  describe("导入导出", () => {
    it("exportConfig v2 结构含自定义服务商与已改内置", async () => {
      const result = await mount();
      act(() => {
        result.current.addProvider(CUSTOM_PROVIDER_INPUT);
        result.current.updateProvider("openai", { label: "Touched" });
        result.current.addModel("openai", "gpt-4o", "k");
      });

      const parsed = JSON.parse(result.current.exportConfig()) as {
        version: number;
        providers: ModelProviderDef[];
        configuredModels: unknown[];
      };
      expect(parsed.version).toBe(2);
      // 自定义 (isCustom) 与被改动过的内置 (updatedAt) 均导出
      expect(parsed.providers.some((p) => p.id.startsWith("custom-"))).toBe(true);
      expect(parsed.providers.some((p) => p.id === "openai")).toBe(true);
      expect(parsed.configuredModels.length).toBe(1);
    });

    it("importConfig 追加新项/更新自定义项/忽略内置覆盖/去重模型", async () => {
      const result = await mount();
      let customId = "";
      act(() => {
        customId = result.current.addProvider(CUSTOM_PROVIDER_INPUT).id;
      });
      act(() => {
        result.current.addModel("openai", "gpt-4o", "k");
      });
      const existingModelId = result.current.configuredModels[0].id;

      const incoming = JSON.stringify({
        providers: [
          makeSavedProvider({ id: "imp-new", label: "Imported New" }),
          makeSavedProvider({ id: customId, label: "Renamed Custom" }),
          makeSavedProvider({ id: "openai", label: "Try Overwrite" }),
        ],
        configuredModels: [
          { id: "imp-model", providerId: "imp-new", providerLabel: "Imported New", model: "m9", apiKey: "k", baseUrl: "https://saved.example.com", createdAt: 1, lastUsed: null, status: "unchecked" },
          { id: existingModelId, providerId: "openai", providerLabel: "dup", model: "dup", apiKey: "k", baseUrl: "x", createdAt: 2, lastUsed: null, status: "unchecked" },
        ],
      });

      let ok = false;
      act(() => {
        ok = result.current.importConfig(incoming);
      });

      expect(ok).toBe(true);
      expect(result.current.providers.find((p) => p.id === "imp-new")?.label).toBe("Imported New");
      expect(result.current.providers.find((p) => p.id === customId)?.label).toBe("Renamed Custom");
      // 内置服务商不被导入数据覆盖
      expect(result.current.providers.find((p) => p.id === "openai")?.label).toBe("OpenAI");
      // 模型: 新增 1 + 已存在 id 去重
      expect(result.current.configuredModels.length).toBe(2);
      expect(result.current.configuredModels.some((m) => m.id === "imp-model")).toBe(true);
    });

    it("importConfig 非法 JSON 返回 false", async () => {
      const result = await mount();

      let ok = true;
      act(() => {
        ok = result.current.importConfig("{broken");
      });

      expect(ok).toBe(false);
    });
  });

  // ----------------------------------------------------------
  //  schema 兜底
  // ----------------------------------------------------------

  describe("builtin-providers.json 校验兜底", () => {
    it("校验失败时内置列表兜底为空并 console.error", async () => {
      vi.resetModules();
      vi.doMock("../config/providers/builtin-providers.json", () => ({
        default: [{ id: "broken", label: "x" }], // 缺 baseUrl/models 等必填字段 → schema 拒绝
      }));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const mod = await import("../hooks/useModelProvider");
        expect(mod.MODEL_PROVIDERS).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
        vi.doUnmock("../config/providers/builtin-providers.json");
        vi.resetModules();
      }
    });
  });
});
