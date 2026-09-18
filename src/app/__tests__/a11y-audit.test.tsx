/**
 * a11y-audit.test.tsx
 * ====================
 * P1: axe-core 无障碍自动化检测 — WCAG 2.1 AA 级别
 *
 * 对核心 UI 原子组件进行 axe-core 扫描，确保：
 * - 对比度符合 AA 标准
 * - 图片有 alt 文本
 * - 交互元素可键盘访问
 * - ARIA 属性正确
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

// Mock react-router navigate
vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
}));

// ============================================================
//  GlassCard
// ============================================================

import { GlassCard } from "../components/GlassCard";

describe("GlassCard a11y", () => {
  it("应通过 axe-core 检测", async () => {
    const { container } = render(
      <GlassCard>
        <p>测试内容</p>
      </GlassCard>
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("可点击时应通过 a11y 检测", async () => {
    const { container } = render(
      <GlassCard onClick={() => {}} role="button" tabIndex={0}>
        <p>可点击卡片</p>
      </GlassCard>
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ============================================================
//  LanguageSwitcher
// ============================================================

import { LanguageSwitcher } from "../components/LanguageSwitcher";

// Mock useI18n
vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    locale: "zh-CN",
    setLocale: vi.fn(),
    t: (key: string) => key,
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  }),
  SUPPORTED_LOCALES: [
    { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
    { code: "en-US", label: "English", nativeLabel: "English" },
  ],
}));

describe("LanguageSwitcher a11y", () => {
  it("应通过 axe-core 检测", async () => {
    const { container } = render(<LanguageSwitcher />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ============================================================
//  ConnectionStatus
// ============================================================

import { ConnectionStatus } from "../components/ConnectionStatus";

describe("ConnectionStatus a11y", () => {
  it("connected 状态应通过 a11y 检测", async () => {
    const { container } = render(
      <ConnectionStatus
        state="connected"
        reconnectCount={0}
        lastSyncTime="10:30:00"
        onReconnect={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("disconnected 状态应通过 a11y 检测", async () => {
    const { container } = render(
      <ConnectionStatus
        state="disconnected"
        reconnectCount={3}
        lastSyncTime="--:--"
        onReconnect={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
