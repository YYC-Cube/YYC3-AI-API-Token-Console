/**
 * useHostFileSystem.test.tsx
 * ============================
 * useHostFileSystem Hook - 宿主机文件系统 (File System Access API) 测试
 *
 * 覆盖范围:
 * - 初始状态 / unsupported 降级 (enableBackend 开关 + apiFallback)
 * - openDirectory (成功 / AbortError / 普通 Error)
 * - 目录导航 (navigateToDir / navigateUp / navigateToBreadcrumb) 含错误分支
 * - readFile (文本 / 图片 / 超大 / 二进制 / 读取失败 / 最近文件)
 * - saveFile (版本快照 / 写入 / 刷新)
 * - createFile / createDirectory / deleteEntry / renameEntry / downloadFile / uploadFiles
 * - searchFiles / restoreVersion / deleteVersion
 * - 工具函数 (getExtension / formatSize / getFileTypeInfo / isTextFile / isImageFile)
 *
 * Mock 契约: window.showDirectoryPicker 经 vi.stubGlobal 注入最小契约 handle;
 *            jsdom 无 URL.createObjectURL → beforeAll 补丁; IndexedDB 缺失 → idb* 静默降级
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { useHostFileSystem } from "../hooks/useHostFileSystem";
import { resetAPIConfig, setAPIConfig } from "../lib/api-config";
import type { HostFileEntry } from "../types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ============================================================
// File System Access API 最小契约 mock
// ============================================================

interface MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

interface MockWritable {
  write: Mock<(data: unknown) => Promise<void>>;
  close: Mock<() => Promise<void>>;
}

interface MockFileHandle {
  kind: "file";
  name: string;
  getFile: Mock<() => Promise<MockFile>>;
  createWritable: Mock<() => Promise<MockWritable>>;
}

interface MockDirHandle {
  kind: "directory";
  name: string;
  entries: () => AsyncGenerator<[string, MockFileHandle | MockDirHandle]>;
  getDirectoryHandle: Mock<(seg: string) => Promise<MockDirHandle>>;
  getFileHandle: Mock<(fileName: string) => Promise<MockFileHandle>>;
  removeEntry: Mock<(name: string, opts?: { recursive?: boolean }) => Promise<void>>;
}

type MockHandle = MockFileHandle | MockDirHandle;

function makeWritable(): MockWritable {
  return { write: vi.fn(async () => {}), close: vi.fn(async () => {}) };
}

function makeFile(name: string, content: string, overrides: Partial<MockFile> = {}): MockFile {
  return {
    name,
    size: content.length,
    type: "text/plain",
    lastModified: 1700000000000,
    text: async () => content,
    arrayBuffer: async () => new TextEncoder().encode(content).buffer,
    ...overrides,
  };
}

function makeFileHandle(name: string, file: MockFile): MockFileHandle {
  return {
    kind: "file",
    name,
    getFile: vi.fn(async () => file),
    createWritable: vi.fn(async () => makeWritable()),
  };
}

function makeDirHandle(name: string, children: Array<[string, MockHandle]>): MockDirHandle {
  return {
    kind: "directory",
    name,
    async *entries() {
      for (const [n, h] of children) yield [n, h] as [string, MockHandle];
    },
    getDirectoryHandle: vi.fn(async (seg: string) => {
      const found = children.find(([n, h]) => n === seg && h.kind === "directory");
      if (!found) throw new Error(`directory not found: ${seg}`);
      return found[1] as MockDirHandle;
    }),
    getFileHandle: vi.fn(async (fileName: string) => {
      const found = children.find(([n, h]) => n === fileName && h.kind === "file");
      if (!found) throw new Error(`file not found: ${fileName}`);
      return found[1] as MockFileHandle;
    }),
    removeEntry: vi.fn(async () => {}),
  };
}

function fileEntry(name: string, path: string, handle: unknown): HostFileEntry {
  return { id: `e-${name}`, name, kind: "file", path, handle } as unknown as HostFileEntry;
}

function dirEntry(name: string, path: string, handle: unknown): HostFileEntry {
  return { id: `e-${name}`, name, kind: "directory", path, handle } as unknown as HostFileEntry;
}

/** 构建测试目录树: proj/{src/{main.ts}, a.ts, README.md, logo.png, data.bin} */
function buildTree() {
  const mainTs = makeFileHandle("main.ts", makeFile("main.ts", "console.log(1);"));
  const srcDir = makeDirHandle("src", [["main.ts", mainTs]]);
  const aTs = makeFileHandle("a.ts", makeFile("a.ts", "export const A = 1;"));
  const readme = makeFileHandle("README.md", makeFile("README.md", "# proj"));
  const logo = makeFileHandle("logo.png", makeFile("logo.png", "\u{1F5BC}", { type: "image/png" }));
  const data = makeFileHandle("data.bin", makeFile("data.bin", "", { size: 512, type: "application/octet-stream" }));
  const root = makeDirHandle("proj", [
    ["src", srcDir],
    ["a.ts", aTs],
    ["README.md", readme],
    ["logo.png", logo],
    ["data.bin", data],
  ]);
  return { root, srcDir, aTs, readme, logo, data, mainTs };
}

