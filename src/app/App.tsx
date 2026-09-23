import { useCallback, useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Login } from "./components/Login";
import { I18nContext, useI18nProvider } from "./hooks/useI18n";
import { useYYC3Head } from "./hooks/useYYC3Head";
import { AuthContext } from "./lib/authContext";
import { installGlobalErrorListeners } from "./lib/error-handler";
import { isFigmaPlatformError } from "./lib/figma-error-filter";
import { ghostSignIn, isGhostMode, supabase } from "./lib/supabaseClient";
import { router } from "./routes";
import type { AppSession, UserRole } from "./types";

// ────────────────────────────────────────────────────────────────
// RF-003: Figma 平台 iframe 通信错误静默拦截
// 使用统一判定函数 isFigmaPlatformError()，消除重复逻辑
// 必须在 React 挂载前注册 capture phase，阻止错误冒泡到 error-handler
// ────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const name = reason?.name || reason?.constructor?.name || "";
    const msg = String(reason?.message || reason || "");
    const stack = reason?.stack || "";
    if (isFigmaPlatformError(name, msg, undefined, stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    // Auto-recover from Vite dynamic import failures (sandbox HMR)
    if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("dynamically imported module")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true); // capture phase — runs before any other listener

  window.addEventListener("error", (e) => {
    const src = e.filename || "";
    const msg = String(e.message || "");
    const name = e.error?.name || e.error?.constructor?.name || "";
    const stack = e.error?.stack || "";
    if (isFigmaPlatformError(name, msg, src, stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Layer 0: legacy window.onerror — return true to fully swallow the error
  const _prevOnerror = window.onerror;
  window.onerror = function (...args) {
    const [message, source, _lineno, _colno, error] = args as Parameters<OnErrorEventHandlerNonNull>;
    const name = error?.name || error?.constructor?.name || "";
    const msg = String(message || "");
    const src = String(source || "");
    const stack = error?.stack || "";
    if (isFigmaPlatformError(name, msg, src, stack)) {
      return true; // suppress completely
    }
    if (typeof _prevOnerror === "function") {
      return _prevOnerror.apply(this, args);
    }
    return false;
  };

  // Layer 0b: MessagePort error — intercept broken port communications from Figma iframe
  window.addEventListener("messageerror", (e) => {
    // MessagePort errors from Figma's iframe channel are safe to suppress
    e.stopImmediatePropagation();
  }, true);

  // Layer 0c: Suppress console.error noise from Figma platform errors
  // Some Figma errors bypass event listeners and get logged directly via console.error
  const _origConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    const joined = args.map(a => String(a ?? "")).join(" ").toLowerCase();
    if (
      joined.includes("iframemessageaborterror") ||
      joined.includes("message aborted") ||
      joined.includes("message port was destroyed") ||
      joined.includes("setupmessagechannel") ||
      (joined.includes("figma") && joined.includes("abort"))
    ) {
      return; // suppress silently (Figma platform noise)
    }
    // Suppress Recharts internal duplicate null key warnings (React 18 uses console.error)
    // Recharts v2.x renderGraphicChild always returns [element, null] for every
    // chart series, causing duplicate null keys when multiple series are rendered.
    const first = String(args[0] ?? "");
    if (
      first.includes("Encountered two children with the same key") &&
      (joined.includes("recharts") || joined.includes("surface") || joined.includes("categoricalchart"))
    ) {
      return; // suppress Recharts internal null key warnings
    }
    return _origConsoleError.apply(console, args);
  };

  // Layer 0d: Suppress Recharts internal duplicate null key warnings (console.warn variant)
  const _origConsoleWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    const first = String(args[0] ?? "");
    if (
      first.includes("Encountered two children with the same key") &&
      args.some(a => String(a ?? "").includes("recharts"))
    ) {
      return; // suppress Recharts internal null key warnings
    }
    return _origConsoleWarn.apply(console, args);
  };
}

export default function App() {
  // Force clean module re-evaluation after file changes
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole | "">("");
  const [isGhost, setIsGhost] = useState(false);

  // 国际化
  const i18nValue = useI18nProvider();

  // 注入 YYC3 品牌 <head> 标签 (favicon / manifest / theme-color / title)
  useYYC3Head();

  // SPA 404 回退还原 (Task 3.6): 404.html 将 Pages 深链 404 编码为 ?yyc3_fallback=
  // 查询参数回 SPA 入口; 此处在路由挂载前还原地址栏并跳转原始路径 (防 404 循环)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fallback = params.get("yyc3_fallback");
      if (fallback && fallback.startsWith("/")) {
        params.delete("yyc3_fallback");
        const qs = params.toString();
        window.history.replaceState(
          null,
          "",
          window.location.origin + "/" + (qs ? "?" + qs : "")
        );
        router.navigate(fallback);
      }
    } catch {
      /* URL 解析异常时忽略, 正常进入首页 */
    }
  }, []);

  // 安装全局错误监听器（仅一次）
  useEffect(() => {
    installGlobalErrorListeners();
  }, []);

  useEffect(() => {
    // 检查现有会话（带超时保护，防止 iframe 沙盒阻塞）
    const timeout = setTimeout(() => {
      // 超时兜底：3 秒内未完成认证检查，自动 Ghost 登录
      setAuthenticated((prev) => {
        if (prev === null) {
          // 超时 → 自动 Ghost 登录（Figma 沙箱友好）
          const session = ghostSignIn();
          setUserEmail(session.user.email);
          setUserRole(session.user.role as UserRole);
          setIsGhost(true);
          return true;
        }
        return prev;
      });
    }, 2000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        clearTimeout(timeout);
        if (data.session) {
          const session = data.session as AppSession;
          setUserEmail(session.user?.email ?? "admin@cloudpivot.local");
          setUserRole(session.user?.role ?? "admin");
          setIsGhost(isGhostMode());
          setAuthenticated(true);
        } else {
          // 无会话 → 自动 Ghost 登录（沙箱环境无需手动登录）
          const gs = ghostSignIn();
          setUserEmail(gs.user.email);
          setUserRole(gs.user.role as UserRole);
          setIsGhost(true);
          setAuthenticated(true);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        // 异常 → 自动 Ghost 登录
        const gs = ghostSignIn();
        setUserEmail(gs.user.email);
        setUserRole(gs.user.role as UserRole);
        setIsGhost(true);
        setAuthenticated(true);
      });

    return () => clearTimeout(timeout);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session as AppSession | null;
      setUserEmail(session?.user?.email ?? "admin@cloudpivot.local");
      setUserRole(session?.user?.role ?? "admin");
      setIsGhost(isGhostMode());
    });
    setAuthenticated(true);
  }, []);

  /** 灵登录 · 跳过认证直接进入 */
  const handleGhostLogin = useCallback(() => {
    const session = ghostSignIn();
    setUserEmail(session.user.email);
    setUserRole(session.user.role as UserRole);
    setIsGhost(true);
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setUserEmail("");
    setUserRole("");
    setIsGhost(false);
  }, []);

  // 初始化检查中 - 显示加载
  if (authenticated === null) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[rgba(0,212,255,0.2)] border-t-[#00d4ff] rounded-full animate-spin" />
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.75rem" }}>
            正在初始化...
          </span>
        </div>
      </div>
    );
  }

  // 未登录 - 显示登录页
  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} onGhostLogin={handleGhostLogin} />;
  }

  // 已登录 - 显示主应用
  return (
    <ErrorBoundary level="page" source="App">
      <AuthContext.Provider value={{ logout: handleLogout, userEmail, userRole, isGhost }}>
        <I18nContext.Provider value={i18nValue}>
          <RouterProvider router={router} />
        </I18nContext.Provider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
