/**
 * 数据库查询函数
 * ===============
 * YYC3 数据持久化层 — localStorage 可编辑实现
 *
 * 数据库 Schema 对接：
 *   core.models       -> 模型配置
 *   core.agents        -> Agent 配置
 *   telemetry.inference_logs -> 推理日志
 *   infra.nodes        -> 节点状态
 *
 * 数据源策略:
 *   1. 首次启动 → 写入默认 Mock 数据到 localStorage
 *   2. 后续读取 → 从 localStorage 获取 (支持 CRUD)
 *   3. 接入 Supabase 后 → 切换为 supabase.from() 调用
 */

import { supabase } from "./supabaseClient";

// ============================================================
// 类型定义
// ============================================================

import type {
  Model,
  Agent,
  InferenceLog,
  NodeStatusRecord,
  ModelStats,
} from "../types/index";

// ============================================================
// Storage Keys
// ============================================================

const MODELS_KEY = "yyc3_db_models";
const AGENTS_KEY = "yyc3_db_agents";
const NODES_KEY = "yyc3_db_nodes";

// ============================================================
// 默认 Mock 数据 (仅首次初始化使用)
// ============================================================

const DEFAULT_MODELS: Model[] = [
  { id: "m1", name: "LLaMA-70B", provider: "Meta", tier: "primary", avg_latency_ms: 120, throughput: 850, created_at: "2025-01-15T08:00:00Z" },
  { id: "m2", name: "Qwen-72B", provider: "Alibaba", tier: "primary", avg_latency_ms: 135, throughput: 780, created_at: "2025-01-20T10:00:00Z" },
  { id: "m3", name: "GPT-4o", provider: "OpenAI", tier: "secondary", avg_latency_ms: 200, throughput: 620, created_at: "2025-02-01T12:00:00Z" },
  { id: "m4", name: "Claude-3.5", provider: "Anthropic", tier: "secondary", avg_latency_ms: 180, throughput: 700, created_at: "2025-02-05T09:00:00Z" },
  { id: "m5", name: "Mistral-7B", provider: "Mistral", tier: "standby", avg_latency_ms: 45, throughput: 1200, created_at: "2025-02-10T14:00:00Z" },
];

const DEFAULT_AGENTS: Agent[] = [
  { id: "a1", name: "CodeAssist", name_cn: "代码助手", role: "coding", description: "代码生成与审查", is_active: true },
  { id: "a2", name: "DataAnalyst", name_cn: "数据分析师", role: "analysis", description: "数据分析与可视化", is_active: true },
  { id: "a3", name: "DocWriter", name_cn: "文档撰写员", role: "writing", description: "技术文档生成", is_active: true },
  { id: "a4", name: "SecurityGuard", name_cn: "安全守卫", role: "security", description: "安全审计与漏洞检测", is_active: false },
  { id: "a5", name: "DevOpsBot", name_cn: "运维机器人", role: "ops", description: "自动化运维", is_active: true },
];

const DEFAULT_NODES: NodeStatusRecord[] = [
  { id: "n1", hostname: "GPU-A100-01", gpu_util: 72, mem_util: 65, temp_celsius: 68, model_deployed: "LLaMA-70B", active_tasks: 12, status: "active" },
  { id: "n2", hostname: "GPU-A100-02", gpu_util: 85, mem_util: 78, temp_celsius: 74, model_deployed: "Qwen-72B", active_tasks: 8, status: "active" },
  { id: "n3", hostname: "GPU-A100-03", gpu_util: 92, mem_util: 88, temp_celsius: 82, model_deployed: "LLaMA-70B", active_tasks: 15, status: "warning" },
  { id: "n4", hostname: "GPU-A100-04", gpu_util: 45, mem_util: 40, temp_celsius: 55, model_deployed: "Mistral-7B", active_tasks: 5, status: "active" },
  { id: "n5", hostname: "GPU-A100-05", gpu_util: 0, mem_util: 10, temp_celsius: 35, model_deployed: "", active_tasks: 0, status: "inactive" },
];

// ============================================================
// localStorage CRUD 工具层
// ============================================================

function loadData<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 首次: 写入默认值
  try { localStorage.setItem(key, JSON.stringify(defaults)); } catch { /* ignore */ }
  return [...defaults];
}

function saveData<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

// ============================================================
// 内存缓存 (避免频繁解析 JSON)
// ============================================================

let _models: Model[] | null = null;
let _agents: Agent[] | null = null;
let _nodes: NodeStatusRecord[] | null = null;

function getModels(): Model[] {
  if (!_models) _models = loadData<Model>(MODELS_KEY, DEFAULT_MODELS);
  return _models;
}

function getAgents(): Agent[] {
  if (!_agents) _agents = loadData<Agent>(AGENTS_KEY, DEFAULT_AGENTS);
  return _agents;
}

function getNodes(): NodeStatusRecord[] {
  if (!_nodes) _nodes = loadData<NodeStatusRecord>(NODES_KEY, DEFAULT_NODES);
  return _nodes;
}

function persistModels() { saveData(MODELS_KEY, getModels()); }
function persistAgents() { saveData(AGENTS_KEY, getAgents()); }
function persistNodes()  { saveData(NODES_KEY, getNodes()); }

// ============================================================
// CRUD — Models
// ============================================================

export function addDbModel(model: Omit<Model, "id">): Model {
  const models = getModels();
  const newModel: Model = { ...model, id: `m-${Date.now()}` };
  models.push(newModel);
  persistModels();
  return newModel;
}

export function updateDbModel(id: string, updates: Partial<Model>): Model | null {
  const models = getModels();
  const idx = models.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  models[idx] = { ...models[idx], ...updates };
  persistModels();
  return models[idx];
}

