import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import React, { useState, useMemo, useCallback } from "react";
import {
  Search, Filter, Download, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Eye, MoreHorizontal,
  User, Shield, Database, Server, Activity, FileJson, Copy, Check
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell
} from "recharts";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  time: string;
  user: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  status: "success" | "running" | "failed" | "warning";
  risk: "low" | "medium" | "high";
}

const ALL_AUDIT_LOGS: AuditLog[] = [
  { id: "AUD-20260222-0001", time: "14:32:08", user: "admin", role: "超级管理员", action: "模型部署", target: "DeepSeek-V3 部署至 GPU-A100-03", ip: "192.168.1.100", status: "success", risk: "low" },
  { id: "AUD-20260222-0002", time: "14:28:45", user: "ops_bot", role: "运维机器人", action: "节点重启", target: "GPU-H100-03 执行热重启", ip: "10.0.0.50", status: "success", risk: "medium" },
  { id: "AUD-20260222-0003", time: "14:25:10", user: "api_svc", role: "API 服务", action: "批量推理", target: "Batch#2847 提交 → LLaMA-70B", ip: "10.0.1.20", status: "running", risk: "low" },
  { id: "AUD-20260222-0004", time: "14:20:55", user: "dev_zhang", role: "开发者", action: "配置修改", target: "修改 Qwen-72B 推理参数", ip: "192.168.2.88", status: "success", risk: "medium" },
  { id: "AUD-20260222-0005", time: "14:15:22", user: "admin", role: "超级管理员", action: "数据迁移", target: "向量库分片迁移 Shard-05", ip: "192.168.1.100", status: "success", risk: "high" },
  { id: "AUD-20260222-0006", time: "14:10:08", user: "system", role: "系统", action: "自动告警", target: "GPU-A100-03 温度超过80°C", ip: "localhost", status: "warning", risk: "high" },
  { id: "AUD-20260222-0007", time: "14:05:33", user: "dev_li", role: "开发者", action: "模型下载", target: "Mixtral-8x7B 模型权重下载", ip: "192.168.2.92", status: "success", risk: "low" },
  { id: "AUD-20260222-0008", time: "14:00:11", user: "ops_bot", role: "运维机器人", action: "健康检查", target: "全节点巡检 → 7/8 正常", ip: "10.0.0.50", status: "success", risk: "low" },
  { id: "AUD-20260222-0009", time: "13:55:48", user: "admin", role: "超级管理员", action: "权限变更", target: "dev_wang 升级为运维角色", ip: "192.168.1.100", status: "success", risk: "high" },
  { id: "AUD-20260222-0010", time: "13:50:20", user: "api_svc", role: "API 服务", action: "异常请求", target: "非法Token访问 /api/v2/infer", ip: "203.0.113.45", status: "failed", risk: "high" },
  { id: "AUD-20260222-0011", time: "13:45:15", user: "dev_wang", role: "开发者", action: "模型测试", target: "Qwen-72B A/B 测试启动", ip: "192.168.2.88", status: "success", risk: "low" },
  { id: "AUD-20260222-0012", time: "13:40:30", user: "ops_bot", role: "运维机器人", action: "缓存清理", target: "清理 GPU-A100-01 推理缓存", ip: "10.0.0.50", status: "success", risk: "low" },
];

const auditTrend = [
  { time: "08:00", ops: 120, errors: 2 },
  { time: "09:00", ops: 280, errors: 5 },
  { time: "10:00", ops: 450, errors: 3 },
  { time: "11:00", ops: 380, errors: 8 },
  { time: "12:00", ops: 320, errors: 4 },
  { time: "13:00", ops: 510, errors: 6 },
  { time: "14:00", ops: 420, errors: 3 },
];

const riskDistribution = [
  { level: "低风险", count: 245 },
  { level: "中风险", count: 82 },
  { level: "高风险", count: 18 },
  { level: "严重", count: 3 },
];

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
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic
  const filteredLogs = useMemo(() => {
    let logs = ALL_AUDIT_LOGS;

    // Category filter
    if (selectedFilter === "success") {
      logs = logs.filter(l => l.status === "success");
    } else if (selectedFilter === "abnormal") {
      logs = logs.filter(l => l.status === "failed" || l.status === "warning");
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
  }, [selectedFilter, searchQuery]);

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

  const handleTraceLink = useCallback((log: AuditLog) => {
    toast.success(`追踪链路: ${log.id}`, {
      description: `${log.user} → ${log.action} → ${log.target}`,
      style: toastStyle,
    });
  }, []);

  const handleExportReport = useCallback((log: AuditLog) => {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: t("audit.todayOps"), value: "1,284", icon: Activity, color: "#00d4ff", sub: t("audit.comparedYesterday") },
          { label: t("audit.abnormalEvents"), value: String(ALL_AUDIT_LOGS.filter(l => l.status === "failed" || l.status === "warning").length), icon: AlertTriangle, color: "#ffdd00", sub: t("audit.needProcess") },
          { label: t("audit.securityEvents"), value: String(ALL_AUDIT_LOGS.filter(l => l.risk === "high").length), icon: Shield, color: "#ff3366", sub: t("audit.unprocessed") },
          { label: t("audit.activeUsers"), value: String(new Set(ALL_AUDIT_LOGS.map(l => l.user)).size), icon: User, color: "#00ff88", sub: t("audit.onlineCount") },
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
            <AreaChart data={auditTrend}>
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
            <BarChart data={riskDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
              <XAxis type="number" tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <YAxis dataKey="level" type="category" tick={{ fill: "rgba(0,212,255,0.5)", fontSize: 11 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name={t("audit.eventCount")}>
                {riskDistribution.map((_, idx) => {
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