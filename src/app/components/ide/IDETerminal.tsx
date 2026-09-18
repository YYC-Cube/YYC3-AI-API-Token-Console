/**
 * IDETerminal.tsx
 * ================
 * IDE 底部集成终端面板
 * 多 Tab + 命令行交互 + 输出展示 + Git/NPM/系统命令
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal, Plus, X, ChevronUp, ChevronDown, Maximize2, Minimize2,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

interface TerminalLine {
  type: "input" | "output" | "error" | "info" | "success";
  content: string;
}

interface TerminalTab {
  id: string;
  label: string;
  lines: TerminalLine[];
  history: string[];
  historyIndex: number;
  cwd: string;
}

const DEFAULT_LINES: TerminalLine[] = [
  { type: "info", content: "YYC³ CloudPivot Terminal v2.4.0" },
  { type: "info", content: "Type 'help' for available commands. Tab for autocomplete." },
  { type: "input", content: "$ yyc3 status" },
  { type: "output", content: "Cluster: YYC³ Matrix  |  Nodes: 7/8 Active  |  GPU Avg: 73%" },
  { type: "output", content: "Models: 6 deployed  |  Tasks: 689 running  |  Uptime: 99.97%" },
];

// Command registry with responses
const COMMAND_REGISTRY: Record<string, (args: string[]) => TerminalLine[]> = {
  help: () => [
    { type: "info", content: "━━━━ YYC³ Terminal Commands ━━━━" },
    { type: "output", content: "  help                  Show this help" },
    { type: "output", content: "  clear                 Clear terminal" },
    { type: "output", content: "" },
    { type: "info", content: "━━━━ System ━━━━" },
    { type: "output", content: "  yyc3 status           Cluster status" },
    { type: "output", content: "  yyc3 node <id>        Node details" },
    { type: "output", content: "  yyc3 alerts           Active alerts" },
    { type: "output", content: "  yyc3 patrol run       Execute patrol" },
    { type: "output", content: "" },
    { type: "info", content: "━━━━ Git ━━━━" },
    { type: "output", content: "  git status            Working tree status" },
    { type: "output", content: "  git log               Commit history" },
    { type: "output", content: "  git branch            List branches" },
    { type: "output", content: "  git diff              Show changes" },
    { type: "output", content: "  git add .             Stage all changes" },
    { type: "output", content: "  git commit -m \"msg\"   Commit staged" },
    { type: "output", content: "  git push              Push to remote" },
    { type: "output", content: "  git pull              Pull from remote" },
    { type: "output", content: "" },
    { type: "info", content: "━━━━ NPM/PNPM ━━━━" },
    { type: "output", content: "  pnpm install          Install dependencies" },
    { type: "output", content: "  pnpm dev              Start dev server" },
    { type: "output", content: "  pnpm build            Build for production" },
    { type: "output", content: "  pnpm test             Run tests" },
    { type: "output", content: "  pnpm lint             Run linter" },
    { type: "output", content: "" },
    { type: "info", content: "━━━━ Utils ━━━━" },
    { type: "output", content: "  ls                    List files" },
    { type: "output", content: "  pwd                   Current directory" },
    { type: "output", content: "  cat <file>            Show file content" },
    { type: "output", content: "  echo <text>           Print text" },
    { type: "output", content: "  date                  Current date/time" },
    { type: "output", content: "  whoami                Current user" },
    { type: "output", content: "  neofetch              System info" },
  ],
  "yyc3 status": () => [
    { type: "output", content: "Cluster: YYC³ Matrix  |  Nodes: 7/8 Active  |  GPU Avg: 73%" },
    { type: "output", content: "Models: 6 deployed  |  Tasks: 689 running  |  Uptime: 99.97%" },
  ],
  "yyc3 alerts": () => [
    { type: "output", content: "Active Alerts (4):" },
    { type: "error", content: "  [CRITICAL] AL-0032: GPU-A100-03 inference latency abnormal" },
    { type: "output", content: "  [WARNING]  AL-0035: NAS-Storage-01 capacity 85.8%" },
    { type: "output", content: "  [WARNING]  AL-0038: Network latency avg 45ms" },
    { type: "error", content: "  [ERROR]    AL-0040: GPU-H100-02 memory 98%" },
  ],
  "yyc3 patrol run": () => [
    { type: "info", content: "Starting patrol check..." },
    { type: "output", content: "  Node Health:    96% (12/13 normal)" },
    { type: "output", content: "  Storage:        85% (approaching threshold)" },
    { type: "output", content: "  Network Latency: avg 45ms (5 nodes >100ms)" },
    { type: "success", content: "✓ Patrol complete." },
  ],
  "git status": () => [
    { type: "output", content: "On branch develop" },
    { type: "output", content: "Your branch is ahead of 'origin/develop' by 3 commits." },
    { type: "output", content: "" },
    { type: "output", content: "Changes to be committed:" },
    { type: "success", content: "  modified:   src/app/components/ide/IDELayout.tsx" },
    { type: "success", content: "  modified:   src/app/components/ide/AIChatPanel.tsx" },
    { type: "output", content: "" },
    { type: "output", content: "Changes not staged for commit:" },
    { type: "error", content: "  modified:   src/app/components/ide/ide-types.ts" },
    { type: "output", content: "" },
    { type: "output", content: "Untracked files:" },
    { type: "error", content: "  src/app/components/ide/GitPanel.tsx" },
    { type: "error", content: "  src/app/components/ide/IDEStatusBar.tsx" },
  ],
  "git log": () => [
    { type: "output", content: "commit a3f8c2d (HEAD -> develop)" },
    { type: "output", content: "Author: YYC3 Dev <dev@yyc3.local>" },
    { type: "output", content: "Date:   5 minutes ago" },
    { type: "output", content: "    feat(ide): add model selector to top bar" },
    { type: "output", content: "" },
    { type: "output", content: "commit b7e1a4f" },
    { type: "output", content: "Author: YYC3 Dev <dev@yyc3.local>" },
    { type: "output", content: "Date:   1 hour ago" },
    { type: "output", content: "    fix(patrol): correct health check interval" },
    { type: "output", content: "" },
    { type: "output", content: "commit c9d2b6e" },
    { type: "output", content: "Author: YYC3 Dev <dev@yyc3.local>" },
    { type: "output", content: "Date:   2 hours ago" },
    { type: "output", content: "    refactor: extract GlassCard to shared components" },
  ],
  "git branch": () => [
    { type: "output", content: "  main" },
    { type: "success", content: "* develop" },
    { type: "output", content: "  feature/ide-panel" },
    { type: "output", content: "  fix/gpu-alert" },
  ],
  "git diff": () => [
    { type: "output", content: "diff --git a/src/app/components/ide/IDELayout.tsx" },
    { type: "output", content: "--- a/src/app/components/ide/IDELayout.tsx" },
    { type: "output", content: "+++ b/src/app/components/ide/IDELayout.tsx" },
    { type: "output", content: "@@ -58,6 +58,7 @@" },
    { type: "error", content: "-  const [viewMode, setViewMode] = useState(\"default\");" },
    { type: "success", content: "+  const [viewMode, setViewMode] = useState<IDEViewMode>(\"default\");" },
    { type: "success", content: "+  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);" },
  ],
  "git add .": () => [
    { type: "success", content: "✓ All changes staged." },
  ],
  "git push": () => [
    { type: "output", content: "Enumerating objects: 12, done." },
    { type: "output", content: "Counting objects: 100% (12/12), done." },
    { type: "output", content: "Writing objects: 100% (8/8), 2.34 KiB | 2.34 MiB/s, done." },
    { type: "success", content: "To 192.168.3.100:yyc3/cloudpivot-matrix.git" },
    { type: "success", content: "   b7e1a4f..a3f8c2d  develop -> develop" },
  ],
  "git pull": () => [
    { type: "output", content: "Already up to date." },
  ],
  "pnpm install": () => [
    { type: "output", content: "Lockfile is up to date, resolution step is skipped" },
    { type: "output", content: "Already up to date" },
    { type: "success", content: "Done in 1.2s" },
  ],
  "pnpm dev": () => [
    { type: "output", content: "  VITE v6.3.5  ready in 342 ms" },
    { type: "output", content: "" },
    { type: "success", content: "  ➜  Local:   http://192.168.3.100:3118/" },
    { type: "output", content: "  ➜  Network: http://192.168.3.100:3118/" },
    { type: "output", content: "  ➜  press h + enter to show help" },
  ],
  "pnpm build": () => [
    { type: "output", content: "vite v6.3.5 building for production..." },
    { type: "output", content: "✓ 248 modules transformed." },
    { type: "output", content: "dist/index.html              0.46 kB │ gzip: 0.30 kB" },
    { type: "output", content: "dist/assets/index-Da3x9.css  28.34 kB │ gzip: 5.89 kB" },
    { type: "output", content: "dist/assets/index-Hk92a.js  346.21 kB │ gzip: 98.45 kB" },
    { type: "success", content: "✓ built in 3.42s" },
  ],
  "pnpm test": () => [
    { type: "output", content: " ✓ src/__tests__/GlassCard.test.tsx (3 tests) 45ms" },
    { type: "output", content: " ✓ src/__tests__/useI18n.test.tsx (5 tests) 23ms" },
    { type: "output", content: " ✓ src/__tests__/env-config.test.ts (4 tests) 12ms" },
    { type: "output", content: " ✓ src/__tests__/create-store.test.ts (6 tests) 34ms" },
    { type: "output", content: "" },
    { type: "success", content: " Test Files  4 passed (4)" },
    { type: "success", content: " Tests       18 passed (18)" },
    { type: "output", content: " Coverage    Lines: 84.2%  Branches: 81.5%  Functions: 78.3%" },
    { type: "success", content: " Duration    1.14s" },
  ],
  "pnpm lint": () => [
    { type: "output", content: "Running ESLint on 248 files..." },
    { type: "output", content: "" },
    { type: "output", content: "src/app/components/ide/IDELayout.tsx" },
    { type: "output", content: "  42:5  warning  'unused' is defined but never used  @typescript-eslint/no-unused-vars" },
    { type: "output", content: "" },
    { type: "output", content: "✖ 1 problem (0 errors, 1 warning)" },
  ],
  ls: () => [
    { type: "output", content: "src/           package.json    tsconfig.json" },
    { type: "output", content: "node_modules/  vite.config.ts  README.md" },
    { type: "output", content: ".gitignore     pnpm-lock.yaml  .env" },
  ],
  pwd: () => [
    { type: "output", content: "/home/yyc3/cloudpivot-intelli-matrix" },
  ],
  date: () => [
    { type: "output", content: new Date().toLocaleString("zh-CN", { hour12: false }) },
  ],
  whoami: () => [
    { type: "output", content: "yyc3-dev" },
  ],
  neofetch: () => [
    { type: "info", content: "         ╭──────────────────╮" },
    { type: "info", content: "    Y3   │ YYC³ CloudPivot  │" },
    { type: "info", content: "         ╰──────────────────╯" },
    { type: "output", content: "  OS:      macOS 15.3 Sequoia" },
    { type: "output", content: "  Host:    MacBook Pro M4 Max" },
    { type: "output", content: "  Shell:   zsh 5.9" },
    { type: "output", content: "  Node:    v22.12.0" },
    { type: "output", content: "  PNPM:    9.15.0" },
    { type: "output", content: "  CPU:     Apple M4 Max (16c)" },
    { type: "output", content: "  Memory:  48GB" },
    { type: "output", content: "  Disk:    2TB NVMe" },
    { type: "output", content: "  GPU:     Apple M4 Max 40-core" },
    { type: "output", content: "  Network: 192.168.3.100" },
  ],
};

// Tab completion candidates
const COMPLETIONS = [
  "help", "clear", "yyc3 status", "yyc3 alerts", "yyc3 patrol run", "yyc3 node",
  "git status", "git log", "git branch", "git diff", "git add .", "git commit -m", "git push", "git pull",
  "pnpm install", "pnpm dev", "pnpm build", "pnpm test", "pnpm lint",
  "ls", "pwd", "cat", "echo", "date", "whoami", "neofetch",
];

interface IDETerminalProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function IDETerminal({ isCollapsed, onToggleCollapse }: IDETerminalProps) {
  const { t } = useI18n();
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "term-1", label: "bash", lines: [...DEFAULT_LINES], history: [], historyIndex: -1, cwd: "~" },
  ]);
  const [activeTabId, setActiveTabId] = useState("term-1");
  const [input, setInput] = useState("");
  const [tabIndex, setTabIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab?.lines]);

  const executeCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const newLines: TerminalLine[] = [...tab.lines, { type: "input", content: `$ ${trimmed}` }];

        if (trimmed === "clear") {
          return { ...tab, lines: [], history: [...tab.history, trimmed], historyIndex: -1 };
        }

        // Check command registry
        const handler = COMMAND_REGISTRY[trimmed];
        if (handler) {
          const result = handler(trimmed.split(" ").slice(1));
          newLines.push(...result);
        } else if (trimmed.startsWith("echo ")) {
          newLines.push({ type: "output", content: trimmed.slice(5) });
        } else if (trimmed.startsWith("cat ")) {
          newLines.push({ type: "output", content: `// Content of ${trimmed.slice(4)}` });
          newLines.push({ type: "output", content: "// ... (file content would appear here)" });
        } else if (trimmed.startsWith("git commit -m")) {
          const msg = trimmed.match(/"([^"]+)"/)?.[1] || trimmed.match(/'([^']+)'/)?.[1] || "update";
          newLines.push({ type: "output", content: `[develop a3f8c2d] ${msg}` });
          newLines.push({ type: "output", content: " 3 files changed, 45 insertions(+), 12 deletions(-)" });
          newLines.push({ type: "success", content: "✓ Committed successfully." });
        } else if (trimmed.startsWith("yyc3 node ")) {
          const nodeId = trimmed.split(" ").pop() || "";
          newLines.push({ type: "output", content: `${nodeId}  Status: ACTIVE  GPU: 87%  Mem: 72%  Temp: 68°C` });
          newLines.push({ type: "output", content: `Model: LLaMA-70B  Tasks: 128  Uptime: 99.98%` });
        } else {
          newLines.push({ type: "error", content: `Command not found: ${trimmed}` });
          newLines.push({ type: "info", content: "Type 'help' for available commands." });
        }

        return { ...tab, lines: newLines, history: [...tab.history, trimmed], historyIndex: -1 };
      })
    );
    setInput("");
    setTabIndex(-1);
  }, [activeTabId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Tab completion
      const matches = COMPLETIONS.filter((c) => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1) {
        // Cycle through matches
        const nextIdx = (tabIndex + 1) % matches.length;
        setInput(matches[nextIdx]);
        setTabIndex(nextIdx);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId || tab.history.length === 0) return tab;
          const newIndex = tab.historyIndex < 0
            ? tab.history.length - 1
            : Math.max(0, tab.historyIndex - 1);
          setInput(tab.history[newIndex] || "");
          return { ...tab, historyIndex: newIndex };
        })
      );
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;
          const newIndex = tab.historyIndex + 1;
          if (newIndex >= tab.history.length) {
            setInput("");
            return { ...tab, historyIndex: -1 };
          }
          setInput(tab.history[newIndex] || "");
          return { ...tab, historyIndex: newIndex };
        })
      );
    } else {
      setTabIndex(-1);
    }
  }, [activeTabId, input, executeCommand, tabIndex]);

  const addTab = () => {
    const id = `term-${Date.now()}`;
    setTabs((prev) => [...prev, {
      id, label: "bash", lines: [{ type: "info", content: "New terminal session" }], history: [], historyIndex: -1, cwd: "~",
    }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(tabs.find((t) => t.id !== id)?.id ?? tabs[0].id);
    }
  };

  const lineColor: Record<string, string> = {
    input: "#00d4ff",
    output: "#c0dcf0",
    error: "#ff3366",
    info: "rgba(0,212,255,0.35)",
    success: "#00ff88",
  };

  return (
    <div
      className="flex flex-col"
      style={{
        background: "rgba(4,10,22,0.8)",
        borderTop: "1px solid rgba(0,180,255,0.12)",
        height: isCollapsed ? "28px" : "100%",
      }}
    >
      {/* Terminal title bar */}
      <div
        className="flex items-center justify-between px-2 shrink-0"
        style={{ height: "28px", borderBottom: isCollapsed ? "none" : "1px solid rgba(0,180,255,0.08)" }}
      >
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          <Terminal className="w-3 h-3 text-[rgba(0,212,255,0.4)] shrink-0 mr-1" />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-t shrink-0 transition-all ${
                tab.id === activeTabId
                  ? "bg-[rgba(0,40,80,0.3)] text-[#e0f0ff]"
                  : "text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.5)]"
              }`}
              style={{ fontSize: "0.6rem" }}
            >
              <span>{tab.label}</span>
              {tabs.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="hover:text-[#ff3366] transition-colors"
                >
                  <X className="w-2 h-2" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={addTab}
            className="p-0.5 rounded text-[rgba(0,212,255,0.2)] hover:text-[#00d4ff] transition-all"
            title={t("ide.newTerminal")}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
            title={t("ide.terminalToggle")}
          >
            {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal content */}
      {!isCollapsed && activeTab && (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-1 font-mono"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,180,255,0.15) transparent",
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {activeTab.lines.map((line, i) => (
              <div key={i} className="py-[1px]" style={{ fontSize: "0.68rem", color: lineColor[line.type] }}>
                {line.content}
              </div>
            ))}
          </div>

          {/* Input line */}
          <div className="flex items-center px-3 py-1.5 shrink-0" style={{ borderTop: "1px solid rgba(0,180,255,0.05)" }}>
            <span className="text-[#00d4ff] mr-1 shrink-0 font-mono" style={{ fontSize: "0.6rem" }}>
              {activeTab.cwd}
            </span>
            <span className="text-[#00d4ff] mr-2 shrink-0 font-mono" style={{ fontSize: "0.68rem" }}>$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setTabIndex(-1); }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-[#e0f0ff] outline-none font-mono"
              style={{ fontSize: "0.68rem" }}
              placeholder={t("ide.commandPlaceholder")}
            />
          </div>
        </>
      )}
    </div>
  );
}
