/**
 * HostFileManager.tsx
 * ====================
 * 宿主机文件系统管理器 · 路由: /host-files
 *
 * 真实可编辑文件系统 (File System Access API)
 * 支持: 打开目录 / 浏览 / 编辑 / 创建 / 删除 / 重命名 / 搜索 / 上传 / 下载 / 版本控制
 */

import React, { useState, useCallback, useRef, useContext, useEffect } from "react";
import {
  FolderOpen, File, ChevronRight, ArrowUp, Trash2,
  Download, Upload, Save, RotateCcw, Edit3, FolderPlus,
  FilePlus, Clock, HardDrive, AlertTriangle, X, Search,
  RefreshCcw, Image, History, Loader2, Code2,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useHostFileSystem, getFileTypeInfo } from "../hooks/useHostFileSystem";
import { CodeEditor, getLanguageLabel } from "./CodeEditor";
import { ViewContext } from "../lib/view-context";
import type { HostFileEntry } from "../types";

// ── 样式常量 ──
const cyanDim = "rgba(0,212,255,0.35)";
const textPrimary = "#e0f0ff";
const textDim = "rgba(0,212,255,0.4)";
const fontSize = { xs: "0.65rem", sm: "0.72rem", md: "0.8rem", lg: "0.92rem" };

type ActiveTab = "browser" | "editor" | "versions" | "recent";

