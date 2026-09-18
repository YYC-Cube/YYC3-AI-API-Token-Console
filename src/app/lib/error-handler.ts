/**
 * error-handler.ts
 * =================
 * YYC³ 全局错误处理工具
 *
 * 功能：
 * - 统一错误分类（网络/解析/认证/运行时/未知）
 * - 错误日志记录（localStorage 快速读 + IndexedDB 持久化双写）
 * - 全局未捕获异常监听
 * - 错误上报队列（本地离线可追溯）
 *
 * 设计理念：
 * "可观、可看、可查、可操作、可跳转、可追溯、可预测"
 */

// ============================================================
// 类型定义 — 从全局类型中心导入
// ============================================================

import type { ErrorCategory, ErrorSeverity, AppError, ErrorStats } from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

// RF-002: IndexedDB 写入 — 异步双写, localStorage 同步读仍保留
import { idbPut, idbGetAll, idbClear } from "./yyc3-storage";
// RF-003: 统一 Figma 错误判定函数
import { isFigmaPlatformError } from "./figma-error-filter";

// ============================================================
// 错误日志存储
// ============================================================

const ERROR_LOG_KEY = "yyc3_error_log";
const MAX_ERROR_ENTRIES = 200;

/** 生成唯一错误ID */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 读取本地错误日志 */
export function getErrorLog(): AppError[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存错误到本地日志 */
function saveErrorToLog(error: AppError): void {
  // 1) 同步写入 localStorage（快速路径）
  try {
    const log = getErrorLog();
    log.unshift(error);
    // 保留最新 MAX_ERROR_ENTRIES 条
    const trimmed = log.slice(0, MAX_ERROR_ENTRIES);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage 已满，清除旧日志重试
    try {
      localStorage.setItem(ERROR_LOG_KEY, JSON.stringify([error]));
    } catch {
      // 完全无法写入，静默失败
    }
  }
  // 2) RF-002: 异步写入 IndexedDB（持久化路径，fire-and-forget）
  idbPut("errorLog", error).catch(() => {/* 静默降级 */});
}

/** 清除错误日志 */
export function clearErrorLog(): void {
  localStorage.removeItem(ERROR_LOG_KEY);
  // RF-002: 同步清除 IndexedDB errorLog store
  idbClear("errorLog").catch(() => {/* 静默降级 */});
}

/**
 * RF-002: 从 IndexedDB 异步读取完整错误日志
 * 用于导出 / 审计等需要完整数据的场景
 */
export async function getFullErrorLog(): Promise<AppError[]> {
  try {
    const entries = await idbGetAll<AppError>("errorLog");
    // 按时间倒序
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    // IndexedDB 不可用，降级到 localStorage
    return getErrorLog();
  }
}

/** 获取错误统计 */
export function getErrorStats(): ErrorStats {
  const log = getErrorLog();
  const byCategory: Record<ErrorCategory, number> = {
    NETWORK: 0, PARSE: 0, AUTH: 0, RUNTIME: 0,
    VALIDATION: 0, STORAGE: 0, UNKNOWN: 0,
  };
  const bySeverity: Record<ErrorSeverity, number> = {
    info: 0, warning: 0, error: 0, critical: 0,
  };
  let unresolvedCount = 0;

  for (const err of log) {
    byCategory[err.category] = (byCategory[err.category] || 0) + 1;
    bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
    if (!err.resolved) unresolvedCount++;
  }

  return {
    total: log.length,
    byCategory,
    bySeverity,
    unresolvedCount,
    lastErrorTime: log.length > 0 ? log[0].timestamp : null,
  };
}

// ============================================================
// 错误分类与创建
// ============================================================

/** 自动分类错误 */
function categorizeError(error: unknown): { category: ErrorCategory; severity: ErrorSeverity } {
  if (error instanceof TypeError) {
    return { category: "RUNTIME", severity: "error" };
  }
  if (error instanceof SyntaxError) {
    return { category: "PARSE", severity: "error" };
  }
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return { category: "STORAGE", severity: "warning" };
    }
    if (error.name === "SecurityError") {
      return { category: "AUTH", severity: "error" };
    }
  }
  if (error instanceof Event && error.type === "error") {
    return { category: "NETWORK", severity: "error" };
  }
  return { category: "UNKNOWN", severity: "error" };
}

/** 提取错误信息 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as any).message);
  }
  return "未知错误";
}

/** 提取堆栈信息 */
function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

// ============================================================
// 核心 API
// ============================================================

