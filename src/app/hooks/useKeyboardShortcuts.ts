/**
 * useKeyboardShortcuts.ts
 * ========================
 * 全局快捷键系统 Hook
 *
 * Guidelines 6.2 快捷键绑定:
 * ─────────────────────────────────────────
 * Cmd/Ctrl + K           快速搜索         全局
 * Cmd/Ctrl + Shift + A   告警列表         全局
 * Cmd/Ctrl + Shift + P   巡查面板         全局
 * Cmd/Ctrl + Shift + O   操作中心         全局
 * Cmd/Ctrl + Shift + L   日志查看         全局
 * Cmd/Ctrl + Shift + F   文件管理         全局
 * Ctrl + `               集成终端         全局
 * Esc                    关闭抽屉/模态框   全局
 */

import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { RegisteredShortcut } from "../types";

// RF-011: Re-export 已移除

interface ShortcutConfig {
  /** 是否启用快捷键 */
  enabled?: boolean;
  /** Esc 键回调 */
  onEscape?: () => void;
  /** 搜索快捷键回调 */
  onSearch?: () => void;
  /** 集成终端切换回调 */
  onToggleTerminal?: () => void;
}

/** 平台检测 */
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? "");
const modLabel = isMac ? "⌘" : "Ctrl";

/** ��整快捷键列表（用于帮助面板展示） */
export const SHORTCUT_LIST: RegisteredShortcut[] = [
  { id: "search",     keys: `${modLabel}+K`,           description: "快速搜索",     category: "全局" },
  { id: "alerts",     keys: `${modLabel}+Shift+A`,     description: "告警 / 一键跟进", category: "全局" },
  { id: "patrol",     keys: `${modLabel}+Shift+P`,     description: "巡查面板",     category: "全局" },
  { id: "operations", keys: `${modLabel}+Shift+O`,     description: "操作中心",     category: "全局" },
  { id: "logs",       keys: `${modLabel}+Shift+L`,     description: "日志 / 终端",  category: "全局" },
  { id: "files",      keys: `${modLabel}+Shift+F`,     description: "文件管理",     category: "全局" },
  { id: "terminal",   keys: "Ctrl+`",                  description: "集成终端",     category: "全局" },
  { id: "escape",     keys: "Esc",                     description: "关闭抽屉/模态框", category: "全局" },
];

export function useKeyboardShortcuts(config: ShortcutConfig = {}) {
  const { enabled = true, onEscape, onSearch, onToggleTerminal } = config;
  const navigate = useNavigate();
  const lastToast = useRef<number>(0);

  // 防抖 toast
  const showToast = useCallback((msg: string) => {
    const now = Date.now();
    if (now - lastToast.current > 800) {
      toast.info(msg);
      lastToast.current = now;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ctrl+` (backtick) — 集成终端切换（允许在任何焦点状态下生效）
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        onToggleTerminal?.();
        return;
      }

      // 忽略输入框内的快捷键
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          onEscape?.();
        }
        return;
      }

      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K  → 搜索
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch?.();
        showToast("🔍 快速搜索");
        return;
      }

      // Cmd/Ctrl + Shift + ...
      if (mod && e.shiftKey) {
        const key = e.key.toUpperCase();

        switch (key) {
          case "A":
            e.preventDefault();
            navigate("/follow-up");
            showToast("⚠️ 告警 → 一键跟进");
            return;
          case "P":
            e.preventDefault();
            navigate("/patrol");
            showToast("🛡 巡查面板");
            return;
          case "O":
            e.preventDefault();
            navigate("/operations");
            showToast("⚙️ 操作中心");
            return;
          case "L":
            e.preventDefault();
            navigate("/terminal");
            showToast("📋 终端日志");
            return;
          case "F":
            e.preventDefault();
            navigate("/files");
            showToast("📁 文件管理");
            return;
        }
      }

      // Esc
      if (e.key === "Escape") {
        onEscape?.();
      }
    },
    [enabled, navigate, onEscape, onSearch, onToggleTerminal, showToast]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  return { shortcuts: SHORTCUT_LIST };
}