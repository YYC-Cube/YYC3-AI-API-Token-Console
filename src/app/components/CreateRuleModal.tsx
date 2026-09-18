/**
 * CreateRuleModal.tsx
 * ====================
 * 完整的新建告警规则表单 Modal
 * 赛博朋克风格 #060e1f + #00d4ff
 */

import {
  AlertTriangle,
  Info,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import type {
  AlertCondition,
  AlertMetric,
  AlertRule,
  AlertSeverity,
  AlertThreshold,
  EscalationLevel,
  EscalationPolicy,
} from "../types";

// ============================================================
// Available Options
// ============================================================

const METRICS: { value: AlertMetric; label: string }[] = [
  { value: "cpu", label: "CPU" },
  { value: "gpu", label: "GPU" },
  { value: "memory", label: "Memory" },
  { value: "latency", label: "Latency" },
  { value: "disk", label: "Disk" },
  { value: "network", label: "Network" },
  { value: "error_rate", label: "Error Rate" },
  { value: "throughput", label: "Throughput" },
];

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: ">=" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
];

const SEVERITIES: { value: AlertSeverity; color: string; icon: React.ElementType }[] = [
  { value: "critical", color: "#ff3366", icon: ShieldAlert },
  { value: "error", color: "#ff6b35", icon: AlertTriangle },
  { value: "warning", color: "#ffaa00", icon: AlertTriangle },
  { value: "info", color: "#00d4ff", icon: Info },
];

const AVAILABLE_NODES = [
  "GPU-A100-01", "GPU-A100-02", "GPU-A100-03", "GPU-A100-04", "GPU-A100-05",
  "GPU-H100-01", "GPU-H100-02", "GPU-H100-03",
  "TPU-v4-01", "TPU-v4-02",
  "NAS-01", "NAS-02",
];

const CHANNEL_OPTIONS = ["dashboard", "email", "sms", "webhook", "slack"];

// ============================================================
// Types
// ============================================================

interface CreateRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rule: {
    name: string;
    enabled: boolean;
    severity: AlertSeverity;
    thresholds: AlertThreshold[];
    aggregation: { enabled: boolean; windowMinutes: number; maxGroupSize: number };
    deduplication: { enabled: boolean; cooldownMinutes: number };
    escalation: EscalationPolicy[];
    targets: string[];
  }) => void;
  /** When provided, modal switches to "edit" mode with pre-filled values */
  editRule?: AlertRule | null;
}

// ============================================================
// Component
// ============================================================

