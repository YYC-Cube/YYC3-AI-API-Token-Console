/**
 * FamilyPageHeader.tsx
 * =====================
 * AI Family 子页面统一头部导航
 * 包含返回按钮、标题、副标题、可选操作按钮
 */

import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface FamilyPageHeaderProps {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function FamilyPageHeader({
  icon: Icon,
  iconColor = "#00d4ff",
  title,
  subtitle,
  backPath = "/ai-family-home",
  backLabel = "返回家园",
  actions,
}: FamilyPageHeaderProps) {
  const nav = useNavigate();

  return (
    <div className="px-4 md:px-8 pt-6 pb-4 border-b border-[rgba(0,180,255,0.06)]">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => nav(backPath)}
          className="flex items-center gap-1 text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-colors mb-3"
          style={{ fontSize: "0.72rem" }}
        >
          <ChevronLeft className="w-3 h-3" /> {backLabel}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "1.2rem" }}>
              <Icon className="w-5 h-5" style={{ color: iconColor }} /> {title}
            </h1>
            {subtitle && (
              <p className="text-[rgba(224,240,255,0.4)] mt-1" style={{ fontSize: "0.78rem" }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
