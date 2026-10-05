/**
 * ResultCard.test.tsx
 * ====================
 * service-test/results-view.tsx — 测试结果卡片
 *
 * 覆盖范围:
 * - 头部: 名称 / 类别徽章 (AI/DB/WS/NET) / 状态 / 耗时 / 展开
 * - 展开明细: 步骤列表 (状态图标 / 延迟 / 详情) / 修复建议
 * - running 状态动画类
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultCard } from "../components/service-test/results-view";
import type { TestResult } from "../components/service-test/types";

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: "t-1",
    category: "ai",
    name: "AI 推理连通性",
    icon: undefined as unknown as TestResult["icon"],
    color: "#00d4ff",
    steps: [
      { label: "建立连接", status: "pass", detail: "握手成功", latencyMs: 42 },
      { label: "发送推理请求", status: "pass", detail: "返回 200" },
    ],
    overallStatus: "pass",
    startedAt: 1700000000000,
    completedAt: 1700000000123,
    suggestion: "检查 API Key 配置",
    ...overrides,
  };
}

describe("service-test/ResultCard", () => {
  it("应渲染名称 / AI 类别徽章 / 通过状态 / 耗时", () => {
    render(<ResultCard result={makeResult()} expanded={false} onToggle={vi.fn()} />);
    expect(screen.getByText("AI 推理连通性")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("通过")).toBeInTheDocument();
    expect(screen.getByText(/耗时 123ms/)).toBeInTheDocument();
  });

  it("db / websocket / network 类别应显示对应徽章", () => {
    const { rerender } = render(
      <ResultCard result={makeResult({ category: "db" })} expanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText("DB")).toBeInTheDocument();

    rerender(<ResultCard result={makeResult({ category: "websocket" })} expanded={false} onToggle={vi.fn()} />);
    expect(screen.getByText("WS")).toBeInTheDocument();

    rerender(<ResultCard result={makeResult({ category: "network" })} expanded={false} onToggle={vi.fn()} />);
    expect(screen.getByText("NET")).toBeInTheDocument();
  });

  it("未展开时不应渲染步骤与建议", () => {
    render(<ResultCard result={makeResult()} expanded={false} onToggle={vi.fn()} />);
    expect(screen.queryByText("建立连接")).not.toBeInTheDocument();
    expect(screen.queryByText("建议")).not.toBeInTheDocument();
  });

  it("展开后应渲染步骤明细与延迟, 以及修复建议", () => {
    render(<ResultCard result={makeResult()} expanded={true} onToggle={vi.fn()} />);
    expect(screen.getByText("建立连接")).toBeInTheDocument();
    expect(screen.getByText("握手成功")).toBeInTheDocument();
    expect(screen.getByText("42ms")).toBeInTheDocument();
    expect(screen.getByText("发送推理请求")).toBeInTheDocument();
    expect(screen.getByText("建议")).toBeInTheDocument();
    expect(screen.getByText("检查 API Key 配置")).toBeInTheDocument();
  });

  it("running 状态应显示测试中并带旋转动画", () => {
    render(
      <ResultCard
        result={makeResult({ overallStatus: "running", steps: [{ label: "连接中", status: "running", detail: "..." }] })}
        expanded={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("测试中")).toBeInTheDocument();
    const spinIcons = document.querySelectorAll(".animate-spin");
    expect(spinIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("点击头部应触发 onToggle", () => {
    const onToggle = vi.fn();
    render(<ResultCard result={makeResult()} expanded={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText("AI 推理连通性"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("无 completedAt 时不应显示耗时", () => {
    render(
      <ResultCard result={makeResult({ startedAt: undefined, completedAt: undefined })} expanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.queryByText(/耗时/)).not.toBeInTheDocument();
  });
});
