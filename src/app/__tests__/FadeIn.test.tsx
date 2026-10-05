/**
 * FadeIn.test.tsx (ai-family)
 * ============================
 * ai-family/FadeIn.tsx — 沙箱安全入场动画组件 (纯 CSS + setTimeout)
 *
 * 覆盖范围:
 * - 初始隐藏 + 方向位移
 * - delay 钳制 (上限 1200ms) 后显示
 * - direction=none / 各方向 transform
 * - onClick 透传
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FadeIn } from "../components/ai-family/FadeIn";

afterEach(() => {
  vi.useRealTimers();
});

describe("ai-family/FadeIn", () => {
  it("初始应隐藏且按方向位移 (默认 up)", () => {
    vi.useFakeTimers();
    render(<FadeIn><span>child</span></FadeIn>);
    const box = screen.getByText("child").parentElement!;
    expect(box.style.opacity).toBe("0");
    expect(box.style.transform).toBe("translateY(12px)");
  });

  it("延迟超上限时应钳制到 1200ms 后显示", () => {
    vi.useFakeTimers();
    render(<FadeIn delay={99}><span>child</span></FadeIn>);
    const box = screen.getByText("child").parentElement!;
    act(() => { vi.advanceTimersByTime(1199); });
    expect(box.style.opacity).toBe("0");
    act(() => { vi.advanceTimersByTime(1); });
    expect(box.style.opacity).toBe("1");
    expect(box.style.transform).toBe("none");
  });

  it("direction=left 应向右偏移入场, none 应无位移", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <FadeIn direction="left"><span>a</span></FadeIn>,
    );
    expect(screen.getByText("a").parentElement!.style.transform).toBe("translateX(12px)");

    rerender(<FadeIn direction="none"><span>a</span></FadeIn>);
    expect(screen.getByText("a").parentElement!.style.transform).toBe("none");
  });

  it("direction=down / right 应使用对应位移", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <FadeIn direction="down"><span>b</span></FadeIn>,
    );
    expect(screen.getByText("b").parentElement!.style.transform).toBe("translateY(-12px)");

    rerender(<FadeIn direction="right"><span>b</span></FadeIn>);
    expect(screen.getByText("b").parentElement!.style.transform).toBe("translateX(-12px)");
  });

  it("点击容器应透传 onClick", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<FadeIn onClick={onClick}><span>clickable</span></FadeIn>);
    fireEvent.click(screen.getByText("clickable").parentElement!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
