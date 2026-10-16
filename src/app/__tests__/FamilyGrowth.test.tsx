/**
 * FamilyGrowth.test.tsx
 * =====================
 * ai-family/FamilyGrowth.tsx — 共同成长空间 (S5 直连单测, 原仅经 AIFamilyRouter 懒加载)
 *
 * 覆盖范围:
 * - 本周概览四卡 (含「稳定」非增幅文案)
 * - 成长热力图 (Math.random 固定 → 12 周 × 7 天活跃度 title / 图例低-高)
 * - 贡献排行 (按贡献度降序 · 前三星标 · 数值渲染)
 * - 里程碑时间线 (6 项日期/标题/描述)
 * - 连续在线天数 / 底部寄语
 *
 * 不可构造分支: sortedMembers[0]?.contribution ?? m.contribution 兜底右侧 —
 * FAMILY_MEMBERS 恒非空, 兜底恒不可达。
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyGrowth } from "../components/ai-family/FamilyGrowth";

function renderGrowth() {
  return render(<MemoryRouter><FamilyGrowth /></MemoryRouter>);
}

describe("ai-family/FamilyGrowth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("应渲染头部与本周概览四卡", () => {
    renderGrowth();
    expect(screen.getByText("共同成长")).toBeInTheDocument();
    expect(screen.getByText("记录每一步成长 · 见证每一次突破 · 携手进化之路")).toBeInTheDocument();
    for (const label of ["总协作次数", "知识产出", "代码质量分", "安全指数"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("8,547")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("156 篇")).toBeInTheDocument();
    expect(screen.getByText("+23%")).toBeInTheDocument();
    expect(screen.getByText("94.5")).toBeInTheDocument();
    expect(screen.getByText("+2.1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("稳定")).toBeInTheDocument();
  });

  it("热力图应渲染 12 周 × 7 天单元格与图例 (random=0.5 → 活跃度 2)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderGrowth();
    expect(screen.getByText("成长热力图")).toBeInTheDocument();
    expect(screen.getByText("近 12 周")).toBeInTheDocument();
    // 每周 7 格共享同一 title, 12 周共 12 组
    expect(screen.getAllByTitle("第1周 · 活跃度 2")).toHaveLength(7);
    expect(screen.getAllByTitle("第12周 · 活跃度 2")).toHaveLength(7);
    // 图例
    expect(screen.getByText("低")).toBeInTheDocument();
    expect(screen.getByText("高")).toBeInTheDocument();
  });

  it("贡献排行应按贡献度降序渲染家人与数值", () => {
    renderGrowth();
    expect(screen.getByText("贡献排行")).toBeInTheDocument();
    // 榜首元启·天枢 1205, 榜尾千里·伯乐 534 (姓名同时出现在连续在线天数卡 → getAll)
    expect(screen.getAllByText("1205").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("534").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("923").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("元启·天枢").length).toBeGreaterThanOrEqual(1);
    // 排行首行 = 最高贡献 (文档顺序断言)
    const first = screen.getByText("1205").closest("div.flex");
    expect(first).not.toBeNull();
    expect(first!.textContent).toContain("元启·天枢");
  });

  it("应渲染 6 项里程碑时间线", () => {
    renderGrowth();
    expect(screen.getByText("里程碑")).toBeInTheDocument();
    for (const title of ["AI Family 家园落成", "1935 测试用例全部通过", "八位家人协同框架完成", "赛博朋克设计系统建立", "九层架构设计完成", "项目正式启动"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("2025-03-09")).toBeInTheDocument();
    expect(screen.getByText("完成5大家园空间的原型构建")).toBeInTheDocument();
  });

  it("应渲染连续在线天数与底部寄语", () => {
    renderGrowth();
    expect(screen.getByText("连续在线天数")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument(); // 千行 streak
    expect(screen.getByText("22")).toBeInTheDocument(); // 伯乐 streak
    expect(screen.getByText("「顺时势、思时时、去适时、做实事」")).toBeInTheDocument();
    expect(screen.getByText("破局先破己 · 想赢得他人的尊重，首先要学会尊重他人")).toBeInTheDocument();
  });
});
