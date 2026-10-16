/**
 * useMobileView.test.tsx
 * ======================
 * 响应式断点 Hook 直接单测 (S4 维度 8 覆盖缺口补齐)
 *
 * 覆盖:
 * - 五断点矩阵 (sm/md/lg/xl/2xl → isMobile/isTablet/isDesktop)
 * - resize 事件驱动重算 (rAF 节流)
 * - isTouch 检测
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMobileView } from "../hooks/useMobileView";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
}

/** resize 派发 + rAF 节流帧落定 */
async function resizeTo(width: number) {
  setWidth(width);
  await act(async () => {
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 30));
  });
}

function setTouchPoints(n: number) {
  Object.defineProperty(navigator, "maxTouchPoints", { value: n, configurable: true });
}

describe("useMobileView 断点检测", () => {
  beforeEach(() => {
    setTouchPoints(0);
  });

  it.each([
    [375, "sm", { isMobile: true, isTablet: false, isDesktop: false }],
    [800, "md", { isMobile: false, isTablet: true, isDesktop: false }],
    [1100, "lg", { isMobile: false, isTablet: false, isDesktop: true }],
    [1300, "xl", { isMobile: false, isTablet: false, isDesktop: true }],
    [1600, "2xl", { isMobile: false, isTablet: false, isDesktop: true }],
  ] as const)("宽度 %i → 断点 %s", (width, bp, flags) => {
    setWidth(width);
    const { result } = renderHook(() => useMobileView());
    expect(result.current.breakpoint).toBe(bp);
    expect(result.current.isMobile).toBe(flags.isMobile);
    expect(result.current.isTablet).toBe(flags.isTablet);
    expect(result.current.isDesktop).toBe(flags.isDesktop);
    expect(result.current.width).toBe(width);
  });

  it("resize 事件应触发断点重算 (rAF 节流后)", async () => {
    await resizeTo(375);
    const { result } = renderHook(() => useMobileView());
    expect(result.current.isMobile).toBe(true);
    await resizeTo(1300);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe("xl");
  });

  it("isTouch 按 maxTouchPoints 能力判定", () => {
    // jsdom 环境 window 自带 ontouchstart 键 (环境事实), "无触点 false" 分支依赖
    // 无 ontouchstart 的真机形态, 单测域不可构造 — 本用例覆盖 maxTouchPoints 驱动分支
    setTouchPoints(2);
    setWidth(1100);
    const { result } = renderHook(() => useMobileView());
    expect(result.current.isTouch).toBe(true);
  });
});
