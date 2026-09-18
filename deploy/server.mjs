#!/usr/bin/env node
/**
 * YYC³ CloudPivot Intelli-Matrix — 本地部署服务器
 * ================================================
 * 
 * 功能:
 *   1. 静态文件托管 (Vite build 产物 dist/)
 *   2. Ollama API 反向代理 (/api/v1/llm/ollama/* → localhost:11434/api/*)
 *   3. SPA 路由回退 (所有非 API/非文件路由 → index.html)
 *   4. CORS 全放行 (内网部署)
 *   5. Gzip 压缩 (可选)
 *
 * 零依赖 — 仅使用 Node.js 内置模块 (http, fs, path, url)
 *
 * 用法:
 *   node deploy/server.mjs                    # 默认 0.0.0.0:3118
 *   PORT=8080 node deploy/server.mjs          # 自定义端口
 *   OLLAMA_HOST=192.168.3.10 node deploy/mjs  # 自定义 Ollama 地址
 *
 * 环境变量:
 *   PORT          — 监听端口 (默认 3118)
 *   HOST          — 监听地址 (默认 0.0.0.0, 局域网可访问)
 *   OLLAMA_HOST   — Ollama 主机 (默认 127.0.0.1)
 *   OLLAMA_PORT   — Ollama 端口 (默认 11434)
 *   DIST_DIR      — 静态文件目录 (默认 ../dist, 相对于此脚本)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";

// ============================================================
// 配置
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3118", 10);
const HOST = process.env.HOST || "0.0.0.0";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1";
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || "11434", 10);
const DIST_DIR = path.resolve(__dirname, process.env.DIST_DIR || "../dist");

/** Ollama 代理前缀 */
const OLLAMA_PROXY_PREFIX = "/api/v1/llm/ollama";

/** MIME 类型映射 */
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".map":  "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt":  "text/plain; charset=utf-8",
  ".xml":  "text/xml; charset=utf-8",
};

// ============================================================
// CORS 头 (内网全放行)
// ============================================================

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Api-Key");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ============================================================
// Ollama 反向代理
// ============================================================

/**
 * 将 /api/v1/llm/ollama/xxx 代理到 http://OLLAMA_HOST:OLLAMA_PORT/api/xxx
 */
function proxyToOllama(req, res, subPath) {
  const ollamaPath = `/api/${subPath}`;
  const ollamaUrl = `http://${OLLAMA_HOST}:${OLLAMA_PORT}${ollamaPath}`;

  const proxyOptions = {
    hostname: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: ollamaPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${OLLAMA_HOST}:${OLLAMA_PORT}`,
    },
  };

  // 移除浏览器自动添加的不需要的头
  delete proxyOptions.headers["origin"];
  delete proxyOptions.headers["referer"];

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    setCorsHeaders(res);
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${ollamaUrl} → ${err.message}`);
    setCorsHeaders(res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Ollama proxy error",
      message: err.message,
      target: ollamaUrl,
      suggestion: "请确认 Ollama 已启动: ollama serve",
    }));
  });

  // 转发请求体 (POST/PUT)
  req.pipe(proxyReq, { end: true });
}

// ============================================================
// 静态文件服务
// ============================================================

function serveStatic(req, res) {
  const urlPath = new URL(req.url || "/", `http://${HOST}`).pathname;
  
  // 安全: 防止路径遍历
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(DIST_DIR, safePath);

  // 检查文件是否存在
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // 缓存策略: 带 hash 的资源长缓存, 其他短缓存
    const isHashed = /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "public, max-age=60";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    });
    createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

// ============================================================
// SPA 回退 (index.html)
// ============================================================

function serveSPAFallback(req, res) {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("index.html not found. Did you run `pnpm build`?");
  }
}

// ============================================================
// 请求处理
// ============================================================

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  const urlPath = new URL(req.url || "/", `http://${HOST}`).pathname;

  // ── CORS 预检 ──
  if (method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Ollama 代理 ──
  if (urlPath.startsWith(OLLAMA_PROXY_PREFIX)) {
    const subPath = urlPath.slice(OLLAMA_PROXY_PREFIX.length).replace(/^\//, "");
    setCorsHeaders(res);
    proxyToOllama(req, res, subPath);
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] PROXY ${method} ${urlPath} → ollama:${OLLAMA_PORT}/api/${subPath}`);
    return;
  }

  // ── 静态文件 ──
  if (serveStatic(req, res)) {
    return;
  }

  // ── SPA 回退 ──
  serveSPAFallback(req, res);
});

// ============================================================
// 启动
// ============================================================

server.listen(PORT, HOST, () => {
  const interfaces = getNetworkInterfaces();
  
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  YYC³ CloudPivot Intelli-Matrix · Local Deploy Server   ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  📂 静态文件:   ${DIST_DIR}`);
  console.log(`  🔗 Ollama 代理: ${OLLAMA_PROXY_PREFIX}/* → http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/*`);
  console.log("");
  console.log("  🌐 访问地址:");
  console.log(`     Local:   http://localhost:${PORT}`);
  for (const addr of interfaces) {
    console.log(`     Network: http://${addr}:${PORT}`);
  }
  console.log("");
  console.log("  📡 Ollama 端点测试:");
  console.log(`     curl http://localhost:${PORT}${OLLAMA_PROXY_PREFIX}/tags`);
  console.log(`     curl -X POST http://localhost:${PORT}${OLLAMA_PROXY_PREFIX}/chat \\`);
  console.log(`       -H 'Content-Type: application/json' \\`);
  console.log(`       -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"hi"}],"stream":false}'`);
  console.log("");
  console.log("  按 Ctrl+C 停止服务器");
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n  🛑 服务器已停止\n");
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

// ============================================================
// 工具函数
// ============================================================

function getNetworkInterfaces() {
  const addrs = [];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          addrs.push(net.address);
        }
      }
    }
  } catch {
    addrs.push("192.168.3.x");
  }
  return addrs;
}