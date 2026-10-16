/**
 * AiFamilyDocSectionsB.test.tsx
 * =============================
 * ai-family-doc/sections-b.tsx — 成员星图 / 技术架构 / 路线图 (S5 直连单测)
 *
 * 覆盖范围:
 * - FamilyMembersSection: 8 位成员姓名/头衔/职责 + SectionHeader
 * - ArchitectureSection: 五层分层标签与技术项 + 层间 ChevronDown (i < length-1 两分支)
 * - RoadmapSection: 4 阶段 (completed/active/planned 三态文案) + 阶段条目
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FamilyMembersSection, ArchitectureSection, RoadmapSection,
} from "../components/ai-family-doc/sections-b";
import { FAMILY_MEMBERS, ROADMAP } from "../components/ai-family-doc/content";

describe("ai-family-doc/sections-b", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("FamilyMembersSection", () => {
    it("应渲染章节头与 8 位成员完整信息", () => {
      render(<FamilyMembersSection />);
      expect(screen.getByText("AI Family · 八位成员")).toBeInTheDocument();
      expect(screen.getByText("一言一语一协同 · 亦师亦友亦伯乐")).toBeInTheDocument();
      for (const m of FAMILY_MEMBERS) {
        expect(screen.getByText(m.name)).toBeInTheDocument();
        expect(screen.getByText(m.title)).toBeInTheDocument();
        expect(screen.getByText(m.role)).toBeInTheDocument();
      }
    });
  });

  describe("ArchitectureSection", () => {
    it("应渲染五层架构标签与代表技术项", () => {
      render(<ArchitectureSection />);
      expect(screen.getByText("技术架构")).toBeInTheDocument();
      expect(screen.getByText("五层分层架构 · 本地闭环部署 · 192.168.3.x:3118")).toBeInTheDocument();
      for (const label of ["表现层", "交互层", "业务层", "数据层", "集成层"]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
      for (const item of ["React 18", "Recharts", "AI Family 矩阵", "IndexedDB", "Ollama 本地"]) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    });

    it("层间应渲染 4 个 ChevronDown 连接符 (末层无)", () => {
      const { container } = render(<ArchitectureSection />);
      expect(container.querySelectorAll("svg.lucide-chevron-down")).toHaveLength(4);
    });
  });

  describe("RoadmapSection", () => {
    it("应渲染 4 阶段路线图与三态状态文案", () => {
      render(<RoadmapSection />);
      expect(screen.getByText("实施路线图")).toBeInTheDocument();
      expect(screen.getByText("分阶段推进 · 稳步进化 · 持续闭环")).toBeInTheDocument();
      for (const phase of ROADMAP) {
        expect(screen.getByText(phase.phase)).toBeInTheDocument();
        expect(screen.getByText(phase.title)).toBeInTheDocument();
      }
      // completed ×2 / active ×1 / planned ×1
      expect(screen.getAllByText("已完成")).toHaveLength(2);
      expect(screen.getAllByText("进行中")).toHaveLength(1);
      expect(screen.getAllByText("规划中")).toHaveLength(1);
    });

    it("应渲染阶段条目与节点圆点", () => {
      const { container } = render(<RoadmapSection />);
      expect(screen.getByText("八位AI成员交互中心（时钟环布局）")).toBeInTheDocument();
      expect(screen.getByText("成长轨迹可视化系统")).toBeInTheDocument();
      // 每阶段一个节点圆点
      const cards = container.querySelectorAll("div.absolute.left-4");
      expect(cards).toHaveLength(ROADMAP.length);
    });
  });
});
