/**
 * IDEStatusBar.tsx
 * =================
 * IDE 底部状态栏
 * Git 分支 + 行/列 + 语言 + 编码 + 缩进 + 错误/警告计数
 */

import React from "react";
import {
  GitBranch, AlertTriangle, XCircle, Info,
  Check, Wifi, WifiOff, Zap,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import { MOCK_GIT_BRANCHES } from "./ide-mock-data";
import type { OpenTab } from "./ide-types";
import { getLanguageLabel } from "../CodeEditor";

interface IDEStatusBarProps {
  activeTab?: OpenTab;
  totalErrors: number;
  totalWarnings: number;
  isOnline: boolean;
}

export function IDEStatusBar({ activeTab, totalErrors, totalWarnings, isOnline }: IDEStatusBarProps) {
  const { t } = useI18n();
  const currentBranch = MOCK_GIT_BRANCHES.find((b) => b.current) ?? MOCK_GIT_BRANCHES[0];

  // Calculate cursor position from content (mock: end of file)
  const lines = activeTab ? activeTab.content.split("\n").length : 0;
  const langLabel = activeTab ? getLanguageLabel(activeTab.filename) : "";

  return (
    <div
      className="flex items-center justify-between px-2 shrink-0"
      style={{
        height: "22px",
        background: "linear-gradient(90deg, rgba(0,40,80,0.6) 0%, rgba(0,30,60,0.5) 100%)",
        borderTop: "1px solid rgba(0,180,255,0.12)",
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* Git branch */}
        <button className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[rgba(0,212,255,0.08)] transition-all text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff]">
          <GitBranch className="w-3 h-3" />
          <span style={{ fontSize: "0.55rem" }}>{currentBranch.name}</span>
          {currentBranch.ahead > 0 && (
            <span className="text-[#00ff88]" style={{ fontSize: "0.5rem" }}>↑{currentBranch.ahead}</span>
          )}
        </button>

        {/* Errors / Warnings */}
        <div className="flex items-center gap-1.5">
          {totalErrors > 0 && (
            <span className="flex items-center gap-0.5 text-[#ff3366]">
              <XCircle className="w-3 h-3" />
              <span style={{ fontSize: "0.55rem" }}>{totalErrors}</span>
            </span>
          )}
          {totalWarnings > 0 && (
            <span className="flex items-center gap-0.5 text-[#ffaa00]">
              <AlertTriangle className="w-3 h-3" />
              <span style={{ fontSize: "0.55rem" }}>{totalWarnings}</span>
            </span>
          )}
          {totalErrors === 0 && totalWarnings === 0 && (
            <span className="flex items-center gap-0.5 text-[rgba(0,255,136,0.5)]">
              <Check className="w-3 h-3" />
              <span style={{ fontSize: "0.55rem" }}>0</span>
            </span>
          )}
        </div>

        {/* Notifications */}
        <span className="flex items-center gap-0.5 text-[rgba(0,212,255,0.3)]">
          <Info className="w-3 h-3" />
          <span style={{ fontSize: "0.5rem" }}>
            {t("ide.ready")}
          </span>
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Line / Column */}
        {activeTab && (
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>
            Ln {lines}, Col 1
          </span>
        )}

        {/* Indentation */}
        <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.55rem" }}>
          Spaces: 2
        </span>

        {/* Encoding */}
        <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.55rem" }}>
          UTF-8
        </span>

        {/* Language */}
        {langLabel && (
          <button className="px-1 py-0.5 rounded text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all">
            <span style={{ fontSize: "0.55rem" }}>{langLabel}</span>
          </button>
        )}

        {/* Format */}
        <button
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
          title="Prettier"
        >
          <Zap className="w-3 h-3" />
          <span style={{ fontSize: "0.5rem" }}>Prettier</span>
        </button>

        {/* Connection */}
        <span className={`flex items-center gap-0.5 ${isOnline ? "text-[rgba(0,255,136,0.5)]" : "text-[rgba(255,51,102,0.5)]"}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        </span>
      </div>
    </div>
  );
}
