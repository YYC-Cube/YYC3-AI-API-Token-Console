/**
 * useAISuggestion.ts
 * ===================
 * AI 辅助决策 Hook
 *
 * 模拟异常模式检测 → AI 推荐操作 → 应用/忽略
 * 基于历史数据和当前状态生成建议
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createLocalStore } from "../lib/create-local-store";
import type {
  DetectedPattern,
  AIRecommendation,
  AIAnalysisResult,
  AnomalyPatternType,
  PatternSeverity,
} from "../types";

// ============================================================
// Mock 模式检测数据
// ============================================================

const now = Date.now();

const DEFAULT_PATTERNS: DetectedPattern[] = [
  {
    id: "pat-1",
    type: "latency_spike",
    severity: "high",
    title: "GPU-A100-03 推理延迟持续异常",
    description: "过去 1 小时内连续 3 次延迟 > 2000ms，平均延迟 2,450ms",
    source: "GPU-A100-03",
    metric: "2,450ms > 2,000ms 阈值",
    detectedAt: now - 15 * 60000,
    occurrences: 3,
    trend: "rising",
  },
  {
    id: "pat-2",
    type: "memory_pressure",
    severity: "medium",
    title: "GPU-A100-03 显存压力过大",
    description: "显存使用率持续 89%+ ，接近 OOM 阈值",
    source: "GPU-A100-03",
    metric: "89% > 85% 阈值",
    detectedAt: now - 30 * 60000,
    occurrences: 5,
    trend: "stable",
  },
  {
    id: "pat-3",
    type: "storage_near_full",
    severity: "medium",
    title: "NAS 存储空间接近阈值",
    description: "NAS-Storage-01 已使用 85.8%，预计 7 天后达到 90% 告警线",
    source: "NAS-Storage-01",
    metric: "85.8% → 预计 7 天达 90%",
    detectedAt: now - 2 * 3600000,
    occurrences: 1,
    trend: "rising",
  },
  {
    id: "pat-4",
    type: "gpu_overheat",
    severity: "critical",
    title: "GPU-H100-02 温度过高",
    description: "GPU 核心温度 85°C，超过安全阈值 80°C，风扇已满速运行",
    source: "GPU-H100-02",
    metric: "85°C > 80°C 安全阈值",
    detectedAt: now - 5 * 60000,
    occurrences: 2,
    trend: "rising",
  },
  {
    id: "pat-5",
    type: "throughput_drop",
    severity: "low",
    title: "推理吞吐量波动",
    description: "最近 30 分钟 Token 吞吐量下降 12.3%，可能受任务调度影响",
    source: "集群整体",
    metric: "138K/s → 121K/s (↓12.3%)",
    detectedAt: now - 20 * 60000,
    occurrences: 1,
    trend: "declining",
  },
];

const DEFAULT_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: "rec-1",
    patternId: "pat-1",
    action: "迁移模型到 GPU-A100-07",
    description: "GPU-A100-07 当前负载 15%，迁移 LLaMA-70B 后预计延迟降至 800ms",
    impact: "high",
    confidence: 92,
    autoExecutable: true,
  },
  {
    id: "rec-2",
    patternId: "pat-1",
    action: "重启 GPU-A100-03 推理服务",
    description: "重启推理服务以清理内存碎片，预计恢复延迟到正常水平",
    impact: "medium",
    confidence: 78,
    autoExecutable: true,
  },
  {
    id: "rec-3",
    patternId: "pat-2",
    action: "启用动态显存分配",
    description: "减小 batch_size 从 32 到 16，降低显存占用约 30%",
    impact: "medium",
    confidence: 85,
    autoExecutable: true,
  },
  {
    id: "rec-4",
    patternId: "pat-3",
    action: "清理历史日志归档",
    description: "删除 30 天前的推理日志，预计释放 8.2GB 空间",
    impact: "low",
    confidence: 95,
    autoExecutable: true,
  },
  {
    id: "rec-5",
    patternId: "pat-3",
    action: "扩容 NAS 存储卷",
    description: "从 48TB 扩容到 64TB，需要手动操作 RAID 配置",
    impact: "high",
    confidence: 88,
    autoExecutable: false,
  },
  {
    id: "rec-6",
    patternId: "pat-4",
    action: "降低 GPU-H100-02 工作频率",
    description: "将 GPU 频率从 1.8GHz 降至 1.5GHz，温度预计下降 10°C",
    impact: "high",
    confidence: 90,
    autoExecutable: true,
  },
  {
    id: "rec-7",
    patternId: "pat-4",
    action: "将任务从 GPU-H100-02 迁出",
    description: "临时将所有推理任务迁移到其他节点，让 GPU 冷却",
    impact: "high",
    confidence: 95,
    autoExecutable: true,
  },
  {
    id: "rec-8",
    patternId: "pat-5",
    action: "启用动态负载均衡",
    description: "开启跨节点负载均衡，自动将任务分配到空闲节点",
    impact: "medium",
    confidence: 72,
    autoExecutable: true,
  },
];

// localStorage stores
const patternStore = createLocalStore<DetectedPattern>("yyc3_ai_patterns", DEFAULT_PATTERNS, "pat");
const recommendStore = createLocalStore<AIRecommendation>("yyc3_ai_recommendations", DEFAULT_RECOMMENDATIONS, "rec");

// ============================================================
// Hook
// ============================================================

export function useAISuggestion() {
  const [patterns, setPatterns] = useState<DetectedPattern[]>(() => patternStore.getAll());
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(() => recommendStore.getAll());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number>(now - 5 * 60000);
  const [enabledAutoSuggestion, setEnabledAutoSuggestion] = useState(true);

  // 整体健康度
  const overallHealth = useMemo(() => {
    if (patterns.length === 0) return 100;
    const severityWeight: Record<PatternSeverity, number> = {
      low: 2, medium: 5, high: 10, critical: 20,
    };
    const totalPenalty = patterns.reduce(
      (acc, p) => acc + severityWeight[p.severity], 0
    );
    return Math.max(0, Math.min(100, 100 - totalPenalty));
  }, [patterns]);

  // 按模式关联推荐
  const getRecommendationsForPattern = useCallback(
    (patternId: string) => recommendations.filter((r) => r.patternId === patternId),
    [recommendations]
  );

  // 按严重级别排序的模式
  const sortedPatterns = useMemo(() => {
    const order: Record<PatternSeverity, number> = {
      critical: 0, high: 1, medium: 2, low: 3,
    };
    return [...patterns].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [patterns]);

  // 统计
  const stats = useMemo(() => ({
    totalPatterns: patterns.length,
    criticalCount: patterns.filter((p) => p.severity === "critical").length,
    highCount: patterns.filter((p) => p.severity === "high").length,
    mediumCount: patterns.filter((p) => p.severity === "medium").length,
    lowCount: patterns.filter((p) => p.severity === "low").length,
    totalRecommendations: recommendations.filter((r) => !r.applied).length,
    appliedCount: recommendations.filter((r) => r.applied).length,
    pendingRecs: recommendations.filter((r) => !r.applied).length,
    appliedRecs: recommendations.filter((r) => r.applied).length,
  }), [patterns, recommendations]);

  // 执行分析
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    toast.info("AI 正在分析系统状态...");

    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));

    setLastAnalyzedAt(Date.now());
    setIsAnalyzing(false);
    toast.success("AI 分析完成", { description: `检测到 ${patterns.length} 个异常模式` });
  }, [patterns.length]);

  // 应用推荐
  const applyRecommendation = useCallback(async (recId: string) => {
    const rec = recommendations.find((r) => r.id === recId);
    if (!rec) return;

    toast.info(`正在执行: ${rec.action}`);
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));

    setRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, applied: true } : r))
    );

    toast.success(`已应用: ${rec.action}`);
  }, [recommendations]);

  // 忽略推荐
  const dismissRecommendation = useCallback((recId: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    toast.info("建议已忽略");
  }, []);

  // 忽略模式
  const dismissPattern = useCallback((patternId: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== patternId));
    setRecommendations((prev) => prev.filter((r) => r.patternId !== patternId));
    toast.info("异常模式��忽略");
  }, []);

  return {
    patterns: sortedPatterns,
    recommendations,
    overallHealth,
    isAnalyzing,
    lastAnalyzedAt,
    enabledAutoSuggestion,
    setEnabledAutoSuggestion,
    stats,
    runAnalysis,
    applyRecommendation,
    dismissRecommendation,
    dismissPattern,
    getRecommendationsForPattern,
  };
}