// @ts-check
/// <reference types="node" />
/**
 * console-server.mjs
 * ==================
 * YYC³ Token-Console 生产服务器（B 闭环）：
 *   - 静态托管 dist/（SPA，base=/console/）
 *   - /console/gw/* → 反代家族 API 网关（frp 隧道端点）并注入 ADMIN 密钥
 *     （密钥只存服务端环境变量，浏览器零暴露；前端 gatewayAdminKey 填任意占位即可）
 *
 * 拓扑: 本文件 = 公网形态入口（`pnpm serve:console`）；LAN 形态入口见 ./server.mjs。
 *       静态托管/SPA 回退逻辑两处各自独立维护，改动托管行为时须同步评估另一份。
 *
 * 启动: NODE_ENV=production GW_ADMIN_KEY=sk-admin-... CONSOLE_AUTH_SECRET=... CONSOLE_ADMIN_PASSWORD=... node console-server.mjs
 * 端口: 3100（Traefik: api.0379.world/console → 本服务）
 * 安全: 上游为固定常量（frp 隧道回环端点，非用户输入，无 SSRF 面）；
 *       /gw 路径外的代理请求一律 404；请求体大小限制 10MB。
 *       鉴权（批4）: 配置 CONSOLE_AUTH_SECRET + CONSOLE_ADMIN_PASSWORD 后启用 —
 *       POST /console/auth/login 签发 HttpOnly Cookie（SameSite=Strict，HTTPS 下 Secure），
 *       /console/gw/* 与 /console/ollama/* 校验会话 Cookie，未认证一律 401；
 *       登录限流 5 次/5 分钟/IP；未配置时鉴权禁用（本地/LAN 开发形态不受影响）。
 */

import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LoginRateLimiter, SESSION_TTL_MS, constantTimeEqual, parseCookies, signToken, verifyToken } from "./console-auth.mjs";
import {
  collectGatewaySnapshot, collectNodeMetrics, consoleSettingsFile,
  effectiveOllamaNodes, filterSettingsPayload, loadConsoleSettings, saveConsoleSettings,
} from "./console-metrics.mjs";
import {
  WS_MONITOR_PATH, deriveGatewayWsUrl, encodeCloseFrame, encodePongFrame,
  encodeTextFrame, handshakeResponse, parseClientFrames, rawRejectResponse,
} from "./console-ws-relay.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 静态目录: 与 LAN 版 server.mjs 语义对齐 — 默认仓库根 dist/, 可经 DIST_DIR 覆盖
// (修复批9 e2e 揭示的本地托管 404: 原硬编码 deploy/dist 与 vite 构建产物位置不符)
const DIST = path.resolve(__dirname, process.env.DIST_DIR || "../dist");
const PORT = Number(process.env.PORT || 3100);

// 上游：家族 API 网关（frp 隧道 ECS 本机端点；固定常量，非用户可控，无 SSRF 面）
const GW_ORIGIN = "http://127.0.0.1:8800";
const GW_ORIGIN_OK = /^https?:\/\//.test(GW_ORIGIN);
// ADMIN 密钥：仅服务端环境变量（部署时由密钥文件注入，不落代码/仓库）
const GW_ADMIN_KEY = process.env.GW_ADMIN_KEY || "";

// ── 鉴权（批4）: 二者同时配置才启用 ──
const AUTH_SECRET = process.env.CONSOLE_AUTH_SECRET || "";
const ADMIN_PASSWORD = process.env.CONSOLE_ADMIN_PASSWORD || "";
const AUTH_ENABLED = Boolean(AUTH_SECRET && ADMIN_PASSWORD);
const SESSION_COOKIE = "console_session";
/** @type {LoginRateLimiter} */
const loginLimiter = new LoginRateLimiter();

// Ollama 多节点反代（无 SSRF 面）: 内置白名单常量 + /console/settings.ollamaNodes 可编辑覆盖
// （双端联通 R2 / 设备可视化可编辑增减: B端设备管理 PUT 全量 desired-state 清单）
/** @type {Record<string, string>} */
const OLLAMA_NODES = {
  n1: "http://100.65.64.49:11434",
  n2: "http://100.76.167.103:11434",
};

