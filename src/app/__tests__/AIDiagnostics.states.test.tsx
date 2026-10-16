/**
 * AIDiagnostics.states.test.tsx
 * ================================
 * AI 辅助诊断 — 会话状态矩阵测试 (S5 覆盖率长尾批 2)
 *
 * 覆盖范围 (useAIDiagnostics 捕获式 mock, hoisted ref 控制会话):
 * - 四视图全渲染 (patterns / anomalies / actions / forecasts)
 * - confidenceColor / priorityColor / riskColor 全档位
 * - metricIcon 全匹配分支 (GPU/内存/网络/延迟/默认)
 * - 数据点三色档位 (红 >85% / 黄 >65% / 蓝)
 * - 偏离度三档 (>100 / >30 / 其余)
 * - ActionCard: autoExecutable 有无 / executing 执行态 / 步骤列表
 * - ForecastCard: trend up/down/stable × riskLevel safe/warning/danger
 * - 视图 Tab 切换回调
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIDiagnostics } from "../components/AIDiagnostics";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";
import type { DiagnosticSession, DiagnosticView, DiagnosticStatus } from "../types";

// ── 捕获式 mock: hoisted ref 控制诊断会话状态 ──
const diagState = vi.hoisted(() => ({
  status: "idle" as string,
  session: null as unknown,
  history: [] as unknown[],
  activeView: "patterns" as string,
  executingAction: null as string | null,
  startDiagnosis: vi.fn(),
  executeAction: vi.fn(),
}));

vi.mock("../hooks/useAIDiagnostics", () => ({
  useAIDiagnostics: () => ({
    status: diagState.status,
    session: diagState.session,
    history: diagState.history,
    activeView: diagState.activeView,
    setActiveView: (view: DiagnosticView) => {
      diagState.activeView = view;
    },
    executingAction: diagState.executingAction,
    startDiagnosis: diagState.startDiagnosis,
    executeAction: diagState.executeAction,
  }),
}));

vi.mock("../hooks/useWebSocketData", () => ({
  useWebSocketData: () => ({
    connectionState: "simulated",
    reconnectCount: 0,
    lastSyncTime: "2026-03-01 10:00:00",
    liveQPS: 3842,
    qpsTrend: "+12.3%",
    liveLatency: 48,
    latencyTrend: "-5.2%",
    activeNodes: "7/8",
    gpuUtil: "82.4%",
    tokenThroughput: "138K/s",
    storageUsed: "12.8TB",
    nodes: [],
    throughputHistory: [],
    alerts: [],
    manualReconnect: () => {},
    clearAlerts: () => {},
  }),
}));

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = (result as Record<string, unknown>)[k];
  }
  return typeof result === "string" ? result : path;
}

function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string) => getNestedValue(zhCN as Record<string, unknown>, key),
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  };
}

function renderDiag() {
  return render(
    <I18nContext.Provider value={createI18nValue()}>
      <AIDiagnostics />
    </I18nContext.Provider>
  );
}

/** 构造覆盖全部分支档位的诊断会话 */
function makeFullSession(): DiagnosticSession {
  return {
    id: "diag-full",
    startedAt: Date.now() - 3000,
    completedAt: Date.now(),
    status: "complete" satisfies DiagnosticStatus,
    summary: "WebSocket 增强诊断: 检测到 GPU 压力与延迟漂移",
    patterns: [
      {
        id: "p1",
        type: "recurring" as const,
        title: "GPU 周期性高压",
        description: "每日高峰期 GPU 利用率周期性超限",
        confidence: "high" as const,
        affectedNodes: ["GPU-A100-01", "GPU-A100-02"],
        detectedAt: Date.now(),
        // max=95: 95→红(100%), 80→黄(84%), 60→蓝(63%)
        dataPoints: [95, 80, 60],
        metric: "GPU 利用率",
        severity: "critical" as const,
      },
      {
        id: "p2",
        type: "gradual" as const,
        title: "内存缓慢爬升",
        description: "内存使用率渐进性上升",
        confidence: "medium" as const,
        affectedNodes: ["GPU-A100-03"],
        detectedAt: Date.now(),
        dataPoints: [100, 30],
        metric: "内存使用率",
        severity: "warning" as const,
      },
      {
        id: "p3",
        type: "spike" as const,
        title: "磁盘 IO 突发",
        description: "非匹配指标走默认图标",
        confidence: "low" as const,
        affectedNodes: ["NAS-01"],
        detectedAt: Date.now(),
        dataPoints: [70, 50],
        metric: "磁盘 IO",
        severity: "info" as const,
      },
      {
        id: "p4",
        type: "correlation" as const,
        title: "网络与延迟关联",
        description: "网络吞吐与延迟强相关",
        confidence: "high" as const,
        affectedNodes: ["GPU-A100-04"],
        detectedAt: Date.now(),
        dataPoints: [10],
        metric: "网络吞吐量 (Network)",
        severity: "info" as const,
      },
      {
        id: "p5",
        type: "seasonal" as const,
        title: "延迟季节性波动",
        description: "延迟呈季节性模式",
        confidence: "high" as const,
        affectedNodes: ["GPU-A100-05"],
        detectedAt: Date.now(),
        dataPoints: [10],
        metric: "推理延迟 (Latency)",
        severity: "info" as const,
      },
    ],
    anomalies: [
      {
        id: "a1",
        timestamp: Date.now(),
        nodeId: "GPU-A100-01",
        metric: "gpu",
        expectedValue: 70,
        actualValue: 98,
        deviation: 150.4,
        rootCause: "批任务堆积",
      },
      {
        id: "a2",
        timestamp: Date.now(),
        nodeId: "GPU-A100-02",
        metric: "memory",
        expectedValue: 60,
        actualValue: 90,
        deviation: 50.2,
        rootCause: "内存泄漏",
      },
      {
        id: "a3",
        timestamp: Date.now(),
        nodeId: "GPU-A100-03",
        metric: "disk",
        expectedValue: 85,
        actualValue: 88,
        deviation: 3.5,
        rootCause: "日志膨胀",
      },
    ],
    actions: [
      {
        id: "act1",
        priority: "urgent" as const,
        title: "紧急扩容 GPU 节点",
        description: "立即扩容缓解压力",
        estimatedImpact: "延迟降低 40%",
        confidence: "high" as const,
        steps: ["申请备用节点", "迁移部分任务"],
        autoExecutable: true,
        relatedPatternId: "p1",
      },
      {
        id: "act2",
        priority: "recommended" as const,
        title: "建议重启内存泄漏进程",
        description: "择机重启泄漏进程",
        estimatedImpact: "内存回收 12GB",
        confidence: "medium" as const,
        steps: ["定位进程", "平滑重启"],
        autoExecutable: true,
        relatedPatternId: "p2",
      },
      {
        id: "act3",
        priority: "optional" as const,
        title: "可选: 清理历史日志",
        description: "低优先级清理",
        estimatedImpact: "磁盘回收 50GB",
        confidence: "low" as const,
        steps: ["筛选 30 天前日志"],
        autoExecutable: false,
        relatedPatternId: "p3",
      },
    ],
    forecasts: [
      {
        metric: "GPU 利用率",
        currentValue: 82,
        predictedValue: 97,
        timeframe: "未来 24 小时",
        trend: "up" as const,
        riskLevel: "danger" as const,
        explanation: "负载持续走高",
      },
      {
        metric: "内存使用率",
        currentValue: 70,
        predictedValue: 45,
        timeframe: "未来 12 小时",
        trend: "down" as const,
        riskLevel: "safe" as const,
        explanation: "批任务完成后回落",
      },
      {
        metric: "磁盘 IO",
        currentValue: 55,
        predictedValue: 58,
        timeframe: "未来 6 小时",
        trend: "stable" as const,
        riskLevel: "warning" as const,
        explanation: "小幅波动",
      },
    ],
  };
}

