/**
 * AlertRulesPanel.tsx
 * ====================
 * 智能告警规则配置面板
 * 自定义阈值 · 告警聚合去重 · 升级机制
 * 赛博朋克风格 #060e1f + #00d4ff
 */

import React, { useState } from "react";
import {
  Bell, BellRing, Plus, Trash2, ToggleLeft, ToggleRight,
  AlertTriangle, ShieldAlert, Info, ChevronRight,
  CheckCircle2, XCircle, Clock, TrendingUp,
  Filter, Zap, Settings, ArrowUpRight, Pencil, Wifi,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { useAlertRules } from "../hooks/useAlertRules";
import type { AlertSeverity, AlertRule, AlertEvent } from "../types";
import { useWebSocketData } from "../hooks/useWebSocketData";
import { CreateRuleModal } from "./CreateRuleModal";

// ============================================================
// Helpers
// ============================================================

function severityColor(s: AlertSeverity): string {
  if (s === "critical") return "#ff3366";
  if (s === "error") return "#ff3366";
  if (s === "warning") return "#ffaa00";
  return "#00d4ff";
}

function severityIcon(s: AlertSeverity) {
  if (s === "critical") return <ShieldAlert className="w-4 h-4" style={{ color: "#ff3366" }} />;
  if (s === "error") return <ShieldAlert className="w-4 h-4" style={{ color: "#ff3366" }} />;
  if (s === "warning") return <AlertTriangle className="w-4 h-4" style={{ color: "#ffaa00" }} />;
  return <Info className="w-4 h-4" style={{ color: "#00d4ff" }} />;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ============================================================
// Sub Components
// ============================================================

function StatsBar({ stats, t }: { stats: ReturnType<typeof useAlertRules>["stats"]; t: (k: string, v?: Record<string, string | number>) => string }) {
  const items = [
    { label: t("alerts.totalRules"), value: stats.totalRules, color: "#00d4ff", icon: Bell },
    { label: t("alerts.activeRules"), value: stats.activeRules, color: "#00ff88", icon: Zap },
    { label: t("alerts.unresolvedEvents"), value: stats.unresolvedEvents, color: "#ffaa00", icon: AlertTriangle },
    { label: t("alerts.criticalEvents"), value: stats.criticalEvents, color: "#ff3366", icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <GlassCard key={item.label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
              <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.68rem" }}>{item.label}</span>
            </div>
            <div style={{ fontSize: "1.3rem", color: item.color, fontFamily: "'Orbitron', sans-serif" }}>
              {item.value}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
  onSelect,
  onEdit,
  t,
}: {
  rule: AlertRule;
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onEdit: () => void;
  t: (k: string) => string;
}) {
  return (
    <GlassCard
      className="p-4 cursor-pointer"
      onClick={onSelect}
      glowColor={rule.enabled ? `${severityColor(rule.severity)}15` : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {severityIcon(rule.severity)}
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{rule.name}</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all"
            title={t("alerts.editRule")}
            data-testid={`edit-rule-${rule.id}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="transition-all"
            title={rule.enabled ? t("alerts.disable") : t("alerts.enable")}
          >
            {rule.enabled ? (
              <ToggleRight className="w-5 h-5" style={{ color: "#00ff88" }} />
            ) : (
              <ToggleLeft className="w-5 h-5" style={{ color: "rgba(0,212,255,0.3)" }} />
            )}
          </button>
          <button
            onClick={onDelete}
            className="text-[rgba(255,51,102,0.4)] hover:text-[#ff3366] transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thresholds */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {rule.thresholds.map((th, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded"
            style={{
              fontSize: "0.65rem",
              background: "rgba(0,212,255,0.08)",
              color: "rgba(0,212,255,0.7)",
              border: "1px solid rgba(0,212,255,0.15)",
            }}
          >
            {th.metric} {th.condition} {th.value}{th.unit}
            {th.duration > 0 && ` ×${th.duration}s`}
          </span>
        ))}
      </div>

      {/* Features */}
      <div className="flex items-center gap-3 mb-2" style={{ fontSize: "0.62rem" }}>
        {rule.aggregation.enabled && (
          <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]">
            <Filter className="w-3 h-3" /> {t("alerts.aggregation")}
          </span>
        )}
        {rule.deduplication.enabled && (
          <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]">
            <Clock className="w-3 h-3" /> {t("alerts.dedup")} {rule.deduplication.cooldownMinutes}m
          </span>
        )}
        <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]">
          <ArrowUpRight className="w-3 h-3" /> L{rule.escalation.length}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(0,180,255,0.08)]" style={{ fontSize: "0.62rem" }}>
        <span className="text-[rgba(0,212,255,0.3)]">
          {rule.targets.length} {t("alerts.nodes")} · {rule.triggerCount} {t("alerts.triggers")}
        </span>
        {rule.lastTriggered && (
          <span className="text-[rgba(224,240,255,0.3)]">
            {t("alerts.lastTriggered")}: {timeAgo(rule.lastTriggered)}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function EventRow({ event, onAck, onResolve, t }: { event: AlertEvent; onAck: () => void; onResolve: () => void; t: (k: string) => string }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border transition-all"
      style={{
        background: event.resolved ? "rgba(0,255,136,0.03)" : event.severity === "critical" ? "rgba(255,51,102,0.05)" : "rgba(255,170,0,0.03)",
        borderColor: event.resolved ? "rgba(0,255,136,0.1)" : `${severityColor(event.severity)}20`,
      }}
    >
      <div className="shrink-0">
        {event.resolved ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: "#00ff88" }} />
        ) : (
          severityIcon(event.severity)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.78rem" }}>{event.message}</span>
          <span
            className="shrink-0 px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.55rem",
              background: `${severityColor(event.severity)}15`,
              color: severityColor(event.severity),
            }}
          >
            L{event.escalationLevel}
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: "0.62rem" }}>
          <span className="text-[rgba(0,212,255,0.4)]">{event.nodeId}</span>
          <span className="text-[rgba(224,240,255,0.3)]">{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      {!event.resolved && (
        <div className="flex items-center gap-1.5 shrink-0">
          {!event.acknowledged && (
            <button
              onClick={onAck}
              className="px-2 py-1 rounded border border-[rgba(0,180,255,0.2)] bg-[rgba(0,180,255,0.05)] text-[#00d4ff] hover:bg-[rgba(0,180,255,0.1)] transition-all"
              style={{ fontSize: "0.62rem" }}
            >
              {t("alerts.acknowledge")}
            </button>
          )}
          <button
            onClick={onResolve}
            className="px-2 py-1 rounded border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-all"
            style={{ fontSize: "0.62rem" }}
          >
            {t("alerts.resolve")}
          </button>
        </div>
      )}
    </div>
  );
}

function RuleDetailDrawer({ rule, onClose, t }: { rule: AlertRule; onClose: () => void; t: (k: string) => string }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {severityIcon(rule.severity)}
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>{rule.name}</span>
        </div>
        <button onClick={onClose} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Thresholds */}
      <div className="mb-4">
        <div className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.72rem" }}>{t("alerts.thresholds")}</div>
        {rule.thresholds.map((th, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.75rem" }}>
            <TrendingUp className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]">{th.metric}</span>
            <span className="text-[rgba(0,212,255,0.5)]">{th.condition}</span>
            <span className="text-[#00d4ff]" style={{ fontFamily: "'Orbitron', sans-serif" }}>{th.value}{th.unit}</span>
            {th.duration > 0 && (
              <span className="text-[rgba(224,240,255,0.4)]">持续 {th.duration}s</span>
            )}
          </div>
        ))}
      </div>

      {/* Aggregation & Dedup */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,180,255,0.03)] p-3">
          <div className="text-[rgba(0,212,255,0.5)] mb-1.5" style={{ fontSize: "0.68rem" }}>{t("alerts.aggregation")}</div>
          {rule.aggregation.enabled ? (
            <div style={{ fontSize: "0.72rem" }}>
              <div className="text-[#e0f0ff]">{t("alerts.window")}: {rule.aggregation.windowMinutes}m</div>
              <div className="text-[rgba(224,240,255,0.5)]">{t("alerts.maxGroup")}: {rule.aggregation.maxGroupSize}</div>
            </div>
          ) : (
            <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.72rem" }}>{t("alerts.disabled")}</span>
          )}
        </div>
        <div className="rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,180,255,0.03)] p-3">
          <div className="text-[rgba(0,212,255,0.5)] mb-1.5" style={{ fontSize: "0.68rem" }}>{t("alerts.dedup")}</div>
          {rule.deduplication.enabled ? (
            <div className="text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
              {t("alerts.cooldown")}: {rule.deduplication.cooldownMinutes}m
            </div>
          ) : (
            <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.72rem" }}>{t("alerts.disabled")}</span>
          )}
        </div>
      </div>

      {/* Escalation */}
      <div className="mb-4">
        <div className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.72rem" }}>{t("alerts.escalationPolicy")}</div>
        <div className="space-y-2">
          {rule.escalation.map((esc) => (
            <div
              key={esc.level}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-[rgba(0,180,255,0.08)] bg-[rgba(0,180,255,0.02)]"
              style={{ fontSize: "0.72rem" }}
            >
              <div
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: esc.level === 3 ? "rgba(255,51,102,0.15)" : esc.level === 2 ? "rgba(255,170,0,0.15)" : "rgba(0,212,255,0.15)",
                  color: esc.level === 3 ? "#ff3366" : esc.level === 2 ? "#ffaa00" : "#00d4ff",
                  fontSize: "0.65rem",
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                L{esc.level}
              </div>
              <div className="flex-1">
                <div className="text-[#e0f0ff]">{t("alerts.delay")}: {esc.delayMinutes}m</div>
                <div className="text-[rgba(224,240,255,0.5)]">
                  {t("alerts.channels")}: {esc.notifyChannels.join(", ")}
                </div>
                {esc.autoAction && (
                  <div className="text-[rgba(0,212,255,0.5)] mt-0.5">
                    {t("alerts.autoAction")}: <span className="font-mono text-[#00ff88]">{esc.autoAction}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Targets */}
      <div>
        <div className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.72rem" }}>{t("alerts.targetNodes")}</div>
        <div className="flex flex-wrap gap-1.5">
          {rule.targets.map((t2) => (
            <span
              key={t2}
              className="px-2 py-1 rounded font-mono"
              style={{
                fontSize: "0.65rem",
                background: "rgba(0,212,255,0.08)",
                color: "rgba(0,212,255,0.7)",
                border: "1px solid rgba(0,212,255,0.12)",
              }}
            >
              {t2}
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================
// Main Component
// ============================================================

export function AlertRulesPanel() {
  const { t } = useI18n();
  const wsData = useWebSocketData();
  const state = useAlertRules({
    liveNodes: wsData.nodes,
    liveLatency: wsData.liveLatency,
  });
  const {
    rules, events, stats, selectedRule, setSelectedRule,
    filterSeverity, setFilterSeverity,
    toggleRule, deleteRule, acknowledgeEvent, resolveEvent,
    createRule, updateRule,
    isCreating, setIsCreating,
    editingRule, setEditingRule,
  } = state;
  const [viewMode, setViewMode] = useState<"rules" | "events">("rules");

  // Handle edit submit: delegates to updateRule or createRule
  const handleModalSubmit = React.useCallback((ruleData: Parameters<typeof createRule>[0]) => {
    if (editingRule) {
      updateRule(editingRule.id, ruleData);
    } else {
      createRule(ruleData);
    }
    setEditingRule(null);
    setIsCreating(false);
  }, [editingRule, updateRule, createRule, setEditingRule, setIsCreating]);

  const handleModalClose = React.useCallback(() => {
    setIsCreating(false);
    setEditingRule(null);
  }, [setIsCreating, setEditingRule]);

  const handleEditRule = React.useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    setIsCreating(true);
  }, [setEditingRule, setIsCreating]);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Create/Edit Rule Modal */}
      <CreateRuleModal
        open={isCreating}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        editRule={editingRule}
      />

      {/* WebSocket Status Indicator */}
      <div className="flex items-center gap-2" style={{ fontSize: "0.6rem" }}>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: wsData.connectionState === "connected" ? "#00ff88" : wsData.connectionState === "simulated" ? "#ffaa00" : "#ff3366",
            boxShadow: `0 0 6px ${wsData.connectionState === "connected" ? "#00ff88" : wsData.connectionState === "simulated" ? "#ffaa00" : "#ff3366"}`,
          }}
        />
        <span className="text-[rgba(0,212,255,0.4)]">
          <Wifi className="w-3 h-3 inline mr-1" />
          {wsData.connectionState === "connected" ? "WebSocket Connected" : wsData.connectionState === "simulated" ? "Simulated Data" : "Disconnected"}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#00d4ff] flex items-center gap-2" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            <BellRing className="w-5 h-5" />
            {t("alerts.title")}
          </h1>
          <p className="text-[rgba(0,212,255,0.4)] mt-1" style={{ fontSize: "0.72rem" }}>
            {t("alerts.subtitle")}
          </p>
        </div>
        <button
          onClick={() => { setEditingRule(null); setIsCreating(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.1)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
          style={{ fontSize: "0.75rem" }}
          data-testid="create-rule-btn"
        >
          <Plus className="w-4 h-4" />
          {t("alerts.createRule")}
        </button>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} t={t} />

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-[rgba(0,180,255,0.05)] border border-[rgba(0,180,255,0.1)]">
          {(["rules", "events"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-4 py-1.5 rounded-md transition-all"
              style={{
                fontSize: "0.72rem",
                background: viewMode === mode ? "rgba(0,212,255,0.1)" : "transparent",
                color: viewMode === mode ? "#00d4ff" : "rgba(0,212,255,0.4)",
              }}
            >
              {mode === "rules" ? t("alerts.rulesTab") : t("alerts.eventsTab")}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex gap-1 ml-auto">
          {(["all", "critical", "error", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className="px-2.5 py-1 rounded transition-all"
              style={{
                fontSize: "0.62rem",
                background: filterSeverity === sev ? "rgba(0,212,255,0.1)" : "transparent",
                color: filterSeverity === sev ? "#00d4ff" : "rgba(0,212,255,0.3)",
                border: `1px solid ${filterSeverity === sev ? "rgba(0,212,255,0.2)" : "transparent"}`,
              }}
            >
              {sev === "all" ? t("alerts.filterAll") : t(`alerts.severity${sev.charAt(0).toUpperCase() + sev.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === "rules" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rules List */}
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onDelete={() => deleteRule(rule.id)}
                onSelect={() => setSelectedRule(rule)}
                onEdit={() => handleEditRule(rule)}
                t={t}
              />
            ))}
            {rules.length === 0 && (
              <div className="text-center py-12 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
                {t("alerts.noRules")}
              </div>
            )}
          </div>

          {/* Rule Detail */}
          <div>
            {selectedRule ? (
              <RuleDetailDrawer rule={selectedRule} onClose={() => setSelectedRule(null)} t={t} />
            ) : (
              <GlassCard className="p-8 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="w-8 h-8 text-[rgba(0,212,255,0.15)] mx-auto mb-3" />
                  <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
                    {t("alerts.selectRuleHint")}
                  </p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onAck={() => acknowledgeEvent(event.id)}
              onResolve={() => resolveEvent(event.id)}
              t={t}
            />
          ))}
          {events.length === 0 && (
            <div className="text-center py-12 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
              {t("alerts.noEvents")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}