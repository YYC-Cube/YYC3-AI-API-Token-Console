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
  collectNodeMetrics, consoleSettingsFile,
  filterSettingsPayload, loadConsoleSettings, saveConsoleSettings,
} from "./console-metrics.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 静态目录: 与 LAN 版 server.mjs 语义对齐 — 默认仓库根 dist/, 可经 DIST_DIR 覆盖
// (修复批9 e2e 揭示的本地托管 404: 原硬编码 deploy/dist 与 vite 构建产物位置不符)
const DIST = path.resolve(__dirname, process.env.DIST_DIR || "../dist");
const PORT = Number(process.env.PORT || 3100);

// 上游：家族 API 网关（frp 隧道 ECS 本机端点；固定常量，非用户可控，无 SSRF 面）
const GW_ORIGIN = "http://127.0.0.1:8800";
// ADMIN 密钥：仅服务端环境变量（部署时由密钥文件注入，不落代码/仓库）
const GW_ADMIN_KEY = process.env.GW_ADMIN_KEY || "";

// ── 鉴权（批4）: 二者同时配置才启用 ──
const AUTH_SECRET = process.env.CONSOLE_AUTH_SECRET || "";
const ADMIN_PASSWORD = process.env.CONSOLE_ADMIN_PASSWORD || "";
const AUTH_ENABLED = Boolean(AUTH_SECRET && ADMIN_PASSWORD);
const SESSION_COOKIE = "console_session";
/** @type {LoginRateLimiter} */
const loginLimiter = new LoginRateLimiter();

// Ollama 多节点反代（白名单常量，无 SSRF 面）：/console/ollama/<node>/* → 节点 /api/*
/** @type {Record<string, string>} */
const OLLAMA_NODES = {
  n1: "http://100.65.64.49:11434",
  n2: "http://100.76.167.103:11434",
};

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

  // ── Ollama 多节点反代：/console/ollama/<node>/api/* ──
  if (pathname.startsWith("/console/ollama/")) {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    const rest = pathname.replace("/console/ollama/", "");
    const node = rest.split("/")[0];
    const origin = OLLAMA_NODES[node];
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

  // ── 指标聚合（真实数据接入 P0 / 2026-10-05）：GET /console/metrics ──
  // 聚合 OLLAMA_NODES 各节点 Ollama /api/ps（运行中模型 + 延迟）→ 前端轮询档消费
  if (pathname === "/console/metrics" && req.method === "GET") {
    if (AUTH_ENABLED && !verifyToken(AUTH_SECRET, parseCookies(req.headers.cookie)[SESSION_COOKIE])) return denyUnauthenticated();
    try {
      const metrics = await collectNodeMetrics(OLLAMA_NODES);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "https://api.0379.world",
      });
      return res.end(JSON.stringify(metrics));
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
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ settings }));
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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[console-server] http://127.0.0.1:${PORT}/console  (gw proxy → ${GW_ORIGIN}; auth: ${AUTH_ENABLED ? "enabled" : "disabled"})`);
  if (!AUTH_ENABLED) {
    console.warn("[console-server] ⚠️ 鉴权未启用 — 公网部署请配置 CONSOLE_AUTH_SECRET + CONSOLE_ADMIN_PASSWORD");
  }
});