export function HostFileManager() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const fs = useHostFileSystem();
  const [activeTab, setActiveTab] = useState<ActiveTab>("browser");
  const [showNewDialog, setShowNewDialog] = useState<"file" | "dir" | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [usePlainEditor, setUsePlainEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // ── Ctrl+S 快捷键 ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && activeTab === "editor" && fs.editingDirty) {
        e.preventDefault();
        fs.saveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, fs.editingDirty, fs.saveFile]);

  // ── 创建 ──
  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    if (showNewDialog === "file") fs.createFile(newName.trim());
    else if (showNewDialog === "dir") fs.createDirectory(newName.trim());
    setShowNewDialog(null);
    setNewName("");
  }, [showNewDialog, newName, fs]);

  // ── 重命名 ──
  const handleRename = useCallback((entry: HostFileEntry) => {
    if (!renameValue.trim() || renameValue === entry.name) {
      setRenaming(null);
      return;
    }
    fs.renameEntry(entry, renameValue.trim());
    setRenaming(null);
  }, [renameValue, fs]);

  // ── 拖拽上传 ──
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      fs.uploadFiles(e.dataTransfer.files);
    }
  }, [fs]);

  const tabs = [
    { key: "browser" as const, label: "文件浏览", icon: FolderOpen },
    { key: "editor" as const, label: "编辑器", icon: File },
    { key: "versions" as const, label: "版本历史", icon: History, count: fs.currentFileVersions.length },
    { key: "recent" as const, label: "最近文件", icon: Clock, count: fs.recentFiles.length },
  ];

  return (
    <div className="space-y-4">
      {/* ══ Header ══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 style={{ fontSize: fontSize.lg, color: textPrimary }}>
              宿主机文件系统
            </h2>
            <p style={{ fontSize: fontSize.xs, color: textDim }}>
              {fs.supported ? "File System Access API · 真实读写" : "API 降级模式 · 后端代理"}
              {fs.rootName && ` · ${fs.rootName}`}
              {fs.rootHandle && ` · ${fs.stats.dirs} 目录 · ${fs.stats.files} 文件`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fs.rootHandle && (
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,212,255,0.12)] hover:text-[#00d4ff] transition-all"
              title="搜索文件 (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={fs.openDirectory}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center gap-1.5"
            style={{ fontSize: fontSize.sm }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            打开目录
          </button>
        </div>
      </div>

      {/* ══ 搜索栏 ══ */}
      {searchOpen && fs.rootHandle && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[rgba(0,212,255,0.3)] shrink-0" />
            <input
              value={fs.searchQuery}
              onChange={(e) => fs.searchFiles(e.target.value)}
              placeholder="搜索文件名..."
              className="flex-1 bg-transparent border-none outline-none text-[#e0f0ff]"
              style={{ fontSize: fontSize.sm }}
              autoFocus
            />
            {fs.searching && <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin" />}
            <button onClick={() => { setSearchOpen(false); fs.searchFiles(""); }} className="text-[rgba(0,212,255,0.3)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          {fs.searchResults.length > 0 && (
            <div className="mt-2 max-h-[200px] overflow-y-auto space-y-0.5">
              {fs.searchResults.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => {
                    if (entry.kind === "file") {
                      fs.readFile(entry);
                      setActiveTab("editor");
                    }
                    setSearchOpen(false);
                    fs.searchFiles("");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(0,40,80,0.3)] transition-all text-left"
                >
                  {entry.kind === "directory"
                    ? <FolderOpen className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                    : <File className="w-3.5 h-3.5 text-[rgba(0,212,255,0.5)] shrink-0" />
                  }
                  <span className="flex-1 truncate text-[#e0f0ff]" style={{ fontSize: fontSize.sm }}>{entry.name}</span>
                  <span style={{ fontSize: fontSize.xs, color: textDim }} className="truncate max-w-[180px]">{entry.path}</span>
                </button>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ══ Stats Bar ══ */}
      {fs.rootHandle && (
        <div className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {[
            { label: "文件数", value: fs.stats.files, color: "#00d4ff" },
            { label: "目录数", value: fs.stats.dirs, color: "#7b8cff" },
            { label: "总大小", value: fs.formatSize(fs.stats.totalSize), color: "#00ff88" },
            { label: "版本快照", value: fs.stats.totalVersions, color: "#ffaa00" },
          ].map(s => (
            <div key={s.label} className="px-3 py-2 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.06)]">
              <p style={{ fontSize: fontSize.xs, color: textDim }}>{s.label}</p>
              <p style={{ fontSize: "1.1rem", color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ Tab 导航 ══ */}
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(0,212,255,0.35)] border border-transparent hover:border-[rgba(0,180,255,0.12)]"
            }`}
            style={{ fontSize: fontSize.sm }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)]" style={{ fontSize: fontSize.xs }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ 未打开目录提示 ══ */}
      {!fs.rootHandle && activeTab === "browser" && (
        <GlassCard className="p-8 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-[rgba(0,212,255,0.2)]" />
          <p style={{ fontSize: fontSize.md, color: textPrimary }}>
            点击"打开目录"选择宿主机文件夹
          </p>
          <p className="mt-2" style={{ fontSize: fontSize.xs, color: textDim }}>
            支持文件浏览、编辑、创建、删除、重命名、搜索、上传、下载、版本控制
          </p>
          {!fs.supported && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#ffaa00]" style={{ fontSize: fontSize.xs }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>当前浏览器不支持 File System Access API, 需后端 /api/fs 代理</span>
            </div>
          )}
        </GlassCard>
      )}

      {/* ══ 文件浏览器 ══ */}
      {activeTab === "browser" && fs.rootHandle && (
        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <GlassCard className="p-4">
            {/* 面包屑 + 工具栏 */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: fontSize.xs }}>
                {fs.breadcrumbs.map((seg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="w-3 h-3 text-[rgba(0,212,255,0.2)]" />}
                    <button
                      onClick={() => fs.navigateToBreadcrumb(i)}
                      className={`px-1.5 py-0.5 rounded ${
                        i === fs.breadcrumbs.length - 1 ? "text-[#00d4ff]" : "text-[rgba(0,212,255,0.35)] hover:text-[#00d4ff]"
                      }`}
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {fs.currentPath.length > 0 && (
                  <button
                    onClick={fs.navigateUp}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.35)]"
                    title="上级目录"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={fs.refreshCurrentDir}
                  className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.35)]"
                  title="刷新"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShowNewDialog("file"); setNewName(""); }}
                  className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.35)]"
                  title="新建文件"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShowNewDialog("dir"); setNewName(""); }}
                  className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.35)]"
                  title="新建目录"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.35)]"
                  title="上传文件"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && fs.uploadFiles(e.target.files)}
                />
              </div>
            </div>

            {/* 新建对话框 */}
            {showNewDialog && (
              <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.15)]">
                {showNewDialog === "file" ? <FilePlus className="w-4 h-4 text-[#00d4ff]" /> : <FolderPlus className="w-4 h-4 text-[#00ff88]" />}
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewDialog(null); }}
                  placeholder={showNewDialog === "file" ? "新文件名..." : "新目录名..."}
                  className="flex-1 bg-transparent border-none outline-none text-[#e0f0ff]"
                  style={{ fontSize: fontSize.sm }}
                  autoFocus
                />
                <button onClick={handleCreate} className="px-2 py-1 rounded bg-[rgba(0,212,255,0.15)] text-[#00d4ff]" style={{ fontSize: fontSize.xs }}>创建</button>
                <button onClick={() => setShowNewDialog(null)} className="text-[rgba(0,212,255,0.3)]"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* 文件列表 */}
            {fs.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#00d4ff] animate-spin" />
              </div>
            ) : fs.entries.length === 0 ? (
              <div className="text-center py-8" style={{ fontSize: fontSize.sm, color: "rgba(0,212,255,0.25)" }}>
                空目录 · 拖拽文件到此处上传
              </div>
            ) : (
              <div className="space-y-0.5">
                {fs.entries.map(entry => {
                  const typeInfo = entry.kind === "file" ? getFileTypeInfo(entry.name) : null;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                        fs.selectedEntry?.id === entry.id
                          ? "bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]"
                          : "hover:bg-[rgba(0,40,80,0.3)] border border-transparent"
                      }`}
                      onClick={() => {
                        if (entry.kind === "directory") fs.navigateToDir(entry);
                        else {
                          fs.readFile(entry);
                          setActiveTab("editor");
                        }
                      }}
                    >
                      {entry.kind === "directory" ? (
                        <FolderOpen className="w-4 h-4 text-[#00d4ff] shrink-0" />
                      ) : typeInfo ? (
                        <span
                          className="w-4 h-4 rounded shrink-0 flex items-center justify-center font-mono"
                          style={{ fontSize: "0.45rem", color: typeInfo.color, backgroundColor: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30` }}
                        >
                          {typeInfo.icon.slice(0, 2)}
                        </span>
                      ) : (
                        <File className="w-4 h-4 text-[rgba(0,212,255,0.5)] shrink-0" />
                      )}

                      {renaming === entry.id ? (
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRename(entry); if (e.key === "Escape") setRenaming(null); }}
                          onBlur={() => handleRename(entry)}
                          className="flex-1 bg-transparent border-b border-[#00d4ff] outline-none text-[#e0f0ff]"
                          style={{ fontSize: fontSize.sm }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-[#e0f0ff] truncate" style={{ fontSize: fontSize.sm }}>{entry.name}</span>
                      )}

                      {entry.kind === "file" && entry.size != null && (
                        <span className="shrink-0" style={{ fontSize: fontSize.xs, color: textDim }}>
                          {fs.formatSize(entry.size)}
                        </span>
                      )}

                      {entry.lastModified && (
                        <span className="shrink-0 hidden sm:inline" style={{ fontSize: fontSize.xs, color: textDim }}>
                          {new Date(entry.lastModified).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setRenaming(entry.id); setRenameValue(entry.name); }}
                          className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)]"
                          title="重命名"
                        >
                          <Edit3 className="w-3 h-3 text-[rgba(0,212,255,0.4)]" />
                        </button>
                        {entry.kind === "file" && (
                          <button
                            onClick={() => fs.downloadFile(entry)}
                            className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)]"
                            title="下载"
                          >
                            <Download className="w-3 h-3 text-[rgba(0,212,255,0.4)]" />
                          </button>
                        )}
                        {confirmDelete === entry.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { fs.deleteEntry(entry); setConfirmDelete(null); }}
                              className="px-2 py-0.5 rounded bg-[rgba(255,60,60,0.2)] text-[#ff6464]"
                              style={{ fontSize: fontSize.xs }}
                            >确认</button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-0.5 rounded text-[rgba(0,212,255,0.4)]"
                              style={{ fontSize: fontSize.xs }}
                            >取消</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(entry.id)}
                            className="p-1 rounded hover:bg-[rgba(255,60,60,0.1)]"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3 text-[rgba(255,100,100,0.5)]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ══ 文件编辑器 ══ */}
      {activeTab === "editor" && (
        <GlassCard className="p-4">
          {fs.selectedEntry ? (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {fs.imagePreviewUrl ? (
                    <Image className="w-4 h-4 text-[#00d4ff]" />
                  ) : (
                    <File className="w-4 h-4 text-[#00d4ff]" />
                  )}
                  <span style={{ fontSize: fontSize.md, color: textPrimary }}>{fs.selectedEntry.name}</span>
                  {fs.editingDirty && (
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(255,170,0,0.15)] text-[#ffaa00]" style={{ fontSize: fontSize.xs }}>
                      未保存
                    </span>
                  )}
                  {!fs.imagePreviewUrl && fs.selectedEntry && (
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.5)]" style={{ fontSize: fontSize.xs }}>
                      {getLanguageLabel(fs.selectedEntry.name)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {!fs.imagePreviewUrl && (
                    <>
                      <button
                        onClick={() => setUsePlainEditor(!usePlainEditor)}
                        className={`p-1.5 rounded-lg transition-all ${
                          usePlainEditor
                            ? "bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.4)]"
                            : "bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"
                        }`}
                        title={usePlainEditor ? "切换到 CodeMirror" : "切换到纯文本"}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={fs.saveFile}
                        disabled={!fs.editingDirty}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                          fs.editingDirty
                            ? "bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] text-[#00ff88]"
                            : "bg-[rgba(0,40,80,0.2)] border border-transparent text-[rgba(0,212,255,0.2)] cursor-not-allowed"
                        }`}
                        style={{ fontSize: fontSize.sm }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                        {fs.editingDirty && <span style={{ fontSize: fontSize.xs }}>(⌘S)</span>}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fs.downloadFile(fs.selectedEntry!)}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.4)]"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { fs.setSelectedEntry(null); setActiveTab("browser"); }}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.4)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 图片预览 */}
              {fs.imagePreviewUrl ? (
                <div className="flex items-center justify-center p-4 rounded-lg bg-[rgba(0,10,20,0.6)] border border-[rgba(0,180,255,0.1)]">
                  <img
                    src={fs.imagePreviewUrl}
                    alt={fs.selectedEntry.name}
                    className="max-w-full max-h-[500px] rounded"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              ) : usePlainEditor ? (
                /* 纯文本编辑器 (fallback) */
                <textarea
                  value={fs.editingContent ?? ""}
                  onChange={(e) => fs.setEditingContent(e.target.value)}
                  className="w-full bg-[rgba(0,10,20,0.6)] border border-[rgba(0,180,255,0.1)] rounded-lg p-3 text-[#c0dcf0] font-mono resize-y outline-none focus:border-[rgba(0,212,255,0.3)]"
                  style={{ fontSize: fontSize.sm, minHeight: "400px", lineHeight: "1.6", tabSize: 2 }}
                  spellCheck={false}
                />
              ) : (
                /* CodeMirror 语法高亮编辑器 */
                <CodeEditor
                  value={fs.editingContent ?? ""}
                  onChange={(val) => fs.setEditingContent(val)}
                  filename={fs.selectedEntry.name}
                  height="450px"
                  onSave={fs.editingDirty ? fs.saveFile : undefined}
                />
              )}

              <div className="flex items-center justify-between mt-2" style={{ fontSize: fontSize.xs, color: "rgba(0,212,255,0.25)" }}>
                <span className="truncate">{fs.selectedEntry.path}</span>
                <span>
                  {fs.editingContent != null
                    ? `${fs.editingContent.length} 字符 · ${fs.formatSize(new TextEncoder().encode(fs.editingContent).length)}`
                    : fs.selectedEntry.size != null ? fs.formatSize(fs.selectedEntry.size) : ""
                  }
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-12" style={{ fontSize: fontSize.sm, color: "rgba(0,212,255,0.25)" }}>
              从文件浏览器选择文件开始编辑
            </div>
          )}
        </GlassCard>
      )}

      {/* ══ 版本历史 ══ */}
      {activeTab === "versions" && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-[#00d4ff]" />
            <span style={{ fontSize: fontSize.md, color: textPrimary }}>
              {fs.selectedEntry ? `${fs.selectedEntry.name} · 版本历史` : "版本历史"}
            </span>
            <span style={{ fontSize: fontSize.xs, color: textDim }}>
              {fs.selectedEntry ? `${fs.currentFileVersions.length} 个快照` : `全部 ${fs.versions.length} 个快照`}
            </span>
          </div>

          {(() => {
            const displayVersions = fs.selectedEntry ? fs.currentFileVersions : fs.versions;
            if (displayVersions.length === 0) {
              return (
                <div className="text-center py-8" style={{ fontSize: fontSize.sm, color: "rgba(0,212,255,0.25)" }}>
                  编辑并保存文件后，自动生成版本快照
                </div>
              );
            }
            return (
              <div className="space-y-1">
                {displayVersions.map(ver => (
                  <div
                    key={ver.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(0,40,80,0.3)] transition-all group"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: fontSize.sm, color: textPrimary }}>{ver.label || ver.id}</p>
                      <p style={{ fontSize: fontSize.xs, color: textDim }}>
                        {ver.fileName} · {fs.formatSize(ver.size)} · {new Date(ver.savedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => fs.restoreVersion(ver)}
                        className="px-2 py-1 rounded bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                        style={{ fontSize: fontSize.xs }}
                      >恢复</button>
                      <button
                        onClick={() => fs.deleteVersion(ver.id)}
                        className="px-2 py-1 rounded bg-[rgba(255,60,60,0.1)] text-[#ff6464]"
                        style={{ fontSize: fontSize.xs }}
                      >删除</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </GlassCard>
      )}

      {/* ══ 最近文件 ══ */}
      {activeTab === "recent" && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#00d4ff]" />
            <span style={{ fontSize: fontSize.md, color: textPrimary }}>最近访问的文件</span>
            <span style={{ fontSize: fontSize.xs, color: textDim }}>{fs.recentFiles.length} 条记录</span>
          </div>

          {fs.recentFiles.length === 0 ? (
            <div className="text-center py-8" style={{ fontSize: fontSize.sm, color: "rgba(0,212,255,0.25)" }}>
              打开文件后自动记录
            </div>
          ) : (
            <div className="space-y-1">
              {fs.recentFiles.map(rf => (
                <div
                  key={rf.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(0,40,80,0.3)] transition-all"
                >
                  <File className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: fontSize.sm, color: textPrimary }}>{rf.name}</p>
                    <p className="truncate" style={{ fontSize: fontSize.xs, color: textDim }}>
                      {rf.path} {rf.size != null && `· ${fs.formatSize(rf.size)}`}
                    </p>
                  </div>
                  <span style={{ fontSize: fontSize.xs, color: textDim }}>
                    {new Date(rf.accessedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}