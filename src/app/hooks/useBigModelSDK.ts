/**
 * useBigModelSDK.ts
 * ==================
 * BigModel SDK 桥接层 Hook
 *
 * 功能:
 * - 将 ConfiguredModel → 实际 API 调用
 * - 统一 chat / chatStream 接口 (支持 Z.ai / OpenAI / Ollama / 其他 OpenAI-compatible)
 * - Mock 模式: 无 API Key 时返回模拟数据
 * - 使用统计 (localStorage 持久化)
 * - 会话管理 (localStorage 持久化)
 */

import { useState, useCallback, useMemo, useRef } from "react";
import type {
  ConfiguredModel,
  ModelProviderId,
  ChatMessage,
  ChatSession,
  ChatRole,
  SDKConnectionStatus,
  SDKUsageStats,
  SDKChatResponse,
  SDKCapability,
  SDKProviderCapabilities,
} from "../types";
import { getOllamaChatUrl, getOllamaUrl } from "../lib/ollama-url";

// ============================================================
// 常量
// ============================================================

const SESSIONS_KEY = "yyc3_chat_sessions";
const STATS_KEY = "yyc3_sdk_usage_stats";

/** 各提供商支持的能力 */
export const PROVIDER_CAPABILITIES: SDKProviderCapabilities[] = [
  { providerId: "zhipu",          capabilities: ["chat", "chat-stream", "file-upload", "knowledge-base", "image-gen", "tts", "stt", "video-gen", "code-gen"] },
  { providerId: "zhipu-plan",     capabilities: ["chat", "chat-stream"] },
  { providerId: "openai",         capabilities: ["chat", "chat-stream", "image-gen", "tts", "stt", "code-gen"] },
  { providerId: "kimi-cn",        capabilities: ["chat", "chat-stream"] },
  { providerId: "kimi-global",    capabilities: ["chat", "chat-stream"] },
  { providerId: "deepseek",       capabilities: ["chat", "chat-stream", "code-gen"] },
  { providerId: "volcengine",     capabilities: ["chat", "chat-stream"] },
  { providerId: "volcengine-plan", capabilities: ["chat", "chat-stream"] },
  { providerId: "ollama",         capabilities: ["chat", "chat-stream", "code-gen"] },
];

// ============================================================
// 工具函数
// ============================================================

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function loadStats(): SDKUsageStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : defaultStats();
  } catch { return defaultStats(); }
}

