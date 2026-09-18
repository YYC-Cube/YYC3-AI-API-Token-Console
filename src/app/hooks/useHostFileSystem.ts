/**
 * useHostFileSystem.ts
 * =====================
 * 宿主机文件系统访问 Hook — File System Access API
 *
 * 功能:
 *  - 打开本地目录 (showDirectoryPicker) / 自动识别 YYC³ 存储目录
 *  - 文件浏览 / 递归读取 / 搜索
 *  - 文件创建 / 编辑 / 保存 / 删除 / 重命名
 *  - 文件上传 (拖拽/选择) / 下载
 *  - 文件版本控制 (IndexedDB fileVersions store)
 *  - 最近文件记录
 *
 * 后端接口预留:
 *  - 当 File System Access API 不可用时, 通过 HTTP API 降级
 *  - API 端点: POST /api/fs/{read|write|delete|rename|list|upload|search}
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { idbPut, idbGetAll, idbDelete, idbPutMany } from "../lib/yyc3-storage";
import { getAPIConfig } from "../lib/api-config";
import type { HostFileEntry, FileVersion } from "../types";

// ============================================================
//  API 降级层 (后端接口预留)
// ============================================================

// RF-006: 移除硬编码 API_BASE，改用 getAPIConfig().fsBase

interface FSAPIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function apiFallback<T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<FSAPIResponse<T>> {
  const config = getAPIConfig();
  // RF-006: enableBackend === false 时跳过网络请求
  if (!config.enableBackend) {
    return { ok: false, error: "后端 API 未启用 (enableBackend=false)" };
  }
  try {
    const res = await fetch(`${config.fsBase}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "网络不可达" };
  }
}

// ============================================================
//  工具函数
// ============================================================

function genId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/** 判断文件是否为文本类型 */
function isTextFile(name: string): boolean {
  const textExts = new Set([
    "txt", "md", "json", "yaml", "yml", "toml", "xml", "csv", "tsv",
    "log", "ini", "cfg", "conf", "env", "sh", "bash", "zsh",
    "py", "js", "ts", "tsx", "jsx", "html", "css", "scss", "less",
    "sql", "graphql", "rs", "go", "java", "kt", "c", "cpp", "h", "hpp",
    "rb", "php", "swift", "dart", "lua", "r", "jl", "ex", "exs",
    "vue", "svelte", "astro", "dockerfile", "makefile", "gitignore",
  ]);
  const ext = getExtension(name);
  const baseName = name.toLowerCase();
  return textExts.has(ext) || ["dockerfile", "makefile", ".gitignore", ".env", "readme", "license"].some(n => baseName.includes(n));
}

/** 判断文件是否为图片类型 */
function isImageFile(name: string): boolean {
  return new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"]).has(getExtension(name));
}

/** 获取文件类型图标提示 */
export function getFileTypeInfo(name: string): { icon: string; color: string } {
  const ext = getExtension(name);
  const map: Record<string, { icon: string; color: string }> = {
    json: { icon: "{ }", color: "#ffaa00" },
    log: { icon: "LOG", color: "#7b8cff" },
    sql: { icon: "SQL", color: "#00d4ff" },
    py: { icon: "PY", color: "#3776AB" },
    ts: { icon: "TS", color: "#3178C6" },
    tsx: { icon: "TSX", color: "#3178C6" },
    js: { icon: "JS", color: "#F7DF1E" },
    md: { icon: "MD", color: "#083fa1" },
    yaml: { icon: "YML", color: "#CB171E" },
    yml: { icon: "YML", color: "#CB171E" },
    sh: { icon: "SH", color: "#4EAA25" },
    csv: { icon: "CSV", color: "#00ff88" },
    xml: { icon: "XML", color: "#f06529" },
    html: { icon: "HTM", color: "#e34c26" },
    css: { icon: "CSS", color: "#264de4" },
    env: { icon: "ENV", color: "#ECD53F" },
    toml: { icon: "TML", color: "#9C4221" },
    png: { icon: "IMG", color: "#00d4ff" },
    jpg: { icon: "IMG", color: "#00d4ff" },
    jpeg: { icon: "IMG", color: "#00d4ff" },
    gif: { icon: "IMG", color: "#00d4ff" },
    svg: { icon: "SVG", color: "#FFB13B" },
  };
  return map[ext] || { icon: ext.toUpperCase().slice(0, 3) || "FILE", color: "rgba(0,212,255,0.5)" };
}

