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
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

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

// 抑制 React 的 console.error (ErrorBoundary 触发时)
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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
      expect(handleError.mock.calls[0][0].message).toBe("callback test");
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
});
