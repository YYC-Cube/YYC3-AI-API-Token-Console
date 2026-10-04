/**
 * useBigModelSDK.test.tsx
 * =========================
 * useBigModelSDK Hook - BigModel SDK 桥接层行为测试
 *
 * 覆盖范围 (静态注册表/类型见 useBigModelSDK.test.ts, 本文件补 Hook 行为):
 * - 会话 CRUD (create/delete/clear/activeSession/持久化加载)
 * - 能力查询 (getCapabilities / hasCapability)
 * - sendMessage: Mock 模式 / OpenAI 真实解析 / Ollama 解析 / HTTP 错误 / 网络错误
 * - sendMessageStream: Mock 流式 / SSE 流式解析 (含 [DONE] 与坏块) / 流错误
 * - testConnection: Mock / OpenAI / Ollama / HTTP 错误 / 网络错误
 * - abort / resetStats / usageStats 持久化
 *
 * Mock 契约: fetch 经 vi.stubGlobal 注入; Mock 模式延时经 vi.useFakeTimers 推进
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBigModelSDK } from "../hooks/useBigModelSDK";
import { getOllamaChatUrl, getOllamaUrl } from "../lib/ollama-url";
import type { ChatSession, ConfiguredModel } from "../types";

// ============================================================
// Fixtures
// ============================================================

const openaiModel: ConfiguredModel = {
  id: "m-openai",
  providerId: "openai",
  providerLabel: "OpenAI",
  model: "gpt-4o",
  apiKey: "sk-test-123",
  baseUrl: "https://api.openai.com/v1",
  createdAt: 1700000000000,
  lastUsed: null,
  status: "active",
};

const mockModeModel: ConfiguredModel = {
  ...openaiModel,
  id: "m-mock",
  apiKey: "", // 无 Key + 非 ollama → Mock 模式
};

const ollamaModel: ConfiguredModel = {
  ...openaiModel,
  id: "m-ollama",
  providerId: "ollama",
  providerLabel: "Ollama",
  model: "llama3.1",
  apiKey: "",
  baseUrl: "http://localhost:11434",
};

const proxyModel: ConfiguredModel = {
  ...openaiModel,
  proxyUrl: "http://localhost:8080",
};

const fetchMock = vi.fn();

function jsonResponse(payload: unknown, init?: { status?: number; statusText?: string }) {
  return {
    ok: (init?.status ?? 200) < 400,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? "",
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function sseResponse(chunks: string[]) {
  const encoded = chunks.map((c) => new TextEncoder().encode(c));
  let i = 0;
  const reader = {
    read: async () =>
      i < encoded.length
        ? { done: false as const, value: encoded[i++] }
        : { done: true as const, value: undefined },
  };
  return { ok: true, status: 200, statusText: "", body: { getReader: () => reader } };
}

describe("useBigModelSDK", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ----------------------------------------------------------
  // 会话管理
  // ----------------------------------------------------------

  describe("会话管理", () => {
    it("createSession 应创建会话并设为活跃", () => {
      const { result } = renderHook(() => useBigModelSDK());
      let session: ChatSession | null = null;
      act(() => {
        session = result.current.createSession("m-openai", "调试会话");
      });
      expect(session!.title).toBe("调试会话");
      expect(session!.modelId).toBe("m-openai");
      expect(result.current.sessions.length).toBe(1);
      expect(result.current.activeSessionId).toBe(session!.id);
      expect(result.current.activeSession?.id).toBe(session!.id);
    });

    it("createSession 未指定标题时应生成默认标题", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai");
      });
      expect(result.current.sessions[0].title).toContain("Chat");
    });

    it("createSession 应持久化到 localStorage", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai");
      });
      const persisted = JSON.parse(localStorage.getItem("yyc3_chat_sessions") ?? "[]") as ChatSession[];
      expect(persisted.length).toBe(1);
    });

    it("初始时应从 localStorage 加载既有会话", () => {
      const seeded: ChatSession[] = [{
        id: "s-seed",
        title: "Seed",
        modelId: "m-openai",
        messages: [],
        createdAt: 1,
        updatedAt: 1,
      }];
      localStorage.setItem("yyc3_chat_sessions", JSON.stringify(seeded));
      const { result } = renderHook(() => useBigModelSDK());
      expect(result.current.sessions.length).toBe(1);
      expect(result.current.sessions[0].id).toBe("s-seed");
    });

    it("deleteSession 删除活跃会话后 activeSessionId 应置空", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai");
      });
      const id = result.current.activeSessionId!;
      act(() => {
        result.current.deleteSession(id);
      });
      expect(result.current.sessions.length).toBe(0);
      expect(result.current.activeSessionId).toBeNull();
    });

    it("deleteSession 删除非活跃会话应保留 activeSessionId", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai", "A");
        result.current.createSession("m-openai", "B");
      });
      const activeId = result.current.activeSessionId!;
      const other = result.current.sessions.find((s) => s.id !== activeId)!;
      act(() => {
        result.current.deleteSession(other.id);
      });
      expect(result.current.sessions.length).toBe(1);
      expect(result.current.activeSessionId).toBe(activeId);
    });

    it("clearSessions 应清空会话与活跃指针", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai");
        result.current.clearSessions();
      });
      expect(result.current.sessions).toEqual([]);
      expect(result.current.activeSessionId).toBeNull();
    });

    it("初始 usageStats 应从 localStorage 加载", () => {
      localStorage.setItem("yyc3_sdk_usage_stats", JSON.stringify({
        totalRequests: 7, totalTokensIn: 100, totalTokensOut: 200,
        avgLatencyMs: 55, lastRequestAt: 123, errorCount: 2,
      }));
      const { result } = renderHook(() => useBigModelSDK());
      expect(result.current.usageStats.totalRequests).toBe(7);
      expect(result.current.usageStats.errorCount).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // 能力查询
  // ----------------------------------------------------------

  describe("能力查询", () => {
    it("getCapabilities 应返回提供商能力", () => {
      const { result } = renderHook(() => useBigModelSDK());
      expect(result.current.getCapabilities("zhipu")).toContain("image-gen");
      expect(result.current.getCapabilities("openai")).not.toContain("knowledge-base");
    });

    it("未知提供商应返回空数组", () => {
      const { result } = renderHook(() => useBigModelSDK());
      expect(result.current.getCapabilities("nonexistent" as ConfiguredModel["providerId"])).toEqual([]);
    });

    it("hasCapability 应正确判定", () => {
      const { result } = renderHook(() => useBigModelSDK());
      expect(result.current.hasCapability("ollama", "chat")).toBe(true);
      expect(result.current.hasCapability("volcengine", "image-gen")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // sendMessage
  // ----------------------------------------------------------

  describe("sendMessage", () => {
    it("Mock 模式 (无 Key 非 ollama) 应返回模拟响应并累计统计", async () => {
      const { result } = renderHook(() => useBigModelSDK());
      let session: ChatSession | null = null;
      act(() => {
        session = result.current.createSession("m-mock");
      });

      let response = null as Awaited<ReturnType<typeof result.current.sendMessage>> | null;
      await act(async () => {
        const p = result.current.sendMessage(mockModeModel, "系统状态");
        await vi.runAllTimersAsync();
        response = await p;
      });

      expect(response!.finishReason).toBe("stop");
      expect(response!.content).toContain("系统状态概览");
      expect(response!.usage.promptTokens).toBe("系统状态".length);
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.error).toBeNull();
      expect(result.current.usageStats.totalRequests).toBe(1);
      expect(result.current.usageStats.totalTokensIn).toBe("系统状态".length);

      // 会话内追加 user + assistant 两条消息
      const updated = result.current.sessions.find((s) => s.id === session!.id)!;
      expect(updated.messages.length).toBe(2);
      expect(updated.messages[0].role).toBe("user");
      expect(updated.messages[1].role).toBe("assistant");
    });

    it("OpenAI 真实调用应构建 Bearer 请求并解析响应", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        id: "chatcmpl-1",
        choices: [{ message: { content: "Hello!" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }));
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.createSession("m-openai");
      });

      let response = null as Awaited<ReturnType<typeof result.current.sendMessage>> | null;
      await act(async () => {
        response = await result.current.sendMessage(openaiModel, "hi");
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-123");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.stream).toBe(false);
      expect(body.messages).toEqual([{ role: "user", content: "hi" }]);

      expect(response!.id).toBe("chatcmpl-1");
      expect(response!.content).toBe("Hello!");
      expect(response!.usage.totalTokens).toBe(30);
      expect(response!.finishReason).toBe("stop");
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.usageStats.totalTokensIn).toBe(10);
    });

    it("配置 CORS 代理时应将端点经代理转发", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }));
      const { result } = renderHook(() => useBigModelSDK());
      await act(async () => {
        await result.current.sendMessage(proxyModel, "ping");
      });
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8080/https://api.openai.com/v1/chat/completions");
    });

    it("Ollama 调用应使用同源端点并解析 ollama 格式", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        message: { content: "Ollama 回复" },
        prompt_eval_count: 5,
        eval_count: 7,
      }));
      const { result } = renderHook(() => useBigModelSDK());

      let response = null as Awaited<ReturnType<typeof result.current.sendMessage>> | null;
      await act(async () => {
        response = await result.current.sendMessage(ollamaModel, "你好");
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(getOllamaChatUrl());
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty("temperature");

      expect(response!.content).toBe("Ollama 回复");
      expect(response!.usage).toEqual({ promptTokens: 5, completionTokens: 7, totalTokens: 12 });
      expect(result.current.connectionStatus).toBe("connected");
    });

    it("HTTP 401 错误应返回友好认证提示并累计 errorCount", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 401, statusText: "Unauthorized" }));
      const { result } = renderHook(() => useBigModelSDK());

      let response = null as Awaited<ReturnType<typeof result.current.sendMessage>> | null;
      await act(async () => {
        response = await result.current.sendMessage(openaiModel, "hi");
      });

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.error).toContain("[认证失败]");
      expect(result.current.usageStats.errorCount).toBe(1);
      expect(response!.finishReason).toBe("error");
      expect(response!.usage.totalTokens).toBe(0);
    });

    it("网络失败 (非 ollama) 应返回 CORS 跨域指引", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
      const { result } = renderHook(() => useBigModelSDK());

      await act(async () => {
        await result.current.sendMessage(openaiModel, "hi");
      });
      expect(result.current.error).toContain("[CORS 跨域错误]");
    });

    it("网络失败 (ollama) 应返回 Ollama 网络指引", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
      const { result } = renderHook(() => useBigModelSDK());

      await act(async () => {
        await result.current.sendMessage(ollamaModel, "hi");
      });
      expect(result.current.error).toContain("[网络错误] 无法连接 Ollama");
    });
  });

  // ----------------------------------------------------------
  // sendMessageStream
  // ----------------------------------------------------------

  describe("sendMessageStream", () => {
    it("Mock 流式应逐字回调并返回完整内容", async () => {
      const { result } = renderHook(() => useBigModelSDK());
      const onChunk = vi.fn();

      let response = null as Awaited<ReturnType<typeof result.current.sendMessageStream>> | null;
      await act(async () => {
        const p = result.current.sendMessageStream(mockModeModel, "异常", undefined, onChunk);
        await vi.runAllTimersAsync();
        response = await p;
      });

      expect(response!.content).toContain("异常模式");
      expect(onChunk).toHaveBeenCalledTimes(response!.content.length);
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.usageStats.totalRequests).toBe(1);
    });

    it("SSE 流式解析应聚合 delta 并跳过 [DONE] 与坏块", async () => {
      fetchMock.mockResolvedValueOnce(sseResponse([
        'data: {"choices":[{"delta":{"content":"He"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"llo"}}]}\n\n',
        "data: not-json\n\n",
        "data: [DONE]\n\n",
      ]));
      const { result } = renderHook(() => useBigModelSDK());
      const onChunk = vi.fn();

      let response = null as Awaited<ReturnType<typeof result.current.sendMessageStream>> | null;
      await act(async () => {
        response = await result.current.sendMessageStream(openaiModel, "hi", undefined, onChunk);
      });

      expect(response!.content).toBe("Hello");
      expect(onChunk.mock.calls.map((c) => c[0])).toEqual(["He", "llo"]);
      expect(response!.finishReason).toBe("stop");
      expect(result.current.streaming).toBe(false);
    });

    it("Ollama 流式应走 message.content delta 分支", async () => {
      fetchMock.mockResolvedValueOnce(sseResponse([
        'data: {"message":{"content":"你好"}}\n\n',
      ]));
      const { result } = renderHook(() => useBigModelSDK());

      let response = null as Awaited<ReturnType<typeof result.current.sendMessageStream>> | null;
      await act(async () => {
        response = await result.current.sendMessageStream(ollamaModel, "hi");
      });

      expect(fetchMock.mock.calls[0][0]).toBe(getOllamaChatUrl());
      expect(response!.content).toBe("你好");
    });

    it("流式 HTTP 错误应返回错误响应", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500, statusText: "Internal Server Error" }));
      const { result } = renderHook(() => useBigModelSDK());

      let response = null as Awaited<ReturnType<typeof result.current.sendMessageStream>> | null;
      await act(async () => {
        response = await result.current.sendMessageStream(openaiModel, "hi");
      });

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.error).toContain("[服务端错误]");
      expect(response!.finishReason).toBe("error");
      expect(result.current.usageStats.errorCount).toBe(1);
    });

    it("响应体不可读时应返回错误响应", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: "", body: undefined });
      const { result } = renderHook(() => useBigModelSDK());

      await act(async () => {
        await result.current.sendMessageStream(openaiModel, "hi");
      });
      expect(result.current.error).toContain("Response body is not readable");
      expect(result.current.streaming).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // abort / testConnection / resetStats
  // ----------------------------------------------------------

  describe("abort / testConnection / resetStats", () => {
    it("abort 应复位流式状态", () => {
      const { result } = renderHook(() => useBigModelSDK());
      act(() => {
        result.current.abort();
      });
      expect(result.current.streaming).toBe(false);
      expect(result.current.streamingContent).toBe("");
    });

    it("testConnection Mock 模式应直接成功", async () => {
      const { result } = renderHook(() => useBigModelSDK());
      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        const p = result.current.testConnection(mockModeModel);
        await vi.runAllTimersAsync();
        res = await p;
      });
      expect(res!.success).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("testConnection OpenAI 应发送最小 ping 请求", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: "pong" } }],
      }));
      const { result } = renderHook(() => useBigModelSDK());

      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        res = await result.current.testConnection(openaiModel);
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(JSON.parse(init.body as string).max_tokens).toBe(1);
      expect(res!.success).toBe(true);
    });

    it("testConnection OpenAI HTTP 错误应返回失败原因", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: "denied" }, { status: 403, statusText: "Forbidden" }));
      const { result } = renderHook(() => useBigModelSDK());

      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        res = await result.current.testConnection(openaiModel);
      });
      expect(res!.success).toBe(false);
      expect(res!.error).toContain("[权限不足]");
    });

    it("testConnection Ollama 应探测 /api/tags", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ models: [] }));
      const { result } = renderHook(() => useBigModelSDK());

      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        res = await result.current.testConnection(ollamaModel);
      });

      expect(fetchMock.mock.calls[0][0]).toBe(getOllamaUrl("tags"));
      expect(res!.success).toBe(true);
    });

    it("testConnection Ollama HTTP 错误应失败", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500, statusText: "Server Error" }));
      const { result } = renderHook(() => useBigModelSDK());

      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        res = await result.current.testConnection(ollamaModel);
      });
      expect(res!.success).toBe(false);
      expect(res!.error).toContain("HTTP 500");
    });

    it("testConnection 网络失败应返回 CORS 指引", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
      const { result } = renderHook(() => useBigModelSDK());

      let res = null as Awaited<ReturnType<typeof result.current.testConnection>> | null;
      await act(async () => {
        res = await result.current.testConnection(openaiModel);
      });
      expect(res!.success).toBe(false);
      expect(res!.error).toContain("[CORS 跨域错误]");
    });

    it("resetStats 应清零统计并持久化", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
      const { result } = renderHook(() => useBigModelSDK());
      await act(async () => {
        await result.current.sendMessage(openaiModel, "hi");
      });
      expect(result.current.usageStats.errorCount).toBe(1);

      act(() => {
        result.current.resetStats();
      });
      expect(result.current.usageStats.totalRequests).toBe(0);
      expect(result.current.usageStats.errorCount).toBe(0);
      const persisted = JSON.parse(localStorage.getItem("yyc3_sdk_usage_stats") ?? "{}");
      expect(persisted.errorCount).toBe(0);
    });
  });
});
