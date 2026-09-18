/**
 * useOperationCenter.ts
 * ======================
 * 操作中心 状态管理 Hook
 * 管理操作分类、快速操作、模板、日志流
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { usePersistedList } from "./usePersistedState";
import type {
  OperationCategoryType,
  OperationCategoryMeta,
  OperationItem,
  OperationTemplateItem,
  OperationLogEntry,
  OperationStatus,
  LogFilterType,
} from "../types";

// ============================================================
// Category Meta
// ============================================================

export const CATEGORY_META: OperationCategoryMeta[] = [
  { key: "node",   label: "节点操作", icon: "Server",   color: "#00d4ff" },
  { key: "model",  label: "模型操作", icon: "Brain",    color: "#aa55ff" },
  { key: "task",   label: "任务操作", icon: "ListTodo", color: "#00ff88" },
  { key: "system", label: "系统操作", icon: "Settings", color: "#ffaa00" },
  { key: "custom", label: "自定义",   icon: "Puzzle",   color: "#ff6699" },
];

// ============================================================
// Mock Quick Actions
// ============================================================

const QUICK_ACTIONS: OperationItem[] = [
  { id: "qa1", category: "node",   label: "重启节点",  description: "重启指定 GPU 计算节点",        icon: "RotateCw",    status: "pending" },
  { id: "qa2", category: "model",  label: "部署模型",  description: "部署新模型到指定节点",          icon: "Upload",      status: "pending" },
  { id: "qa3", category: "system", label: "清理缓存",  description: "清理推理缓存和临时文件",        icon: "Trash2",      status: "pending" },
  { id: "qa4", category: "system", label: "导出日志",  description: "导出系统日志到本地文件",        icon: "Download",    status: "pending" },
  { id: "qa5", category: "system", label: "生成报告",  description: "生成系统性能报告 (JSON/PDF)",   icon: "FileText",    status: "pending" },
  { id: "qa6", category: "node",   label: "批量重启",  description: "批量重启所有异常节点",          icon: "RefreshCw",   status: "pending", dangerous: true },
  { id: "qa7", category: "model",  label: "模型迁移",  description: "将模型迁移到负载更低的节点",     icon: "ArrowRightLeft", status: "pending" },
  { id: "qa8", category: "task",   label: "暂停队列",  description: "暂停推理任务队列",              icon: "Pause",       status: "pending" },
  { id: "qa9", category: "task",   label: "恢复队列",  description: "恢复推理任务队列",              icon: "Play",        status: "pending" },
  { id: "qa10", category: "node",  label: "健康检查",  description: "对所有节点执行健康检查",        icon: "HeartPulse",  status: "pending" },
  { id: "qa11", category: "system",label: "备份配置",  description: "备份当前系统配置到本地",        icon: "HardDrive",   status: "pending" },
  { id: "qa12", category: "custom",label: "自定义脚本",description: "执行自定义运维脚本",           icon: "Terminal",    status: "pending" },
];

// ============================================================
// Mock Templates
// ============================================================

const INITIAL_TEMPLATES: OperationTemplateItem[] = [
  {
    id: "tpl1",
    name: "模型部署标准流程",
    description: "标准模型部署 → 验证 → 上线流程",
    category: "model",
    steps: ["选择目标节点", "上传模型权重", "配置推理参数", "运行冒烟测试", "切换流量"],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lastUsed: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "tpl2",
    name: "节点故障排查流程",
    description: "GPU 节点异常 → 诊断 → 修复 → 验证",
    category: "node",
    steps: ["检查 GPU 温度/显存", "查看错误日志", "重启推理服务", "验证响应延迟", "恢复任务队列"],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    lastUsed: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: "tpl3",
    name: "每日备份任务",
    description: "配置 + 数据库 + 日志定时备份",
    category: "system",
    steps: ["备份 PostgreSQL 数据", "导出系统配置", "压缩日志归档", "上传到 NAS", "清理旧备份"],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastUsed: Date.now() - 12 * 60 * 60 * 1000,
  },
];

// ============================================================
// Mock Log Stream
// ============================================================

function generateMockLogs(): OperationLogEntry[] {
  const actions = [
    { category: "node" as const,   action: "重启节点 GPU-A100-03",     user: "admin" },
    { category: "model" as const,  action: "部署 LLaMA-70B 到 GPU-H100-01", user: "dev_yang" },
    { category: "system" as const, action: "清理推理缓存",             user: "admin" },
    { category: "task" as const,   action: "暂停推理队列 #847",        user: "admin" },
    { category: "model" as const,  action: "更新 DeepSeek-V3 参数",   user: "dev_li" },
    { category: "node" as const,   action: "健康检查 全节点",          user: "system" },
    { category: "system" as const, action: "导出日志 2025-02-24",      user: "admin" },
    { category: "system" as const, action: "备份 PostgreSQL",          user: "system" },
    { category: "task" as const,   action: "恢复推理队列",             user: "admin" },
    { category: "custom" as const, action: "执行自定义脚本 cleanup.sh",user: "dev_yang" },
    { category: "node" as const,   action: "GPU-A100-01 温度告警检查", user: "system" },
    { category: "model" as const,  action: "模型冒烟测试 Qwen-72B",   user: "dev_li" },
  ];

  const statuses: OperationStatus[] = ["success", "success", "success", "success", "failed", "running"];

  return actions.map((a, i) => ({
    id: `log-${1000 + i}`,
    timestamp: Date.now() - i * 8 * 60 * 1000 - Math.random() * 5 * 60 * 1000,
    category: a.category,
    action: a.action,
    user: a.user,
    status: statuses[i % statuses.length],
    duration: 200 + Math.floor(Math.random() * 3000),
  }));
}

// ============================================================
// Hook
// ============================================================

export function useOperationCenter() {
  const [activeCategory, setActiveCategory] = useState<OperationCategoryType | "all">("all");
  const [actions, setActions] = useState<OperationItem[]>(QUICK_ACTIONS);
  const {
    items: templates,
    upsert: upsertTemplate,
    remove: removeTemplate,
    loaded: templatesLoaded,
  } = usePersistedList<OperationTemplateItem>("operationTemplates", INITIAL_TEMPLATES);
  const {
    items: logs,
    prepend: prependLog,
    loaded: logsLoaded,
  } = usePersistedList<OperationLogEntry>("operationLogs", generateMockLogs());
  const [logFilter, setLogFilter] = useState<LogFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  // Filtered actions
  const filteredActions = activeCategory === "all"
    ? actions
    : actions.filter((a) => a.category === activeCategory);

  // Filtered logs
  const filteredLogs = (() => {
    let result = logs;
    if (logFilter === "byCategory" && activeCategory !== "all") {
      result = result.filter((l) => l.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) => l.action.toLowerCase().includes(q) || l.user.toLowerCase().includes(q)
      );
    }
    return result;
  })();

  // Execute an action
  const executeAction = useCallback(async (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;

    setIsExecuting(actionId);
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "running" as const } : a))
    );

    // Simulate execution
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));

    const success = Math.random() > 0.15;
    const finalStatus: OperationStatus = success ? "success" : "failed";

    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: finalStatus } : a))
    );

    // Add log entry
    const newLog: OperationLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      category: action.category,
      action: action.label,
      user: "admin",
      status: finalStatus,
      duration: 1500 + Math.floor(Math.random() * 2000),
    };
    await prependLog(newLog);
    setIsExecuting(null);

    if (success) {
      toast.success(`${action.label} 执行成功`);
    } else {
      toast.error(`${action.label} 执行失败`, { description: "请检查日志获取详情" });
    }

    // Reset status after 3s
    setTimeout(() => {
      setActions((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: "pending" as const } : a))
      );
    }, 3000);
  }, [actions, prependLog]);

  // Run template
  const runTemplate = useCallback(async (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    await upsertTemplate({ ...tpl, lastUsed: Date.now() });

    toast.info(`正在执行模板：${tpl.name}`, { description: `共 ${tpl.steps.length} 步` });

    // Simulate execution
    for (let i = 0; i < tpl.steps.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const log: OperationLogEntry = {
        id: `log-tpl-${Date.now()}-${i}`,
        timestamp: Date.now(),
        category: tpl.category,
        action: `[${tpl.name}] ${tpl.steps[i]}`,
        user: "admin",
        status: "success",
        duration: 500 + Math.floor(Math.random() * 1500),
      };
      await prependLog(log);
    }

    toast.success(`模板「${tpl.name}」执行完成`);
  }, [templates, upsertTemplate, prependLog]);

  // Add new template
  const addTemplate = useCallback((name: string, description: string, category: OperationCategoryType, steps: string[]) => {
    const newTpl: OperationTemplateItem = {
      id: `tpl-${Date.now()}`,
      name,
      description,
      category,
      steps,
      createdAt: Date.now(),
    };
    upsertTemplate(newTpl);
    toast.success(`模板「${name}」已创建`);
  }, [upsertTemplate]);

  // Delete template
  const deleteTemplate = useCallback((templateId: string) => {
    removeTemplate(templateId);
    toast.info("模板已删除");
  }, [removeTemplate]);

  return {
    // Category
    categories: CATEGORY_META,
    activeCategory,
    setActiveCategory,
    // Actions
    actions: filteredActions,
    allActions: actions,
    isExecuting,
    executeAction,
    // Templates
    templates,
    templatesLoaded,
    runTemplate,
    addTemplate,
    deleteTemplate,
    // Logs
    logs: filteredLogs,
    allLogs: logs,
    logsLoaded,
    logFilter,
    setLogFilter,
    searchQuery,
    setSearchQuery,
  };
}