/**
 * 记录错误（核心函数）
 * @param error - 原始错误对象或错误消息
 * @param options - 附加选项
 * @returns 创建的 AppError 对象
 */
export function captureError(
  error: unknown,
  options: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    source?: string;
    userAction?: string;
    silent?: boolean; // 静默模式（不打印到控制台）
  } = {}
): AppError {
  const auto = categorizeError(error);

  const appError: AppError = {
    id: generateErrorId(),
    category: options.category || auto.category,
    severity: options.severity || auto.severity,
    message: extractMessage(error),
    stack: extractStack(error),
    source: options.source,
    userAction: options.userAction,
    timestamp: Date.now(),
    resolved: false,
  };

  // 保存到本地日志
  saveErrorToLog(appError);

  // 控制台输出
  if (!options.silent) {
    const prefix = `[YYC³ ${appError.category}]`;
    switch (appError.severity) {
      case "critical":
      case "error":
        console.error(prefix, appError.message, appError.stack || "");
        break;
      case "warning":
        console.warn(prefix, appError.message);
        break;
      default:
        console.info(prefix, appError.message);
    }
  }

  return appError;
}

/**
 * 网络错误处理
 */
export function captureNetworkError(
  error: unknown,
  endpoint: string
): AppError {
  return captureError(error, {
    category: "NETWORK",
    severity: "warning",
    source: endpoint,
    userAction: "检查网络连或稍后重试",
  });
}

/**
 * WebSocket 错误处理
 */
export function captureWSError(
  error: unknown,
  detail?: string
): AppError {
  return captureError(error, {
    category: "NETWORK",
    severity: "warning",
    source: "WebSocket",
    userAction: "系统将自动尝试重连，或点击手动重连按钮",
  });
}

/**
 * 认证错误处理
 */
export function captureAuthError(error: unknown): AppError {
  return captureError(error, {
    category: "AUTH",
    severity: "error",
    source: "AuthContext",
    userAction: "请重新登录",
  });
}

/**
 * 解析错误处理
 */
export function captureParseError(
  error: unknown,
  context: string
): AppError {
  return captureError(error, {
    category: "PARSE",
    severity: "warning",
    source: context,
    userAction: "数据格式异常，请检查数据源",
  });
}

/**
 * 异步操作安全包装器
 * 包装 async 函数，自动捕获错误并返回 [data, error] 元组
 */
export async function trySafe<T>(
  fn: () => Promise<T>,
  source?: string
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (err) {
    const appError = captureError(err, { source });
    return [null, appError];
  }
}

/**
 * 同步操作安全包装器
 */
export function trySafeSync<T>(
  fn: () => T,
  source?: string
): [T, null] | [null, AppError] {
  try {
    const result = fn();
    return [result, null];
  } catch (err) {
    const appError = captureError(err, { source });
    return [null, appError];
  }
}

// ============================================================
// 全局监听器
// ============================================================

let globalListenerInstalled = false;

/**
 * 安装全局错误监听器
 * - window.onerror: 同步运行时错误
 * - window.onunhandledrejection: 未捕获的 Promise 错误
 *
 * RF-003: 使用 isFigmaPlatformError() 统一判定，
 *         App.tsx capture-phase 已做第一层拦截，此处为防御性二次检查
 */
export function installGlobalErrorListeners(): void {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;

  // 全局运行时错误
  window.addEventListener("error", (event) => {
    // RF-003: 统一使用 figma-error-filter 判定
    const errName = event.error?.name || event.error?.constructor?.name || "";
    const errStack = event.error?.stack || "";
    if (isFigmaPlatformError(errName, String(event.message || ""), event.filename || "", errStack)) {
      return;
    }
    captureError(event.error || event.message, {
      category: "RUNTIME",
      severity: "critical",
      source: `${event.filename}:${event.lineno}:${event.colno}`,
      silent: false,
    });
  });

  // 未捕获的 Promise rejection
  window.addEventListener("unhandledrejection", (event) => {
    // RF-003: 统一使用 figma-error-filter 判定
    const reason = event.reason;
    const name = reason?.name || reason?.constructor?.name || "";
    const msg = String(reason?.message || reason || "");
    const stack = reason?.stack || "";
    if (isFigmaPlatformError(name, msg, undefined, stack)) {
      event.preventDefault();
      return;
    }
    captureError(event.reason, {
      category: "RUNTIME",
      severity: "error",
      source: "UnhandledPromiseRejection",
      silent: false,
    });
  });

  console.info("[YYC³] 全局错误监听器已安装");
}