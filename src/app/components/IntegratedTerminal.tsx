/**
 * IntegratedTerminal.tsx
 * ======================
 * VS Code 风格集成终端面板
 * 底部滑出 · 可拖拽调节高度 · 多 Tab 终端实例
 * 快捷键 Ctrl+` 全局切换
 *
 * 功能:
 * - 多 Tab 独立终端实例（每个 Tab 独立 history / state）
 * - goto / open 路由跳转
 * - ai <prompt> Text-to-CLI 联动
 * - 拖拽调节高度 + localStorage 持久化
 *
 * 赛博朋克风格，深蓝底 + 青色强调
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import {
  Terminal,
  Minus,
  Maximize2,
  Minimize2,
  X,
  Plus,
  Ghost,
  Sparkles,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useTerminal } from "../hooks/useTerminal";
import { ViewContext } from "../lib/view-context";
import { AuthContext } from "../lib/authContext";
import { isGhostMode } from "../lib/supabaseClient";

/* ── 常量 ─────────────────────────────── */
const MIN_HEIGHT = 180;
const DEFAULT_HEIGHT = 320;
const MAX_HEIGHT_RATIO = 0.75;
const STORAGE_KEY = "yyc3_terminal_height";
const MAX_TABS = 6;

/* ── 类型 ─────────────────────────────── */
interface IntegratedTerminalProps {
  open: boolean;
  onClose: () => void;
}

interface TerminalTabMeta {
  id: string;
  label: string;
  createdAt: number;
}

