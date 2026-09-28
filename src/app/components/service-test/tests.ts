/**
 * service-test/tests.ts — 四类连接测试执行器（批7 拆分, 纯函数化）
 * ================================================================
 * 原 useCallback 闭包改为模块级纯函数: 全部依赖经参数传入, 无组件状态耦合。
 * 调用方: 主壳 ServiceConnectionTest.tsx
 */
import { Database, Globe, Network, Radio, Server } from "lucide-react";
import { env } from "../../lib/env-config";
import { getOllamaChatUrl, getOllamaEndpointInfo, getOllamaTagsUrl } from "../../lib/ollama-url";
import type { DBConnection } from "../../stores/dashboard-stores";
import { testFetch } from "./test-fetch";
import type { TestResult, TestStatus } from "./types";

/** 汇总 steps → overallStatus */
function finalize(result: TestResult, passOnSkip = true): TestResult {
  const statuses = result.steps.map((s) => s.status);
  if (statuses.includes("fail")) result.overallStatus = "fail";
  else if (passOnSkip
    ? statuses.every((s) => s === "pass" || s === "skip")
    : statuses.every((s) => s === "pass")) result.overallStatus = "pass";
  else result.overallStatus = "warn";
  result.completedAt = Date.now();
  return result;
}

/** AI 模型服务商连接测试（原 testAIProvider, 参数化纯函数） */
export async function runAIProviderTest(
  providerId: string,
  providerLabel: string,
  baseUrl: string,
  authType: string,
  apiKey: string,
  model: string,
  isLocal: boolean,
  proxy?: string,
): Promise<TestResult> {
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
    const testUrl = ollamaInfo.mode !== "direct" ? getOllamaTagsUrl() : `${base}/api/tags`;
    const modeDetail = { console: `Console 反代模式: ${ollamaInfo.tagsUrl} (服务端多节点反代)`, proxy: `同源代理模式: ${ollamaInfo.tagsUrl} (零 CORS 开销)`, direct: `直连模式: ${testUrl}` }[ollamaInfo.mode];
    addStep("端点模式", "pass", modeDetail);

    result.steps[0] = { label: "DNS 解析", status: "running", detail: `检测 Ollama 端点...`, timestamp: Date.now() };
    const r = await testFetch(testUrl, {}, 5000);
    if (r.ok) {
      result.steps[0] = { label: "DNS / 网络", status: "pass", detail: `Ollama 端点可达 (${r.latencyMs}ms)${ollamaInfo.mode !== "direct" ? ` [via ${ollamaInfo.mode}]` : ""}`, latencyMs: r.latencyMs, timestamp: Date.now() };
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
        const tagsUrl = ollamaInfo.mode !== "direct" ? getOllamaTagsUrl() : `${base}/api/tags`;
        const r = await testFetch(tagsUrl);
        if (r.ok) {
          const data = JSON.parse(r.body || "{}");
          const models = data.models || [];
          const found = models.some((m: { name?: string; model?: string }) => m.name === model || m.model === model);
          if (found) {
            result.steps[result.steps.length - 1] = { label: "模型列表", status: "pass", detail: `模型 ${model} 已安装 (共 ${models.length} 个模型)`, latencyMs: r.latencyMs, timestamp: Date.now() };
          } else {
            result.steps[result.steps.length - 1] = { label: "模型列表", status: "warn", detail: `模型 ${model} 未找到。已安装: ${models.map((m: { name?: string }) => m.name).join(", ") || "(空)"}`, latencyMs: r.latencyMs, timestamp: Date.now() };
            result.suggestion = `请运行: ollama pull ${model}`;
          }
        }
      } catch { }

      // Step 3: Chat test
      addStep("推理测试", "running", "发送 ping 请求...");
      const chatUrl = ollamaInfo.mode !== "direct" ? getOllamaChatUrl() : `${base}/api/chat`;
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

  return finalize(result);
}

/** 数据库连接测试（原 testDB, 参数化纯函数） */
export async function runDBTest(conn: DBConnection): Promise<TestResult> {
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

  return finalize(result, false);
}

/** WebSocket 连接测试（原 testWebSocket） */
export async function runWebSocketTest(): Promise<TestResult> {
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
    const WSImpl = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
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
  } catch (err) {
    result.steps[0] = { label: "WebSocket 连接", status: "fail", detail: `异常: ${err instanceof Error ? err.message : String(err)}`, timestamp: Date.now() };
  }

  result.overallStatus = result.steps[0].status === "pass" ? "pass" : "fail";
  result.completedAt = Date.now();
  return result;
}

/** 网络连通性测试（原 testNetwork, proxyUrl 参数化） */
export async function runNetworkTest(proxyUrl?: string): Promise<TestResult> {
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

  return finalize(result);
}
