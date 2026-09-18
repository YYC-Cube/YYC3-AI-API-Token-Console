/**
 * LocalFileManager.tsx
 * =====================
 * 本地文件管理器主界面 · 路由: /files
 *
 * i18n 已迁移
 */

import React, { useState, useContext, useCallback } from "react";
import {
  FolderOpen, Download, HardDrive, Trash2, Keyboard,
  Save, X, FileEdit,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { FileBrowser } from "./FileBrowser";
import { LogViewer } from "./LogViewer";
import { ReportGenerator } from "./ReportGenerator";
import { CodeEditor, getLanguageLabel } from "./CodeEditor";
import { useLocalFileSystem } from "../hooks/useLocalFileSystem";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

type ActiveTab = "files" | "logs" | "reports";

export function LocalFileManager() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ActiveTab>("files");

  const fs = useLocalFileSystem();

  const tabs: Array<{ key: ActiveTab; label: string }> = [
    { key: "files",   label: t("fileManager.fileBrowse") },
    { key: "logs",    label: t("fileManager.logViewer") },
    { key: "reports", label: t("fileManager.reportGen") },
  ];

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("fileManager.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("fileManager.subtitle")}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
          <Keyboard className="w-3 h-3" />
          <span>⌘+Shift+F</span>
        </div>
      </div>

      {/* ======== Tab 导航 ======== */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
            }`}
            style={{ fontSize: "0.78rem" }}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======== Quick Actions Bar ======== */}
      <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
        <button
          onClick={fs.downloadLogs}
          className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,212,255,0.2)] transition-all group"
          data-testid="quick-download"
        >
          <Download className="w-4 h-4 text-[#00d4ff] opacity-50 group-hover:opacity-100" />
          <div className="text-left">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{t("fileManager.downloadLogs")}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>{t("fileManager.exportToLocal")}</p>
          </div>
        </button>
        <button
          onClick={fs.executeBackup}
          className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,212,255,0.2)] transition-all group"
          data-testid="quick-backup"
        >
          <HardDrive className="w-4 h-4 text-[#00ff88] opacity-50 group-hover:opacity-100" />
          <div className="text-left">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{t("fileManager.executeBackup")}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>configs → backups</p>
          </div>
        </button>
        <button
          onClick={fs.clearCache}
          className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,212,255,0.2)] transition-all group"
          data-testid="quick-clear"
        >
          <Trash2 className="w-4 h-4 text-[#ffaa00] opacity-50 group-hover:opacity-100" />
          <div className="text-left">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{t("fileManager.clearCache")}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>{t("fileManager.releaseSpace")}</p>
          </div>
        </button>
      </div>

      {/* ======== Tab Content ======== */}
      {activeTab === "files" && (
        <FileBrowser
          items={fs.currentItems}
          breadcrumbs={fs.breadcrumbs}
          onSelect={fs.selectFile}
          onNavigate={fs.navigateTo}
          onGoUp={fs.goUp}
          formatSize={fs.formatSize}
          canGoUp={fs.currentPath !== "~/.yyc3-cloudpivot"}
        />
      )}

      {activeTab === "logs" && (
        <LogViewer
          logs={fs.logs}
          levelFilter={fs.logLevelFilter}
          sourceFilter={fs.logSourceFilter}
          searchQuery={fs.logSearchQuery}
          sources={fs.logSources}
          onLevelChange={fs.setLogLevelFilter}
          onSourceChange={fs.setLogSourceFilter}
          onSearchChange={fs.setLogSearchQuery}
          isMobile={isMobile}
        />
      )}

      {activeTab === "reports" && (
        <ReportGenerator
          reports={fs.reports}
          isGenerating={fs.isGenerating}
          onGenerate={fs.generateReport}
        />
      )}

      {/* ======== 文件详情 + 内容编辑器 ======== */}
      {fs.selectedFile && (
        <FileDetailEditor
          file={fs.selectedFile}
          getContent={fs.getFileContent}
          saveContent={fs.saveFileContent}
          formatSize={fs.formatSize}
          onClose={() => fs.selectFile({ ...fs.selectedFile!, type: "directory", path: fs.currentPath })}
          t={t}
        />
      )}
    </div>
  );
}

// ============================================================
// 文件详情 + 内容编辑器
// ============================================================

function FileDetailEditor({
  file, getContent, saveContent, formatSize, onClose, t,
}: {
  file: { id: string; name: string; path: string; size?: number; extension?: string; modifiedAt: number };
  getContent: (id: string) => string;
  saveContent: (id: string, content: string) => void;
  formatSize: (n?: number) => string;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  const openEditor = useCallback(() => {
    setContent(getContent(file.id));
    setIsEditing(true);
    setDirty(false);
  }, [getContent, file.id]);

  const handleSave = useCallback(() => {
    saveContent(file.id, content);
    setDirty(false);
  }, [saveContent, file.id, content]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setDirty(false);
  }, []);

  return (
    <GlassCard className="p-4" data-testid="file-detail">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
            {file.name}
          </h4>
          {dirty && (
            <span className="px-1.5 py-0.5 rounded bg-[rgba(255,170,0,0.1)] text-[#ffaa00]" style={{ fontSize: "0.55rem" }}>
              未保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={openEditor}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,140,200,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.68rem" }}
            >
              <FileEdit className="w-3 h-3" /> 编辑内容
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] transition-all"
                style={{ fontSize: "0.68rem" }}
              >
                <Save className="w-3 h-3" /> 保存
              </button>
              <button
                onClick={handleClose}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(255,51,102,0.5)] hover:text-[#ff3366] transition-all"
                style={{ fontSize: "0.68rem" }}
              >
                <X className="w-3 h-3" /> 关闭编辑
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]"
            style={{ fontSize: "0.68rem" }}
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* 文件元信息 */}
      <div className="grid grid-cols-2 gap-2 text-[rgba(0,212,255,0.4)] mb-3" style={{ fontSize: "0.7rem" }}>
        <div>Path: <span className="text-[#c0dcf0]">{file.path}</span></div>
        <div>Size: <span className="text-[#c0dcf0]">{formatSize(file.size)}</span></div>
        <div>Type: <span className="text-[#c0dcf0]">.{file.extension ?? t("common.unknown")}</span></div>
        <div>Modified: <span className="text-[#c0dcf0]">{new Date(file.modifiedAt).toLocaleString("zh-CN")}</span></div>
      </div>

      {/* 内容编辑器 */}
      {isEditing && (
        <div className="rounded-xl border border-[rgba(0,180,255,0.1)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(0,20,40,0.5)] border-b border-[rgba(0,180,255,0.06)]">
            <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.65rem" }}>
              {file.name} — {new TextEncoder().encode(content).length} bytes
            </span>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>
                {getLanguageLabel(file.name)}
              </span>
              <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.55rem" }}>
                Ctrl+S 保存
              </span>
            </div>
          </div>
          <CodeEditor
            value={content}
            onChange={(val) => { setContent(val); setDirty(true); }}
            filename={file.name}
            height="360px"
            onSave={handleSave}
          />
        </div>
      )}
    </GlassCard>
  );
}