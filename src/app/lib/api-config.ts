/**
 * api-config.ts
 * ==============
 * 统一后端 API 端点配置
 *
 * 所有后端接口 URL 集中管理，支持用户通过设置页面编辑，
 * localStorage 持久化，接入真实后端时仅需修改此处配置。
 *
 * BroadcastChannel 实时同步到其他标签页。
 */

// RF-009: 统一 BroadcastChannel 工厂
import { getSharedChannel } from "./broadcast-channel";

const STORAGE_KEY = "yyc3_api_endpoints";
const CONFIG_CHANNEL_NAME = "yyc3_api_config";

/** APIEndpoints is centralized in types/index.ts */
import type { APIEndpoints } from "../types";
// RF-011: Re-export 恢复，供 SystemSettings 等组件使用
export type { APIEndpoints };

const DEFAULTS: APIEndpoints = {
  fsBase: "/api/fs",
  dbBase: "/api/db",
  wsEndpoint: "ws://localhost:3113/ws",
  aiBase: "https://api.openai.com/v1",
  clusterBase: "/api/cluster",
  metricsBase: "/console/metrics",
  enableBackend: false,
  timeout: 15000,
  maxRetries: 2,
};

/** YYC³ 网关（0379-World）配置：默认走同源 /console/gw 服务端代理
 *  （生产部署 console-server.mjs 注入 ADMIN key，浏览器零暴露）；
 *  内网直连可改为 http://192.168.3.45:8000/v1 + 真实 sk-admin 密钥 */
export const GATEWAY_DEFAULTS = {
  /** OpenAI 兼容 base（默认=服务端代理同源路径） */
  gatewayBase: "https://api.0379.world/console/gw/v1",
  /** 管理面密钥：代理模式下填任意占位（服务端覆盖）；直连模式填真实 sk-admin */
  gatewayAdminKey: "proxy",
  /** OpenAI 兼容调用密钥（chat 用） */
  gatewayApiKey: "",
};
const GATEWAY_KEY = "yyc3_gateway_config";

let _gateway: typeof GATEWAY_DEFAULTS = (() => {
  try {
    const raw = localStorage.getItem(GATEWAY_KEY);
    if (raw) return { ...GATEWAY_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...GATEWAY_DEFAULTS };
})();

export function getGatewayConfig(): typeof GATEWAY_DEFAULTS {
  return _gateway;
}

export function setGatewayConfig(updates: Partial<typeof GATEWAY_DEFAULTS>): typeof GATEWAY_DEFAULTS {
  _gateway = { ..._gateway, ...updates };
  try { localStorage.setItem(GATEWAY_KEY, JSON.stringify(_gateway)); } catch { /* ignore */ }
  try { getSharedChannel(CONFIG_CHANNEL_NAME)?.postMessage({ type: "gateway_update", gateway: _gateway }); } catch { /* ignore */ }
  for (const fn of _listeners) { try { fn(_config); } catch { /* ignore */ } }
  return _gateway;
}

/** 从 localStorage 加载配置 */
function loadConfig(): APIEndpoints {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULTS, ...saved };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

/** 内存缓存 */
let _config: APIEndpoints = loadConfig();

/** 获取当前 API 端点配置 */
export function getAPIConfig(): APIEndpoints {
  return _config;
}

/** 更新 API 端点配置 (自动持久化 + 广播) */
export function setAPIConfig(updates: Partial<APIEndpoints>): APIEndpoints {
  _config = { ..._config, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_config));
  } catch { /* ignore */ }

  // 广播到其他标签页
  // RF-009: 使用 singleton channel，避免每次 new/close
  try {
    const ch = getSharedChannel(CONFIG_CHANNEL_NAME);
    ch?.postMessage({ type: "config_update", config: _config });
  } catch { /* ignore */ }

  // 通知监听器
  for (const fn of _listeners) {
    try { fn(_config); } catch { /* ignore */ }
  }

  return _config;
}

/** 重置为默认配置 */
export function resetAPIConfig(): APIEndpoints {
  _config = { ...DEFAULTS };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  for (const fn of _listeners) {
    try { fn(_config); } catch { /* ignore */ }
  }
  return _config;
}

/** 配置变更监听器 */
type ConfigListener = (config: APIEndpoints) => void;
const _listeners: ConfigListener[] = [];

export function onAPIConfigChange(fn: ConfigListener): () => void {
  _listeners.push(fn);

  // 监听其他标签页广播
  // RF-009: 使用 singleton channel
  const ch = getSharedChannel(CONFIG_CHANNEL_NAME);
  if (ch) {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "config_update") {
        _config = event.data.config;
        fn(_config);
      }
    };
    ch.addEventListener("message", handler);
    return () => {
      const idx = _listeners.indexOf(fn);
      if (idx >= 0) _listeners.splice(idx, 1);
      ch.removeEventListener("message", handler);
      // RF-009: 不再 close() — 由 broadcast-channel 工厂统一管理生命周期
    };
  }

  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

/** 端点描述信息 (用于设置 UI) */
export const ENDPOINT_META: Array<{
  key: keyof APIEndpoints;
  label: string;
  labelCn: string;
  description: string;
  type: "url" | "boolean" | "number";
  placeholder: string;
  group: string;
}> = [
  { key: "enableBackend", label: "Enable Backend API", labelCn: "启用后端 API", description: "关闭时使用前端 Mock 数据", type: "boolean", placeholder: "", group: "通用" },
  { key: "timeout", label: "Request Timeout", labelCn: "请求超时 (ms)", description: "API 请求超时时间", type: "number", placeholder: "15000", group: "通用" },
  { key: "maxRetries", label: "Max Retries", labelCn: "最大重试次数", description: "请求失败后指数退避重试次数 (0=不重试)", type: "number", placeholder: "2", group: "通用" },
  { key: "fsBase", label: "File System API", labelCn: "文件系统 API", description: "POST /api/fs/{list|read|write|delete|rename|upload|search}", type: "url", placeholder: "/api/fs", group: "文件系统" },
  { key: "dbBase", label: "Database API", labelCn: "数据库管理 API", description: "POST /api/db/{detect|connect|query|tables|backup|restore|test}", type: "url", placeholder: "/api/db", group: "数据库" },
  { key: "wsEndpoint", label: "WebSocket", labelCn: "WebSocket 地址", description: "实时数据推送", type: "url", placeholder: "ws://localhost:3113/ws", group: "实时通信" },
  { key: "aiBase", label: "AI Inference API", labelCn: "AI 推理 API", description: "OpenAI 兼容接口", type: "url", placeholder: "https://api.openai.com/v1", group: "AI 推理" },
  { key: "clusterBase", label: "Cluster API", labelCn: "集群管理 API", description: "节点管理、模型部署", type: "url", placeholder: "/api/cluster", group: "集群" },
  { key: "metricsBase", label: "Metrics API", labelCn: "节点指标 API", description: "GET /console/metrics 聚合各节点运行指标（WS 不可达时轮询档）", type: "url", placeholder: "/console/metrics", group: "集群" },
];