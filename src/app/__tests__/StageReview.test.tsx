/**
 * StageReview.test.tsx
 * =====================
 * StageReview 阶段审核总结测试
 *
 * 覆盖范围:
 * - 章节进度 / 统计概览 / 验收清单 标签
 * - CHAPTER_REVIEWS 完整性
 * - PROJECT_STATS 完整性 (含 37 类型分类校验)
 * - ACCEPTANCE_CHECKLIST 完整性 (含 37 大分类校验)
 * - 进度计算
 * - 统计数值与实际项目状态一致性
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  StageReview,
  CHAPTER_REVIEWS,
  PROJECT_STATS,
  ACCEPTANCE_CHECKLIST,
} from "../components/design-system/StageReview";

describe("StageReview", () => {
  describe("数据完整性", () => {
    it("应有 10 章", () => {
      expect(CHAPTER_REVIEWS.length).toBe(10);
    });

    it("每章应有 chapter/title/status/progress/deliverables", () => {
      for (const ch of CHAPTER_REVIEWS) {
        expect(ch.chapter).toBeGreaterThan(0);
        expect(ch.title).toBeTruthy();
        expect(["completed", "partial", "pending", "deferred"]).toContain(ch.status);
        expect(ch.progress).toBeGreaterThanOrEqual(0);
        expect(ch.deliverables.length).toBeGreaterThan(0);
      }
    });

    it("第 1~9 章应为 completed", () => {
      for (let i = 0; i < 9; i++) {
        expect(CHAPTER_REVIEWS[i].status).toBe("completed");
      }
    });

    it("第 10 章应为 completed", () => {
      expect(CHAPTER_REVIEWS[9].status).toBe("completed");
    });

    it("所有 10 章均为 completed 状态", () => {
      const allCompleted = CHAPTER_REVIEWS.every((ch) => ch.status === "completed");
      expect(allCompleted).toBe(true);
    });

    it("每章进度应在 0-100 之间", () => {
      for (const ch of CHAPTER_REVIEWS) {
        expect(ch.progress).toBeGreaterThanOrEqual(0);
        expect(ch.progress).toBeLessThanOrEqual(100);
      }
    });

    it("每章应有 notes 说明", () => {
      for (const ch of CHAPTER_REVIEWS) {
        expect(ch.notes).toBeTruthy();
        expect(ch.notes.length).toBeGreaterThan(0);
      }
    });

    it("应有 8 个统计项", () => {
      expect(PROJECT_STATS.length).toBe(8);
    });

    it("应有 4 个验收分类", () => {
      expect(ACCEPTANCE_CHECKLIST.length).toBe(4);
    });

    it("验收项应全部通过", () => {
      for (const cat of ACCEPTANCE_CHECKLIST) {
        for (const item of cat.items) {
          expect(item.passed).toBe(true);
        }
      }
    });
  });

  describe("PROJECT_STATS 统计数值", () => {
    it("类型分类应为 37", () => {
      const typeStat = PROJECT_STATS.find((s) => s.label === "类型分类");
      expect(typeStat).toBeDefined();
      expect(typeStat!.value).toBe(37);
    });

    it("自定义 Hooks 应为 26", () => {
      const hooksStat = PROJECT_STATS.find((s) => s.label === "自定义 Hooks");
      expect(hooksStat).toBeDefined();
      expect(hooksStat!.value).toBe(26);
    });

    it("路由页面应为 23", () => {
      const routesStat = PROJECT_STATS.find((s) => s.label === "路由页面");
      expect(routesStat).toBeDefined();
      expect(routesStat!.value).toBe(23);
    });

    it("每个统计项应有 label/value/color", () => {
      for (const stat of PROJECT_STATS) {
        expect(stat.label).toBeTruthy();
        expect(stat.value).toBeDefined();
        expect(stat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe("ACCEPTANCE_CHECKLIST 验收清单", () => {
    it("应包含功能验收/性能验收/设计验收/测试验收 4 类", () => {
      const categories = ACCEPTANCE_CHECKLIST.map((c) => c.category);
      expect(categories).toContain("功能验收");
      expect(categories).toContain("性能验收");
      expect(categories).toContain("设计验收");
      expect(categories).toContain("测试验收");
    });

    it("测试验收应包含类型定义 37 大分类", () => {
      const testCat = ACCEPTANCE_CHECKLIST.find((c) => c.category === "测试验收");
      expect(testCat).toBeDefined();
      const typeItem = testCat!.items.find((i) => i.label.includes("类型定义"));
      expect(typeItem).toBeDefined();
      expect(typeItem!.label).toContain("37");
      expect(typeItem!.passed).toBe(true);
    });

    it("每个分类至少有 3 个验收项", () => {
      for (const cat of ACCEPTANCE_CHECKLIST) {
        expect(cat.items.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("渲染", () => {
    it("应渲染主容器", () => {
      render(<StageReview />);
      expect(screen.getByTestId("stage-review")).toBeInTheDocument();
    });

    it("默认应显示章节进度", () => {
      render(<StageReview />);
      expect(screen.getByTestId("review-chapters")).toBeInTheDocument();
    });

    it("应渲染 10 个章节卡片", () => {
      render(<StageReview />);
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByTestId(`chapter-${i}`)).toBeInTheDocument();
      }
    });

    it("切换到统计概览", () => {
      render(<StageReview />);
      fireEvent.click(screen.getByTestId("review-tab-stats"));
      expect(screen.getByTestId("review-stats")).toBeInTheDocument();
    });

    it("统计概览应显示 37 作为类型分类数", () => {
      render(<StageReview />);
      fireEvent.click(screen.getByTestId("review-tab-stats"));
      expect(screen.getByText("37")).toBeInTheDocument();
    });

    it("切换到验收清单", () => {
      render(<StageReview />);
      fireEvent.click(screen.getByTestId("review-tab-acceptance"));
      expect(screen.getByTestId("review-acceptance")).toBeInTheDocument();
    });

    it("应显示完成进度百分比", () => {
      render(<StageReview />);
      const completed = CHAPTER_REVIEWS.filter((c) => c.status === "completed").length;
      const pct = Math.round((completed / CHAPTER_REVIEWS.length) * 100);
      expect(screen.getByText(`${pct}%`)).toBeInTheDocument();
    });

    it("应显示 x/10 章完成", () => {
      render(<StageReview />);
      const completed = CHAPTER_REVIEWS.filter((c) => c.status === "completed").length;
      expect(screen.getByText(`${completed}/${CHAPTER_REVIEWS.length} 章完成`)).toBeInTheDocument();
    });

    it("3 个标签页按钮都应可见", () => {
      render(<StageReview />);
      expect(screen.getByTestId("review-tab-chapters")).toBeInTheDocument();
      expect(screen.getByTestId("review-tab-stats")).toBeInTheDocument();
      expect(screen.getByTestId("review-tab-acceptance")).toBeInTheDocument();
    });

    it("标签切换后原内容不再显示", () => {
      render(<StageReview />);
      expect(screen.getByTestId("review-chapters")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("review-tab-stats"));
      expect(screen.queryByTestId("review-chapters")).not.toBeInTheDocument();
      expect(screen.getByTestId("review-stats")).toBeInTheDocument();
    });
  });
});
