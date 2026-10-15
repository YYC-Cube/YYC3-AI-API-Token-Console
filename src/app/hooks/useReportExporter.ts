/**
 * useReportExporter.ts
 * =====================
 * Hook for Performance Report Generation & Export
 * Supports JSON, CSV (Excel), and printable HTML (PDF via print dialog)
 *
 * 双端联通 P0-4 / 硬约束①（2026-10-15）: 报表数据全面真实化 —
 *   - 账单面: GET /v1/admin/usage/summary?days=&group_by=model（网关 spend_logs 聚合, 经 /console/gw 代理）
 *   - 模型面: GET /v1/models/stats（EWMA 延迟/错误率/用量）
 *   - 节点面: GET /console/metrics（网关快照: 上游池熔断态 + /health 系统资源）
 * 随机数生成器已删除（方案 §7.1）; 真实源全部不可达时拒绝生成（不产模拟报表）;
 * 无源字段显「—」或 0（指标真实化铁则 — 禁止伪造）。
 */

import { useCallback, useState } from "react";
import { getAPIConfig, getGatewayConfig } from "../lib/api-config";
import { activeNodesKpi, upstreamNodesFromRouterStats } from "../lib/device-inventory";
import { usePersistedList } from "./usePersistedState";

// ============================================================
// Types — centralized in types/index.ts
// ============================================================

import type {
  ExportFormat,
  ExportReportType,
  PerformanceSnapshot,
  ReportData, ReportHistoryEntry,
  TimeRange
} from "../types";

// ============================================================
// 真实数据源采集（双端联通 P0-4）
// ============================================================

/** GET /v1/admin/usage/summary 契约（virtual_key_manager.usage_summary） */
interface UsageSummary {
  days?: number;
  total_calls?: number;
  total_cost_usd?: number;
  groups?: Array<{
    grp?: string;
    calls?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    cost_usd?: number;
    avg_latency_ms?: number;
  }>;
}

/** GET /v1/models/stats 契约（ModelStat 数组） */
interface ModelStatRow {
  model_id?: string;
  usage_count?: number;
  avg_latency_ms?: number;
  error_rate?: number;
  total_tokens?: number;
}

interface ReportSources {
  usage: UsageSummary | null;
  models: ModelStatRow[] | null;
  metrics: { gateway?: { health?: unknown; router?: unknown } | null } | null;
}

const RANGE_DAYS: Record<TimeRange, number> = { "1h": 1, "6h": 1, "24h": 1, "7d": 7, "30d": 30, custom: 1 };

async function grab<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  if (typeof fetch !== "function") return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null; // 单源降级, 不拖垮其余
  }
}

async function collectReportSources(range: TimeRange): Promise<ReportSources> {
  const gwBase = getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");
  const days = RANGE_DAYS[range] ?? 1;
  const [usage, models, metrics] = await Promise.all([
    grab<UsageSummary>(`${gwBase}/v1/admin/usage/summary?days=${days}&group_by=model`),
    grab<ModelStatRow[]>(`${gwBase}/v1/models/stats`),
    grab<ReportSources["metrics"]>(getAPIConfig().metricsBase),
  ]);
  return { usage, models, metrics };
}

// ============================================================
// 真实数据 → ReportData
// ============================================================

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function weightedAvg(rows: Array<{ value: number; weight: number }>): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const r of rows) {
    if (r.weight > 0) {
      weighted += r.value * r.weight;
      weightSum += r.weight;
    }
  }
  return weightSum > 0 ? weighted / weightSum : null;
}

