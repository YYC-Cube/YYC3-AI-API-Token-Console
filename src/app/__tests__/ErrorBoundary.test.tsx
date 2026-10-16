/**
 * ErrorBoundary.test.tsx
 * =======================
 * ErrorBoundary 组件 - 渲染测试
 *
 * 覆盖范围:
 * - 正常子组件透传
 * - 捕获抛出错误并显示降级 UI
 * - 三级降级 (page / module / widget)
 * - 自定义 fallback 支持
 * - 重置功能
 * - onError 回调触发
 * - source 标识透传 / 返回首页导航
 * - 错误报告复制 (page/module + 剪贴板 + 2s 复位)
 * - 空状态占位文案兜底 (白盒: error/errorInfo/appError 为 null 或空对象)
 * - Figma 平台错误过滤 (RF-003 Layer 3: getDerivedStateFromError / componentDidCatch 双闸)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { captureError } from "../lib/error-handler";
import type { AppError } from "../types";

// Mock error-handler 以避免 localStorage 问题
vi.mock("../lib/error-handler", () => ({
  captureError: vi.fn(() => ({
    id: "err_test_001",
    category: "RUNTIME",
    severity: "critical",
    message: "Test error",
    timestamp: Date.now(),
    resolved: false,
  })),
}));

// 抛出错误的组件
function ThrowingComponent({ message = "Test crash" }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

// 正常组件
function NormalComponent() {
  return <div data-testid="normal">正常运行</div>;
}

// 抑制 React 的 console.error (ErrorBoundary 触发时) + 复位 captureError 调用历史
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(captureError).mockClear();
});

// fake timers / spy 恢复 (console.error 由上方 beforeEach 每次重挂)
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// 构造指定状态的边界实例 (白盒: 覆盖 UI 层不可达的空状态分支)
function makeBoundary(
  state: {
    hasError?: boolean;
    error?: Error | null;
    errorInfo?: React.ErrorInfo | null;
    appError?: AppError | null;
    showDetail?: boolean;
    copied?: boolean;
  } = {}
): ErrorBoundary {
  const instance = new ErrorBoundary({ children: null });
  Object.assign(instance.state, {
    hasError: true,
    error: null,
    errorInfo: null,
    appError: null,
    showDetail: false,
    copied: false,
    ...state,
  });
  return instance;
}

describe("ErrorBoundary", () => {
  // ----------------------------------------------------------
  // 正常渲染
  // ----------------------------------------------------------

  describe("正常渲染", () => {
    it("无错误时应透传子组件", () => {
      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );
      expect(screen.getByTestId("normal")).toBeInTheDocument();
      expect(screen.getByText("正常运行")).toBeInTheDocument();
    });

    it("多个子组件应正确渲染", () => {
      render(
        <ErrorBoundary>
          <div data-testid="a">A</div>
          <div data-testid="b">B</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId("a")).toBeInTheDocument();
      expect(screen.getByTestId("b")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Page 级别错误
  // ----------------------------------------------------------

  describe("Page 级别 (默认)", () => {
    it("应捕获错误并显示降级 UI", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("系统异常")).toBeInTheDocument();
      // 以源码文案为准: 品牌名已迭代为 CP-IM
      expect(
        screen.getByText("CP-IM 捕获到一个运行时错误")
      ).toBeInTheDocument();
    });

    it("应显示错误消息", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent message="GPU 内存不足" />
        </ErrorBoundary>
      );
      expect(screen.getByText("GPU 内存不足")).toBeInTheDocument();
    });

    it("应包含重新加载按钮", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("重新加载")).toBeInTheDocument();
    });

    it("应包含返回首页按钮", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("返回首页")).toBeInTheDocument();
    });

    it("应包含复制报告按钮", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("复制报告")).toBeInTheDocument();
    });

    it("应包含展开错误详情按钮", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText(/展开.*错误详情/)).toBeInTheDocument();
    });

    it("点击展开应显示堆栈信息", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      fireEvent.click(screen.getByText(/展开.*错误详情/));
      expect(screen.getByText("堆栈跟踪:")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Module 级别
  // ----------------------------------------------------------

  describe("Module 级别", () => {
    it("应显示模块级降级 UI", () => {
      render(
        <ErrorBoundary level="module">
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("模块加载异常")).toBeInTheDocument();
    });

    it("应包含重新加载和复制错误按钮", () => {
      render(
        <ErrorBoundary level="module">
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("重新加载")).toBeInTheDocument();
      expect(screen.getByText("复制错误")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Widget 级别
  // ----------------------------------------------------------

  describe("Widget 级别", () => {
    it("应显示最小化错误提示", () => {
      render(
        <ErrorBoundary level="widget">
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("组件加载失败")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 自定义 fallback
  // ----------------------------------------------------------

  describe("自定义 fallback", () => {
    it("应使用 ReactNode 类型 fallback", () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom">自定义错误页</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByTestId("custom")).toBeInTheDocument();
    });

    it("应使用函数类型 fallback", () => {
      render(
        <ErrorBoundary
          fallback={(error, reset) => (
            <div>
              <span data-testid="err-msg">{error.message}</span>
              <button onClick={reset}>Reset</button>
            </div>
          )}
        >
          <ThrowingComponent message="Custom Error" />
        </ErrorBoundary>
      );
      expect(screen.getByTestId("err-msg")).toHaveTextContent("Custom Error");
    });
  });

  // ----------------------------------------------------------
  // onError 回调
  // ----------------------------------------------------------

  describe("onError 回调", () => {
    it("错误发生时应调用 onError", () => {
      const handleError = vi.fn();
      render(
        <ErrorBoundary onError={handleError}>
          <ThrowingComponent message="callback test" />
        </ErrorBoundary>
      );
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError.mock.calls[0]![0].message).toBe("callback test");
    });
  });

  // ----------------------------------------------------------
  // 重置
  // ----------------------------------------------------------

  describe("重置功能", () => {
    it("点击重新加载应重置错误状态", () => {
      let shouldThrow = true;

      function ConditionalThrow() {
        if (shouldThrow) throw new Error("recoverable");
        return <div data-testid="recovered">恢复正常</div>;
      }

      render(
        <ErrorBoundary>
          <ConditionalThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText("系统异常")).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(screen.getByText("重新加载"));

      expect(screen.getByTestId("recovered")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // source 标识
  // ----------------------------------------------------------

  describe("source 标识", () => {
    it("提供 source 时应透传给 captureError", () => {
      render(
        <ErrorBoundary source="ConsoleApp">
          <ThrowingComponent message="sourced" />
        </ErrorBoundary>
      );
      expect(vi.mocked(captureError)).toHaveBeenCalledWith(
        expect.objectContaining({ message: "sourced" }),
        expect.objectContaining({
          category: "RUNTIME",
          severity: "critical",
          source: "ConsoleApp",
        })
      );
    });
  });

  // ----------------------------------------------------------
  // 返回首页
  // ----------------------------------------------------------

  describe("返回首页", () => {
    it("点击返回首页应触发导航赋值且不崩溃 (jsdom 下列级导航仅记录)", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(() => fireEvent.click(screen.getByText("返回首页"))).not.toThrow();
      expect(screen.getByText("返回首页")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 错误报告复制 (page / module)
  // ----------------------------------------------------------

  describe("错误报告复制", () => {
    it("page 级: 复制报告应写入剪贴板并短暂显示已复制", async () => {
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      vi.useFakeTimers();
      try {
        render(
          <ErrorBoundary>
            <ThrowingComponent message="copy me" />
          </ErrorBoundary>
        );
        fireEvent.click(screen.getByText("复制报告"));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(writeText).toHaveBeenCalledTimes(1);
        const report = writeText.mock.calls[0]![0];
        expect(report).toContain("=== CP-IM 错误报告 ===");
        expect(report).toContain("错误ID: err_test_001");
        expect(report).toContain("追踪:"); // L-05: 全局 traceId 露出 (自动生成或 N/A 兜底)
        expect(report).toContain("分类: RUNTIME");
        expect(report).toContain("消息: copy me");
        expect(report).toContain("ThrowingComponent");
        expect(screen.getByText("已复制")).toBeInTheDocument();
        // 2s 后复位为未复制态
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });
        expect(screen.getByText("复制报告")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("module 级: 复制错误按钮同样生效", async () => {
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      vi.useFakeTimers();
      try {
        render(
          <ErrorBoundary level="module">
            <ThrowingComponent />
          </ErrorBoundary>
        );
        fireEvent.click(screen.getByText("复制错误"));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(writeText).toHaveBeenCalledTimes(1);
        expect(screen.getByText("已复制")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("handleCopyError: error/errorInfo/appError 均为 null 时使用占位文案", async () => {
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      const instance = makeBoundary({
        hasError: true,
        error: null,
        errorInfo: null,
        appError: null,
      });
      instance.handleCopyError();
      await Promise.resolve();
      expect(writeText).toHaveBeenCalledTimes(1);
      const report = writeText.mock.calls[0]![0];
      expect(report).toContain("错误ID: N/A");
      expect(report).toContain("分类: RUNTIME");
      expect(report).toContain("消息: 未知错误");
      expect(report).toContain("无堆栈信息");
    });

    it("handleCopyError: 对象存在但字段为空时同样回退占位文案", async () => {
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      const instance = makeBoundary({
        hasError: true,
        error: {} as unknown as Error,
        errorInfo: {} as React.ErrorInfo,
        appError: {} as unknown as AppError,
      });
      instance.handleCopyError();
      await Promise.resolve();
      const report = writeText.mock.calls[0]![0];
      expect(report).toContain("错误ID: N/A");
      expect(report).toContain("分类: RUNTIME");
      expect(report).toContain("消息: 未知错误");
      expect(report).toContain("无堆栈信息");
    });
  });

  // ----------------------------------------------------------
  // 空状态兜底 (白盒 render)
  // ----------------------------------------------------------

  describe("空状态兜底", () => {
    it("page 级: error 为 null 时显示占位文案且详情无组件堆栈", () => {
      const instance = makeBoundary({
        hasError: true,
        error: null,
        errorInfo: null,
        showDetail: true,
      });
      render(instance.render() as React.ReactElement);
      expect(screen.getByText("未知错误")).toBeInTheDocument();
      expect(screen.getByText("无堆栈信息")).toBeInTheDocument();
      expect(screen.queryByText("组件堆栈:")).not.toBeInTheDocument();
    });

    it("module 级: error 为 null 时显示占位文案", () => {
      const instance = new ErrorBoundary({ children: null, level: "module" });
      Object.assign(instance.state, { hasError: true, error: null });
      render(instance.render() as React.ReactElement);
      expect(screen.getByText("发生未知错误")).toBeInTheDocument();
    });

    it("page 级: 无堆栈错误展开详情时显示占位文案", () => {
      const err = new Error("no stack");
      Object.defineProperty(err, "stack", { value: undefined });
      function NoStackBomb(): React.ReactElement {
        throw err;
      }
      render(
        <ErrorBoundary>
          <NoStackBomb />
        </ErrorBoundary>
      );
      fireEvent.click(screen.getByText(/展开.*错误详情/));
      expect(screen.getByText("无堆栈信息")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Figma 平台错误过滤 (RF-003 Layer 3)
  // ----------------------------------------------------------

  describe("Figma 平台错误过滤", () => {
    it("getDerivedStateFromError: Figma 平台错误应返回 null", () => {
      const figmaError = new Error("The message port was closed");
      expect(ErrorBoundary.getDerivedStateFromError(figmaError)).toBeNull();
    });

    it("getDerivedStateFromError: 无 name 时回退 constructor.name 并按 AbortError 识别", () => {
      const abortLike = {
        constructor: { name: "AbortError" },
        message: "message port interrupted",
      } as unknown as Error;
      expect(ErrorBoundary.getDerivedStateFromError(abortLike)).toBeNull();
    });

    it("getDerivedStateFromError: name/constructor 缺失时回退空串并按普通错误处理", () => {
      const stripped = {
        name: "",
        constructor: undefined,
        message: "",
        stack: undefined,
      } as unknown as Error;
      expect(ErrorBoundary.getDerivedStateFromError(stripped)).toEqual({
        hasError: true,
        error: stripped,
      });
    });

    it("getDerivedStateFromError: error 为 null 时走空串回退并原样透传", () => {
      expect(
        ErrorBoundary.getDerivedStateFromError(null as unknown as Error)
      ).toEqual({ hasError: true, error: null });
    });

    it("getDerivedStateFromError: 普通错误应返回错误状态", () => {
      const err = new Error("normal");
      expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({
        hasError: true,
        error: err,
      });
    });

    it("componentDidCatch: Figma 平台错误应提前返回 (不记录不回调)", () => {
      const instance = new ErrorBoundary({ children: null });
      const info = { componentStack: "\n    in Bomb" } as React.ErrorInfo;
      instance.componentDidCatch(new Error("message port closed"), info);
      expect(vi.mocked(captureError)).not.toHaveBeenCalled();
    });

    it("componentDidCatch: name/message 缺失时走空串回退后正常记录", () => {
      const instance = new ErrorBoundary({ children: null });
      const stripped = {
        name: "",
        constructor: undefined,
        message: "",
        stack: "",
      } as unknown as Error;
      instance.componentDidCatch(stripped, {} as React.ErrorInfo);
      expect(vi.mocked(captureError)).toHaveBeenCalledTimes(1);
    });

    it("componentDidCatch: error 为 null 时走空串回退后正常记录", () => {
      const instance = new ErrorBoundary({ children: null });
      instance.componentDidCatch(
        null as unknown as Error,
        {} as React.ErrorInfo
      );
      expect(vi.mocked(captureError)).toHaveBeenCalledTimes(1);
    });

    it("Figma 错误不触发本边界 UI, 由 React 重抛给更外层 (RF-003 设计意图)", () => {
      const onError = vi.fn();
      expect(() =>
        render(
          <ErrorBoundary
            fallback={<div data-testid="should-not-render">不应渲染</div>}
            onError={onError}
          >
            <ThrowingComponent message="The message port was destroyed" />
          </ErrorBoundary>
        )
      ).toThrow("The message port was destroyed");
      // 降级 UI 不渲染, 回调与全局记录均被跳过
      expect(screen.queryByTestId("should-not-render")).not.toBeInTheDocument();
      expect(onError).not.toHaveBeenCalled();
      expect(vi.mocked(captureError)).not.toHaveBeenCalled();
    });
  });
});
