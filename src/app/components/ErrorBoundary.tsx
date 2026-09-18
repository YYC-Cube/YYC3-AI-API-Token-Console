/**
 * ErrorBoundary.tsx
 * ==================
 * CP-IM React 错误边界组件
 *
 * 功能：
 * - 捕获子组件树中的 JavaScript 错误
 * - 显示赛博朋克风格的降级 UI
 * - 错误日志自动记录到 error-handler
 * - 支持重试、回到首页、查看错误详情
 * - 分级错误展示（页面级 / 模块级 / 组件级）
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "../lib/error-handler";
import { isFigmaPlatformError } from "../lib/figma-error-filter";
import { YYC3LogoSvg } from "./YYC3LogoSvg";
import type { AppError, ErrorBoundaryLevel } from "../types";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Bug, Copy, Check } from "lucide-react";

// RF-011: Re-export 已移除

// ============================================================
// Types
// ============================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 错误边界级别，影响降级 UI 的大小和样式 */
  level?: ErrorBoundaryLevel;
  /** 自定义降级 UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 错误来源标识 */
  source?: string;
  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  appError: AppError | null;
  showDetail: boolean;
  copied: boolean;
}

// ============================================================
// Component
// ============================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      appError: null,
      showDetail: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> | null {
    // RF-003 Layer 3: 如果是 Figma 平台错误，不触发错误边界 UI
    const name = error?.name || error?.constructor?.name || "";
    const msg = String(error?.message || "");
    const stack = error?.stack || "";
    if (isFigmaPlatformError(name, msg, undefined, stack)) {
      return null; // 不更新状态，不显示错误 UI
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // RF-003 Layer 3: 再次检查，避免记录 Figma 平台错误
    const name = error?.name || error?.constructor?.name || "";
    const msg = String(error?.message || "");
    const stack = error?.stack || "";
    if (isFigmaPlatformError(name, msg, undefined, stack)) {
      return;
    }

    // 记录到全局错误系统
    const appError = captureError(error, {
      category: "RUNTIME",
      severity: "critical",
      source: this.props.source || "ErrorBoundary",
    });

    this.setState({ errorInfo, appError });

    // 调用外部回调
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      appError: null,
      showDetail: false,
    });
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleCopyError = (): void => {
    const { error, errorInfo, appError } = this.state;
    const report = [
      `=== CP-IM 错误报告 ===`,
      `时间: ${new Date().toISOString()}`,
      `错误ID: ${appError?.id || "N/A"}`,
      `分类: ${appError?.category || "RUNTIME"}`,
      `消息: ${error?.message || "未知错误"}`,
      ``,
      `=== 堆栈跟踪 ===`,
      error?.stack || "无堆栈信息",
      ``,
      `=== 组件堆栈 ===`,
      errorInfo?.componentStack || "无组件堆栈",
    ].join("\n");

    navigator.clipboard.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetail, copied } = this.state;
    const { children, level = "page", fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // 自定义 fallback
    if (fallback) {
      if (typeof fallback === "function") {
        return fallback(error!, this.handleReset);
      }
      return fallback;
    }

    // Widget 级别 - 最小化错误展示
    if (level === "widget") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.15)]">
          <AlertTriangle className="w-4 h-4 text-[#ff3366] shrink-0" />
          <span className="text-[rgba(255,51,102,0.7)] truncate" style={{ fontSize: "0.75rem" }}>
            组件加载失败
          </span>
          <button
            onClick={this.handleReset}
            className="ml-auto p-1 rounded hover:bg-[rgba(255,51,102,0.1)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
          </button>
        </div>
      );
    }

    // Module 级别 - 中等错误展示
    if (level === "module") {
      return (
        <div className="rounded-xl bg-[rgba(8,25,55,0.7)] backdrop-blur-xl border border-[rgba(255,51,102,0.2)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-[rgba(255,51,102,0.1)]">
              <Bug className="w-5 h-5 text-[#ff3366]" />
            </div>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>模块加载异常</h3>
              <p className="text-[rgba(255,51,102,0.6)]" style={{ fontSize: "0.72rem" }}>
                {error?.message || "发生未知错误"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
            <button
              onClick={this.handleCopyError}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "已复制" : "复制错误"}
            </button>
          </div>
        </div>
      );
    }

    // Page 级别 - 完整错误展示
    return (
      <div className="h-full w-full flex items-center justify-center p-6" style={{
        background: "linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)",
      }}>
        <div className="w-full max-w-lg">
          <div className="rounded-xl bg-[rgba(8,25,55,0.7)] backdrop-blur-xl border border-[rgba(255,51,102,0.2)] shadow-[0_0_60px_rgba(255,51,102,0.1)] overflow-hidden">

            {/* Header */}
            <div className="p-6 border-b border-[rgba(255,51,102,0.1)]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[rgba(255,51,102,0.1)] border border-[rgba(255,51,102,0.2)]">
                  <AlertTriangle className="w-8 h-8 text-[#ff3366]" />
                </div>
                <div>
                  <h2 className="text-[#e0f0ff] mb-1" style={{ fontSize: "1.1rem" }}>
                    系统异常
                  </h2>
                  <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.75rem" }}>
                    CP-IM 捕获到一个运行时错误
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="p-6">
              <div className="p-4 rounded-xl bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.1)] mb-4">
                <p className="text-[#ff3366] font-mono break-all" style={{ fontSize: "0.8rem" }}>
                  {error?.message || "未知错误"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all shadow-[0_0_15px_rgba(0,180,255,0.1)]"
                  style={{ fontSize: "0.82rem" }}
                >
                  <RefreshCw className="w-4 h-4" />
                  重新加载
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] transition-all"
                  style={{ fontSize: "0.82rem" }}
                >
                  <Home className="w-4 h-4" />
                  返回首页
                </button>
                <button
                  onClick={this.handleCopyError}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                  style={{ fontSize: "0.82rem" }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "已复制" : "复制报告"}
                </button>
              </div>

              {/* Expandable Detail */}
              <button
                onClick={() => this.setState({ showDetail: !showDetail })}
                className="flex items-center gap-2 text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.6)] transition-all"
                style={{ fontSize: "0.72rem" }}
              >
                {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDetail ? "收起" : "展开"}错误详情
              </button>

              {showDetail && (
                <div className="mt-3 p-3 rounded-xl bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.08)] max-h-60 overflow-auto">
                  <p className="text-[rgba(0,212,255,0.3)] mb-2" style={{ fontSize: "0.68rem" }}>
                    堆栈跟踪:
                  </p>
                  <pre className="text-[rgba(255,51,102,0.5)] font-mono whitespace-pre-wrap break-all" style={{ fontSize: "0.65rem" }}>
                    {error?.stack || "无堆栈信息"}
                  </pre>
                  {errorInfo?.componentStack && (
                    <>
                      <p className="text-[rgba(0,212,255,0.3)] mb-2 mt-4" style={{ fontSize: "0.68rem" }}>
                        组件堆栈:
                      </p>
                      <pre className="text-[rgba(0,212,255,0.3)] font-mono whitespace-pre-wrap break-all" style={{ fontSize: "0.65rem" }}>
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[rgba(0,180,255,0.05)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <YYC3LogoSvg size={16} showText={false} />
                <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.65rem" }}>
                  CP-IM ErrorBoundary v1.0
                </span>
              </div>
              <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.65rem" }}>
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}