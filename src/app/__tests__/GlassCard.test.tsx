/**
 * GlassCard.test.tsx
 * ===================
 * GlassCard 组件 - 渲染测试
 *
 * 覆盖范围:
 * - 子元素渲染
 * - 自定义 className 注入
 * - glowColor 内联样式
 * - onClick 事件触发
 * - cursor-pointer 条件样式
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlassCard } from "../components/GlassCard";

describe("GlassCard", () => {
  it("应正确渲染子元素", () => {
    render(
      <GlassCard>
        <span data-testid="child">Hello YYC3</span>
      </GlassCard>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello YYC3")).toBeInTheDocument();
  });

  it("应应用自定义 className", () => {
    const { container } = render(
      <GlassCard className="p-6 mt-4">Content</GlassCard>
    );
    const card = container.firstElementChild!;
    expect(card.className).toContain("p-6");
    expect(card.className).toContain("mt-4");
  });

  it("应应用默认玻璃效果样式", () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("backdrop-blur-xl");
    expect(card.className).toContain("rounded-xl");
  });

  it("应在设置 glowColor 时应用 boxShadow 内联样式", () => {
    const { container } = render(
      <GlassCard glowColor="rgba(0,212,255,0.3)">Content</GlassCard>
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toContain("rgba(0,212,255,0.3)");
  });

  it("未设置 glowColor 时不应有内联 boxShadow", () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toBe("");
  });

  it("有 onClick 时应可点击且包含 cursor-pointer", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <GlassCard onClick={handleClick}>Clickable</GlassCard>
    );
    const card = container.firstElementChild!;
    expect(card.className).toContain("cursor-pointer");

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("无 onClick 时不应包含 cursor-pointer", () => {
    const { container } = render(<GlassCard>Not clickable</GlassCard>);
    const card = container.firstElementChild!;
    expect(card.className).not.toContain("cursor-pointer");
  });

  it("应支持嵌套复杂子组件", () => {
    render(
      <GlassCard>
        <div data-testid="header">Header</div>
        <div data-testid="body">Body</div>
        <div data-testid="footer">Footer</div>
      </GlassCard>
    );
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("body")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
