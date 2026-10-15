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

// 批12 OBS-5: 预缓存产物清单 — 源文件保持空数组占位, 构建后由
// scripts/inject-precache.mjs 扫描 dist/assets/ 将清单注入 dist/sw.js。
// 断网深链增强: lazy chunk 随 install 预热入 ASSET_CACHE, 未访问路由离线直达可用。
const PRECACHE_MANIFEST = [
  "assets/AIDiagnostics-B_vI4WnM.js",
  "assets/AIFamilyCenterPage-DWH90-GF.js",
  "assets/AIFamilyDesignDoc-FDMclGVS.js",
  "assets/AIFamilyPage-TQbTKEcP.js",
  "assets/AIFamilyRouter-Wv6MvxIZ.js",
  "assets/AISuggestionPanel-DNSlsEHo.js",
  "assets/AlertRulesPanel-C-3NLiXb.js",
  "assets/CodeEditor-C_x7nUIw.js",
  "assets/DataMonitoring-BfS_9iKL.js",
  "assets/DatabaseManager-PRK2R4AF.js",
  "assets/DesignSystemPage-BPcmH0m-.js",
  "assets/DevGuidePage-BzluHVuI.js",
  "assets/EnvConfigEditor--CfzegeD.js",
  "assets/FadeIn-DftC6_mW.js",
  "assets/FamilyActivityCenter-CV2Bj5i-.js",
  "assets/FamilyChat-DeH3MgIb.js",
  "assets/FamilyCommCenter-C8_eDuxT.js",
  "assets/FamilyDataHub-DEI23w9m.js",
  "assets/FamilyDrama-9WrDO8EN.js",
  "assets/FamilyEntertainment-CyiGexZF.js",
  "assets/FamilyGrowth-BlOZ960D.js",
  "assets/FamilyHome-Apjckucc.js",
  "assets/FamilyLearn-Cu99EzfJ.js",
  "assets/FamilyModelSettings-CphJVvz9.js",
  "assets/FamilyMusic-4yFgBOQz.js",
  "assets/FamilyPageHeader-2YV12AbC.js",
  "assets/FamilyPhone-DAqAm6Vr.js",
  "assets/FamilyShare-Cq3suvuj.js",
  "assets/FamilyUISettings-3IAyKoNl.js",
  "assets/FamilyVoiceSystem-V0gB4jbm.js",
  "assets/FollowUpPanel-DFJCuLbq.js",
  "assets/GatewayKeysPanel-oS43mmPi.js",
  "assets/GlassCard-BlsNI7pW.js",
  "assets/LocalFileManager-BAR67NmK.js",
  "assets/ModelProviderPanel-CWasS7QA.js",
  "assets/OperationAudit-D3orTjSA.js",
  "assets/OperationCenter-C23S2pYn.js",
  "assets/PWAStatusPanel-ZSh8Z7oe.js",
  "assets/PatrolDashboard-DXrnn51D.js",
  "assets/ReportExporter-D1zHSZUk.js",
  "assets/SecurityMonitor-CeERSatj.js",
  "assets/ServiceConnectionTest-uv_5aV5e.js",
  "assets/SystemSettings-DKwBVSm6.js",
  "assets/arrow-up-right-D_i-oLpL.js",
  "assets/award-3mb21bRR.js",
  "assets/calendar-days-Ch521VdC.js",
  "assets/charts-BFX3T_-r.js",
  "assets/circle-check-CMaMQPEr.js",
  "assets/circle-check-big-DnsP705X.js",
  "assets/circle-x-Beyr32cK.js",
  "assets/clock-DsJriQ6h.js",
  "assets/code-Dc9UmsEE.js",
  "assets/crown-CxlHSZEO.js",
  "assets/dashboard-stores-CQv4hTZM.js",
  "assets/editor-DsJFlUq5.js",
  "assets/external-link-CwHx2MRZ.js",
  "assets/file-json-DlA50mjr.js",
  "assets/funnel-BUU_RsJB.js",
  "assets/graduation-cap-CryGvaQN.js",
  "assets/hand-heart-BTHkuO1u.js",
  "assets/history-DWTluY5I.js",
  "assets/image-S2ZJTEag.js",
  "assets/index-CsJg-vuX.js",
  "assets/index-l-TXO3MN.css",
  "assets/info-Dk6fKK17.js",
  "assets/loader-circle-BrqccTpi.js",
  "assets/memory-stick-1OoIovGQ.js",
  "assets/mic-Cgu-zaU7.js",
  "assets/mic-off-BK4Q1K4b.js",
  "assets/music-2-za3o7KhG.js",
  "assets/pause-BfZcJWON.js",
  "assets/pen-line-CP5-2DYy.js",
  "assets/plug-CKOdq7F9.js",
  "assets/puzzle-j3R8tf_i.js",
  "assets/react-DhaMXmDR.js",
  "assets/repeat-Cjy_165o.js",
  "assets/router-Dpvfz7Yi.js",
  "assets/rss-BkGsCJVE.js",
  "assets/save-Da6oyvVW.js",
  "assets/skip-forward-CdnkcDPx.js",
  "assets/smile-B15g6G3t.js",
  "assets/square-CSvFeh55.js",
  "assets/target-C-o_Lrfy.js",
  "assets/timer-ZhKa5CV4.js",
  "assets/toggle-left-B8osCab4.js",
  "assets/toggle-right-d-ApMK28.js",
  "assets/trending-down-CKwRAsVA.js",
  "assets/upload-NZhG8Qy_.js",
  "assets/usePersistedState-ByG28Hvs.js",
  "assets/volume-x-QCru8vM1.js",
];

/** install 阶段逐条预热产物 (失败容忍: 单条失败不阻塞 SW 安装) */
async function prewarmAssets() {
  if (!PRECACHE_MANIFEST.length) return;
  const cache = await caches.open(ASSET_CACHE);
  await Promise.all(
    PRECACHE_MANIFEST.map(async (path) => {
      try {
        const url = new URL(path, self.registration.scope).href;
        if (await cache.match(url, { ignoreVary: true })) return;
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok && res.type === "basic") await cache.put(url, res);
      } catch {
        /* 单条失败容忍 — 断网安装时跳过, 联网后由 cacheFirst 按需补齐 */
      }
    })
  );
}

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
      // OBS-5: 产物预热 (失败容忍, 不阻塞 skipWaiting)
      await prewarmAssets();
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
  const cached = await caches.match(shellUrl(), { ignoreVary: true });
  if (cached) return cached;
  // 无壳可回退 (SW 首次安装中即离线) — 交还浏览器错误页
  return Response.error();
}

async function cacheFirst(req) {
  // ignoreVary: 服务器对 assets 响应带 Vary: Origin (module script CORS 协商),
  // 预热请求无 Origin 头而页面子资源请求有 — 内容寻址 hash 文件名下 Vary 无语义, 忽略之
  const cached = await caches.match(req, { ignoreVary: true });
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
  const cached = await cache.match(req, { ignoreVary: true });
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
