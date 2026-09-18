/**
 * IDEViewSwitcher.tsx
 * ====================
 * 视图切换栏：返回 / 预览 / 代码 / 布局模式 / 搜索 / 更多
 */

import React from "react";
import {
  Maximize2, Eye, Code2, Search, MoreHorizontal,
  PanelRightClose, Columns3,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import type { IDEViewMode, IDELayoutMode } from "./ide-types";

interface IDEViewSwitcherProps {
  viewMode: IDEViewMode;
  onViewChange: (mode: IDEViewMode) => void;
  layoutMode: IDELayoutMode;
  onLayoutModeChange: (mode: IDELayoutMode) => void;
  onSearch: () => void;
  onFullscreen: () => void;
}

export function IDEViewSwitcher({
  viewMode, onViewChange, layoutMode, onLayoutModeChange, onSearch, onFullscreen,
}: IDEViewSwitcherProps) {
  const { t } = useI18n();

  const viewButtons: { mode: IDEViewMode; icon: React.ElementType; label: string; shortcut: string }[] = [
    { mode: "preview", icon: Eye, label: t("ide.preview"), shortcut: "Ctrl+1" },
    { mode: "code", icon: Code2, label: t("ide.code"), shortcut: "Ctrl+2" },
  ];

  const layoutButtons: { mode: IDELayoutMode; icon: React.ElementType; label: string; desc: string }[] = [
    { mode: "edit", icon: PanelRightClose, label: t("ide.editMode"), desc: t("ide.editModeDesc") },
    { mode: "preview", icon: Columns3, label: t("ide.previewMode"), desc: t("ide.previewModeDesc") },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 h-8 shrink-0"
      style={{
        background: "rgba(6,14,31,0.8)",
        borderBottom: "1px solid rgba(0,180,255,0.08)",
      }}
    >
      {/* Left: Fullscreen + View toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFullscreen}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-[rgba(0,212,255,0.08)] transition-all text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff]"
          style={{ fontSize: "0.65rem" }}
          title={t("ide.fullscreen")}
        >
          <Maximize2 className="w-3 h-3" />
          <span>{t("ide.fullscreen")}</span>
        </button>

        <div className="w-px h-3.5 bg-[rgba(0,180,255,0.1)] mx-1" />

        {viewButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = viewMode === btn.mode;
          return (
            <button
              key={btn.mode}
              onClick={() => onViewChange(isActive ? "default" : btn.mode)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                isActive
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[rgba(0,212,255,0.7)] hover:bg-[rgba(0,212,255,0.05)]"
              }`}
              style={{ fontSize: "0.65rem" }}
              title={`${btn.label} (${btn.shortcut})`}
            >
              <Icon className="w-3 h-3" />
              <span>{btn.label}</span>
            </button>
          );
        })}

        {/* Layout mode divider + toggle */}
        <div className="w-px h-3.5 bg-[rgba(0,180,255,0.1)] mx-1" />

        {layoutButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = layoutMode === btn.mode;
          return (
            <button
              key={btn.mode}
              onClick={() => onLayoutModeChange(btn.mode)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                isActive
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[rgba(0,212,255,0.7)] hover:bg-[rgba(0,212,255,0.05)]"
              }`}
              style={{ fontSize: "0.65rem" }}
              title={`${btn.label} — ${btn.desc}`}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Search + More */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onSearch}
          className="flex items-center gap-1 px-2 py-1 rounded text-[rgba(0,212,255,0.4)] hover:text-[rgba(0,212,255,0.7)] hover:bg-[rgba(0,212,255,0.05)] transition-all"
          style={{ fontSize: "0.65rem" }}
          title={`${t("ide.search")} (Ctrl+Shift+F)`}
        >
          <Search className="w-3 h-3" />
          <span>{t("ide.search")}</span>
        </button>
        <button
          className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,212,255,0.05)] transition-all"
          title={t("ide.more")}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}