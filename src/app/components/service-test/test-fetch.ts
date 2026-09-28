/**
 * service-test/test-fetch.ts — 带超时与错误分类的 fetch 探测（批7 拆分）
 * =====================================================================
 */
export async function testFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  body?: string;
  errorType?: "cors" | "network" | "timeout" | "http" | "unknown";
  errorMsg?: string;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    let body = "";
    try { body = await res.text(); } catch { }
    return { ok: res.ok, status: res.status, statusText: res.statusText, latencyMs, body };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error && err.message ? err.message : String(err);
    let errorType: "cors" | "network" | "timeout" | "unknown" = "unknown";
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("CORS") || msg.includes("cross-origin") || msg.includes("net::ERR_FAILED")) {
      errorType = "cors";
    } else if (msg.includes("AbortError") || msg.includes("timeout") || msg.includes("aborted")) {
      errorType = "timeout";
    } else if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ECONNREFUSED")) {
      errorType = "network";
    }
    return { ok: false, status: 0, statusText: "", latencyMs, errorType, errorMsg: msg };
  }
}
