/**
 * useReportExporter.ts
 * =====================
 * Hook for Performance Report Generation & Export
 * Supports JSON, CSV (Excel), and printable HTML (PDF via print dialog)
 */

import { useState, useCallback } from "react";
import { usePersistedList } from "./usePersistedState";

// ============================================================
// Types — centralized in types/index.ts
// ============================================================

import type {
  ExportReportType, ExportFormat, TimeRange,
  ReportMetric, PerformanceSnapshot, SecuritySnapshot,
  ReportData, ReportHistoryEntry,
} from "../types";

// RF-011: Re-export 已移除

// ============================================================
// Mock Data Generator
// ============================================================

function generatePerformanceHistory(hours: number): PerformanceSnapshot[] {
  const now = Date.now();
  const points = Math.min(hours * 4, 120); // 15min intervals, max 120
  return Array.from({ length: points }, (_, i) => {
    const t = now - (points - i) * 15 * 60 * 1000;
    const base = Math.sin(i * 0.2) * 10;
    return {
      timestamp: t,
      cpuUsage: Math.max(10, Math.min(95, 55 + base + (Math.random() - 0.5) * 20)),
      gpuUsage: Math.max(15, Math.min(98, 72 + base + (Math.random() - 0.5) * 15)),
      memoryUsage: Math.max(30, Math.min(90, 65 + (Math.random() - 0.5) * 10)),
      latencyP50: Math.max(50, 180 + base * 5 + (Math.random() - 0.5) * 80),
      latencyP99: Math.max(100, 450 + base * 10 + (Math.random() - 0.5) * 150),
      throughput: Math.max(100, 1200 + base * 20 + (Math.random() - 0.5) * 200),
      errorRate: Math.max(0, 1.2 + (Math.random() - 0.5) * 2),
    };
  });
}

function generateSecurityHistory(hours: number): SecuritySnapshot[] {
  const now = Date.now();
  const points = Math.min(hours, 72); // hourly
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i) * 3600000,
    cspScore: Math.max(60, Math.min(100, 78 + (Math.random() - 0.5) * 10)),
    cookieScore: Math.max(60, Math.min(100, 82 + (Math.random() - 0.5) * 8)),
    sensitiveScore: Math.max(70, Math.min(100, 90 + (Math.random() - 0.5) * 6)),
    overallScore: Math.max(65, Math.min(100, 83 + (Math.random() - 0.5) * 8)),
    activeThreats: Math.floor(Math.random() * 3),
  }));
}

function generateReportData(type: ExportReportType, range: TimeRange): ReportData {
  const hoursMap: Record<string, number> = { "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720, custom: 24 };
  const hours = hoursMap[range] || 24;
  const now = Date.now();

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
    summary: [
      { label: "平均 GPU 利用率", value: "72.3%", trend: "up", change: "+3.2%" },
      { label: "平均推理延迟", value: "185ms", trend: "down", change: "-12ms" },
      { label: "Token 吞吐量", value: "1,248/s", trend: "up", change: "+8.5%" },
      { label: "错误率", value: "1.2%", trend: "down", change: "-0.3%" },
      { label: "节点健康度", value: "96%", trend: "stable", change: "±0%" },
      { label: "安全评分", value: "83/100", trend: "up", change: "+2" },
    ],
    performanceHistory: generatePerformanceHistory(hours),
    securityHistory: generateSecurityHistory(hours),
    recommendations: [
      "GPU-A100-03 近期利用率持续偏高（>90%），建议迁移部分负载到 GPU-A100-07",
      "P99 延迟在高峰期（10:00-12:00）明显上升，建议启用动态负载均衡",
      "错误率在 02:00-04:00 时段有波动，建议检查定时备份任务影响",
      "CSP 配置中存在 unsafe-inline，建议替换为 nonce 方案",
      "3 个节点内存使用率接近 85%，建议清理推理缓存",
    ],
    nodeBreakdown: [
      { nodeId: "GPU-A100-01", avgCpu: 45.2, avgGpu: 78.5, avgLatency: 165, errorRate: 0.8 },
      { nodeId: "GPU-A100-02", avgCpu: 52.1, avgGpu: 82.3, avgLatency: 178, errorRate: 1.5 },
      { nodeId: "GPU-A100-03", avgCpu: 68.7, avgGpu: 92.1, avgLatency: 245, errorRate: 2.1 },
      { nodeId: "GPU-A100-04", avgCpu: 38.9, avgGpu: 65.4, avgLatency: 142, errorRate: 0.5 },
      { nodeId: "GPU-A100-05", avgCpu: 41.3, avgGpu: 70.2, avgLatency: 155, errorRate: 0.7 },
    ],
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
  a.download = `yyc3-${data.type}-report-${new Date().toISOString().slice(0, 10)}.json`;
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
  a.download = `yyc3-${data.type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPrintable(data: ReportData) {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>YYC³ ${data.title}</title>
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

  <h2>优化建议</h2>
  ${data.recommendations.map((r) => `<div class="recommendation">${r}</div>`).join("")}

  <div class="footer">
    YYC³ CloudPivot Intelli-Matrix — 自动生成报告 — ${new Date().toISOString().slice(0, 10)}
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:12px 32px;font-size:15px;background:#00d4ff;color:#fff;border:none;border-radius:8px;cursor:pointer;">打印 / 保存 PDF</button>
  </div>
</body>
</html>`;
  win.document.write(html);
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
  const {
    items: recentReports,
    prepend: prependReport,
    loaded: reportsLoaded,
  } = usePersistedList<ReportHistoryEntry>("reports", [
    { id: "rpt-prev-1", type: "performance", time: Date.now() - 86400000, range: "24h" },
    { id: "rpt-prev-2", type: "security", time: Date.now() - 86400000 * 2, range: "7d" },
    { id: "rpt-prev-3", type: "comprehensive", time: Date.now() - 86400000 * 3, range: "24h" },
  ]);

  const generateReport = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const data = generateReportData(reportType, timeRange);
      setReport(data);
      prependReport(
        { id: data.id, type: data.type, time: data.generatedAt, range: timeRange },
      );
      setIsGenerating(false);
    }, 1500);
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
    recentReports,
    reportsLoaded,
    generateReport,
    exportReport,
  };
}