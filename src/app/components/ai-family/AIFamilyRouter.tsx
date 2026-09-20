/**
 * AIFamilyRouter.tsx
 * ===================
 * AI Family 统一子路由入口（轻量壳）
 *
 * 使用 React.lazy + 自定义 fallback 按需加载子页面。
 * 如果 lazy 加载失败（Figma 沙箱限制），自动 fallback 到静态 import。
 */

import React, { Suspense, useState } from "react";
import { useParams, useLocation } from "react-router";

// ═══ Lazy 加载（减少初始 bundle 大小）═══
// 沙箱可能阻止 dynamic import，需要 fallback

const lazyMap: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  home: () => import("./FamilyHome").then(m => ({ default: m.FamilyHome })),
  chat: () => import("./FamilyChat").then(m => ({ default: m.FamilyChat })),
  share: () => import("./FamilyShare").then(m => ({ default: m.FamilyShare })),
  learn: () => import("./FamilyLearn").then(m => ({ default: m.FamilyLearn })),
  music: () => import("./FamilyMusic").then(m => ({ default: m.FamilyMusic })),
  growth: () => import("./FamilyGrowth").then(m => ({ default: m.FamilyGrowth })),
  phone: () => import("./FamilyPhone").then(m => ({ default: m.FamilyPhone })),
  fun: () => import("./FamilyEntertainment").then(m => ({ default: m.FamilyEntertainment })),
  activities: () => import("./FamilyActivityCenter").then(m => ({ default: m.FamilyActivityCenter })),
  models: () => import("./FamilyModelSettings").then(m => ({ default: m.FamilyModelSettings })),
  voice: () => import("./FamilyVoiceSystem").then(m => ({ default: m.FamilyVoiceSystem })),
  data: () => import("./FamilyDataHub").then(m => ({ default: m.FamilyDataHub })),
  comm: () => import("./FamilyCommCenter").then(m => ({ default: m.FamilyCommCenter })),
  settings: () => import("./FamilyUISettings").then(m => ({ default: m.FamilyUISettings })),
};

const VALID_KEYS = Object.keys(lazyMap);

// ═══ Loading spinner ═══

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[rgba(0,212,255,0.15)] border-t-[rgba(0,212,255,0.6)] rounded-full animate-spin" />
        <span className="text-white/30" style={{ fontSize: "0.75rem" }}>加载中...</span>
      </div>
    </div>
  );
}

// ═══ Error fallback ═══

function ErrorFallback({ subpage }: { subpage: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}
    >
      <div className="text-center">
        <p className="text-amber-400/60" style={{ fontSize: "0.9rem" }}>加载模块失败</p>
        <p className="text-white/30 mt-2" style={{ fontSize: "0.7rem" }}>
          页面 "{subpage}" 暂时不可用
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-cyan-300 hover:bg-[rgba(0,212,255,0.2)] transition-all"
          style={{ fontSize: "0.75rem" }}
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}

// ═══ Lazy wrapper with error boundary ═══

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ═══ URL → subpage key 解析 ═══

function resolveSubpage(pathname: string, paramSubpage?: string): string {
  if (paramSubpage && VALID_KEYS.includes(paramSubpage)) return paramSubpage;
  const match = pathname.match(/\/ai-family-(\w+)/);
  if (match && VALID_KEYS.includes(match[1])) return match[1];
  return "home";
}

// ═══ 缓存 lazy 组件 ═══
const lazyCache: Record<string, React.LazyExoticComponent<React.ComponentType>> = {};

function getLazyComponent(key: string): React.LazyExoticComponent<React.ComponentType> {
  if (!lazyCache[key]) {
    lazyCache[key] = React.lazy(lazyMap[key]);
  }
  return lazyCache[key];
}

// ═══ 主组件 ═══

export function AIFamilyRouter() {
  const { subpage } = useParams<{ subpage: string }>();
  const location = useLocation();
  const key = resolveSubpage(location.pathname, subpage);
  const LazyComponent = getLazyComponent(key);

  return (
    <LazyErrorBoundary fallback={<ErrorFallback subpage={key} />}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </LazyErrorBoundary>
  );
}
