/**
 * CodePreviewPanel.test.tsx
 * =========================
 * IDE 代码预览/编辑面板测试
 *
 * 覆盖范围:
 * - 空态 (无打开文件)
 * - Tab 栏: 文件名 / 修改标记 / 选中切换 / 关闭
 * - 面包屑: filepath + 语言标签
 * - 编辑器内容变更透传 (CodeMirror mock)
 * - activeTabId 不匹配时的 No active file 分支
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock @uiw/react-codemirror (CodeMirror 在 jsdom 中无法正常初始化)
vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value}>
      <button data-testid="cm-emit-change" onClick={() => props.onChange("updated-code")}>
        emit
      </button>
    </div>
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

import { CodePreviewPanel } from "../components/ide/CodePreviewPanel";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import type { OpenTab } from "../components/ide/ide-types";
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

const TAB_A: OpenTab = {
  id: "routes-ts",
  filename: "routes.ts",
  filepath: "src/routes.ts",
  content: "export const router = [];",
  isModified: false,
};
const TAB_B: OpenTab = {
  id: "readme-md",
  filename: "README.md",
  filepath: "src/README.md",
  content: "# Demo",
  isModified: true,
};

function renderPanel(
  openTabs: OpenTab[],
  activeTabId = openTabs[0]?.id ?? "",
  handlers = {},
) {
  const onTabSelect = vi.fn();
  const onTabClose = vi.fn();
  const onContentChange = vi.fn();
  render(
    <I18nContext.Provider value={mockI18n}>
      <CodePreviewPanel
        openTabs={openTabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onContentChange={onContentChange}
        {...handlers}
      />
    </I18nContext.Provider>
  );
  return { onTabSelect, onTabClose, onContentChange };
}

describe("CodePreviewPanel", () => {
  it("无打开文件时显示空态", () => {
    renderPanel([]);
    expect(screen.getByText("选择文件开始编辑")).toBeInTheDocument();
    expect(screen.getByText("从资源管理器打开文件")).toBeInTheDocument();
  });

  it("渲染 Tab 栏与文件名", () => {
    renderPanel([TAB_A, TAB_B]);
    expect(screen.getByText("routes.ts")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("渲染面包屑 filepath 与语言标签", () => {
    renderPanel([TAB_A]);
    expect(screen.getByText("src/routes.ts")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("编辑器承载活动文件内容", () => {
    renderPanel([TAB_A]);
    const cm = screen.getByTestId("codemirror-mock");
    expect(cm).toHaveAttribute("data-value", "export const router = [];");
  });

  it("点击 Tab 触发 onTabSelect", () => {
    const { onTabSelect } = renderPanel([TAB_A, TAB_B]);
    fireEvent.click(screen.getByText("README.md"));
    expect(onTabSelect).toHaveBeenCalledWith("readme-md");
  });

  it("点击关闭按钮触发 onTabClose 且不切换 Tab", () => {
    const { onTabClose, onTabSelect } = renderPanel([TAB_A, TAB_B]);
    const tab = screen.getByText("README.md").closest("button")!;
    const spans = tab.querySelectorAll("span");
    fireEvent.click(spans[spans.length - 1]);
    expect(onTabClose).toHaveBeenCalledWith("readme-md");
    expect(onTabSelect).not.toHaveBeenCalled();
  });

  it("编辑器变更透传 onContentChange", () => {
    const { onContentChange } = renderPanel([TAB_A]);
    fireEvent.click(screen.getByTestId("cm-emit-change"));
    expect(onContentChange).toHaveBeenCalledWith("routes-ts", "updated-code");
  });

  it("activeTabId 不匹配时显示 No active file", () => {
    renderPanel([TAB_A], "unknown-id");
    expect(screen.getByText("No active file")).toBeInTheDocument();
    expect(screen.queryByTestId("codemirror-mock")).not.toBeInTheDocument();
  });

  it("修改标记 Tab 正常渲染", () => {
    renderPanel([TAB_B], "readme-md");
    expect(screen.getByTestId("codemirror-mock")).toHaveAttribute("data-value", "# Demo");
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });
});
