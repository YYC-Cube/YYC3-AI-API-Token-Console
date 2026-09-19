/**
 * ServiceConnectionTest.tsx
 * ==========================
 * 全链路服务连接测试面板 · 路由: /connection-test
 *
 * 功能:
 * - AI 模型服务商连接测试 (Z.ai / OpenAI / DeepSeek / Kimi / Ollama / ...)
 * - 数据库连接测试 (PostgreSQL / MySQL / Redis / MongoDB / SQLite)
 * - WebSocket 连接测试
 * - 网络连通性测试 (内网 / 外网)
 * - CORS 代理检测与自动配置
 * - 详细诊断日志 + 解决方案提示
 * - 一键全部测试 + 单项测试
 * - 测试结果持久化 (localStorage)
 */

import React, { useState, useCallback, useRef, useContext } from "react";
import {
  Zap, Play, RotateCcw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Globe, Server, Database, Radio, Shield,
  ChevronDown, ChevronUp, Clock,
  ArrowRight, Terminal, Info, Copy,
  Activity, Network,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ViewContext } from "../lib/view-context";
import { useModelProvider } from "../hooks/useModelProvider";
import { dbConnectionStore, type DBConnection } from "../stores/dashboard-stores";
import { env } from "../lib/env-config";
import { getOllamaEndpointInfo, getOllamaChatUrl, getOllamaTagsUrl } from "../lib/ollama-url";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

type TestStatus = "idle" | "running" | "pass" | "fail" | "warn" | "skip";

interface TestStep {
  label: string;
  status: TestStatus;
  detail: string;
  latencyMs?: number;
  timestamp?: number;
}

interface TestResult {
  id: string;
  category: "ai" | "db" | "network" | "websocket";
  name: string;
  icon: React.ElementType;
  color: string;
  steps: TestStep[];
  overallStatus: TestStatus;
  startedAt?: number;
  completedAt?: number;
  suggestion?: string;
}

const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

const STATUS_META: Record<TestStatus, { label: string; color: string; icon: React.ElementType }> = {
  idle:    { label: "待测试", color: "rgba(0,212,255,0.3)", icon: Clock },
  running: { label: "测试中", color: "#ffdd00", icon: Loader2 },
  pass:    { label: "通过",   color: "#00ff88", icon: CheckCircle2 },
  fail:    { label: "失败",   color: "#ff3366", icon: XCircle },
  warn:    { label: "警告",   color: "#ffaa00", icon: AlertTriangle },
  skip:    { label: "跳过",   color: "rgba(0,212,255,0.2)", icon: Clock },
};

const RESULTS_KEY = "yyc3_connection_test_results";

function loadResults(): TestResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveResults(results: TestResult[]) {
  try { localStorage.setItem(RESULTS_KEY, JSON.stringify(results)); } catch {}
}

// ============================================================
// Network test helpers
// ============================================================

async function testFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  body?: string;
  errorType?: "cors" | "network" | "timeout" | "http" | "unknown";
  errorMsg?: string;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    let body = "";
    try { body = await res.text(); } catch {}
    return { ok: res.ok, status: res.status, statusText: res.statusText, latencyMs, body };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg = err?.message || String(err);
    let errorType: "cors" | "network" | "timeout" | "unknown" = "unknown";
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("CORS") || msg.includes("cross-origin") || msg.includes("net::ERR_FAILED")) {
      errorType = "cors";
    } else if (msg.includes("AbortError") || msg.includes("timeout") || msg.includes("aborted")) {
      errorType = "timeout";
    } else if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ECONNREFUSED")) {
      errorType = "network";
    }
    return { ok: false, status: 0, statusText: "", latencyMs, errorType, errorMsg: msg };
  }
}

// ============================================================
// Component
// ============================================================