function saveStats(stats: SDKUsageStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function defaultStats(): SDKUsageStats {
  return {
    totalRequests: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    avgLatencyMs: 0,
    lastRequestAt: null,
    errorCount: 0,
  };
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 构建 Authorization header */
function buildHeaders(model: ConfiguredModel): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (model.providerId === "zhipu" || model.providerId === "zhipu-plan") {
    // Z.ai 使用 Bearer token (官方 SDK 用 Bearer)
    headers["Authorization"] = `Bearer ${model.apiKey}`;
  } else if (model.providerId === "ollama") {
    // Ollama 无需 auth
  } else {
    // OpenAI / Kimi / DeepSeek / 火山引擎 均为 Bearer
    headers["Authorization"] = `Bearer ${model.apiKey}`;
  }

  return headers;
}

/** 构建 chat endpoint URL (支持 CORS 代理) */
function buildChatUrl(model: ConfiguredModel): string {
  // Ollama: 优先使用同源代理 (零 CORS)
  if (model.providerId === "ollama") {
    return getOllamaChatUrl();
  }

  const base = model.baseUrl.replace(/\/$/, "");
  // Z.ai / OpenAI / Kimi / DeepSeek / 火山引擎 都用 OpenAI-compatible 端点
  const endpoint = `${base}/chat/completions`;

  // 如果配置了 CORS 代理, 将目标 URL 通过代理转发
  if (model.proxyUrl) {
    const proxy = model.proxyUrl.replace(/\/$/, "");
    return `${proxy}/${endpoint}`;
  }

  return endpoint;
}

/** 构建 test endpoint URL (支持 CORS 代理) */
function buildTestUrl(model: ConfiguredModel, path: string): string {
  // Ollama: 优先使用同源代理
  if (model.providerId === "ollama") {
    const subPath = path.replace(/^\/api\//, "");
    return getOllamaUrl(subPath);
  }

  const base = model.baseUrl.replace(/\/$/, "");
  const endpoint = `${base}${path}`;

  if (model.proxyUrl) {
    const proxy = model.proxyUrl.replace(/\/$/, "");
    return `${proxy}/${endpoint}`;
  }

  return endpoint;
}

/** 构建请求 body */
function buildRequestBody(
  model: ConfiguredModel,
  messages: { role: ChatRole; content: string }[],
  stream: boolean,
  temperature: number,
): Record<string, unknown> {
  if (model.providerId === "ollama") {
    return {
      model: model.model,
      messages,
      stream,
    };
  }

  return {
    model: model.model,
    messages,
    temperature,
    stream,
  };
}

// ============================================================
// Mock 流式响应模拟
// ============================================================

const MOCK_RESPONSES: Record<string, string> = {
  default: "你好！我是 YYC3 CloudPivot Intelli-Matrix 的 AI 助手。当前处于 Mock 模式，如需真实 API 调用请先在「模型管理」中配置有效的 API Key。\n\n我可以协助你进行：\n- 系统状态分析\n- 异常模式识别\n- 操作建议推荐\n- Text-to-SQL 查询\n\n请问有什么可以帮助你的？",
  status: "**系统状态概览 (Mock)**\n\n| 指标 | 值 | 状态 |\n|------|-----|------|\n| 活跃节点 | 12/13 | ✅ 正常 |\n| GPU 利用率 | 78.5% | ⚠️ 偏高 |\n| Token 吞吐 | 2,847/s | ✅ 正常 |\n| 存储占用 | 85.8% | ⚠️ 接近阈值 |\n\n建议关注 NAS-Storage-01 存储容量。",
  error: "**检测到以下异常模式 (Mock)**\n\n1. 🔴 GPU-A100-03 推理延迟 2,450ms > 2,000ms 阈值\n2. ⚠️ 显存使用率 89% 接近 OOM\n3. ⚠️ NAS 存储 85.8% 预计 7 天达警戒线\n\n**推荐操作**: 将 LLaMA-70B 迁移到 GPU-A100-07（当前负载 15%）",
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("状态") || lower.includes("status")) return MOCK_RESPONSES.status;
  if (lower.includes("异常") || lower.includes("error") || lower.includes("告警")) return MOCK_RESPONSES.error;
  return MOCK_RESPONSES.default;
}

// ============================================================
// Hook
// ============================================================

export function useBigModelSDK() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SDKConnectionStatus>("idle");
  const [usageStats, setUsageStats] = useState<SDKUsageStats>(loadStats);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ========== 会话管理 ==========

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const createSession = useCallback((modelId: string, title?: string): ChatSession => {
    const session: ChatSession = {
      id: genId(),
      title: title || `Chat ${new Date().toLocaleTimeString()}`,
      modelId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveSessionId(session.id);
    return session;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    setActiveSessionId((prev) => (prev === id ? null : prev));
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
    saveSessions([]);
    setActiveSessionId(null);
  }, []);

  // ========== 能力查询 ==========

  const getCapabilities = useCallback((providerId: ModelProviderId): SDKCapability[] => {
    return PROVIDER_CAPABILITIES.find((p) => p.providerId === providerId)?.capabilities ?? [];
  }, []);

  const hasCapability = useCallback((providerId: ModelProviderId, cap: SDKCapability): boolean => {
    return getCapabilities(providerId).includes(cap);
  }, [getCapabilities]);

  // ========== 核心: 发送消息 (同步) ==========

  const sendMessage = useCallback(async (
    configuredModel: ConfiguredModel,
    userContent: string,
    sessionId?: string,
  ): Promise<SDKChatResponse> => {
    setError(null);
    setConnectionStatus("connecting");

    const isMock = !configuredModel.apiKey && configuredModel.providerId !== "ollama";
    const targetSessionId = sessionId || activeSessionId;

    // 创建 user message
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      model: configuredModel.model,
      provider: configuredModel.providerId,
    };

    // 追加到 session
    const updateMessages = (newMsg: ChatMessage) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, newMsg], updatedAt: Date.now() }
            : s,
        );
        saveSessions(next);
        return next;
      });
    };

    updateMessages(userMsg);

    const start = Date.now();

    if (isMock) {
      // Mock 模式
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
      const mockContent = getMockResponse(userContent);
      const mockTokens = { input: userContent.length, output: mockContent.length };

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: mockContent,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
        tokens: mockTokens,
      };
      updateMessages(assistantMsg);

      const latency = Date.now() - start;
      const response: SDKChatResponse = {
        id: genId(),
        model: configuredModel.model,
        content: mockContent,
        finishReason: "stop",
        usage: { promptTokens: mockTokens.input, completionTokens: mockTokens.output, totalTokens: mockTokens.input + mockTokens.output },
        latencyMs: latency,
      };

      updateStats(response);
      setConnectionStatus("connected");
      return response;
    }

    // 真实 API 调用
    try {
      const currentSession = sessions.find((s) => s.id === targetSessionId);
      const history = currentSession?.messages.map((m) => ({ role: m.role, content: m.content })) ?? [];
      history.push({ role: "user" as ChatRole, content: userContent });

      const url = buildChatUrl(configuredModel);
      const headers = buildHeaders(configuredModel);
      const body = buildRequestBody(configuredModel, history, false, 0.7);

      abortRef.current = new AbortController();
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const latency = Date.now() - start;

      // 解析响应 (OpenAI-compatible 格式)
      let content: string;
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      if (configuredModel.providerId === "ollama") {
        content = data.message?.content ?? "";
        usage = {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        };
      } else {
        content = data.choices?.[0]?.message?.content ?? "";
        usage = {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        };
      }

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
        tokens: { input: usage.promptTokens, output: usage.completionTokens },
      };
      updateMessages(assistantMsg);

      const response: SDKChatResponse = {
        id: data.id ?? genId(),
        model: configuredModel.model,
        content,
        finishReason: configuredModel.providerId === "ollama" ? "stop" : (data.choices?.[0]?.finish_reason ?? "stop"),
        usage,
        latencyMs: latency,
      };

      updateStats(response);
      setConnectionStatus("connected");
      return response;
    } catch (err: any) {
      const latency = Date.now() - start;
      setConnectionStatus("error");
      const friendly = friendlyError(err, configuredModel);
      setError(friendly);

      setUsageStats((prev) => {
        const next = { ...prev, errorCount: prev.errorCount + 1 };
        saveStats(next);
        return next;
      });

      // 返回错误响应 & 追加错误消息
      const errorMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: friendly,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
      };
      updateMessages(errorMsg);

      return {
        id: genId(),
        model: configuredModel.model,
        content: friendly,
        finishReason: "error",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: latency,
      };
    }
  }, [activeSessionId, sessions]);

  // ========== 核心: 流式发送 ==========

  const sendMessageStream = useCallback(async (
    configuredModel: ConfiguredModel,
    userContent: string,
    sessionId?: string,
    onChunk?: (chunk: string) => void,
  ): Promise<SDKChatResponse> => {
    setError(null);
    setStreaming(true);
    setStreamingContent("");
    setConnectionStatus("connecting");

    const isMock = !configuredModel.apiKey && configuredModel.providerId !== "ollama";
    const targetSessionId = sessionId || activeSessionId;

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      model: configuredModel.model,
      provider: configuredModel.providerId,
    };

    const updateMessages = (newMsg: ChatMessage) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, newMsg], updatedAt: Date.now() }
            : s,
        );
        saveSessions(next);
        return next;
      });
    };

    updateMessages(userMsg);

    const start = Date.now();

    if (isMock) {
      // Mock 流式
      const mockContent = getMockResponse(userContent);
      const chars = mockContent.split("");
      let accumulated = "";

      for (const char of chars) {
        await new Promise((r) => setTimeout(r, 15 + Math.random() * 25));
        accumulated += char;
        setStreamingContent(accumulated);
        onChunk?.(char);
      }

      const mockTokens = { input: userContent.length, output: mockContent.length };
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: mockContent,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
        tokens: mockTokens,
      };
      updateMessages(assistantMsg);

      const latency = Date.now() - start;
      const response: SDKChatResponse = {
        id: genId(),
        model: configuredModel.model,
        content: mockContent,
        finishReason: "stop",
        usage: { promptTokens: mockTokens.input, completionTokens: mockTokens.output, totalTokens: mockTokens.input + mockTokens.output },
        latencyMs: latency,
      };

      updateStats(response);
      setStreaming(false);
      setStreamingContent("");
      setConnectionStatus("connected");
      return response;
    }

    // 真实流式 API
    try {
      const currentSession = sessions.find((s) => s.id === targetSessionId);
      const history = currentSession?.messages.map((m) => ({ role: m.role, content: m.content })) ?? [];
      history.push({ role: "user" as ChatRole, content: userContent });

      const url = buildChatUrl(configuredModel);
      const headers = buildHeaders(configuredModel);
      const body = buildRequestBody(configuredModel, history, true, 0.7);

      abortRef.current = new AbortController();
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);

      setConnectionStatus("connected");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const chunk = JSON.parse(data);
              const delta = configuredModel.providerId === "ollama"
                ? chunk.message?.content ?? ""
                : chunk.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullContent += delta;
                setStreamingContent(fullContent);
                onChunk?.(delta);
              }
            } catch { /* skip malformed chunks */ }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
        tokens: { input: userContent.length, output: fullContent.length },
      };
      updateMessages(assistantMsg);

      const latency = Date.now() - start;
      const response: SDKChatResponse = {
        id: genId(),
        model: configuredModel.model,
        content: fullContent,
        finishReason: "stop",
        usage: { promptTokens: userContent.length, completionTokens: fullContent.length, totalTokens: userContent.length + fullContent.length },
        latencyMs: latency,
      };

      updateStats(response);
      setStreaming(false);
      setStreamingContent("");
      return response;
    } catch (err: any) {
      setConnectionStatus("error");
      const friendly = friendlyError(err, configuredModel);
      setError(friendly);
      setStreaming(false);
      setStreamingContent("");

      setUsageStats((prev) => {
        const next = { ...prev, errorCount: prev.errorCount + 1 };
        saveStats(next);
        return next;
      });

      const errorMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: friendly,
        timestamp: Date.now(),
        model: configuredModel.model,
        provider: configuredModel.providerId,
      };
      updateMessages(errorMsg);

      return {
        id: genId(),
        model: configuredModel.model,
        content: friendly,
        finishReason: "error",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - start,
      };
    }
  }, [activeSessionId, sessions]);

  // ========== 中断请求 ==========

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamingContent("");
  }, []);

  // ========== 统计更新 ==========

  const updateStats = useCallback((response: SDKChatResponse) => {
    setUsageStats((prev) => {
      const totalReqs = prev.totalRequests + 1;
      const newAvg = ((prev.avgLatencyMs * prev.totalRequests) + response.latencyMs) / totalReqs;
      const next: SDKUsageStats = {
        totalRequests: totalReqs,
        totalTokensIn: prev.totalTokensIn + response.usage.promptTokens,
        totalTokensOut: prev.totalTokensOut + response.usage.completionTokens,
        avgLatencyMs: Math.round(newAvg),
        lastRequestAt: Date.now(),
        errorCount: prev.errorCount,
      };
      saveStats(next);
      return next;
    });
  }, []);

  // ========== 连接测试 (真实 API 调用) ==========

  const testConnection = useCallback(async (configuredModel: ConfiguredModel): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> => {
    const start = Date.now();

    if (!configuredModel.apiKey && configuredModel.providerId !== "ollama") {
      // Mock test
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      return { success: true, latencyMs: Date.now() - start };
    }

    try {
      if (configuredModel.providerId === "ollama") {
        const testUrl = buildTestUrl(configuredModel, "/api/tags");
        const res = await fetch(testUrl, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { success: true, latencyMs: Date.now() - start };
      }

      // OpenAI-compatible: 发一个最小请求
      const url = buildChatUrl(configuredModel);
      const headers = buildHeaders(configuredModel);
      const body = buildRequestBody(
        configuredModel,
        [{ role: "user" as ChatRole, content: "ping" }],
        false,
        0,
      );

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, max_tokens: 1 }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      return { success: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: friendlyError(err, configuredModel) };
    }
  }, []);

  // ========== 重置统计 ==========

  const resetStats = useCallback(() => {
    const empty = defaultStats();
    setUsageStats(empty);
    saveStats(empty);
  }, []);

  return {
    // 会话管理
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearSessions,

    // 状态
    connectionStatus,
    streaming,
    streamingContent,
    error,

    // 核心方法
    sendMessage,
    sendMessageStream,
    abort,
    testConnection,

    // 能力
    getCapabilities,
    hasCapability,

    // 统计
    usageStats,
    resetStats,
  };
}

