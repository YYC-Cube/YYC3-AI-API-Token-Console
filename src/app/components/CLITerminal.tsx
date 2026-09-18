/**
 * CLITerminal.tsx
 * ================
 * Web 端 CLI 终端模拟器
 * 支持 yyc3 命令、自动补全、历史导航
 */

import React, { useRef, useEffect, useContext } from "react";
import { Terminal, ChevronRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useTerminal } from "../hooks/useTerminal";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";
import { useNavigate } from "react-router";

export function CLITerminal() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const navigate = useNavigate();

  const {
    history,
    inputValue,
    completions,
    execute,
    handleInputChange,
    handleHistoryNav,
    applyCompletion,
  } = useTerminal({ onNavigate: (path) => navigate(path) });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  const statusColor = {
    success: "#00ff88",
    error: "#ff3366",
    info: "rgba(0,212,255,0.6)",
  };

  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <Terminal className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
            {t("nav.terminal")}
          </h2>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
            CP-IM CLI · {t("nav.terminal")} · {t("nav.ide")}
          </p>
        </div>
      </div>

      {/* Terminal window */}
      <GlassCard className="overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(0,180,255,0.1)] bg-[rgba(0,20,40,0.5)]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[rgba(0,212,255,0.4)] ml-2" style={{ fontSize: "0.68rem" }}>
            cpim-cloudpivot — bash — 80×24
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="p-4 bg-[rgba(2,8,18,0.9)] cursor-text overflow-y-auto"
          style={{
            height: isMobile ? "55vh" : "60vh",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
            fontSize: "0.78rem",
            lineHeight: "1.6",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,180,255,0.15) transparent",
          }}
          data-testid="cli-terminal"
        >
          {/* History */}
          {history.map((entry) => (
            <div key={entry.id} className="mb-2">
              {entry.input && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#00ff88]">admin@cpim</span>
                  <span className="text-[rgba(0,212,255,0.3)]">:</span>
                  <span className="text-[#00d4ff]">~/.cpim-cloudpivot</span>
                  <span className="text-[rgba(0,212,255,0.3)]">$</span>
                  <span className="text-[#e0f0ff] ml-1">{entry.input}</span>
                </div>
              )}
              {entry.output && (
                <pre
                  className="whitespace-pre-wrap mt-0.5"
                  style={{ color: statusColor[entry.status] }}
                >
                  {entry.output}
                </pre>
              )}
            </div>
          ))}

          {/* Current input line */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#00ff88]">admin@cpim</span>
            <span className="text-[rgba(0,212,255,0.3)]">:</span>
            <span className="text-[#00d4ff]">~/.cpim-cloudpivot</span>
            <span className="text-[rgba(0,212,255,0.3)]">$</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-[#e0f0ff] outline-none ml-1 caret-[#00d4ff]"
              style={{ fontFamily: "inherit", fontSize: "inherit" }}
              spellCheck={false}
              autoComplete="off"
              data-testid="cli-input"
            />
          </div>

          {/* Completions */}
          {completions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1 ml-6">
              {completions.map((c) => (
                <button
                  key={c}
                  onClick={() => applyCompletion(c)}
                  className="px-2 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
                  style={{ fontSize: "0.72rem" }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Quick command hints */}
      <GlassCard className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ChevronRight className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>
            {t("monitor.commonCommands")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "cpim status",
            "cpim node",
            "cpim alerts",
            "cpim patrol run --full",
            "cpim model list",
            "cpim report",
            "cpim config list",
            "ai 查看节点状态",
            "goto /patrol",
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                handleInputChange(cmd);
                execute(cmd);
              }}
              className="px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.2)] transition-all"
              style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}