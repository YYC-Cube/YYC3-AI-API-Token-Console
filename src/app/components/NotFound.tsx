/**
 * NotFound.tsx
 * =============
 * RF-011: 404 通配路由页面
 *
 * 赛博朋克风格 404 页面：
 * - 错误码展示 + 动态光效
 * - 返回首页按钮
 * - 当前路径提示
 * - 完整 i18n 支持
 */

import React from "react";
import { useNavigate, useLocation } from "react-router";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";
import { useI18n } from "../hooks/useI18n";

export function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Glowing 404 */}
      <div className="relative mb-8">
        <h1
          className="select-none"
          style={{
            fontSize: "8rem",
            fontWeight: 700,
            lineHeight: 1,
            color: "transparent",
            background: "linear-gradient(135deg, #00d4ff 0%, #0066ff 50%, #00d4ff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            textShadow: "0 0 40px rgba(0,212,255,0.3)",
            letterSpacing: "-0.02em",
          }}
        >
          404
        </h1>
        <div
          className="absolute inset-0 blur-3xl opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #00d4ff 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Error icon & message */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-[#ff6b35]" />
        <span
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {t("notFound.title")}
        </span>
      </div>

      <p
        className="mb-2 max-w-md"
        style={{
          fontSize: "0.875rem",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6,
        }}
      >
        {t("notFound.desc")}
      </p>

      {/* Current path display */}
      <div
        className="mb-8 px-4 py-2 rounded-lg"
        style={{
          background: "rgba(255,107,53,0.08)",
          border: "1px solid rgba(255,107,53,0.2)",
        }}
      >
        <code
          style={{
            fontSize: "0.8125rem",
            color: "#ff6b35",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          {location.pathname}
        </code>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("notFound.goBack")}
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#fff",
            background: "linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(0,102,255,0.2) 100%)",
            border: "1px solid rgba(0,212,255,0.3)",
            boxShadow: "0 0 20px rgba(0,212,255,0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,212,255,0.6)";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(0,212,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(0,212,255,0.1)";
          }}
        >
          <Home className="w-4 h-4" />
          {t("notFound.goHome")}
        </button>
      </div>

      {/* Decorative scan line */}
      <div
        className="mt-12 w-full max-w-xs h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.3) 50%, transparent 100%)",
        }}
      />
      <p
        className="mt-3"
        style={{
          fontSize: "0.6875rem",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
        {t("notFound.footer")}
      </p>
    </div>
  );
}
