/**
 * FollowUpDrawer.tsx
 * ====================
 * 侧边抽屉式详细面板
 * 显示告警完整详情、操作链路、关联告警、AI 建议
 */

import React, { useState, useEffect, useRef } from "react";
import {
  X, AlertTriangle, AlertCircle, Info, XCircle, Clock, User,
  ChevronRight, Zap, Bot, CheckCircle, Loader2, RotateCcw,
  Link2, Server, Activity, Copy, Check,
} from "lucide-react";
import { OperationChain } from "./OperationChain";
import { QuickActionGroup } from "./QuickActionGroup";
import type { FollowUpItem, FollowUpSeverity, FollowUpStatus } from "../types";

interface FollowUpDrawerProps {
  item: FollowUpItem | null;
  isOpen: boolean;
  onClose: () => void;
  onQuickFix?: (item: FollowUpItem) => void;
  onMarkResolved?: (item: FollowUpItem) => void;
  isMobile?: boolean;
}

const severityConfig: Record<FollowUpSeverity, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  critical: { icon: XCircle,        color: "#ff3366", label: "严重" },
  error:    { icon: AlertTriangle,   color: "#ff6600", label: "错误" },
  warning:  { icon: AlertCircle,     color: "#ffaa00", label: "警告" },
  info:     { icon: Info,            color: "#00d4ff", label: "信息" },
};

const statusLabels: Record<FollowUpStatus, { label: string; color: string }> = {
  active:        { label: "活跃",   color: "#ff3366" },
  investigating: { label: "排查中", color: "#ffaa00" },
  resolved:      { label: "已解决", color: "#00ff88" },
  ignored:       { label: "已忽略", color: "rgba(0,212,255,0.3)" },
};

// AI suggestion mock data
const AI_SUGGESTIONS = [
  "建议将模型迁移到 GPU-A100-07（当前负载 15%），预计延迟下降至 800ms",
  "建议重启推理服务以清理内存碎片，预计恢复时间 30s",
  "建议启用动态负载均衡，自动分配后续请求到空闲节点",
  "检测到过去 1 小时内连续 3 次延迟异常，建议检查 CUDA 驱动版本",
];

// Related metrics mock
const RELATED_METRICS = [
  { label: "GPU 利用率", value: "98%", trend: "↑", status: "danger" as const },
  { label: "显存使用", value: "76.2 GB / 80 GB", trend: "↑", status: "warning" as const },
  { label: "推理延迟", value: "2,450ms", trend: "↑", status: "danger" as const },
  { label: "温度", value: "82°C", trend: "→", status: "warning" as const },
  { label: "任务队列", value: "23 / 50", trend: "→", status: "normal" as const },
  { label: "网络 I/O", value: "1.2 Gbps", trend: "↓", status: "normal" as const },
];

