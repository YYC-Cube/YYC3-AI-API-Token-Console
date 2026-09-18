/**
 * DesignSystemPage.tsx
 * =====================
 * 第九章 · 设计交付物 · Design System 总览页面
 *
 * 路由: /design-system
 *
 * 包含:
 * 9.1 Design Tokens (色彩/字体/间距/阴影/动效)
 * 9.1 组件库 (Atoms/Molecules/Organisms/Templates)
 * 9.2 交互原型 (状态设计 + 交互规范)
 * 9.3 阶段审核总结
 */

import React, { useState, useContext } from "react";
import {
  Palette, Layers, BookOpen, ClipboardCheck, ChevronRight,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { DesignTokens } from "./DesignTokens";
import { ComponentShowcase } from "./ComponentShowcase";
import { StageReview } from "./StageReview";
import { ViewContext } from "../../lib/view-context";
import { useI18n } from "../../hooks/useI18n";

export function DesignSystemPage() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState("tokens");

  const SECTIONS = [
    { key: "tokens",    label: t("designSystem.tokens"),     icon: Palette,        desc: t("designSystem.tokensDesc") },
    { key: "components", label: t("designSystem.components"), icon: Layers,         desc: t("designSystem.componentsDesc") },
    { key: "review",    label: t("designSystem.review"),     icon: ClipboardCheck, desc: t("designSystem.reviewDesc") },
  ];

  return (
    <div className="space-y-4" data-testid="design-system-page">
      {/* ======== Header ======== */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
            {t("designSystem.title")}
          </h2>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
            {t("designSystem.subtitle")}
          </p>
        </div>
      </div>

      {/* ======== Section Nav ======== */}
      <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.3)]"
                  : "bg-[rgba(0,40,80,0.06)] border border-transparent hover:border-[rgba(0,212,255,0.1)]"
              }`}
              data-testid={`section-${s.key}`}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color: isActive ? "#00d4ff" : "rgba(0,212,255,0.3)" }} />
              <div className="flex-1">
                <p className={isActive ? "text-[#e0f0ff]" : "text-[#c0dcf0]"} style={{ fontSize: "0.78rem" }}>
                  {s.label}
                </p>
                <p className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem" }}>
                  {s.desc}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? "#00d4ff" : "rgba(0,212,255,0.15)" }} />
            </button>
          );
        })}
      </div>

      {/* ======== Content ======== */}
      <GlassCard className="p-4">
        {activeSection === "tokens" && <DesignTokens />}
        {activeSection === "components" && <ComponentShowcase />}
        {activeSection === "review" && <StageReview />}
      </GlassCard>
    </div>
  );
}