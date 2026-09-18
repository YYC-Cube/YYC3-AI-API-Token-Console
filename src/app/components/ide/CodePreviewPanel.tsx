/**
 * CodePreviewPanel.tsx
 * =====================
 * IDE 右栏 — 代码编辑 / 文件预览
 * Tab 式多文件编辑 + 语法高亮
 */

import React from "react";
import { X, Circle, Code2, FileText } from "lucide-react";
import { CodeEditor, getLanguageLabel } from "../CodeEditor";
import { useI18n } from "../../hooks/useI18n";
import type { OpenTab } from "./ide-types";

interface CodePreviewPanelProps {
  openTabs: OpenTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
}

export function CodePreviewPanel({
  openTabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
}: CodePreviewPanelProps) {
  const { t } = useI18n();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  if (openTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: "rgba(4,10,22,0.4)" }}>
        <Code2 className="w-10 h-10 text-[rgba(0,212,255,0.1)] mb-3" />
        <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>
          {t("ide.selectFile")}
        </p>
        <p className="text-[rgba(0,212,255,0.15)] mt-1" style={{ fontSize: "0.6rem" }}>
          {t("ide.openFromExplorer")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(4,10,22,0.4)" }}>
      {/* Tab Bar */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{
          borderBottom: "1px solid rgba(0,180,255,0.08)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,180,255,0.1) transparent",
        }}
      >
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 shrink-0 transition-all border-b-2 ${
                isActive
                  ? "bg-[rgba(0,40,80,0.2)] text-[#e0f0ff] border-[#00d4ff]"
                  : "text-[rgba(0,212,255,0.4)] border-transparent hover:text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,40,80,0.1)]"
              }`}
              style={{ fontSize: "0.68rem" }}
            >
              {tab.isModified && (
                <Circle className="w-1.5 h-1.5 fill-[#00d4ff] text-[#00d4ff] shrink-0" />
              )}
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[100px]">{tab.filename}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                className="p-0.5 rounded hover:bg-[rgba(0,212,255,0.12)] text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Breadcrumb / file info */}
      {activeTab && (
        <div
          className="flex items-center justify-between px-3 py-1 shrink-0"
          style={{ borderBottom: "1px solid rgba(0,180,255,0.05)" }}
        >
          <span className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.58rem" }}>
            {activeTab.filepath}
          </span>
          <span
            className="text-[rgba(0,212,255,0.25)] shrink-0 px-1.5 py-0.5 rounded bg-[rgba(0,40,80,0.3)]"
            style={{ fontSize: "0.5rem" }}
          >
            {getLanguageLabel(activeTab.filename)}
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <CodeEditor
            value={activeTab.content}
            onChange={(val) => onContentChange(activeTab.id, val)}
            filename={activeTab.filename}
            height="100%"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.72rem" }}>
            No active file
          </div>
        )}
      </div>
    </div>
  );
}