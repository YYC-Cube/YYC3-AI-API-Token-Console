/**
 * useA2AAgents.ts
 * ===============
 * A2A Agent 注册表实时心跳（双端联通 P0-8 / 硬约束②）
 *
 * 数据源: 网关 GET /v1/admin/a2a/agents（经 /console/gw 代理注入密钥;
 * 管理面列表含离线全量, 心跳 ≤90s 判定在线由网关侧完成）— 30s 轮询。
 * 不可达时保持上次状态（首次失败为空列表, 页面呈现「注册表不可达」态, 不伪造在线）。
 */

import { useCallback, useEffect, useState } from "react";
import { getGatewayConfig } from "../lib/api-config";
import { fetchWithTimeout } from "../lib/http";
import type { A2AAgentCard } from "../lib/device-inventory";

export interface AgentLive {
  agentId: string;
  agentName: string;
  online: boolean;
  capabilities: string[];
}

const POLL_MS = 30_000;

export function useA2AAgents(): {
  agents: AgentLive[];
  fetchedAt: string | null;
  loading: boolean;
  refresh: () => void;
} {
  const [agents, setAgents] = useState<AgentLive[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof fetch !== "function") {
      setLoading(false);
      return;
    }
    try {
      const base = getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");
      const r = await fetchWithTimeout(`${base}/v1/admin/a2a/agents`, {}, 6000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { agents?: A2AAgentCard[] };
      setAgents(
        (Array.isArray(d.agents) ? d.agents : []).map((a) => ({
          agentId: String(a.agent_id ?? "?"),
          agentName: String(a.agent_name ?? a.agent_id ?? "?"),
          online: a.status === "online",
          capabilities: Array.isArray(a.capabilities) ? a.capabilities : [],
        })),
      );
      setFetchedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch {
      // 注册表不可达: 保持上次快照（真实化铁则 — 不以伪造心跳冒充在线）
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = useCallback(() => { void load(); }, [load]);

  return { agents, fetchedAt, loading, refresh };
}

/**
 * 家人 ↔ Agent 匹配（钟盘映射）: agent_name 全等优先（后端卡片中文名与前端家人名一致,
 * 如 "元启·天枢"）, 次选去空格互含; 未匹配返回 null（钟盘显示「未接入」）。
 */
export function matchAgentToMember(memberName: string, agents: AgentLive[]): AgentLive | null {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const target = norm(memberName);
  if (!target) return null;
  const exact = agents.find((a) => norm(a.agentName) === target);
  if (exact) return exact;
  return (
    agents.find(
      (a) => norm(a.agentName).includes(target) || target.includes(norm(a.agentName)),
    ) ?? null
  );
}