export function ServiceConnectionTest() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const { providers, configuredModels } = useModelProvider();
  const dbConnections = dbConnectionStore.getAll();

  const [results, setResults] = useState<TestResult[]>(loadResults);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("yyc3_cors_proxy") || "");
  const [showProxy, setShowProxy] = useState(false);
  const abortRef = useRef(false);

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const saveProxy = (url: string) => {
    setProxyUrl(url);
    if (url) localStorage.setItem("yyc3_cors_proxy", url);
    else localStorage.removeItem("yyc3_cors_proxy");
  };

  // ============================================================
  // Test: AI Model Provider
  // ============================================================

  const testAIProvider = useCallback(async (
    providerId: string,
    providerLabel: string,
    baseUrl: string,
    authType: string,
    apiKey: string,
    model: string,
    isLocal: boolean,
    proxy?: string,
  ): Promise<TestResult> => {
    const result: TestResult = {
      id: `ai-${providerId}-${model}`,
      category: "ai",
      name: `${providerLabel} / ${model}`,
      icon: isLocal ? Server : Globe,
      color: isLocal ? "#00ff88" : "#00d4ff",
      steps: [],
      overallStatus: "running",
      startedAt: Date.now(),
    };

    const addStep = (label: string, status: TestStatus, detail: string, latencyMs?: number) => {
      result.steps.push({ label, status, detail, latencyMs, timestamp: Date.now() });
    };

    // Step 1: DNS / Network
    addStep("DNS 解析", "running", `检测 ${baseUrl} 可达性...`);
    const base = baseUrl.replace(/\/$/, "");

    // For Ollama, test /api/tags
    if (isLocal) {
      // Use proxy endpoint when available (same-origin, zero CORS)
      const ollamaInfo = getOllamaEndpointInfo();
      const testUrl = ollamaInfo.mode === "proxy" ? getOllamaTagsUrl() : `${base}/api/tags`;
      addStep("端点模式", "pass", ollamaInfo.mode === "proxy"
        ? `同源代理模式: ${ollamaInfo.tagsUrl} (零 CORS 开销)`
        : `直连模式: ${testUrl}`,
      );

      result.steps[0] = { label: "DNS 解析", status: "running", detail: `检测 Ollama 端点...`, timestamp: Date.now() };
      const r = await testFetch(testUrl, {}, 5000);
      if (r.ok) {
        result.steps[0] = { label: "DNS / 网络", status: "pass", detail: `Ollama 端点可达 (${r.latencyMs}ms)${ollamaInfo.mode === "proxy" ? " [via proxy]" : ""}`, latencyMs: r.latencyMs, timestamp: Date.now() };
      } else if (r.errorType === "cors") {
        result.steps[0] = { label: "DNS / 网络", status: "warn", detail: `Ollama 返回 CORS 错误。请设置 OLLAMA_ORIGINS="*" 后重启 Ollama`, latencyMs: r.latencyMs, timestamp: Date.now() };
        // Try with no-cors mode
        const r2 = await testFetch(testUrl, { mode: "no-cors" }, 5000);
        addStep("no-cors 探测", r2.latencyMs < 4000 ? "pass" : "fail",
          r2.latencyMs < 4000 ? `Ollama 服务存在但 CORS 未配置 (${r2.latencyMs}ms)` : "服务不可达",
          r2.latencyMs
        );
      } else {
        result.steps[0] = { label: "DNS / 网络", status: "fail", detail: `无法连接: ${r.errorMsg}`, latencyMs: r.latencyMs, timestamp: Date.now() };
        result.suggestion = "请确认 Ollama 已启动: ollama serve";
      }

      // Step 2: Model list
      if (result.steps[0].status === "pass") {
        addStep("模型列表", "running", "获取已安装模型...");
        try {
          const tagsUrl = ollamaInfo.mode === "proxy" ? getOllamaTagsUrl() : `${base}/api/tags`;
          const r = await testFetch(tagsUrl);
          if (r.ok) {
            const data = JSON.parse(r.body || "{}");
            const models = data.models || [];
            const found = models.some((m: any) => m.name === model || m.model === model);
            if (found) {
              result.steps[result.steps.length - 1] = { label: "模型列表", status: "pass", detail: `模型 ${model} 已安装 (共 ${models.length} 个模型)`, latencyMs: r.latencyMs, timestamp: Date.now() };
            } else {
              result.steps[result.steps.length - 1] = { label: "模型列表", status: "warn", detail: `模型 ${model} 未找到。已安装: ${models.map((m: any) => m.name).join(", ") || "(空)"}`, latencyMs: r.latencyMs, timestamp: Date.now() };
              result.suggestion = `请运行: ollama pull ${model}`;
            }
          }
        } catch {}

        // Step 3: Chat test
        addStep("推理测试", "running", "发送 ping 请求...");
        const chatUrl = ollamaInfo.mode === "proxy" ? getOllamaChatUrl() : `${base}/api/chat`;
        const chatRes = await testFetch(chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], stream: false }),
        }, 15000);
        if (chatRes.ok) {
          result.steps[result.steps.length - 1] = { label: "推理测试", status: "pass", detail: `模型响应正常 (${chatRes.latencyMs}ms)`, latencyMs: chatRes.latencyMs, timestamp: Date.now() };
        } else {
          result.steps[result.steps.length - 1] = { label: "推理测试", status: chatRes.status === 404 ? "warn" : "fail", detail: chatRes.errorMsg || `HTTP ${chatRes.status}: ${chatRes.body?.slice(0, 100)}`, latencyMs: chatRes.latencyMs, timestamp: Date.now() };
        }
      }
    } else {
      // Cloud API provider
      // Step 1: Direct endpoint test
      const chatEndpoint = `${base}/chat/completions`;
      const directUrl = proxy ? `${proxy.replace(/\/$/, "")}/${chatEndpoint}` : chatEndpoint;

      // First try a simple HEAD / GET to see if we can reach the server
      const headRes = await testFetch(base, { method: "GET", mode: "no-cors" }, 5000);
      if (headRes.latencyMs < 4500) {
        result.steps[result.steps.length - 1] = { label: "网络可达性", status: "pass", detail: `${providerLabel} 服务器可达 (${headRes.latencyMs}ms, no-cors 探测)`, latencyMs: headRes.latencyMs, timestamp: Date.now() };
      } else {
        result.steps[result.steps.length - 1] = { label: "网络可达性", status: "warn", detail: `${providerLabel} 服务器可能不可达或网络较慢 (${headRes.latencyMs}ms)`, latencyMs: headRes.latencyMs, timestamp: Date.now() };
      }

      // Step 2: CORS check
      addStep("CORS 跨域检测", "running", "测试浏览器跨域策略...");
      const corsRes = await testFetch(chatEndpoint, {
        method: "OPTIONS",
        headers: { "Origin": window.location.origin, "Access-Control-Request-Method": "POST" },
      }, 5000);
      if (corsRes.ok || corsRes.status === 204 || corsRes.status === 200) {
        result.steps[result.steps.length - 1] = { label: "CORS 跨域检测", status: "pass", detail: `CORS 预检通过 (${corsRes.latencyMs}ms)`, latencyMs: corsRes.latencyMs, timestamp: Date.now() };
      } else if (corsRes.errorType === "cors") {
        result.steps[result.steps.length - 1] = { label: "CORS 跨域检测", status: "fail", detail: `CORS 预检被拒绝 — 浏览器禁止直接调用此 API`, latencyMs: corsRes.latencyMs, timestamp: Date.now() };
        if (!proxy) {
          result.suggestion = `浏览器安全策略阻止前端直接调用 ${providerLabel} API。\n解决方案:\n1. 配置 CORS 代理 (下方设置)\n2. 使用本地 Ollama 模型\n3. 部署后端代理转发`;
        }
      } else {
        result.steps[result.steps.length - 1] = { label: "CORS 跨域检测", status: "warn", detail: `预检异常: ${corsRes.errorMsg || `HTTP ${corsRes.status}`}`, latencyMs: corsRes.latencyMs, timestamp: Date.now() };
      }

      // Step 3: Auth / API Key test
      if (apiKey) {
        addStep("API Key 认证", "running", "验证 API Key...");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authType === "api-key") {
          headers["Authorization"] = `Bearer ${apiKey}`;
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const authBody = JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        });

        const authRes = await testFetch(directUrl, {
          method: "POST",
          headers,
          body: authBody,
        }, 10000);

        if (authRes.ok) {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "pass", detail: `认证成功, 模型 ${model} 可用 (${authRes.latencyMs}ms)`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
        } else if (authRes.status === 401 || authRes.body?.includes("401") || authRes.body?.includes("Unauthorized")) {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "fail", detail: `API Key 无效或已过期`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
          result.suggestion = `请检查 ${providerLabel} 的 API Key 是否正确、未过期。`;
        } else if (authRes.status === 403) {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "fail", detail: `API Key 无权访问模型 ${model}`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
          result.suggestion = `此 API Key 可能没有 ${model} 的访问权限。`;
        } else if (authRes.errorType === "cors") {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "fail", detail: `CORS 阻止 — 需配置代理才能验证 Key`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
        } else if (authRes.status === 429) {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "warn", detail: `API 限流中 (429), Key 有效但请求过频`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
        } else {
          result.steps[result.steps.length - 1] = { label: "API Key 认证", status: "fail", detail: `HTTP ${authRes.status}: ${(authRes.body || authRes.errorMsg || "").slice(0, 200)}`, latencyMs: authRes.latencyMs, timestamp: Date.now() };
        }
      } else {
        addStep("API Key 认证", "skip", "未配置 API Key, 跳过认证测试");
      }

      // Step 4: Proxy test (if proxy configured)
      if (proxy) {
        addStep("CORS 代理通道", "running", `通过代理 ${proxy} 测试...`);
        const proxyTestUrl = `${proxy.replace(/\/$/, "")}/${chatEndpoint}`;
        const proxyHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) proxyHeaders["Authorization"] = `Bearer ${apiKey}`;
        const proxyRes = await testFetch(proxyTestUrl, {
          method: "POST",
          headers: proxyHeaders,
          body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
        }, 12000);
        if (proxyRes.ok) {
          result.steps[result.steps.length - 1] = { label: "CORS 代理通道", status: "pass", detail: `代理转发成功 (${proxyRes.latencyMs}ms)`, latencyMs: proxyRes.latencyMs, timestamp: Date.now() };
        } else if (proxyRes.errorType === "cors" || proxyRes.errorType === "network") {
          result.steps[result.steps.length - 1] = { label: "CORS 代理通道", status: "fail", detail: `代理不可达: ${proxyRes.errorMsg}`, latencyMs: proxyRes.latencyMs, timestamp: Date.now() };
          result.suggestion = `CORS 代理 ${proxy} 不可用。请确认代理服务已启动。\n常用方案: npx local-cors-proxy --proxyUrl ${base}`;
        } else {
          result.steps[result.steps.length - 1] = { label: "CORS 代理通道", status: proxyRes.status === 401 ? "warn" : "fail", detail: `代理返回 HTTP ${proxyRes.status}: ${(proxyRes.body || "").slice(0, 150)}`, latencyMs: proxyRes.latencyMs, timestamp: Date.now() };
        }
      }
    }

    // Determine overall status
    const statuses = result.steps.map((s) => s.status);
    if (statuses.includes("fail")) result.overallStatus = "fail";
    else if (statuses.includes("warn")) result.overallStatus = "warn";
    else if (statuses.every((s) => s === "pass" || s === "skip")) result.overallStatus = "pass";
    else result.overallStatus = "warn";

    result.completedAt = Date.now();
    return result;
  }, []);

  // ============================================================
  // Test: Database connection
  // ============================================================

  const testDB = useCallback(async (conn: DBConnection): Promise<TestResult> => {
    const result: TestResult = {
      id: `db-${conn.id}`,
      category: "db",
      name: `${conn.name} (${conn.type})`,
      icon: Database,
      color: "#336791",
      steps: [],
      overallStatus: "running",
      startedAt: Date.now(),
    };

    // Step 1: Explain browser limitation
    result.steps.push({
      label: "浏览器限制检测",
      status: "warn",
      detail: `浏览器无法直接建立 TCP/Socket 连接到 ${conn.type} 数据库 (${conn.host}:${conn.port})。这是浏览器安全沙箱的硬性限制, 非配置问题。`,
      timestamp: Date.now(),
    });

    // Step 2: Try HTTP-based health check (some DBs have HTTP interfaces)
    if (conn.type === "redis") {
      // Redis doesn't have HTTP by default
      result.steps.push({
        label: "HTTP 接口探测",
        status: "skip",
        detail: "Redis 默认无 HTTP 接口, 浏览器无法直连。需通过后端代理或 WebSocket 桥接。",
        timestamp: Date.now(),
      });
    } else if (conn.type === "mongodb") {
      result.steps.push({
        label: "HTTP 接口探测",
        status: "skip",
        detail: "MongoDB 使用二进制协议, 浏览器无法直连。建议通过 MongoDB Atlas Data API 或后端代理。",
        timestamp: Date.now(),
      });
    } else if (conn.type === "postgresql" || conn.type === "mysql") {
      // Try PostgREST-style endpoint or pgAdmin health
      const httpUrl = `http://${conn.host}:${conn.port}`;
      result.steps.push({ label: "TCP 端口探测 (no-cors)", status: "running", detail: `探测 ${httpUrl}...`, timestamp: Date.now() });
      const r = await testFetch(httpUrl, { mode: "no-cors" }, 3000);
      if (r.latencyMs < 2500 && !r.errorMsg?.includes("ERR_CONNECTION_REFUSED")) {
        result.steps[result.steps.length - 1] = {
          label: "TCP 端口探测 (no-cors)",
          status: "pass",
          detail: `${conn.host}:${conn.port} 端口有响应 (${r.latencyMs}ms) — 服务可能在运行`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      } else {
        result.steps[result.steps.length - 1] = {
          label: "TCP 端口探测 (no-cors)",
          status: "fail",
          detail: `${conn.host}:${conn.port} 无响应 — 数据库可能未启动`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      }

      // Try common REST API ports (PostgREST typically 3000, Hasura 8080, etc.)
      const restPorts = conn.type === "postgresql" ? [3000, 8080] : [8080];
      for (const rp of restPorts) {
        const restUrl = `http://${conn.host}:${rp}`;
        result.steps.push({ label: `REST API 端口 :${rp}`, status: "running", detail: `探测 ${restUrl}...`, timestamp: Date.now() });
        const rr = await testFetch(restUrl, { mode: "no-cors" }, 3000);
        if (rr.latencyMs < 2500 && !rr.errorMsg?.includes("ERR_CONNECTION_REFUSED")) {
          result.steps[result.steps.length - 1] = {
            label: `REST API :${rp}`,
            status: "pass",
            detail: `${conn.host}:${rp} 有响应 — 可能运行着 REST 代理 (PostgREST/Hasura)`,
            latencyMs: rr.latencyMs,
            timestamp: Date.now(),
          };
        } else {
          result.steps[result.steps.length - 1] = {
            label: `REST API :${rp}`,
            status: "skip",
            detail: `${conn.host}:${rp} 无响应`,
            latencyMs: rr.latencyMs,
            timestamp: Date.now(),
          };
        }
      }
    } else if (conn.type === "sqlite") {
      result.steps.push({
        label: "SQLite 检测",
        status: "warn",
        detail: "SQLite 是嵌入式文件数据库, 浏览器中可通过 sql.js (WASM) 或 Origin Private File System 访问。",
        timestamp: Date.now(),
      });
    }

    // Step 3: Suggestion
    result.suggestion = `数据库直连方案:\n` +
      `1. 部署 REST 代理 (PostgREST / Hasura / Prisma) 暴露 HTTP 接口\n` +
      `2. 使用 WebSocket 桥接 (ws-pg-bridge)\n` +
      `3. 部署后端 API 服务代理 SQL 请求\n` +
      `4. 使用云端数据库 HTTP API (Supabase / PlanetScale / Neon)`;

    const statuses = result.steps.map((s) => s.status);
    if (statuses.includes("fail")) result.overallStatus = "fail";
    else if (statuses.every((s) => s === "pass")) result.overallStatus = "pass";
    else result.overallStatus = "warn";

    result.completedAt = Date.now();
    return result;
  }, []);

  // ============================================================
  // Test: WebSocket
  // ============================================================

  const testWebSocket = useCallback(async (): Promise<TestResult> => {
    const wsEndpoint = env("WS_ENDPOINT");
    const result: TestResult = {
      id: "ws-main",
      category: "websocket",
      name: `WebSocket (${wsEndpoint})`,
      icon: Radio,
      color: "#7b2ff7",
      steps: [],
      overallStatus: "running",
      startedAt: Date.now(),
    };

    result.steps.push({ label: "WebSocket 连接", status: "running", detail: `连接 ${wsEndpoint}...`, timestamp: Date.now() });

    try {
      const start = Date.now();
      // 规范: WebSocket 统一经 globalThis 解析 (测试环境可 stub, 禁止裸 new WebSocket)
      const WSImpl = (globalThis as any).WebSocket;
      if (typeof WSImpl !== "function") throw new Error("WebSocket 不可用");
      const ws = new WSImpl(wsEndpoint);
      const connected = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(timer); resolve(false); };
      });
      const latency = Date.now() - start;

      if (connected) {
        result.steps[0] = { label: "WebSocket 连接", status: "pass", detail: `连接成功 (${latency}ms)`, latencyMs: latency, timestamp: Date.now() };
      } else {
        result.steps[0] = { label: "WebSocket 连接", status: "fail", detail: `连接超时或被拒绝 (${latency}ms)`, latencyMs: latency, timestamp: Date.now() };
        result.suggestion = `WebSocket 端点 ${wsEndpoint} 不可达。Dashboard 将使用模拟数据。`;
      }
    } catch (err: any) {
      result.steps[0] = { label: "WebSocket 连接", status: "fail", detail: `异常: ${err.message}`, timestamp: Date.now() };
    }

    result.overallStatus = result.steps[0].status === "pass" ? "pass" : "fail";
    result.completedAt = Date.now();
    return result;
  }, []);

  // ============================================================
  // Test: Network connectivity
  // ============================================================

  const testNetwork = useCallback(async (): Promise<TestResult> => {
    const result: TestResult = {
      id: "network-general",
      category: "network",
      name: "网络连通性",
      icon: Network,
      color: "#00d4ff",
      steps: [],
      overallStatus: "running",
      startedAt: Date.now(),
    };

    // Test 1: navigator.onLine
    result.steps.push({
      label: "浏览器网络状态",
      status: navigator.onLine ? "pass" : "fail",
      detail: navigator.onLine ? "navigator.onLine = true" : "navigator.onLine = false (离线)",
      timestamp: Date.now(),
    });

    // Test 2: Local network
    const localIPs = ["192.168.3.1", "192.168.1.1"];
    for (const ip of localIPs) {
      const url = `http://${ip}`;
      result.steps.push({ label: `内网网关 ${ip}`, status: "running", detail: `探测 ${url}...`, timestamp: Date.now() });
      const r = await testFetch(url, { mode: "no-cors" }, 3000);
      if (r.latencyMs < 2500 && r.errorType !== "network") {
        result.steps[result.steps.length - 1] = {
          label: `内网网关 ${ip}`,
          status: "pass",
          detail: `${ip} 可达 (${r.latencyMs}ms)`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      } else {
        result.steps[result.steps.length - 1] = {
          label: `内网网关 ${ip}`,
          status: "skip",
          detail: `${ip} 不可达 (非本网段)`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      }
    }

    // Test 3: External network
    const externalSites = [
      { label: "百度 (国内)", url: "https://www.baidu.com" },
      { label: "Google (国际)", url: "https://www.google.com" },
    ];
    for (const site of externalSites) {
      result.steps.push({ label: site.label, status: "running", detail: `探测 ${site.url}...`, timestamp: Date.now() });
      const r = await testFetch(site.url, { mode: "no-cors" }, 5000);
      if (r.latencyMs < 4500 && r.errorType !== "network") {
        result.steps[result.steps.length - 1] = {
          label: site.label,
          status: "pass",
          detail: `可达 (${r.latencyMs}ms)`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      } else {
        result.steps[result.steps.length - 1] = {
          label: site.label,
          status: "warn",
          detail: `不可达或超时 (${r.latencyMs}ms)`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      }
    }

    // Test 4: CORS Proxy (if configured)
    if (proxyUrl) {
      result.steps.push({ label: "CORS 代理", status: "running", detail: `测试代理 ${proxyUrl}...`, timestamp: Date.now() });
      const r = await testFetch(proxyUrl.replace(/\/$/, ""), {}, 5000);
      if (r.ok || r.status === 200 || r.status === 404) {
        result.steps[result.steps.length - 1] = {
          label: "CORS 代理",
          status: "pass",
          detail: `代理服务可达 (${r.latencyMs}ms, HTTP ${r.status})`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      } else if (r.errorType === "cors" || r.errorType === "network") {
        result.steps[result.steps.length - 1] = {
          label: "CORS 代理",
          status: "fail",
          detail: `代理不可达: ${r.errorMsg}`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      } else {
        result.steps[result.steps.length - 1] = {
          label: "CORS 代理",
          status: "pass",
          detail: `代理有响应 (${r.latencyMs}ms)`,
          latencyMs: r.latencyMs,
          timestamp: Date.now(),
        };
      }
    }

    const statuses = result.steps.map((s) => s.status);
    if (statuses.includes("fail")) result.overallStatus = "fail";
    else if (statuses.every((s) => s === "pass" || s === "skip")) result.overallStatus = "pass";
    else result.overallStatus = "warn";

    result.completedAt = Date.now();
    return result;
  }, [proxyUrl]);

  // ============================================================
  // Run ALL tests
  // ============================================================

  const runAllTests = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    const allResults: TestResult[] = [];

    toast.info("开始全链路连接测试...", { style: toastStyle, duration: 2000 });

    // 1. Network
    if (!abortRef.current) {
      const net = await testNetwork();
      allResults.push(net);
      setResults([...allResults]);
    }

    // 2. WebSocket
    if (!abortRef.current) {
      const ws = await testWebSocket();
      allResults.push(ws);
      setResults([...allResults]);
    }

    // 3. AI providers (configured models)
    for (const cm of configuredModels) {
      if (abortRef.current) break;
      const provider = providers.find((p) => p.id === cm.providerId);
      if (!provider) continue;
      const res = await testAIProvider(
        cm.providerId,
        cm.providerLabel,
        cm.baseUrl,
        provider.authType,
        cm.apiKey,
        cm.model,
        provider.isLocal,
        cm.proxyUrl || proxyUrl || undefined,
      );
      allResults.push(res);
      setResults([...allResults]);
    }

    // If no configured models, test all providers with a probe
    if (configuredModels.length === 0) {
      for (const p of providers) {
        if (abortRef.current) break;
        const model = p.models[0] || "test";
        const res = await testAIProvider(
          p.id, p.label, p.baseUrl, p.authType, "", model, p.isLocal, proxyUrl || undefined,
        );
        allResults.push(res);
        setResults([...allResults]);
      }
    }

    // 4. Database connections
    for (const db of dbConnections) {
      if (abortRef.current) break;
      const res = await testDB(db);
      allResults.push(res);
      setResults([...allResults]);
    }

    saveResults(allResults);
    setRunning(false);

    const passCount = allResults.filter((r) => r.overallStatus === "pass").length;
    const failCount = allResults.filter((r) => r.overallStatus === "fail").length;
    const warnCount = allResults.filter((r) => r.overallStatus === "warn").length;
    toast.success(`测试完成: ${passCount} 通过 / ${warnCount} 警告 / ${failCount} 失败`, { style: toastStyle, duration: 4000 });
  }, [testNetwork, testWebSocket, testAIProvider, testDB, configuredModels, providers, dbConnections, proxyUrl]);

  // Run single test
  const runSingleTest = useCallback(async (testId: string) => {
    // Parse the test type
    if (testId === "network-general") {
      const res = await testNetwork();
      setResults((prev) => {
        const next = prev.filter((r) => r.id !== testId);
        next.unshift(res);
        saveResults(next);
        return next;
      });
    } else if (testId === "ws-main") {
      const res = await testWebSocket();
      setResults((prev) => {
        const next = prev.filter((r) => r.id !== testId);
        next.unshift(res);
        saveResults(next);
        return next;
      });
    }
  }, [testNetwork, testWebSocket]);

  const stopTests = () => { abortRef.current = true; };

  const clearResults = () => {
    setResults([]);
    localStorage.removeItem(RESULTS_KEY);
    toast.info("测试结果已清空", { style: toastStyle });
  };

  // ============================================================
  // Stats
  // ============================================================

  const stats = {
    total: results.length,
    pass: results.filter((r) => r.overallStatus === "pass").length,
    fail: results.filter((r) => r.overallStatus === "fail").length,
    warn: results.filter((r) => r.overallStatus === "warn").length,
  };

  const sysName = env("SYSTEM_NAME");

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,255,136,0.1)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              全链路服务连接测试
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {sysName} · AI / DB / WS / Network 全方位诊断
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowProxy(!showProxy)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <Shield className="w-3.5 h-3.5" />
            CORS 代理
          </button>
          <button
            onClick={clearResults}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            清空
          </button>
          {running ? (
            <button
              onClick={stopTests}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(255,51,102,0.15)] border border-[rgba(255,51,102,0.3)] text-[#ff3366] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <XCircle className="w-4 h-4" />
              停止测试
            </button>
          ) : (
            <button
              onClick={runAllTests}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <Play className="w-4 h-4" />
              一键全部测试
            </button>
          )}
        </div>
      </div>

      {/* ======== CORS Proxy Config ======== */}
      {showProxy && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#ffaa00]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>CORS 代理配置</h3>
          </div>
          <p className="text-[rgba(0,212,255,0.35)] mb-3" style={{ fontSize: "0.68rem" }}>
            浏览器安全策略禁止前端直接调用外部 API。配置 CORS 代理可绕过此限制。
          </p>
          <div className="flex items-center gap-2 mb-2">
            <input
              value={proxyUrl}
              onChange={(e) => saveProxy(e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] font-mono"
              style={{ fontSize: "0.75rem" }}
            />
            {proxyUrl && (
              <button onClick={() => saveProxy("")} className="p-2 rounded-lg text-[rgba(255,51,102,0.5)] hover:text-[#ff3366]">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.65rem" }}>
            <p className="text-[rgba(0,212,255,0.4)] mb-1">快速启动 CORS 代理:</p>
            <div className="space-y-1 font-mono text-[rgba(224,240,255,0.5)]">
              <p># 方法 1: cors-anywhere</p>
              <p className="text-[#00d4ff]">npx cors-anywhere --port 8080</p>
              <p className="mt-1"># 方法 2: local-cors-proxy</p>
              <p className="text-[#00d4ff]">npx local-cors-proxy --proxyUrl https://api.openai.com --port 8010</p>
              <p className="mt-1"># 方法 3: Nginx 反向代理 (生产推荐)</p>
              <p className="text-[rgba(224,240,255,0.3)]">location /api-proxy/ {"{"} proxy_pass https://api.openai.com/; {"}"}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ======== 环境检测面板 ======== */}
      <EnvironmentDetectionPanel />

      {/* ======== Stats ======== */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.total}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>测试项</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#00ff88]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.pass}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>通过</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ffaa00]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.warn}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>警告</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ff3366]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.fail}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>失败</p>
        </GlassCard>
      </div>

      {/* ======== Quick Test Buttons ======== */}
      <GlassCard className="p-4">
        <h3 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.88rem" }}>
          快速单项测试
        </h3>
        <div className="flex flex-wrap gap-2">
          <QuickTestButton label="网络连通性" icon={Network} color="#00d4ff" onClick={async () => {
            const r = await testNetwork();
            setResults((prev) => { const next = [r, ...prev.filter((p) => p.id !== r.id)]; saveResults(next); return next; });
          }} />
          <QuickTestButton label="WebSocket" icon={Radio} color="#7b2ff7" onClick={async () => {
            const r = await testWebSocket();
            setResults((prev) => { const next = [r, ...prev.filter((p) => p.id !== r.id)]; saveResults(next); return next; });
          }} />
          {providers.filter(p => p.isLocal).map((p) => (
            <QuickTestButton key={p.id} label={p.label} icon={Server} color="#00ff88" onClick={async () => {
              const model = p.models[0] || "llama3:8b";
              const r = await testAIProvider(p.id, p.label, p.baseUrl, p.authType, "", model, true);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
          {providers.filter(p => !p.isLocal).slice(0, 4).map((p) => (
            <QuickTestButton key={p.id} label={p.label} icon={Globe} color="#00d4ff" onClick={async () => {
              const cm = configuredModels.find((m) => m.providerId === p.id);
              const model = cm?.model || p.models[0] || "test";
              const key = cm?.apiKey || "";
              const r = await testAIProvider(p.id, p.label, p.baseUrl, p.authType, key, model, false, cm?.proxyUrl || proxyUrl || undefined);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
          {dbConnections.slice(0, 3).map((db) => (
            <QuickTestButton key={db.id} label={db.name} icon={Database} color="#336791" onClick={async () => {
              const r = await testDB(db);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
        </div>
      </GlassCard>

      {/* ======== Results ======== */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[#e0f0ff] px-1" style={{ fontSize: "0.88rem" }}>
            测试结果 ({results.length})
          </h3>
          {results.map((r) => {
            const isExpanded = expanded[r.id] ?? false;
            const statusMeta = STATUS_META[r.overallStatus];
            const OverallIcon = statusMeta.icon;
            const CategoryIcon = r.icon || Globe;
            const isRunning = r.overallStatus === "running";

            return (
              <GlassCard key={r.id} className="overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => toggleExpand(r.id)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${r.color}15` }}
                  >
                    <CategoryIcon className="w-4 h-4" style={{ color: r.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.82rem" }}>
                        {r.name}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ fontSize: "0.55rem", color: r.category === "ai" ? "#00d4ff" : r.category === "db" ? "#336791" : "#7b2ff7", backgroundColor: r.category === "ai" ? "rgba(0,212,255,0.06)" : r.category === "db" ? "rgba(51,103,145,0.1)" : "rgba(123,47,247,0.08)" }}
                      >
                        {r.category === "ai" ? "AI" : r.category === "db" ? "DB" : r.category === "websocket" ? "WS" : "NET"}
                      </span>
                    </div>
                    {r.completedAt && (
                      <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem" }}>
                        耗时 {r.completedAt - (r.startedAt || r.completedAt)}ms · {new Date(r.completedAt).toLocaleTimeString("zh-CN")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <OverallIcon
                      className={`w-4.5 h-4.5 ${isRunning ? "animate-spin" : ""}`}
                      style={{ color: statusMeta.color }}
                    />
                    <span style={{ color: statusMeta.color, fontSize: "0.72rem" }}>
                      {statusMeta.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[rgba(0,180,255,0.06)]">
                    {/* Steps */}
                    <div className="mt-3 space-y-1.5">
                      {r.steps.map((step, i) => {
                        const sm = STATUS_META[step.status];
                        const StepIcon = sm.icon;
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
                            <StepIcon
                              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${step.status === "running" ? "animate-spin" : ""}`}
                              style={{ color: sm.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                                  {step.label}
                                </span>
                                {step.latencyMs !== undefined && (
                                  <span className="text-[rgba(0,212,255,0.25)] font-mono" style={{ fontSize: "0.58rem" }}>
                                    {step.latencyMs}ms
                                  </span>
                                )}
                              </div>
                              <p className="text-[rgba(224,240,255,0.45)] mt-0.5 whitespace-pre-wrap" style={{ fontSize: "0.65rem" }}>
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Suggestion */}
                    {r.suggestion && (
                      <div className="mt-3 p-3 rounded-xl bg-[rgba(255,170,0,0.05)] border border-[rgba(255,170,0,0.15)]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#ffaa00]" />
                          <span className="text-[#ffaa00]" style={{ fontSize: "0.7rem" }}>建议</span>
                        </div>
                        <p className="text-[rgba(224,240,255,0.5)] whitespace-pre-wrap" style={{ fontSize: "0.65rem" }}>
                          {r.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ======== Empty State ======== */}
      {results.length === 0 && !running && (
        <GlassCard className="p-8 text-center">
          <Activity className="w-10 h-10 text-[rgba(0,212,255,0.15)] mx-auto mb-3" />
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
            点击「一键全部测试」开始诊断
          </p>
          <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.68rem" }}>
            将测试: {providers.length} 个 AI 服务商 · {dbConnections.length} 个数据库 · WebSocket · 网络连通性
          </p>
        </GlassCard>
      )}

      {/* ======== Diagnostics Reference ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>诊断参考</h3>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DiagnosticCard
            title="CORS 跨域问题"
            color="#ffaa00"
            items={[
              "浏览器安全沙箱禁止前端直接访问不同域的 API",
              "Ollama: 设置 OLLAMA_ORIGINS=\"*\" 后重启",
              "云 API: 使用 CORS 代理或后端转发",
              "生产环境: Nginx 反向代理 (推荐)",
            ]}
          />
          <DiagnosticCard
            title="数据库连接"
            color="#336791"
            items={[
              "浏览器无法建立 TCP/Socket 连接",
              "方案 A: PostgREST / Hasura 暴 REST 接口",
              "方案 B: 后端 API 代理 SQL 请求",
              "方案 C: Supabase / PlanetScale 云数据库",
            ]}
          />
          <DiagnosticCard
            title="API Key 认证"
            color="#00d4ff"
            items={[
              "Z.ai: Bearer Token (官方 SDK 模式)",
              "OpenAI: Authorization: Bearer {key}",
              "Kimi / DeepSeek: 同 OpenAI 格式",
              "Ollama: 无需认证",
            ]}
          />
          <DiagnosticCard
            title="本地部署拓扑"
            color="#00ff88"
            items={[
              "Dashboard: 192.168.3.x:3118 (前端)",
              "Ollama: localhost:11434 (推理引擎)",
              "PostgreSQL: localhost:5433",
              "Redis: localhost:6379",
            ]}
          />
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function QuickTestButton({ label, icon: Icon, color, onClick }: {
  label: string;
  icon: React.ElementType;
  color: string;
  onClick: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try { await onClick(); } finally { setLoading(false); }
  };
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}25`,
        color: color,
        fontSize: "0.72rem",
      }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function DiagnosticCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.3)] border border-[rgba(0,180,255,0.06)]">
      <h4 className="mb-2" style={{ fontSize: "0.75rem", color }}>{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5" style={{ fontSize: "0.62rem" }}>
            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-[rgba(0,212,255,0.2)]" />
            <span className="text-[rgba(224,240,255,0.45)]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnvironmentDetectionPanel() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
  const isSandbox = !isLocalhost;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMac = ua.includes("Mac");

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      toast.success("已复制到剪贴板", { style: toastStyle, duration: 1500 });
    });
  };

  const ollamaCmd = `OLLAMA_ORIGINS="${origin}" ollama serve`;
  const ollamaWildcard = `OLLAMA_ORIGINS="*" ollama serve`;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-[#00d4ff]" />
        <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>运行环境检测</h3>
        {isSandbox && (
          <span className="px-1.5 py-0.5 rounded bg-[rgba(255,170,0,0.1)] text-[#ffaa00]" style={{ fontSize: "0.55rem" }}>
            沙箱环境
          </span>
        )}
        {isLocalhost && (
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88]" style={{ fontSize: "0.55rem" }}>
            本地部署
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3" style={{ fontSize: "0.68rem" }}>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
          <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
          <div>
            <span className="text-[rgba(0,212,255,0.4)]">Origin: </span>
            <span className="text-[#e0f0ff] font-mono" style={{ fontSize: "0.62rem" }}>{origin || "(未知)"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
          <Server className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
          <div>
            <span className="text-[rgba(0,212,255,0.4)]">Hostname: </span>
            <span className="text-[#e0f0ff] font-mono" style={{ fontSize: "0.62rem" }}>{hostname || "(未知)"}</span>
          </div>
        </div>
      </div>

      {isSandbox && (
        <div className="p-3 rounded-xl bg-[rgba(255,170,0,0.05)] border border-[rgba(255,170,0,0.15)] mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffaa00]" />
            <span className="text-[#ffaa00]" style={{ fontSize: "0.72rem" }}>
              当前运行在远程沙箱中
            </span>
          </div>
          <p className="text-[rgba(224,240,255,0.5)] mb-2" style={{ fontSize: "0.65rem" }}>
            Figma Make 沙箱的 localhost 指向云端服务器, 不是你的 Mac。因此无法直接连��你本机的 Ollama / PostgreSQL / Redis。
          </p>
          <p className="text-[rgba(224,240,255,0.5)] mb-2" style={{ fontSize: "0.65rem" }}>
            将项目部署到本地 (192.168.3.x:3118) 后, 所有本地服务连接将可用。
          </p>
          <p className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.65rem" }}>
            部署后, Ollama 需要将此 Dashboard 的 origin 加入白名单:
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
              Ollama CORS 配置 (精确 origin)
            </span>
            <button
              onClick={() => copyText(ollamaCmd)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.58rem" }}
            >
              <Copy className="w-3 h-3" /> 复制
            </button>
          </div>
          <code className="text-[#00ff88] font-mono block break-all" style={{ fontSize: "0.65rem" }}>
            {ollamaCmd}
          </code>
        </div>

        <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
              Ollama CORS 配置 (允许所有 origin · 开发推荐)
            </span>
            <button
              onClick={() => copyText(ollamaWildcard)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.58rem" }}
            >
              <Copy className="w-3 h-3" /> 复制
            </button>
          </div>
          <code className="text-[#00ff88] font-mono block" style={{ fontSize: "0.65rem" }}>
            {ollamaWildcard}
          </code>
        </div>

        {isMac && (
          <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                macOS 永久设置 (launchctl)
              </span>
              <button
                onClick={() => copyText(`launchctl setenv OLLAMA_ORIGINS "*"`)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                style={{ fontSize: "0.58rem" }}
              >
                <Copy className="w-3 h-3" /> 复制
              </button>
            </div>
            <code className="text-[#00d4ff] font-mono block" style={{ fontSize: "0.65rem" }}>
              launchctl setenv OLLAMA_ORIGINS "*"
            </code>
            <p className="text-[rgba(224,240,255,0.3)] mt-1" style={{ fontSize: "0.58rem" }}>
              设置后重启 Ollama.app, CORS 白名单永久生效
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}