/**
 * nodes.ts — 节点数据单一事实源 (分层修复 / 2026-09-24)
 * =====================================================
 * nodeStore 下沉至 lib 层: 消除 hooks → stores 跨层依赖。
 *
 * 背景: useWebSocketData 原直接 `import { nodeStore } from "../stores/dashboard-stores"`,
 *       违反分层契约 (hooks 禁止引 stores, eslint boundaries 曾因此静默失效漏检)。
 *       节点数据读取统一经本模块 (lib 层), stores 层经 re-export 保持既有 import 路径不变。
 *
 * 分层: components → hooks → lib → types; stores 位于 lib 之上, 均可引用 lib。
 */

import { createLocalStore } from "./create-local-store";
import type { NodeData } from "../types";

/** 可持久化节点 (NodeData 已含 id, 此处显式声明以对齐 createLocalStore 泛型约束) */
export type StoredNode = NodeData & { id: string };

const DEFAULT_NODES: StoredNode[] = [
  { id: "GPU-A100-01", status: "active",   gpu: 87, mem: 72, temp: 68, model: "LLaMA-70B",    tasks: 128 },
  { id: "GPU-A100-02", status: "active",   gpu: 92, mem: 85, temp: 74, model: "Qwen-72B",     tasks: 156 },
  { id: "GPU-A100-03", status: "warning",  gpu: 98, mem: 94, temp: 82, model: "DeepSeek-V3",  tasks: 89 },
  { id: "GPU-A100-04", status: "active",   gpu: 45, mem: 38, temp: 52, model: "Mistral-7B",   tasks: 34 },
  { id: "GPU-A100-05", status: "active",   gpu: 73, mem: 61, temp: 63, model: "Claude-3.5",   tasks: 97 },
  { id: "GPU-A100-06", status: "active",   gpu: 56, mem: 48, temp: 58, model: "GPT-4o",       tasks: 112 },
  { id: "GPU-A100-07", status: "active",   gpu: 81, mem: 76, temp: 71, model: "Qwen-72B",     tasks: 143 },
  { id: "GPU-A100-08", status: "inactive", gpu: 0,  mem: 5,  temp: 32, model: "",              tasks: 0 },
  { id: "GPU-H100-01", status: "active",   gpu: 88, mem: 66, temp: 61, model: "GLM-4",        tasks: 104 },
];

export const nodeStore = createLocalStore<StoredNode>("yyc3_nodes", DEFAULT_NODES, "node");
