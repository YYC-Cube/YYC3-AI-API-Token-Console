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
 * 启动: NODE_ENV=production GW_ADMIN_KEY=sk-admin-... node console-server.mjs
 * 端口: 3100（Traefik: api.0379.world/console → 本服务）
 * 安全: 上游为固定常量（frp 隧道回环端点，非用户输入，无 SSRF 面）；
 *       /gw 路径外的代理请求一律 404；请求体大小限制 10MB。
 */

import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT || 3100);

// 上游：家族 API 网关（frp 隧道 ECS 本机端点；固定常量，非用户可控，无 SSRF 面）
const GW_ORIGIN = "http://127.0.0.1:8800";
// ADMIN 密钥：仅服务端环境变量（部署时由密钥文件注入，不落代码/仓库）
const GW_ADMIN_KEY = process.env.GW_ADMIN_KEY || "";

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

  // ── Ollama 多节点反代：/console/ollama/<node>/api/* ──
  if (pathname.startsWith("/console/ollama/")) {
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

  // ── /console（无斜杠）→ 301 重定向到 /console/（否则浏览器相对路径解析到根，JS/CSS 404 蓝屏） ──
  if (pathname === "/console") {
    res.writeHead(301, { Location: "/console/" });
    return res.end();
  }

  // ── 网关代理：/console/gw/* → 网关 /*（注入 X-API-Key） ──
  if (pathname.startsWith("/console/gw/")) {
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
  console.log(`[console-server] http://127.0.0.1:${PORT}/console  (gw proxy → ${GW_ORIGIN})`);
});