export function CreateRuleModal({ open, onClose, onSubmit, editRule }: CreateRuleModalProps) {
  const { t } = useI18n();

  // Form state
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("warning");
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([
    { metric: "gpu", condition: "gt", value: 90, unit: "%", duration: 60 },
  ]);
  const [aggEnabled, setAggEnabled] = useState(true);
  const [aggWindow, setAggWindow] = useState(5);
  const [aggMaxGroup, setAggMaxGroup] = useState(10);
  const [dedupEnabled, setDedupEnabled] = useState(true);
  const [dedupCooldown, setDedupCooldown] = useState(15);
  const [escalation, setEscalation] = useState<EscalationPolicy[]>([
    { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] },
  ]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>(["GPU-A100-01"]);
  const [error, setError] = useState("");

  // ── Backfill form when editing ──
  const prevEditIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const editId = editRule?.id ?? null;
    if (editId && editId !== prevEditIdRef.current) {
      prevEditIdRef.current = editId;
      setName(editRule!.name);
      setSeverity(editRule!.severity);
      setThresholds([...editRule!.thresholds]);
      setAggEnabled(editRule!.aggregation.enabled);
      setAggWindow(editRule!.aggregation.windowMinutes);
      setAggMaxGroup(editRule!.aggregation.maxGroupSize);
      setDedupEnabled(editRule!.deduplication.enabled);
      setDedupCooldown(editRule!.deduplication.cooldownMinutes);
      setEscalation([...editRule!.escalation]);
      setSelectedNodes([...editRule!.targets]);
      setError("");
    } else if (!editId) {
      prevEditIdRef.current = null;
    }
  }, [editRule]);

  // Threshold management
  const addThreshold = useCallback(() => {
    setThresholds((prev) => [
      ...prev,
      { metric: "cpu", condition: "gt", value: 80, unit: "%", duration: 0 },
    ]);
  }, []);

  const removeThreshold = useCallback((index: number) => {
    setThresholds((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateThreshold = useCallback((index: number, field: keyof AlertThreshold, value: any) => {
    setThresholds((prev) =>
      prev.map((th, i) => (i === index ? { ...th, [field]: value } : th))
    );
  }, []);

  // Escalation management
  const addEscalation = useCallback(() => {
    setEscalation((prev) => {
      if (prev.length >= 3) return prev;
      const nextLevel = (prev.length + 1) as EscalationLevel;
      return [...prev, { level: nextLevel, delayMinutes: nextLevel * 10, notifyChannels: ["dashboard"] }];
    });
  }, []);

  const removeEscalation = useCallback((index: number) => {
    setEscalation((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateEscalation = useCallback((index: number, field: string, value: any) => {
    setEscalation((prev) =>
      prev.map((esc, i) => (i === index ? { ...esc, [field]: value } : esc))
    );
  }, []);

  const toggleChannel = useCallback((escIndex: number, channel: string) => {
    setEscalation((prev) =>
      prev.map((esc, i) => {
        if (i !== escIndex) return esc;
        const channels = esc.notifyChannels.includes(channel)
          ? esc.notifyChannels.filter((c: string) => c !== channel)
          : [...esc.notifyChannels, channel];
        return { ...esc, notifyChannels: channels.length > 0 ? channels : ["dashboard"] };
      })
    );
  }, []);

  // Node selection
  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId)
        ? prev.filter((n) => n !== nodeId)
        : [...prev, nodeId]
    );
  }, []);

  // Submit
  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError(t("alerts.formRequired"));
      return;
    }
    if (thresholds.length === 0) {
      setError(t("alerts.formRequired"));
      return;
    }
    if (selectedNodes.length === 0) {
      setError(t("alerts.formRequired"));
      return;
    }
    setError("");
    onSubmit({
      name: name.trim(),
      enabled: editRule ? editRule.enabled : true,
      severity,
      thresholds,
      aggregation: { enabled: aggEnabled, windowMinutes: aggWindow, maxGroupSize: aggMaxGroup },
      deduplication: { enabled: dedupEnabled, cooldownMinutes: dedupCooldown },
      escalation,
      targets: selectedNodes,
    });
    // Reset only if creating (not editing)
    if (!editRule) {
      setName("");
      setSeverity("warning");
      setThresholds([{ metric: "gpu", condition: "gt", value: 90, unit: "%", duration: 60 }]);
      setAggEnabled(true);
      setAggWindow(5);
      setAggMaxGroup(10);
      setDedupEnabled(true);
      setDedupCooldown(15);
      setEscalation([{ level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] }]);
      setSelectedNodes(["GPU-A100-01"]);
    }
  }, [name, severity, thresholds, aggEnabled, aggWindow, aggMaxGroup, dedupEnabled, dedupCooldown, escalation, selectedNodes, onSubmit, t, editRule]);

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    background: "rgba(0,180,255,0.05)",
    border: "1px solid rgba(0,180,255,0.15)",
    borderRadius: 6,
    color: "#e0f0ff",
    padding: "6px 10px",
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem",
    color: "rgba(0,212,255,0.5)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      data-testid="create-rule-modal-overlay"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{
          background: "rgba(8,25,55,0.95)",
          borderColor: "rgba(0,180,255,0.2)",
          boxShadow: "0 0 60px rgba(0,180,255,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="create-rule-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(0,180,255,0.1)]">
          <h2 className="text-[#00d4ff]" style={{ fontSize: "0.95rem", fontFamily: "'Orbitron', sans-serif" }}>
            {editRule ? t("alerts.editRuleTitle") : t("alerts.createRuleTitle")}
          </h2>
          <button onClick={onClose} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg border border-[rgba(255,51,102,0.3)] bg-[rgba(255,51,102,0.08)] text-[#ff3366]" style={{ fontSize: "0.72rem" }}>
              {error}
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label style={labelStyle}>{t("alerts.ruleName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("alerts.ruleNamePlaceholder")}
              style={inputStyle}
              data-testid="rule-name-input"
            />
          </div>

          {/* Severity */}
          <div>
            <label style={labelStyle}>{t("alerts.severity")}</label>
            <div className="flex gap-2">
              {SEVERITIES.map(({ value, color, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSeverity(value)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all"
                  style={{
                    fontSize: "0.72rem",
                    borderColor: severity === value ? `${color}50` : "rgba(0,180,255,0.1)",
                    background: severity === value ? `${color}12` : "transparent",
                    color: severity === value ? color : "rgba(224,240,255,0.5)",
                  }}
                  data-testid={`severity-${value}`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: severity === value ? color : "rgba(0,212,255,0.3)" }} />
                  {t(`alerts.severity${value.charAt(0).toUpperCase() + value.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Thresholds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ ...labelStyle, marginBottom: 0 }}>{t("alerts.thresholds")}</label>
              <button
                onClick={addThreshold}
                className="flex items-center gap-1 text-[#00d4ff] hover:text-[#00e8ff] transition-colors"
                style={{ fontSize: "0.62rem" }}
                data-testid="add-threshold-btn"
              >
                <Plus className="w-3 h-3" /> {t("alerts.addThreshold")}
              </button>
            </div>
            <div className="space-y-2">
              {thresholds.map((th, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-[rgba(0,180,255,0.08)] bg-[rgba(0,180,255,0.02)]">
                  <select
                    value={th.metric}
                    onChange={(e) => updateThreshold(i, "metric", e.target.value)}
                    style={{ ...inputStyle, width: "auto", flex: "1" }}
                    data-testid={`threshold-metric-${i}`}
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value} style={{ background: "#060e1f" }}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={th.condition}
                    onChange={(e) => updateThreshold(i, "condition", e.target.value)}
                    style={{ ...inputStyle, width: "60px" }}
                    data-testid={`threshold-condition-${i}`}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value} style={{ background: "#060e1f" }}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={th.value}
                    onChange={(e) => updateThreshold(i, "value", Number(e.target.value))}
                    style={{ ...inputStyle, width: "70px" }}
                    data-testid={`threshold-value-${i}`}
                  />
                  <input
                    type="text"
                    value={th.unit}
                    onChange={(e) => updateThreshold(i, "unit", e.target.value)}
                    placeholder={t("alerts.unit")}
                    style={{ ...inputStyle, width: "50px" }}
                  />
                  <input
                    type="number"
                    value={th.duration}
                    onChange={(e) => updateThreshold(i, "duration", Number(e.target.value))}
                    placeholder="0"
                    style={{ ...inputStyle, width: "60px" }}
                    title={t("alerts.duration")}
                  />
                  {thresholds.length > 1 && (
                    <button
                      onClick={() => removeThreshold(i)}
                      className="text-[rgba(255,51,102,0.4)] hover:text-[#ff3366] transition-colors shrink-0"
                      data-testid={`remove-threshold-${i}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Aggregation & Dedup */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,180,255,0.02)]">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aggEnabled}
                  onChange={(e) => setAggEnabled(e.target.checked)}
                  className="accent-[#00d4ff]"
                  data-testid="agg-toggle"
                />
                <span style={{ fontSize: "0.72rem", color: "#e0f0ff" }}>{t("alerts.enableAggregation")}</span>
              </label>
              {aggEnabled && (
                <div className="space-y-2">
                  <div>
                    <label style={labelStyle}>{t("alerts.aggregationWindow")}</label>
                    <input
                      type="number"
                      value={aggWindow}
                      onChange={(e) => setAggWindow(Number(e.target.value))}
                      style={inputStyle}
                      data-testid="agg-window-input"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("alerts.aggregationMaxGroup")}</label>
                    <input
                      type="number"
                      value={aggMaxGroup}
                      onChange={(e) => setAggMaxGroup(Number(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,180,255,0.02)]">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dedupEnabled}
                  onChange={(e) => setDedupEnabled(e.target.checked)}
                  className="accent-[#00d4ff]"
                  data-testid="dedup-toggle"
                />
                <span style={{ fontSize: "0.72rem", color: "#e0f0ff" }}>{t("alerts.enableDedup")}</span>
              </label>
              {dedupEnabled && (
                <div>
                  <label style={labelStyle}>{t("alerts.dedupCooldown")}</label>
                  <input
                    type="number"
                    value={dedupCooldown}
                    onChange={(e) => setDedupCooldown(Number(e.target.value))}
                    style={inputStyle}
                    data-testid="dedup-cooldown-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Escalation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ ...labelStyle, marginBottom: 0 }}>{t("alerts.escalationLevels")}</label>
              {escalation.length < 3 && (
                <button
                  onClick={addEscalation}
                  className="flex items-center gap-1 text-[#00d4ff] hover:text-[#00e8ff] transition-colors"
                  style={{ fontSize: "0.62rem" }}
                  data-testid="add-escalation-btn"
                >
                  <Plus className="w-3 h-3" /> {t("alerts.addEscalation")}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {escalation.map((esc, i) => (
                <div key={i} className="p-3 rounded-lg border border-[rgba(0,180,255,0.08)] bg-[rgba(0,180,255,0.02)]">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: "0.62rem",
                        fontFamily: "'Orbitron', sans-serif",
                        background: esc.level === 3 ? "rgba(255,51,102,0.15)" : esc.level === 2 ? "rgba(255,170,0,0.15)" : "rgba(0,212,255,0.15)",
                        color: esc.level === 3 ? "#ff3366" : esc.level === 2 ? "#ffaa00" : "#00d4ff",
                      }}
                    >
                      L{esc.level}
                    </span>
                    {escalation.length > 1 && (
                      <button
                        onClick={() => removeEscalation(i)}
                        className="text-[rgba(255,51,102,0.4)] hover:text-[#ff3366] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label style={labelStyle}>{t("alerts.delay")} (min)</label>
                      <input
                        type="number"
                        value={esc.delayMinutes}
                        onChange={(e) => updateEscalation(i, "delayMinutes", Number(e.target.value))}
                        style={inputStyle}
                        data-testid={`escalation-delay-${i}`}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("alerts.autoActionLabel")}</label>
                      <input
                        type="text"
                        value={esc.autoAction || ""}
                        onChange={(e) => updateEscalation(i, "autoAction", e.target.value || undefined)}
                        style={inputStyle}
                        placeholder="e.g. auto_scale"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>{t("alerts.notifyChannels")}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CHANNEL_OPTIONS.map((ch) => (
                        <button
                          key={ch}
                          onClick={() => toggleChannel(i, ch)}
                          className="px-2 py-1 rounded transition-all"
                          style={{
                            fontSize: "0.62rem",
                            border: `1px solid ${esc.notifyChannels.includes(ch) ? "rgba(0,212,255,0.3)" : "rgba(0,180,255,0.1)"}`,
                            background: esc.notifyChannels.includes(ch) ? "rgba(0,212,255,0.1)" : "transparent",
                            color: esc.notifyChannels.includes(ch) ? "#00d4ff" : "rgba(224,240,255,0.4)",
                          }}
                          data-testid={`channel-${ch}-${i}`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Nodes */}
          <div>
            <label style={labelStyle}>{t("alerts.selectNodes")}</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_NODES.map((node) => (
                <button
                  key={node}
                  onClick={() => toggleNode(node)}
                  className="px-2.5 py-1.5 rounded-lg font-mono transition-all"
                  style={{
                    fontSize: "0.65rem",
                    border: `1px solid ${selectedNodes.includes(node) ? "rgba(0,255,136,0.3)" : "rgba(0,180,255,0.1)"}`,
                    background: selectedNodes.includes(node) ? "rgba(0,255,136,0.08)" : "transparent",
                    color: selectedNodes.includes(node) ? "#00ff88" : "rgba(224,240,255,0.4)",
                  }}
                  data-testid={`node-${node}`}
                >
                  {node}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[rgba(0,180,255,0.1)]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-[rgba(0,180,255,0.2)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,180,255,0.3)] transition-all"
            style={{ fontSize: "0.75rem" }}
            data-testid="cancel-btn"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg border border-[rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.12)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
            style={{ fontSize: "0.75rem" }}
            data-testid="submit-rule-btn"
          >
            {editRule ? t("alerts.saveRule") : t("alerts.createRule")}
          </button>
        </div>
      </div>
    </div>
  );
}
