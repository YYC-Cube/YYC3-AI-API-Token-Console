/**
 * ReportGenerator.tsx
 * ====================
 * 报告生成器组件
 * 支持性能/健康/安全报告 · JSON/Markdown/CSV 格式
 */

import React, { useState } from "react";
import {
  FileText, Download, Eye, Loader2, Clock,
  BarChart3, Shield, Activity, Wrench,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { ReportConfig, ReportResult, ReportType, ReportFormat } from "../types";

const reportTypes: Array<{ key: ReportType; label: string; icon: React.ElementType; color: string }> = [
  { key: "performance", label: "性能报告", icon: BarChart3, color: "#00d4ff" },
  { key: "health",      label: "健康报告", icon: Activity,  color: "#00ff88" },
  { key: "security",    label: "安全报告", icon: Shield,    color: "#ffaa00" },
  { key: "custom",      label: "自定义",   icon: Wrench,    color: "#aa55ff" },
];

const formatOptions: Array<{ key: ReportFormat; label: string }> = [
  { key: "json",     label: "JSON" },
  { key: "markdown", label: "Markdown" },
  { key: "csv",      label: "CSV" },
];

const dateRangeOptions = [
  { key: "today" as const, label: "今日" },
  { key: "week" as const,  label: "本周" },
  { key: "month" as const, label: "本月" },
];

interface ReportGeneratorProps {
  reports: ReportResult[];
  isGenerating: boolean;
  onGenerate: (config: ReportConfig) => void;
}

export function ReportGenerator({ reports, isGenerating, onGenerate }: ReportGeneratorProps) {
  const [type, setType] = useState<ReportType>("performance");
  const [format, setFormat] = useState<ReportFormat>("json");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleGenerate = () => {
    onGenerate({ type, format, dateRange, includeCharts, includeRawData });
  };

  const previewReport = reports.find((r) => r.id === previewId);

  return (
    <div className="space-y-4">
      {/* Config form */}
      <GlassCard className="p-4" data-testid="report-generator">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            报告生成器
          </h3>
        </div>

        {/* Report type */}
        <div className="mb-3">
          <label className="text-[rgba(0,212,255,0.4)] block mb-1.5" style={{ fontSize: "0.68rem" }}>
            报告类型
          </label>
          <div className="flex flex-wrap gap-1.5">
            {reportTypes.map((rt) => {
              const Icon = rt.icon;
              const isActive = type === rt.key;
              return (
                <button
                  key={rt.key}
                  onClick={() => setType(rt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "border border-current"
                      : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
                  }`}
                  style={{
                    fontSize: "0.72rem",
                    color: isActive ? rt.color : undefined,
                    backgroundColor: isActive ? `${rt.color}12` : undefined,
                    borderColor: isActive ? `${rt.color}40` : undefined,
                  }}
                  data-testid={`type-${rt.key}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {rt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format */}
        <div className="mb-3">
          <label className="text-[rgba(0,212,255,0.4)] block mb-1.5" style={{ fontSize: "0.68rem" }}>
            输出格式
          </label>
          <div className="flex gap-1.5">
            {formatOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  format === f.key
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                    : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
                }`}
                style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}
                data-testid={`format-${f.key}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="mb-3">
          <label className="text-[rgba(0,212,255,0.4)] block mb-1.5" style={{ fontSize: "0.68rem" }}>
            时间范围
          </label>
          <div className="flex gap-1.5">
            {dateRangeOptions.map((dr) => (
              <button
                key={dr.key}
                onClick={() => setDateRange(dr.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRange === dr.key
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                    : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
                }`}
                style={{ fontSize: "0.72rem" }}
                data-testid={`range-${dr.key}`}
              >
                {dr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="accent-[#00d4ff]"
              data-testid="include-charts"
            />
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>包含图表</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRawData}
              onChange={(e) => setIncludeRawData(e.target.checked)}
              className="accent-[#00d4ff]"
              data-testid="include-rawdata"
            />
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>包含原始数据</span>
          </label>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.18)] transition-all disabled:opacity-40"
          style={{ fontSize: "0.78rem" }}
          data-testid="generate-btn"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              生成报告
            </>
          )}
        </button>
      </GlassCard>

      {/* Generated reports */}
      {reports.length > 0 && (
        <GlassCard className="p-4" data-testid="report-list">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              已生成报告
            </h3>
            <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
              ({reports.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {reports.map((rpt) => {
              const rtMeta = reportTypes.find((t) => t.key === rpt.config.type);

              return (
                <div
                  key={rpt.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.08)] hover:bg-[rgba(0,40,80,0.15)] transition-all"
                  data-testid={`report-${rpt.id}`}
                >
                  <FileText
                    className="w-4 h-4 shrink-0"
                    style={{ color: rtMeta?.color ?? "#00d4ff" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.75rem" }}>
                      {rpt.filename}
                    </p>
                    <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                      {new Date(rpt.generatedAt).toLocaleString("zh-CN")} · {(rpt.size / 1024).toFixed(1)}KB
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewId(previewId === rpt.id ? null : rpt.id)}
                    className="p-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
                    data-testid={`preview-${rpt.id}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Preview panel */}
          {previewReport && (
            <div className="mt-3 p-3 rounded-xl bg-[rgba(2,8,18,0.8)] border border-[rgba(0,180,255,0.1)]">
              <p className="text-[rgba(0,212,255,0.4)] mb-2" style={{ fontSize: "0.68rem" }}>
                预览: {previewReport.filename}
              </p>
              <pre
                className="text-[#c0dcf0] whitespace-pre-wrap overflow-x-auto max-h-[300px]"
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: "1.5",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(0,180,255,0.15) transparent",
                }}
                data-testid="report-preview"
              >
                {previewReport.previewContent}
              </pre>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
