import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import React, { useState, useMemo, useCallback } from "react";
import {
  Search, Download, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Eye,
  User, Shield, Database, Activity, FileJson
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell
} from "recharts";
import { toast } from "sonner";
import { useGatewayAudit } from "../hooks/useGatewayAudit";
import type { GatewayAuditLog } from "../hooks/useGatewayAudit";

const tooltipStyle = {
  backgroundColor: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 180, 255, 0.3)",
  borderRadius: "8px",
  color: "#e0f0ff",
  fontSize: "0.75rem",
  fontFamily: "'Rajdhani', sans-serif",
};

const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

const PAGE_SIZE = 5;

export function OperationAudit() {
  const { t } = useI18n();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailLog, setDetailLog] = useState<GatewayAuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // R5 真实化: /v1/logs 网关请求流水（经 /console/gw; 不可达空态, 不回退 mock）
  const audit = useGatewayAudit();

  // Filter logic
  const filteredLogs = useMemo(() => {
    let logs = audit.logs;

    // Category filter
    if (selectedFilter === "success") {
      logs = logs.filter(l => l.status === "success");
    } else if (selectedFilter === "abnormal") {
      // R5 真实化: 网关流水无 warning 态（ok/error 二值）— 异常=failed
      logs = logs.filter(l => l.status === "failed");
    } else if (selectedFilter === "alert") {
      logs = logs.filter(l => l.risk === "high");
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter(l =>
        l.id.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.ip.includes(q)
      );
    }

    return logs;
  }, [selectedFilter, searchQuery, audit.logs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filter changes
  React.useEffect(() => { setCurrentPage(1); }, [selectedFilter, searchQuery]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filteredLogs.length} 条审计日志`, { style: toastStyle });
  }, [filteredLogs]);

  const handleTraceLink = useCallback((log: GatewayAuditLog) => {
    toast.success(`追踪链路: ${log.id}`, {
      description: `${log.user} → ${log.action} → ${log.target}`,
      style: toastStyle,
    });
  }, []);

  const handleExportReport = useCallback((log: GatewayAuditLog) => {
    const report = {
      ...log,
      exportedAt: new Date().toISOString(),
      fullTimestamp: `2026-02-22 ${log.time}`,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${log.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("报告已导出", { style: toastStyle });
    setDetailLog(null);
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />;
      case "running": return <RefreshCw className="w-4 h-4 text-[#00d4ff] animate-spin" />;
      case "failed": return <XCircle className="w-4 h-4 text-[#ff3366]" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-[#ffdd00]" />;
      default: return <Clock className="w-4 h-4 text-[#aa55ff]" />;
    }
  };

  // Pagination display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* R5 数据源状态条: 网关 /v1/logs 实况（不可达显空态提示） */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(4,14,32,0.4)]">
        <span className={audit.sourceOk === false ? "text-[#ff6464]" : "text-[rgba(0,212,255,0.55)]"} style={{ fontSize: "0.68rem" }}>
          {audit.sourceOk === false
            ? "网关日志不可达（/console/gw /v1/logs）— 空态展示（不回退模拟数据）"
            : `网关请求流水 · ${audit.logs.length}/${audit.total} 条（近 24h）· 更新 ${audit.fetchedAt ?? "—"}`}
        </span>
        <button onClick={audit.refresh} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all" style={{ fontSize: "0.65rem" }}>
          <RefreshCw className="w-3 h-3" /> 刷新
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: t("audit.todayOps"), value: String(audit.logs.length), icon: Activity, color: "#00d4ff", sub: `总计 ${audit.total} 条（近 24h）` },
          { label: t("audit.abnormalEvents"), value: String(audit.logs.filter(l => l.status === "failed").length), icon: AlertTriangle, color: "#ffdd00", sub: t("audit.needProcess") },
          { label: t("audit.securityEvents"), value: String(audit.logs.filter(l => l.risk === "high").length), icon: Shield, color: "#ff3366", sub: t("audit.unprocessed") },
          { label: t("audit.activeUsers"), value: String(new Set(audit.logs.map(l => l.user)).size), icon: User, color: "#00ff88", sub: t("audit.onlineCount") },
        ].map((card) => (
          <GlassCard key={card.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", color: card.color, fontFamily: "'Orbitron', sans-serif" }}>
              {card.value}
            </div>
            <div className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>{card.label}</div>
            <div className="text-[rgba(0,212,255,0.3)] mt-1" style={{ fontSize: "0.65rem" }}>{card.sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3">
        <GlassCard className="md:col-span-8 p-3 md:p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#00d4ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{t("audit.opsTrend")}</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={audit.trend}>
              <defs>
                <linearGradient id="audit-opsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
              <XAxis dataKey="time" tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <YAxis tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="ops" stroke="#00d4ff" fill="url(#audit-opsGrad)" strokeWidth={2} name={t("audit.opsCount")} />
              <Area type="monotone" dataKey="errors" stroke="#ff3366" fill="rgba(255,51,102,0.1)" strokeWidth={1.5} name={t("audit.errorCount")} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="md:col-span-4 p-3 md:p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#ff6600]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{t("audit.riskDist")}</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={audit.riskDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
              <XAxis type="number" tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <YAxis dataKey="level" type="category" tick={{ fill: "rgba(0,212,255,0.5)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name={t("audit.eventCount")}>
                {audit.riskDistribution.map((_, idx) => {
                  const colors = ["#00ff88", "#ffdd00", "#ff6600", "#ff3366"];
                  return <Cell key={idx} fill={colors[idx]} fillOpacity={0.7} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Audit Log Table */}
      <GlassCard className="p-3 md:p-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00d4ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{t("audit.auditLog")}</h3>
            <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
              ({filteredLogs.length} 条)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("audit.searchLog")}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.75rem", width: "180px" }}
              />
            </div>
            {/* Filter */}
            {[
              { key: "all", label: t("audit.filterAll") },
              { key: "success", label: t("audit.filterSuccess") },
              { key: "abnormal", label: t("audit.filterAbnormal") },
              { key: "alert", label: t("audit.filterAlert") },
            ].map((f) => (
              <button key={f.key}
                onClick={() => setSelectedFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedFilter === f.key ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]" : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent"}`}
                style={{ fontSize: "0.72rem" }}
              >{f.label}</button>
            ))}
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              <Download className="w-3 h-3" /> {t("audit.export")}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[rgba(0,180,255,0.08)]">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[rgba(0,40,80,0.3)]">
                {[
                  { id: "status", label: t("audit.colStatus") },
                  { id: "auditId", label: t("audit.colAuditId") },
                  { id: "time", label: t("audit.colTime") },
                  { id: "user", label: t("audit.colUser") },
                  { id: "role", label: t("audit.colRole") },
                  { id: "action", label: t("audit.colAction") },
                  { id: "target", label: t("audit.colTarget") },
                  { id: "ip", label: t("audit.colIp") },
                  { id: "risk", label: t("audit.colRisk") },
                  { id: "actions", label: "" },
                ].map((h) => (
                  <th key={h.id} className="px-3 py-2.5 text-left text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => (
                <tr key={log.id} className="border-t border-[rgba(0,180,255,0.05)] hover:bg-[rgba(0,180,255,0.03)] cursor-pointer transition-colors" onClick={() => setDetailLog(log)}>
                  <td className="px-3 py-2.5">{statusIcon(log.status)}</td>
                  <td className="px-3 py-2.5 text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.7rem", fontFamily: "'Orbitron', sans-serif" }}>{log.id}</td>
                  <td className="px-3 py-2.5 text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{log.time}</td>
                  <td className="px-3 py-2.5 text-[#00d4ff]" style={{ fontSize: "0.75rem" }}>{log.user}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.65rem" }}>{log.role}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{log.action}</td>
                  <td className="px-3 py-2.5 text-[rgba(0,212,255,0.5)] max-w-[200px] truncate" style={{ fontSize: "0.72rem" }}>{log.target}</td>
                  <td className="px-3 py-2.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{log.ip}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded ${
                      log.risk === "low" ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]" :
                      log.risk === "medium" ? "bg-[rgba(255,221,0,0.1)] text-[#ffdd00]" :
                      "bg-[rgba(255,51,102,0.1)] text-[#ff3366]"
                    }`} style={{ fontSize: "0.62rem" }}>
                      {log.risk === "low" ? t("audit.riskLow") : log.risk === "medium" ? t("audit.riskMedium") : t("audit.riskHigh")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailLog(log); }}
                      className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                    </button>
                  </td>
                </tr>
              ))}
              {pagedLogs.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
                    无匹配记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
            {t("audit.totalRecords").replace("{n}", String(filteredLogs.length))}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
            {getPageNumbers().map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === "number" && setCurrentPage(p)}
                disabled={typeof p === "string"}
                className={`px-2.5 py-1 rounded transition-all ${
                  p === currentPage ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]" : typeof p === "string" ? "text-[rgba(0,212,255,0.2)] cursor-default" : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]"
                }`}
                style={{ fontSize: "0.72rem" }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Detail Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-0" onClick={() => setDetailLog(null)}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
          <div className="relative w-full max-w-[500px] max-h-[85vh] overflow-auto rounded-2xl bg-[rgba(8,25,55,0.9)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.1)] p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "1rem" }}>{t("audit.detailTitle")}</h3>
              <button onClick={() => setDetailLog(null)} className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)]">
                <XCircle className="w-5 h-5 text-[rgba(0,212,255,0.4)]" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { k: t("audit.fieldAuditId"), v: detailLog.id },
                { k: t("audit.fieldTime"), v: `2026-02-22 ${detailLog.time}` },
                { k: t("audit.fieldUser"), v: detailLog.user },
                { k: t("audit.fieldRole"), v: detailLog.role },
                { k: t("audit.fieldAction"), v: detailLog.action },
                { k: t("audit.fieldTarget"), v: detailLog.target },
                { k: t("audit.fieldIp"), v: detailLog.ip },
                { k: t("audit.fieldStatus"), v: detailLog.status === "success" ? t("audit.statusSuccess") : detailLog.status === "failed" ? t("audit.statusFailed") : detailLog.status === "warning" ? t("audit.statusWarning") : t("audit.statusRunning") },
                { k: t("audit.fieldRisk"), v: detailLog.risk === "low" ? t("audit.riskLowFull") : detailLog.risk === "medium" ? t("audit.riskMediumFull") : t("audit.riskHighFull") },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between py-2 border-b border-[rgba(0,180,255,0.06)]">
                  <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.78rem" }}>{row.k}</span>
                  <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>{row.v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => handleTraceLink(detailLog)}
                className="flex-1 py-2 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
                style={{ fontSize: "0.8rem" }}
              >
                {t("audit.traceLink")}
              </button>
              <button
                onClick={() => handleExportReport(detailLog)}
                className="flex-1 py-2 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all flex items-center justify-center gap-1.5"
                style={{ fontSize: "0.8rem" }}
              >
                <FileJson className="w-3.5 h-3.5" />
                {t("audit.exportReport")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}