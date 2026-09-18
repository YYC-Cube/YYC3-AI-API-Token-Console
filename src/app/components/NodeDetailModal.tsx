import React, { useState } from "react";
import { X, Cpu, Thermometer, HardDrive, Activity, Clock, Server, Check, AlertTriangle, FileText, RotateCcw, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { toast } from "sonner";
import type { NodeData } from "../types";

interface NodeDetailModalProps {
  node: NodeData;
  onClose: () => void;
  onNodeRemoved?: (nodeId: string) => void;
}

const historyData = [
  { time: "12:00", gpu: 72, mem: 58, temp: 60 },
  { time: "12:30", gpu: 78, mem: 62, temp: 63 },
  { time: "13:00", gpu: 85, mem: 70, temp: 66 },
  { time: "13:30", gpu: 82, mem: 68, temp: 65 },
  { time: "14:00", gpu: 90, mem: 75, temp: 70 },
  { time: "14:30", gpu: 87, mem: 72, temp: 68 },
];

const tooltipStyle = {
  backgroundColor: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 180, 255, 0.3)",
  borderRadius: "8px",
  color: "#e0f0ff",
  fontSize: "0.7rem",
  fontFamily: "'Rajdhani', sans-serif",
};

const toastStyle = {
  background: "rgba(8,25,55,0.95)",
  border: "1px solid rgba(0,180,255,0.3)",
  color: "#e0f0ff",
};

// 模拟日志数据
const MOCK_LOGS = [
  "[14:30:12] INFO  推理任务 #12847 完成，耗时 1.2s",
  "[14:29:45] INFO  模型 LLaMA-70B 权重加载完成",
  "[14:28:30] WARN  GPU 温度升高至 72°C",
  "[14:27:15] INFO  推理任务 #12846 开始",
  "[14:26:00] INFO  KV-Cache 命中率 94.2%",
  "[14:25:30] DEBUG 批处理队列长度: 8",
];

