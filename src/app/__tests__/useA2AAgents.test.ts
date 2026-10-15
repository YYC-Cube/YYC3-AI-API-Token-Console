/**
 * useA2AAgents.test.ts
 * ====================
 * A2A 家人↔Agent 映射单测（双端联通 P0-8 / 硬约束②）
 *
 * 后端 agent_name 与前端家人中文名一一对应（如 "元启·天枢" ↔ yuanqi-tianshu-001）,
 * 映射策略: 全等优先 → 去空格互含回退 → null（钟盘「未接入」态）
 */

import { describe, it, expect } from "vitest";
import { matchAgentToMember, type AgentLive } from "../hooks/useA2AAgents";

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
