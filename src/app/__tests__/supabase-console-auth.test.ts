/**
 * supabaseClient console 公网形态分流单测（批4 鉴权）
 * mock: isConsoleDeployment 可切换形态 + vi.stubGlobal(fetch/localStorage)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase, ghostSignIn } from "../lib/supabaseClient";

const mockState = vi.hoisted(() => ({ consoleMode: false }));
vi.mock("../lib/ollama-url", () => ({
  isConsoleDeployment: () => mockState.consoleMode,
}));

// ── unit-node 无 DOM: 内存 localStorage stub ──
class MemoryStorage {
  #map = new Map<string, string>();
  getItem(k: string): string | null { return this.#map.has(k) ? (this.#map.get(k) as string) : null; }
  setItem(k: string, v: string) { this.#map.set(k, String(v)); }
  removeItem(k: string) { this.#map.delete(k); }
  clear() { this.#map.clear(); }
  key(i: number): string | null { return [...this.#map.keys()][i] ?? null; }
  get length(): number { return this.#map.size; }
}

const fetchMock = vi.fn();
vi.stubGlobal("localStorage", new MemoryStorage());
vi.stubGlobal("fetch", fetchMock);

const jsonRes = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("console 公网形态（isConsoleDeployment = true）", () => {
  beforeEach(() => {
    mockState.consoleMode = true;
    (globalThis.localStorage as MemoryStorage).clear();
    fetchMock.mockReset();
  });

  it("signInWithPassword 密码直登 → 构造会话 + 持久化 UI 态", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }, 200));
    const { data, error } = await supabase.auth.signInWithPassword({ email: "", password: "pw-123" });
    expect(error).toBeNull();
    expect(data?.session.user.role).toBe("admin");
    expect(JSON.parse(globalThis.localStorage.getItem("yyc3_session") as string).user.id).toBe("console-admin");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/console/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).password).toBe("pw-123");
  });

  it("401 → 密码不正确", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ error: "密码不正确" }, 401));
    const { data, error } = await supabase.auth.signInWithPassword({ email: "", password: "bad" });
    expect(data).toBeNull();
    expect(error?.message).toBe("密码不正确");
  });

  it("429 → 限流提示", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({}, 429));
    const { error } = await supabase.auth.signInWithPassword({ email: "", password: "x" });
    expect(error?.message).toContain("频繁");
  });

  it("网络异常 → 登录服务不可达", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const { error } = await supabase.auth.signInWithPassword({ email: "", password: "x" });
    expect(error?.message).toBe("登录服务不可达");
  });

  it("getSession: 服务端 authenticated → 返回会话", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ enabled: true, authenticated: true }, 200));
    const { data } = await supabase.auth.getSession();
    expect(data.session?.user.id).toBe("console-admin");
  });

  it("getSession: 未认证 → null 会话 + 清理本地 UI 态", async () => {
    globalThis.localStorage.setItem("yyc3_session", '{"stale":1}');
    fetchMock.mockResolvedValueOnce(jsonRes({ enabled: true, authenticated: false }, 200));
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
    expect(globalThis.localStorage.getItem("yyc3_session")).toBeNull();
  });

  it("signOut → 调用 logout 接口 + 清理本地", async () => {
    globalThis.localStorage.setItem("yyc3_session", "x");
    globalThis.localStorage.setItem("yyc3_ghost", "1");
    fetchMock.mockResolvedValueOnce(jsonRes({ ok: true }, 200));
    await supabase.auth.signOut();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/console/auth/logout");
    expect(globalThis.localStorage.getItem("yyc3_session")).toBeNull();
    expect(globalThis.localStorage.getItem("yyc3_ghost")).toBeNull();
  });

  it("ghostSignIn 公网封禁 → 抛错", () => {
    expect(() => ghostSignIn()).toThrow(/Ghost/);
  });
});

describe("本地 Mock 形态（isConsoleDeployment = false）不受影响", () => {
  beforeEach(() => {
    mockState.consoleMode = false;
    (globalThis.localStorage as MemoryStorage).clear();
  });

  it("signInWithPassword 走 MOCK_USERS 预设账号", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "admin@cloudpivot.local", password: "admin123",
    });
    expect(error).toBeNull();
    expect(data?.user.email).toBe("admin@cloudpivot.local");
  });

  it("错误密码 → 登录失败", async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "admin@cloudpivot.local", password: "wrong",
    });
    expect(error?.message).toBe("邮箱或密码不正确");
  });

  it("ghostSignIn 本地形态正常", () => {
    const s = ghostSignIn();
    expect(s.user.id).toBe("ghost-000");
    expect(s.user.role).toBe("admin");
  });
});
