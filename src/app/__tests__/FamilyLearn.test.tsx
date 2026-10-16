/**
 * FamilyLearn.test.tsx
 * ====================
 * ai-family/FamilyLearn.tsx — 学习成长空间 (S5 直连单测, 原仅经 AIFamilyRouter 懒加载)
 *
 * 覆盖范围:
 * - 概览三卡 (3/16 技能 · 5 课程 · 4/6 徽章)
 * - 技能树 tab (completed/active/locked 三态图标与进度条文案)
 * - AI 课程 tab (导师 / 节数 / 进度 / 继续学习按钮)
 * - 成就墙 tab (已获得徽章 / 未获得降透明度)
 * - tab 切换互斥渲染
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyLearn } from "../components/ai-family/FamilyLearn";

function renderLearn() {
  return render(<MemoryRouter><FamilyLearn /></MemoryRouter>);
}

describe("ai-family/FamilyLearn", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("默认技能树 tab 应渲染头部 / 概览 / 四大类技能", () => {
    renderLearn();
    expect(screen.getByText("学习成长")).toBeInTheDocument();
    expect(screen.getByText("AI 导师陪伴式学习 · 个性化成长路径 · 技能可视化")).toBeInTheDocument();
    // 概览: completed 3 / total 16 · courses 5 · badges 4/6
    expect(screen.getByText("技能掌握")).toBeInTheDocument();
    expect(screen.getByText("3/16")).toBeInTheDocument();
    expect(screen.getByText("课程进行中")).toBeInTheDocument();
    expect(screen.getByText("成就徽章")).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();
    // 四大类
    for (const cat of ["AI 基础", "全栈开发", "系统架构", "安全合规"]) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
    // 满级技能 Lv.5/5 共 3 个 (机器学习基础 / React+TS / Tailwind)
    expect(screen.getAllByText("Lv.5/5")).toHaveLength(3);
    expect(screen.getByText("机器学习基础")).toBeInTheDocument();
    expect(screen.getByText("NLP 自然语言处理")).toBeInTheDocument();
    expect(screen.getByText("计算机视觉")).toBeInTheDocument(); // locked 分支
    // 三态图标 (CheckCircle2 在 lucide 0.487 注册名为 circle-check)
    expect(document.querySelectorAll("svg.lucide-circle-check").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll("svg.lucide-lock").length).toBeGreaterThanOrEqual(4);
  });

  it("切换 AI 课程 tab 应渲染课程列表并互斥技能树", () => {
    renderLearn();
    fireEvent.click(screen.getByText("AI 课程"));
    expect(screen.getByText("LLM Prompt Engineering 实战")).toBeInTheDocument();
    expect(screen.getByText("数据驱动的商业洞察方法论")).toBeInTheDocument();
    expect(screen.getByText("TypeScript 类型体操进阶")).toBeInTheDocument();
    expect(screen.getByText(/AI 导师：言启·千行/)).toBeInTheDocument();
    expect(screen.getByText("9/12 节")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getAllByText("继续学习")).toHaveLength(5);
    // 技能树内容已卸载 (tab 按钮「技能树」文案仍在, 用技能名判定)
    expect(screen.queryByText("机器学习基础")).not.toBeInTheDocument();
  });

  it("切换成就墙 tab 应渲染 6 枚徽章且 4 枚已获得", () => {
    renderLearn();
    fireEvent.click(screen.getByText("成就墙"));
    for (const name of ["初入家门", "知识探索者", "对话达人", "技能大师", "安全卫士", "架构先锋"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("已获得")).toHaveLength(4);
    // 未获得徽章整卡降透明度
    expect(screen.getByText("安全卫士").closest("div[class*=opacity-40]")).not.toBeNull();
    expect(screen.getByText("对话达人").closest("div[class*=opacity-40]")).toBeNull();
  });

  it("成就墙可切回技能树 (tab 状态复用)", () => {
    renderLearn();
    fireEvent.click(screen.getByText("成就墙"));
    expect(screen.queryByText("机器学习基础")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("技能树"));
    expect(screen.getByText("机器学习基础")).toBeInTheDocument();
    expect(screen.queryByText("已获得")).not.toBeInTheDocument();
  });
});
