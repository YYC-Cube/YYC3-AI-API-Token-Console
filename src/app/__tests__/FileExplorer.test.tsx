/**
 * FileExplorer.test.tsx
 * =====================
 * IDE 文件资源管理器测试
 *
 * 覆盖范围:
 * - 文件树渲染与默认展开层级
 * - 文件夹展开/收起
 * - 文件选择回调 + 激活高亮
 * - 搜索过滤 (递归匹配)
 * - 右键菜单: 文件项/文件夹项差异 / 外点关闭 / 根级右键
 * - 重命名: Enter 提交 / Escape 取消
 * - 删除文件
 * - 新建文件 (文件夹内 + 根级按钮)
 * - Explorer/Git Tab 切换
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileExplorer } from "../components/ide/FileExplorer";
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

function renderExplorer(props?: Partial<React.ComponentProps<typeof FileExplorer>>) {
  const onFileSelect = vi.fn();
  const utils = render(
    <I18nContext.Provider value={mockI18n}>
      <FileExplorer onFileSelect={onFileSelect} {...props} />
    </I18nContext.Provider>
  );
  return { onFileSelect, ...utils };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FileExplorer", () => {
  describe("文件树渲染", () => {
    it("应渲染根目录文件", () => {
      renderExplorer();
      expect(screen.getByText("src")).toBeInTheDocument();
      expect(screen.getByText("package.json")).toBeInTheDocument();
      expect(screen.getByText(".gitignore")).toBeInTheDocument();
    });

    it("默认展开前三层, 更深层折叠", () => {
      renderExplorer();
      expect(screen.getByText("App.tsx")).toBeInTheDocument();
      expect(screen.getByText("components")).toBeInTheDocument();
      // hooks 文件夹可见但未展开
      expect(screen.getByText("hooks")).toBeInTheDocument();
      expect(screen.queryByText("useI18n.ts")).not.toBeInTheDocument();
    });

    it("点击文件夹展开子级", () => {
      renderExplorer();
      fireEvent.click(screen.getByText("hooks"));
      expect(screen.getByText("useI18n.ts")).toBeInTheDocument();
      // 再点收起
      fireEvent.click(screen.getByText("hooks"));
      expect(screen.queryByText("useI18n.ts")).not.toBeInTheDocument();
    });
  });

  describe("文件选择", () => {
    it("点击文件触发 onFileSelect 回调", () => {
      const { onFileSelect } = renderExplorer();
      fireEvent.click(screen.getByText("App.tsx"));
      expect(onFileSelect).toHaveBeenCalledWith("app-tsx", "App.tsx");
    });

    it("激活文件高亮", () => {
      renderExplorer({ activeFileId: "app-tsx" });
      const btn = screen.getByText("App.tsx").closest("button")!;
      expect(btn.className).toContain("text-[#00d4ff]");
    });
  });

  describe("搜索过滤", () => {
    it("按文件名过滤且保留匹配祖先", () => {
      renderExplorer();
      fireEvent.change(screen.getByPlaceholderText("过滤文件..."), {
        target: { value: "package" },
      });
      expect(screen.getByText("package.json")).toBeInTheDocument();
      expect(screen.queryByText("App.tsx")).not.toBeInTheDocument();
    });

    it("清空过滤恢复全部", () => {
      renderExplorer();
      const input = screen.getByPlaceholderText("过滤文件...");
      fireEvent.change(input, { target: { value: "package" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(screen.getByText("App.tsx")).toBeInTheDocument();
    });
  });

  describe("右键菜单", () => {
    it("文件右键显示 重命名/复制路径/删除", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("App.tsx"));
      expect(screen.getByText("重命名")).toBeInTheDocument();
      expect(screen.getByText("复制路径")).toBeInTheDocument();
      expect(screen.getByText("删除")).toBeInTheDocument();
      // 文件右键不含新建项
      expect(screen.queryByText("新建文件")).not.toBeInTheDocument();
    });

    it("文件夹右键额外显示 新建文件/新建文件夹", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("hooks"));
      expect(screen.getByText("新建文件")).toBeInTheDocument();
      expect(screen.getByText("新建文件夹")).toBeInTheDocument();
    });

    it("点击外部应关闭菜单", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("App.tsx"));
      expect(screen.getByText("重命名")).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByText("重命名")).not.toBeInTheDocument();
    });
  });

  describe("重命名", () => {
    it("Enter 提交新名称", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("App.tsx"));
      fireEvent.click(screen.getByText("重命名"));
      const input = screen.getByDisplayValue("App.tsx");
      fireEvent.change(input, { target: { value: "Renamed.tsx" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("Renamed.tsx")).toBeInTheDocument();
      expect(screen.queryByText("App.tsx")).not.toBeInTheDocument();
    });

    it("Escape 取消重命名", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("App.tsx"));
      fireEvent.click(screen.getByText("重命名"));
      const input = screen.getByDisplayValue("App.tsx");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.getByText("App.tsx")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("App.tsx")).not.toBeInTheDocument();
    });
  });

  describe("删除与新建", () => {
    it("删除文件后从树中移除", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("App.tsx"));
      fireEvent.click(screen.getByText("删除"));
      expect(screen.queryByText("App.tsx")).not.toBeInTheDocument();
    });

    it("文件夹右键新建文件: 提交后追加到该文件夹", () => {
      renderExplorer();
      fireEvent.contextMenu(screen.getByText("hooks"));
      fireEvent.click(screen.getByText("新建文件"));
      const input = screen.getByDisplayValue("untitled.tsx");
      fireEvent.change(input, { target: { value: "my-test.ts" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("my-test.ts")).toBeInTheDocument();
    });

    it("根级新建文件按钮应添加到 src-app", () => {
      renderExplorer();
      fireEvent.click(screen.getByTitle("新建文件"));
      const input = screen.getByDisplayValue("untitled.tsx");
      fireEvent.change(input, { target: { value: "root-new.tsx" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("root-new.tsx")).toBeInTheDocument();
    });
  });

  describe("Tab 切换", () => {
    it("切换到 Git Tab 应渲染 GitPanel", () => {
      renderExplorer();
      fireEvent.click(screen.getByText("Git"));
      expect(screen.getByText("develop")).toBeInTheDocument();
      // 切回 explorer
      fireEvent.click(screen.getByText("资源管理器"));
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });
  });
});