function resetState(session: DiagnosticSession | null) {
  diagState.status = "idle";
  diagState.session = session;
  diagState.history = [];
  diagState.activeView = "patterns";
  diagState.executingAction = null;
  vi.clearAllMocks();
}

describe("AIDiagnostics 会话状态矩阵", () => {
  beforeEach(() => {
    resetState(makeFullSession());
  });

  // ----------------------------------------------------------
  // 摘要 + Tab
  // ----------------------------------------------------------

  it("会话完成后应渲染摘要统计与耗时", () => {
    renderDiag();
    expect(screen.getByText("AI 诊断摘要")).toBeInTheDocument();
    expect(screen.getByText(/WebSocket 增强诊断/)).toBeInTheDocument();
    // 统计行为复合文本节点 (图标+数量+标签), 以卡片整体 textContent 断言
    // (文案以组件实际渲染为准: "N 个模式 / N 个异常 / N 项建议")
    const summaryCard = screen.getByText("AI 诊断摘要").closest(".p-4")!;
    expect(summaryCard.textContent).toContain("5 个模式");
    expect(summaryCard.textContent).toContain("3 个异常");
    expect(summaryCard.textContent).toContain("3 项建议");
    expect(summaryCard.textContent).toContain("3.0s");
  });

  it("点击视图 Tab 应切换激活视图", () => {
    const { unmount } = renderDiag();
    fireEvent.click(screen.getByText("解决方案"));
    expect(diagState.activeView).toBe("actions");
    fireEvent.click(screen.getByText("趋势预测"));
    expect(diagState.activeView).toBe("forecasts");
    unmount();
  });

  // ----------------------------------------------------------
  // 模式识别视图
  // ----------------------------------------------------------

  it("模式卡片应渲染置信度全档位标签", () => {
    diagState.activeView = "patterns";
    renderDiag();
    // high 出现在 3 张卡 (p1/p4/p5), medium/low 各 1
    expect(screen.getAllByText("高置信").length).toBe(3);
    expect(screen.getAllByText("中置信").length).toBe(1);
    expect(screen.getAllByText("低置信").length).toBe(1);
  });

  it("模式卡片应渲染五类模式标签", () => {
    diagState.activeView = "patterns";
    renderDiag();
    expect(screen.getByText("周期性")).toBeInTheDocument();
    expect(screen.getByText("渐进性")).toBeInTheDocument();
    expect(screen.getByText("突发性")).toBeInTheDocument();
    expect(screen.getByText("关联性")).toBeInTheDocument();
    expect(screen.getByText("季节性")).toBeInTheDocument();
  });

  it("模式卡片应渲染受影响节点列表", () => {
    diagState.activeView = "patterns";
    renderDiag();
    expect(screen.getByText("GPU-A100-01, GPU-A100-02")).toBeInTheDocument();
    expect(screen.getByText("NAS-01")).toBeInTheDocument();
  });

  it("数据点应按阈值分三档着色 (红/黄/蓝)", () => {
    diagState.activeView = "patterns";
    const { container } = renderDiag();
    const bars = container.querySelectorAll('[style*="transition"]');
    expect(bars.length).toBeGreaterThanOrEqual(9);
    const colors = Array.from(bars).map((b) => (b as HTMLElement).style.background);
    expect(colors).toContain("rgba(255, 51, 102, 0.6)");
    expect(colors).toContain("rgba(255, 170, 0, 0.4)");
    expect(colors).toContain("rgba(0, 212, 255, 0.3)");
  });

  // ----------------------------------------------------------
  // 异常分析视图
  // ----------------------------------------------------------

  it("异常行应渲染偏离度三档 (红 >100 / 黄 >30 / 蓝)", () => {
    diagState.activeView = "anomalies";
    renderDiag();
    expect(screen.getByText("+150.4%")).toBeInTheDocument();
    expect(screen.getByText("+50.2%")).toBeInTheDocument();
    expect(screen.getByText("+3.5%")).toBeInTheDocument();
    const badge150 = screen.getByText("+150.4%");
    expect(badge150.getAttribute("style")).toContain("rgb(255, 51, 102)");
    const badge3 = screen.getByText("+3.5%");
    expect(badge3.getAttribute("style")).toContain("rgb(0, 212, 255)");
  });

  it("异常行应渲染预期/实际/根因", () => {
    diagState.activeView = "anomalies";
    renderDiag();
    expect(screen.getByText(/预期: 70/)).toBeInTheDocument();
    expect(screen.getByText(/实际: 98/)).toBeInTheDocument();
    expect(screen.getByText(/根因: 批任务堆积/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 解决方案视图
  // ----------------------------------------------------------

  it("操作卡片应渲染优先级与置信度全档位", () => {
    diagState.activeView = "actions";
    renderDiag();
    expect(screen.getByText("紧急")).toBeInTheDocument();
    expect(screen.getByText("建议")).toBeInTheDocument();
    expect(screen.getByText("可选")).toBeInTheDocument();
    expect(screen.getByText("高置信")).toBeInTheDocument();
    expect(screen.getByText("中置信")).toBeInTheDocument();
    expect(screen.getByText("低置信")).toBeInTheDocument();
  });

  it("操作卡片应渲染步骤与预估收益", () => {
    diagState.activeView = "actions";
    renderDiag();
    expect(screen.getByText("延迟降低 40%")).toBeInTheDocument();
    // 步骤文本与序号按卡片作用域断言, 避免跨卡同名文本冲突
    const card = screen.getByText("紧急扩容 GPU 节点").closest(".p-4")!;
    expect(card.textContent).toContain("申请备用节点");
    expect(card.textContent).toContain("1");
    expect(card.textContent).toContain("2");
  });

  it("不可自动执行的卡片不应渲染执行按钮", () => {
    diagState.activeView = "actions";
    renderDiag();
    expect(screen.getAllByText("一键执行").length).toBe(2); // act1 + act2, act3 无
  });

  it("执行中的操作按钮应禁用并显示执行中文案", () => {
    diagState.activeView = "actions";
    diagState.executingAction = "act1";
    renderDiag();
    const execButtons = screen.getAllByText("执行中...").map((t) => t.closest("button")!);
    expect(execButtons.length).toBe(1);
    expect(execButtons[0]!).toBeDisabled();
    expect(screen.getAllByText("一键执行").length).toBe(1);
  });

  it("点击一键执行应触发 executeAction", () => {
    diagState.activeView = "actions";
    renderDiag();
    fireEvent.click(screen.getAllByText("一键执行")[0]!.closest("button")!);
    expect(diagState.executeAction).toHaveBeenCalledWith("act1");
  });

  // ----------------------------------------------------------
  // 趋势预测视图
  // ----------------------------------------------------------

  it("预测卡应渲染风险档位 (危险/安全/风险)", () => {
    diagState.activeView = "forecasts";
    renderDiag();
    expect(screen.getByText("危险")).toBeInTheDocument();
    expect(screen.getByText("安全")).toBeInTheDocument();
    expect(screen.getByText("风险")).toBeInTheDocument();
  });

  it("预测卡应渲染当前值/预测值/时间窗", () => {
    diagState.activeView = "forecasts";
    renderDiag();
    expect(screen.getAllByText("当前值").length).toBe(3);
    expect(screen.getByText("未来 24 小时")).toBeInTheDocument();
    expect(screen.getByText("未来 12 小时")).toBeInTheDocument();
    expect(screen.getByText("未来 6 小时")).toBeInTheDocument();
    expect(screen.getByText("负载持续走高")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 历史空会话
  // ----------------------------------------------------------

  it("无会话时应渲染诊断历史条目", () => {
    resetState(null);
    diagState.history = [
      { id: "h1", patterns: 4, actions: 2, time: Date.now() - 60000 },
    ];
    renderDiag();
    expect(screen.getByText("诊断历史")).toBeInTheDocument();
    // 历史行是复合文本节点 (数量+标签), 以容器 textContent 断言 (实际渲染 "N 个模式 · N 项建议")
    const historyCard = screen.getByText("诊断历史").closest(".p-4")!;
    expect(historyCard.textContent).toContain("4 个模式");
    expect(historyCard.textContent).toContain("2 项建议");
  });
});