export function deleteDbModel(id: string): boolean {
  const models = getModels();
  const idx = models.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  models.splice(idx, 1);
  persistModels();
  return true;
}

// ============================================================
// CRUD — Agents
// ============================================================

export function addDbAgent(agent: Omit<Agent, "id">): Agent {
  const agents = getAgents();
  const newAgent: Agent = { ...agent, id: `a-${Date.now()}` };
  agents.push(newAgent);
  persistAgents();
  return newAgent;
}

export function updateDbAgent(id: string, updates: Partial<Agent>): Agent | null {
  const agents = getAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  agents[idx] = { ...agents[idx], ...updates };
  persistAgents();
  return agents[idx];
}

export function deleteDbAgent(id: string): boolean {
  const agents = getAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  agents.splice(idx, 1);
  persistAgents();
  return true;
}

// ============================================================
// CRUD — Nodes
// ============================================================

export function addDbNode(node: Omit<NodeStatusRecord, "id">): NodeStatusRecord {
  const nodes = getNodes();
  const newNode: NodeStatusRecord = { ...node, id: `n-${Date.now()}` };
  nodes.push(newNode);
  persistNodes();
  return newNode;
}

export function updateDbNode(id: string, updates: Partial<NodeStatusRecord>): NodeStatusRecord | null {
  const nodes = getNodes();
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  nodes[idx] = { ...nodes[idx], ...updates };
  persistNodes();
  return nodes[idx];
}

export function deleteDbNode(id: string): boolean {
  const nodes = getNodes();
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx < 0) return false;
  nodes.splice(idx, 1);
  persistNodes();
  return true;
}

// ============================================================
// ��置 — 恢复默认 Mock 数据
// ============================================================

export function resetDbModels(): Model[] {
  _models = DEFAULT_MODELS.map((m) => ({ ...m }));
  persistModels();
  return _models;
}

export function resetDbAgents(): Agent[] {
  _agents = DEFAULT_AGENTS.map((a) => ({ ...a }));
  persistAgents();
  return _agents;
}

export function resetDbNodes(): NodeStatusRecord[] {
  _nodes = DEFAULT_NODES.map((n) => ({ ...n }));
  persistNodes();
  return _nodes;
}

// ============================================================
// 导入/导出
// ============================================================

export function exportDbData(): string {
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    models: getModels(),
    agents: getAgents(),
    nodes: getNodes(),
  }, null, 2);
}

export function importDbData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.models) { _models = data.models; persistModels(); }
    if (data.agents) { _agents = data.agents; persistAgents(); }
    if (data.nodes)  { _nodes = data.nodes; persistNodes(); }
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// 推理日志生成 (仍为运行时生成, 无需持久化)
// ============================================================

function generateMockLogs(count: number): InferenceLog[] {
  const statuses: Array<"success" | "error" | "timeout"> = ["success", "error", "timeout"];
  const modelIds = getModels().map((m) => m.id);
  const agentIds = getAgents().filter((a) => a.is_active).map((a) => a.id);

  if (modelIds.length === 0 || agentIds.length === 0) return [];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${String(i + 1).padStart(5, "0")}`,
    model_id: modelIds[i % modelIds.length],
    agent_id: agentIds[i % agentIds.length],
    latency_ms: Math.floor(Math.random() * 300) + 20,
    tokens_in: Math.floor(Math.random() * 2000) + 100,
    tokens_out: Math.floor(Math.random() * 4000) + 200,
    status: i % 10 === 9 ? statuses[1] : i % 15 === 14 ? statuses[2] : statuses[0],
    created_at: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

// ============================================================
// Query Functions (API 兼容 — 签名不变)
// ============================================================

/** 获取活跃模型列表 */
export async function getActiveModels(): Promise<{ data: Model[]; error: null }> {
  void supabase; // placeholder for future Supabase integration
  return { data: [...getModels()], error: null };
}

/** 获取最近推理日志 */
export async function getRecentLogs(limit = 100): Promise<{ data: InferenceLog[]; error: null }> {
  return { data: generateMockLogs(limit), error: null };
}

/** 获取模型统计 */
export async function getModelStats(
  modelId: string
): Promise<{ data: ModelStats | null; error: null }> {
  const model = getModels().find((m) => m.id === modelId);
  if (!model) return { data: null, error: null };

  return {
    data: {
      avgLatency: model.avg_latency_ms,
      totalRequests: Math.floor(Math.random() * 50000) + 10000,
      totalTokens: Math.floor(Math.random() * 5_000_000) + 1_000_000,
      successRate: 95 + Math.random() * 4.5,
    },
    error: null,
  };
}

/** 获取节点状态 */
export async function getNodesStatus(): Promise<{ data: NodeStatusRecord[]; error: null }> {
  return { data: [...getNodes()], error: null };
}

/** 获取活跃 Agent 列表 */
export async function getActiveAgents(): Promise<{ data: Agent[]; error: null }> {
  return { data: getAgents().filter((a) => a.is_active), error: null };
}

/** 获取所有 Agent 列表 */
export async function getAllAgents(): Promise<{ data: Agent[]; error: null }> {
  return { data: [...getAgents()], error: null };
}

/** 获取单个模型 */
export async function getModelById(id: string): Promise<{ data: Model | null; error: null }> {
  const model = getModels().find((m) => m.id === id) || null;
  return { data: model, error: null };
}

/** 获取单个节点 */
export async function getNodeById(id: string): Promise<{ data: NodeStatusRecord | null; error: null }> {
  const node = getNodes().find((n) => n.id === id) || null;
  return { data: node, error: null };
}
