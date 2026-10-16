/**
 * AIFamilyDesignDoc.test.tsx
 * ==========================
 * components/AIFamilyDesignDoc.tsx — 设计文档主壳 (S5 直连单测, 原仅经路由懒加载)
 *
 * 主壳仅负责纵向组装 (sections-a/b/c) 与 selectedModule 弹窗开关, 本文件验证:
 * - 整页组装: Hero → 哲学 → 成员 → 模块 → 架构 → 目录 → 路线图 → 之歌 → 致敬 各章节在场
 * - 模块详情弹窗: 点击模块卡打开 → × 关闭 (selectedModule 两分支)
 *
 * 各章节内部细节由 AiFamilyDocSectionsA/B/C 分文件覆盖。
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIFamilyDesignDoc } from "../components/AIFamilyDesignDoc";

describe("components/AIFamilyDesignDoc", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("整页应按序组装全部章节", () => {
    render(<AIFamilyDesignDoc />);
    // Hero (sections-a)
    expect(screen.getByText("AI Family 之家")).toBeInTheDocument();
    // 核心哲学 (sections-a)
    expect(screen.getByText("核心哲学 · 五化一体")).toBeInTheDocument();
    // 成员星图 (sections-b)
    expect(screen.getByText("AI Family · 八位成员")).toBeInTheDocument();
    // 五大模块 (sections-a)
    expect(screen.getByText("五大核心模块")).toBeInTheDocument();
    // 技术架构 (sections-b)
    expect(screen.getByText("技术架构")).toBeInTheDocument();
    // 章节目录 (sections-c)
    expect(screen.getByText("全书章节总览")).toBeInTheDocument();
    // 路线图 (sections-b)
    expect(screen.getByText("实施路线图")).toBeInTheDocument();
    // 之歌 (sections-c)
    expect(screen.getByText("Family AI · 智慧工坊之歌")).toBeInTheDocument();
    // 致敬 (sections-c)
    expect(screen.getByText("敬每一位 AI 导师 · 感恩每一位 AI 导师")).toBeInTheDocument();
    // 初始无模块详情弹窗
    expect(screen.queryByText("设计目标")).not.toBeInTheDocument();
  });

  it("点击模块卡应打开详情弹窗, × 应关闭", () => {
    render(<AIFamilyDesignDoc />);
    fireEvent.click(screen.getByText("Family AI"));
    expect(screen.getByText("设计目标")).toBeInTheDocument();
    expect(screen.getByText("构建8位AI成员的协同交互矩阵")).toBeInTheDocument();
    expect(screen.getByText("核心功能")).toBeInTheDocument();
    // 关闭后弹窗卸载
    fireEvent.click(screen.getByText("×"));
    expect(screen.queryByText("设计目标")).not.toBeInTheDocument();
    expect(screen.queryByText("构建8位AI成员的协同交互矩阵")).not.toBeInTheDocument();
  });
});
