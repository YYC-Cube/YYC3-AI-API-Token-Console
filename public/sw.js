/**
 * YYC³ 手写 Service Worker — 零依赖可审计 (批10 GAP-006 闭环)
 * ============================================================
 *
 * 设计约束 (为什么不用 vite-plugin-pwa/workbox):
 *   workbox-build@7.4.1 依赖链触发 pnpm 供应链信任降级拦截
 *   (ERR_PNPM_TRUST_DOWNGRADE — @trickfilm400/rollup-plugin-off-main-thread@3.0.0-pre1
 *   无 provenance attestation, 疑似包接管), 本文件 vanilla 实现同等能力。
 *
 * 策略:
 *   1. SPA 导航请求  → network-first; 非 200 (GitHub Pages 深链返回 404 + 404.html)
 *                      或断网时回退缓存壳 index.html (SPA 路由器接管)
 *   2. /assets/*     → cache-first (Vite 内容 hash 文件名, 不可变, 永不版本错配);
 *                      LRU 上限 200 条防旧版本资产无限膨胀
 *   3. 其余静态资源  (manifest.json / yyc3-icons/ / favicon) → stale-while-revalidate
 *   4. 其余一切同源请求 (认证 /console/auth/*、网关 /console/gw/*、Ollama 代理等 API)
 *                      → 透传, SW 绝不介入 (缓存策略不适用带凭据/动态端点)
 *
 * 部署兼容:
 *   - 根路径 (GitHub Pages, base=/) 与子路径 (console-server, VITE_BASE=/console/)
 *     均正确: 一切路径基于 registration.scope 相对解析
 *   - 注册入口 src/app/lib/sw-register.ts 仅 PROD 生效 (dev 环境 Vite 模块请求不可被拦截)
 */

const SHELL_CACHE = "yyc3-shell-v1";
const ASSET_CACHE = "yyc3-assets-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
const ASSET_MAX_ENTRIES = 200;

/** 静态资源路径特征 — 仅这些会被 SW 缓存策略接管 (子路径部署时 pathname 含 base 前缀, 用 includes) */
const STATIC_PATH_PATTERNS = ["/assets/", "/yyc3-icons/", "/manifest.json", "/favicon"];

function shellUrl() {
  return new URL("index.html", self.registration.scope).href;
}

function isStaticAsset(pathname) {
  return STATIC_PATH_PATTERNS.some((p) => pathname.includes(p));
}

/** 缓存条目 LRU 裁剪 (Cache API keys 为插入序, 删最旧) */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // cache: "reload" 绕过 HTTP 缓存, 确保壳为部署最新
      await cache.add(new Request(shellUrl(), { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("yyc3-") && !KNOWN_CACHES.includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function handleNavigate(req) {
  try {
    const fresh = await fetch(req);
    // 仅缓存成功响应 (Pages 深链 404 / 5xx 不入缓存)
    if (fresh.ok && fresh.type === "basic") {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(new Request(shellUrl()), fresh.clone());
    }
    if (fresh.ok) return fresh;
  } catch {
    /* 离线 — 落到缓存壳回退 */
  }
  const cached = await caches.match(shellUrl());
  if (cached) return cached;
  // 无壳可回退 (SW 首次安装中即离线) — 交还浏览器错误页
  return Response.error();
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok && fresh.type === "basic") {
      const cache = await caches.open(ASSET_CACHE);
      await cache.put(req, fresh.clone());
      await trimCache(ASSET_CACHE, ASSET_MAX_ENTRIES);
    }
    return fresh;
  } catch {
    return Response.error();
  }
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok && res.type === "basic") {
        cache.put(req, res.clone()).then(() => trimCache(ASSET_CACHE, ASSET_MAX_ENTRIES));
      }
      return res;
    })
    .catch(() => undefined);
  event.waitUntil(Promise.resolve(refresh));
  if (cached) return cached;
  const fresh = await refresh;
  return fresh ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigate(req));
    return;
  }
  if (!isStaticAsset(url.pathname)) return; // API/认证/代理端点透传
  if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req));
});