/** 递归读取目录内容 */
async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath: string,
  depth = 0,
  maxDepth = 2
): Promise<HostFileEntry[]> {
  const entries: HostFileEntry[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    const entry: HostFileEntry = {
      id: genId(),
      name,
      kind: handle.kind,
      path: `${parentPath}/${name}`,
      handle,
    };

    if (handle.kind === "file") {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        entry.size = file.size;
        entry.lastModified = file.lastModified;
        entry.mimeType = file.type || undefined;
      } catch {
        // 权限被拒
      }
    } else if (handle.kind === "directory" && depth < maxDepth) {
      entry.children = await readDirectory(
        handle as FileSystemDirectoryHandle,
        entry.path,
        depth + 1,
        maxDepth
      );
    }

    entries.push(entry);
  }

  // 目录在前, 文件在后, 字母排序
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/** 递归搜索文件名 */
async function searchInDirectory(
  dirHandle: FileSystemDirectoryHandle,
  query: string,
  parentPath: string,
  results: HostFileEntry[],
  maxResults = 50,
  depth = 0,
  maxDepth = 6
): Promise<void> {
  if (results.length >= maxResults || depth > maxDepth) return;
  const lq = query.toLowerCase();

  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (results.length >= maxResults) break;

    const path = `${parentPath}/${name}`;

    if (name.toLowerCase().includes(lq)) {
      const entry: HostFileEntry = {
        id: genId(),
        name,
        kind: handle.kind,
        path,
        handle,
      };
      if (handle.kind === "file") {
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          entry.size = file.size;
          entry.lastModified = file.lastModified;
        } catch { /* skip */ }
      }
      results.push(entry);
    }

    if (handle.kind === "directory") {
      await searchInDirectory(
        handle as FileSystemDirectoryHandle,
        query, path, results, maxResults, depth + 1, maxDepth
      );
    }
  }
}

// ============================================================
//  Recent file tracking
// ============================================================

// RecentFile is now centralized in types/index.ts
import type { RecentFile } from "../types";
// RF-011: Re-export 已移除

const RECENT_KEY = "yyc3_recent_files";
const MAX_RECENT = 20;

