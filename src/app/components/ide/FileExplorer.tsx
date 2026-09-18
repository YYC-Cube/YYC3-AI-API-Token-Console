/**
 * FileExplorer.tsx
 * =================
 * IDE 中栏 — 文件资源管理器
 * 文件树 + 搜索过滤 + CRUD 文件操作 + 右键菜单 + Git/Explorer 切换
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronRight, ChevronDown, FileText, Folder, FolderOpen,
  Search, Plus, RefreshCw, MoreHorizontal,
  FileCode, FileJson, FileType, File as FileIcon,
  FilePlus, FolderPlus, Pencil, Trash2, Copy, Scissors,
  GitBranch,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import { MOCK_FILE_TREE } from "./ide-mock-data";
import { GitPanel } from "./GitPanel";
import type { IDEFile } from "./ide-types";

type SidebarTab = "explorer" | "git";

interface FileExplorerProps {
  onFileSelect: (fileId: string, filename: string) => void;
  activeFileId?: string;
}

/** File icon based on extension */
function getFileIcon(name: string): React.ElementType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["tsx", "ts", "jsx", "js"].includes(ext)) return FileCode;
  if (["json"].includes(ext)) return FileJson;
  if (["css", "scss", "less"].includes(ext)) return FileType;
  if (["md", "txt", "log"].includes(ext)) return FileText;
  return FileIcon;
}

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["tsx", "jsx"].includes(ext)) return "#00d4ff";
  if (["ts", "js"].includes(ext)) return "#ffdd00";
  if (["json"].includes(ext)) return "#ffaa00";
  if (["css", "scss"].includes(ext)) return "#c792ea";
  if (["md"].includes(ext)) return "#82aaff";
  if (name.startsWith(".")) return "rgba(0,212,255,0.35)";
  return "rgba(0,212,255,0.5)";
}

// ======== Context Menu ========

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  fileId: string;
  isFolder: boolean;
  filename: string;
}

