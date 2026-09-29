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

import { afterEach, describe, expect, it, vi } from "vitest";
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

// ============================================================
// 批12 OBS-5: sw.js 源文件结构守护 (注入锚点 + Vary 修复防回归)
// ============================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SW_SOURCE = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("public/sw.js 结构守护 (OBS-5)", () => {
  it("PRECACHE_MANIFEST 空数组占位符存在 (inject-precache.mjs 注入锚点)", () => {
    expect(SW_SOURCE).toContain("const PRECACHE_MANIFEST = [];");
  });

  it("prewarmAssets 预热函数被 install 事件调用", () => {
    expect(SW_SOURCE).toContain("async function prewarmAssets()");
    expect(SW_SOURCE).toMatch(/addEventListener\("install"[\s\S]*await prewarmAssets\(\)/);
  });

  it("缓存命中均 ignoreVary (Vary: Origin 防回归 — module script 带 Origin 头致 MISS)", () => {
    const matchLines = SW_SOURCE.split("\n").filter((l) => l.includes(".match("));
    expect(matchLines.length).toBeGreaterThanOrEqual(3);
    for (const line of matchLines) {
      expect(line, `缓存命中缺 ignoreVary: ${line.trim()}`).toContain("ignoreVary");
    }
  });
});