const pickerMock = vi.fn();
const fetchMock = vi.fn();

describe("useHostFileSystem", () => {
  beforeAll(() => {
    // vitest jsdom 环境的 URL.createObjectURL 为 Node 实现 (对非 Blob 抛错), 统一替换为 Mock
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetAPIConfig();
    pickerMock.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 打开 mock 目录树, 返回 { result, rerender helper, tree } */
  async function openWithTree() {
    const tree = buildTree();
    pickerMock.mockResolvedValue(tree.root);
    vi.stubGlobal("showDirectoryPicker", pickerMock);
    const { result } = renderHook(() => useHostFileSystem());
    await act(async () => {
      await result.current.openDirectory();
    });
    return { result, tree };
  }

  // ----------------------------------------------------------
  // 初始状态与 unsupported 降级
  // ----------------------------------------------------------

  describe("初始状态与 unsupported 降级", () => {
    it("无 showDirectoryPicker 时 supported 应为 false", () => {
      const { result } = renderHook(() => useHostFileSystem());
      expect(result.current.supported).toBe(false);
      expect(result.current.rootName).toBe("");
      expect(result.current.breadcrumbs).toEqual(["根目录"]);
      expect(result.current.entries).toEqual([]);
      expect(result.current.stats.totalEntries).toBe(0);
    });

    it("unsupported + enableBackend=false 时 openDirectory 应提示且不请求后端", async () => {
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("浏览器不支持"));
      expect(result.current.entries).toEqual([]);
      expect(result.current.rootName).toBe("");
    });

    it("unsupported + enableBackend=true 时应走 apiFallback list", async () => {
      setAPIConfig({ enableBackend: true, fsBase: "/api/fs" });
      vi.stubGlobal("fetch", fetchMock);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "r1", name: "remote.txt", kind: "file", path: "/remote.txt" }],
      });
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/fs/list",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.current.rootName).toBe("远程文件系统");
      expect(result.current.entries.length).toBe(1);
    });

    it("apiFallback 网络失败时应静默返回", async () => {
      setAPIConfig({ enableBackend: true, fsBase: "/api/fs" });
      vi.stubGlobal("fetch", fetchMock);
      fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      expect(result.current.entries).toEqual([]);
      expect(result.current.rootName).toBe("");
    });
  });

  // ----------------------------------------------------------
  // openDirectory
  // ----------------------------------------------------------

  describe("openDirectory", () => {
    it("应打开目录并按目录在前字母序列出条目", async () => {
      const { result } = await openWithTree();
      expect(result.current.supported).toBe(true);
      expect(result.current.rootName).toBe("proj");
      expect(result.current.loading).toBe(false);
      expect(toast.success).toHaveBeenCalledWith("已打开目录: proj");

      expect(result.current.entries.length).toBe(5);
      expect(result.current.entries[0].kind).toBe("directory");
      expect(result.current.entries[0].name).toBe("src");
      expect(result.current.stats.dirs).toBe(1);
      expect(result.current.stats.files).toBe(4);
      expect(result.current.stats.totalSize).toBeGreaterThan(0);
    });

    it("用户取消 (AbortError) 不应提示错误", async () => {
      const abortErr = Object.assign(new Error("cancelled"), { name: "AbortError" });
      pickerMock.mockRejectedValue(abortErr);
      vi.stubGlobal("showDirectoryPicker", pickerMock);
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      expect(toast.error).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it("打开失败 (普通 Error) 应提示错误", async () => {
      pickerMock.mockRejectedValue(new Error("permission denied"));
      vi.stubGlobal("showDirectoryPicker", pickerMock);
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      expect(toast.error).toHaveBeenCalledWith("打开目录失败: permission denied");
      expect(result.current.loading).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 目录导航
  // ----------------------------------------------------------

  describe("目录导航", () => {
    it("navigateToDir 应进入子目录并更新面包屑", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(dirEntry("src", "proj/src", tree.srcDir));
      });
      expect(result.current.currentPath).toEqual(["src"]);
      expect(result.current.breadcrumbs).toEqual(["proj", "src"]);
      expect(result.current.entries.length).toBe(1);
      expect(result.current.entries[0].name).toBe("main.ts");
      expect(result.current.selectedEntry).toBeNull();
    });

    it("navigateToDir 对文件条目应无操作", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(fileEntry("a.ts", "proj/a.ts", tree.aTs));
      });
      expect(result.current.currentPath).toEqual([]);
    });

    it("navigateToDir 读取失败应提示", async () => {
      const { result } = await openWithTree();
      const badDir = {
        ...makeDirHandle("bad", []),
        // eslint-disable-next-line require-yield -- 模拟目录枚举即失败 (无产出直接抛错)
        async *entries(): AsyncGenerator<[string, MockHandle]> {
          throw new Error("EACCES");
        },
      };
      await act(async () => {
        await result.current.navigateToDir(dirEntry("bad", "proj/bad", badDir));
      });
      expect(toast.error).toHaveBeenCalledWith("无法打开: EACCES");
      expect(result.current.loading).toBe(false);
    });

    it("navigateUp 应返回上级目录", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(dirEntry("src", "proj/src", tree.srcDir));
      });
      await act(async () => {
        await result.current.navigateUp();
      });
      expect(result.current.currentPath).toEqual([]);
      expect(result.current.entries.length).toBe(5);
    });

    it("根目录 navigateUp 应无操作", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.navigateUp();
      });
      expect(result.current.currentPath).toEqual([]);
    });

    it("navigateUp 解析父目录失败应提示", async () => {
      // 构造两层嵌套: proj/src/deep — navigateUp 回退时需解析父目录段
      const deepDir = makeDirHandle("deep", []);
      const srcDir = makeDirHandle("src", [["deep", deepDir]]);
      const root = makeDirHandle("proj", [["src", srcDir]]);
      pickerMock.mockResolvedValue(root);
      vi.stubGlobal("showDirectoryPicker", pickerMock);
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      await act(async () => {
        await result.current.navigateToDir(dirEntry("src", "proj/src", srcDir));
      });
      await act(async () => {
        await result.current.navigateToDir(dirEntry("deep", "proj/src/deep", deepDir));
      });
      expect(result.current.currentPath).toEqual(["src", "deep"]);
      root.getDirectoryHandle.mockRejectedValue(new Error("stale handle"));
      await act(async () => {
        await result.current.navigateUp();
      });
      expect(toast.error).toHaveBeenCalledWith("导航失败: stale handle");
      expect(result.current.loading).toBe(false);
    });

    it("navigateToBreadcrumb(0) 应回根目录", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(dirEntry("src", "proj/src", tree.srcDir));
      });
      await act(async () => {
        await result.current.navigateToBreadcrumb(0);
      });
      expect(result.current.currentPath).toEqual([]);
      expect(result.current.entries.length).toBe(5);
    });

    it("navigateToBreadcrumb(index) 应回指定层级", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(dirEntry("src", "proj/src", tree.srcDir));
      });
      await act(async () => {
        await result.current.navigateToBreadcrumb(1);
      });
      expect(result.current.currentPath).toEqual(["src"]);
      expect(result.current.entries[0].name).toBe("main.ts");
    });

    it("navigateToBreadcrumb 解析失败应提示", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.navigateToDir(result.current.entries[0]);
      });
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getDirectoryHandle.mockRejectedValue(new Error("stale handle"));
      await act(async () => {
        await result.current.navigateToBreadcrumb(1);
      });
      expect(toast.error).toHaveBeenCalledWith("导航失败: stale handle");
    });
  });

  // ----------------------------------------------------------
  // readFile
  // ----------------------------------------------------------

  describe("readFile", () => {
    it("文本文件应加载内容并记录最近文件", async () => {
      const { result } = await openWithTree();
      const entry = fileEntry("a.ts", "proj/a.ts", result.current.entries.find((e) => e.name === "a.ts")?.handle);
      await act(async () => {
        await result.current.readFile(entry);
      });
      expect(result.current.editingContent).toBe("export const A = 1;");
      expect(result.current.editingDirty).toBe(false);
      expect(result.current.selectedEntry?.name).toBe("a.ts");
      expect(result.current.recentFiles.length).toBe(1);
      expect(result.current.recentFiles[0].path).toBe("proj/a.ts");
      const persisted = JSON.parse(localStorage.getItem("yyc3_recent_files") ?? "[]");
      expect(persisted.length).toBe(1);
    });

    it("图片文件应生成预览 URL 而非编辑内容", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "logo.png")?.handle;
      await act(async () => {
        await result.current.readFile(fileEntry("logo.png", "proj/logo.png", handle));
      });
      expect(result.current.imagePreviewUrl).toBe("blob:mock-url");
      expect(result.current.editingContent).toBeNull();
    });

    it("超过 10MB 的文本文件应提示过大", async () => {
      const { result } = await openWithTree();
      const bigHandle = makeFileHandle("big.log", makeFile("big.log", "x", { size: 11 * 1024 * 1024 }));
      await act(async () => {
        await result.current.readFile(fileEntry("big.log", "proj/big.log", bigHandle));
      });
      expect(result.current.editingContent).toContain("文件过大");
    });

    it("二进制文件应提示不可编辑", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "data.bin")?.handle;
      await act(async () => {
        await result.current.readFile(fileEntry("data.bin", "proj/data.bin", handle));
      });
      expect(result.current.editingContent).toContain("二进制文件");
    });

    it("读取失败应提示并清空内容", async () => {
      const { result } = await openWithTree();
      const broken = makeFileHandle("bad.ts", makeFile("bad.ts", ""));
      broken.getFile.mockRejectedValue(new Error("EPERM"));
      await act(async () => {
        await result.current.readFile(fileEntry("bad.ts", "proj/bad.ts", broken));
      });
      expect(toast.error).toHaveBeenCalledWith("读取失败: EPERM");
      expect(result.current.editingContent).toBeNull();
    });

    it("目录条目应无操作", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.readFile(dirEntry("src", "proj/src", tree.srcDir));
      });
      expect(result.current.editingContent).toBeNull();
      expect(result.current.selectedEntry).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // saveFile / 版本
  // ----------------------------------------------------------

  describe("saveFile / 版本", () => {
    it("无选中文件时应无操作", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.saveFile();
      });
      expect(toast.success).not.toHaveBeenCalledWith(expect.stringContaining("已保存"));
    });

    it("保存应写入内容并生成版本快照", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "a.ts")?.handle as unknown as MockFileHandle;
      await act(async () => {
        await result.current.readFile(fileEntry("a.ts", "proj/a.ts", handle));
      });
      act(() => {
        result.current.setEditingContent("export const A = 2;");
      });
      expect(result.current.editingDirty).toBe(true);

      await act(async () => {
        await result.current.saveFile();
      });
      expect(handle.createWritable).toHaveBeenCalledTimes(1);
      const writable = (await handle.createWritable.mock.results[0].value) as MockWritable;
      expect(writable.write).toHaveBeenCalledWith("export const A = 2;");
      expect(toast.success).toHaveBeenCalledWith("已保存: a.ts");
      expect(result.current.editingDirty).toBe(false);

      // 版本快照 (IndexedDB 缺失时降级为内存态)
      expect(result.current.versions.length).toBe(1);
      expect(result.current.versions[0].filePath).toBe("proj/a.ts");
      expect(result.current.currentFileVersions.length).toBe(1);
    });

    it("restoreVersion 未打开对应文件应提示", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.restoreVersion({
          id: "v1", fileId: "f1", fileName: "a.ts",
          filePath: "proj/other.ts", content: "old", size: 3, savedAt: 1,
        });
      });
      expect(toast.error).toHaveBeenCalledWith("请先打开对应文件");
    });

    it("restoreVersion 应恢复历史内容", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "a.ts")?.handle as unknown as MockFileHandle;
      const entry = fileEntry("a.ts", "proj/a.ts", handle);
      await act(async () => {
        await result.current.readFile(entry);
      });
      await act(async () => {
        await result.current.restoreVersion({
          id: "v1", fileId: entry.id, fileName: "a.ts",
          filePath: "proj/a.ts", content: "historical", size: 10, savedAt: 1, label: "v1 · 12:00:00",
        });
      });
      expect(handle.createWritable).toHaveBeenCalledTimes(1);
      expect(result.current.editingContent).toBe("historical");
      expect(toast.success).toHaveBeenCalledWith("已恢复到: v1 · 12:00:00");
    });

    it("restoreVersion 写入失败应提示", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "a.ts")?.handle as unknown as MockFileHandle;
      const entry = fileEntry("a.ts", "proj/a.ts", handle);
      await act(async () => {
        await result.current.readFile(entry);
      });
      handle.createWritable.mockRejectedValue(new Error("disk full"));
      await act(async () => {
        await result.current.restoreVersion({
          id: "v1", fileId: entry.id, fileName: "a.ts",
          filePath: "proj/a.ts", content: "x", size: 1, savedAt: 1,
        });
      });
      expect(toast.error).toHaveBeenCalledWith("恢复失败: disk full");
    });

    it("deleteVersion 应从版本列表移除", async () => {
      const { result } = await openWithTree();
      const handle = result.current.entries.find((e) => e.name === "a.ts")?.handle as unknown as MockFileHandle;
      await act(async () => {
        await result.current.readFile(fileEntry("a.ts", "proj/a.ts", handle));
      });
      act(() => {
        result.current.setEditingContent("new");
      });
      await act(async () => {
        await result.current.saveFile();
      });
      expect(result.current.versions.length).toBe(1);
      const versionId = result.current.versions[0].id;
      await act(async () => {
        await result.current.deleteVersion(versionId);
      });
      expect(result.current.versions.length).toBe(0);
      expect(toast.success).toHaveBeenCalledWith("版本快照已删除");
    });
  });

  // ----------------------------------------------------------
  // create / delete / rename
  // ----------------------------------------------------------

  describe("create / delete / rename", () => {
    it("createFile 应创建并写入内容", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      const newHandle = makeFileHandle("new.ts", makeFile("new.ts", ""));
      rootHandle.getFileHandle.mockResolvedValueOnce(newHandle);
      await act(async () => {
        await result.current.createFile("new.ts", "hello");
      });
      expect(rootHandle.getFileHandle).toHaveBeenCalledWith("new.ts", { create: true });
      expect(newHandle.createWritable).toHaveBeenCalledTimes(1);
      const writable = (await newHandle.createWritable.mock.results[0].value) as MockWritable;
      expect(writable.write).toHaveBeenCalledWith("hello");
      expect(toast.success).toHaveBeenCalledWith("已创建: new.ts");
    });

    it("createFile 空内容不应打开写入流", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      const emptyHandle = makeFileHandle("empty.md", makeFile("empty.md", ""));
      rootHandle.getFileHandle.mockResolvedValueOnce(emptyHandle);
      await act(async () => {
        await result.current.createFile("empty.md");
      });
      expect(emptyHandle.createWritable).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("已创建: empty.md");
    });

    it("createFile 失败应提示", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getFileHandle.mockRejectedValue(new Error("readonly"));
      await act(async () => {
        await result.current.createFile("x.ts");
      });
      expect(toast.error).toHaveBeenCalledWith("创建失败: readonly");
    });

    it("未打开根目录时 createFile 应静默无操作", async () => {
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.createFile("x.ts", "y");
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("createDirectory 应创建目录", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getDirectoryHandle.mockResolvedValueOnce(makeDirHandle("docs", []));
      await act(async () => {
        await result.current.createDirectory("docs");
      });
      expect(rootHandle.getDirectoryHandle).toHaveBeenCalledWith("docs", { create: true });
      expect(toast.success).toHaveBeenCalledWith("已创建目录: docs");
    });

    it("createDirectory 失败应提示", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getDirectoryHandle.mockRejectedValue(new Error("no space"));
      await act(async () => {
        await result.current.createDirectory("docs");
      });
      expect(toast.error).toHaveBeenCalledWith("创建目录失败: no space");
    });

    it("deleteEntry 应移除条目并清理选中态", async () => {
      const { result } = await openWithTree();
      const aEntry = result.current.entries.find((e) => e.name === "a.ts")!;
      await act(async () => {
        await result.current.readFile(aEntry);
      });
      expect(result.current.selectedEntry?.name).toBe("a.ts");

      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      await act(async () => {
        await result.current.deleteEntry(aEntry);
      });
      expect(rootHandle.removeEntry).toHaveBeenCalledWith("a.ts", { recursive: false });
      expect(result.current.entries.find((e) => e.name === "a.ts")).toBeUndefined();
      expect(result.current.selectedEntry).toBeNull();
      expect(result.current.editingContent).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("已删除: a.ts");
    });

    it("deleteEntry 目录应递归删除", async () => {
      const { result } = await openWithTree();
      const srcEntry = result.current.entries.find((e) => e.name === "src")!;
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      await act(async () => {
        await result.current.deleteEntry(srcEntry);
      });
      expect(rootHandle.removeEntry).toHaveBeenCalledWith("src", { recursive: true });
    });

    it("deleteEntry 失败应提示", async () => {
      const { result } = await openWithTree();
      const aEntry = result.current.entries.find((e) => e.name === "a.ts")!;
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.removeEntry.mockRejectedValue(new Error("EBUSY"));
      await act(async () => {
        await result.current.deleteEntry(aEntry);
      });
      expect(toast.error).toHaveBeenCalledWith("删除失败: EBUSY");
    });

    it("renameEntry 文件应复制内容并移除旧名", async () => {
      const { result } = await openWithTree();
      const aEntry = result.current.entries.find((e) => e.name === "a.ts")!;
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getFileHandle.mockResolvedValueOnce(makeFileHandle("b.ts", makeFile("b.ts", "")));
      await act(async () => {
        await result.current.renameEntry(aEntry, "b.ts");
      });
      expect(rootHandle.getFileHandle).toHaveBeenCalledWith("b.ts", { create: true });
      expect(rootHandle.removeEntry).toHaveBeenCalledWith("a.ts");
      expect(toast.success).toHaveBeenCalledWith("已重命名: a.ts → b.ts");
    });

    it("renameEntry 目录应提示暂不支持", async () => {
      const { result } = await openWithTree();
      const srcEntry = result.current.entries.find((e) => e.name === "src")!;
      await act(async () => {
        await result.current.renameEntry(srcEntry, "lib");
      });
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("暂不支持目录重命名"));
    });

    it("renameEntry 失败应提示", async () => {
      const { result } = await openWithTree();
      const aEntry = result.current.entries.find((e) => e.name === "a.ts")!;
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getFileHandle.mockRejectedValue(new Error("EACCES"));
      await act(async () => {
        await result.current.renameEntry(aEntry, "b.ts");
      });
      expect(toast.error).toHaveBeenCalledWith("重命名失败: EACCES");
    });
  });

  // ----------------------------------------------------------
  // downloadFile / uploadFiles
  // ----------------------------------------------------------

  describe("downloadFile / uploadFiles", () => {
    it("downloadFile 应创建下载链接并提示", async () => {
      const { result } = await openWithTree();
      const aEntry = result.current.entries.find((e) => e.name === "a.ts")!;
      await act(async () => {
        await result.current.downloadFile(aEntry);
      });
      expect(toast.success).toHaveBeenCalledWith("下载中: a.ts");
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("downloadFile 失败应提示", async () => {
      const { result } = await openWithTree();
      const broken = makeFileHandle("bad.ts", makeFile("bad.ts", ""));
      broken.getFile.mockRejectedValue(new Error("gone"));
      await act(async () => {
        await result.current.downloadFile(fileEntry("bad.ts", "proj/bad.ts", broken));
      });
      expect(toast.error).toHaveBeenCalledWith("下载失败: gone");
    });

    it("downloadFile 目录条目应无操作", async () => {
      const { result, tree } = await openWithTree();
      await act(async () => {
        await result.current.downloadFile(dirEntry("src", "proj/src", tree.srcDir));
      });
      expect(toast.success).not.toHaveBeenCalledWith(expect.stringContaining("下载中"));
    });

    it("uploadFiles 应写入全部文件并提示数量", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getFileHandle.mockImplementationOnce(async () => makeFileHandle("u1.txt", makeFile("u1.txt", "a")))
        .mockImplementationOnce(async () => makeFileHandle("u2.txt", makeFile("u2.txt", "bb")));
      await act(async () => {
        await result.current.uploadFiles([new File(["a"], "u1.txt"), new File(["bb"], "u2.txt")]);
      });
      expect(toast.success).toHaveBeenCalledWith("已上传 2 个文件");
    });

    it("uploadFiles 失败应提示", async () => {
      const { result } = await openWithTree();
      const rootHandle = result.current.rootHandle as unknown as MockDirHandle;
      rootHandle.getFileHandle.mockRejectedValue(new Error("quota"));
      await act(async () => {
        await result.current.uploadFiles([new File(["a"], "u1.txt")]);
      });
      expect(toast.error).toHaveBeenCalledWith("上传失败: quota");
    });
  });

  // ----------------------------------------------------------
  // searchFiles
  // ----------------------------------------------------------

  describe("searchFiles", () => {
    it("空查询应清空结果", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.searchFiles("  ");
      });
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searching).toBe(false);
    });

    it("未打开目录时搜索应清空结果", async () => {
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.searchFiles("main");
      });
      expect(result.current.searchResults).toEqual([]);
    });

    it("匹配文件名应递归返回结果", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.searchFiles("main");
      });
      expect(result.current.searchResults.length).toBe(1);
      expect(result.current.searchResults[0].name).toBe("main.ts");
      expect(result.current.searchResults[0].path).toBe("proj/src/main.ts");
      expect(result.current.searchQuery).toBe("main");
      expect(result.current.searching).toBe(false);
    });

    it("无匹配时应返回空结果", async () => {
      const { result } = await openWithTree();
      await act(async () => {
        await result.current.searchFiles("zzz-nothing");
      });
      expect(result.current.searchResults).toEqual([]);
    });

    it("搜索遍历异常时应静默返回空结果", async () => {
      const tree = buildTree();
      let entriesCalled = 0;
      const flakyRoot = {
        ...tree.root,
        async *entries() {
          entriesCalled += 1;
          if (entriesCalled > 1) throw new Error("io error");
          yield* tree.root.entries();
        },
      };
      pickerMock.mockResolvedValue(flakyRoot);
      vi.stubGlobal("showDirectoryPicker", pickerMock);
      const { result } = renderHook(() => useHostFileSystem());
      await act(async () => {
        await result.current.openDirectory();
      });
      await act(async () => {
        await result.current.searchFiles("a.ts");
      });
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searching).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 工具函数
  // ----------------------------------------------------------

  describe("工具函数", () => {
    it("getExtension 应提取小写扩展名", () => {
      const { result } = renderHook(() => useHostFileSystem());
      expect(result.current.getExtension("A.TS")).toBe("ts");
      expect(result.current.getExtension("noext")).toBe("");
      expect(result.current.getExtension(".env")).toBe("");
    });

    it("formatSize 应分级格式化", () => {
      const { result } = renderHook(() => useHostFileSystem());
      expect(result.current.formatSize(512)).toBe("512 B");
      expect(result.current.formatSize(2048)).toBe("2.0 KB");
      expect(result.current.formatSize(1572864)).toBe("1.5 MB");
      expect(result.current.formatSize(3221225472)).toBe("3.00 GB");
    });

    it("isTextFile / isImageFile 应按扩展名判定", () => {
      const { result } = renderHook(() => useHostFileSystem());
      expect(result.current.isTextFile("main.tsx")).toBe(true);
      expect(result.current.isTextFile("Dockerfile")).toBe(true);
      expect(result.current.isTextFile("app.exe")).toBe(false);
      expect(result.current.isImageFile("logo.PNG")).toBe(true);
      expect(result.current.isImageFile("main.ts")).toBe(false);
    });

    it("getFileTypeInfo 应返回已知与兜底图标", () => {
      const { result } = renderHook(() => useHostFileSystem());
      expect(result.current.getFileTypeInfo("x.json")).toEqual({ icon: "{ }", color: "#ffaa00" });
      expect(result.current.getFileTypeInfo("x.zip").icon).toBe("ZIP");
      expect(result.current.getFileTypeInfo("plain").icon).toBe("FILE");
    });
  });
});
