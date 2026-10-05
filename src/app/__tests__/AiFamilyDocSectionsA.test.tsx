/**
 * AiFamilyDocSectionsA.test.tsx
 * =============================
 * ai-family-doc/sections-a.tsx — Hero / 核心哲学 / 模块概览 / 模块详情
 *
 * 覆盖范围:
 * - HeroBanner: 标语 / 徽章 / 理念标签 / 副标题延时显现
 * - PhilosophySection: 五化一体原则
 * - ModulesOverview: 五大模块卡片 + onSelectModule 回调
 * - ModuleDetailPanel: 设计目标 / 核心功能 / 组件清单 / 线框 / 关闭(×与遮罩) / 未知模块
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  HeroBanner, PhilosophySection, ModulesOverview, ModuleDetailPanel,
} from "../components/ai-family-doc/sections-a";
import { CORE_PHILOSOPHY, DESIGN_SECTIONS } from "../components/ai-family-doc/content";

describe("ai-family-doc/sections-a", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("HeroBanner", () => {
    it("应渲染徽章 / 主标题 / 理念标签", () => {
      render(<HeroBanner />);
      expect(screen.getByText("YYC³ AI FAMILY · 设计规划文档")).toBeInTheDocument();
      expect(screen.getByText("AI Family 之家")).toBeInTheDocument();
      for (const tag of ["以人为本", "AI为核", "纯粹为心", "智能为驱"]) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }
      expect(screen.getByText("集众思成家逸 · 构建AI之家 · 纵向丝滑之极致协同")).toBeInTheDocument();
    });

    it("800ms 后副标题应显现 (opacity → 1)", () => {
      vi.useFakeTimers();
      render(<HeroBanner />);
      const subtitle = screen.getByText("集众思成家逸 · 构建AI之家 · 纵向丝滑之极致协同");
      expect(subtitle.style.opacity).toBe("0");
      act(() => { vi.advanceTimersByTime(900); });
      expect(subtitle.style.opacity).toBe("1");
    });
  });

  describe("PhilosophySection", () => {
    it("应渲染核心哲学与五大原则", () => {
      render(<PhilosophySection />);
      expect(screen.getByText("核心哲学 · 五化一体")).toBeInTheDocument();
      expect(screen.getByText(CORE_PHILOSOPHY.motto)).toBeInTheDocument();
      for (const p of CORE_PHILOSOPHY.principles) {
        expect(screen.getByText(p.label)).toBeInTheDocument();
        expect(screen.getByText(p.desc)).toBeInTheDocument();
      }
    });
  });

  describe("ModulesOverview", () => {
    it("应渲染五大核心模块并触发选中回调", () => {
      const onSelectModule = vi.fn();
      render(<ModulesOverview onSelectModule={onSelectModule} />);
      expect(screen.getByText("五大核心模块")).toBeInTheDocument();
      for (const s of DESIGN_SECTIONS) {
        expect(screen.getByText(s.title)).toBeInTheDocument();
        expect(screen.getByText(s.description)).toBeInTheDocument();
      }
      fireEvent.click(screen.getByText("Family AI"));
      expect(onSelectModule).toHaveBeenCalledWith("family-ai");
    });
  });

  describe("ModuleDetailPanel", () => {
    it("family-ai 应渲染目标/功能/组件清单/线框", () => {
      render(<ModuleDetailPanel moduleId="family-ai" onClose={vi.fn()} />);
      expect(screen.getByText("Family AI")).toBeInTheDocument();
      expect(screen.getByText("智能协同核心 · 亦师亦友亦伯乐")).toBeInTheDocument();
      expect(screen.getByText("设计目标")).toBeInTheDocument();
      expect(screen.getByText("构建8位AI成员的协同交互矩阵")).toBeInTheDocument();
      expect(screen.getByText("核心功能")).toBeInTheDocument();
      expect(screen.getByText("时钟环交互中心")).toBeInTheDocument();
      expect(screen.getByText("组件清单")).toBeInTheDocument();
      expect(screen.getByText("UI 概念线框")).toBeInTheDocument();
      expect(screen.getByText("时钟环布局 · 8位AI成员 · 中心品牌标识 · 实时交互面板")).toBeInTheDocument();
    });

    it("点击 × 与遮罩均应触发 onClose", () => {
      const onClose = vi.fn();
      const { container } = render(<ModuleDetailPanel moduleId="family-ai" onClose={onClose} />);
      fireEvent.click(screen.getByText("×"));
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent.click(container.firstElementChild as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("未知 moduleId 不渲染任何内容", () => {
      const { container } = render(<ModuleDetailPanel moduleId="bogus" onClose={vi.fn()} />);
      expect(container.innerHTML).toBe("");
    });
  });
});