export function FollowUpDrawer({
  item,
  isOpen,
  onClose,
  onQuickFix,
  onMarkResolved,
  isMobile = false,
}: FollowUpDrawerProps) {
  const [activeTab, setActiveTab] = useState<"detail" | "chain" | "metrics" | "ai">("detail");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset tab on new item
  useEffect(() => {
    if (item) {
      setActiveTab("detail");
      setAiSuggestions([]);
    }
  }, [item?.id]);

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  const loadAiSuggestions = async () => {
    setAiLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setAiSuggestions(AI_SUGGESTIONS);
    setAiLoading(false);
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!item) return null;

  const sev = severityConfig[item.severity];
  const SevIcon = sev.icon;
  const st = statusLabels[item.status];

  const tabs = [
    { key: "detail" as const,  label: "详情" },
    { key: "chain" as const,   label: `链路 (${item.chain.length})` },
    { key: "metrics" as const, label: "指标" },
    { key: "ai" as const,      label: "AI 建议" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          fixed top-0 right-0 h-full z-[71]
          bg-[rgba(6,14,31,0.98)] backdrop-blur-2xl
          border-l border-[rgba(0,180,255,0.15)]
          shadow-[-20px_0_60px_rgba(0,0,0,0.4)]
          transition-transform duration-300 ease-out
          flex flex-col overflow-hidden
          ${isMobile ? "w-full" : "w-[520px] max-w-full"}
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* ======== Header ======== */}
        <div className="shrink-0 p-4 border-b border-[rgba(0,180,255,0.1)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${sev.color}15` }}
              >
                <SevIcon className="w-5 h-5" style={{ color: sev.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ fontSize: "0.62rem", backgroundColor: `${sev.color}15`, color: sev.color }}
                  >
                    {sev.label}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ fontSize: "0.62rem", backgroundColor: `${st.color}15`, color: st.color }}
                  >
                    {st.label}
                  </span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                    #{item.id}
                  </span>
                </div>
                <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>
                  {item.title}
                </h3>
                {item.metric && (
                  <p className="mt-0.5" style={{ fontSize: "0.78rem", color: sev.color }}>
                    {item.metric}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(255,51,102,0.08)] transition-all shrink-0"
            >
              <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
              <Clock className="w-3.5 h-3.5" />
              {new Date(item.timestamp).toLocaleString("zh-CN")}
            </span>
            <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
              <Server className="w-3.5 h-3.5" />
              {item.source}
            </span>
            {item.assignee && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
                <User className="w-3.5 h-3.5" />
                {item.assignee}
              </span>
            )}
          </div>
        </div>

        {/* ======== Tab Bar ======== */}
        <div className="shrink-0 flex items-center gap-0.5 px-4 py-2 border-b border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.1)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "ai" && aiSuggestions.length === 0) loadAiSuggestions();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent"
              }`}
              style={{ fontSize: "0.72rem" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ======== Content ======== */}
        <div className="flex-1 overflow-auto p-4 space-y-4">

          {/* === Detail Tab === */}
          {activeTab === "detail" && (
            <>
              {/* Quick Actions */}
              <div>
                <h4 className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.75rem" }}>
                  快速操作
                </h4>
                <QuickActionGroup
                  onViewDetail={() => setActiveTab("chain")}
                  onViewHistory={() => setActiveTab("metrics")}
                  onViewRelated={() => setActiveTab("chain")}
                  onQuickFix={onQuickFix ? () => onQuickFix(item) : undefined}
                  onMarkResolved={onMarkResolved ? () => onMarkResolved(item) : undefined}
                />
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <h4 className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.75rem" }}>
                    标签
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.4)] text-[rgba(0,212,255,0.5)] border border-[rgba(0,180,255,0.08)]"
                        style={{ fontSize: "0.68rem" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chain Preview */}
              {item.chain.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>
                      操作链路摘要
                    </h4>
                    <button
                      onClick={() => setActiveTab("chain")}
                      className="flex items-center gap-1 text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-colors"
                      style={{ fontSize: "0.68rem" }}
                    >
                      查看全部 <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <OperationChain events={item.chain.slice(0, 3)} compact />
                </div>
              )}

              {/* Related alerts */}
              {item.relatedAlerts && item.relatedAlerts.length > 0 && (
                <div>
                  <h4 className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.75rem" }}>
                    关联告警
                  </h4>
                  <div className="space-y-1.5">
                    {item.relatedAlerts.map((alertId) => (
                      <div
                        key={alertId}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all cursor-pointer"
                      >
                        <Link2 className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
                        <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>
                          {alertId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* === Chain Tab === */}
          {activeTab === "chain" && (
            <div>
              <h4 className="text-[rgba(0,212,255,0.5)] mb-4" style={{ fontSize: "0.78rem" }}>
                完整操作链路 · {item.chain.length} 步
              </h4>
              <OperationChain events={item.chain} />
            </div>
          )}

          {/* === Metrics Tab === */}
          {activeTab === "metrics" && (
            <div>
              <h4 className="text-[rgba(0,212,255,0.5)] mb-4" style={{ fontSize: "0.78rem" }}>
                关联指标 · {item.source}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {RELATED_METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                        {m.label}
                      </span>
                      <span
                        className={
                          m.status === "danger"
                            ? "text-[#ff3366]"
                            : m.status === "warning"
                            ? "text-[#ffaa00]"
                            : "text-[#00ff88]"
                        }
                        style={{ fontSize: "0.65rem" }}
                      >
                        {m.trend}
                      </span>
                    </div>
                    <span
                      className="text-[#e0f0ff]"
                      style={{ fontSize: "0.82rem", fontFamily: "'Rajdhani', monospace" }}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === AI Tab === */}
          {activeTab === "ai" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-[#aa55ff]" />
                <h4 className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.78rem" }}>
                  AI 智能建议
                </h4>
              </div>

              {/* Context */}
              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] mb-4">
                <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                  检测到异常模式
                </p>
                <p className="text-[#e0f0ff] mt-1" style={{ fontSize: "0.78rem" }}>
                  {item.source} 在过去 1 小时内连续 3 次{item.severity === "critical" ? "严重" : ""}延迟异常
                </p>
              </div>

              {/* Suggestions */}
              {aiLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
                  <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.78rem" }}>
                    AI 正在分析...
                  </span>
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
                    推荐操作
                  </p>
                  {aiSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="group p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)] transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#00ff88] mt-0.5 shrink-0" />
                        <p className="text-[#c0dcf0] flex-1" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
                          {s}
                        </p>
                        <button
                          onClick={() => copyText(s, i)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[rgba(0,212,255,0.1)] transition-all shrink-0"
                        >
                          {copiedIdx === i ? (
                            <Check className="w-3 h-3 text-[#00ff88]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => onQuickFix?.(item)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      应用建议
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      忽略
                    </button>
                    <button
                      onClick={() => setActiveTab("detail")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                      style={{ fontSize: "0.75rem" }}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadAiSuggestions}
                  className="w-full py-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,180,255,0.25)] transition-all"
                  style={{ fontSize: "0.78rem" }}
                >
                  <Bot className="w-4 h-4 inline mr-2" />
                  获取 AI 建议
                </button>
              )}
            </div>
          )}
        </div>

        {/* ======== Footer ======== */}
        <div className="shrink-0 p-3 border-t border-[rgba(0,180,255,0.08)] flex items-center justify-between">
          <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.62rem" }}>
            CP-IM Follow-up System v1.0
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}