/**
 * useLocalFileSystem.ts
 * ======================
 * 本地文件系统模拟 Hook — localStorage CRUD 版
 *
 * 模拟 ~/.yyc3-cloudpivot/ 目录结构
 * 管理文件浏览、日志查看、报告生成
 *
 * Phase-3: 文件树增删改 + localStorage 持久化
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { env } from "../lib/env-config";
import type {
  FileItem,
  LogEntry,
  LogLevel,
  ReportConfig,
  ReportResult,
  ReportType,
  ReportFormat,
} from "../types";

// ============================================================
// Storage
// ============================================================

const STORAGE_KEY = "yyc3_file_tree";
const LOGS_STORAGE_KEY = "yyc3_mock_logs";
const FILE_CONTENT_KEY = "yyc3_file_contents";

// ============================================================
// 默认文件树 (首次初始化)
// ============================================================

const now = Date.now();
const h = (hrs: number) => now - hrs * 3600000;
const d = (days: number) => now - days * 86400000;

const DEFAULT_FILE_TREE: FileItem[] = [
  {
    id: "d-logs", name: "logs", type: "directory", path: "~/.yyc3-cloudpivot/logs", modifiedAt: h(0.5),
    children: [
      {
        id: "d-logs-node", name: "node", type: "directory", path: "~/.yyc3-cloudpivot/logs/node", modifiedAt: h(0.5),
        children: [
          {
            id: "d-gpu01", name: "GPU-A100-01", type: "directory", path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-01", modifiedAt: h(1),
            children: [
              { id: "f-inf01",  name: "inference.log", type: "file", size: 2400000, path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-01/inference.log", extension: "log", modifiedAt: h(0.03) },
              { id: "f-err01",  name: "error.log",     type: "file", size: 85000,   path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-01/error.log",     extension: "log", modifiedAt: h(2) },
              { id: "f-met01",  name: "metrics.json",   type: "file", size: 320000,  path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-01/metrics.json",  extension: "json", modifiedAt: h(0.25) },
            ],
          },
          {
            id: "d-gpu03", name: "GPU-A100-03", type: "directory", path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-03", modifiedAt: h(0.1),
            children: [
              { id: "f-inf03",  name: "inference.log", type: "file", size: 3800000, path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-03/inference.log", extension: "log", modifiedAt: h(0.02) },
              { id: "f-err03",  name: "error.log",     type: "file", size: 540000,  path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-03/error.log",     extension: "log", modifiedAt: h(0.1) },
              { id: "f-met03",  name: "metrics.json",   type: "file", size: 290000,  path: "~/.yyc3-cloudpivot/logs/node/GPU-A100-03/metrics.json",  extension: "json", modifiedAt: h(0.2) },
            ],
          },
        ],
      },
      {
        id: "d-logs-sys", name: "system", type: "directory", path: "~/.yyc3-cloudpivot/logs/system", modifiedAt: h(0.5),
        children: [
          { id: "f-app-log",  name: "app.log",          type: "file", size: 1200000, path: "~/.yyc3-cloudpivot/logs/system/app.log",          extension: "log",  modifiedAt: h(0.01) },
          { id: "f-perf-json",name: "performance.json",  type: "file", size: 890000,  path: "~/.yyc3-cloudpivot/logs/system/performance.json", extension: "json", modifiedAt: h(0.5) },
        ],
      },
    ],
  },
  {
    id: "d-reports", name: "reports", type: "directory", path: "~/.yyc3-cloudpivot/reports", modifiedAt: d(1),
    children: [
      {
        id: "d-daily", name: "daily", type: "directory", path: "~/.yyc3-cloudpivot/reports/daily", modifiedAt: d(0),
        children: [
          { id: "f-r0225", name: "2026-02-25.json", type: "file", size: 156000, path: "~/.yyc3-cloudpivot/reports/daily/2026-02-25.json", extension: "json", modifiedAt: h(1) },
          { id: "f-r0224", name: "2026-02-24.json", type: "file", size: 148000, path: "~/.yyc3-cloudpivot/reports/daily/2026-02-24.json", extension: "json", modifiedAt: d(1) },
          { id: "f-r0223", name: "2026-02-23.json", type: "file", size: 162000, path: "~/.yyc3-cloudpivot/reports/daily/2026-02-23.json", extension: "json", modifiedAt: d(2) },
        ],
      },
      {
        id: "d-weekly", name: "weekly", type: "directory", path: "~/.yyc3-cloudpivot/reports/weekly", modifiedAt: d(3),
        children: [
          { id: "f-rw08", name: "week-08-2026.json", type: "file", size: 520000, path: "~/.yyc3-cloudpivot/reports/weekly/week-08-2026.json", extension: "json", modifiedAt: d(3) },
        ],
      },
    ],
  },
  {
    id: "d-backups", name: "backups", type: "directory", path: "~/.yyc3-cloudpivot/backups", modifiedAt: d(1),
    children: [
      { id: "d-bk-nodes",  name: "nodes",  type: "directory", path: "~/.yyc3-cloudpivot/backups/nodes",  modifiedAt: d(1) },
      { id: "d-bk-models", name: "models", type: "directory", path: "~/.yyc3-cloudpivot/backups/models", modifiedAt: d(2) },
      { id: "d-bk-config", name: "config", type: "directory", path: "~/.yyc3-cloudpivot/backups/config", modifiedAt: d(0.5) },
    ],
  },
  {
    id: "d-configs", name: "configs", type: "directory", path: "~/.yyc3-cloudpivot/configs", modifiedAt: d(3),
    children: [
      { id: "f-cfg-patrol", name: "patrol.json",    type: "file", size: 2400, path: "~/.yyc3-cloudpivot/configs/patrol.json",    extension: "json", modifiedAt: d(1) },
      { id: "f-cfg-alerts", name: "alerts.json",    type: "file", size: 4800, path: "~/.yyc3-cloudpivot/configs/alerts.json",    extension: "json", modifiedAt: d(2) },
      { id: "f-cfg-tpl",    name: "templates.json", type: "file", size: 8200, path: "~/.yyc3-cloudpivot/configs/templates.json", extension: "json", modifiedAt: d(3) },
    ],
  },
  {
    id: "d-cache", name: "cache", type: "directory", path: "~/.yyc3-cloudpivot/cache", modifiedAt: h(2),
    children: [
      {
        id: "d-cache-q", name: "queries", type: "directory", path: "~/.yyc3-cloudpivot/cache/queries", modifiedAt: h(2),
        children: [
          { id: "f-cache1", name: "q-a8f3e2.json", type: "file", size: 12000, path: "~/.yyc3-cloudpivot/cache/queries/q-a8f3e2.json", extension: "json", modifiedAt: h(2) },
          { id: "f-cache2", name: "q-c7d1b4.json", type: "file", size: 8500,  path: "~/.yyc3-cloudpivot/cache/queries/q-c7d1b4.json", extension: "json", modifiedAt: h(4) },
        ],
      },
    ],
  },
];

// ============================================================
// localStorage 持久化工具
// ============================================================

function loadFileTree(): FileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults = JSON.parse(JSON.stringify(DEFAULT_FILE_TREE));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch { /* ignore */ }
  return defaults;
}

