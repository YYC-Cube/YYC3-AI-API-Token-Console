/**
 * GitPanel.test.tsx
 * =================
 * IDE Git 版本控制面板测试
 *
 * 覆盖范围:
 * - 分支选择器 (当前分支 / 下拉开合)
 * - 三个 Tab (变更/历史/分支) 切换
 * - 变更: 已暂存/未暂存分组 / 单项切换 / 全部暂存与取消
 * - 提交: 禁用态 / 提交移除已暂存变更并清空输入
 * - 历史: 提交列表 / 搜索过滤 (message + hash) / 展开详情
 * - 分支: HEAD 标记 / ahead-behind 徽标
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GitPanel } from "../components/ide/GitPanel";
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
      <GitPanel />
    </I18nContext.Provider>
  );
}

describe("GitPanel", () => {
  describe("分支选择器", () => {
    it("应显示当前分支 develop", () => {
      renderPanel();
      expect(screen.getByText("develop")).toBeInTheDocument();
    });

    it("点击分支名应打开下拉, 选择后关闭", () => {
      renderPanel();
      fireEvent.click(screen.getByText("develop"));
      expect(screen.getByText("feature/ide-panel")).toBeInTheDocument();
      expect(screen.getByText("fix/gpu-alert")).toBeInTheDocument();
      fireEvent.click(screen.getByText("main"));
      expect(screen.queryByText("fix/gpu-alert")).not.toBeInTheDocument();
    });
  });

  describe("Tab 切换", () => {
    it("应渲染三个 Tab", () => {
      renderPanel();
      expect(screen.getByText("变更")).toBeInTheDocument();
      expect(screen.getByText("历史")).toBeInTheDocument();
      expect(screen.getByText("分支")).toBeInTheDocument();
    });

    it("默认显示变更 Tab 的暂存分组", () => {
      renderPanel();
      expect(screen.getByText(/已暂存 \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/未暂存 \(4\)/)).toBeInTheDocument();
      expect(screen.getByText("IDELayout.tsx")).toBeInTheDocument();
      expect(screen.getByText("old-helper.ts")).toBeInTheDocument();
    });
  });

  describe("变更管理", () => {
    it("点击未暂存项应切换为已暂存", () => {
      renderPanel();
      fireEvent.click(screen.getByText("GitPanel.tsx"));
      expect(screen.getByText(/已暂存 \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/未暂存 \(3\)/)).toBeInTheDocument();
    });

    it("全部暂存后未暂存分组消失", () => {
      renderPanel();
      const unstagedHeader = screen.getByText(/未暂存 \(4\)/).closest("div")!;
      fireEvent.click(unstagedHeader.querySelector("button")!);
      expect(screen.queryByText(/未暂存/)).not.toBeInTheDocument();
      expect(screen.getByText(/已暂存 \(6\)/)).toBeInTheDocument();
    });

    it("全部取消暂存后已暂存分组消失", () => {
      renderPanel();
      const stagedHeader = screen.getByText(/已暂存 \(2\)/).closest("div")!;
      fireEvent.click(stagedHeader.querySelector("button")!);
      expect(screen.queryByText(/已暂存/)).not.toBeInTheDocument();
    });

    it("无提交信息时提交按钮禁用", () => {
      renderPanel();
      const commitBtn = screen.getByRole("button", { name: /提交 \(\d\)/ });
      expect(commitBtn).toBeDisabled();
    });

    it("填写信息后提交应移除已暂存变更并清空输入", () => {
      renderPanel();
      const textarea = screen.getByPlaceholderText("提交信息...");
      fireEvent.change(textarea, { target: { value: "feat: test commit" } });
      fireEvent.click(screen.getByRole("button", { name: /提交 \(2\)/ }));
      expect(screen.queryByText("IDELayout.tsx")).not.toBeInTheDocument();
      expect(screen.queryByText("AIChatPanel.tsx")).not.toBeInTheDocument();
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  describe("提交历史", () => {
    it("切换历史 Tab 应渲染提交列表", () => {
      renderPanel();
      fireEvent.click(screen.getByText("历史"));
      expect(screen.getByText("feat(ide): add model selector to top bar")).toBeInTheDocument();
      expect(screen.getByText("a3f8c2d")).toBeInTheDocument();
    });

    it("搜索应按 message 过滤", () => {
      renderPanel();
      fireEvent.click(screen.getByText("历史"));
      fireEvent.change(screen.getByPlaceholderText("搜索提交..."), {
        target: { value: "gpu temperature" },
      });
      expect(screen.getByText("feat(monitor): add GPU temperature heatmap")).toBeInTheDocument();
      expect(screen.queryByText("feat(ide): add model selector to top bar")).not.toBeInTheDocument();
    });

    it("搜索应按 hash 过滤", () => {
      renderPanel();
      fireEvent.click(screen.getByText("历史"));
      fireEvent.change(screen.getByPlaceholderText("搜索提交..."), {
        target: { value: "b7e1a4f" },
      });
      expect(screen.getByText("fix(patrol): correct health check interval")).toBeInTheDocument();
      expect(screen.queryByText("feat(ide): add model selector to top bar")).not.toBeInTheDocument();
    });

    it("点击提交应展开变更统计", () => {
      renderPanel();
      fireEvent.click(screen.getByText("历史"));
      fireEvent.click(screen.getByText("feat(ide): add model selector to top bar"));
      expect(screen.getByText("4 files")).toBeInTheDocument();
      expect(screen.getByText("+120")).toBeInTheDocument();
      expect(screen.getByText("-35")).toBeInTheDocument();
    });
  });

  describe("分支列表", () => {
    it("应渲染全部分支与 HEAD 标记", () => {
      renderPanel();
      fireEvent.click(screen.getByText("分支"));
      expect(screen.getByText("HEAD")).toBeInTheDocument();
      expect(screen.getByText("feature/ide-panel")).toBeInTheDocument();
      expect(screen.getByText("5 min ago")).toBeInTheDocument();
      expect(screen.getByText("↓2")).toBeInTheDocument();
      expect(screen.getByText("↑5")).toBeInTheDocument();
    });
  });
});
