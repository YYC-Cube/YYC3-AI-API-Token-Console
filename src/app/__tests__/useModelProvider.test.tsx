/**
 * useModelProvider.test.tsx
 * ==========================
 * useModelProvider Hook 测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModelProvider, MODEL_PROVIDERS } from "../hooks/useModelProvider";

describe("useModelProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("MODEL_PROVIDERS 注册表", () => {
    it("应有 9 个提供商", () => {
      expect(MODEL_PROVIDERS.length).toBe(9);
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
