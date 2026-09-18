/**
 * IDELayout.tsx
 * ==============
 * IDE 主布局 — 多联式可调面板系统
 *
 * 三栏布局 + 底部终端 (智能终端切换):
 *   左栏 (25%): AI 对话面板
 *   中栏 (45%): 文件资源管理器
 *   右栏 (30%): 代码编辑器
 *   底部: 集成终端 (根据布局模式智能切换位置)
 *
 * 布局模式:
 *   编辑模式 (edit):   终端仅在右栏显示
 *   预览模式 (preview): 终端跨越中栏+右栏显示
 *
 * 使用 react-resizable-panels 实现面板拖拽调节
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useNavigate } from "react-router";
import { useI18n } from "../../hooks/useI18n";
import { IDETopBar } from "./IDETopBar";
import { IDEViewSwitcher } from "./IDEViewSwitcher";
import { AIChatPanel } from "./AIChatPanel";
import { FileExplorer } from "./FileExplorer";
import { CodePreviewPanel } from "./CodePreviewPanel";
import { IDETerminal } from "./IDETerminal";
import { IDEStatusBar } from "./IDEStatusBar";
import { MOCK_FILE_CONTENTS } from "./ide-mock-data";
import { AI_MODELS } from "./ide-mock-data";
import type { IDEViewMode, IDELayoutMode, OpenTab } from "./ide-types";

/** Resize handle styling */
function ResizeHandle({ direction = "vertical" }: { direction?: "vertical" | "horizontal" }) {
  const isVertical = direction === "vertical";
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center transition-all ${
        isVertical ? "w-[3px] hover:w-[5px]" : "h-[3px] hover:h-[5px]"
      }`}
      style={{ background: "rgba(0,180,255,0.06)" }}
    >
      <div
        className={`rounded-full bg-[rgba(0,212,255,0.15)] group-hover:bg-[rgba(0,212,255,0.4)] transition-all ${
          isVertical ? "w-[2px] h-8" : "h-[2px] w-8"
        }`}
      />
    </PanelResizeHandle>
  );
}

const LAYOUT_MODE_STORAGE_KEY = "yyc3-ide-layout-mode";

export function IDELayout() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<IDEViewMode>("default");
  const [layoutMode, setLayoutMode] = useState<IDELayoutMode>(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_MODE_STORAGE_KEY);
      if (stored === "edit" || stored === "preview") return stored;
    } catch {}
    return "preview";
  });
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Persist layoutMode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, layoutMode);
    } catch {}
  }, [layoutMode]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleFileSelect = useCallback((fileId: string, filename: string) => {
    const existing = openTabs.find((t) => t.id === fileId);
    if (existing) {
      setActiveTabId(fileId);
      return;
    }

    const content = MOCK_FILE_CONTENTS[fileId] || `// ${filename}\n// File content placeholder\n`;
    const newTab: OpenTab = {
      id: fileId,
      filename,
      filepath: `src/${filename}`,
      content,
      isModified: false,
    };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(fileId);
  }, [openTabs]);

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleTabClose = useCallback((tabId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[next.length - 1].id);
      } else if (next.length === 0) {
        setActiveTabId("");
      }
      return next;
    });
  }, [activeTabId]);

  const handleContentChange = useCallback((tabId: string, content: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, isModified: true } : t))
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        setViewMode((m) => (m === "preview" ? "default" : "preview"));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "2") {
        e.preventDefault();
        setViewMode((m) => (m === "code" ? "default" : "code"));
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setTerminalCollapsed((c) => !c);
      }
      // Ctrl+3 to toggle layout mode
      if ((e.ctrlKey || e.metaKey) && e.key === "3") {
        e.preventDefault();
        setLayoutMode((m) => (m === "edit" ? "preview" : "edit"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Determine panel visibility based on view mode
  const showLeftPanel = viewMode !== "code";
  const showCenterPanel = viewMode !== "preview";

  // Terminal component (reused in both layouts)
  const terminalElement = (
    <IDETerminal
      isCollapsed={terminalCollapsed}
      onToggleCollapse={() => setTerminalCollapsed((c) => !c)}
    />
  );

  // Code editor component (reused)
  const codeEditorElement = (
    <CodePreviewPanel
      openTabs={openTabs}
      activeTabId={activeTabId}
      onTabSelect={handleTabSelect}
      onTabClose={handleTabClose}
      onContentChange={handleContentChange}
    />
  );

  /**
   * 编辑模式布局:
   * ┌──────────┬─────────────┬──────────────────┐
   * │ AI Chat  │ File Explorer│ Code Editor      │
   * │ (25%)    │ (45%)       │ (30%)            │
   * │          │             ├──────────────────┤
   * │          │             │ Terminal          │
   * └──────────┴─────────────┴──────────────────┘
   * 终端仅在右栏(代码编辑器下方)
   */
  const renderEditModeLayout = () => (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left Panel - AI Chat */}
      {showLeftPanel && (
        <>
          <Panel defaultSize={25} minSize={15} maxSize={40} id="ai-panel-e" order={1}>
            <AIChatPanel />
          </Panel>
          <ResizeHandle direction="vertical" />
        </>
      )}

      {/* Center Panel - File Explorer (full height) */}
      {showCenterPanel && (
        <>
          <Panel
            defaultSize={showLeftPanel ? 45 : 55}
            minSize={15}
            maxSize={60}
            id="explorer-panel-e"
            order={2}
          >
            <FileExplorer
              onFileSelect={handleFileSelect}
              activeFileId={activeTabId}
            />
          </Panel>
          <ResizeHandle direction="vertical" />
        </>
      )}

      {/* Right Panel - Code Editor + Terminal (vertical split) */}
      <Panel
        defaultSize={showLeftPanel && showCenterPanel ? 30 : showCenterPanel ? 45 : 75}
        minSize={20}
        id="right-panel-e"
        order={3}
      >
        <PanelGroup direction="vertical" className="h-full">
          <Panel defaultSize={terminalCollapsed ? 95 : 70} minSize={30} id="code-panel-e" order={1}>
            {codeEditorElement}
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel
            defaultSize={terminalCollapsed ? 5 : 30}
            minSize={terminalCollapsed ? 3 : 10}
            maxSize={60}
            id="terminal-panel-e"
            order={2}
          >
            {terminalElement}
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );

  /**
   * 预览模式布局:
   * ┌──────────┬─────────────────────────────────┐
   * │ AI Chat  │ File Explorer │ Code Editor      │
   * │ (25%)    │ (45% of 75%) │ (55% of 75%)    │
   * │          ├──────────────┴──────────────────┤
   * │          │ Terminal (spans center+right)     │
   * └──────────┴──────────────────────────────────┘
   * 终端跨越中栏+右栏
   */
  const renderPreviewModeLayout = () => (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left Panel - AI Chat */}
      {showLeftPanel && (
        <>
          <Panel defaultSize={25} minSize={15} maxSize={40} id="ai-panel-p" order={1}>
            <AIChatPanel />
          </Panel>
          <ResizeHandle direction="vertical" />
        </>
      )}

      {/* Main area: Center + Right + Terminal */}
      <Panel
        defaultSize={showLeftPanel ? 75 : 100}
        minSize={40}
        id="main-panel-p"
        order={2}
      >
        <PanelGroup direction="vertical" className="h-full">
          {/* Top: Center + Right horizontal split */}
          <Panel defaultSize={terminalCollapsed ? 95 : 70} minSize={30} id="editor-area-p" order={1}>
            <PanelGroup direction="horizontal" className="h-full">
              {/* Center Panel - File Explorer */}
              {showCenterPanel && (
                <>
                  <Panel
                    defaultSize={40}
                    minSize={15}
                    maxSize={60}
                    id="explorer-panel-p"
                    order={1}
                  >
                    <FileExplorer
                      onFileSelect={handleFileSelect}
                      activeFileId={activeTabId}
                    />
                  </Panel>
                  <ResizeHandle direction="vertical" />
                </>
              )}

              {/* Right Panel - Code Editor */}
              <Panel
                defaultSize={showCenterPanel ? 60 : 100}
                minSize={25}
                id="code-panel-p"
                order={2}
              >
                {codeEditorElement}
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Bottom - Terminal (spans center+right) */}
          <ResizeHandle direction="horizontal" />
          <Panel
            defaultSize={terminalCollapsed ? 5 : 30}
            minSize={terminalCollapsed ? 3 : 15}
            maxSize={60}
            id="terminal-panel-p"
            order={2}
          >
            {terminalElement}
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{
        background: "linear-gradient(180deg, rgba(4,10,22,0.98) 0%, rgba(6,14,31,0.95) 100%)",
        minHeight: 0,
      }}
    >
      {/* Top Bar */}
      <IDETopBar
        projectName={t("ide.title")}
        onBack={handleBack}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {/* View Switcher with layout mode */}
      <IDEViewSwitcher
        viewMode={viewMode}
        onViewChange={setViewMode}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        onSearch={() => setShowSearch((s) => !s)}
        onFullscreen={handleFullscreen}
      />

      {/* Search overlay */}
      {showSearch && (
        <div
          className="flex items-center px-3 py-1.5 shrink-0"
          style={{ background: "rgba(6,14,31,0.9)", borderBottom: "1px solid rgba(0,180,255,0.1)" }}
        >
          <input
            type="text"
            placeholder={`${t("ide.search")}... (Esc)`}
            className="flex-1 bg-[rgba(0,40,80,0.3)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] px-3 py-1.5 rounded-md border border-[rgba(0,180,255,0.15)] outline-none focus:border-[#00d4ff] transition-all"
            style={{ fontSize: "0.72rem" }}
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
          />
        </div>
      )}

      {/* Layout mode indicator */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          height: "18px",
          background: layoutMode === "edit"
            ? "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.05) 50%, transparent 100%)"
            : "linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.05) 50%, transparent 100%)",
          borderBottom: "1px solid rgba(0,180,255,0.05)",
        }}
      >
        <span
          className="text-[rgba(0,212,255,0.3)]"
          style={{ fontSize: "0.5rem", letterSpacing: "1px" }}
        >
          {layoutMode === "edit" ? t("ide.editModeDesc") : t("ide.previewModeDesc")}
        </span>
      </div>

      {/* Main Content Area - conditional layout based on layoutMode */}
      <div className="flex-1 min-h-0">
        {layoutMode === "edit" ? renderEditModeLayout() : renderPreviewModeLayout()}
      </div>

      {/* Status Bar */}
      <IDEStatusBar
        activeTab={openTabs.find((t) => t.id === activeTabId)}
        totalErrors={0}
        totalWarnings={1}
        isOnline={true}
      />
    </div>
  );
}