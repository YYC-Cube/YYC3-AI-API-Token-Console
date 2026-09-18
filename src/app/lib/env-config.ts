/**
 * env-config.ts
 * ==============
 * 不可逆/敏感环境变量集中管理
 *
 * 所有不应硬编码的关键变量通过此模块统一管理:
 * - API 端点 (生产/开发)
 * - 版本号
 * - 系统名称
 * - 端口配置
 * - 加密/认证密钥前缀
 *
 * 优先级: import.meta.env > localStorage > 默认值
 *
 * 🚨 不可逆变量: 一旦修改可能导致数据不兼容,
 *    必须通过 env() 读取, 禁止硬编码
 */

// ============================================================
// 类型定义
// ============================================================

export interface EnvConfig {
  // ── 系统标识 (不可逆) ──
  SYSTEM_NAME: string;
  SYSTEM_VERSION: string;
  SYSTEM_BUILD: string;

  // ── 网络端点 (不可逆) ──
  API_BASE_URL: string;
  WS_ENDPOINT: string;
  OLLAMA_BASE_URL: string;
  OLLAMA_PROXY_PATH: string;       // 同源后端代理路径 (解决 CORS)

  // ── 存储键前缀 (不可逆 — 修改后旧数据丢失) ──
  STORAGE_PREFIX: string;
  IDB_NAME: string;
  IDB_VERSION: number;

  // ── 集群标识 ──
  CLUSTER_ID: string;
  NODE_ENV: string;

  // ── AI 默认配置 ──
  DEFAULT_AI_BASE_URL: string;
  DEFAULT_AI_MODEL: string;
  DEFAULT_AI_TEMPERATURE: number;
  DEFAULT_AI_MAX_TOKENS: number;
  DEFAULT_AI_TIMEOUT: number;

  // ── 安全 ──
  SESSION_TIMEOUT_MIN: number;
  MAX_LOGIN_ATTEMPTS: number;
  CORS_ORIGINS: string;

  // ── 功能开关 ──
  ENABLE_MOCK_MODE: boolean;
  ENABLE_DEBUG: boolean;
  ENABLE_PWA: boolean;
  ENABLE_ELECTRON_IPC: boolean;

  // ── 连接池默认配置 ──
  DB_POOL_MIN: number;
  DB_POOL_MAX: number;
  DB_POOL_IDLE_TIMEOUT: number;
  DB_POOL_ACQUIRE_TIMEOUT: number;

  // ── SQL 安全 ──
  SQL_BLOCKED_COMMANDS: string;
  SQL_MAX_HISTORY: number;
  SQL_TEST_SIMULATE_DELAY: number;
}

// ============================================================
// 默认值 (仅在 env 和 localStorage 都未设置时使用)
// ============================================================

const DEFAULTS: EnvConfig = {
  SYSTEM_NAME: "YYC³ CloudPivot Intelli-Matrix",
  SYSTEM_VERSION: "3.2.0",
  SYSTEM_BUILD: "2026.03.07",

  API_BASE_URL: "http://192.168.3.1:3118/api",
  WS_ENDPOINT: "ws://localhost:3113/ws",
  OLLAMA_BASE_URL: "http://localhost:11434",
  OLLAMA_PROXY_PATH: "/api/v1/llm/ollama",

  STORAGE_PREFIX: "yyc3_",
  IDB_NAME: "yyc3_matrix",
  IDB_VERSION: 3,

  CLUSTER_ID: "CN-EAST-PROD-01",
  NODE_ENV: "development",

  DEFAULT_AI_BASE_URL: "https://api.openai.com/v1",
  DEFAULT_AI_MODEL: "gpt-4o",
  DEFAULT_AI_TEMPERATURE: 0.7,
  DEFAULT_AI_MAX_TOKENS: 2048,
  DEFAULT_AI_TIMEOUT: 30000,

  SESSION_TIMEOUT_MIN: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  CORS_ORIGINS: "192.168.1.0/24,10.0.0.0/16,172.16.0.0/12",

  ENABLE_MOCK_MODE: true,
  ENABLE_DEBUG: false,
  ENABLE_PWA: true,
  ENABLE_ELECTRON_IPC: false,

  DB_POOL_MIN: 2,
  DB_POOL_MAX: 10,
  DB_POOL_IDLE_TIMEOUT: 30000,
  DB_POOL_ACQUIRE_TIMEOUT: 5000,

  SQL_BLOCKED_COMMANDS: "DROP,DELETE,TRUNCATE,ALTER",
  SQL_MAX_HISTORY: 20,
  SQL_TEST_SIMULATE_DELAY: 500,
};

