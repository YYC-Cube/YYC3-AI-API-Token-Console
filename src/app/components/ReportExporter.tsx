/**
 * ReportExporter.tsx
 * ====================
 * 性能报表生成与导出
 * JSON / CSV(Excel) / PDF(Print) 三种格式
 * 赛博朋克风格 #060e1f + #00d4ff
 */

import React from "react";
import {
  FileBarChart, Download, FileJson, FileSpreadsheet, Printer,
  Clock, TrendingUp, TrendingDown, Minus, RefreshCw,
  ChevronRight, BarChart3, Shield, ClipboardList, Layers,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { useReportExporter } from "../hooks/useReportExporter";
import type { ExportReportType as ReportType, TimeRange, ExportFormat } from "../types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ============================================================
// Helpers
// ============================================================

function trendIcon(trend: "up" | "down" | "stable") {
  if (trend === "up") return <TrendingUp className="w-3 h-3" style={{ color: "#ff6666" }} />;
  if (trend === "down") return <TrendingDown className="w-3 h-3" style={{ color: "#00ff88" }} />;
  return <Minus className="w-3 h-3" style={{ color: "rgba(0,212,255,0.4)" }} />;
}

function reportTypeIcon(type: ReportType) {
  if (type === "performance") return <BarChart3 className="w-4 h-4 text-[#00d4ff]" />;
  if (type === "security") return <Shield className="w-4 h-4 text-[#aa55ff]" />;
  if (type === "audit") return <ClipboardList className="w-4 h-4 text-[#00ff88]" />;
  return <Layers className="w-4 h-4 text-[#ffaa00]" />;
}

// ============================================================
// Main Component
// ============================================================

export function ReportExporter() {
  const { t } = useI18n();
  const {
    reportType, setReportType,
    timeRange, setTimeRange,
    isGenerating, report, recentReports,
    generateReport, exportReport,
  } = useReportExporter();

  const reportTypes: { key: ReportType; labelKey: string; icon: React.ElementType; color: string }[] = [
    { key: "performance", labelKey: "reports.typePerformance", icon: BarChart3, color: "#00d4ff" },
    { key: "security", labelKey: "reports.typeSecurity", icon: Shield, color: "#aa55ff" },
    { key: "audit", labelKey: "reports.typeAudit", icon: ClipboardList, color: "#00ff88" },
    { key: "comprehensive", labelKey: "reports.typeComprehensive", icon: Layers, color: "#ffaa00" },
  ];

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: "1h", label: "1h" },
    { key: "6h", label: "6h" },
    { key: "24h", label: "24h" },
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
  ];

  const exportFormats: { key: ExportFormat; label: string; icon: React.ElementType; color: string }[] = [
    { key: "json", label: "JSON", icon: FileJson, color: "#00d4ff" },
    { key: "csv", label: "CSV / Excel", icon: FileSpreadsheet, color: "#00ff88" },
    { key: "print", label: "PDF / Print", icon: Printer, color: "#aa55ff" },
  ];

  // Chart data from report
  const chartData = report?.performanceHistory.map((p, i) => ({
    time: new Date(p.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    gpu: Number(p.gpuUsage.toFixed(1)),
    cpu: Number(p.cpuUsage.toFixed(1)),
    latency: Number(p.latencyP50.toFixed(0)),
    errors: Number(p.errorRate.toFixed(2)),
  })).filter((_, i) => i % Math.max(1, Math.floor((report?.performanceHistory.length || 1) / 40)) === 0) || [];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#00d4ff] flex items-center gap-2" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            <FileBarChart className="w-5 h-5" />
            {t("reports.title")}
          </h1>
          <p className="text-[rgba(0,212,255,0.4)] mt-1" style={{ fontSize: "0.72rem" }}>
            {t("reports.subtitle")}
          </p>
        </div>
      </div>

      {/* Config Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Report Type */}
        <GlassCard className="p-4">
          <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.selectType")}</div>
          <div className="grid grid-cols-2 gap-2">
            {reportTypes.map(({ key, labelKey, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setReportType(key)}
                className="flex items-center gap-2 p-2.5 rounded-lg border transition-all"
                style={{
                  fontSize: "0.72rem",
                  borderColor: reportType === key ? `${color}40` : "rgba(0,180,255,0.1)",
                  background: reportType === key ? `${color}10` : "transparent",
                  color: reportType === key ? color : "rgba(224,240,255,0.5)",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: reportType === key ? color : "rgba(0,212,255,0.3)" }} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Time Range */}
        <GlassCard className="p-4">
          <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.selectRange")}</div>
          <div className="flex gap-2 mb-4">
            {timeRanges.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className="flex-1 py-2 rounded-lg border transition-all"
                style={{
                  fontSize: "0.72rem",
                  borderColor: timeRange === key ? "rgba(0,212,255,0.3)" : "rgba(0,180,255,0.1)",
                  background: timeRange === key ? "rgba(0,212,255,0.1)" : "transparent",
                  color: timeRange === key ? "#00d4ff" : "rgba(0,212,255,0.4)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all"
            style={{
              fontSize: "0.78rem",
              borderColor: isGenerating ? "rgba(0,212,255,0.2)" : "rgba(0,212,255,0.4)",
              background: isGenerating ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.12)",
              color: "#00d4ff",
              cursor: isGenerating ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? t("reports.generating") : t("reports.generate")}
          </button>
        </GlassCard>

        {/* Recent Reports */}
        <GlassCard className="p-4">
          <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.recentReports")}</div>
          <div className="space-y-2">
            {recentReports.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 py-2 px-2 rounded border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all"
              >
                {reportTypeIcon(r.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-[rgba(224,240,255,0.7)] truncate" style={{ fontSize: "0.72rem" }}>
                    {t(`reports.type${r.type.charAt(0).toUpperCase() + r.type.slice(1)}`)} · {r.range}
                  </div>
                  <div className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.58rem" }}>
                    {new Date(r.time).toLocaleString("zh-CN")}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Report Content */}
      {report && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {report.summary.map((m) => (
              <GlassCard key={m.label} className="p-3">
                <div className="text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.62rem" }}>{m.label}</div>
                <div className="text-[#e0f0ff] mb-1" style={{ fontSize: "1rem", fontFamily: "'Orbitron', sans-serif" }}>
                  {m.value}
                </div>
                <div className="flex items-center gap-1">
                  {trendIcon(m.trend)}
                  <span
                    style={{
                      fontSize: "0.58rem",
                      color: m.trend === "up" ? "#ff6666" : m.trend === "down" ? "#00ff88" : "rgba(0,212,255,0.4)",
                    }}
                  >
                    {m.change}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GPU/CPU Chart */}
            <GlassCard className="p-4">
              <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.chartGpuCpu")}</div>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#aa55ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#aa55ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
                    <XAxis dataKey="time" stroke="rgba(0,212,255,0.3)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(0,212,255,0.3)" tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "rgba(6,14,31,0.95)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#00d4ff" }}
                    />
                    <Area type="monotone" dataKey="gpu" stroke="#00d4ff" fill="url(#gpuGrad)" strokeWidth={2} name="GPU%" />
                    <Area type="monotone" dataKey="cpu" stroke="#aa55ff" fill="url(#cpuGrad)" strokeWidth={2} name="CPU%" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Latency Chart */}
            <GlassCard className="p-4">
              <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.chartLatency")}</div>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
                    <XAxis dataKey="time" stroke="rgba(0,212,255,0.3)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(0,212,255,0.3)" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "rgba(6,14,31,0.95)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#00d4ff" }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#ffaa00" strokeWidth={2} dot={false} name="P50 Latency(ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Node Breakdown */}
          <GlassCard className="p-4">
            <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.nodeBreakdown")}</div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "0.72rem" }}>
                <thead>
                  <tr className="border-b border-[rgba(0,180,255,0.1)]">
                    <th className="text-left py-2 px-3 text-[rgba(0,212,255,0.5)]">{t("reports.colNode")}</th>
                    <th className="text-right py-2 px-3 text-[rgba(0,212,255,0.5)]">CPU %</th>
                    <th className="text-right py-2 px-3 text-[rgba(0,212,255,0.5)]">GPU %</th>
                    <th className="text-right py-2 px-3 text-[rgba(0,212,255,0.5)]">{t("reports.colLatency")}</th>
                    <th className="text-right py-2 px-3 text-[rgba(0,212,255,0.5)]">{t("reports.colErrorRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.nodeBreakdown.map((node) => (
                    <tr key={node.nodeId} className="border-b border-[rgba(0,180,255,0.05)] hover:bg-[rgba(0,180,255,0.03)]">
                      <td className="py-2 px-3 text-[#e0f0ff] font-mono">{node.nodeId}</td>
                      <td className="text-right py-2 px-3">
                        <span style={{ color: node.avgCpu > 80 ? "#ff3366" : node.avgCpu > 60 ? "#ffaa00" : "#00ff88" }}>
                          {node.avgCpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">
                        <span style={{ color: node.avgGpu > 90 ? "#ff3366" : node.avgGpu > 75 ? "#ffaa00" : "#00ff88" }}>
                          {node.avgGpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">
                        <span style={{ color: node.avgLatency > 200 ? "#ff3366" : node.avgLatency > 150 ? "#ffaa00" : "#00ff88" }}>
                          {node.avgLatency}ms
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">
                        <span style={{ color: node.errorRate > 2 ? "#ff3366" : node.errorRate > 1 ? "#ffaa00" : "#00ff88" }}>
                          {node.errorRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Recommendations */}
          <GlassCard className="p-4">
            <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.recommendations")}</div>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-2 px-3 rounded-lg border border-[rgba(0,180,255,0.06)] bg-[rgba(0,180,255,0.02)]"
                  style={{ fontSize: "0.72rem" }}
                >
                  <span className="text-[#00d4ff] shrink-0 mt-0.5">▸</span>
                  <span className="text-[rgba(224,240,255,0.7)]">{rec}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Export Actions */}
          <GlassCard className="p-4">
            <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>{t("reports.exportAs")}</div>
            <div className="flex flex-wrap gap-3">
              {exportFormats.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => exportReport(key)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all hover:scale-[1.02]"
                  style={{
                    fontSize: "0.78rem",
                    borderColor: `${color}30`,
                    background: `${color}08`,
                    color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <Download className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>
        </>
      )}

      {/* Empty State */}
      {!report && !isGenerating && (
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="text-center">
            <FileBarChart className="w-12 h-12 text-[rgba(0,212,255,0.12)] mx-auto mb-4" />
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
              {t("reports.emptyHint")}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Generating Animation */}
      {isGenerating && (
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[#00d4ff] mx-auto mb-3 animate-spin" />
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.72rem" }}>
              {t("reports.subtitle")}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}