/** 生效节点表 = 设置接管（desired-state）或内置回退; 每请求读取（低频, 文件极小） */
const SETTINGS_FILE = consoleSettingsFile(__dirname);
async function currentOllamaNodes() {
  const settings = await loadConsoleSettings(SETTINGS_FILE);
  return effectiveOllamaNodes(OLLAMA_NODES, settings);
}

/** @type {Record<string, string>} */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

/** @param {import("node:http").IncomingMessage} req @param {import("node:http").ServerResponse} res */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");
  const pathname = decodeURIComponent(url.pathname);

  // ── 鉴权 API：/console/auth/*（批4） ──
  if (pathname.startsWith("/console/auth/")) {
    if (!AUTH_ENABLED) {
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "鉴权未启用（需配置 CONSOLE_AUTH_SECRET + CONSOLE_ADMIN_PASSWORD）" }));
    }
    const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
    if (pathname === "/console/auth/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress || "unknown";
      if (!loginLimiter.allow(ip)) {
        res.writeHead(429, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "尝试过于频繁，请 5 分钟后再试" }));
      }
      /** @type {Buffer[]} */
      const chunks = [];
      let size = 0;
      for await (const c of req) { size += c.length; if (size > 4096) { res.writeHead(413); return res.end(); } chunks.push(c); }
      let password = "";
      try { password = String(JSON.parse(Buffer.concat(chunks).toString("utf8")).password || ""); } catch { /* 解析失败按空密码 */ }
      if (!password || !constantTimeEqual(password, ADMIN_PASSWORD)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "密码不正确" }));
      }
      loginLimiter.reset(ip);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `${SESSION_COOKIE}=${signToken(AUTH_SECRET)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (pathname === "/console/auth/logout" && req.method === "POST") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (pathname === "/console/auth/status" && req.method === "GET") {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ enabled: true, authenticated: verifyToken(AUTH_SECRET, token) }));
    }
    res.writeHead(404);
    return res.end();
  }

  // ── 会话校验（鉴权启用时，代理端点全部要求登录态） ──
  const denyUnauthenticated = () => {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "未认证 — 请先登录 Console（Cookie 会话）" }));
  };

  // ── Ollama 多节点反代：/console/ollama/<node>/api/*（节点表=设置可编辑） ──
  if (pathname.startsWith("/console/ollama/")) {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    const rest = pathname.replace("/console/ollama/", "");
    const node = rest.split("/")[0];
    const nodesMap = await currentOllamaNodes();
    const origin = nodesMap[node];
    if (!origin) { res.writeHead(404); return res.end(JSON.stringify({ error: `未知节点: ${node}` })); }
    const sub = rest.slice(node.length); // "/api/tags" 等
    try {
      /** @type {Buffer[]} */
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const method = req.method || "GET";
      const body = ["GET", "HEAD"].includes(method) ? undefined : Buffer.concat(chunks);
      const r = await fetch(origin + sub, {
        method,
        headers: { "Content-Type": req.headers["content-type"] || "application/json" },
        body, signal: AbortSignal.timeout(20000),
      });
      res.writeHead(r.status, {
        "Content-Type": r.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "https://api.0379.world"
      });
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `${node} ollama 不可达`, detail: String(e instanceof Error ? e.message : e) }));
    }
    return;
  }

  // ── 指标聚合（真实数据接入 P0 / 2026-10-05; 双端联通 P0-3 增强 / 2026-10-15）──
  // 双源并行: ① 生效节点表 Ollama /api/ps 聚合 ② 网关快照（/health + /v1/router/stats
  // + /v1/models/stats, 密钥服务端注入）→ 前端四源设备清单与真实 KPI（磁盘占用率等）
  if (pathname === "/console/metrics" && req.method === "GET") {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    try {
      const [ollama, gateway] = await Promise.all([
        currentOllamaNodes().then((m) => collectNodeMetrics(m)),
        GW_ORIGIN_OK ? collectGatewaySnapshot(GW_ORIGIN, GW_ADMIN_KEY) : Promise.resolve({ ok: false, error: "GW_ORIGIN 未配置" }),
      ]);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "https://api.0379.world",
      });
      return res.end(JSON.stringify({ ...ollama, gateway: gateway.ok ? gateway : null }));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "指标聚合失败", detail: String(e instanceof Error ? e.message : e) }));
    }
  }

  // ── 服务端设置（P4 下发 / 2026-10-05）：GET|PUT /console/settings ──
  // 前端 settingsBus 白名单子集持久化（console-settings.json，运行时旁不入 git）;
  // PUT 为部分更新语义（merge），未知键 422 回执 rejected 清单。
  if (pathname === "/console/settings" && (req.method === "GET" || req.method === "PUT")) {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    const file = consoleSettingsFile(__dirname);
    if (req.method === "GET") {
      const settings = await loadConsoleSettings(file);
      // 双端联通 R2: 附带生效 Ollama 节点表（设备管理 desired-state 初始化源）
      const ollamaNodes = await currentOllamaNodes();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ settings, ollamaNodes }));
    }
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > 64 * 1024) { res.writeHead(413); return res.end(); } chunks.push(c); }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { payload = null; }
    const { ok, settings, rejected } = filterSettingsPayload(payload);
    if (!ok) { res.writeHead(422, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "载荷必须是对象" })); }
    const merged = { ...(await loadConsoleSettings(file)), ...settings };
    try {
      await saveConsoleSettings(file, merged);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ ok: true, settings: merged, rejected }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "设置落盘失败", detail: String(e instanceof Error ? e.message : e) }));
    }
  }

  // ── /console（无斜杠）→ 301 重定向到 /console/（否则浏览器相对路径解析到根，JS/CSS 404 蓝屏） ──
  if (pathname === "/console") {
    res.writeHead(301, { Location: "/console/" });
    return res.end();
  }

  // ── 网关代理：/console/gw/* → 网关 /*（注入 X-API-Key） ──
  if (pathname.startsWith("/console/gw/")) {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    if (!GW_ADMIN_KEY) {
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "GW_ADMIN_KEY 未配置（服务端环境变量）" }));
    }
    const targetPath = pathname.replace("/console/gw", "") + url.search;
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
      "X-API-Key": GW_ADMIN_KEY, "X-YYC3-Console-Proxy": "1"
    };
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > 10 * 1024 * 1024) { res.writeHead(413); return res.end(); } chunks.push(c); }
    const method = req.method || "GET";
    const body = ["GET", "HEAD"].includes(method) ? undefined : Buffer.concat(chunks);
    try {
      const r = await fetch(GW_ORIGIN + targetPath, {
        method, headers, body,
        signal: AbortSignal.timeout(120000),
      });
      res.writeHead(r.status, {
        "Content-Type": r.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "https://api.0379.world",
        "Cache-Control": "no-store",
      });
      const buf = Buffer.from(await r.arrayBuffer());
      res.end(buf);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "网关不可达", detail: String(e instanceof Error ? e.message : e) }));
    }
    return;
  }

  // ── 静态文件（SPA：未命中回退 index.html） ──
  let filePath = path.join(DIST, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (pathname === "/console" || pathname === "/console/") filePath = path.join(DIST, "index.html");
  else filePath = path.join(DIST, pathname.replace(/^\/console\/?/, "") || "index.html");
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const cache = ext === ".html" ? "no-cache" : "public, max-age=86400";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": cache });
    res.end(data);
  } catch {
    try {
      const index = await fs.readFile(path.join(DIST, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(index);
    } catch {
      res.writeHead(404); res.end("dist 未构建或路径不存在");
    }
  }
});

// ── WS 中继（双端联通 P0-1 / 硬约束① / 2026-10-15）：/console/ws/monitor ──
// 浏览器（Cookie 会话鉴权）←中继→ 网关 /ws/monitor?token=<GW_ADMIN_KEY 服务端注入>。
// 零 npm 依赖: Node 全局 WebSocket 仅作客户端连网关; 浏览器侧服务端帧由 console-ws-relay.mjs
// 手写最小 RFC 6455（握手/文本帧/ping-pong/close, 不支持分片压缩——本中继浏览器侧不发业务分片）。
// 透传方向: 网关 {event:"metrics"} 帧 → 浏览器（前端 gateway-adapter 翻译, 见 P0-2）。
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://x");
  if (decodeURIComponent(url.pathname) !== WS_MONITOR_PATH) {
    socket.write(rawRejectResponse(404, `非中继端点（仅 ${WS_MONITOR_PATH}）`));
    return socket.destroy();
  }
  if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) {
    socket.write(rawRejectResponse(401, "未认证 — 请先登录 Console（Cookie 会话）"));
    return socket.destroy();
  }
  const key = req.headers["sec-websocket-key"];
  if (typeof key !== "string" || !key) {
    socket.write(rawRejectResponse(400, "缺少 Sec-WebSocket-Key"));
    return socket.destroy();
  }
  const derived = deriveGatewayWsUrl(GW_ORIGIN, GW_ADMIN_KEY);
  const NodeWS = globalThis.WebSocket;
  if (!derived.ok || typeof NodeWS !== "function") {
    socket.write(rawRejectResponse(503, derived.ok ? "当前 Node 运行时无全局 WebSocket（需 Node≥21）" : derived.error));
    return socket.destroy();
  }

  let upstream;
  try {
    upstream = new NodeWS(derived.url);
  } catch (e) {
    socket.write(rawRejectResponse(502, `网关 WS 连接建立失败: ${e instanceof Error ? e.message : String(e)}`));
    return socket.destroy();
  }

  // 握手应答先行（浏览器侧 101), head 为握手后首个残包 → 并入帧缓冲
  socket.write(handshakeResponse(key));
  let frameBuf = Buffer.isBuffer(head) && head.length ? Buffer.from(head) : Buffer.alloc(0);

  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    try { upstream.close(); } catch { /* 已关闭 */ }
    try { socket.destroy(); } catch { /* 已关闭 */ }
  };

  upstream.onmessage = (ev) => {
    if (closed) return;
    try {
      const data = typeof ev.data === "string" ? ev.data : Buffer.from(ev.data);
      socket.write(encodeTextFrame(data));
    } catch { cleanup(); }
  };
  upstream.onclose = () => { try { socket.write(encodeCloseFrame(1000)); } catch { /* 同步关闭 */ } cleanup(); };
  upstream.onerror = () => { try { socket.write(encodeCloseFrame(1011)); } catch { /* 同步关闭 */ } cleanup(); };

  socket.on("data", (chunk) => {
    if (closed) return;
    frameBuf = Buffer.concat([frameBuf, chunk]);
    const parsed = parseClientFrames(frameBuf);
    if (!parsed) return; // 帧未完整, 等待更多字节
    frameBuf = parsed.rest;
    for (const f of parsed.frames) {
      if (f.opcode === 0x8) { try { socket.write(encodeCloseFrame(1000)); } catch { /* 同步关闭 */ } return cleanup(); }
      if (f.opcode === 0x9) { try { socket.write(encodePongFrame(f.payload)); } catch { /* 忽略 */ } continue; }
      if (f.opcode === 0x1 || f.opcode === 0x2) {
        try { upstream.send(f.payload); } catch { return cleanup(); }
      }
      // 0x0 延续帧: 浏览器侧无业务分片语义, 忽略
    }
  });
  socket.on("close", cleanup);
  socket.on("error", cleanup);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[console-server] http://127.0.0.1:${PORT}/console  (gw proxy → ${GW_ORIGIN}; auth: ${AUTH_ENABLED ? "enabled" : "disabled"})`);
  if (!AUTH_ENABLED) {
    console.warn("[console-server] ⚠️ 鉴权未启用 — 公网部署请配置 CONSOLE_AUTH_SECRET + CONSOLE_ADMIN_PASSWORD");
  }
});