// ============================================================
// localStorage 键
// ============================================================

const ENV_STORAGE_KEY = "yyc3_env_config";

// ============================================================
// 加载逻辑: import.meta.env > localStorage > DEFAULTS
// ============================================================

function loadEnvOverrides(): Partial<EnvConfig> {
  const overrides: Partial<EnvConfig> = {};
  try {
    // 1. 从 Vite 环境变量读取 (VITE_YYC3_ 前缀)
    const metaEnv = (import.meta as unknown as Record<string, unknown>).env as Record<string, string> | undefined;
    if (metaEnv) {
      if (metaEnv.VITE_YYC3_SYSTEM_NAME)     overrides.SYSTEM_NAME = metaEnv.VITE_YYC3_SYSTEM_NAME;
      if (metaEnv.VITE_YYC3_SYSTEM_VERSION)   overrides.SYSTEM_VERSION = metaEnv.VITE_YYC3_SYSTEM_VERSION;
      if (metaEnv.VITE_YYC3_API_BASE_URL)     overrides.API_BASE_URL = metaEnv.VITE_YYC3_API_BASE_URL;
      if (metaEnv.VITE_YYC3_WS_ENDPOINT)      overrides.WS_ENDPOINT = metaEnv.VITE_YYC3_WS_ENDPOINT;
      if (metaEnv.VITE_YYC3_OLLAMA_BASE_URL)  overrides.OLLAMA_BASE_URL = metaEnv.VITE_YYC3_OLLAMA_BASE_URL;
      if (metaEnv.VITE_YYC3_OLLAMA_PROXY_PATH) overrides.OLLAMA_PROXY_PATH = metaEnv.VITE_YYC3_OLLAMA_PROXY_PATH;
      if (metaEnv.VITE_YYC3_CLUSTER_ID)       overrides.CLUSTER_ID = metaEnv.VITE_YYC3_CLUSTER_ID;
      if (metaEnv.VITE_YYC3_STORAGE_PREFIX)    overrides.STORAGE_PREFIX = metaEnv.VITE_YYC3_STORAGE_PREFIX;
      if (metaEnv.VITE_YYC3_ENABLE_MOCK)       overrides.ENABLE_MOCK_MODE = metaEnv.VITE_YYC3_ENABLE_MOCK === "true";
      if (metaEnv.VITE_YYC3_ENABLE_DEBUG)      overrides.ENABLE_DEBUG = metaEnv.VITE_YYC3_ENABLE_DEBUG === "true";
      if (metaEnv.MODE)                        overrides.NODE_ENV = metaEnv.MODE;
    }
  } catch { /* Vite env not available */ }

  return overrides;
}

function loadStoredConfig(): Partial<EnvConfig> {
  try {
    const raw = localStorage.getItem(ENV_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

// ============================================================
// 合并后的运行时配置 (单例)
// ============================================================

let _envConfig: EnvConfig | null = null;

function buildConfig(): EnvConfig {
  const envOverrides = loadEnvOverrides();
  const stored = loadStoredConfig();
  // 优先级: env > localStorage > defaults
  return { ...DEFAULTS, ...stored, ...envOverrides };
}

// ============================================================
// 公开 API
// ============================================================

/** 获取环境变量 (类型安全) */
export function env<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  if (!_envConfig) _envConfig = buildConfig();
  return _envConfig[key];
}

/** 获取全部环境配置 */
export function getEnvConfig(): Readonly<EnvConfig> {
  if (!_envConfig) _envConfig = buildConfig();
  return { ..._envConfig };
}

/** 更新环境配置 (持久化到 localStorage) */
export function setEnvConfig(updates: Partial<EnvConfig>): EnvConfig {
  if (!_envConfig) _envConfig = buildConfig();
  _envConfig = { ..._envConfig, ...updates };
  try {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(_envConfig));
  } catch { /* ignore */ }
  return { ..._envConfig };
}

/** 重置环境配置 (清除 localStorage, 仅保留 env 和默认值) */
export function resetEnvConfig(): EnvConfig {
  try { localStorage.removeItem(ENV_STORAGE_KEY); } catch { /* ignore */ }
  _envConfig = null;
  return getEnvConfig();
}

/** 导出环境配置 JSON */
export function exportEnvConfig(): string {
  return JSON.stringify({
    _type: "env-config",
    _exportedAt: new Date().toISOString(),
    config: getEnvConfig(),
  }, null, 2);
}

/** 导入环境配置 */
export function importEnvConfig(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    const config = parsed.config || parsed;
    setEnvConfig(config);
    return true;
  } catch {
    return false;
  }
}