/**
 * DeviceInventoryManager.tsx
 * ===========================
 * 多端设备管理面板（双端联通 R2 / 硬约束①「设备实现可视化可编辑增减」）
 *
 * 挂载于 Dashboard 节点矩阵卡内。两类呈现:
 *   - 自动发现源（只读概览）: 网关上游池 / NAS 网关 / A2A Agent 容器 —— 来自 WebSocketContext 四源合流
 *   - Ollama 节点（可编辑增减）: GET/PUT /console/settings.ollamaNodes 全量 desired-state;
 *     保存后 console-server 反代/指标聚合即时生效（新节点出现在节点矩阵, 删除节点消失）
 *
 * 仅 console 部署形态可编辑（PUT 需 Cookie 会话）; 其他形态展示只读概览。
 */

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, HardDrive, MonitorCog, Plus, Save, Server, Trash2, UserCircle2 } from "lucide-react";
import type { NodeData } from "../types";
import { isConsoleDeployment } from "../lib/ollama-url";
import { fetchWithTimeout } from "../lib/http";

type NodeRow = { id: string; origin: string };

const KIND_LABEL: Record<NonNullable<NodeData["kind"]>, string> = {
  upstream: "推理池",
  ollama: "Ollama",
  gateway: "网关",
  agent: "Agent",
};

export function DeviceInventoryManager({ nodes }: { nodes: NodeData[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NodeRow[]>([]);
  const [addId, setAddId] = useState("");
  const [addOrigin, setAddOrigin] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const editable = isConsoleDeployment();

  const load = useCallback(async () => {
    if (typeof fetch !== "function") return;
    try {
      const r = await fetchWithTimeout("/console/settings", {}, 5000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { ollamaNodes?: Record<string, string> };
      setRows(Object.entries(d.ollamaNodes ?? {}).map(([id, origin]) => ({ id, origin })));
      setLoaded(true);
    } catch {
      setStatus("节点表读取失败（console-server 不可达）");
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded, load]);

  // 自动源概览计数（来自四源合流的 nodes 分片）
  const autoCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    const key = n.kind ?? "upstream";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const addRow = () => {
    const id = addId.trim();
    const origin = addOrigin.trim();
    if (!id || !/^[\w.-]+$/.test(id)) { setStatus("节点 ID 仅允许字母/数字/点/横线/下划线"); return; }
    if (rows.some((r) => r.id === id)) { setStatus(`节点 ID 已存在: ${id}`); return; }
    try {
      const u = new URL(origin);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
    } catch {
      setStatus("origin 必须是 http/https URL（例: http://192.168.3.50:11434）");
      return;
    }
    setRows((prev) => [...prev, { id, origin }]);
    setAddId("");
    setAddOrigin("");
    setStatus("");
  };

  const save = useCallback(async () => {
    if (typeof fetch !== "function") return;
    const map: Record<string, string> = {};
    for (const r of rows) map[r.id] = r.origin;
    try {
      const r = await fetchWithTimeout("/console/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaNodes: map }),
      }, 5000);
      const d = (await r.json()) as { ok?: boolean; rejected?: string[] } | null;
      if (!r.ok || (d && Array.isArray(d.rejected) && d.rejected.includes("ollamaNodes"))) {
        throw new Error(d && Array.isArray(d.rejected) && d.rejected.length ? `被拒绝: ${d.rejected.join(",")}` : `HTTP ${r.status}`);
      }
      setStatus(`已保存 ${rows.length} 个节点（指标/反代即时生效）`);
      setLoaded(true);
    } catch (e) {
      setStatus(`保存失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [rows]);

  return (
    <div className="mt-3 rounded-xl border border-[rgba(0,180,255,0.12)] bg-[rgba(4,14,32,0.5)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(0,212,255,0.04)] transition-all"
      >
        <span className="flex items-center gap-2 text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.72rem" }}>
          <MonitorCog className="w-3.5 h-3.5" />
          设备管理 · 可视化增减
        </span>
        <span className="flex items-center gap-2 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
          {Object.entries(autoCounts).map(([k, v]) => (
            <span key={k}>{KIND_LABEL[k as NonNullable<NodeData["kind"]>] ?? k}×{v}</span>
          ))}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* 自动发现源概览（只读） */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.45)]" style={{ fontSize: "0.62rem" }}>
              <Server className="w-3 h-3" /> 网关上游池（自动）×{autoCounts.upstream ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.45)]" style={{ fontSize: "0.62rem" }}>
              <HardDrive className="w-3 h-3" /> Ollama 节点（下表可编辑）×{autoCounts.ollama ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.45)]" style={{ fontSize: "0.62rem" }}>
              <MonitorCog className="w-3 h-3" /> NAS 网关（自动）×{autoCounts.gateway ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.45)]" style={{ fontSize: "0.62rem" }}>
              <UserCircle2 className="w-3 h-3" /> Agent 容器（自动）×{autoCounts.agent ?? 0}
            </span>
          </div>

          {editable ? (
            <>
              {/* Ollama 节点表（desired-state 全量保存） */}
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md bg-[rgba(0,212,255,0.08)] text-[#00d4ff] shrink-0" style={{ fontSize: "0.65rem", minWidth: 52 }}>
                      {r.id}
                    </span>
                    <span className="flex-1 truncate px-2 py-1 rounded-md bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)] text-[rgba(224,240,255,0.55)]" style={{ fontSize: "0.62rem" }}>
                      {r.origin}
                    </span>
                    <button
                      onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                      className="p-1.5 rounded-md text-[rgba(255,100,100,0.6)] hover:text-[#ff6464] hover:bg-[rgba(255,100,100,0.08)] transition-all"
                      title={`删除 ${r.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>（空表 — 保存后 console-server 将不再探测任何 Ollama 节点）</p>
                )}
              </div>

              {/* 新增行 */}
              <div className="flex items-center gap-2">
                <input
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  placeholder="节点 ID"
                  className="w-24 px-2 py-1 rounded-md bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.12)] text-[#e0f0ff] outline-none focus:border-[rgba(0,212,255,0.4)]"
                  style={{ fontSize: "0.65rem" }}
                />
                <input
                  value={addOrigin}
                  onChange={(e) => setAddOrigin(e.target.value)}
                  placeholder="http://<host>:11434"
                  className="flex-1 px-2 py-1 rounded-md bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.12)] text-[#e0f0ff] outline-none focus:border-[rgba(0,212,255,0.4)]"
                  style={{ fontSize: "0.65rem" }}
                />
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.18)] transition-all"
                  style={{ fontSize: "0.65rem" }}
                >
                  <Plus className="w-3 h-3" /> 添加
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { void save(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
                  style={{ fontSize: "0.68rem" }}
                >
                  <Save className="w-3.5 h-3.5" /> 保存节点表
                </button>
                {status && <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.62rem" }}>{status}</span>}
              </div>
            </>
          ) : (
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.65rem" }}>
              Ollama 节点编辑需 console 部署形态（api.0379.world/console/, Cookie 会话）; 当前形态仅展示自动发现源。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
