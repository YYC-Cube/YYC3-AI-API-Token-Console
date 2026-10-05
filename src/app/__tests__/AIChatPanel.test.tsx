/**
 * AIChatPanel.test.tsx
 * ====================
 * IDE AI 编程交互面板测试
 *
 * 覆盖范围:
 * - mock 聊天历史渲染 (system/user/assistant)
 * - 6 个快捷操作按钮 + 预设 prompt 发送
 * - 发送: 空输入禁用 / Enter 发送 / Shift+Enter 不发送 / 按钮发送
 * - AI 模拟回复 (fake timers 推进 setTimeout)
 * - 附件菜单开合
 * - 复制按钮透传 clipboard.writeText
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AIChatPanel } from "../components/ide/AIChatPanel";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

const mockI18n: I18nContextValue = {
  locale: "zh-CN",
  setLocale: vi.fn(),
  t: (key: string) => getNestedValue(zhCN as Record<string, any>, key),
  locales: [],
};

function renderPanel() {
  return render(
    <I18nContext.Provider value={mockI18n}>
      <AIChatPanel />
    </I18nContext.Provider>
  );
}

/** 输入区两个无标题按钮: [附件 Plus, 发送 Send] */
function getInputAreaButtons(textarea: HTMLElement) {
  return Array.from(textarea.closest("div.flex")!.querySelectorAll("button"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AIChatPanel", () => {
  describe("静态渲染", () => {
    it("应渲染 mock 聊天历史三种角色", () => {
      renderPanel();
      expect(screen.getByText(/YYC3 AI 编程助手已就绪/)).toBeInTheDocument();
      expect(screen.getByText(/帮我创建一个新的 React 组件/)).toBeInTheDocument();
      expect(screen.getByText(/NodeStatusCard/)).toBeInTheDocument();
    });

    it("应渲染 6 个快捷操作", () => {
      renderPanel();
      expect(screen.getByText("Explain")).toBeInTheDocument();
      expect(screen.getByText("Fix Bug")).toBeInTheDocument();
      expect(screen.getByText("Optimize")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Refactor")).toBeInTheDocument();
      expect(screen.getByText("Generate")).toBeInTheDocument();
    });

    it("输入框 placeholder 为 向 AI 提问...", () => {
      renderPanel();
      expect(screen.getByPlaceholderText("向 AI 提问...")).toBeInTheDocument();
    });
  });

  describe("发送消息", () => {
    it("空输入时发送按钮禁用且点击无效", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("向 AI 提问...");
      const [_, sendBtn] = getInputAreaButtons(textarea);
      expect(sendBtn).toBeDisabled();
      fireEvent.click(sendBtn);
      expect(screen.queryByText(/收到！正在分析/)).not.toBeInTheDocument();
    });

    it("Enter 发送用户消息并清空输入", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("向 AI 提问...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "请解释这段代码" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(screen.getByText("请解释这段代码")).toBeInTheDocument();
      expect(textarea.value).toBe("");
      act(() => vi.advanceTimersByTime(2500));
      expect(screen.getByText(/React 函数组件/)).toBeInTheDocument();
    });

    it("Shift+Enter 不发送", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("向 AI 提问...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "草稿内容" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      // 仅 textarea 自身含草稿文本, 未新增用户消息气泡
      expect(screen.getAllByText("草稿内容")).toHaveLength(1);
      expect(textarea.value).toBe("草稿内容");
    });

    it("点击发送按钮发送并收到 AI 回复", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("向 AI 提问...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "请为这段代码生成单元测试" } });
      const [, sendBtn] = getInputAreaButtons(textarea);
      fireEvent.click(sendBtn);
      act(() => vi.advanceTimersByTime(2500));
      expect(screen.getByText(/Vitest 单元测试/)).toBeInTheDocument();
    });

    it("快捷操作发送预设 prompt", () => {
      renderPanel();
      fireEvent.click(screen.getByText("Explain"));
      expect(screen.getByText("请解释这段代码的功能和逻辑")).toBeInTheDocument();
    });

    it("非预设问题走通用回复", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("向 AI 提问...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "你好呀" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      act(() => vi.advanceTimersByTime(2500));
      expect(screen.getByText(/收到！正在分析你的需求/)).toBeInTheDocument();
    });
  });

  describe("附件菜单", () => {
    it("点击 Plus 打开菜单, 选择后关闭", () => {
      const { container } = renderPanel();
      const plusBtn = container.querySelector("div.relative > button")!;
      fireEvent.click(plusBtn);
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
      expect(screen.getByText("Figma File")).toBeInTheDocument();
      fireEvent.click(screen.getByText("GitHub Link"));
      expect(screen.queryByText("Upload Image")).not.toBeInTheDocument();
    });

    it("点击遮罩关闭菜单", () => {
      const { container } = renderPanel();
      fireEvent.click(container.querySelector("div.relative > button")!);
      const backdrop = container.querySelector("div.fixed.inset-0")!;
      fireEvent.click(backdrop);
      expect(screen.queryByText("Upload Image")).not.toBeInTheDocument();
    });
  });

  describe("复制消息", () => {
    it("复制按钮应调用 clipboard.writeText", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
      renderPanel();
      const copyBtn = screen.getAllByTitle("Copy")[0];
      fireEvent.click(copyBtn);
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("NodeStatusCard"));
    });
  });
});
