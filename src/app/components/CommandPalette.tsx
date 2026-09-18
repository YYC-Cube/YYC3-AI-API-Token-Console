/**
 * CommandPalette.tsx
 * ===================
 * 全局命令面板 · Cmd/Ctrl+K 触发
 *
 * i18n 已迁移
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, ArrowRight, Keyboard, X,
  Activity, Bell, Shield, Wrench, FolderOpen, Terminal,
  Code2, FileSearch, Users, Settings, Bot, BarChart3,
  Cpu, Smartphone, HardDrive, Database, GitBranch, BrainCircuit,
  Package, Gauge, ServerCog,
} from "lucide-react";
import { useNavigate } from "react-router";
import { SHORTCUT_LIST } from "../hooks/useKeyboardShortcuts";
import { useI18n } from "../hooks/useI18n";

const iconMap: Record<string, React.ElementType> = {
  Activity, Bell, Shield, Wrench, FolderOpen, Terminal,
  Code2, FileSearch, Users, Settings, Bot, BarChart3,
  Cpu, Smartphone, HardDrive, Database, GitBranch, BrainCircuit,
  Package, Gauge, ServerCog,
};

interface PaletteItem {
  id: string;
  labelKey: string;
  descKey: string;
  category: string;
  icon: string;
  path?: string;
  shortcut?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: "nav-home",       labelKey: "nav.dataMonitor",  descKey: "monitor.subtitle",          category: "nav",  icon: "Activity",   path: "/",            shortcut: "" },
  { id: "nav-followup",   labelKey: "nav.followUp",     descKey: "followUp.subtitle",         category: "nav",  icon: "Bell",       path: "/follow-up",   shortcut: "⌘+Shift+A" },
  { id: "nav-patrol",     labelKey: "nav.patrol",       descKey: "patrol.subtitle",           category: "nav",  icon: "Shield",     path: "/patrol",      shortcut: "⌘+Shift+P" },
  { id: "nav-operations", labelKey: "nav.operations",   descKey: "operations.subtitle",       category: "nav",  icon: "Wrench",     path: "/operations",  shortcut: "⌘+Shift+O" },
  { id: "nav-files",      labelKey: "nav.fileManager",  descKey: "fileManager.subtitle",      category: "nav",  icon: "FolderOpen", path: "/files",       shortcut: "⌘+Shift+F" },
  { id: "nav-terminal",   labelKey: "nav.terminal",     descKey: "palette.navigate",          category: "nav",  icon: "Terminal",   path: "/terminal",    shortcut: "⌘+Shift+L" },
  { id: "nav-ide",        labelKey: "nav.ide",          descKey: "palette.navigate",          category: "nav",  icon: "Code2",      path: "/ide" },
  { id: "nav-ai",         labelKey: "nav.aiDecision",   descKey: "ai.subtitle",               category: "nav",  icon: "Bot",        path: "/ai" },
  { id: "nav-loop",       labelKey: "nav.serviceLoop",  descKey: "loop.subtitle",             category: "nav",  icon: "Activity",   path: "/loop" },
  { id: "nav-design",     labelKey: "nav.designSystem", descKey: "devGuide.architecture",     category: "nav",  icon: "BarChart3",  path: "/design-system" },
  { id: "nav-devguide",   labelKey: "nav.devGuide",     descKey: "devGuide.subtitle",         category: "nav",  icon: "Activity",   path: "/dev-guide" },
  { id: "nav-models",     labelKey: "modelProvider.title", descKey: "modelProvider.subtitle", category: "nav",  icon: "Cpu",        path: "/models" },
  { id: "nav-audit",      labelKey: "nav.audit",        descKey: "palette.navigate",          category: "nav",  icon: "FileSearch", path: "/audit" },
  { id: "nav-users",      labelKey: "nav.userMgmt",     descKey: "palette.navigate",          category: "nav",  icon: "Users",      path: "/users" },
  { id: "nav-settings",   labelKey: "nav.settings",     descKey: "settings.title",            category: "nav",  icon: "Settings",   path: "/settings" },
  { id: "nav-security",   labelKey: "nav.securityMonitor", descKey: "security.subtitle",      category: "nav",  icon: "Shield",     path: "/security" },
  { id: "nav-alerts",     labelKey: "nav.alertRules",    descKey: "alerts.subtitle",           category: "nav",  icon: "Bell",       path: "/alerts" },
  { id: "nav-reports",    labelKey: "nav.reportExport",  descKey: "reports.subtitle",          category: "nav",  icon: "BarChart3",  path: "/reports" },
  { id: "nav-aidiag",     labelKey: "nav.aiDiagnostics", descKey: "aiDiag.subtitle",           category: "nav",  icon: "BrainCircuit", path: "/ai-diagnosis" },
  { id: "nav-hostfiles",  labelKey: "nav.hostFiles",     descKey: "palette.navigate",          category: "nav",  icon: "HardDrive",  path: "/host-files" },
  { id: "nav-database",   labelKey: "nav.database",      descKey: "palette.navigate",          category: "nav",  icon: "Database",   path: "/database" },
  { id: "nav-refactoring", labelKey: "nav.refactoring",  descKey: "palette.navigate",          category: "nav",  icon: "GitBranch",  path: "/refactoring" },
  { id: "nav-pwa",        labelKey: "nav.pwa",           descKey: "pwa.subtitle",              category: "nav",  icon: "Smartphone", path: "/pwa" },
  { id: "nav-dataeditor", labelKey: "nav.dataEditor",    descKey: "palette.navigate",          category: "nav",  icon: "Package",    path: "/data-editor" },
  { id: "nav-performance", labelKey: "nav.performance",  descKey: "palette.navigate",          category: "nav",  icon: "Gauge",      path: "/performance" },
  { id: "nav-envconfig",   labelKey: "nav.envConfig",    descKey: "palette.navigate",          category: "nav",  icon: "ServerCog",  path: "/env-config" },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setShowShortcuts(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return PALETTE_ITEMS;
    const q = query.toLowerCase();
    return PALETTE_ITEMS.filter(
      (item) =>
        t(item.labelKey).toLowerCase().includes(q) ||
        t(item.descKey).toLowerCase().includes(q) ||
        (item.path ?? "").toLowerCase().includes(q)
    );
  }, [query, t]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.path) {
        navigate(item.path);
      }
      onClose();
    },
    [navigate, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    },
    [filteredItems, selectedIndex, handleSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        data-testid="command-palette-overlay"
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        data-testid="command-palette"
        className="fixed left-1/2 top-[15%] z-[9999] w-[90vw] max-w-xl -translate-x-1/2 rounded-xl border border-[#00d4ff]/30 bg-[#0a1628]/95 shadow-2xl shadow-[#00d4ff]/10 backdrop-blur-md"
      >
        {/* 搜索栏 */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-[#00d4ff]" />
          <input
            ref={inputRef}
            data-testid="palette-input"
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none"
            placeholder={t("palette.placeholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            data-testid="shortcuts-toggle"
            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-[#00d4ff]"
            onClick={() => setShowShortcuts((prev) => !prev)}
            title={t("palette.shortcutHelp")}
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 快捷键面板 */}
        {showShortcuts && (
          <div data-testid="shortcuts-panel" className="border-b border-white/10 px-4 py-3">
            <h3 className="mb-2 text-sm text-[#00d4ff]">{t("palette.shortcutHelp")}</h3>
            <div className="grid grid-cols-2 gap-1">
              {SHORTCUT_LIST.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded px-2 py-1 text-xs text-white/60">
                  <span>{s.description}</span>
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#00d4ff]">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 结果列表 */}
        <div data-testid="palette-results" className="max-h-[50vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">
              {t("palette.noResults")}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = iconMap[item.icon] || Activity;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  data-testid={`palette-item-${item.id}`}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-[#00d4ff]/15 text-[#00d4ff]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="text-sm">{t(item.labelKey)}</span>
                    <span className="ml-2 text-xs text-white/30">{t(item.descKey)}</span>
                  </div>
                  {item.shortcut && (
                    <kbd className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                      {item.shortcut}
                    </kbd>
                  )}
                  <ArrowRight className="h-3 w-3 shrink-0 text-white/20" />
                </button>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/30">
          <span>↑↓ {t("palette.navigate")} · Enter {t("palette.enter")} · Esc {t("palette.escape")}</span>
          <span>{filteredItems.length} {t("palette.navigate")}</span>
        </div>
      </div>
    </>
  );
}