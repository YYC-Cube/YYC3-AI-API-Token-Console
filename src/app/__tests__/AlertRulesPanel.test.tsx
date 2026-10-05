/**
 * AlertRulesPanel.test.tsx
 * =========================
 * AlertRulesPanel + CreateRuleModal 组件测试
 */

import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AlertRulesPanel } from "../components/AlertRulesPanel";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

// ── Mock useWebSocketData ──
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
    nodes: [
      { id: "GPU-A100-01", status: "active", gpu: 87, mem: 72, temp: 68, model: "LLaMA-70B", tasks: 128 },
      { id: "GPU-A100-02", status: "active", gpu: 92, mem: 85, temp: 74, model: "Qwen-72B", tasks: 156 },
      { id: "GPU-A100-03", status: "warning", gpu: 98, mem: 94, temp: 82, model: "DeepSeek-V3", tasks: 89 },
    ],
    throughputHistory: [],
    alerts: [],
    manualReconnect: () => {},
    clearAlerts: () => {},
  }),
}));

// ── Helper ──
function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string, vars?: Record<string, string | number>) => {
      const raw = getNestedValue(zhCN as Record<string, any>, key);
      return vars ? interpolate(raw, vars) : raw;
    },
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <I18nContext.Provider value={createI18nValue()}>
        {ui}
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

describe("AlertRulesPanel", () => {
  it("renders the page title", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("智能告警规则")).toBeInTheDocument();
  });

  it("renders stats cards", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("总规则数")).toBeInTheDocument();
    expect(screen.getByText("启用规则")).toBeInTheDocument();
    expect(screen.getByText("未解决事件")).toBeInTheDocument();
    expect(screen.getByText("严重事件")).toBeInTheDocument();
  });

  it("renders rule cards", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("GPU 利用率过高")).toBeInTheDocument();
    expect(screen.getByText("推理延迟异常")).toBeInTheDocument();
  });

  it("renders view mode tabs", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("规则配置")).toBeInTheDocument();
    expect(screen.getByText("告警事件")).toBeInTheDocument();
  });

  it("switches to events view", () => {
    renderWithProviders(<AlertRulesPanel />);
    const eventsTab = screen.getByText("告警事件");
    fireEvent.click(eventsTab);
    // Events should show event messages
    expect(screen.getByText(/GPU-A100-03 利用率达到/)).toBeInTheDocument();
  });

  it("renders severity filter buttons", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("严重")).toBeInTheDocument();
    expect(screen.getByText("警告")).toBeInTheDocument();
    expect(screen.getByText("信息")).toBeInTheDocument();
  });

  it("renders create rule button", () => {
    renderWithProviders(<AlertRulesPanel />);
    const btn = screen.getByTestId("create-rule-btn");
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain("新建规则");
  });

  it("opens create rule modal when clicking create button", () => {
    renderWithProviders(<AlertRulesPanel />);
    const btn = screen.getByTestId("create-rule-btn");
    fireEvent.click(btn);
    expect(screen.getByTestId("create-rule-modal")).toBeInTheDocument();
    expect(screen.getByText("新建告警规则")).toBeInTheDocument();
  });

  it("closes create rule modal via cancel", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByTestId("create-rule-btn"));
    expect(screen.getByTestId("create-rule-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(screen.queryByTestId("create-rule-modal")).not.toBeInTheDocument();
  });

  it("shows select rule hint when no rule selected", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("选择一条规则查看详情")).toBeInTheDocument();
  });

  it("creates a new rule via modal form", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByTestId("create-rule-btn"));

    // Fill name
    const nameInput = screen.getByTestId("rule-name-input");
    fireEvent.change(nameInput, { target: { value: "测试规则" } });

    // Submit
    fireEvent.click(screen.getByTestId("submit-rule-btn"));

    // Modal should close and new rule should appear
    expect(screen.queryByTestId("create-rule-modal")).not.toBeInTheDocument();
    expect(screen.getByText("测试规则")).toBeInTheDocument();
  });

  it("shows validation error for empty name", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByTestId("create-rule-btn"));

    // Try submit without name
    fireEvent.click(screen.getByTestId("submit-rule-btn"));

    // Error should appear
    expect(screen.getByText("请填写必填项")).toBeInTheDocument();
  });
});

describe("AlertRulesPanel 扩展覆盖", () => {
  it("应渲染 WebSocket 连接状态指示", () => {
    renderWithProviders(<AlertRulesPanel />);
    expect(screen.getByText("Simulated Data")).toBeInTheDocument();
  });

  it("编辑规则应打开编辑模式弹窗并回填名称", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByTestId("edit-rule-rule-001"));
    expect(screen.getByText("编辑告警规则")).toBeInTheDocument();
    expect((screen.getByTestId("rule-name-input") as HTMLInputElement).value).toBe(
      "GPU 利用率过高"
    );
    expect(screen.getByText("保存修改")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(screen.queryByTestId("create-rule-modal")).not.toBeInTheDocument();
  });

  it("切换规则启用/禁用开关", () => {
    renderWithProviders(<AlertRulesPanel />);
    // 默认启用的规则 title 为 禁用
    expect(screen.getAllByTitle("禁用").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByTitle("禁用")[0]);
    // 切换后出现 启用 title
    expect(screen.getAllByTitle("启用").length).toBeGreaterThan(0);
  });

  it("删除规则后从列表移除", () => {
    renderWithProviders(<AlertRulesPanel />);
    const actions = screen
      .getByTestId("edit-rule-rule-001")
      .parentElement!;
    const buttons = within(actions).queryAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]); // 删除按钮 (无 title, 最后一个)
    expect(screen.queryByText("GPU 利用率过高")).not.toBeInTheDocument();
  });

  it("选中规则应显示详情抽屉并可关闭", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByText("GPU 利用率过高"));
    expect(screen.getByText("阈值配置")).toBeInTheDocument();
    expect(screen.getByText("升级策略")).toBeInTheDocument();
    expect(screen.getByText("目标节点")).toBeInTheDocument();
    // 抽屉头部关闭按钮
    const drawerName = screen.getAllByText("GPU 利用率过高")[1];
    fireEvent.click(drawerName.closest("div.justify-between")!.querySelector("button")!);
    expect(screen.queryByText("阈值配置")).not.toBeInTheDocument();
  });

  it("事件视图确认事件", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByText("告警事件"));
    const before = screen.getAllByText("确认").length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("确认")[0]);
    expect(screen.getAllByText("确认").length).toBe(before - 1);
  });

  it("事件视图解决事件", () => {
    renderWithProviders(<AlertRulesPanel />);
    fireEvent.click(screen.getByText("告警事件"));
    const before = screen.getAllByText("解决").length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("解决")[0]);
    expect(screen.getAllByText("解决").length).toBe(before - 1);
  });

  it("严重性筛选按钮切换激活态", () => {
    renderWithProviders(<AlertRulesPanel />);
    const criticalBtn = screen.getByText("严重").closest("button")!;
    fireEvent.click(criticalBtn);
    expect(criticalBtn.style.background).toContain("0.1");
    const warnBtn = screen.getByText("警告").closest("button")!;
    fireEvent.click(warnBtn);
    expect(warnBtn.style.background).toContain("0.1");
    expect(criticalBtn.style.background).not.toContain("0.1");
  });
});