function buildReportData(type: ExportReportType, range: TimeRange, sources: ReportSources): ReportData {
  const hoursMap: Record<string, number> = { "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720, custom: 24 };
  const hours = hoursMap[range] || 24;
  const days = RANGE_DAYS[range] ?? 1;
  const now = Date.now();

  const groups = sources.usage?.groups ?? [];
  const models = Array.isArray(sources.models) ? sources.models : [];
  const health = (sources.metrics?.gateway?.health ?? null) as
    | { status?: string; system?: { cpu_percent?: number; memory_percent?: number; disk_percent?: number } }
    | null;
  const pool = upstreamNodesFromRouterStats(sources.metrics?.gateway?.router);

  // ---- 账单聚合（真实）----
  const usageTokens = groups.reduce((s, g) => s + num(g.prompt_tokens) + num(g.completion_tokens), 0);
  const modelTokens = models.reduce((s, m) => s + num(m.total_tokens), 0);
  const totalCalls = sources.usage?.total_calls ?? models.reduce((s, m) => s + num(m.usage_count), 0);
  const tokensTotal = usageTokens > 0 ? usageTokens : modelTokens;

  // ---- 加权指标（真实）----
  const latency =
    weightedAvg(groups.map((g) => ({ value: num(g.avg_latency_ms), weight: num(g.calls) }))) ??
    weightedAvg(models.map((m) => ({ value: num(m.avg_latency_ms), weight: num(m.usage_count) })));
  const errorRate = weightedAvg(models.map((m) => ({ value: num(m.error_rate) * 100, weight: num(m.usage_count) })));

  const fmtInt = (n: number) => n.toLocaleString("zh-CN");
  const summary: ReportData["summary"] = [
    { label: "总请求次数", value: totalCalls > 0 || groups.length > 0 ? fmtInt(totalCalls) : "—", trend: "stable", change: "—" },
    { label: "Token 总量", value: tokensTotal > 0 ? fmtInt(tokensTotal) : "—", trend: "stable", change: "—" },
    { label: "成本 (USD)", value: sources.usage ? `$${num(sources.usage.total_cost_usd).toFixed(2)}` : "—", trend: "stable", change: "—" },
    { label: "平均延迟", value: latency !== null ? `${Math.round(latency)}ms` : "—", trend: "stable", change: "—" },
    { label: "加权错误率", value: errorRate !== null ? `${errorRate.toFixed(2)}%` : "—", trend: "stable", change: "—" },
    { label: "节点健康", value: pool.length > 0 ? activeNodesKpi(pool) : "—", trend: "stable", change: "—" },
  ];

  // ---- 性能快照: 当前真实单点（时序聚合端点待后端 BL-A2, 不伪造历史）----
  const throughputPerSec = days > 0 ? tokensTotal / (days * 86400) : 0;
  const snapshot: PerformanceSnapshot = {
    timestamp: now,
    cpuUsage: num(health?.system?.cpu_percent),
    gpuUsage: 0, // 无真实 GPU 利用率源（节点导出器属后端 BL 项）
    memoryUsage: num(health?.system?.memory_percent),
    latencyP50: latency !== null ? Math.round(latency) : 0,
    latencyP99: 0, // 无 P99 源 — 0 表「无数据」, 不以 P50 冒充
    throughput: Math.round(throughputPerSec),
    errorRate: errorRate ?? 0,
  };

  // ---- 建议规则化（真实数据驱动, 无命中→无异常）----
  const recommendations: string[] = [];
  for (const n of pool) {
    if (n.status === "error") recommendations.push(`上游 ${n.id} 处于熔断态 — 建议检查该上游服务与网络链路`);
    else if (n.status === "warning") recommendations.push(`上游 ${n.id} 半开降级态 — 建议关注其错误率恢复情况`);
  }
  for (const m of models) {
    if (num(m.error_rate) > 0.05) {
      recommendations.push(`模型 ${m.model_id ?? "?"} 错误率 ${(num(m.error_rate) * 100).toFixed(1)}% 偏高 — 建议检查上游或切换 fallback`);
    }
  }
  const disk = num(health?.system?.disk_percent);
  if (disk > 80) recommendations.push(`网关磁盘占用 ${disk.toFixed(1)}% 超过 80% — 建议清理日志/缓存`);
  const topCost = groups[0];
  if (topCost && num(topCost.cost_usd) > 0) {
    recommendations.push(`近 ${days} 天成本最高: ${topCost.grp ?? "?"} $${num(topCost.cost_usd).toFixed(2)}（${fmtInt(num(topCost.calls))} 次调用）`);
  }
  if (recommendations.length === 0) recommendations.push(`近 ${days} 天真实数据无异常项（熔断/错误率/磁盘/成本均正常）`);

  // ---- 节点明细: 上游池真实快照 + models/stats 按名匹配真实延迟（无 CPU/GPU 源 → 0 不伪造）----
  const nodeBreakdown: ReportData["nodeBreakdown"] = pool.map((n) => {
    const stat = models.find((m) => m.model_id === n.id);
    return {
      nodeId: n.id,
      avgCpu: 0,
      avgGpu: 0,
      avgLatency: stat ? Math.round(num(stat.avg_latency_ms)) : 0,
      errorRate: stat ? num(stat.error_rate) * 100 : 0,
    };
  });
  if (health) {
    nodeBreakdown.push({
      nodeId: "nas-gateway",
      avgCpu: num(health.system?.cpu_percent),
      avgGpu: 0,
      avgLatency: latency !== null ? Math.round(latency) : 0,
      errorRate: 0,
    });
  }

  return {
    id: `rpt-${Date.now()}`,
    type,
    title: type === "performance" ? "性能分析报表" : type === "security" ? "安全审计报表" : type === "audit" ? "操作审计报表" : "综合分析报表",
    generatedAt: now,
    timeRange: {
      start: now - hours * 3600000,
      end: now,
      label: range === "1h" ? "最近 1 小时" : range === "6h" ? "最近 6 小时" : range === "24h" ? "最近 24 小时" : range === "7d" ? "最近 7 天" : range === "30d" ? "最近 30 天" : "自定义",
    },
    summary,
    performanceHistory: [snapshot],
    securityHistory: [], // 无真实安全时序源（后端 BL 项）— 空集不伪造
    recommendations,
    nodeBreakdown,
  };
}

// ============================================================
// Export Utilities
// ============================================================

function exportJSON(data: ReportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yyc3-${data.type}-report-${new Date(data.generatedAt).toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(data: ReportData) {
  const headers = ["Timestamp", "CPU%", "GPU%", "Memory%", "LatencyP50(ms)", "LatencyP99(ms)", "Throughput", "ErrorRate%"];
  const rows = data.performanceHistory.map((s) => [
    new Date(s.timestamp).toISOString(),
    s.cpuUsage.toFixed(1),
    s.gpuUsage.toFixed(1),
    s.memoryUsage.toFixed(1),
    s.latencyP50.toFixed(0),
    s.latencyP99.toFixed(0),
    s.throughput.toFixed(0),
    s.errorRate.toFixed(2),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yyc3-${data.type}-report-${new Date(data.generatedAt).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPrintable(data: ReportData) {
  const win = window.open("", "_blank");
  if (!win) return;

  // HTML 输出前转义 — 数据将来接入动态来源时防注入 (规范: 协同开发文档 §6.6)
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>YYC³ ${esc(data.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; background: #fff; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #0a0a2e; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #0a0a2e; border-bottom: 2px solid #00d4ff; padding-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 12px; color: #666; }
    .metric-value { font-size: 20px; font-weight: 700; color: #0a0a2e; margin-top: 4px; }
    .metric-change { font-size: 11px; margin-top: 4px; }
    .up { color: #e53e3e; } .down { color: #38a169; } .stable { color: #718096; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
    th { background: #f7fafc; font-weight: 600; }
    .recommendation { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .recommendation:before { content: "▸ "; color: #00d4ff; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>YYC³ CloudPivot Intelli-Matrix — ${data.title}</h1>
  <div class="subtitle">
    报告时间: ${new Date(data.generatedAt).toLocaleString("zh-CN")} &nbsp;|&nbsp;
    时间范围: ${data.timeRange.label} &nbsp;|&nbsp;
    报告 ID: ${data.id}
  </div>

  <h2>概览指标</h2>
  <div class="metrics-grid">
    ${data.summary.map((m) => `
      <div class="metric-card">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-change ${m.trend}">${m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"} ${m.change}</div>
      </div>
    `).join("")}
  </div>

  <h2>节点明细</h2>
  <table>
    <tr><th>节点</th><th>CPU 均值</th><th>GPU 均值</th><th>延迟均值</th><th>错误率</th></tr>
    ${data.nodeBreakdown.map((n) => `
      <tr>
        <td>${n.nodeId}</td>
        <td>${n.avgCpu.toFixed(1)}%</td>
        <td>${n.avgGpu.toFixed(1)}%</td>
        <td>${n.avgLatency}ms</td>
        <td>${n.errorRate.toFixed(1)}%</td>
      </tr>
    `).join("")}
  </table>

  <h2>优化建议（真实数据规则化）</h2>
  ${data.recommendations.map((r) => `<div class="recommendation">${esc(r)}</div>`).join("")}

  <div class="footer">
    YYC³ CloudPivot Intelli-Matrix — 真实数据报告（账单/模型/节点三源） — ${new Date().toISOString().slice(0, 10)}
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:12px 32px;font-size:15px;background:#00d4ff;color:#fff;border:none;border-radius:8px;cursor:pointer;">打印 / 保存 PDF</button>
  </div>
</body>
</html>`;

  // 规范: 禁止 document.write (同步解析阻塞 + XSS 面) — 改 Blob URL 一次性写入 (ast-grep 守护)
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  win.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  win.document.close();
}

// ============================================================
// Hook
// ============================================================

export function useReportExporter() {
  const [reportType, setReportType] = useState<ExportReportType>("performance");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const {
    items: recentReports,
    prepend: prependReport,
    loaded: reportsLoaded,
  } = usePersistedList<ReportHistoryEntry>("reports", []);

  // P0-4: 真实源采集 → 报表; 全源不可达拒绝生成（不产模拟数据, 硬约束①）
  const generateReport = useCallback(() => {
    setIsGenerating(true);
    setLastError(null);
    void (async () => {
      const sources = await collectReportSources(timeRange);
      const anyReal = sources.usage !== null || sources.models !== null || (sources.metrics?.gateway ?? null) !== null;
      if (!anyReal) {
        setReport(null);
        setLastError("真实数据源全部不可达（网关 /console/gw 与指标聚合 /console/metrics）— 拒绝生成模拟报表");
        setIsGenerating(false);
        return;
      }
      const data = buildReportData(reportType, timeRange, sources);
      setReport(data);
      prependReport(
        { id: data.id, type: data.type, time: data.generatedAt, range: timeRange },
        10,
      );
      setIsGenerating(false);
    })();
  }, [reportType, timeRange, prependReport]);

  const exportReport = useCallback((format: ExportFormat) => {
    if (!report) return;
    if (format === "json") exportJSON(report);
    else if (format === "csv") exportCSV(report);
    else if (format === "print") exportPrintable(report);
  }, [report]);

  return {
    reportType,
    setReportType,
    timeRange,
    setTimeRange,
    isGenerating,
    report,
    lastError,
    recentReports,
    reportsLoaded,
    generateReport,
    exportReport,
  };
}
