/**
 * ai-family-doc-shared.test.tsx
 * ==============================
 * ai-family-doc/shared.tsx — FadeIn (入场动画) + SectionHeader (章节标题)
 *
 * 覆盖范围:
 * - FadeIn: 初始隐藏 → 延迟(钳制 800ms)后显示
 * - SectionHeader: 图标圆徽底色 / 标题 / 副题 (hexToRgb 经 content mock)
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("../components/ai-family-doc/content", () => ({
  hexToRgb: (hex: string) => (hex === "#00d4ff" ? [0, 212, 255] : [255, 255, 255]),
}));

import { FadeIn, SectionHeader } from "../components/ai-family-doc/shared";

const StubIcon = () => <svg data-testid="section-icon" />;

afterEach(() => {
  vi.useRealTimers();
});

describe("ai-family-doc/shared", () => {
  describe("FadeIn", () => {
    it("初始隐藏, 延迟钳制 800ms 后显示", () => {
      vi.useFakeTimers();
      render(<FadeIn delay={50}><span>doc-child</span></FadeIn>);
      const box = screen.getByText("doc-child").parentElement!;
      expect(box.style.opacity).toBe("0");
      expect(box.style.transform).toBe("translateY(10px)");
      act(() => { vi.advanceTimersByTime(800); });
      expect(box.style.opacity).toBe("1");
      expect(box.style.transform).toBe("translateY(0)");
    });

    it("点击容器应透传 onClick", () => {
      vi.useFakeTimers();
      const onClick = vi.fn();
      render(<FadeIn onClick={onClick}><span>tap</span></FadeIn>);
      fireEvent.click(screen.getByText("tap").parentElement!);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("SectionHeader", () => {
    it("应渲染图标圆徽 / 标题 / 副题, 底色来自 hexToRgb", () => {
      render(
        <SectionHeader
          icon={StubIcon}
          title="核心特性"
          subtitle="了解 YYC³ 家族"
          color="#00d4ff"
        />,
      );
      expect(screen.getByTestId("section-icon")).toBeInTheDocument();
      expect(screen.getByText("核心特性")).toBeInTheDocument();
      expect(screen.getByText("了解 YYC³ 家族")).toBeInTheDocument();
      const badge = screen.getByTestId("section-icon").closest("div")!;
      expect(badge.style.background).toContain("rgba(0, 212, 255, 0.1)");
      expect(badge.style.border).toContain("rgba(0, 212, 255, 0.3)");
    });
  });
});