// ============================================================
// 辅助函数
// ============================================================

/** 检测 CORS 和网络错误, 返回用户友好的中文提示 */
function friendlyError(err: any, model: ConfiguredModel): string {
  const msg = err?.message || String(err);

  // 典型 CORS / 网络拒绝错误
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("CORS") ||
    msg.includes("blocked") ||
    msg.includes("cross-origin") ||
    msg.includes("net::ERR_FAILED")
  ) {
    if (model.providerId === "ollama") {
      return `[网络错误] 无法连接 Ollama (${model.baseUrl})。请确认:\n` +
        `1. Ollama 已启动 (ollama serve)\n` +
        `2. 已设置 OLLAMA_ORIGINS="*" 允许跨域\n` +
        `3. 地址端口正确`;
    }
    return `[CORS 跨域错误] 浏览器安全策略禁止前端直接调用 ${model.baseUrl}。\n\n` +
      `解决方案:\n` +
      `1. 配置 CORS 代理: 在「模型管理」中设置代理 URL\n` +
      `   例: 本地运行 npx cors-anywhere 后填入 http://localhost:8080\n` +
      `2. 使用 Ollama 本地模型 (无需代理)\n` +
      `3. 部署后端代理服务转发 API 请求`;
  }

  // HTTP 错误码
  if (msg.includes("401") || msg.includes("Unauthorized")) {
    return `[认证失败] API Key 无效或已过期。请在「模型管理」中检查 ${model.providerLabel} 的 API Key。`;
  }
  if (msg.includes("403") || msg.includes("Forbidden")) {
    return `[权限不足] API Key 无权访问模型 ${model.model}。请检查 ${model.providerLabel} 账户权限。`;
  }
  if (msg.includes("429") || msg.includes("Too Many Requests")) {
    return `[请求过频] ${model.providerLabel} 返回限流, 请稍后再试。`;
  }
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
    return `[服务端错误] ${model.providerLabel} 服务暂时不可用 (${msg})。请稍后再试。`;
  }
  if (msg.includes("timeout") || msg.includes("Timeout") || msg.includes("AbortError")) {
    return `[请求超时] 连接 ${model.providerLabel} 超时。请检查网络连接。`;
  }

  return `[请求失败] ${msg}`;
}