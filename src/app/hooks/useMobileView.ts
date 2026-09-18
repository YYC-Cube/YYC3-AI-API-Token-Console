/**
 * useMobileView Hook
 * ==================
 * YYC³ 响应式布局 - 断点检测
 *
 * 断点定义：
 *   sm:  <768px   移动端（竖屏手机）
 *   md:  768-1023  平板端（竖屏平板）
 *   lg:  1024-1279 桌面端
 *   xl:  1280-1535 大桌面端
 *   2xl: ≥1536     超大屏
 */

import { useState, useEffect } from "react";
import type { Breakpoint, ViewState } from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1280) return "lg";
  if (width < 1536) return "xl";
  return "2xl";
}

function getViewState(width: number): ViewState {
  const bp = getBreakpoint(width);
  return {
    breakpoint: bp,
    isMobile: bp === "sm",
    isTablet: bp === "md",
    isDesktop: bp === "lg" || bp === "xl" || bp === "2xl",
    width,
    isTouch: typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  };
}

export function useMobileView(): ViewState {
  const [state, setState] = useState<ViewState>(() =>
    getViewState(typeof window !== "undefined" ? window.innerWidth : 1280)
  );

  useEffect(() => {
    let rafId: number;

    const handleResize = () => {
      // 使用 rAF 节流 resize 事件
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setState(getViewState(window.innerWidth));
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    // 初始化时也执行一次
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return state;
}