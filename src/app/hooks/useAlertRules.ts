/**
 * useAlertRules.ts
 * =================
 * Hook for Smart Alert Rules Configuration
 * RF-007: 重构为复用 usePersistedList，获得 BroadcastChannel 跨标签页同步能力
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { usePersistedList } from "./usePersistedState";

// ============================================================
// Types — centralized in types/index.ts
// ============================================================

import type {
  AlertSeverity, AlertMetric, AlertCondition, EscalationLevel,
  AlertThreshold, EscalationPolicy, AlertRule, AlertEvent, AlertRulesOptions,
} from "../types";

// RF-011: Re-export 已移除

// ============================================================
// Mock Data
// ============================================================

const MOCK_RULES: AlertRule[] = [
  {
    id: "rule-001",
    name: "GPU 利用率过高",
    enabled: true,
    severity: "critical",
    thresholds: [
      { metric: "gpu", condition: "gt", value: 95, unit: "%", duration: 300 },
    ],
    aggregation: { enabled: true, windowMinutes: 5, maxGroupSize: 10 },
    deduplication: { enabled: true, cooldownMinutes: 15 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"], autoAction: "auto_scale_check" },
      { level: 2, delayMinutes: 10, notifyChannels: ["dashboard", "email"], autoAction: "auto_scale_up" },
      { level: 3, delayMinutes: 30, notifyChannels: ["dashboard", "email", "sms"], autoAction: "force_rebalance" },
    ],
    targets: ["GPU-A100-01", "GPU-A100-02", "GPU-A100-03"],
    createdAt: Date.now() - 86400000 * 7,
    lastTriggered: Date.now() - 3600000,
    triggerCount: 23,
  },
  {
    id: "rule-002",
    name: "推理延迟异常",
    enabled: true,
    severity: "warning",
    thresholds: [
      { metric: "latency", condition: "gt", value: 2000, unit: "ms", duration: 60 },
    ],
    aggregation: { enabled: true, windowMinutes: 3, maxGroupSize: 5 },
    deduplication: { enabled: true, cooldownMinutes: 10 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] },
      { level: 2, delayMinutes: 15, notifyChannels: ["dashboard", "email"] },
    ],
    targets: ["GPU-A100-01", "GPU-A100-02", "GPU-A100-03", "GPU-A100-04"],
    createdAt: Date.now() - 86400000 * 5,
    lastTriggered: Date.now() - 7200000,
    triggerCount: 45,
  },
  {
    id: "rule-003",
    name: "磁盘空间不足",
    enabled: true,
    severity: "warning",
    thresholds: [
      { metric: "disk", condition: "gt", value: 85, unit: "%", duration: 0 },
    ],
    aggregation: { enabled: false, windowMinutes: 0, maxGroupSize: 0 },
    deduplication: { enabled: true, cooldownMinutes: 60 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] },
    ],
    targets: ["NAS-01", "NAS-02"],
    createdAt: Date.now() - 86400000 * 3,
    lastTriggered: Date.now() - 86400000,
    triggerCount: 8,
  },
  {
    id: "rule-004",
    name: "内存使用率过高",
    enabled: false,
    severity: "critical",
    thresholds: [
      { metric: "memory", condition: "gt", value: 90, unit: "%", duration: 120 },
    ],
    aggregation: { enabled: true, windowMinutes: 5, maxGroupSize: 10 },
    deduplication: { enabled: true, cooldownMinutes: 20 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] },
      { level: 2, delayMinutes: 5, notifyChannels: ["dashboard", "email"], autoAction: "restart_service" },
    ],
    targets: ["GPU-A100-01", "GPU-A100-02"],
    createdAt: Date.now() - 86400000 * 2,
    lastTriggered: null,
    triggerCount: 0,
  },
  {
    id: "rule-005",
    name: "错误率飙升",
    enabled: true,
    severity: "critical",
    thresholds: [
      { metric: "error_rate", condition: "gt", value: 5, unit: "%", duration: 60 },
    ],
    aggregation: { enabled: true, windowMinutes: 10, maxGroupSize: 20 },
    deduplication: { enabled: true, cooldownMinutes: 30 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"], autoAction: "log_capture" },
      { level: 2, delayMinutes: 5, notifyChannels: ["dashboard", "email"], autoAction: "circuit_breaker" },
      { level: 3, delayMinutes: 15, notifyChannels: ["dashboard", "email", "sms"], autoAction: "rollback" },
    ],
    targets: ["GPU-A100-01", "GPU-A100-02", "GPU-A100-03"],
    createdAt: Date.now() - 86400000,
    lastTriggered: Date.now() - 1800000,
    triggerCount: 12,
  },
  {
    id: "rule-006",
    name: "网络延迟异常",
    enabled: true,
    severity: "info",
    thresholds: [
      { metric: "network", condition: "gt", value: 100, unit: "ms", duration: 30 },
    ],
    aggregation: { enabled: false, windowMinutes: 0, maxGroupSize: 0 },
    deduplication: { enabled: true, cooldownMinutes: 5 },
    escalation: [
      { level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] },
    ],
    targets: ["GPU-A100-01", "GPU-A100-02", "GPU-A100-03", "GPU-A100-04", "GPU-A100-05"],
    createdAt: Date.now() - 3600000 * 12,
    lastTriggered: Date.now() - 600000,
    triggerCount: 67,
  },
];

const MOCK_EVENTS: AlertEvent[] = [
  {
    id: "evt-001",
    ruleId: "rule-001",
    ruleName: "GPU 利用率过高",
    severity: "critical",
    message: "GPU-A100-03 利用率达到 98.2%，持续 5 分钟",
    metric: "gpu",
    currentValue: 98.2,
    threshold: 95,
    nodeId: "GPU-A100-03",
    timestamp: Date.now() - 300000,
    acknowledged: false,
    resolved: false,
    escalationLevel: 2,
  },
  {
    id: "evt-002",
    ruleId: "rule-002",
    ruleName: "推理延迟异常",
    severity: "warning",
    message: "GPU-A100-01 推理延迟 2,450ms > 2,000ms",
    metric: "latency",
    currentValue: 2450,
    threshold: 2000,
    nodeId: "GPU-A100-01",
    timestamp: Date.now() - 900000,
    acknowledged: true,
    resolved: false,
    escalationLevel: 1,
  },
  {
    id: "evt-003",
    ruleId: "rule-005",
    ruleName: "错误率飙升",
    severity: "critical",
    message: "GPU-A100-02 错误率达到 7.3%，已触发熔断",
    metric: "error_rate",
    currentValue: 7.3,
    threshold: 5,
    nodeId: "GPU-A100-02",
    timestamp: Date.now() - 1800000,
    acknowledged: true,
    resolved: true,
    escalationLevel: 2,
  },
  {
    id: "evt-004",
    ruleId: "rule-006",
    ruleName: "网络延迟异常",
    severity: "info",
    message: "GPU-A100-04 网络延迟 145ms > 100ms",
    metric: "network",
    currentValue: 145,
    threshold: 100,
    nodeId: "GPU-A100-04",
    timestamp: Date.now() - 600000,
    acknowledged: false,
    resolved: false,
    escalationLevel: 1,
  },
  {
    id: "evt-005",
    ruleId: "rule-003",
    ruleName: "磁盘空间不足",
    severity: "warning",
    message: "NAS-01 磁盘使用率 87.5% > 85%",
    metric: "disk",
    currentValue: 87.5,
    threshold: 85,
    nodeId: "NAS-01",
    timestamp: Date.now() - 3600000,
    acknowledged: true,
    resolved: false,
    escalationLevel: 1,
  },
];

// ============================================================
// Hook
// ============================================================

export function useAlertRules(opts: AlertRulesOptions = {}) {
  // RF-007: 使用 usePersistedList 代替手动 IndexedDB CRUD
  const {
    items: rules,
    upsert: upsertRule,
    remove: removeRule,
    setAll: setAllRules,
    loaded: rulesLoaded,
  } = usePersistedList<AlertRule>("alertRules", MOCK_RULES);

  const {
    items: events,
    setItems: setEvents,
    upsert: upsertEvent,
    loaded: eventsLoaded,
  } = usePersistedList<AlertEvent>("alertEvents", MOCK_EVENTS);

  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const lastPushRef = useRef<number>(0);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  // ── WebSocket live alert evaluation ──
  useEffect(() => {
    if (!opts.liveNodes || opts.liveNodes.length === 0) return;
    const now = Date.now();
    if (now - lastPushRef.current < 10000) return;
    lastPushRef.current = now;

    const enabledRules = rulesRef.current.filter((r) => r.enabled);

    setEvents((prevEvents) => {
      const newEvts: AlertEvent[] = [];

      for (const rule of enabledRules) {
        for (const th of rule.thresholds) {
          for (const node of opts.liveNodes!) {
            if (!rule.targets.includes(node.id)) continue;

            let value: number | null = null;
            if (th.metric === "gpu") value = node.gpu;
            else if (th.metric === "memory") value = node.mem;
            else if (th.metric === "latency" && opts.liveLatency != null) value = opts.liveLatency;

            if (value === null) continue;

            const triggered =
              (th.condition === "gt" && value > th.value) ||
              (th.condition === "gte" && value >= th.value) ||
              (th.condition === "lt" && value < th.value) ||
              (th.condition === "lte" && value <= th.value) ||
              (th.condition === "eq" && value === th.value) ||
              (th.condition === "neq" && value !== th.value);

            if (!triggered) continue;

            // Deduplication check
            const cooldownMs = rule.deduplication.enabled
              ? rule.deduplication.cooldownMinutes * 60000
              : 0;
            const hasDuplicate = prevEvents.some(
              (e) =>
                e.ruleId === rule.id &&
                e.nodeId === node.id &&
                e.metric === th.metric &&
                !e.resolved &&
                now - e.timestamp < cooldownMs
            );
            if (hasDuplicate) continue;

            newEvts.push({
              id: `evt-ws-${now}-${node.id}-${th.metric}`,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `[WS] ${node.id} ${th.metric} = ${value.toFixed(1)} (阈值 ${th.condition} ${th.value}${th.unit})`,
              metric: th.metric,
              currentValue: value,
              threshold: th.value,
              nodeId: node.id,
              timestamp: now,
              acknowledged: false,
              resolved: false,
              escalationLevel: 1,
            });
          }
        }
      }

      if (newEvts.length === 0) return prevEvents;
      return [...newEvts, ...prevEvents].slice(0, 50);
    });
  }, [opts.liveNodes, opts.liveLatency, setEvents]);

  const toggleRule = useCallback((ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      upsertRule({ ...rule, enabled: !rule.enabled });
    }
  }, [rules, upsertRule]);

  const deleteRule = useCallback((ruleId: string) => {
    removeRule(ruleId);
    if (selectedRule?.id === ruleId) setSelectedRule(null);
  }, [selectedRule, removeRule]);

  const acknowledgeEvent = useCallback((eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      upsertEvent({ ...event, acknowledged: true });
    }
  }, [events, upsertEvent]);

  const resolveEvent = useCallback((eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      upsertEvent({ ...event, resolved: true, acknowledged: true });
    }
  }, [events, upsertEvent]);

  const createRule = useCallback((rule: Omit<AlertRule, "id" | "createdAt" | "lastTriggered" | "triggerCount">) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${String(Date.now()).slice(-6)}`,
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0,
    };
    upsertRule(newRule);
    setIsCreating(false);
  }, [upsertRule]);

  /** Update an existing rule (edit mode) */
  const updateRule = useCallback((ruleId: string, updates: Partial<Omit<AlertRule, "id" | "createdAt" | "lastTriggered" | "triggerCount">>) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      upsertRule({ ...rule, ...updates });
    }
    setEditingRule(null);
  }, [rules, upsertRule]);

  const filteredRules = filterSeverity === "all"
    ? rules
    : rules.filter((r) => r.severity === filterSeverity);

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.enabled).length,
    unresolvedEvents: events.filter((e) => !e.resolved).length,
    criticalEvents: events.filter((e) => e.severity === "critical" && !e.resolved).length,
  };

  return {
    rules: filteredRules,
    events,
    selectedRule,
    setSelectedRule,
    isCreating,
    setIsCreating,
    editingRule,
    setEditingRule,
    filterSeverity,
    setFilterSeverity,
    toggleRule,
    deleteRule,
    acknowledgeEvent,
    resolveEvent,
    createRule,
    updateRule,
    stats,
  };
}