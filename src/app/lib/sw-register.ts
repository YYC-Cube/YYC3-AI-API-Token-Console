/**
 * sw-register.ts
 * ==============
 * Service Worker 注册入口 — PROD-only
 *
 * dev 环境绝不注册: Vite dev server 的模块请求 (/@vite/*, /src/*.ts HMR)
 * 一旦被 SW 拦截会破坏开发链路。生产构建 (import.meta.env.PROD) 才接管。
 *
 * 注册失败静默降级 (不阻塞应用): SW 缺失时应用仍完整可用,
 * 仅离线壳缓存与 PWA 可安装性增强失效。
 */

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!import.meta.env.PROD) return Promise.resolve(null);
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  // BASE_URL 兼容根路径 (/) 与子路径 (/console/) 部署 — SW scope 跟随 base
  return navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((err: unknown) => {
      console.warn("[YYC³] SW 注册失败 (不阻塞应用):", err);
      return null;
    });
}
