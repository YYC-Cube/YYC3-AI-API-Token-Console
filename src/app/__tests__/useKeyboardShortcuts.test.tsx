/**
 * useKeyboardShortcuts.test.tsx
 * ==============================
 * useKeyboardShortcuts Hook - 全局快捷键系统测试
 *
 * 覆盖范围:
 * - 快捷键列表
 * - Cmd/Ctrl+Shift+O → 操作中心
 * - Cmd/Ctrl+Shift+A → 一键跟进
 * - Cmd/Ctrl+Shift+P → 巡查面板
 * - Cmd/Ctrl+Shift+L → 终端
 * - Cmd/Ctrl+Shift+F → 文件管理
 * - Cmd/Ctrl+K → 搜索回调
 * - Esc → onEscape 回调
 * - enabled=false 时不响应
 * - 输入框内忽略快捷键
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts, SHORTCUT_LIST } from "../hooks/useKeyboardShortcuts";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn() },
}));

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("快捷键列表", () => {
    it("应返回 7 个快捷键", () => {
      renderHook(() => useKeyboardShortcuts());
      expect(SHORTCUT_LIST.length).toBe(7);
    });

    it("应包含操作中心快捷键", () => {
      const found = SHORTCUT_LIST.find((s) => s.id === "operations");
      expect(found).toBeDefined();
      expect(found!.description).toContain("操作中心");
    });

    it("应包含文件管理快捷键", () => {
      const found = SHORTCUT_LIST.find((s) => s.id === "files");
      expect(found).toBeDefined();
    });
  });

  describe("导航快捷键", () => {
    it("Ctrl+Shift+O 应导航到 /operations", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKeyDown("O", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).toHaveBeenCalledWith("/operations");
    });

    it("Ctrl+Shift+A 应导航到 /follow-up", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKeyDown("A", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).toHaveBeenCalledWith("/follow-up");
    });

    it("Ctrl+Shift+P 应导航到 /patrol", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKeyDown("P", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).toHaveBeenCalledWith("/patrol");
    });

    it("Ctrl+Shift+L 应导航到 /terminal", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKeyDown("L", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).toHaveBeenCalledWith("/terminal");
    });

    it("Ctrl+Shift+F 应导航到 /files", () => {
      renderHook(() => useKeyboardShortcuts());
      fireKeyDown("F", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).toHaveBeenCalledWith("/files");
    });
  });

  describe("搜索快捷键", () => {
    it("Ctrl+K 应触发 onSearch 回调", () => {
      const onSearch = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSearch }));
      fireKeyDown("k", { ctrlKey: true });
      expect(onSearch).toHaveBeenCalled();
    });
  });

  describe("Escape 键", () => {
    it("Esc 应触发 onEscape 回调", () => {
      const onEscape = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onEscape }));
      fireKeyDown("Escape");
      expect(onEscape).toHaveBeenCalled();
    });
  });

  describe("enabled=false", () => {
    it("禁用时不应响应快捷键", () => {
      renderHook(() => useKeyboardShortcuts({ enabled: false }));
      fireKeyDown("O", { ctrlKey: true, shiftKey: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("输入框内", () => {
    it("输入框内应忽略导航快捷键", () => {
      renderHook(() => useKeyboardShortcuts());

      const input = document.createElement("input");
      document.body.appendChild(input);

      const event = new KeyboardEvent("keydown", {
        key: "O",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });
      document.dispatchEvent(event);

      expect(mockNavigate).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it("输入框内 Esc 仍应触发 onEscape", () => {
      const onEscape = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onEscape }));

      const input = document.createElement("input");
      document.body.appendChild(input);

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });
      document.dispatchEvent(event);

      expect(onEscape).toHaveBeenCalled();
      document.body.removeChild(input);
    });
  });
});