function ContextMenu({
  state,
  onClose,
  onAction,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAction: (action: string, fileId: string) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!state.visible) return null;

  const items = [
    ...(state.isFolder
      ? [
          { id: "newFile", icon: FilePlus, label: t("ide.newFile"), color: "#00ff88" },
          { id: "newFolder", icon: FolderPlus, label: t("ide.newFolder"), color: "#ffaa00" },
          { id: "divider1" as const },
        ]
      : []),
    { id: "rename", icon: Pencil, label: t("ide.rename"), color: "#00d4ff" },
    { id: "copy", icon: Copy, label: t("ide.copyPath"), color: "#c792ea" },
    { id: "divider2" as const },
    { id: "delete", icon: Trash2, label: t("ide.deleteFile"), color: "#ff3366" },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[100] rounded-lg overflow-hidden py-1"
      style={{
        left: state.x,
        top: state.y,
        background: "rgba(8,20,45,0.95)",
        border: "1px solid rgba(0,180,255,0.2)",
        backdropFilter: "blur(12px)",
        minWidth: "160px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {items.map((item, i) => {
        if ("id" in item && item.id.startsWith("divider")) {
          return <div key={i} className="my-1" style={{ borderTop: "1px solid rgba(0,180,255,0.1)" }} />;
        }
        const it = item as { id: string; icon: React.ElementType; label: string; color: string };
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => { onAction(it.id, state.fileId); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#c0dcf0] hover:bg-[rgba(0,40,80,0.3)] transition-all"
          >
            <Icon className="w-3 h-3" style={{ color: it.color }} />
            <span style={{ fontSize: "0.65rem" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ======== Inline Rename Input ========

function InlineInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => { if (value.trim()) onSubmit(value.trim()); else onCancel(); }}
      className="flex-1 bg-[rgba(0,40,80,0.4)] text-[#e0f0ff] px-1 py-0.5 rounded border border-[rgba(0,212,255,0.3)] outline-none"
      style={{ fontSize: "0.68rem", minWidth: "60px" }}
    />
  );
}

// ======== File Tree Node ========

interface FileTreeNodeProps {
  file: IDEFile;
  depth: number;
  onFileSelect: (fileId: string, filename: string) => void;
  activeFileId?: string;
  searchFilter: string;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, file: IDEFile) => void;
  renamingId: string | null;
  onRenameSubmit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
}

function matchesFilter(file: IDEFile, filter: string): boolean {
  if (!filter) return true;
  const lower = filter.toLowerCase();
  if (file.name.toLowerCase().includes(lower)) return true;
  if (file.children) {
    return file.children.some((c) => matchesFilter(c, filter));
  }
  return false;
}

function FileTreeNode({
  file, depth, onFileSelect, activeFileId, searchFilter,
  expandedFolders, toggleFolder, onContextMenu, renamingId, onRenameSubmit, onRenameCancel,
}: FileTreeNodeProps) {
  if (!matchesFilter(file, searchFilter)) return null;

  const isFolder = file.type === "folder";
  const isExpanded = expandedFolders.has(file.id);
  const isActive = file.id === activeFileId;
  const isRenaming = file.id === renamingId;

  const Icon = isFolder
    ? (isExpanded ? FolderOpen : Folder)
    : getFileIcon(file.name);

  const iconColor = isFolder ? "#ffaa00" : getFileColor(file.name);

  return (
    <>
      <button
        onClick={() => {
          if (isRenaming) return;
          if (isFolder) toggleFolder(file.id);
          else onFileSelect(file.id, file.name);
        }}
        onContextMenu={(e) => onContextMenu(e, file)}
        className={`w-full flex items-center gap-1 py-[3px] pr-2 rounded-[3px] transition-all group ${
          isActive
            ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
            : "text-[#c0dcf0] hover:bg-[rgba(0,40,80,0.2)]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <span className="w-3 h-3 flex items-center justify-center shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" />
            )}
          </span>
        ) : (
          <span className="w-3 h-3 shrink-0" />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
        {isRenaming ? (
          <InlineInput
            defaultValue={file.name}
            onSubmit={(val) => onRenameSubmit(file.id, val)}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="truncate flex-1 text-left" style={{ fontSize: "0.68rem" }}>
            {file.name}
          </span>
        )}
        {!isFolder && file.size && !isRenaming && (
          <span
            className="text-[rgba(0,212,255,0.2)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ fontSize: "0.5rem" }}
          >
            {file.size}
          </span>
        )}
      </button>
      {isFolder && isExpanded && file.children && (
        <>
          {file.children.map((child) => (
            <FileTreeNode
              key={child.id}
              file={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              activeFileId={activeFileId}
              searchFilter={searchFilter}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </>
      )}
    </>
  );
}

// ======== Main FileExplorer ========

export function FileExplorer({ onFileSelect, activeFileId }: FileExplorerProps) {
  const { t } = useI18n();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("explorer");
  const [searchFilter, setSearchFilter] = useState("");
  const [fileTree, setFileTree] = useState<IDEFile[]>(MOCK_FILE_TREE);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(["src", "src-app", "src-components"])
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, fileId: "", isFolder: false, filename: "",
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [creatingIn, setCreatingIn] = useState<{ parentId: string; type: "file" | "folder" } | null>(null);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: IDEFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      fileId: file.id,
      isFolder: file.type === "folder",
      filename: file.name,
    });
  }, []);

  const handleContextAction = useCallback((action: string, fileId: string) => {
    switch (action) {
      case "rename":
        setRenamingId(fileId);
        break;
      case "newFile":
        setCreatingIn({ parentId: fileId, type: "file" });
        setExpandedFolders((prev) => new Set([...prev, fileId]));
        break;
      case "newFolder":
        setCreatingIn({ parentId: fileId, type: "folder" });
        setExpandedFolders((prev) => new Set([...prev, fileId]));
        break;
      case "delete":
        setFileTree((prev) => removeFileById(prev, fileId));
        break;
      case "copy":
        // Copy path to clipboard (mock)
        break;
    }
  }, []);

  const handleRenameSubmit = useCallback((id: string, newName: string) => {
    setFileTree((prev) => renameFileById(prev, id, newName));
    setRenamingId(null);
  }, []);

  const handleCreateSubmit = useCallback((name: string) => {
    if (!creatingIn) return;
    const newFile: IDEFile = {
      id: `new-${Date.now()}`,
      name,
      type: creatingIn.type,
      ...(creatingIn.type === "file" ? { size: "0KB", modified: "just now" } : { children: [] }),
    };
    setFileTree((prev) => addFileToParent(prev, creatingIn.parentId, newFile));
    setCreatingIn(null);
  }, [creatingIn]);

  const handleNewFileRoot = useCallback(() => {
    setCreatingIn({ parentId: "src-app", type: "file" });
    setExpandedFolders((prev) => new Set([...prev, "src", "src-app"]));
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(4,10,22,0.5)" }}>
      {/* Tab switcher: Explorer / Git */}
      <div className="flex items-center shrink-0 px-1" style={{ borderBottom: "1px solid rgba(0,180,255,0.08)" }}>
        <button
          onClick={() => setSidebarTab("explorer")}
          className={`flex items-center gap-1 px-2.5 py-1.5 transition-all border-b-2 ${
            sidebarTab === "explorer"
              ? "text-[#00d4ff] border-[#00d4ff]"
              : "text-[rgba(0,212,255,0.35)] border-transparent hover:text-[rgba(0,212,255,0.6)]"
          }`}
          style={{ fontSize: "0.62rem" }}
        >
          <Folder className="w-3 h-3" />
          <span>{t("ide.explorer")}</span>
        </button>
        <button
          onClick={() => setSidebarTab("git")}
          className={`flex items-center gap-1 px-2.5 py-1.5 transition-all border-b-2 ${
            sidebarTab === "git"
              ? "text-[#00d4ff] border-[#00d4ff]"
              : "text-[rgba(0,212,255,0.35)] border-transparent hover:text-[rgba(0,212,255,0.6)]"
          }`}
          style={{ fontSize: "0.62rem" }}
        >
          <GitBranch className="w-3 h-3" />
          <span>{t("ide.git")}</span>
        </button>
      </div>

      {sidebarTab === "git" ? (
        <GitPanel />
      ) : (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 shrink-0"
            style={{ borderBottom: "1px solid rgba(0,180,255,0.06)" }}
          >
            <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem", letterSpacing: "0.5px" }}>
              {t("ide.explorer").toUpperCase()}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleNewFileRoot}
                className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
                title={t("ide.newFile")}
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
                title={t("ide.newFolder")}
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all">
                <RefreshCw className="w-3 h-3" />
              </button>
              <button className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all">
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-2 py-1.5 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)]">
              <Search className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t("ide.filterFiles")}
                className="flex-1 bg-transparent text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] outline-none"
                style={{ fontSize: "0.65rem" }}
              />
            </div>
          </div>

          {/* File Tree */}
          <div
            className="flex-1 overflow-y-auto px-1 py-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.15) transparent" }}
            onContextMenu={(e) => {
              e.preventDefault();
              // Root level context: create in src-app
              setContextMenu({
                visible: true, x: e.clientX, y: e.clientY,
                fileId: "src-app", isFolder: true, filename: "app",
              });
            }}
          >
            {fileTree.map((file) => (
              <FileTreeNode
                key={file.id}
                file={file}
                depth={0}
                onFileSelect={onFileSelect}
                activeFileId={activeFileId}
                searchFilter={searchFilter}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onContextMenu={handleContextMenu}
                renamingId={renamingId}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}

            {/* Inline create input */}
            {creatingIn && (
              <div
                className="flex items-center gap-1 py-[3px] px-2"
                style={{ paddingLeft: "20px" }}
              >
                {creatingIn.type === "folder" ? (
                  <Folder className="w-3.5 h-3.5 text-[#ffaa00] shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                )}
                <InlineInput
                  defaultValue={creatingIn.type === "folder" ? "new-folder" : "untitled.tsx"}
                  onSubmit={handleCreateSubmit}
                  onCancel={() => setCreatingIn(null)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu((s) => ({ ...s, visible: false }))}
        onAction={handleContextAction}
      />
    </div>
  );
}

// ======== Tree Helpers ========

function removeFileById(tree: IDEFile[], id: string): IDEFile[] {
  return tree
    .filter((f) => f.id !== id)
    .map((f) => f.children ? { ...f, children: removeFileById(f.children, id) } : f);
}

function renameFileById(tree: IDEFile[], id: string, newName: string): IDEFile[] {
  return tree.map((f) => {
    if (f.id === id) return { ...f, name: newName };
    if (f.children) return { ...f, children: renameFileById(f.children, id, newName) };
    return f;
  });
}

function addFileToParent(tree: IDEFile[], parentId: string, newFile: IDEFile): IDEFile[] {
  return tree.map((f) => {
    if (f.id === parentId && f.children) {
      return { ...f, children: [...f.children, newFile] };
    }
    if (f.children) return { ...f, children: addFileToParent(f.children, parentId, newFile) };
    return f;
  });
}
