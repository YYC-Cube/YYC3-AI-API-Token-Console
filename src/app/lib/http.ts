/**
 * lib/http.ts — 统一 HTTP 封装 (S3 治理留账 A: lib 封装外直连 fetch 收敛)
 * 默认 8s 超时; 调用方自带 signal 时完全尊重 (取消语义不变)
 * 底层走 globalThis.fetch — 测试侧 vi.stubGlobal/vi.spyOn 拦截不受影响
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const signal = init?.signal ?? AbortSignal.timeout(timeoutMs);
  return globalThis.fetch(input, { ...init, signal });
}