function saveFileTree(tree: FileItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); } catch { /* ignore */ }
}

// ============================================================
// 树操作工具
// ============================================================

function findParent(tree: FileItem[], targetId: string): FileItem | null {
  for (const item of tree) {
    if (item.children?.some((c) => c.id === targetId)) return item;
    if (item.children) {
      const found = findParent(item.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function findItem(tree: FileItem[], id: string): FileItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItem(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeItem(tree: FileItem[], id: string): boolean {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) { tree.splice(i, 1); return true; }
    if (tree[i].children && removeItem(tree[i].children!, id)) return true;
  }
  return false;
}

// ============================================================
// Mock 日志
// ============================================================

function generateMockLogs(count: number = 50): LogEntry[] {
  const sources = ["GPU-A100-01", "GPU-A100-03", "GPU-H100-01", "system", "scheduler", "db-sync"];
  const messages: Array<{ level: LogLevel; msg: string }> = [
    { level: "info",  msg: "推理任务完成 #12847, 延迟 820ms" },
    { level: "info",  msg: "模型缓存命中 LLaMA-70B, 跳过加载" },
    { level: "warn",  msg: "GPU 温度接近阈值 78°C > 75°C" },
    { level: "error", msg: "推理超时 task #12853, 超过 5000ms" },
    { level: "info",  msg: "批次处理完成 batch_size=32, tokens=4096" },
    { level: "warn",  msg: "内存使用率 89%, 建议清理缓存" },
    { level: "debug", msg: "WebSocket 心跳 ack, 延迟 12ms" },
    { level: "info",  msg: "自动巡查完成, 健康度 96%" },
    { level: "error", msg: "数据库连接超时, 重试 1/3" },
    { level: "fatal", msg: "GPU 驱动崩溃, 节点进入降级模式" },
    { level: "info",  msg: "配置热更新完成 patrol.interval=15" },
    { level: "warn",  msg: "存储空间 85.8%, 接近告警阈值" },
    { level: "info",  msg: "NAS 备份已完成 12.8GB → 192.168.3.200" },
    { level: "debug", msg: "推理队列长度 3, 平均等待 45ms" },
    { level: "info",  msg: "Token 吞吐率 138K/s, 近 1h 稳定" },
  ];

  return Array.from({ length: count }, (_, i) => {
    const m = messages[i % messages.length];
    return {
      id: `log-${i}`,
      timestamp: now - i * 120000 - Math.random() * 60000,
      level: m.level,
      source: sources[i % sources.length],
      message: m.msg,
    };
  });
}

// ============================================================
// 报告生成模拟
// ============================================================

function generateReportPreview(config: ReportConfig): string {
  const sysName = env("SYSTEM_NAME");
  const typeLabel = { performance: "性能", health: "健康", security: "安全", custom: "自定义" }[config.type];
  const dateLabel = { today: "今日", week: "本周", month: "本月", custom: "自定义" }[config.dateRange];

  if (config.format === "json") {
    return JSON.stringify({
      report: { type: config.type, dateRange: config.dateRange, generatedAt: new Date().toISOString(), system: sysName },
      summary: {
        nodeHealth: "96%", avgGpuUtil: "82.4%", avgLatency: "48ms",
        totalInferences: 128456, successRate: "99.2%", alerts: 5,
      },
      nodes: [
        { id: "GPU-A100-01", gpu: 72, mem: 65, temp: 45, status: "active" },
        { id: "GPU-A100-03", gpu: 91, mem: 89, temp: 78, status: "warning" },
      ],
    }, null, 2);
  }

  if (config.format === "markdown") {
    return `# ${sysName} ${typeLabel}报告\n\n> 范围: ${dateLabel} | 生成时间: ${new Date().toLocaleString("zh-CN")}\n\n## 概览\n\n| 指标 | 值 |\n|------|------|\n| 节点健康度 | 96% |\n| GPU 利用率 | 82.4% |\n| 平均延迟 | 48ms |\n| 推理总数 | 128,456 |\n| 成功率 | 99.2% |\n| 活跃告警 | 5 |\n\n## 节点状态\n\n- ✅ GPU-A100-01: GPU 72%, 45°C\n- ⚠️ GPU-A100-03: GPU 91%, 78°C (延迟异常)\n- ✅ GPU-H100-01: GPU 55%, 41°C\n`;
  }

  return `type,dateRange,nodeHealth,avgGpuUtil,avgLatency,totalInferences,successRate\n${config.type},${config.dateRange},96%,82.4%,48ms,128456,99.2%\nnode,gpu,mem,temp,status\nGPU-A100-01,72,65,45,active\nGPU-A100-03,91,89,78,warning\nGPU-H100-01,55,48,41,active`;
}

// ============================================================
// Hook
// ============================================================

export function useLocalFileSystem() {
  const [fileTree, setFileTree] = useState<FileItem[]>(() => loadFileTree());
  const [currentPath, setCurrentPath] = useState<string>("~/.yyc3-cloudpivot");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [logs] = useState<LogEntry[]>(() => generateMockLogs(50));
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | "all">("all");
  const [logSourceFilter, setLogSourceFilter] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 持久化辅助
  const persistTree = useCallback((tree: FileItem[]) => {
    setFileTree(tree);
    saveFileTree(tree);
  }, []);

  // ═══ CRUD 操作 ═══

  /** 新增文件 */
  const addFile = useCallback((parentPath: string, name: string, ext?: string) => {
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];
    const parent = parentPath === "~/.yyc3-cloudpivot"
      ? { children: tree } as FileItem
      : findItem(tree, "") || null;

    // 查找父目录
    function findByPath(items: FileItem[], p: string): FileItem | null {
      for (const item of items) {
        if (item.path === p && item.type === "directory") return item;
        if (item.children) {
          const found = findByPath(item.children, p);
          if (found) return found;
        }
      }
      return null;
    }

    const target = parentPath === "~/.yyc3-cloudpivot"
      ? null
      : findByPath(tree, parentPath);

    const newFile: FileItem = {
      id: `f-${Date.now()}`,
      name,
      type: "file",
      size: 0,
      path: `${parentPath}/${name}`,
      extension: ext || name.split(".").pop() || "",
      modifiedAt: Date.now(),
    };

    if (target) {
      if (!target.children) target.children = [];
      target.children.push(newFile);
    } else {
      tree.push(newFile);
    }

    persistTree(tree);
    toast.success(`文件已创建: ${name}`);
    return newFile;
  }, [fileTree, persistTree]);

  /** 新增目录 */
  const addDirectory = useCallback((parentPath: string, name: string) => {
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];

    function findByPath(items: FileItem[], p: string): FileItem | null {
      for (const item of items) {
        if (item.path === p && item.type === "directory") return item;
        if (item.children) {
          const found = findByPath(item.children, p);
          if (found) return found;
        }
      }
      return null;
    }

    const target = parentPath === "~/.yyc3-cloudpivot" ? null : findByPath(tree, parentPath);

    const newDir: FileItem = {
      id: `d-${Date.now()}`,
      name,
      type: "directory",
      path: `${parentPath}/${name}`,
      modifiedAt: Date.now(),
      children: [],
    };

    if (target) {
      if (!target.children) target.children = [];
      target.children.push(newDir);
    } else {
      tree.push(newDir);
    }

    persistTree(tree);
    toast.success(`目录已创建: ${name}`);
    return newDir;
  }, [fileTree, persistTree]);

  /** 重命名 */
  const renameItem = useCallback((id: string, newName: string) => {
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];
    const item = findItem(tree, id);
    if (!item) return false;

    const oldPath = item.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
    item.name = newName;
    item.path = `${parentPath}/${newName}`;
    item.modifiedAt = Date.now();
    if (item.type === "file") {
      item.extension = newName.split(".").pop() || "";
    }

    persistTree(tree);
    toast.success(`已重命名为: ${newName}`);
    return true;
  }, [fileTree, persistTree]);

  /** 删除 */
  const deleteItem = useCallback((id: string) => {
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];
    const success = removeItem(tree, id);
    if (success) {
      persistTree(tree);
      toast.success("已删除");
    }
    return success;
  }, [fileTree, persistTree]);

  /** 批量删除 */
  const deleteBatch = useCallback((ids: string[]) => {
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];
    let count = 0;
    for (const id of ids) {
      if (removeItem(tree, id)) count++;
    }
    if (count > 0) {
      persistTree(tree);
      toast.success(`已删除 ${count} 项`);
    }
    return count;
  }, [fileTree, persistTree]);

  /** 重置文件树 */
  const resetFileTree = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_FILE_TREE));
    persistTree(defaults);
    toast.info("文件树已重置为默认状态");
  }, [persistTree]);

  /** 导出文件树 */
  const exportFileTree = useCallback(() => {
    return JSON.stringify({ _type: "file-tree", _exportedAt: new Date().toISOString(), tree: fileTree }, null, 2);
  }, [fileTree]);

  /** 导入文件树 */
  const importFileTree = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      const tree = data.tree || data;
      if (Array.isArray(tree)) {
        persistTree(tree);
        toast.success("文件树已导入");
        return true;
      }
    } catch { /* ignore */ }
    toast.error("导入失败: JSON 格式错误");
    return false;
  }, [persistTree]);

  // ═══ 导航 ═══

  const currentItems = useMemo(() => {
    function findDir(items: FileItem[], path: string): FileItem[] | null {
      if (path === "~/.yyc3-cloudpivot") return items;
      for (const item of items) {
        if (item.path === path && item.type === "directory") return item.children ?? [];
        if (item.children) {
          const found = findDir(item.children, path);
          if (found) return found;
        }
      }
      return null;
    }
    return findDir(fileTree, currentPath) ?? [];
  }, [fileTree, currentPath]);

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.replace("~/.yyc3-cloudpivot", "").split("/").filter(Boolean);
    const crumbs = [{ label: "~/.yyc3-cloudpivot", path: "~/.yyc3-cloudpivot" }];
    let acc = "~/.yyc3-cloudpivot";
    for (const p of parts) {
      acc += `/${p}`;
      crumbs.push({ label: p, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  }, []);

  const selectFile = useCallback((file: FileItem) => {
    if (file.type === "directory") {
      navigateTo(file.path);
    } else {
      setSelectedFile(file);
    }
  }, [navigateTo]);

  const goUp = useCallback(() => {
    if (currentPath === "~/.yyc3-cloudpivot") return;
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
    setSelectedFile(null);
  }, [currentPath]);

  // ═══ 日志 ═══

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (logLevelFilter !== "all") result = result.filter((l) => l.level === logLevelFilter);
    if (logSourceFilter !== "all") result = result.filter((l) => l.source === logSourceFilter);
    if (logSearchQuery) {
      const q = logSearchQuery.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q));
    }
    return result;
  }, [logs, logLevelFilter, logSourceFilter, logSearchQuery]);

  const logSources = useMemo(() => Array.from(new Set(logs.map((l) => l.source))), [logs]);

  // ═══ 报告 ═══

  const generateReport = useCallback(async (config: ReportConfig) => {
    setIsGenerating(true);
    toast.info("正在生成报告...");
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const preview = generateReportPreview(config);
    const typeLabel = { performance: "性能", health: "健康", security: "安全", custom: "自定义" }[config.type];
    const extMap: Record<ReportFormat, string> = { json: "json", markdown: "md", csv: "csv" };

    const report: ReportResult = {
      id: `rpt-${Date.now()}`,
      config,
      generatedAt: Date.now(),
      filename: `yyc3-${config.type}-${new Date().toISOString().slice(0, 10)}.${extMap[config.format]}`,
      size: new TextEncoder().encode(preview).length,
      previewContent: preview,
    };

    setReports((prev) => [report, ...prev]);
    setIsGenerating(false);
    toast.success(`${typeLabel}报告已生成`);
    return report;
  }, []);

  const formatSize = useCallback((bytes?: number): string => {
    if (bytes == null) return "--";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  }, []);

  const downloadLogs = useCallback(() => toast.success("日志已导出到 ~/.yyc3-cloudpivot/logs/export/"), []);
  const executeBackup = useCallback(async () => {
    toast.info("正在执行备份...");
    await new Promise((r) => setTimeout(r, 2000));
    toast.success("备份完成: configs/ → backups/config/");
  }, []);
  const clearCache = useCallback(async () => {
    toast.info("正在清理缓存...");
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("缓存已清理 (释放 20.5KB)");
  }, []);

  // ═══ 文件内容编辑 ═══
  const getFileContent = useCallback((fileId: string): string => {
    try {
      const raw = localStorage.getItem(FILE_CONTENT_KEY);
      const contents = raw ? JSON.parse(raw) : {};
      if (contents[fileId]) return contents[fileId];
    } catch { /* ignore */ }
    // 生成模拟内容
    const file = findItem(fileTree, fileId);
    if (!file) return "";
    if (file.extension === "json") return JSON.stringify({ system: "yyc3-matrix", node: file.name, status: "active", timestamp: new Date().toISOString(), metrics: { gpu: 72, mem: 65, temp: 45 } }, null, 2);
    if (file.extension === "log") return `[${new Date().toISOString()}] INFO  系统启动完成\n[${new Date().toISOString()}] INFO  模型加载 LLaMA-70B\n[${new Date().toISOString()}] INFO  推理服务就绪\n[${new Date().toISOString()}] WARN  GPU温度接近阈值\n[${new Date().toISOString()}] INFO  任务 #12847 完成`;
    if (file.extension === "md") return `# ${file.name}\n\nYYC³ CloudPivot 文档\n`;
    if (file.extension === "csv") return `node,gpu,mem,temp,status\nGPU-A100-01,72,65,45,active\nGPU-A100-03,91,89,78,warning`;
    return `// ${file.name}\n// Auto-generated content`;
  }, [fileTree]);

  const saveFileContent = useCallback((fileId: string, content: string) => {
    try {
      const raw = localStorage.getItem(FILE_CONTENT_KEY);
      const contents = raw ? JSON.parse(raw) : {};
      contents[fileId] = content;
      localStorage.setItem(FILE_CONTENT_KEY, JSON.stringify(contents));
    } catch { /* ignore */ }
    // 更新 size 和 modifiedAt
    const tree = JSON.parse(JSON.stringify(fileTree)) as FileItem[];
    const item = findItem(tree, fileId);
    if (item) {
      item.size = new TextEncoder().encode(content).length;
      item.modifiedAt = Date.now();
      persistTree(tree);
    }
    toast.success("文件已保存");
  }, [fileTree, persistTree]);

  return {
    fileTree, currentPath, currentItems, breadcrumbs, selectedFile,
    navigateTo, selectFile, goUp, formatSize,
    // CRUD
    addFile, addDirectory, renameItem, deleteItem, deleteBatch,
    resetFileTree, exportFileTree, importFileTree,
    // 文件内容
    getFileContent, saveFileContent,
    // 日志
    logs: filteredLogs, allLogs: logs,
    logLevelFilter, setLogLevelFilter,
    logSourceFilter, setLogSourceFilter,
    logSearchQuery, setLogSearchQuery, logSources,
    // 报告
    reports, isGenerating, generateReport,
    // 快速操作
    downloadLogs, executeBackup, clearCache,
  };
}