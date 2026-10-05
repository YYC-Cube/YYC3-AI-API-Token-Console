/**
 * IDELayout.test.tsx
 * ==================
 * IDE 主布局测试
 *
 * 覆盖范围:
 * - 顶栏/布局模式指示/状态栏渲染
 * - localStorage 预置布局模式恢复 + 切换持久化
 * - 快捷键: Ctrl+3 布局切换 / Ctrl+Shift+F 搜索 / Esc 关闭 / Ctrl+1 视图切换 / Ctrl+2 代码视图 / Ctrl+` 终端折叠
 * - 返回回调
 * - 文件选择 → 编辑 Tab 打开
 * - 终端折叠按钮
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children }: any) => <div data-panel>{children}</div>,
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: () => <div role="separator" />,
}));

vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value} />
  ),
}));
vi.mock("@codemirror/lang-javascript", () => ({ javascript: () => [] }));
vi.mock("@codemirror/lang-json", () => ({ json: () => [] }));
vi.mock("@codemirror/lang-python", () => ({ python: () => [] }));
vi.mock("@codemirror/lang-sql", () => ({ sql: () => [] }));
vi.mock("@codemirror/lang-markdown", () => ({ markdown: () => [] }));
vi.mock("@codemirror/lang-html", () => ({ html: () => [] }));
vi.mock("@codemirror/lang-css", () => ({ css: () => [] }));
vi.mock("@codemirror/lang-xml", () => ({ xml: () => [] }));
vi.mock("@codemirror/lang-yaml", () => ({ yaml: () => [] }));
vi.mock("@codemirror/view", () => ({
  EditorView: { theme: () => [], lineWrapping: [], domEventHandlers: () => [] },
}));
vi.mock("@codemirror/state", () => ({}));

import { IDELayout } from "../components/ide/IDELayout";
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

function renderLayout() {
  return render(
    <I18nContext.Provider value={mockI18n}>
      <IDELayout />
    </I18nContext.Provider>
  );
}

function pressKey(key: string, mods: Partial<KeyboardEventInit> = {}) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods })
    );
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("IDELayout", () => {
  describe("静态渲染", () => {
    it("应渲染顶栏与标题", () => {
      renderLayout();
      expect(screen.getByText("CloudPivot AI")).toBeInTheDocument();
      expect(screen.getByText("智能 AI 编程工作台")).toBeInTheDocument();
    });

    it("默认预览模式指示", () => {
      renderLayout();
      expect(screen.getByText("终端跨越中栏+右栏")).toBeInTheDocument();
    });

    it("localStorage 预置 edit 模式应恢复", () => {
      localStorage.setItem("yyc3-ide-layout-mode", "edit");
      renderLayout();
      expect(screen.getByText("终端仅在右栏显示")).toBeInTheDocument();
    });

    it("应渲染文件树与 AI 面板", () => {
      renderLayout();
      expect(screen.getByText("package.json")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("向 AI 提问...")).toBeInTheDocument();
    });
  });

  describe("快捷键", () => {
    it("Ctrl+3 切换布局模式并持久化", () => {
      renderLayout();
      pressKey("3", { ctrlKey: true });
      expect(screen.getByText("终端仅在右栏显示")).toBeInTheDocument();
      expect(localStorage.getItem("yyc3-ide-layout-mode")).toBe("edit");
      pressKey("3", { ctrlKey: true });
      expect(screen.getByText("终端跨越中栏+右栏")).toBeInTheDocument();
    });

    it("Ctrl+Shift+F 打开搜索, Esc 关闭", () => {
      renderLayout();
      pressKey("F", { ctrlKey: true, shiftKey: true });
      expect(screen.getByPlaceholderText(/搜索\.\.\. \(Esc\)/)).toBeInTheDocument();
      pressKey("Escape");
      expect(screen.queryByPlaceholderText(/搜索\.\.\. \(Esc\)/)).not.toBeInTheDocument();
    });

    it("Ctrl+1 切换到预览视图隐藏文件树, 再按恢复", () => {
      renderLayout();
      pressKey("1", { ctrlKey: true });
      expect(screen.queryByText("package.json")).not.toBeInTheDocument();
      pressKey("1", { ctrlKey: true });
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });

    it("Ctrl+2 切换到代码视图隐藏 AI 面板", () => {
      renderLayout();
      pressKey("2", { ctrlKey: true });
      expect(screen.queryByPlaceholderText("向 AI 提问...")).not.toBeInTheDocument();
    });

    it("Ctrl+` 折叠终端, 隐藏命令输入", () => {
      renderLayout();
      expect(screen.getByPlaceholderText("输入命令...")).toBeInTheDocument();
      pressKey("`", { ctrlKey: true });
      expect(screen.queryByPlaceholderText("输入命令...")).not.toBeInTheDocument();
    });

    it("无修饰键按键不触发任何切换", () => {
      renderLayout();
      pressKey("3");
      expect(screen.getByText("终端跨越中栏+右栏")).toBeInTheDocument();
      expect(localStorage.getItem("yyc3-ide-layout-mode")).toBe("preview");
    });
  });

  describe("交互", () => {
    it("返回按钮触发 navigate(-1)", () => {
      renderLayout();
      fireEvent.click(screen.getByText("CloudPivot AI"));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("文件选择应打开编辑 Tab", () => {
      renderLayout();
      fireEvent.click(screen.getByText("package.json"));
      expect(screen.getByText("src/package.json")).toBeInTheDocument();
      expect(screen.getByTestId("codemirror-mock")).toBeInTheDocument();
    });

    it("同一文件重复选择不新建 Tab", () => {
      renderLayout();
      fireEvent.click(screen.getAllByText("package.json")[0]);
      fireEvent.click(screen.getAllByText("package.json")[0]);
      expect(screen.getAllByText("package.json").length).toBeGreaterThan(0);
      // 仅一个 tab (面包屑唯一)
      expect(screen.getAllByText("src/package.json")).toHaveLength(1);
    });

    it("终端折叠按钮切换", () => {
      renderLayout();
      fireEvent.click(screen.getByTitle("切换终端"));
      expect(screen.queryByPlaceholderText("输入命令...")).not.toBeInTheDocument();
    });
  });
});
