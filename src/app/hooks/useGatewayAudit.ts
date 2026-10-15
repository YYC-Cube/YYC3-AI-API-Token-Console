/**
 * useGatewayAudit.ts
 * ==================
 * 操作审计真实数据源（双端联通 R5 / BL-A1 消费端）
 *
 * 数据: GET /v1/logs（经 /console/gw 代理, 近 24h 上限 200 条, 60s 轮询 + 手动刷新）
 * 映射: 网关请求流水 → 审计条目/趋势/风险分布; 不可达时全空态（真实化铁则, 不回退 mock）。
 */

import { useCallback, useEffect, useState } from "react";
import { getGatewayConfig } from "../lib/api-config";

export interface GatewayAuditLog {
  id: string;
  time: string;
  user: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  status: "success" | "failed";
  risk: "low" | "medium" | "high";
  /** 网关响应链路 id（R7 链路检索锚点; 直连/未提供为 null） */
  requestId?: string | null;
}

export interface GatewayAuditState {
  logs: GatewayAuditLog[];
  trend: Array<{ time: string; ops: number; errors: number }>;
  riskDistribution: Array<{ level: string; count: number }>;
  /** null=首次加载中, true=可达, false=不可达（空态） */
  sourceOk: boolean | null;
  total: number;
  fetchedAt: string | null;
  refresh: () => void;
  /** R7 链路跳转: 按 request_id 精确检索网关流水 */
  traceRequestId: (requestId: string) => Promise<{ count: number; logs: GatewayAuditLog[] }>;
}

const POLL_MS = 60_000;

interface RawLog {
  id?: number;
  created_at?: string;
  key_id?: string | null;
  model?: string | null;
  upstream?: string | null;
  capability?: string | null;
  status?: string | null;
  error_code?: string | null;
  request_id?: string | null;
  tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
}

function fmtTime(v: unknown): string {
  if (typeof v !== "string") return "—";
  const d = new Date(v.replace(" ", "T").replace("Z", "+00:00"));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleTimeString("zh-CN", { hour12: false });
}

function mapLog(l: RawLog): GatewayAuditLog {
  const isErr = (l.status ?? "ok") !== "ok";
  return {
    id: `LOG-${l.id ?? "?"}`,
    time: fmtTime(l.created_at),
    user: l.key_id ? `vk-${String(l.key_id).slice(0, 8)}` : "网关直连",
    role: l.capability ?? "chat",
    action: `${l.capability ?? "chat"} 请求${isErr && l.error_code ? `（${l.error_code}）` : ""}`,
    target: `${l.model ?? "?"} ← ${l.upstream ?? "?"} · ${l.tokens ?? 0} tok · ${l.latency_ms ?? 0}ms${l.request_id ? ` · ${l.request_id}` : ""}`,
    ip: l.upstream ?? "—", // 无真实来源 IP 源 — 用上游名, 不伪造 IP
    status: isErr ? "failed" : "success",
    risk: isErr ? "high" : (l.latency_ms ?? 0) > 3000 ? "medium" : "low",
    requestId: l.request_id ?? null,
  };
}

function buildTrend(logs: GatewayAuditLog[], raws: RawLog[]): Array<{ time: string; ops: number; errors: number }> {
  const byHour = new Map<string, { ops: number; errors: number }>();
  for (const r of raws) {
    if (typeof r.created_at !== "string") continue;
    const d = new Date(r.created_at.replace(" ", "T").replace("Z", "+00:00"));
    if (Number.isNaN(d.getTime())) continue;
    const key = `${String(d.getHours()).padStart(2, "0")}:00`;
    const b = byHour.get(key) ?? { ops: 0, errors: 0 };
    b.ops += 1;
    if ((r.status ?? "ok") !== "ok") b.errors += 1;
    byHour.set(key, b);
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([time, v]) => ({ time, ops: v.ops, errors: v.errors }));
}

export function useGatewayAudit(): GatewayAuditState {
  const [logs, setLogs] = useState<GatewayAuditLog[]>([]);
  const [trend, setTrend] = useState<GatewayAuditState["trend"]>([]);
  const [riskDistribution, setRiskDistribution] = useState<GatewayAuditState["riskDistribution"]>([]);
  const [sourceOk, setSourceOk] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (typeof fetch !== "function") return;
    try {
      const base = getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");
      const r = await fetch(`${base}/v1/logs?minutes=1440&limit=200`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { ok?: boolean; total?: number; logs?: RawLog[] };
      const raws = Array.isArray(d.logs) ? d.logs : [];
      const mapped = raws.map(mapLog);
      setLogs(mapped);
      setTotal(d.total ?? mapped.length);
      setTrend(buildTrend(mapped, raws));
      setRiskDistribution([
        { level: "低风险", count: mapped.filter((l) => l.risk === "low").length },
        { level: "中风险", count: mapped.filter((l) => l.risk === "medium").length },
        { level: "高风险", count: mapped.filter((l) => l.risk === "high" && l.status === "success").length },
        { level: "严重", count: mapped.filter((l) => l.status === "failed").length },
      ]);
      setSourceOk(true);
      setFetchedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch {
      // 真实化铁则: 不可达 → 空态（不回退 mock）
      setSourceOk(false);
      setLogs([]);
      setTotal(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const traceRequestId = useCallback(async (requestId: string) => {
    try {
      const base = getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");
      const r = await fetch(`${base}/v1/logs?minutes=1440&limit=10&request_id=${encodeURIComponent(requestId)}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { total?: number; logs?: RawLog[] };
      const raws = d.logs ?? [];
      return { count: d.total ?? raws.length, logs: raws.map(mapLog) };
    } catch {
      return { count: 0, logs: [] };
    }
  }, []);

  return { logs, trend, riskDistribution, sourceOk, total, fetchedAt, refresh: () => { void load(); }, traceRequestId };
}
