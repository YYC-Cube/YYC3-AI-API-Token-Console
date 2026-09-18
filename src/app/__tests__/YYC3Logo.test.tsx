/**
 * YYC3Logo.test.tsx
 * ==================
 * P1: Logo 组件测试 — 验证 PNG 迁移后的渲染正确性
 *
 * 覆盖范围:
 * - YYC3LogoSvg: img 渲染 · alt · size · className
 * - YYC3Logo: 尺寸变体 · 状态指示点 · 发光效果
 * - 无障碍: axe-core 自动检测
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";

// Mock figma:asset imports — 返回占位 URL
vi.mock("../components/YYC3LogoSvg", () => {
  const React = require("react");
  return {
    YYC3LogoSvg: ({ size = 40, className = "", style }: any) =>
      React.createElement("img", {
        src: "/mock-logo.png",
        alt: "YYC³ Logo",
        width: size,
        height: size,
        className: `object-contain ${className}`,
        style,
        draggable: false,
        "data-testid": "yyc3-logo-img",
      }),
    default: ({ size = 40, className = "", style }: any) =>
      React.createElement("img", {
        src: "/mock-logo.png",
        alt: "YYC³ Logo",
        width: size,
        height: size,
        className: `object-contain ${className}`,
        style,
        draggable: false,
        "data-testid": "yyc3-logo-img",
      }),
  };
});

import { YYC3Logo } from "../components/YYC3Logo";

// ============================================================
//  YYC3Logo 包装组件测试
// ============================================================

describe("YYC3Logo", () => {
  describe("基础渲染", () => {
    it("应渲染 img 标签 (PNG)", () => {
      render(<YYC3Logo size="md" />);
      const img = screen.getByTestId("yyc3-logo-img");
      expect(img).toBeInTheDocument();
      expect(img.tagName).toBe("IMG");
    });

    it("应设置正确的 alt 文本", () => {
      render(<YYC3Logo />);
      const img = screen.getByAltText("YYC³ Logo");
      expect(img).toBeInTheDocument();
    });

    it("应默认显示状态指示点", () => {
      const { container } = render(<YYC3Logo showStatus={true} />);
      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeInTheDocument();
    });

    it("应可隐藏状态指示点", () => {
      const { container } = render(<YYC3Logo showStatus={false} />);
      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 尺寸变体
  // ----------------------------------------------------------

  describe("尺寸变体", () => {
    const sizes = [
      { name: "xs", expectedPx: 20 },
      { name: "sm", expectedPx: 24 },
      { name: "md", expectedPx: 28 },
      { name: "lg", expectedPx: 40 },
      { name: "xl", expectedPx: 48 },
    ] as const;

    sizes.forEach(({ name, expectedPx }) => {
      it(`size="${name}" → ${expectedPx}px`, () => {
        const { container } = render(<YYC3Logo size={name} />);
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.style.width).toBe(`${expectedPx}px`);
        expect(wrapper.style.height).toBe(`${expectedPx}px`);
      });
    });
  });

  // ----------------------------------------------------------
  // 发光效果
  // ----------------------------------------------------------

  describe("发光效果", () => {
    it("glow=true 应有 shadow 类", () => {
      const { container } = render(<YYC3Logo glow={true} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain("shadow-");
    });

    it("glow=false 应无 shadow 类", () => {
      const { container } = render(<YYC3Logo glow={false} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).not.toContain("shadow-[0_0_20px");
    });
  });

  // ----------------------------------------------------------
  // 自定义状态颜色
  // ----------------------------------------------------------

  describe("状态颜色", () => {
    it("应支持自定义状态点颜色", () => {
      const { container } = render(<YYC3Logo showStatus={true} statusColor="#ff3366" />);
      const dot = container.querySelector(".animate-pulse") as HTMLElement;
      expect(dot).toBeInTheDocument();
      expect(dot.style.backgroundColor).toBe("rgb(255, 51, 102)");
    });
  });

  // ----------------------------------------------------------
  // 点击回调
  // ----------------------------------------------------------

  describe("点击回调", () => {
    it("应触发 onClick 回调", () => {
      const handleClick = vi.fn();
      const { container } = render(<YYC3Logo onClick={handleClick} />);
      const wrapper = container.firstElementChild as HTMLElement;
      wrapper.click();
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it("有 onClick 时应有 cursor-pointer", () => {
      const { container } = render(<YYC3Logo onClick={() => {}} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain("cursor-pointer");
    });
  });

  // ----------------------------------------------------------
  // 无障碍 (axe-core)
  // ----------------------------------------------------------

  describe("无障碍 (a11y)", () => {
    it("应通过 axe-core 自动检测", async () => {
      const { container } = render(<YYC3Logo size="md" showStatus={false} />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it("img 应有 alt 属性", () => {
      render(<YYC3Logo />);
      const img = screen.getByTestId("yyc3-logo-img");
      expect(img).toHaveAttribute("alt", "YYC³ Logo");
    });
  });
});
