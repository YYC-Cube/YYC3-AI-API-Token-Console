/**
 * useFollowUp.ts
 * ===============
 * 一键跟进系统 状态管理 Hook
 * 管理告警列表、抽屉面板开关、快速操作回调
 * Phase-3: localStorage 持久化 + CRUD
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createLocalStore } from "../lib/create-local-store";
import type { FollowUpItem, FollowUpStatus } from "../types";

// ============================================================
// 默认告警数据 (首次初始化)
// ============================================================

const DEFAULT_FOLLOW_UPS: FollowUpItem[] = [
  {
    id: "AL-0032",
    severity: "critical",
    title: "GPU-A100-03 推理延迟异常",
    source: "GPU-A100-03",
    metric: "2,450ms > 2,000ms (阈值)",
    status: "active",
    timestamp: Date.now() - 5 * 60 * 1000,
    assignee: "admin",
    tags: ["推理延迟", "A100", "LLaMA-70B"],
    relatedAlerts: ["AL-0030", "AL-0028"],
    chain: [
      { id: "c1", time: "10:23:45", type: "model_load", label: "模型加载 LLaMA-70B", detail: "节点: GPU-A100-03 · 显存分配 68GB" },
      { id: "c2", time: "10:24:12", type: "task_start", label: "推理任务启动", detail: "任务: #12847 · Batch Size: 32" },
      { id: "c3", time: "10:24:15", type: "alert_trigger", label: "延迟异常告警", detail: "告警: #AL-0032 · 延迟 2,450ms > 阈值 2,000ms", isCurrent: true },
      { id: "c4", time: "10:24:30", type: "auto_action", label: "系统自动降频", detail: "操作: auto_scale_down · 降低 Batch Size 至 16" },
    ],
  },
  {
    id: "AL-0031",
    severity: "error",
    title: "GPU-H100-02 显存不足告警",
    source: "GPU-H100-02",
    metric: "78.5 GB / 80 GB (98.1%)",
    status: "investigating",
    timestamp: Date.now() - 18 * 60 * 1000,
    assignee: "ops_bot",
    tags: ["显存", "H100", "DeepSeek-V3"],
    relatedAlerts: ["AL-0029"],
    chain: [
      { id: "c5", time: "10:06:20", type: "model_load", label: "模型加载 DeepSeek-V3", detail: "节点: GPU-H100-02 · 权重 72GB" },
      { id: "c6", time: "10:08:45", type: "task_start", label: "推理队列启动", detail: "并发: 8 · KV-Cache 动态扩展" },
      { id: "c7", time: "10:12:30", type: "system_event", label: "显存使用达到 90%", detail: "触发垃圾回收 · 释放 2.1GB" },
      { id: "c8", time: "10:18:05", type: "alert_trigger", label: "显存不足告警", detail: "显存 98.1% · OOM 风险", isCurrent: true },
      { id: "c9", time: "10:18:30", type: "auto_action", label: "自动拒绝新任务", detail: "队列暂停 · 等待释放" },
    ],
  },
  {
    id: "AL-0030",
    severity: "warning",
    title: "存储空间接近阈值",
    source: "NAS-Storage-01",
    metric: "41.2 TB / 48 TB (85.8%)",
    status: "active",
    timestamp: Date.now() - 45 * 60 * 1000,
    tags: ["存储", "NAS", "磁盘"],
    chain: [
      { id: "c10", time: "09:35:00", type: "system_event", label: "存储使用达到 80%", detail: "NAS-Storage-01 · 预警阈值" },
      { id: "c11", time: "09:50:00", type: "system_event", label: "大文件写入检测", detail: "模型检查点 4.8GB · /models/checkpoints/" },
      { id: "c12", time: "10:00:15", type: "alert_trigger", label: "存储预警", detail: "存储 85.8% · 超过 85% 阈值", isCurrent: true },
    ],
  },
  {
    id: "AL-0029",
    severity: "warning",
    title: "网络延迟波动",
    source: "Switch-Core-01",
    metric: "平均 45ms · 5 节点 >100ms",
    status: "investigating",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    assignee: "admin",
    tags: ["网络", "延迟", "交换机"],
    chain: [
      { id: "c13", time: "08:15:00", type: "system_event", label: "网络延迟基线偏移", detail: "平均延迟从 12ms 升至 35ms" },
      { id: "c14", time: "08:30:00", type: "alert_trigger", label: "延迟告警", detail: "5 个节点延迟 >100ms", isCurrent: true },
      { id: "c15", time: "08:32:00", type: "manual_action", label: "手动排查", detail: "检查交换机端口状态" },
    ],
  },
  {
    id: "AL-0026",
    severity: "info",
    title: "模型自动更新完成",
    source: "GPU-A100-01",
    metric: "Qwen-72B v2.1 → v2.2",
    status: "resolved",
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    tags: ["模型更新", "Qwen"],
    chain: [
      { id: "c16", time: "04:00:00", type: "system_event", label: "定时更新触发", detail: "计划任务: model_auto_update" },
      { id: "c17", time: "04:02:30", type: "model_load", label: "下载新版权重", detail: "Qwen-72B v2.2 · 68.5GB" },
      { id: "c18", time: "04:15:00", type: "auto_action", label: "热切换完成", detail: "零停机切换 · 回滚点保留" },
      { id: "c19", time: "04:15:30", type: "resolved", label: "更新完成", detail: "推理验证通过 · 延迟 -5ms" },
    ],
  },
];

// ============================================================
// localStorage Store
// ============================================================

const followUpStore = createLocalStore<FollowUpItem>("yyc3_follow_ups", DEFAULT_FOLLOW_UPS, "AL");

// ============================================================
// Hook
// ============================================================

export function useFollowUp() {
  const [items, setItems] = useState<FollowUpItem[]>(() => followUpStore.getAll());
  const [drawerItem, setDrawerItem] = useState<FollowUpItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"all" | FollowUpItem["severity"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | FollowUpItem["status"]>("all");

  const openDrawer = useCallback((item: FollowUpItem) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Delay clearing item for animation
    setTimeout(() => setDrawerItem(null), 300);
  }, []);

  const quickFix = useCallback((item: FollowUpItem) => {
    toast.success(`正在执行一键修复: ${item.title}`, {
      description: `来源: ${item.source}`,
    });
    // Simulate fix: change status to investigating
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: "investigating" as FollowUpStatus } : i
      )
    );
  }, []);

  const markResolved = useCallback((item: FollowUpItem) => {
    toast.success(`已标记为已解决: ${item.title}`);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: "resolved" as FollowUpStatus } : i
      )
    );
    closeDrawer();
  }, [closeDrawer]);

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (filterSeverity !== "all" && item.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    critical: items.filter((i) => i.severity === "critical").length,
    error: items.filter((i) => i.severity === "error").length,
    warning: items.filter((i) => i.severity === "warning").length,
    active: items.filter((i) => i.status === "active").length,
    investigating: items.filter((i) => i.status === "investigating").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };

  return {
    items: filteredItems,
    allItems: items,
    stats,
    drawerItem,
    drawerOpen,
    filterSeverity,
    filterStatus,
    setFilterSeverity,
    setFilterStatus,
    openDrawer,
    closeDrawer,
    quickFix,
    markResolved,
  };
}