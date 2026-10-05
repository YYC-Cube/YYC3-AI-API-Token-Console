/**
 * IDETerminal.test.tsx
 * ====================
 * IDE 底部集成终端面板测试
 *
 * 覆盖范围:
 * - 默认欢迎行渲染 / 折叠态内容隐藏
 * - 命令注册表: help / yyc3 status / clear
 * - 动态分支: echo / cat / git commit -m / yyc3 node / 未知命令
 * - 历史导航: ArrowUp 回溯 / ArrowDown 清空
 * - Tab 补全: 单候选 / 多候选首轮
 * - 多 Tab: 新建 / 切换 / 关闭 (单 tab 保护) / 折叠切换回调
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IDETerminal } from "../components/ide/IDETerminal";
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

function renderTerminal(props?: Partial<React.ComponentProps<typeof IDETerminal>>) {
  return render(
    <I18nContext.Provider value={mockI18n}>
      <IDETerminal isCollapsed={false} onToggleCollapse={vi.fn()} {...props} />
    </I18nContext.Provider>
  );
}

function typeAndRun(cmd: string) {
  const input = screen.getByPlaceholderText("输入命令...");
  fireEvent.change(input, { target: { value: cmd } });
  fireEvent.keyDown(input, { key: "Enter" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IDETerminal", () => {
  describe("渲染与折叠", () => {
    it("应渲染默认欢迎行", () => {
      renderTerminal();
      expect(screen.getByText("YYC³ CloudPivot Terminal v2.4.0")).toBeInTheDocument();
      expect(screen.getByText(/Nodes: 7\/8 Active/)).toBeInTheDocument();
    });

    it("折叠时应隐藏内容, 展开恢复", () => {
      const onToggleCollapse = vi.fn();
      const { rerender } = renderTerminal({ onToggleCollapse });
      fireEvent.click(screen.getByTitle("切换终端"));
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
      rerender(
        <I18nContext.Provider value={mockI18n}>
          <IDETerminal isCollapsed onToggleCollapse={onToggleCollapse} />
        </I18nContext.Provider>
      );
      expect(screen.queryByText("YYC³ CloudPivot Terminal v2.4.0")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("输入命令...")).not.toBeInTheDocument();
    });
  });

  describe("命令执行", () => {
    it("help 应输出命令清单", () => {
      renderTerminal();
      typeAndRun("help");
      expect(screen.getByText(/Show this help/)).toBeInTheDocument();
      expect(screen.getByText("$ help")).toBeInTheDocument();
    });

    it("yyc3 status 走注册表", () => {
      renderTerminal();
      typeAndRun("yyc3 status");
      expect(screen.getAllByText(/Cluster: YYC³ Matrix/).length).toBeGreaterThan(0);
    });

    it("clear 应清空输出", () => {
      renderTerminal();
      typeAndRun("clear");
      expect(screen.queryByText("YYC³ CloudPivot Terminal v2.4.0")).not.toBeInTheDocument();
    });

    it("echo 输出参数文本", () => {
      renderTerminal();
      typeAndRun("echo hello yyc3");
      expect(screen.getByText("hello yyc3")).toBeInTheDocument();
    });

    it("cat 输出文件占位内容", () => {
      renderTerminal();
      typeAndRun("cat app.ts");
      expect(screen.getByText("// Content of app.ts")).toBeInTheDocument();
    });

    it("git commit -m 解析双引号提交信息", () => {
      renderTerminal();
      typeAndRun('git commit -m "fix: terminal bug"');
      expect(screen.getByText("[develop a3f8c2d] fix: terminal bug")).toBeInTheDocument();
      expect(screen.getByText("✓ Committed successfully.")).toBeInTheDocument();
    });

    it("yyc3 node 输出节点详情", () => {
      renderTerminal();
      typeAndRun("yyc3 node GPU-A100-01");
      expect(screen.getByText(/GPU-A100-01\s+Status: ACTIVE/)).toBeInTheDocument();
      expect(screen.getByText(/Uptime: 99\.98%/)).toBeInTheDocument();
    });

    it("未知命令输出错误与提示", () => {
      renderTerminal();
      typeAndRun("foobar --x");
      expect(screen.getByText("Command not found: foobar --x")).toBeInTheDocument();
      expect(screen.getByText("Type 'help' for available commands.")).toBeInTheDocument();
    });

    it("空命令不产生新输入行", () => {
      renderTerminal();
      typeAndRun("   ");
      expect(screen.getAllByText(/^\$ /).length).toBe(1);
      expect(screen.getByText("YYC³ CloudPivot Terminal v2.4.0")).toBeInTheDocument();
    });
  });

  describe("历史导航", () => {
    it("ArrowUp 回溯上一条命令, ArrowDown 清空", () => {
      renderTerminal();
      typeAndRun("yyc3 status");
      const input = screen.getByPlaceholderText("输入命令...") as HTMLInputElement;
      expect(input.value).toBe("");
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(input.value).toBe("yyc3 status");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input.value).toBe("");
    });
  });

  describe("Tab 补全", () => {
    it("唯一候选应直接补全", () => {
      renderTerminal();
      const input = screen.getByPlaceholderText("输入命令...");
      fireEvent.change(input, { target: { value: "git st" } });
      fireEvent.keyDown(input, { key: "Tab" });
      expect((input as HTMLInputElement).value).toBe("git status");
    });

    it("多候选应补全第一项", () => {
      renderTerminal();
      const input = screen.getByPlaceholderText("输入命令...");
      fireEvent.change(input, { target: { value: "git " } });
      fireEvent.keyDown(input, { key: "Tab" });
      expect((input as HTMLInputElement).value).toBe("git status");
    });

    it("无候选时输入保持不变", () => {
      renderTerminal();
      const input = screen.getByPlaceholderText("输入命令...");
      fireEvent.change(input, { target: { value: "zzz" } });
      fireEvent.keyDown(input, { key: "Tab" });
      expect((input as HTMLInputElement).value).toBe("zzz");
    });
  });

  describe("多 Tab 管理", () => {
    it("新建 Tab 应显示新会话欢迎行", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("新建终端"));
      expect(screen.getByText("New terminal session")).toBeInTheDocument();
      // 旧 tab 仍在 tab 栏
      expect(screen.getAllByText("bash").length).toBe(2);
    });

    it("点击 Tab 切换活动会话", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("新建终端"));
      typeAndRun("help");
      // 切回第一个 tab → 恢复默认欢迎行
      fireEvent.click(screen.getAllByText("bash")[0]);
      expect(screen.getByText("YYC³ CloudPivot Terminal v2.4.0")).toBeInTheDocument();
    });

    it("关闭 Tab (单 Tab 时关闭按钮不渲染)", () => {
      renderTerminal();
      // 单 tab: tab 内无关闭 span
      const singleTab = screen.getAllByText("bash")[0];
      expect(singleTab.parentElement!.querySelectorAll("span").length).toBe(1);
      fireEvent.click(screen.getByTitle("新建终端"));
      const tabs = screen.getAllByText("bash");
      // 第二个 tab 的关闭按钮: button 内第 2 个 span
      fireEvent.click(tabs[1].parentElement!.querySelectorAll("span")[1]);
      expect(screen.getAllByText("bash").length).toBe(1);
      expect(screen.queryByText("New terminal session")).not.toBeInTheDocument();
    });
  });
});
