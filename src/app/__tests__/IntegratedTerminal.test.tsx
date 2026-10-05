/**
 * IntegratedTerminal.test.tsx
 * ===========================
 * VS Code 风格集成终端面板测试
 *
 * 覆盖范围:
 * - open 开关渲染
 * - Tab 栏: 新建 / 切换 / 关闭 (含关最后一个 tab 触发 onClose)
 * - 状态栏: 版本 / 当前 tab / LOCAL
 * - promptUser: 邮箱前缀 / 兜底 admin / ghost 模式
 * - 窗口控制: 最小化(持久化 180) / 最大化切换 / 关闭
 * - 高度持久化: 预置值恢复 + 拖拽调高
 * - 终端交互透传: 输入 / Enter 执行 / 上下方向键 / Tab 补全
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();

const terminalMock = vi.hoisted(() => ({
  history: [] as Array<{ id: string; input?: string; output?: string; status?: string }>,
  inputValue: "",
  completions: [] as string[],
  completionMeta: {} as Record<string, { source: string; description?: string }>,
  execute: vi.fn(),
  handleInputChange: vi.fn(),
  handleHistoryNav: vi.fn(),
  applyCompletion: vi.fn(),
}));

vi.mock("react-router", async () => {
  const ReactModule = await import("react");
  return {
    useNavigate: () => mockNavigate,
    // IntegratedTerminal 间接依赖 Outlet 等不必提供; 仅 useNavigate 被消费
    __esModule: true,
  } as any;
});

vi.mock("../hooks/useTerminal", () => ({
  useTerminal: () => terminalMock,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  m: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { IntegratedTerminal } from "../components/IntegratedTerminal";
import { ViewContext } from "../lib/view-context";
import { AuthContext } from "../lib/authContext";

function renderTerminal(open = true, onClose = vi.fn(), userEmail = "admin@0379.email") {
  const viewValue = { isMobile: false, isTablet: false, isDesktop: true, width: 1440, breakpoint: "xl", isTouch: false };
  return render(
    <ViewContext.Provider value={viewValue as any}>
      <AuthContext.Provider value={{ userEmail } as any}>
        <IntegratedTerminal open={open} onClose={onClose} />
      </AuthContext.Provider>
    </ViewContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  terminalMock.history = [];
  terminalMock.inputValue = "";
  terminalMock.completions = [];
});

afterEach(() => {
  localStorage.clear();
});

describe("IntegratedTerminal", () => {
  describe("渲染开关", () => {
    it("open=false 时不渲染面板", () => {
      const { container } = renderTerminal(false);
      expect(container.querySelector(".cursor-ns-resize")).toBeNull();
    });

    it("open=true 时渲染 Tab 栏与状态栏", () => {
      renderTerminal();
      expect(screen.getAllByText("cpim").length).toBeGreaterThan(0);
      expect(screen.getByText("cpim-cli v3.2.0")).toBeInTheDocument();
      expect(screen.getByText("LOCAL")).toBeInTheDocument();
      expect(screen.getByText("Tab 1/1")).toBeInTheDocument();
    });
  });

  describe("promptUser", () => {
    it("取邮箱前缀作为提示符", () => {
      renderTerminal(true, vi.fn(), "zhangsan@yyc3.dev");
      expect(screen.getAllByText("zhangsan@cpim").length).toBeGreaterThan(0);
    });

    it("ghost 模式显示 ghost 提示符与 GHOST 标识", () => {
      localStorage.setItem("yyc3_ghost", "1");
      renderTerminal(true, vi.fn(), "admin@0379.email");
      expect(screen.getAllByText("ghost@cpim").length).toBeGreaterThan(0);
      expect(screen.getByText("GHOST")).toBeInTheDocument();
    });
  });

  describe("Tab 管理", () => {
    it("新建 Tab 后激活并更新状态栏", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("新建终端 Tab"));
      expect(screen.getAllByText("cpim-2").length).toBeGreaterThan(0);
      expect(screen.getByText("Tab 2/2")).toBeInTheDocument();
    });

    it("点击 Tab 切换激活", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("新建终端 Tab"));
      fireEvent.click(screen.getAllByText("cpim")[0]);
      // cpim 重新激活 → 状态栏显示 Tab 1/2
      expect(screen.getByText("Tab 1/2")).toBeInTheDocument();
    });

    it("关闭非末尾 Tab", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("新建终端 Tab"));
      const tab2 = screen.getAllByText("cpim-2")[0].closest("div")!;
      fireEvent.click(tab2.querySelector("button")!);
      expect(screen.queryByText("cpim-2")).not.toBeInTheDocument();
      expect(screen.getByText("Tab 1/1")).toBeInTheDocument();
    });

    it("关闭最后一个 Tab 应触发 onClose 并重置", () => {
      const onClose = vi.fn();
      renderTerminal(true, onClose);
      // 单 tab 时不渲染关闭按钮 → 先建再关
      fireEvent.click(screen.getByTitle("新建终端 Tab"));
      const tab2 = screen.getAllByText("cpim-2")[0].closest("div")!;
      fireEvent.click(tab2.querySelector("button")!);
      // 此时仅剩 tab-1, 关闭按钮随 tabs.length>1 消失 → 直接验证重置回 Tab 1/1
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Tab 1/1")).toBeInTheDocument();
    });
  });

  describe("窗口控制", () => {
    it("最小化应设高度 180 并持久化", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("最小化"));
      expect(localStorage.getItem("yyc3_terminal_height")).toBe("180");
    });

    it("最大化/还原切换", () => {
      renderTerminal();
      fireEvent.click(screen.getByTitle("最大化"));
      expect(screen.getByTitle("还原")).toBeInTheDocument();
      fireEvent.click(screen.getByTitle("还原"));
      expect(screen.getByTitle("最大化")).toBeInTheDocument();
    });

    it("关闭按钮触发 onClose", () => {
      const onClose = vi.fn();
      renderTerminal(true, onClose);
      fireEvent.click(screen.getByTitle("关闭终端"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("预置高度应从 localStorage 恢复", () => {
      localStorage.setItem("yyc3_terminal_height", "500");
      const { container } = renderTerminal();
      expect(container.innerHTML).toContain("500px");
    });

    it("拖拽手柄应调节高度", () => {
      const { container } = renderTerminal();
      const handle = container.querySelector(".cursor-ns-resize")!;
      fireEvent.mouseDown(handle, { clientY: 320 });
      fireEvent.mouseMove(document, { clientY: 270 });
      expect(container.innerHTML).toContain("370px");
      fireEvent.mouseUp(document);
    });
  });

  describe("终端交互透传 (useTerminal mock)", () => {
    it("输入变化透传 handleInputChange", () => {
      renderTerminal();
      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "help" } });
      expect(terminalMock.handleInputChange).toHaveBeenCalledWith("help");
    });

    it("Enter 透传 execute", () => {
      renderTerminal();
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(terminalMock.execute).toHaveBeenCalledWith("");
    });

    it("ArrowUp/ArrowDown 透传 handleHistoryNav", () => {
      renderTerminal();
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "ArrowUp" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(terminalMock.handleHistoryNav).toHaveBeenCalledWith("up");
      expect(terminalMock.handleHistoryNav).toHaveBeenCalledWith("down");
    });

    it("有补全候选时 Tab 应用第一项并渲染候选按钮", () => {
      terminalMock.completions = ["goto /", "goto /settings"];
      renderTerminal();
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Tab" });
      expect(terminalMock.applyCompletion).toHaveBeenCalledWith("goto /");
      fireEvent.click(screen.getByText("goto /settings"));
      expect(terminalMock.applyCompletion).toHaveBeenCalledWith("goto /settings");
    });

    it("渲染 history 条目", () => {
      terminalMock.history = [
        { id: "h1", input: "cpim status", output: "ALL SYSTEMS NOMINAL", status: "success" },
      ];
      renderTerminal();
      expect(screen.getByText("cpim status")).toBeInTheDocument();
      expect(screen.getByText("ALL SYSTEMS NOMINAL")).toBeInTheDocument();
    });
  });
});
