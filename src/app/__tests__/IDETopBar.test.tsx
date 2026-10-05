/**
 * IDETopBar.test.tsx
 * ==================
 * IDE 顶部导航栏测试
 *
 * 覆盖范围:
 * - Logo/项目名/返回回调
 * - 模型选择器: 当前模型显示 / 未知模型回退 / 下拉开合 / 选择回调
 * - 操作图标按钮组
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IDETopBar } from "../components/ide/IDETopBar";
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

function renderTopBar(props?: Partial<React.ComponentProps<typeof IDETopBar>>) {
  const onBack = vi.fn();
  const onModelChange = vi.fn();
  const utils = render(
    <I18nContext.Provider value={mockI18n}>
      <IDETopBar
        projectName="智能 AI 编程工作台"
        onBack={onBack}
        selectedModel="glm-4-flash"
        onModelChange={onModelChange}
        {...props}
      />
    </I18nContext.Provider>
  );
  return { onBack, onModelChange, ...utils };
}

describe("IDETopBar", () => {
  it("应渲染 Logo 与项目名", () => {
    renderTopBar();
    expect(screen.getByText("CloudPivot AI")).toBeInTheDocument();
    expect(screen.getByText("智能 AI 编程工作台")).toBeInTheDocument();
    expect(screen.getByText("Y3")).toBeInTheDocument();
  });

  it("点击返回按钮触发 onBack", () => {
    const { onBack } = renderTopBar();
    fireEvent.click(screen.getByText("CloudPivot AI"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("显示当前模型名称与提供商", () => {
    renderTopBar();
    expect(screen.getByText("GLM-4 Flash")).toBeInTheDocument();
    expect(screen.getByText("Z.ai")).toBeInTheDocument();
  });

  it("未知模型 id 回退到第一个模型", () => {
    renderTopBar({ selectedModel: "nonexistent" });
    expect(screen.getByText("GLM-4 Flash")).toBeInTheDocument();
  });

  it("打开模型下拉应列出全部模型", () => {
    renderTopBar();
    fireEvent.click(screen.getByTitle("模型选择"));
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("LLaMA-3 8B")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek-V3")).toBeInTheDocument();
    expect(screen.getByText("Qwen-72B")).toBeInTheDocument();
  });

  it("选择模型应回调并关闭下拉", () => {
    const { onModelChange } = renderTopBar();
    fireEvent.click(screen.getByTitle("模型选择"));
    fireEvent.click(screen.getByText("GPT-4o"));
    expect(onModelChange).toHaveBeenCalledWith("gpt-4o");
    expect(screen.queryByText("LLaMA-3 8B")).not.toBeInTheDocument();
  });

  it("点击遮罩关闭下拉且不改变模型", () => {
    const { onModelChange, container } = renderTopBar();
    fireEvent.click(screen.getByTitle("模型选择"));
    const backdrop = container.querySelector("div.fixed.inset-0")!;
    fireEvent.click(backdrop);
    expect(onModelChange).not.toHaveBeenCalled();
    expect(screen.queryByText("LLaMA-3 8B")).not.toBeInTheDocument();
  });

  it("应渲染 6 个操作图标按钮", () => {
    renderTopBar();
    expect(screen.getByTitle("资源管理器")).toBeInTheDocument();
    expect(screen.getByTitle("通知")).toBeInTheDocument();
    expect(screen.getByTitle("设置")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("分享")).toBeInTheDocument();
    expect(screen.getByTitle("部署")).toBeInTheDocument();
  });
});
