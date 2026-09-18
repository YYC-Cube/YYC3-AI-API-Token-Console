/**
 * OfflineIndicator.test.tsx
 * ==========================
 * OfflineIndicator 组件 - 渲染测试
 *
 * 覆盖范围:
 * - 在线状态不显示
 * - 离线状态显示红色提示
 * - 恢复在线显示绿色提示
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock useOfflineMode
const mockUseOfflineMode = vi.fn();

vi.mock("../hooks/useOfflineMode", () => ({
  useOfflineMode: () => mockUseOfflineMode(),
}));

import { OfflineIndicator } from "../components/OfflineIndicator";

describe("OfflineIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("在线状态应不渲染任何内容", () => {
    mockUseOfflineMode.mockReturnValue({
      isOnline: true,
      lastSyncTime: null,
      pendingSync: false,
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("离线状态应显示'离线模式'文本", () => {
    mockUseOfflineMode.mockReturnValue({
      isOnline: false,
      lastSyncTime: null,
      pendingSync: false,
    });

    render(<OfflineIndicator />);
    expect(screen.getByText("离线模式")).toBeInTheDocument();
  });

  it("离线且有同步时间应显示上次同步时间", () => {
    const syncTime = new Date("2026-02-25T14:30:00");
    mockUseOfflineMode.mockReturnValue({
      isOnline: false,
      lastSyncTime: syncTime,
      pendingSync: false,
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/上次同步/)).toBeInTheDocument();
  });

  it("恢复在线后应显示'网络已恢复'", async () => {
    // 先渲染为离线
    mockUseOfflineMode.mockReturnValue({
      isOnline: false,
      lastSyncTime: null,
      pendingSync: false,
    });

    const { rerender } = render(<OfflineIndicator />);
    expect(screen.getByText("离线模式")).toBeInTheDocument();

    // 切换为在线
    mockUseOfflineMode.mockReturnValue({
      isOnline: true,
      lastSyncTime: null,
      pendingSync: false,
    });

    rerender(<OfflineIndicator />);

    expect(screen.getByText("网络已恢复")).toBeInTheDocument();
  });

  it("恢复在线且同步中应显示同步状态", () => {
    // 先离线
    mockUseOfflineMode.mockReturnValue({
      isOnline: false,
      lastSyncTime: null,
      pendingSync: false,
    });

    const { rerender } = render(<OfflineIndicator />);

    // 恢复在线 + 同步中
    mockUseOfflineMode.mockReturnValue({
      isOnline: true,
      lastSyncTime: null,
      pendingSync: true,
    });

    rerender(<OfflineIndicator />);

    expect(screen.getByText("网络已恢复")).toBeInTheDocument();
    expect(screen.getByText("同步中...")).toBeInTheDocument();
  });
});
