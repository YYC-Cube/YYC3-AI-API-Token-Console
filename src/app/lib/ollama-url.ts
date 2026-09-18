/**
 * ollama-url.ts
 * ==============
 * Ollama 端点解析工具
 *
 * 路由策略 (优先级从高到低):
 * 1. 同源代理 — 当 hostname 为 192.168.* / localhost / 127.0.0.1 时,
 *    使用 `${origin}${OLLAMA_PROXY_PATH}` (零 CORS 开销)
 * 2. 直连 — 使用 OLLAMA_BASE_URL (需 OLLAMA_ORIGINS 白名单)
 *
 * 后端代理路由映射:
 *   /api/v1/llm/ollama/chat   → Ollama /api/chat
 *   /api/v1/llm/ollama/tags   → Ollama /api/tags
 *   /api/v1/llm/ollama/show   → Ollama /api/show
 *   /api/v1/llm/ollama/...    → Ollama /api/...
 */

import { env } from "./env-config";

// ============================================================
// 环境检测
// ============================================================

/** 是否运行在本地部署环境 (非远程沙箱) */
export function isLocalDeployment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.")
  );
}

/** 是否应使用同源代理 */
export function shouldUseProxy(): boolean {
  return isLocalDeployment();
}

// ============================================================
// 端点解析
// ============================================================

/**
 * 获取 Ollama Chat 端点
 * - 本地部署: /api/v1/llm/ollama/chat (同源代理, 零 CORS)
 * - 其他环境: http://localhost:11434/api/chat (直连)
 */
export function getOllamaChatUrl(): string {
  if (shouldUseProxy()) {
    const proxyPath = env("OLLAMA_PROXY_PATH").replace(/\/$/, "");
    return `${proxyPath}/chat`;
  }
  const base = env("OLLAMA_BASE_URL").replace(/\/$/, "");
  return `${base}/api/chat`;
}

/**
 * 获取 Ollama Tags 端点 (模型列表)
 * - 本地部署: /api/v1/llm/ollama/tags
 * - 其他环境: http://localhost:11434/api/tags
 */
export function getOllamaTagsUrl(): string {
  if (shouldUseProxy()) {
    const proxyPath = env("OLLAMA_PROXY_PATH").replace(/\/$/, "");
    return `${proxyPath}/tags`;
  }
  const base = env("OLLAMA_BASE_URL").replace(/\/$/, "");
  return `${base}/api/tags`;
}

/**
 * 获取 Ollama 任意子路径端点
 * @param subPath 子路径, 如 "show", "generate", "embeddings"
 */
export function getOllamaUrl(subPath: string): string {
  const path = subPath.replace(/^\//, "");
  if (shouldUseProxy()) {
    const proxyPath = env("OLLAMA_PROXY_PATH").replace(/\/$/, "");
    return `${proxyPath}/${path}`;
  }
  const base = env("OLLAMA_BASE_URL").replace(/\/$/, "");
  return `${base}/api/${path}`;
}

/**
 * 获取诊断信息 (供连接测试面板使用)
 */
export function getOllamaEndpointInfo(): {
  mode: "proxy" | "direct";
  chatUrl: string;
  tagsUrl: string;
  proxyPath: string;
  directBase: string;
} {
  return {
    mode: shouldUseProxy() ? "proxy" : "direct",
    chatUrl: getOllamaChatUrl(),
    tagsUrl: getOllamaTagsUrl(),
    proxyPath: env("OLLAMA_PROXY_PATH"),
    directBase: env("OLLAMA_BASE_URL"),
  };
}
