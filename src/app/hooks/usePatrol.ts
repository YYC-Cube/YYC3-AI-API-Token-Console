/**
 * usePatrol.ts
 * ==============
 * 巡查模式 状态管理 Hook
 * 管理巡查结果、巡查历史、巡查计划、手动/自动巡查
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePersistedList } from "./usePersistedState";
import type {
  PatrolStatus,
  CheckStatus,
  PatrolInterval,
  PatrolCheckItem,
  PatrolResult,
  PatrolSchedule,
} from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

// ============================================================
//  Mock 巡查检查项生成
// ============================================================

function generateChecks(): PatrolCheckItem[] {
  const categories = ["节点健康", "存储", "网络", "GPU", "内存", "安全"];
  const checks: PatrolCheckItem[] = [];

  const templates: Array<{
    category: string;
    label: string;
    genValue: () => { value: string; status: CheckStatus; threshold?: string; detail?: string };
  }> = [
    {
      category: "节点健康",
      label: "节点在线率",
      genValue: () => {
        const v = 90 + Math.floor(Math.random() * 11);
        return {
          value: `${v}%`,
          status: v >= 95 ? "pass" : v >= 80 ? "warning" : "critical",
          threshold: "≥95%",
          detail: `${Math.floor(v * 13 / 100)}/13 节点在线`,
        };
      },
    },
    {
      category: "存储",
      label: "存储容量",
      genValue: () => {
        const v = 60 + Math.floor(Math.random() * 35);
        return {
          value: `${v}%`,
          status: v < 80 ? "pass" : v < 90 ? "warning" : "critical",
          threshold: "<80%",
        };
      },
    },
    {
      category: "网络",
      label: "平均网络延迟",
      genValue: () => {
        const v = 10 + Math.floor(Math.random() * 80);
        return {
          value: `${v}ms`,
          status: v < 50 ? "pass" : v < 100 ? "warning" : "critical",
          threshold: "<50ms",
          detail: `${Math.floor(Math.random() * 3)} 节点延迟 >100ms`,
        };
      },
    },
    {
      category: "GPU",
      label: "GPU 平均利用率",
      genValue: () => {
        const v = 40 + Math.floor(Math.random() * 55);
        return {
          value: `${v}%`,
          status: v < 85 ? "pass" : v < 95 ? "warning" : "critical",
          threshold: "<85%",
        };
      },
    },
    {
      category: "GPU",
      label: "GPU 温度",
      genValue: () => {
        const v = 55 + Math.floor(Math.random() * 30);
        return {
          value: `${v}°C`,
          status: v < 75 ? "pass" : v < 85 ? "warning" : "critical",
          threshold: "<75°C",
        };
      },
    },
    {
      category: "内存",
      label: "内存利用率",
      genValue: () => {
        const v = 50 + Math.floor(Math.random() * 45);
        return {
          value: `${v}%`,
          status: v < 80 ? "pass" : v < 90 ? "warning" : "critical",
          threshold: "<80%",
        };
      },
    },
    {
      category: "安全",
      label: "安全事件",
      genValue: () => {
        const v = Math.floor(Math.random() * 5);
        return {
          value: `${v} 事件`,
          status: v === 0 ? "pass" : v <= 2 ? "warning" : "critical",
          threshold: "0 事件",
        };
      },
    },
    {
      category: "安全",
      label: "证书有效性",
      genValue: () => {
        const days = 10 + Math.floor(Math.random() * 350);
        return {
          value: `${days} 天`,
          status: days > 30 ? "pass" : days > 7 ? "warning" : "critical",
          threshold: ">30 天",
        };
      },
    },
  ];

  templates.forEach((t, i) => {
    const gen = t.genValue();
    checks.push({
      id: `chk-${String(i + 1).padStart(3, "0")}`,
      category: t.category,
      label: t.label,
      status: gen.status,
      value: gen.value,
      threshold: gen.threshold,
      detail: gen.detail,
    });
  });

  return checks;
}

function buildResult(checks: PatrolCheckItem[], triggeredBy: "manual" | "auto" | "scheduled"): PatrolResult {
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const criticalCount = checks.filter((c) => c.status === "critical").length;
  const skippedCount = checks.filter((c) => c.status === "skipped").length;
  const healthScore = Math.round(
    ((passCount * 100 + warningCount * 60 + criticalCount * 10) / (checks.length * 100)) * 100
  );

  return {
    id: `patrol-${Date.now()}`,
    timestamp: Date.now(),
    duration: 2 + Math.floor(Math.random() * 8),
    status: "completed",
    healthScore,
    totalChecks: checks.length,
    passCount,
    warningCount,
    criticalCount,
    skippedCount,
    checks,
    triggeredBy,
  };
}

// ============================================================
//  初始历史数据
// ============================================================

function generateInitialHistory(): PatrolResult[] {
  const results: PatrolResult[] = [];
  for (let i = 0; i < 5; i++) {
    const checks = generateChecks();
    const r = buildResult(checks, i % 2 === 0 ? "auto" : "scheduled");
    r.id = `patrol-init-${i}`;
    r.timestamp = Date.now() - (i + 1) * 30 * 60 * 1000;
    results.push(r);
  }
  return results;
}

// ============================================================
//  Hook
// ============================================================

export function usePatrol() {
  const [patrolStatus, setPatrolStatus] = useState<PatrolStatus>("idle");
  const [currentResult, setCurrentResult] = useState<PatrolResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState<PatrolResult | null>(null);

  const {
    items: history,
    setItems: setHistory,
    prepend: prependHistory,
  } = usePersistedList<PatrolResult>(
    "patrolHistory",
    generateInitialHistory()
  );

  const [schedule, setSchedule] = useState<PatrolSchedule>({
    enabled: true,
    interval: 15,
    lastRun: null,
    nextRun: Date.now() + 15 * 60 * 1000,
  });

  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── runPatrol ──────────────────────────────────────────────

  const runPatrol = useCallback(
    async (triggeredBy: "manual" | "auto" | "scheduled" = "manual") => {
      setPatrolStatus("running");
      setProgress(0);

      // 模拟渐进进度
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 80));
        setProgress(Math.round((i / steps) * 100));
      }

      const checks = generateChecks();
      const result = buildResult(checks, triggeredBy);

      setCurrentResult(result);
      setPatrolStatus("completed");
      setProgress(100);
      prependHistory(result);

      setSchedule((s) => ({
        ...s,
        lastRun: Date.now(),
        nextRun: s.enabled ? Date.now() + s.interval * 60 * 1000 : s.nextRun,
      }));

      if (triggeredBy === "manual") {
        toast.success(`巡查完成 — 健康度 ${result.healthScore}%`);
      }
    },
    [prependHistory]
  );

  // ── toggleAutoPatrol ───────────────────────────────────────

  const toggleAutoPatrol = useCallback(
    (enabled: boolean) => {
      setSchedule((s) => ({
        ...s,
        enabled,
        nextRun: enabled ? Date.now() + s.interval * 60 * 1000 : null,
      }));

      if (!enabled && autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }

      toast.info(enabled ? "自动巡查已开启" : "自动巡查已关闭");
    },
    []
  );

  // ── updateInterval ─────────────────────────────────────────

  const updateInterval = useCallback(
    (interval: PatrolInterval) => {
      setSchedule((s) => ({
        ...s,
        interval,
        nextRun: s.enabled ? Date.now() + interval * 60 * 1000 : s.nextRun,
      }));
    },
    []
  );

  // ── viewReport / closeReport ───────────────────────────────

  const viewReport = useCallback((report: PatrolResult) => {
    setSelectedReport(report);
  }, []);

  const closeReport = useCallback(() => {
    setSelectedReport(null);
  }, []);

  // ── 自动巡查定时器 ─────────────────────────────────────────

  useEffect(() => {
    if (schedule.enabled) {
      autoTimerRef.current = setInterval(() => {
        runPatrol("auto");
      }, schedule.interval * 60 * 1000);
    }
    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [schedule.enabled, schedule.interval, runPatrol]);

  return {
    patrolStatus,
    currentResult,
    history,
    schedule,
    progress,
    selectedReport,
    runPatrol,
    toggleAutoPatrol,
    updateInterval,
    viewReport,
    closeReport,
  };
}