export function NodeDetailModal({ node, onClose, onNodeRemoved }: NodeDetailModalProps) {
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // ── 查看日志 ──
  const handleViewLogs = () => {
    setShowLogs(!showLogs);
    setRestartConfirm(false);
    setRemoveConfirm(false);
  };

  // ── 重启节点 ──
  const handleRestartClick = () => {
    setRestartConfirm(true);
    setRemoveConfirm(false);
    setShowLogs(false);
  };

  const handleRestartConfirm = () => {
    setRestarting(true);
    setRestartConfirm(false);
    toast.success(`节点 ${node.id} 重启指令已发送`, {
      description: "预计 30 秒内完成重启",
      style: toastStyle,
    });
    // 模拟重启过程
    setTimeout(() => {
      setRestarting(false);
      toast.success(`节点 ${node.id} 重启完成`, {
        description: "节点已恢复在线",
        style: toastStyle,
      });
    }, 2000);
  };

  // ── 移除节点 ──
  const handleRemoveClick = () => {
    setRemoveConfirm(true);
    setRestartConfirm(false);
    setShowLogs(false);
  };

  const handleRemoveConfirm = () => {
    toast.success(`节点 ${node.id} 已从集群移除`, {
      description: "相关任务已迁移到其他节点",
      style: toastStyle,
    });
    onNodeRemoved?.(node.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-0" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[600px] max-h-[85vh] overflow-auto rounded-2xl bg-[rgba(8,25,55,0.9)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.1)] p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
              <Server className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div>
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>{node.id}</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  node.status === "active" ? "bg-[#00ff88]" :
                  node.status === "warning" ? "bg-[#ffdd00]" : "bg-[#ff3366]"
                }`} />
                <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>
                  {node.status === "active" ? "运行中" : node.status === "warning" ? "预警" : "离线"}
                </span>
                {restarting && (
                  <span className="px-2 py-0.5 rounded bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] animate-pulse" style={{ fontSize: "0.65rem" }}>
                    重启中...
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all">
            <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "GPU 负载", value: `${node.gpu}%`, icon: Cpu, color: "#00d4ff" },
            { label: "内存使用", value: `${node.mem}%`, icon: HardDrive, color: "#aa55ff" },
            { label: "温度", value: `${node.temp}°C`, icon: Thermometer, color: node.temp > 75 ? "#ff3366" : "#00ff88" },
            { label: "任务数", value: `${node.tasks}`, icon: Activity, color: "#ffdd00" },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)]">
              <stat.icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
              <div style={{ fontSize: "1.2rem", color: stat.color, fontFamily: "'Orbitron', sans-serif" }}>
                {stat.value}
              </div>
              <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Model Info */}
        <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>当前模型</span>
          </div>
          <span className="text-[#00d4ff]" style={{ fontSize: "0.9rem" }}>{node.model}</span>
        </div>

        {/* History Chart */}
        <div>
          <h4 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.85rem" }}>历史负载趋势</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.08)" />
              <XAxis dataKey="time" tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <YAxis tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(0,180,255,0.1)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="gpu" stroke="#00d4ff" strokeWidth={2} dot={{ r: 3, fill: "#00d4ff" }} name="GPU" />
              <Line type="monotone" dataKey="mem" stroke="#aa55ff" strokeWidth={2} dot={{ r: 3, fill: "#aa55ff" }} name="内存" />
              <Line type="monotone" dataKey="temp" stroke="#ff6600" strokeWidth={2} dot={{ r: 3, fill: "#ff6600" }} name="温度" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── 日志面板 ── */}
        {showLogs && (
          <div className="mt-4 p-3 rounded-xl bg-[rgba(0,10,20,0.6)] border border-[rgba(0,180,255,0.15)]" data-testid="log-panel">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#00d4ff]" />
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>节点日志 - {node.id}</span>
              </div>
              <button onClick={() => setShowLogs(false)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all">
                <X className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              </button>
            </div>
            <div className="space-y-1 font-mono max-h-[160px] overflow-y-auto" style={{ fontSize: "0.68rem" }}>
              {MOCK_LOGS.map((log, i) => (
                <div key={i} className={`py-0.5 ${
                  log.includes("WARN") ? "text-[#ffdd00]" :
                  log.includes("ERROR") ? "text-[#ff3366]" :
                  log.includes("DEBUG") ? "text-[rgba(0,212,255,0.4)]" :
                  "text-[rgba(180,200,220,0.6)]"
                }`}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 二次确认：重启 ── */}
        {restartConfirm && (
          <div className="mt-4 p-3 rounded-xl bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.2)]" data-testid="restart-confirm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#ffdd00]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.8rem" }}>确认重启节点 {node.id}？</span>
            </div>
            <p className="text-[rgba(180,200,220,0.5)] mb-3" style={{ fontSize: "0.7rem" }}>
              重启将中断当前 {node.tasks} 个推理任务，任务将自动迁移到其他节点。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestartConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.15)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.25)] transition-all"
                style={{ fontSize: "0.78rem" }}
                data-testid="restart-confirm-btn"
              >
                <Check className="w-3.5 h-3.5" />
                确认重启
              </button>
              <button
                onClick={() => setRestartConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                style={{ fontSize: "0.78rem" }}
                data-testid="restart-cancel-btn"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* ── 二次确认：移除 ── */}
        {removeConfirm && (
          <div className="mt-4 p-3 rounded-xl bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.2)]" data-testid="remove-confirm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#ff3366]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.8rem" }}>确认移除节点 {node.id}？</span>
            </div>
            <p className="text-[rgba(180,200,220,0.5)] mb-3" style={{ fontSize: "0.7rem" }}>
              移除后节点将从集群中解除注册，所有任务将迁移到其他节点。此操作不可逆。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRemoveConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,51,102,0.15)] border border-[rgba(255,51,102,0.3)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all"
                style={{ fontSize: "0.78rem" }}
                data-testid="remove-confirm-btn"
              >
                <Check className="w-3.5 h-3.5" />
                确认移除
              </button>
              <button
                onClick={() => setRemoveConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
                style={{ fontSize: "0.78rem" }}
                data-testid="remove-cancel-btn"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 mt-6">
          <button
            onClick={handleViewLogs}
            className={`flex-1 py-2.5 rounded-xl border transition-all min-h-[44px] flex items-center justify-center gap-2 ${
              showLogs
                ? "bg-[rgba(0,212,255,0.2)] border-[rgba(0,212,255,0.4)] text-[#00d4ff]"
                : "bg-[rgba(0,212,255,0.12)] border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)]"
            }`}
            style={{ fontSize: "0.85rem" }}
            data-testid="view-logs-btn"
          >
            <FileText className="w-4 h-4" />
            查看日志
          </button>
          <button
            onClick={handleRestartClick}
            disabled={restarting}
            className={`flex-1 py-2.5 rounded-xl border transition-all min-h-[44px] flex items-center justify-center gap-2 ${
              restarting
                ? "bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.1)] text-[rgba(0,255,136,0.4)] cursor-not-allowed"
                : restartConfirm
                ? "bg-[rgba(0,255,136,0.18)] border-[rgba(0,255,136,0.35)] text-[#00ff88]"
                : "bg-[rgba(0,255,136,0.1)] border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.18)]"
            }`}
            style={{ fontSize: "0.85rem" }}
            data-testid="restart-node-btn"
          >
            <RotateCcw className={`w-4 h-4 ${restarting ? "animate-spin" : ""}`} />
            {restarting ? "重启中..." : "重启节点"}
          </button>
          <button
            onClick={handleRemoveClick}
            disabled={restarting}
            className={`flex-1 py-2.5 rounded-xl border transition-all min-h-[44px] flex items-center justify-center gap-2 ${
              removeConfirm
                ? "bg-[rgba(255,51,102,0.15)] border-[rgba(255,51,102,0.3)] text-[#ff3366]"
                : "bg-[rgba(255,51,102,0.08)] border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)]"
            }`}
            style={{ fontSize: "0.85rem" }}
            data-testid="remove-node-btn"
          >
            <Trash2 className="w-4 h-4" />
            移除节点
          </button>
        </div>
      </div>
    </div>
  );
}