function loadRecentFiles(): RecentFile[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

function saveRecentFile(entry: HostFileEntry) {
  try {
    const recent = loadRecentFiles().filter(r => r.path !== entry.path);
    recent.unshift({ id: entry.id, name: entry.name, path: entry.path, size: entry.size, accessedAt: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

// ============================================================
//  Hook
// ============================================================

export function useHostFileSystem() {
  const [supported] = useState(
    typeof window !== "undefined" && "showDirectoryPicker" in window
  );
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [rootName, setRootName] = useState("");
  const [entries, setEntries] = useState<HostFileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HostFileEntry | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editingDirty, setEditingDirty] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HostFileEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecentFiles);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const rootRef = useRef<FileSystemDirectoryHandle | null>(null);

  // ── 加载版本历史 (from IndexedDB fileVersions store) ──
  const loadVersions = useCallback(async () => {
    const all = await idbGetAll<FileVersion>("fileVersions");
    setVersions(all.sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  // ── 获取当前目录 handle ──
  const getCurrentDirHandle = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!rootRef.current) return null;
    let handle = rootRef.current;
    for (const seg of currentPath) {
      try {
        handle = await handle.getDirectoryHandle(seg);
      } catch {
        return null;
      }
    }
    return handle;
  }, [currentPath]);

  // ── 刷新当前目录 ──
  const refreshCurrentDir = useCallback(async () => {
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;
    const basePath = currentPath.length > 0
      ? `${rootRef.current!.name}/${currentPath.join("/")}`
      : rootRef.current!.name;
    const items = await readDirectory(dirHandle, basePath);
    setEntries(items);
  }, [getCurrentDirHandle, currentPath]);

  // ── 打开目录 ──
  const openDirectory = useCallback(async () => {
    if (!supported) {
      toast.error("浏览器不支持 File System Access API，需后端 /api/fs 代理");
      const res = await apiFallback<HostFileEntry[]>("list", { path: "/" });
      if (res.ok && res.data) {
        setEntries(res.data);
        setRootName("远程文件系统");
      }
      return;
    }

    try {
      setLoading(true);
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      rootRef.current = handle;
      setRootHandle(handle);
      setRootName(handle.name);
      setCurrentPath([]);
      setSelectedEntry(null);
      setEditingContent(null);
      setImagePreviewUrl(null);
      setSearchQuery("");
      setSearchResults([]);

      const items = await readDirectory(handle, handle.name);
      setEntries(items);
      toast.success(`已打开目录: ${handle.name}`);
      await loadVersions();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error(`打开目录失败: ${err?.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [supported, loadVersions]);

  // ── 导航到子目录 ──
  const navigateToDir = useCallback(async (entry: HostFileEntry) => {
    if (entry.kind !== "directory" || !entry.handle) return;
    setLoading(true);
    try {
      const dirHandle = entry.handle as FileSystemDirectoryHandle;
      const items = await readDirectory(dirHandle, entry.path);
      setEntries(items);
      setCurrentPath((prev) => [...prev, entry.name]);
      setSelectedEntry(null);
      setEditingContent(null);
      setImagePreviewUrl(null);
    } catch (err: any) {
      toast.error(`无法打开: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 返回上级 ──
  const navigateUp = useCallback(async () => {
    if (!rootRef.current || currentPath.length === 0) return;
    setLoading(true);
    try {
      let handle = rootRef.current;
      const newPath = currentPath.slice(0, -1);
      for (const seg of newPath) {
        handle = await handle.getDirectoryHandle(seg);
      }
      const basePath = newPath.length > 0
        ? `${rootRef.current.name}/${newPath.join("/")}`
        : rootRef.current.name;
      const items = await readDirectory(handle, basePath);
      setEntries(items);
      setCurrentPath(newPath);
      setSelectedEntry(null);
      setEditingContent(null);
      setImagePreviewUrl(null);
    } catch (err: any) {
      toast.error(`导航失败: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  // ── 导航到面包屑指定层级 ──
  const navigateToBreadcrumb = useCallback(async (index: number) => {
    if (!rootRef.current) return;
    if (index === 0) {
      // 回到根目录
      setLoading(true);
      try {
        const items = await readDirectory(rootRef.current, rootRef.current.name);
        setEntries(items);
        setCurrentPath([]);
        setSelectedEntry(null);
        setEditingContent(null);
        setImagePreviewUrl(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const targetPath = currentPath.slice(0, index);
    setLoading(true);
    try {
      let handle = rootRef.current;
      for (const seg of targetPath) {
        handle = await handle.getDirectoryHandle(seg);
      }
      const basePath = `${rootRef.current.name}/${targetPath.join("/")}`;
      const items = await readDirectory(handle, basePath);
      setEntries(items);
      setCurrentPath(targetPath);
      setSelectedEntry(null);
      setEditingContent(null);
      setImagePreviewUrl(null);
    } catch (err: any) {
      toast.error(`导航失败: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  // ── 读取文件内容 ──
  const readFile = useCallback(async (entry: HostFileEntry) => {
    if (entry.kind !== "file" || !entry.handle) return;
    setSelectedEntry(entry);
    setImagePreviewUrl(null);
    saveRecentFile(entry);
    setRecentFiles(loadRecentFiles());

    try {
      const fileHandle = entry.handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();

      // 图片预览
      if (isImageFile(entry.name)) {
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
        setEditingContent(null);
        setEditingDirty(false);
        return;
      }

      // 文本文件 (< 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setEditingContent(`[文件过大: ${formatSize(file.size)}, 仅支持 < 10MB 的文本文件编辑]`);
        setEditingDirty(false);
        return;
      }

      if (!isTextFile(entry.name) && file.size > 0) {
        // 二进制文件提示
        setEditingContent(`[二进制文件: ${entry.name} (${formatSize(file.size)})]\n[使用"下载"功能获取文件]`);
        setEditingDirty(false);
        return;
      }

      const text = await file.text();
      setEditingContent(text);
      setEditingDirty(false);
    } catch (err: any) {
      toast.error(`读取失败: ${err?.message}`);
      setEditingContent(null);
    }
  }, []);

  // ── 保存文件 (带版本快照) ──
  const saveFile = useCallback(async () => {
    if (!selectedEntry?.handle || editingContent === null) return;
    try {
      const fileHandle = selectedEntry.handle as FileSystemFileHandle;

      // 保存版本快照到 IndexedDB (fileVersions store)
      try {
        const oldFile = await fileHandle.getFile();
        const oldContent = await oldFile.text();
        const versionNumber = versions.filter(v => v.filePath === selectedEntry.path).length + 1;
        const version: FileVersion = {
          id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileId: selectedEntry.id,
          fileName: selectedEntry.name,
          filePath: selectedEntry.path,
          content: oldContent,
          size: oldFile.size,
          savedAt: Date.now(),
          label: `v${versionNumber} · ${new Date().toLocaleTimeString("zh-CN")}`,
        };
        await idbPut("fileVersions", version);
        setVersions((prev) => [version, ...prev]);
      } catch {
        // 版本快照失败不阻塞保存
      }

      // 写入文件
      const writable = await (fileHandle as any).createWritable();
      await writable.write(editingContent);
      await writable.close();

      // 更新 entry metadata
      const updatedFile = await fileHandle.getFile();
      setSelectedEntry(prev => prev ? { ...prev, size: updatedFile.size, lastModified: updatedFile.lastModified } : null);

      setEditingDirty(false);
      toast.success(`已保存: ${selectedEntry.name}`);

      // 刷新列表中的文件大小
      await refreshCurrentDir();
    } catch (err: any) {
      toast.error(`保存失败: ${err?.message}`);
    }
  }, [selectedEntry, editingContent, versions, refreshCurrentDir]);

  // ── 创建文件 ──
  const createFile = useCallback(async (name: string, content = "") => {
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;
    try {
      const newHandle = await dirHandle.getFileHandle(name, { create: true });
      if (content) {
        const writable = await (newHandle as any).createWritable();
        await writable.write(content);
        await writable.close();
      }
      await refreshCurrentDir();
      toast.success(`已创建: ${name}`);
    } catch (err: any) {
      toast.error(`创建失败: ${err?.message}`);
    }
  }, [getCurrentDirHandle, refreshCurrentDir]);

  // ── 创建目录 ──
  const createDirectory = useCallback(async (name: string) => {
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;
    try {
      await dirHandle.getDirectoryHandle(name, { create: true });
      await refreshCurrentDir();
      toast.success(`已创建目录: ${name}`);
    } catch (err: any) {
      toast.error(`创建目录失败: ${err?.message}`);
    }
  }, [getCurrentDirHandle, refreshCurrentDir]);

  // ── 删除文件/目录 ──
  const deleteEntry = useCallback(async (entry: HostFileEntry) => {
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;
    try {
      await dirHandle.removeEntry(entry.name, { recursive: entry.kind === "directory" });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry(null);
        setEditingContent(null);
        setImagePreviewUrl(null);
      }
      toast.success(`已删除: ${entry.name}`);
    } catch (err: any) {
      toast.error(`删除失败: ${err?.message}`);
    }
  }, [getCurrentDirHandle, selectedEntry]);

  // ── 重命名 ──
  const renameEntry = useCallback(async (entry: HostFileEntry, newName: string) => {
    if (!entry.handle) return;
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;

    try {
      if (entry.kind === "file") {
        const oldFile = await (entry.handle as FileSystemFileHandle).getFile();
        const content = await oldFile.arrayBuffer();
        const newHandle = await dirHandle.getFileHandle(newName, { create: true });
        const writable = await (newHandle as any).createWritable();
        await writable.write(content);
        await writable.close();
        await dirHandle.removeEntry(entry.name);
      } else {
        toast.error("File System Access API 暂不支持目录重命名，请使用终端操作");
        return;
      }

      await refreshCurrentDir();
      toast.success(`已重命名: ${entry.name} → ${newName}`);
    } catch (err: any) {
      toast.error(`重命名失败: ${err?.message}`);
    }
  }, [getCurrentDirHandle, refreshCurrentDir]);

  // ── 下载文件 ──
  const downloadFile = useCallback(async (entry: HostFileEntry) => {
    if (entry.kind !== "file" || !entry.handle) return;
    try {
      const file = await (entry.handle as FileSystemFileHandle).getFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`下载中: ${entry.name}`);
    } catch (err: any) {
      toast.error(`下载失败: ${err?.message}`);
    }
  }, []);

  // ── 上传文件 ──
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const dirHandle = await getCurrentDirHandle();
    if (!dirHandle) return;
    try {
      let count = 0;
      for (const file of Array.from(files)) {
        const newHandle = await dirHandle.getFileHandle(file.name, { create: true });
        const writable = await (newHandle as any).createWritable();
        await writable.write(file);
        await writable.close();
        count++;
      }
      await refreshCurrentDir();
      toast.success(`已上传 ${count} 个文件`);
    } catch (err: any) {
      toast.error(`上传失败: ${err?.message}`);
    }
  }, [getCurrentDirHandle, refreshCurrentDir]);

  // ── 搜索文件 ──
  const searchFiles = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !rootRef.current) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results: HostFileEntry[] = [];
      await searchInDirectory(rootRef.current, query, rootRef.current.name, results);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ── 恢复版本 ──
  const restoreVersion = useCallback(async (version: FileVersion) => {
    if (!selectedEntry?.handle || selectedEntry.path !== version.filePath) {
      toast.error("请先打开对应文件");
      return;
    }
    try {
      const fileHandle = selectedEntry.handle as FileSystemFileHandle;
      const writable = await (fileHandle as any).createWritable();
      await writable.write(version.content);
      await writable.close();
      setEditingContent(version.content);
      setEditingDirty(false);
      toast.success(`已恢复到: ${version.label || version.id}`);
    } catch (err: any) {
      toast.error(`恢复失败: ${err?.message}`);
    }
  }, [selectedEntry]);

  // ── 删除版本快照 ──
  const deleteVersion = useCallback(async (versionId: string) => {
    await idbDelete("fileVersions", versionId);
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
    toast.success("版本快照已删除");
  }, []);

  // ── 清理图片预览 URL ──
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // ── 面包屑路径 ──
  const breadcrumbs = [rootName || "根目录", ...currentPath];

  // 当前文件的版本列表
  const currentFileVersions = selectedEntry
    ? versions.filter(v => v.filePath === selectedEntry.path)
    : [];

  // 文件统计
  const stats = {
    totalEntries: entries.length,
    dirs: entries.filter(e => e.kind === "directory").length,
    files: entries.filter(e => e.kind === "file").length,
    totalSize: entries.reduce((acc, e) => acc + (e.size || 0), 0),
    totalVersions: versions.length,
  };

  return {
    // 状态
    supported,
    rootHandle,
    rootName,
    entries,
    currentPath,
    breadcrumbs,
    selectedEntry,
    editingContent,
    editingDirty,
    versions,
    currentFileVersions,
    loading,
    searchQuery,
    searchResults,
    searching,
    recentFiles,
    imagePreviewUrl,
    stats,
    // 操作
    openDirectory,
    navigateToDir,
    navigateUp,
    navigateToBreadcrumb,
    readFile,
    saveFile,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    downloadFile,
    uploadFiles,
    searchFiles,
    restoreVersion,
    deleteVersion,
    refreshCurrentDir,
    setEditingContent: (content: string) => {
      setEditingContent(content);
      setEditingDirty(true);
    },
    setSelectedEntry,
    // 工具
    formatSize,
    getExtension,
    isTextFile,
    isImageFile,
    getFileTypeInfo,
  };
}