/* ── 单 Tab 终端渲染 ──────────────────── */
function TerminalTabPane({
  tabId,
  isActive,
  promptUser,
}: {
  tabId: string;
  isActive: boolean;
  promptUser: string;
}) {
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  const {
    history,
    inputValue,
    completions,
    execute,
    handleInputChange,
    handleHistoryNav,
    applyCompletion,
  } = useTerminal({ onNavigate: handleNavigate, tabId });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && isActive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isActive]);

  // Focus when active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isActive]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        execute(inputValue);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleHistoryNav("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleHistoryNav("down");
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (completions.length > 0) {
          applyCompletion(completions[0]);
        }
      }
    },
    [inputValue, completions, execute, handleHistoryNav, applyCompletion]
  );

  const statusColor: Record<string, string> = {
    success: "#00ff88",
    error: "#ff3366",
    info: "rgba(0,212,255,0.6)",
  };

  return (
    <div
      className={`flex-1 flex flex-col ${isActive ? "" : "hidden"}`}
      style={{ minHeight: 0 }}
    >
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto px-3 py-2 cursor-text"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
          fontSize: "0.75rem",
          lineHeight: "1.65",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,180,255,0.12) transparent",
        }}
      >
        {/* History */}
        {history.map((entry) => (
          <div key={entry.id} className="mb-1.5">
            {entry.input && (
              <div className="flex items-start gap-1">
                <span className="text-[#00ff88] shrink-0">{promptUser}@cpim</span>
                <span className="text-[rgba(0,212,255,0.25)] shrink-0">:</span>
                <span className="text-[#00d4ff] shrink-0">~</span>
                <span className="text-[rgba(0,212,255,0.25)] shrink-0">$</span>
                <span className="text-[#e0f0ff] ml-1 break-all">{entry.input}</span>
              </div>
            )}
            {entry.output && (
              <pre
                className="whitespace-pre-wrap mt-0.5"
                style={{
                  color: statusColor[entry.status] ?? "rgba(0,212,255,0.6)",
                }}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}

        {/* Current input line */}
        <div className="flex items-center gap-1">
          <span className="text-[#00ff88] shrink-0">{promptUser}@cpim</span>
          <span className="text-[rgba(0,212,255,0.25)] shrink-0">:</span>
          <span className="text-[#00d4ff] shrink-0">~</span>
          <span className="text-[rgba(0,212,255,0.25)] shrink-0">$</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#e0f0ff] outline-none ml-1 caret-[#00d4ff]"
            style={{ fontFamily: "inherit", fontSize: "inherit" }}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Completions */}
        {completions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 ml-4">
            {completions.map((c) => (
              <button
                key={c}
                onClick={() => applyCompletion(c)}
                className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.12)] transition-all"
                style={{ fontSize: "0.68rem" }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 主组件 ──────────────────────────── */
export function IntegratedTerminal({ open, onClose }: IntegratedTerminalProps) {
  const view = useContext(ViewContext);
  const auth = useContext(AuthContext);
  const isMobile = view?.isMobile ?? false;
  const ghost = isGhostMode();

  // ── 多 Tab 管理 ──
  const [tabs, setTabs] = useState<TerminalTabMeta[]>([
    { id: "tab-1", label: "cpim", createdAt: Date.now() },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const tabCounter = useRef(1);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    tabCounter.current += 1;
    const newId = `tab-${tabCounter.current}`;
    setTabs((prev) => [
      ...prev,
      { id: newId, label: `cpim-${tabCounter.current}`, createdAt: Date.now() },
    ]);
    setActiveTabId(newId);
  }, [tabs.length]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (next.length === 0) {
          // 关最后一个 tab = 关整个终端
          onClose();
          return [{ id: "tab-1", label: "cpim", createdAt: Date.now() }];
        }
        if (activeTabId === tabId) {
          setActiveTabId(next[next.length - 1].id);
        }
        return next;
      });
    },
    [activeTabId, onClose]
  );

  // ── 面板高度 ──
  const [panelHeight, setPanelHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Math.max(MIN_HEIGHT, parseInt(saved, 10)) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });
  const [maximized, setMaximized] = useState(false);

  const dragRef = useRef<{
    startY: number;
    startH: number;
    dragging: boolean;
  } | null>(null);

  // Focus on open
  useEffect(() => {
    if (!open) return;
    // reset if tabs empty
    if (tabs.length === 0) {
      tabCounter.current = 1;
      setTabs([{ id: "tab-1", label: "cpim", createdAt: Date.now() }]);
      setActiveTabId("tab-1");
    }
  }, [open, tabs.length]);

  // Persist height
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(panelHeight));
    } catch {}
  }, [panelHeight]);

  /* ── 拖拽调高 ─────────────────────────── */
  const onDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragRef.current = {
        startY: clientY,
        startH: panelHeight,
        dragging: true,
      };

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragRef.current?.dragging) return;
        const y =
          "touches" in ev
            ? (ev as TouchEvent).touches[0].clientY
            : (ev as MouseEvent).clientY;
        const delta = dragRef.current.startY - y;
        const maxH = window.innerHeight * MAX_HEIGHT_RATIO;
        const newH = Math.min(
          maxH,
          Math.max(MIN_HEIGHT, dragRef.current.startH + delta)
        );
        setPanelHeight(newH);
        setMaximized(false);
      };

      const onEnd = () => {
        if (dragRef.current) dragRef.current.dragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove);
      document.addEventListener("touchend", onEnd);
    },
    [panelHeight]
  );

  const toggleMaximize = useCallback(() => {
    setMaximized((prev) => !prev);
  }, []);

  const effectiveHeight = maximized
    ? window.innerHeight * MAX_HEIGHT_RATIO
    : panelHeight;

  const promptUser = ghost
    ? "ghost"
    : (auth.userEmail?.split("@")[0] ?? "admin");

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="fixed bottom-0 left-0 right-0 z-40"
          style={{
            height: isMobile ? "60vh" : effectiveHeight,
          }}
        >
          {/* ── 拖拽手柄 ─────────────────── */}
          <div
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
            className="w-full h-[6px] cursor-ns-resize group flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,180,255,0.08) 0%, rgba(8,25,55,0.95) 100%)",
            }}
          >
            <div className="w-10 h-[3px] rounded-full bg-[rgba(0,180,255,0.15)] group-hover:bg-[rgba(0,212,255,0.35)] transition-colors" />
          </div>

          {/* ── 主面板 ─────────────────────── */}
          <div
            className="flex flex-col h-[calc(100%-6px)] border-t border-[rgba(0,180,255,0.12)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(4,12,30,0.98) 0%, rgba(2,8,20,0.99) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* ── Tab bar ────────────────── */}
            <div className="flex items-center justify-between px-1 h-[34px] shrink-0 border-b border-[rgba(0,180,255,0.06)]">
              {/* Left: tabs */}
              <div className="flex items-center gap-0 overflow-x-auto flex-1 min-w-0">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-t-md transition-all cursor-pointer group/tab ${
                      activeTabId === tab.id
                        ? "bg-[rgba(0,40,80,0.5)] border border-b-0 border-[rgba(0,180,255,0.12)] text-[#00d4ff]"
                        : "text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,40,80,0.15)]"
                    }`}
                    onClick={() => setActiveTabId(tab.id)}
                    style={{
                      fontSize: "0.68rem",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    <Terminal className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[80px]">{tab.label}</span>
                    {ghost && activeTabId === tab.id && (
                      <Ghost className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)] shrink-0" />
                    )}
                    {/* Close tab button */}
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="ml-0.5 p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-[rgba(255,51,102,0.12)] hover:text-[#ff3366] transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
                {/* Add tab button */}
                {tabs.length < MAX_TABS && (
                  <button
                    onClick={addTab}
                    className="p-1 rounded text-[rgba(0,212,255,0.15)] hover:text-[rgba(0,212,255,0.4)] hover:bg-[rgba(0,40,80,0.3)] transition-all ml-0.5 shrink-0"
                    title="新建终端 Tab"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Right: window controls */}
              <div className="flex items-center gap-0.5 ml-2 shrink-0">
                {/* Feature hints */}
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  <div className="flex items-center gap-0.5 text-[rgba(0,212,255,0.12)]" title="路由跳转: goto <path>">
                    <Navigation className="w-2.5 h-2.5" />
                    <span style={{ fontSize: "0.48rem" }}>goto</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[rgba(0,212,255,0.12)]" title="AI 助手: ai <描述>">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span style={{ fontSize: "0.48rem" }}>ai</span>
                  </div>
                </div>

                <span
                  className="text-[rgba(0,212,255,0.12)] mr-1 hidden sm:inline"
                  style={{
                    fontSize: "0.52rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Ctrl+`
                </span>

                <button
                  onClick={() => {
                    setPanelHeight(MIN_HEIGHT);
                    setMaximized(false);
                  }}
                  className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,40,80,0.3)] transition-all"
                  title="最小化"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleMaximize}
                  className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,40,80,0.3)] transition-all"
                  title={maximized ? "还原" : "最大化"}
                >
                  {maximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.08)] transition-all"
                  title="关闭终端"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Terminal body (per-tab) ── */}
            {tabs.map((tab) => (
              <TerminalTabPane
                key={tab.id}
                tabId={tab.id}
                isActive={tab.id === activeTabId}
                promptUser={promptUser}
              />
            ))}

            {/* ── Status bar ──────────── */}
            <div
              className="flex items-center justify-between px-3 h-[22px] shrink-0 border-t border-[rgba(0,180,255,0.06)]"
              style={{ background: "rgba(0,20,40,0.4)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[rgba(0,212,255,0.25)]"
                  style={{
                    fontSize: "0.55rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  cpim-cli v3.2.0
                </span>
                <span className="text-[rgba(0,212,255,0.12)]">│</span>
                <span
                  className="text-[rgba(0,212,255,0.2)]"
                  style={{ fontSize: "0.55rem" }}
                >
                  {activeTab?.label ?? "bash"}
                </span>
                <span className="text-[rgba(0,212,255,0.12)]">│</span>
                <span
                  className="text-[rgba(0,212,255,0.15)]"
                  style={{ fontSize: "0.5rem" }}
                >
                  Tab {tabs.findIndex((t) => t.id === activeTabId) + 1}/{tabs.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {ghost && (
                  <div className="flex items-center gap-1">
                    <Ghost className="w-2.5 h-2.5 text-[rgba(0,212,255,0.2)]" />
                    <span
                      className="text-[rgba(0,212,255,0.2)]"
                      style={{ fontSize: "0.5rem" }}
                    >
                      GHOST
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] opacity-50" />
                  <span
                    className="text-[rgba(0,255,136,0.3)]"
                    style={{ fontSize: "0.5rem" }}
                  >
                    LOCAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}