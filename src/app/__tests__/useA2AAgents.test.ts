/**
 * useA2AAgents.test.ts
 * ====================
 * A2A 家人↔Agent 映射单测（双端联通 P0-8 / 硬约束②）
 *
 * 后端 agent_name 与前端家人中文名一一对应（如 "元启·天枢" ↔ yuanqi-tianshu-001）,
 * 映射策略: 全等优先 → 去空格互含回退 → null（钟盘「未接入」态）
 *
 * S5 分支补测: useA2AAgents() 注册表轮询 Hook（成功映射 / 字段缺省兜底 / 非数组 /
 * HTTP 错误保持快照 / fetch 不可用 / 30s 轮询 / 手动 refresh）
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { matchAgentToMember, useA2AAgents, type AgentLive } from "../hooks/useA2AAgents";

const agents: AgentLive[] = [
  { agentId: "yuanqi-tianshu-001", agentName: "元启·天枢", online: true, capabilities: ["multi_agent_coordination"] },
  { agentId: "yushu-wanwu-001", agentName: "语枢·万物", online: false, capabilities: [] },
  { agentId: "orchestrator-001", agentName: "编排中枢", online: true, capabilities: ["orchestrate"] },
];

describe("useA2AAgents: matchAgentToMember", () => {
  it("全等匹配（后端卡片中文名 = 前端家人名）", () => {
    expect(matchAgentToMember("元启·天枢", agents)?.agentId).toBe("yuanqi-tianshu-001");
    expect(matchAgentToMember("语枢·万物", agents)?.online).toBe(false);
  });

  it("去空格互含回退（空格差异容错）", () => {
    expect(matchAgentToMember("元启 · 天枢", agents)?.agentId).toBe("yuanqi-tianshu-001");
  });

  it("未匹配（如编排中枢不占家人位）→ null", () => {
    expect(matchAgentToMember("千里·伯乐", agents)).toBeNull();
  });

  it("空名 / 空注册表防御", () => {
    expect(matchAgentToMember("", agents)).toBeNull();
    expect(matchAgentToMember("元启·天枢", [])).toBeNull();
  });
});

// ============================================================
// S5 分支补测: useA2AAgents() Hook — 注册表轮询真实数据链路
// 网络红线: 全部经 vi.stubGlobal("fetch", ...) 拦截, 零真实网络
// ============================================================

const AGENTS_PAYLOAD = {
  agents: [
    { agent_id: "yuanqi-tianshu-001", agent_name: "元启·天枢", status: "online", capabilities: ["multi_agent_coordination"] },
    { agent_id: "yushu-wanwu-001", agent_name: "语枢·万物", status: "offline", capabilities: [] },
  ],
};

describe("useA2AAgents: 注册表轮询 Hook（S5 分支补测）", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("成功拉取: 卡片映射 agentId/agentName/online/capabilities + fetchedAt + loading 收敛", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/v1/admin/a2a/agents")) {
        return { ok: true, json: async () => AGENTS_PAYLOAD } as unknown as Response;
      }
      throw new Error("offline");
    }));
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toEqual([
      { agentId: "yuanqi-tianshu-001", agentName: "元启·天枢", online: true, capabilities: ["multi_agent_coordination"] },
      { agentId: "yushu-wanwu-001", agentName: "语枢·万物", online: false, capabilities: [] },
    ]);
    expect(typeof result.current.fetchedAt).toBe("string");
    expect(result.current.fetchedAt).not.toBeNull();
  });

  it("字段缺省兜底: 无 id/无名/无 capabilities 逐一落兜底值", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        agents: [
          {}, // 无 id 无名 → "?"/"?", capabilities 非数组 → []
          { agent_id: "a2" }, // 无名 → 回退 agent_id
          { agent_name: "仅名", capabilities: "not-array" }, // 无 id → "?"
        ],
      }),
    } as unknown as Response)));
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toEqual([
      { agentId: "?", agentName: "?", online: false, capabilities: [] },
      { agentId: "a2", agentName: "a2", online: false, capabilities: [] },
      { agentId: "?", agentName: "仅名", online: false, capabilities: [] },
    ]);
  });

  it("agents 非数组 → 空列表但不置失败态", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) } as unknown as Response)));
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toEqual([]);
    expect(result.current.fetchedAt).not.toBeNull();
  });

  it("HTTP 错误 → 保持空快照 + loading 收敛（不伪造在线）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 } as unknown as Response)));
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toEqual([]);
    expect(result.current.fetchedAt).toBeNull();
  });

  it("失败保持上次快照: 先成功后网络异常, agents 不清空", async () => {
    let healthy = true;
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (!healthy) throw new Error("offline");
      return { ok: true, json: async () => AGENTS_PAYLOAD } as unknown as Response;
    }));
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.agents).toHaveLength(2));
    healthy = false;
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toHaveLength(2); // 真实化铁则: 不可达保持上次快照
  });

  it("fetch 全局不可用 → 直接收敛 loading, 不发请求", async () => {
    vi.stubGlobal("fetch", undefined);
    const { result } = renderHook(() => useA2AAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agents).toEqual([]);
    expect(result.current.fetchedAt).toBeNull();
  });

  it("30s 轮询与手动 refresh 均触发重新拉取", async () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn(async () => ({ ok: true, json: async () => AGENTS_PAYLOAD } as unknown as Response));
      vi.stubGlobal("fetch", spy);
      const { result, unmount } = renderHook(() => useA2AAgents());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.loading).toBe(false);
      expect(spy.mock.calls.length).toBe(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(spy.mock.calls.length).toBe(2);
      act(() => result.current.refresh());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(spy.mock.calls.length).toBe(3);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
