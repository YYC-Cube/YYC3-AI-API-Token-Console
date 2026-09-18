/**
 * PWAInstallPrompt.test.tsx
 * ==========================
 * PWAInstallPrompt 组件 - 渲染测试
 *
 * 覆盖范围:
 * - 可安装时显示横幅
 * - 已安装时隐藏
 * - 不可安装时隐藏
 * - 安装按钮触发
 * - 关闭按钮触发
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock useInstallPrompt
const mockPromptInstall = vi.fn();
const mockDismiss = vi.fn();
const mockUseInstallPrompt = vi.fn();

vi.mock("../hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => mockUseInstallPrompt(),
}));

import { PWAInstallPrompt } from "../components/PWAInstallPrompt";

describe("PWAInstallPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 显示/隐藏
  // ----------------------------------------------------------

  describe("显示/隐藏逻辑", () => {
    it("可安装时应显示横幅", () => {
      mockUseInstallPrompt.mockReturnValue({
        isInstalled: false,
        canInstall: true,
        promptInstall: mockPromptInstall,
        dismiss: mockDismiss,
      });

      render(<PWAInstallPrompt />);
      expect(screen.getByText("安装 YYC3 Dashboard")).toBeInTheDocument();
    });

    it("已安装时不应显示", () => {
      mockUseInstallPrompt.mockReturnValue({
        isInstalled: true,
        canInstall: true,
        promptInstall: mockPromptInstall,
        dismiss: mockDismiss,
      });

      const { container } = render(<PWAInstallPrompt />);
      expect(container.innerHTML).toBe("");
    });

    it("不可安装时不应显示", () => {
      mockUseInstallPrompt.mockReturnValue({
        isInstalled: false,
        canInstall: false,
        promptInstall: mockPromptInstall,
        dismiss: mockDismiss,
      });

      const { container } = render(<PWAInstallPrompt />);
      expect(container.innerHTML).toBe("");
    });
  });

  // ----------------------------------------------------------
  // 内容
  // ----------------------------------------------------------

  describe("内容渲染", () => {
    beforeEach(() => {
      mockUseInstallPrompt.mockReturnValue({
        isInstalled: false,
        canInstall: true,
        promptInstall: mockPromptInstall,
        dismiss: mockDismiss,
      });
    });

    it("应显示安装描述文案", () => {
      render(<PWAInstallPrompt />);
      expect(
        screen.getByText(/添加到桌面.*原生应用体验.*离线使用/)
      ).toBeInTheDocument();
    });

    it("应包含安装到桌面按钮", () => {
      render(<PWAInstallPrompt />);
      expect(screen.getByText("安装到桌面")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 交互
  // ----------------------------------------------------------

  describe("交互", () => {
    beforeEach(() => {
      mockUseInstallPrompt.mockReturnValue({
        isInstalled: false,
        canInstall: true,
        promptInstall: mockPromptInstall,
        dismiss: mockDismiss,
      });
    });

    it("点击安装按钮应触发 promptInstall", () => {
      render(<PWAInstallPrompt />);
      fireEvent.click(screen.getByText("安装到桌面"));
      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
    });

    it("点击关闭按钮应触发 dismiss", () => {
      render(<PWAInstallPrompt />);
      // 关闭按钮是 X 图标
      const buttons = screen.getAllByRole("button");
      const closeBtn = buttons.find(
        (b) => !b.textContent?.includes("安装到桌面")
      );
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn!);
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
