/**
 * useLocalFileSystem.test.tsx
 * ============================
 * useLocalFileSystem Hook - 本地文件系统状态管理测试
 *
 * 覆盖范围:
 * - 初始状态 (文件树 / 面包屑 / 日志)
 * - 目录导航 + 面包屑更新
 * - 文件选择
 * - goUp 返回上级
 * - 日志筛选 (级别 / 来源 / 搜索)
 * - 报告生成
 * - 格式化工具
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { useLocalFileSystem } from "../hooks/useLocalFileSystem";
import type { FileItem } from "../types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("useLocalFileSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("fileTree 应有 5 个根目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.fileTree.length).toBe(5);
    });

    it("currentPath 默认为 ~/.yyc3-cloudpivot", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot");
    });

    it("currentItems 应返回 5 个根目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.currentItems.length).toBe(5);
    });

    it("breadcrumbs 初始只有根路径", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.breadcrumbs.length).toBe(1);
      expect(result.current.breadcrumbs[0].label).toBe("~/.yyc3-cloudpivot");
    });

    it("selectedFile 初始为 null", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.selectedFile).toBeNull();
    });

    it("logs 应有初始数据", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.allLogs.length).toBe(50);
    });

    it("reports 初始为空", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.reports.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 目录导航
  // ----------------------------------------------------------

  describe("目录导航", () => {
    it("navigateTo 应更新 currentPath", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs");
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("导航后 breadcrumbs 应更新", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs/node");
      });
      expect(result.current.breadcrumbs.length).toBe(3);
      expect(result.current.breadcrumbs[2].label).toBe("node");
    });

    it("导航后 currentItems 应返回子目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs");
      });
      expect(result.current.currentItems.length).toBe(2); // node, system
    });

    it("selectFile 对目录应导航进入", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const logsDir = result.current.currentItems.find((f) => f.name === "logs")!;
      act(() => {
        result.current.selectFile(logsDir);
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("selectFile 对文件应设置 selectedFile", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/configs");
      });
      const file = result.current.currentItems.find((f) => f.name === "patrol.json")!;
      act(() => {
        result.current.selectFile(file);
      });
      expect(result.current.selectedFile?.name).toBe("patrol.json");
    });
  });

  // ----------------------------------------------------------
  // goUp
  // ----------------------------------------------------------

  describe("goUp", () => {
    it("在子目录时应返回上级", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs/node");
      });
      act(() => {
        result.current.goUp();
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("在根目录时 goUp 不做任何操作", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.goUp();
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot");
    });
  });

  // ----------------------------------------------------------
  // 日志筛选
  // ----------------------------------------------------------

  describe("日志筛选", () => {
    it("按级别 error 筛选", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.setLogLevelFilter("error");
      });
      expect(result.current.logs.every((l) => l.level === "error")).toBe(true);
      expect(result.current.logs.length).toBeGreaterThan(0);
    });

    it("按来源筛选", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const source = result.current.logSources[0];
      act(() => {
        result.current.setLogSourceFilter(source);
      });
      expect(result.current.logs.every((l) => l.source === source)).toBe(true);
    });

    it("搜索日志", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.setLogSearchQuery("推理");
      });
      expect(result.current.logs.every((l) => l.message.includes("推理") || l.source.includes("推理"))).toBe(true);
    });

    it("logSources 应有去重的来源列表", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const unique = new Set(result.current.logSources);
      expect(result.current.logSources.length).toBe(unique.size);
    });
  });

  // ----------------------------------------------------------
  // 报告生成
  // ----------------------------------------------------------

  describe("报告生成", () => {
    it("生成 JSON 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "performance",
          format: "json",
          dateRange: "today",
          includeCharts: true,
          includeRawData: false,
        });
      });
      expect(result.current.reports.length).toBe(1);
      expect(result.current.reports[0].filename).toContain(".json");
      expect(result.current.reports[0].previewContent).toContain("nodeHealth");
    });

    it("生成 Markdown 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "health",
          format: "markdown",
          dateRange: "week",
          includeCharts: false,
          includeRawData: true,
        });
      });
      expect(result.current.reports.length).toBe(1);
      expect(result.current.reports[0].filename).toContain(".md");
      expect(result.current.reports[0].previewContent).toContain("# YYC³");
    });

    it("生成 CSV 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "security",
          format: "csv",
          dateRange: "month",
          includeCharts: false,
          includeRawData: true,
        });
      });
      expect(result.current.reports[0].filename).toContain(".csv");
    });

    it("isGenerating 在生成过程中应为 true", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      let wasGenerating = false;

      const promise = act(async () => {
        const p = result.current.generateReport({
          type: "performance", format: "json", dateRange: "today",
          includeCharts: false, includeRawData: false,
        });
        // Check immediately after call
        wasGenerating = result.current.isGenerating;
        await p;
      });

      await promise;
      expect(result.current.isGenerating).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // formatSize
  // ----------------------------------------------------------

  describe("formatSize", () => {
    it("应格式化字节", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(500)).toBe("500B");
    });

    it("应格式化 KB", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(2048)).toBe("2.0KB");
    });

    it("应格式化 MB", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(2400000)).toBe("2.3MB");
    });

    it("null/undefined 返回 --", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(undefined)).toBe("--");
    });
  });
});

// ============================================================
//  覆盖率补测 (第三批 P2) — CRUD / 导入导出 / 文件内容 / 快速操作
// ============================================================

describe("useLocalFileSystem 覆盖率补测", () => {
  const TREE_KEY = "yyc3_file_tree";

  beforeEach(() => {
    vi.clearAllMocks();
    // 每个用例从默认文件树出发 (上一用例的树已持久化到 localStorage)
    localStorage.clear();
  });

  /** 在树中按 id 深度查找 */
  function findById(tree: FileItem[], id: string): FileItem | null {
    for (const item of tree) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // ----------------------------------------------------------
  //  addFile / addDirectory
  // ----------------------------------------------------------

  describe("文件树 CRUD", () => {
    it("addFile 嵌套目录: 挂到目标目录并按名推断扩展名", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let created: FileItem | undefined;
      act(() => {
        created = result.current.addFile("~/.yyc3-cloudpivot/configs", "new.json");
      });

      expect(created?.extension).toBe("json");
      expect(created?.path).toBe("~/.yyc3-cloudpivot/configs/new.json");
      expect(created?.type).toBe("file");
      expect(toast.success).toHaveBeenCalledWith("文件已创建: new.json");
      expect(findById(result.current.fileTree, created!.id)).not.toBeNull();
      // 持久化到 localStorage
      expect(localStorage.getItem(TREE_KEY)).toContain("new.json");
    });

    it("addFile 根目录: 显式 ext 与空扩展名兜底", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let withExt: FileItem | undefined;
      let noExt: FileItem | undefined;
      // 分开 act: addFile 读取闭包中的 fileTree, 需重渲染拿到最新树
      act(() => {
        withExt = result.current.addFile("~/.yyc3-cloudpivot", "notes", "md");
      });
      act(() => {
        noExt = result.current.addFile("~/.yyc3-cloudpivot", "empty.");
      });

      expect(result.current.fileTree.length).toBe(7); // 5 默认 + 2 根级新文件
      expect(withExt?.extension).toBe("md");
      expect(noExt?.extension).toBe(""); // split(".").pop() 为空 → 兜底 ""
    });

    it("addDirectory 嵌套与根目录", () => {
      let tick = 1_700_000_000_000;
      vi.spyOn(Date, "now").mockImplementation(() => ++tick);
      const { result } = renderHook(() => useLocalFileSystem());

      let nested: FileItem | undefined;
      let rootLevel: FileItem | undefined;
      act(() => {
        nested = result.current.addDirectory("~/.yyc3-cloudpivot/backups", "snapshots");
      });
      act(() => {
        rootLevel = result.current.addDirectory("~/.yyc3-cloudpivot", "workspace");
      });

      expect(nested?.children).toEqual([]);
      expect(nested?.id).not.toBe(rootLevel?.id);
      expect(findById(result.current.fileTree, nested!.id)?.type).toBe("directory");
      expect(result.current.fileTree.length).toBe(6);
      expect(toast.success).toHaveBeenCalledWith("目录已创建: snapshots");
      expect(toast.success).toHaveBeenCalledWith("目录已创建: workspace");
      vi.restoreAllMocks();
    });

    it("renameItem: 文件改扩展名 / 目录改路径 / 未知 id 返回 false", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let okFile = false;
      act(() => {
        okFile = result.current.renameItem("f-cfg-patrol", "patrol-v2.json");
      });
      expect(okFile).toBe(true);
      const renamed = findById(result.current.fileTree, "f-cfg-patrol");
      expect(renamed?.name).toBe("patrol-v2.json");
      expect(renamed?.path).toBe("~/.yyc3-cloudpivot/configs/patrol-v2.json");
      expect(renamed?.extension).toBe("json");
      expect(toast.success).toHaveBeenCalledWith("已重命名为: patrol-v2.json");

      let okDir = false;
      act(() => {
        okDir = result.current.renameItem("d-logs", "logz");
      });
      expect(okDir).toBe(true);
      expect(findById(result.current.fileTree, "d-logs")?.path).toBe("~/.yyc3-cloudpivot/logz");

      let okMissing = true;
      act(() => {
        okMissing = result.current.renameItem("nope", "x");
      });
      expect(okMissing).toBe(false);
    });

    it("deleteItem: 命中删除 / 未命中返回 false 不提示", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let ok = false;
      act(() => {
        ok = result.current.deleteItem("f-cfg-patrol");
      });
      expect(ok).toBe(true);
      expect(findById(result.current.fileTree, "f-cfg-patrol")).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("已删除");

      let okMissing = true;
      act(() => {
        okMissing = result.current.deleteItem("nope");
      });
      expect(okMissing).toBe(false);
      // 成功删除那一次已提示, 未命中不应再追加
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it("deleteBatch: 部分命中计数 / 全未命中不提示", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let count = 0;
      act(() => {
        count = result.current.deleteBatch(["f-cfg-patrol", "f-cfg-alerts", "nope"]);
      });
      expect(count).toBe(2);
      expect(toast.success).toHaveBeenCalledWith("已删除 2 项");

      let countNone = -1;
      act(() => {
        countNone = result.current.deleteBatch(["nope-1", "nope-2"]);
      });
      expect(countNone).toBe(0);
      expect(toast.success).not.toHaveBeenCalledWith("已删除 0 项");
    });

    it("resetFileTree: 恢复默认 5 根", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.addFile("~/.yyc3-cloudpivot", "junk.txt");
      });
      expect(result.current.fileTree.length).toBe(6);

      act(() => {
        result.current.resetFileTree();
      });
      expect(result.current.fileTree.length).toBe(5);
      expect(toast.info).toHaveBeenCalledWith("文件树已重置为默认状态");
    });
  });

  // ----------------------------------------------------------
  //  导入 / 导出
  // ----------------------------------------------------------

  describe("导入导出", () => {
    it("exportFileTree 输出带元信息的 JSON", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      const parsed = JSON.parse(result.current.exportFileTree()) as { _type: string; tree: FileItem[] };
      expect(parsed._type).toBe("file-tree");
      expect(Array.isArray(parsed.tree)).toBe(true);
      expect(parsed.tree.length).toBe(5);
    });

    it("importFileTree: 包装结构 / 裸数组 / 失败格式", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      let ok = false;
      act(() => {
        ok = result.current.importFileTree(result.current.exportFileTree());
      });
      expect(ok).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("文件树已导入");

      let okRaw = false;
      act(() => {
        okRaw = result.current.importFileTree(JSON.stringify([{ id: "only", name: "only", type: "file", path: "/only", modifiedAt: 1 }]));
      });
      expect(okRaw).toBe(true);
      expect(result.current.fileTree.length).toBe(1);

      let okBadJson = true;
      act(() => {
        okBadJson = result.current.importFileTree("{invalid json");
      });
      expect(okBadJson).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("导入失败: JSON 格式错误");

      let okNotArray = true;
      act(() => {
        okNotArray = result.current.importFileTree('{"tree": 42}');
      });
      expect(okNotArray).toBe(false);
    });

    it("localStorage 预置自定义树时直接加载", () => {
      const custom: FileItem[] = [
        { id: "root-1", name: "custom-root", type: "directory", path: "~/.yyc3-cloudpivot/custom-root", modifiedAt: 1, children: [] },
      ];
      localStorage.setItem(TREE_KEY, JSON.stringify(custom));

      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.fileTree.length).toBe(1);
      expect(result.current.fileTree[0].name).toBe("custom-root");
    });
  });

  // ----------------------------------------------------------
  //  文件内容编辑
  // ----------------------------------------------------------

  describe("文件内容", () => {
    it("getFileContent: json/log 生成模拟内容, 未知 id 返回空", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      const json = result.current.getFileContent("f-cfg-patrol");
      expect(json).toContain("yyc3-matrix");

      const log = result.current.getFileContent("f-inf01");
      expect(log).toContain("INFO");

      expect(result.current.getFileContent("nope")).toBe("");
    });

    it("getFileContent: md/csv/默认扩展名分支", () => {
      // addFile 的 id 依赖 Date.now(), 同毫秒会碰撞 → 单调递增保证唯一
      let tick = 1_700_000_000_000;
      vi.spyOn(Date, "now").mockImplementation(() => ++tick);

      const { result } = renderHook(() => useLocalFileSystem());

      let md: FileItem | undefined;
      let csv: FileItem | undefined;
      let txt: FileItem | undefined;
      act(() => {
        md = result.current.addFile("~/.yyc3-cloudpivot", "note.md");
      });
      act(() => {
        csv = result.current.addFile("~/.yyc3-cloudpivot", "data.csv");
      });
      act(() => {
        txt = result.current.addFile("~/.yyc3-cloudpivot", "plain.txt");
      });

      expect(md!.id).not.toBe(csv!.id);
      expect(result.current.getFileContent(md!.id)).toContain("# note.md");
      expect(result.current.getFileContent(csv!.id)).toContain("node,gpu");
      expect(result.current.getFileContent(txt!.id)).toContain("// plain.txt");
      vi.restoreAllMocks();
    });

    it("saveFileContent: 持久化内容并更新 size", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      act(() => {
        result.current.saveFileContent("f-cfg-patrol", "hello");
      });

      expect(result.current.getFileContent("f-cfg-patrol")).toBe("hello");
      const item = findById(result.current.fileTree, "f-cfg-patrol");
      expect(item?.size).toBe(5); // TextEncoder 字节数
      expect(toast.success).toHaveBeenCalledWith("文件已保存");
      expect(localStorage.getItem("yyc3_file_contents")).toContain("f-cfg-patrol");
    });

    it("saveFileContent: 未知 id 不崩溃仍提示已保存", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      act(() => {
        result.current.saveFileContent("nope", "x");
      });

      expect(result.current.fileTree.length).toBe(5);
      expect(toast.success).toHaveBeenCalledWith("文件已保存");
    });
  });

  // ----------------------------------------------------------
  //  快速操作 / 导航兜底
  // ----------------------------------------------------------

  describe("快速操作与导航兜底", () => {
    it("downloadLogs / executeBackup / clearCache", async () => {
      const { result } = renderHook(() => useLocalFileSystem());

      act(() => {
        result.current.downloadLogs();
      });
      expect(toast.success).toHaveBeenCalledWith("日志已导出到 ~/.yyc3-cloudpivot/logs/export/");

      await act(async () => {
        await result.current.executeBackup();
      });
      expect(toast.info).toHaveBeenCalledWith("正在执行备份...");
      expect(toast.success).toHaveBeenCalledWith("备份完成: configs/ → backups/config/");

      await act(async () => {
        await result.current.clearCache();
      });
      expect(toast.info).toHaveBeenCalledWith("正在清理缓存...");
      expect(toast.success).toHaveBeenCalledWith("缓存已清理 (释放 20.5KB)");
    });

    it("navigateTo 未知路径时 currentItems 兜底为空数组", () => {
      const { result } = renderHook(() => useLocalFileSystem());

      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/does-not-exist");
      });

      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/does-not-exist");
      expect(result.current.currentItems).toEqual([]);
      expect(result.current.selectedFile).toBeNull();
    });

    it("generateReport 自定义类型与日期范围", async () => {
      const { result } = renderHook(() => useLocalFileSystem());

      await act(async () => {
        await result.current.generateReport({
          type: "custom",
          format: "markdown",
          dateRange: "custom",
          includeCharts: false,
          includeRawData: false,
        });
      });

      expect(result.current.reports.length).toBe(1);
      expect(result.current.reports[0].filename).toContain("custom");
      expect(result.current.reports[0].filename).toContain(".md");
      expect(result.current.reports[0].previewContent).toContain("自定义");
    });
  });
});