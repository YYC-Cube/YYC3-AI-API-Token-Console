/**
 * http.test.ts
 * ============
 * lib/http.ts fetchWithTimeout 单测 (S3 治理留账 A)
 * 覆盖: ① init.signal 原样透传 ② 未传 signal 注入 AbortSignal
 *       ③ 默认/自定义 timeoutMs ④ 响应原样返回
 * 底层走 globalThis.fetch — vi.stubGlobal 即可拦截 (与生产封装约定一致)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "../lib/http";

describe("lib/http fetchWithTimeout", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("① 传 init.signal 时原样透传 (同一 signal + 其余 init 字段不变)", async () => {
    const controller = new AbortController();
    const fakeRes = new Response();
    fetchMock.mockResolvedValue(fakeRes);

    const res = await fetchWithTimeout("https://example.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"a":1}',
      signal: controller.signal,
    });

    expect(res).toBe(fakeRes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://example.test/api");
    expect(calledInit?.method).toBe("POST");
    expect(calledInit?.headers).toEqual({ "Content-Type": "application/json" });
    expect(calledInit?.body).toBe('{"a":1}');
    expect(calledInit?.signal).toBe(controller.signal); // 同一实例 — 取消语义不变
  });

  it("② 未传 signal 时注入 AbortSignal 实例", async () => {
    await fetchWithTimeout("https://example.test/api", { method: "GET" });

    const [, calledInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it("③ 默认 timeoutMs=8000 生效; 自定义 timeoutMs 透传; 自带 signal 时不触发 timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    // 默认 8000
    await fetchWithTimeout("https://example.test/api");
    expect(timeoutSpy).toHaveBeenLastCalledWith(8000);
    const [, defaultInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(defaultInit?.signal).toBe(timeoutSpy.mock.results[0]?.value);

    // 自定义 1234
    await fetchWithTimeout("https://example.test/api", { method: "GET" }, 1234);
    expect(timeoutSpy).toHaveBeenLastCalledWith(1234);
    const [, customInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(customInit?.signal).toBe(timeoutSpy.mock.results[1]?.value);

    // 调用方自带 signal → 不再走 AbortSignal.timeout
    const controller = new AbortController();
    await fetchWithTimeout("https://example.test/api", { signal: controller.signal }, 9999);
    expect(timeoutSpy).toHaveBeenCalledTimes(2); // 次数未再增长
    const [, passthroughInit] = fetchMock.mock.calls[2] as unknown as [string, RequestInit];
    expect(passthroughInit?.signal).toBe(controller.signal);
  });

  it("④ 响应原样返回 (不包装不克隆)", async () => {
    const fakeRes = new Response('{"ok":true}', { status: 201 });
    fetchMock.mockResolvedValue(fakeRes);

    const res = await fetchWithTimeout("https://example.test/api");

    expect(res).toBe(fakeRes);
    expect(res.status).toBe(201);
  });
});
