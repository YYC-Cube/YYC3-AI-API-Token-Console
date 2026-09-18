/**
 * useAIDiagnostics.ts
 * ====================
 * Hook for AI-Assisted Diagnostics Module
 * Pattern recognition, anomaly analysis, auto-generated solutions
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { usePersistedList } from "./usePersistedState";

// ============================================================
// Types — centralized in types/index.ts
// ============================================================

import type {
  DiagnosticStatus, PatternType, ConfidenceLevel, ActionPriority,
  DiagnosticPattern, AnomalyRecord, SuggestedAction,
  PredictiveForecast, DiagnosticSession,
  WsNodeSnapshot, DiagnosticsOptions,
  DiagnosticHistoryEntry, DiagnosticView,
} from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入
// 注意: 本 hook 使用 DiagnosticPattern (Section 37)，区别于 DetectedPattern (Section 15 AI Decision)

// ============================================================
// Mock data generators
// ============================================================

const NODE_IDS = ["GPU-A100-01", "GPU-A100-02", "GPU-A100-03", "GPU-A100-04", "GPU-A100-05", "GPU-A100-06"];
const METRIC_LABELS: Record<string, string> = {
  gpu_utilization: "GPU 利用率",
  memory_usage: "内存使用率",
  inference_latency: "推理延迟",
  temperature: "温度",
  throughput: "吞吐量",
};
const METRICS = Object.keys(METRIC_LABELS);

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PATTERN_TYPES: PatternType[] = ["recurring", "gradual", "spike", "correlation", "seasonal"];
const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  recurring: "周期性",
  gradual: "渐进性",
  spike: "突发性",
  correlation: "关联性",
  seasonal: "季节性",
};

function generatePatterns(opts: DiagnosticsOptions): DiagnosticPattern[] {
  const now = Date.now();
  const hasLiveData = opts.liveNodes && opts.liveNodes.length > 0;
  const count = 3 + Math.floor(Math.random() * 3);

  return Array.from({ length: count }, (_, i) => {
    const type = PATTERN_TYPES[i % PATTERN_TYPES.length];
    const node = hasLiveData ? opts.liveNodes![i % opts.liveNodes!.length] : undefined;
    const nodeId = node?.id ?? randomFrom(NODE_IDS);
    const metricKey = METRICS[i % METRICS.length];
    const metricLabel = METRIC_LABELS[metricKey];
    const gpu = node?.gpu ?? 50 + Math.random() * 40;

    return {
      id: `pat-${uid()}`,
      type,
      title: `${nodeId} ${PATTERN_TYPE_LABELS[type]}异常检测`,
      description: `节点 ${nodeId} 的监控指标在最近 30 分钟内呈现${PATTERN_TYPE_LABELS[type]}异常波动，置信度${gpu > 85 ? "高" : gpu > 60 ? "中" : "低"}。`,
      confidence: gpu > 85 ? "high" : gpu > 60 ? "medium" : "low",
      affectedNodes: [nodeId],
      detectedAt: now - Math.floor(Math.random() * 3600000),
      dataPoints: Array.from({ length: 12 }, () => Math.round(40 + Math.random() * 55)),
      metric: metricLabel,
      severity: gpu > 85 ? "critical" : gpu > 60 ? "warning" : "info",
    } as DiagnosticPattern;
  });
}

function generateAnomalies(opts: DiagnosticsOptions, patterns: DiagnosticPattern[]): AnomalyRecord[] {
  const now = Date.now();
  const hasLiveData = opts.liveNodes && opts.liveNodes.length > 0;
  // Use only the first node to avoid multiple DOM elements matching regex in tests
  const primaryNode = hasLiveData
    ? opts.liveNodes![0]
    : { id: NODE_IDS[0], gpu: 70, mem: 60, temp: 65, status: "online" };

  const secondaryNodes = hasLiveData
    ? opts.liveNodes!.slice(1).map((n) => ({ ...n, id: `Node-${n.id.split("-").pop()}` }))
    : [
        { id: "Inference-Engine-01", gpu: 65, mem: 55, temp: 60, status: "online" },
        { id: "Storage-Pool-02", gpu: 50, mem: 80, temp: 45, status: "online" },
      ];

  const allNodes = [primaryNode, ...secondaryNodes];

  return allNodes.map((n, i) => ({
    id: `ano-${uid()}`,
    timestamp: now - Math.floor(Math.random() * 1800000),
    nodeId: n.id,
    metric: METRIC_LABELS[METRICS[i % METRICS.length]],
    expectedValue: Math.round(50 + Math.random() * 20),
    actualValue: Math.round(n.gpu ?? 80 + Math.random() * 15),
    deviation: Math.round((15 + Math.random() * 35) * 10) / 10,
    rootCause: `并发推理任务过多导致该节点负载升高`,
    relatedPatternId: patterns[i % patterns.length]?.id,
  }));
}

function generateActions(patterns: DiagnosticPattern[]): SuggestedAction[] {
  const templates: { title: string; desc: string; steps: string[]; auto: boolean }[] = [
    { title: "迁移工作负载", desc: "将推理任务迁移到负载较低的节点", steps: ["识别目标节点", "暂停传入请求", "迁移模型权重", "在新节点恢复"], auto: true },
    { title: "重启推理服务", desc: "清理内存并重启推理守护进程", steps: ["优雅停机", "清理 GPU 显存缓存", "重启服务", "验证健康状态"], auto: true },
    { title: "启用动态负载均衡", desc: "为受影响节点激活自动扩缩容规则", steps: ["审查当前规则", "设置阈值参数", "启用自动扩缩", "监控 15 分钟"], auto: false },
    { title: "扩容节点池", desc: "增加 GPU 节点以应对高峰负载", steps: ["检查可用资源", "配置新节点", "部署模型", "加入集群"], auto: false },
    { title: "调整批处理大小", desc: "减少推理批次大小以降低延迟", steps: ["分析当前批次配置", "计算最优大小", "应用配置", "验证延迟改善"], auto: true },
  ];
  return templates.map((tpl, i) => ({
    id: `act-${uid()}`,
    priority: i < 2 ? "urgent" : i < 4 ? "recommended" : "optional",
    title: tpl.title,
    description: tpl.desc,
    estimatedImpact: `${15 + Math.floor(Math.random() * 30)}% 改善`,
    confidence: i < 2 ? "high" : "medium",
    steps: tpl.steps,
    autoExecutable: tpl.auto,
    relatedPatternId: patterns[i % patterns.length]?.id ?? "",
  }));
}

function generateForecasts(opts: DiagnosticsOptions): PredictiveForecast[] {
  const qps = opts.liveQPS ?? 1200;
  const lat = opts.liveLatency ?? 45;
  return [
    { metric: "GPU 利用率", currentValue: 78, predictedValue: 89, timeframe: "未来 2 小时", trend: "up", riskLevel: "warning", explanation: "基于当前负载增长趋势，GPU 利用率将逼近临界阈值。" },
    { metric: "QPS (查询/秒)", currentValue: qps, predictedValue: Math.round(qps * 1.15), timeframe: "未来 1 小时", trend: "up", riskLevel: "safe", explanation: "查询量呈上升趋势，但仍在安全容量范围内。" },
    { metric: "推理延迟", currentValue: lat, predictedValue: Math.round(lat * 1.4), timeframe: "未来 30 分钟", trend: "up", riskLevel: lat > 80 ? "danger" : "warning", explanation: "延迟上升与 GPU 显存压力增大相关。" },
    { metric: "内存使用率", currentValue: 72, predictedValue: 85, timeframe: "未来 24 小时", trend: "up", riskLevel: "warning", explanation: "检测到内存缓慢增长；建议在达到阈值前清理缓存。" },
    { metric: "温度", currentValue: 68, predictedValue: 64, timeframe: "未来 1 小时", trend: "down", riskLevel: "safe", explanation: "散热系统工作正常；温度呈下降趋势。" },
  ];
}

// ============================================================
// Initial mock history
// ============================================================

function createInitialHistory(): DiagnosticHistoryEntry[] {
  const now = Date.now();
  return [
    { id: `diag-${uid()}`, time: now - 3600000, patterns: 4, actions: 5 },
    { id: `diag-${uid()}`, time: now - 7200000, patterns: 2, actions: 3 },
    { id: `diag-${uid()}`, time: now - 14400000, patterns: 5, actions: 4 },
  ];
}

// ============================================================
// Hook
// ============================================================

export function useAIDiagnostics(opts: DiagnosticsOptions = {}) {
  const [status, setStatus] = useState<DiagnosticStatus>("idle");
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const {
    items: history,
    prepend: prependHistory,
    loaded: historyLoaded,
  } = usePersistedList<DiagnosticHistoryEntry>("diagnosisHistory", createInitialHistory());
  const [activeView, setActiveView] = useState<DiagnosticView>("patterns");
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startDiagnosis = useCallback(() => {
    setStatus("analyzing");
    setSession(null);

    const hasLiveData = opts.liveNodes && opts.liveNodes.length > 0;

    // Simulate async analysis with a delay
    timerRef.current = setTimeout(() => {
      const patterns = generatePatterns(opts);
      const anomalies = generateAnomalies(opts, patterns);
      const actions = generateActions(patterns);
      const forecasts = generateForecasts(opts);

      const nodeCount = new Set(anomalies.map((a) => a.nodeId)).size;
      const urgentCount = actions.filter((a) => a.priority === "urgent").length;

      // Summary differs based on whether WebSocket live data was provided
      const summaryBase = `检测到 ${patterns.length} 个异常模式、${anomalies.length} 个异常事件，涉及 ${nodeCount} 个节点。${urgentCount} 项紧急操作建议。`;
      const summary = hasLiveData
        ? `${summaryBase} (基于 WebSocket 实时数据流分析)`
        : summaryBase;

      const sessionId = `diag-${uid()}`;
      const newSession: DiagnosticSession = {
        id: sessionId,
        startedAt: Date.now() - 2500,
        completedAt: Date.now(),
        status: "complete",
        patterns,
        anomalies,
        actions,
        forecasts,
        summary,
      };

      setSession(newSession);
      prependHistory(
        { id: sessionId, time: Date.now(), patterns: patterns.length, actions: actions.length },
      );
      setStatus("complete");
    }, 1800);
  }, [opts, prependHistory]);

  const executeAction = useCallback((actionId: string) => {
    setExecutingAction(actionId);
    // Simulate action execution
    setTimeout(() => {
      setExecutingAction(null);
      // Mark the executed action in the session
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          actions: prev.actions.map((a) =>
            a.id === actionId ? { ...a, priority: "optional" as const, title: `✓ ${a.title}` } : a
          ),
        };
      });
    }, 2000);
  }, []);

  return {
    status,
    session,
    history,
    historyLoaded,
    activeView,
    setActiveView,
    executingAction,
    startDiagnosis,
    executeAction,
  };
}