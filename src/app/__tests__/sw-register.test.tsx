/**
 * sw-register.test.tsx
 * =====================
 * Service Worker 注册入口 — PROD-only 降级语义 (jsdom 环境)
 *
 * 覆盖范围:
 * - PROD=false 不注册 (dev 环境 Vite 模块请求不可被 SW 拦截)
 * - PROD=true 注册 BASE_URL 下 sw.js (子路径部署兼容)
 * - 无 serviceWorker API 静默返回 null
 * - 注册失败静默降级 (不阻塞应用)
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { registerServiceWorker } from "../lib/sw-register";

function stubServiceWorker(registerImpl: () => Promise<unknown>) {
  const register = vi.fn(registerImpl);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
  return register;
}

describe("registerServiceWorker", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("PROD=false 不注册 (dev 环境 Vite 模块请求不可被拦截)", async () => {
    vi.stubEnv("PROD", false);
    const register = stubServiceWorker(async () => ({ scope: "/" }));
    const result = await registerServiceWorker();
    expect(result).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it("PROD=true 注册 BASE_URL 下 sw.js (子路径部署兼容)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("BASE_URL", "/console/");
    const register = stubServiceWorker(async () => ({ scope: "/console/" }));
    const result = await registerServiceWorker();
    expect(register).toHaveBeenCalledWith("/console/sw.js");
    expect(result).toEqual({ scope: "/console/" });
  });

  it("无 serviceWorker API 时静默返回 null (jsdom 默认)", async () => {
    vi.stubEnv("PROD", true);
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it("注册失败静默降级 (resolve null 不阻塞应用)", async () => {
    vi.stubEnv("PROD", true);
    stubServiceWorker(async () => {
      throw new Error("secure context required");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await registerServiceWorker();
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
