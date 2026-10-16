/**
 * IDEViewSwitcher.test.tsx
 * =========================
 * IDE 视图切换栏测试 (S5 覆盖率长尾批 2)
 *
 * 覆盖范围:
 * - 全量按钮渲染 (视图切换 / 布局模式 / 全屏 / 搜索 / 更多)
 * - 激活视图再次点击 → 回退 default; 非激活视图点击 → 切换模式
 * - 布局模式切换回调
 * - 搜索 / 全屏回调
 * - title 提示 (快捷键 / 布局描述)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IDEViewSwitcher } from "../components/ide/IDEViewSwitcher";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = (result as Record<string, unknown>)[k];
  }
  return typeof result === "string" ? result : path;
}

function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string) => getNestedValue(zhCN as Record<string, unknown>, key),
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  };
}

const onSearch = vi.fn();
const onFullscreen = vi.fn();
const onViewChange = vi.fn();
const onLayoutModeChange = vi.fn();

function renderSwitcher(props: Partial<React.ComponentProps<typeof IDEViewSwitcher>> = {}) {
  return render(
    <I18nContext.Provider value={createI18nValue()}>
      <IDEViewSwitcher
        viewMode="default"
        onViewChange={onViewChange}
        layoutMode="edit"
        onLayoutModeChange={onLayoutModeChange}
        onSearch={onSearch}
        onFullscreen={onFullscreen}
        {...props}
      />
    </I18nContext.Provider>
  );
}

describe("IDEViewSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------

  it("应渲染全部功能按钮文案", () => {
    renderSwitcher();
    expect(screen.getByText("全屏")).toBeInTheDocument();
    expect(screen.getByText("预览")).toBeInTheDocument();
    expect(screen.getByText("代码")).toBeInTheDocument();
    expect(screen.getByText("编辑模式")).toBeInTheDocument();
    expect(screen.getByText("预览模式")).toBeInTheDocument();
    expect(screen.getByText("搜索")).toBeInTheDocument();
  });

  it("视图按钮 title 应带快捷键提示", () => {
    renderSwitcher();
    expect(screen.getByTitle("预览 (Ctrl+1)")).toBeInTheDocument();
    expect(screen.getByTitle("代码 (Ctrl+2)")).toBeInTheDocument();
  });

  it("布局按钮 title 应带布局描述", () => {
    renderSwitcher();
    expect(screen.getByTitle("编辑模式 — 终端仅在右栏显示")).toBeInTheDocument();
    expect(screen.getByTitle("预览模式 — 终端跨越中栏+右栏")).toBeInTheDocument();
  });

  it("搜索按钮 title 应带快捷键提示", () => {
    renderSwitcher();
    expect(screen.getByTitle("搜索 (Ctrl+Shift+F)")).toBeInTheDocument();
  });

  it("更多按钮应可渲染", () => {
    renderSwitcher();
    expect(screen.getByTitle("更多")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 激活态样式
  // ----------------------------------------------------------

  it("当前激活的视图按钮应有高亮样式", () => {
    renderSwitcher({ viewMode: "preview" });
    const previewBtn = screen.getByTitle("预览 (Ctrl+1)");
    const codeBtn = screen.getByTitle("代码 (Ctrl+2)");
    expect(previewBtn.className).toContain("bg-[rgba(0,212,255,0.12)");
    expect(codeBtn.className).not.toContain("bg-[rgba(0,212,255,0.12)");
  });

  it("当前激活的布局按钮应有高亮样式", () => {
    renderSwitcher({ layoutMode: "preview" });
    const previewModeBtn = screen.getByTitle("预览模式 — 终端跨越中栏+右栏");
    const editModeBtn = screen.getByTitle("编辑模式 — 终端仅在右栏显示");
    expect(previewModeBtn.className).toContain("bg-[rgba(0,212,255,0.12)");
    expect(editModeBtn.className).not.toContain("bg-[rgba(0,212,255,0.12)");
  });

  // ----------------------------------------------------------
  // 视图切换回调
  // ----------------------------------------------------------

  it("点击非激活视图应回调该视图模式", () => {
    renderSwitcher({ viewMode: "default" });
    fireEvent.click(screen.getByTitle("代码 (Ctrl+2)"));
    expect(onViewChange).toHaveBeenCalledWith("code");
  });

  it("点击已激活视图应回退 default 模式", () => {
    renderSwitcher({ viewMode: "preview" });
    fireEvent.click(screen.getByTitle("预览 (Ctrl+1)"));
    expect(onViewChange).toHaveBeenCalledWith("default");
  });

  it("从预览视图点击代码视图应切换到 code", () => {
    renderSwitcher({ viewMode: "preview" });
    fireEvent.click(screen.getByTitle("代码 (Ctrl+2)"));
    expect(onViewChange).toHaveBeenCalledWith("code");
  });

  // ----------------------------------------------------------
  // 布局模式切换回调
  // ----------------------------------------------------------

  it("点击非激活布局模式应回调该布局", () => {
    renderSwitcher({ layoutMode: "edit" });
    fireEvent.click(screen.getByTitle("预览模式 — 终端跨越中栏+右栏"));
    expect(onLayoutModeChange).toHaveBeenCalledWith("preview");
  });

  it("点击已激活布局模式应再次回调该布局 (保持不变)", () => {
    renderSwitcher({ layoutMode: "edit" });
    fireEvent.click(screen.getByTitle("编辑模式 — 终端仅在右栏显示"));
    expect(onLayoutModeChange).toHaveBeenCalledWith("edit");
  });

  // ----------------------------------------------------------
  // 其它回调
  // ----------------------------------------------------------

  it("点击全屏按钮应触发 onFullscreen", () => {
    renderSwitcher();
    fireEvent.click(screen.getByTitle("全屏"));
    expect(onFullscreen).toHaveBeenCalledTimes(1);
  });

  it("点击搜索按钮应触发 onSearch", () => {
    renderSwitcher();
    fireEvent.click(screen.getByTitle("搜索 (Ctrl+Shift+F)"));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
