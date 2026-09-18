/**
 * useServiceLoop.ts
 * ==================
 * 一站式服务闭环 Hook
 *
 * 实现: 监测 → 分析 → 决策 → 执行 → 验证 → 优化
 * 六层管道自动流转 + 手动干预
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { usePersistedList } from "./usePersistedState";
import type {
  LoopStage,
  StageStatus,
  StageResult,
  LoopRun,
  DataFlowEdge,
  DataFlowNodeType,
  StageMeta,
  DataFlowNode,
} from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

// ============================================================
// 闭环阶段元信息
// ============================================================

export const STAGE_META: StageMeta[] = [
  {
    key: "monitor",
    label: "监测层",
    icon: "Activity",
    color: "#00d4ff",
    description: "实时数据采集 · 指标监控 · 异常检测",
  },
  {
    key: "analyze",
    label: "分析层",
    icon: "BarChart3",
    color: "#7b2ff7",
    description: "模式识别 · 趋势分析 · 异常关联",
  },
  {
    key: "decide",
    label: "决策层",
    icon: "Brain",
    color: "#ff6600",
    description: "AI 辅助 · 规则引擎 · 操作推荐",
  },
  {
    key: "execute",
    label: "执行层",
    icon: "Play",
    color: "#00ff88",
    description: "一键操作 · 脚本执行 · 批量处理",
  },
  {
    key: "verify",
    label: "验证层",
    icon: "CheckCircle",
    color: "#ffaa00",
    description: "效果评估 · 指标对比 · 回归检测",
  },
  {
    key: "optimize",
    label: "优化层",
    icon: "TrendingUp",
    color: "#ff3366",
    description: "持续改进 · 参数调优 · 学习更新",
  },
];

// ============================================================
// 闭环阶段模拟数据生成
// ============================================================

const MOCK_STAGE_RESULTS: Record<LoopStage, () => Partial<StageResult>> = {
  monitor: () => ({
    summary: "采集 13 个节点数据，检测到 2 个异常信号",
    details: [
      "GPU-A100-03 推理延迟 2,450ms (>2,000ms 阈值)",
      "GPU-H100-02 温度 85°C (>80°C 阈值)",
      "其余 11 个节点运行正常",
    ],
    metrics: { nodes_scanned: 13, anomalies: 2, data_points: 1560 },
  }),
  analyze: () => ({
    summary: "识别 2 个异常模式，关联历史 5 起类似事件",
    details: [
      "模式 A: latency_spike → GPU-A100-03 (连续 3 次 >2s)",
      "模式 B: gpu_overheat → GPU-H100-02 (温度持续上升)",
      "历史关联: 过去 7 天有 5 次类似异常",
    ],
    metrics: { patterns_found: 2, historical_matches: 5, confidence: 89 },
  }),
  decide: () => ({
    summary: "AI 生成 4 条操作建议，置信度 78~95%",
    details: [
      "✅ 迁移 LLaMA-70B 到 GPU-A100-07 (置信度 92%)",
      "✅ 降低 GPU-H100-02 频率到 1.5GHz (置信度 90%)",
      "✅ 启用动态负载均衡 (置信度 78%)",
      "✅ 清理历史日志释放 8.2GB (置信度 95%)",
    ],
    metrics: { recommendations: 4, avg_confidence: 89, auto_executable: 3 },
  }),
  execute: () => ({
    summary: "自动执行 3 项操作，1 项等待人工确认",
    details: [
      "✅ 模型迁移完成: GPU-A100-03 → GPU-A100-07 (耗时 45s)",
      "✅ GPU-H100-02 频率已降至 1.5GHz",
      "✅ 动态负载均衡已启用",
      "⏳ 日志清理等待人工确认 (8.2GB)",
    ],
    metrics: { executed: 3, pending: 1, total_time_ms: 48200 },
  }),
  verify: () => ({
    summary: "验证结果: 延迟下降 68%，温度下降 12°C",
    details: [
      "GPU-A100-07 推理延迟: 780ms (原 2,450ms ↓68%)",
      "GPU-H100-02 温度: 73°C (原 85°C ↓12°C)",
      "集群整体吞吐量: 148K tok/s (原 121K ↑22%)",
      "无回归异常检测",
    ],
    metrics: { latency_reduction: 68, temp_reduction: 12, throughput_increase: 22 },
  }),
  optimize: () => ({
    summary: "更新 3 优化规则，学习周期 T+1 生效",
    details: [
      "规则更新: GPU-A100 系列延迟阈值从 2,000ms → 1,500ms",
      "规则更新: 温度预警提前到 75°C",
      "模型部署偏好: 优先选择低负载节点",
      "学习数据已入库，预计 T+1 生效",
    ],
    metrics: { rules_updated: 3, learning_data_points: 48, next_cycle_eta: 3600 },
  }),
};

// ============================================================
// 数据流连线
// ============================================================

export const DATA_FLOW_EDGES: DataFlowEdge[] = [
  {
    from: "device",
    to: "storage",
    label: "指标采集",
    bandwidth: "2.4 GB/s",
    active: true,
  },
  {
    from: "storage",
    to: "dashboard",
    label: "数据查询",
    bandwidth: "1.8 GB/s",
    active: true,
  },
  {
    from: "dashboard",
    to: "device",
    label: "控制指令",
    bandwidth: "128 KB/s",
    active: true,
  },
  {
    from: "dashboard",
    to: "terminal",
    label: "CLI / IDE",
    bandwidth: "512 KB/s",
    active: true,
  },
  {
    from: "terminal",
    to: "device",
    label: "脚本执行",
    bandwidth: "256 KB/s",
    active: true,
  },
  {
    from: "storage",
    to: "terminal",
    label: "日志/报告",
    bandwidth: "4.2 GB/s",
    active: true,
  },
];

export const DATA_FLOW_NODES: DataFlowNode[] = [
  { type: "device",    label: "本地设备",     sublabel: "192.168.3.x",      color: "#00d4ff" },
  { type: "storage",   label: "本地存储",     sublabel: "PostgreSQL + NAS", color: "#7b2ff7" },
  { type: "dashboard", label: "YYC³ Dashboard", sublabel: "React + PWA",   color: "#00ff88" },
  { type: "terminal",  label: "终端集成",     sublabel: "CLI / IDE",        color: "#ffaa00" },
];

// ============================================================
// Hook
// ============================================================

const ALL_STAGES: LoopStage[] = ["monitor", "analyze", "decide", "execute", "verify", "optimize"];

function createEmptyStages(): StageResult[] {
  return ALL_STAGES.map((s) => ({
    stage: s,
    status: "idle" as StageStatus,
    startedAt: null,
    completedAt: null,
    duration: null,
    summary: "",
    details: [],
  }));
}

let runIdCounter = 0;

export function useServiceLoop() {
  const [currentRun, setCurrentRun] = useState<LoopRun | null>(null);
  const {
    items: history,
    prepend: prependHistory,
    clear: clearHistoryStore,
    loaded: historyLoaded,
  } = usePersistedList<LoopRun>("loopHistory");
  const [isRunning, setIsRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const abortRef = useRef(false);

  // 当前阶段索引
  const currentStageIndex = useMemo(() => {
    if (!currentRun) return -1;
    return ALL_STAGES.indexOf(currentRun.currentStage);
  }, [currentRun]);

  // 运行历史统计
  const stats = useMemo(() => ({
    totalRuns: history.length,
    successRuns: history.filter((r) => r.overallStatus === "completed").length,
    errorRuns: history.filter((r) => r.overallStatus === "error").length,
    avgDuration: history.length > 0
      ? Math.round(
          history
            .filter((r) => r.completedAt)
            .reduce((acc, r) => acc + ((r.completedAt! - r.startedAt) || 0), 0) /
          Math.max(history.filter((r) => r.completedAt).length, 1)
        )
      : 0,
  }), [history]);

  // 执行单个阶段
  const runStage = useCallback(
    async (run: LoopRun, stageIndex: number): Promise<LoopRun> => {
      const stage = ALL_STAGES[stageIndex];
      const now = Date.now();

      // 设置阶段为 running
      const updatedStages = [...run.stages];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: "running",
        startedAt: now,
      };

      const updatedRun: LoopRun = {
        ...run,
        currentStage: stage,
        stages: updatedStages,
      };
      setCurrentRun(updatedRun);

      // 模拟执行延迟
      const delay = 800 + Math.random() * 1200;
      await new Promise((r) => setTimeout(r, delay));

      if (abortRef.current) {
        throw new Error("ABORTED");
      }

      // 获取模拟结果
      const mockResult = MOCK_STAGE_RESULTS[stage]();
      const completedAt = Date.now();

      updatedStages[stageIndex] = {
        stage,
        status: "completed",
        startedAt: now,
        completedAt,
        duration: completedAt - now,
        summary: mockResult.summary ?? "",
        details: mockResult.details ?? [],
        metrics: mockResult.metrics,
      };

      const nextRun: LoopRun = {
        ...updatedRun,
        stages: updatedStages,
      };
      setCurrentRun(nextRun);
      return nextRun;
    },
    []
  );

  // 执行完整闭环
  const startLoop = useCallback(
    async (trigger: "manual" | "auto" | "alert" = "manual") => {
      if (isRunning) return;

      abortRef.current = false;
      setIsRunning(true);

      const runId = `loop-${++runIdCounter}-${Date.now()}`;
      let run: LoopRun = {
        id: runId,
        startedAt: Date.now(),
        completedAt: null,
        trigger,
        currentStage: "monitor",
        stages: createEmptyStages(),
        overallStatus: "running",
      };
      setCurrentRun(run);

      toast.info("🔄 闭环流程已启动", {
        description: `触发方式: ${trigger === "manual" ? "手动" : trigger === "auto" ? "自动" : "告警"}`,
      });

      try {
        for (let i = 0; i < ALL_STAGES.length; i++) {
          run = await runStage(run, i);
        }

        run = {
          ...run,
          completedAt: Date.now(),
          overallStatus: "completed",
        };
        setCurrentRun(run);
        await prependHistory(run);
        toast.success("✅ 闭环流程完成", {
          description: `总耗时 ${((run.completedAt! - run.startedAt) / 1000).toFixed(1)}s`,
        });
      } catch (err: any) {
        if (err.message === "ABORTED") {
          run = { ...run, overallStatus: "error", completedAt: Date.now() };
          setCurrentRun(run);
          toast.info("闭环流程已中止");
        } else {
          run = { ...run, overallStatus: "error", completedAt: Date.now() };
          setCurrentRun(run);
          await prependHistory(run);
          toast.error("闭环流程出错");
        }
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, runStage, prependHistory]
  );

  // 中止
  const abortLoop = useCallback(() => {
    abortRef.current = true;
  }, []);

  // 清空历史
  const clearHistory = useCallback(() => {
    clearHistoryStore();
    toast.info("历史记录已清空");
  }, [clearHistoryStore]);

  return {
    currentRun,
    history,
    isRunning,
    autoMode,
    setAutoMode,
    currentStageIndex,
    stats,
    historyLoaded,
    startLoop,
    abortLoop,
    clearHistory,
    stageMeta: STAGE_META,
    dataFlowNodes: DATA_FLOW_NODES,
    dataFlowEdges: DATA_FLOW_EDGES,
  };
}