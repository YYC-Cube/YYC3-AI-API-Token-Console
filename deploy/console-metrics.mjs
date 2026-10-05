// @ts-check
/// <reference types="node" />
/**
 * console-metrics.mjs
 * ====================
 * Console 服务端指标聚合与设置持久化 — 纯逻辑模块（零副作用，可单测）。
 *
 * 架构先例: console-auth.mjs（逻辑与 server 接线分离，测试 import 不启监听）。
 * 消费方: console-server.mjs
 *   - GET  /console/metrics   → collectNodeMetrics() 聚合 OLLAMA_NODES 各节点 Ollama /api/ps
 *   - GET  /console/settings  → loadConsoleSettings() 服务端持久化设置读取
 *   - PUT  /console/settings  → filterSettingsPayload() 白名单校验后落盘
 *
 * 真实数据接入 P0 + P4 后端下发共批 (2026-10-05)。
 */

import { promises as fs } from "node:fs";

// ── 服务端设置: 白名单键（P4 下发面 — 仅收敛「服务端行为」相关项，前端展示类设置不下发）──
export const CONSOLE_SETTINGS_KEYS = [
  "corsOrigins",        // 允许来源清单（逗号分隔 CIDR/域名）
  "sessionTimeoutMin",  // 会话超时（分钟）
  "ipWhitelist",        // IP 白名单（换行分隔 CIDR）
  "alertEmailAddr",     // 告警通知邮箱
  "webhookUrl",         // 告警 Webhook
];

/** 白名单键类型契约（校验+收敛，未知键丢弃，类型不符置默认并标记） */
const KEY_TYPES = {
  corsOrigins: "string",
  sessionTimeoutMin: "number",
  ipWhitelist: "string",
  alertEmailAddr: "string",
  webhookUrl: "string",
};

/**
 * 过滤并校验设置载荷 — 仅白名单键通过，其余丢弃。
 * @param {unknown} obj 任意输入（请求体 JSON）
 * @returns {{ ok: boolean, settings: Record<string, string|number>, rejected: string[] }}
 */
export function filterSettingsPayload(obj) {
  const rejected = [];
  const settings = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, settings, rejected: ["payload"] };
  }
  for (const [key, want] of Object.entries(KEY_TYPES)) {
    if (!(key in obj)) continue;
    const raw = obj[key];
    if (want === "number") {
      const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 1440) settings[key] = Math.round(n);
      else rejected.push(key);
    } else {
      if (typeof raw === "string" && raw.length <= 2048) settings[key] = raw;
      else rejected.push(key);
    }
  }
  return { ok: true, settings, rejected };
}

/** 服务端设置落盘路径（deploy/ 运行时旁，不入 git） */
export function consoleSettingsFile(dirname) {
  return `${dirname}/console-settings.json`;
}

/**
 * 读取服务端设置（文件缺失/损坏 → 空对象）
 * @param {string} file
 * @returns {Promise<Record<string, string|number>>}
 */
export async function loadConsoleSettings(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    const { settings } = filterSettingsPayload(parsed);
    return settings;
  } catch {
    return {};
  }
}

/**
 * 写入服务端设置（原子写 tmp→rename）
 * @param {string} file
 * @param {Record<string, string|number>} settings 已过滤的设置
 */
export async function saveConsoleSettings(file, settings) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/**
 * 聚合各节点 Ollama 运行指标 — 真实数据接入 P0 生产者。
 * 每节点 GET /api/ps（运行中模型=真实负载），计时得延迟；不可达节点 status=inactive。
 *
 * @param {Record<string, string>} nodesMap 节点白名单 { id: origin }
 * @param {typeof fetch} [fetchImpl] 可注入 fetch（测试）
 * @param {number} [timeoutMs=2500] 单节点超时
 * @returns {Promise<{
 *   ts: number,
 *   activeCount: string,
 *   nodes: Array<{ id: string, status: "active"|"inactive", latencyMs: number, models: string[] }>,
 * }>}
 */
export async function collectNodeMetrics(nodesMap, fetchImpl = fetch, timeoutMs = 2500) {
  const entries = Object.entries(nodesMap || {});
  const results = await Promise.allSettled(
    entries.map(async ([id, origin]) => {
      const started = Date.now();
      const r = await fetchImpl(`${origin}/api/ps`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const latencyMs = Date.now() - started;
      /** @type {{ models?: Array<{ name?: string }> }} */
      const body = await r.json();
      const models = (body.models || []).map((m) => String(m.name || "")).filter(Boolean);
      return { id, status: "active", latencyMs, models };
    })
  );
  const nodes = entries.map(([id], i) => {
    const r = results[i];
    return r.status === "fulfilled"
      ? r.value
      : { id, status: "inactive", latencyMs: -1, models: [] };
  });
  const active = nodes.filter((n) => n.status === "active").length;
  return {
    ts: Date.now(),
    activeCount: `${active}/${nodes.length}`,
    nodes,
  };
}
