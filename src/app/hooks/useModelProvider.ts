/**
 * useModelProvider.ts
 * ====================
 * AI 模型提供商管理 Hook — 统一数据源
 *
 * 功能:
 * - 服务商 CRUD (localStorage 持久化, 内置 + 自定义)
 * - 已配置模型 CRUD (localStorage 持久化)
 * - Ollama 本地模型自动识别 (http://localhost:11434/api/tags)
 * - 统一 availableModels 列表供全局消费
 * - 服务商模型列表可动态编辑
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import builtinProvidersJson from "../config/providers/builtin-providers.json";
import { builtinProvidersSchema } from "../config/providers/provider-schema";
import { fetchWithTimeout } from "../lib/http";
import { env, subscribeEnvConfig } from "../lib/env-config";
import { getOllamaTagsUrl } from "../lib/ollama-url";
import { getGatewayConfig } from "../lib/api-config";
import { lsGet, lsSetJSON } from "../lib/yyc3-storage";
import type {
  ConfiguredModel,
  ModelProviderDef,
  ModelProviderId,
  OllamaModel,
  OllamaTagsResponse,
} from "../types";

// ============================================================
// 内置服务商 — 声明式 JSON 单一事实源 (Phase 3 / Task 3.3)
// ============================================================
// 新增/调整提供商: 编辑 src/app/config/providers/builtin-providers.json
// → schema 校验 (__tests__/provider-schema.test.ts) 自动守护, 零代码改动。
// 设计思想: 声明式提供商接入 (ragflow 模式, L2 重实现为 YYC³ 原创代码)

const BUILTIN_PROVIDERS: ModelProviderDef[] = (() => {
  const parsed = builtinProvidersSchema.safeParse(builtinProvidersJson);
  if (!parsed.success) {
    // 构建期数据经测试守护, 运行时防御性兜底: 解析失败则视为无内置提供商
    console.error("[useModelProvider] builtin-providers.json 校验失败:", parsed.error.issues);
    return [];
  }
  return parsed.data as ModelProviderDef[];
})();

// ============================================================
// Storage Keys
// ============================================================

const PROVIDERS_KEY = "yyc3_model_providers";
const MODELS_KEY = "yyc3_configured_models";

// ============================================================
// 持久化工具函数
// ============================================================

function loadProviders(): ModelProviderDef[] {
  try {
    const raw = lsGet(PROVIDERS_KEY);
    if (raw) {
      const saved: ModelProviderDef[] = JSON.parse(raw);
      // 合并策略: 以 localStorage 为准, 但确保新增内置服务商被补入
      const savedIds = new Set(saved.map((p) => p.id));
      const missing = BUILTIN_PROVIDERS.filter((bp) => !savedIds.has(bp.id));
      return [...saved, ...missing];
    }
    // 首次启动: 写入默认值
    return BUILTIN_PROVIDERS.map((p) => ({ ...p }));
  } catch {
    return BUILTIN_PROVIDERS.map((p) => ({ ...p }));
  }
}

function saveProviders(providers: ModelProviderDef[]) {
  lsSetJSON(PROVIDERS_KEY, providers);
}

function loadModels(): ConfiguredModel[] {
  try {
    const raw = lsGet(MODELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveModels(models: ConfiguredModel[]) {
  lsSetJSON(MODELS_KEY, models);
}

// ============================================================
// 兼容性导出 — MODEL_PROVIDERS (动态快照)
// ============================================================

/** @deprecated 请使用 useModelProvider().providers 获取动态列表 */
export const MODEL_PROVIDERS: ModelProviderDef[] = loadProviders();

// ============================================================
// Hook
// ============================================================

export function useModelProvider() {
  const [providers, setProviders] = useState<ModelProviderDef[]>(loadProviders);
  const [configuredModels, setConfiguredModels] = useState<ConfiguredModel[]>(loadModels);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 持久化 providers
  useEffect(() => {
    saveProviders(providers);
  }, [providers]);

  // 持久化 configuredModels
  useEffect(() => {
    saveModels(configuredModels);
  }, [configuredModels]);

  // ========== 服务商 CRUD ==========

  const addProvider = useCallback((provider: Omit<ModelProviderDef, "id" | "isBuiltin" | "isCustom" | "createdAt">) => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProvider: ModelProviderDef = {
      ...provider,
      id,
      isBuiltin: false,
      isCustom: true,
      createdAt: Date.now(),
    };
    setProviders((prev) => [...prev, newProvider]);
    return newProvider;
  }, []);

  const updateProvider = useCallback((id: ModelProviderId, updates: Partial<ModelProviderDef>) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      )
    );
    // 同步更新已配置模型中的 providerLabel / baseUrl
    if (updates.label || updates.baseUrl) {
      setConfiguredModels((prev) =>
        prev.map((m) =>
          m.providerId === id
            ? {
              ...m,
              providerLabel: updates.label ?? m.providerLabel,
              baseUrl: updates.baseUrl ?? m.baseUrl,
            }
            : m
        )
      );
    }
  }, []);

  const removeProvider = useCallback((id: ModelProviderId) => {
    setProviders((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.isBuiltin) return prev; // 内置服务商不可删除
      return prev.filter((p) => p.id !== id);
    });
    // 同步删除该服务商下的已配置模型
    setConfiguredModels((prev) => prev.filter((m) => m.providerId !== id));
  }, []);

  /** 重置内置服务商到默认配置 */
  const resetProvider = useCallback((id: ModelProviderId) => {
    const builtin = BUILTIN_PROVIDERS.find((p) => p.id === id);
    if (!builtin) return;
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...builtin, updatedAt: Date.now() } : p))
    );
  }, []);

  /** 向服务商添加自定义模型名 */
  const addModelToProvider = useCallback((providerId: ModelProviderId, modelName: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId && !p.models.includes(modelName)
          ? { ...p, models: [...p.models, modelName], updatedAt: Date.now() }
          : p
      )
    );
  }, []);

  /** 从服务商移除模型名 */
  const removeModelFromProvider = useCallback((providerId: ModelProviderId, modelName: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? { ...p, models: p.models.filter((m) => m !== modelName), updatedAt: Date.now() }
          : p
      )
    );
  }, []);

  // ========== Ollama 自动识别 ==========
  // 原设计归位 (2026-10-20, 用户澄清): 本地存储架构 / 宿主机协同 / 本地化运维——
  // 系统设置填变量即生效, Ollama 自动扫描本地模型; 网关仅是聚合兜底而非前提。
  // 扫描链: ①本地/宿主机链路 (ollama-url 阶梯: console 反代 > 同源代理 > 直连
  // 设置变量 OLLAMA_BASE_URL, 随系统设置即时生效) → ②网关聚合 (upstream_pool 中
  // yyc3-77/yyc3-22 等设备自动扫描产物)。两路并集去重; 全失败 → 空态+错误, 不造数。
  const fetchOllamaModels = useCallback(async (baseUrl?: string) => {
    setOllamaLoading(true);
    setOllamaError(null);

    try {
      // 显式传入自定义 baseUrl → 直连该 Ollama 实例 (保留: 高级用法)
      if (baseUrl) {
        const tagsUrl = `${baseUrl.replace(/\/$/, "")}/api/tags`;
        const res = await fetchWithTimeout(tagsUrl, { method: "GET" }, 5000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: OllamaTagsResponse = await res.json();
        const models = data.models || [];
        setOllamaModels(models);
        if (models.length > 0) {
          setProviders((prev) => prev.map((p) => (p.id === "ollama" ? { ...p, models: models.map((m) => m.name), baseUrl } : p)));
        }
        setOllamaLoading(false);
        return models;
      }

      const models: OllamaModel[] = [];
      const seen = new Set<string>();
      const errors: string[] = [];
      const ingest = (names: string[]) => {
        for (const name of names) {
          if (seen.has(name)) continue;
          seen.add(name);
          models.push({
            name,
            model: name,
            modified_at: "",
            size: 0,
            digest: "",
            details: { parent_model: "", format: "", family: "", parameter_size: "", quantization_level: "" },
          });
        }
      };

      // 1) 本地/宿主机链路 — 端点由部署形态与系统设置变量共同决定 (ollama-url 阶梯)
      try {
        const res = await fetchWithTimeout(getOllamaTagsUrl(), { method: "GET" }, 5000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: OllamaTagsResponse = await res.json();
        ingest((data.models ?? []).map((m) => m.name));
      } catch (err) {
        errors.push(`本地链路(${getOllamaTagsUrl()}): ${err instanceof Error ? err.message : String(err)}`);
      }

      // 2) 网关聚合兜底 — 宿主机协同 (网关 OLLAMA_DISCOVER_CIDR 自动扫描产物)
      try {
        const cfg = getGatewayConfig();
        const base = cfg.gatewayBase.replace(/\/v1\/?$/, "");
        const res = await fetchWithTimeout(`${base}/v1/router/stats`, { headers: { "X-API-Key": cfg.gatewayAdminKey } }, 6000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const stats = (await res.json()) as { upstream_pool?: Array<{ base_url?: string; models?: string[] }>; upstreams?: Array<{ base_url?: string; models?: string[] }> };
        const pool = stats.upstream_pool ?? stats.upstreams ?? [];
        ingest(pool.filter((u) => (u.base_url ?? "").includes(":11434")).flatMap((u) => u.models ?? []));
      } catch (err) {
        errors.push(`网关聚合: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (models.length > 0) {
        setOllamaModels(models);
        setProviders((prev) => prev.map((p) => (p.id === "ollama" ? { ...p, models: models.map((m) => m.name) } : p)));
      } else {
        // 真实化铁则: 双链路全失败/无数据 → 空态 + 错误信息, 禁止 Mock 造数
        setOllamaModels([]);
        setOllamaError(errors.length > 0 ? errors.join("; ") : "Ollama 自动扫描未发现模型 (本地与网关双链路均无数据)");
      }
      return models;
    } catch (err) {
      setOllamaModels([]);
      setOllamaError(`Ollama 自动扫描失败: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    } finally {
      setOllamaLoading(false);
    }
  }, []);

  // ========== 挂载时自动扫描 Ollama 模型 ==========
  useEffect(() => {
    // fetchOllamaModels 内部双链路自兜底 (本地 → 网关), 全败空态+错误 — fire-and-forget
    void fetchOllamaModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 变量填写即生效: 系统设置改 Ollama 变量 → 自动重扫 ==========
  useEffect(() => {
    let prevBase = env("OLLAMA_BASE_URL");
    let prevProxy = env("OLLAMA_PROXY_PATH");
    return subscribeEnvConfig((cfg) => {
      if (cfg.OLLAMA_BASE_URL !== prevBase || cfg.OLLAMA_PROXY_PATH !== prevProxy) {
        prevBase = cfg.OLLAMA_BASE_URL;
        prevProxy = cfg.OLLAMA_PROXY_PATH;
        void fetchOllamaModels();
      }
    });
    // 首帧闭包的 fetchOllamaModels 足够 (扫描端点只依赖 ollama-url 阶梯 + 网关配置, 不依赖 providers 增量)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 合并可用模型列表（供 AI 浮窗等消费） ==========
  const availableModels = useMemo(() => {
    const models: Array<{ id: string; name: string; provider: string; isLocal: boolean }> = [];

    // 已配置的云端/API 模型
    configuredModels.forEach((cm) => {
      models.push({
        id: cm.id,
        name: `${cm.model} (${cm.providerLabel})`,
        provider: cm.providerLabel,
        isLocal: cm.providerId === "ollama",
      });
    });

    // Ollama 本地模型（去重：如果已在 configuredModels 中则跳过）
    const configuredOllamaNames = new Set(
      configuredModels
        .filter((cm) => cm.providerId === "ollama")
        .map((cm) => cm.model)
    );
    ollamaModels.forEach((om) => {
      if (!configuredOllamaNames.has(om.name)) {
        models.push({
          id: `ollama-live-${om.name}`,
          name: om.name,
          provider: "Ollama (本地)",
          isLocal: true,
        });
      }
    });

    return models;
  }, [configuredModels, ollamaModels]);

  // ========== 添加已配置模型 ==========
  const addModel = useCallback((
    providerId: ModelProviderId,
    model: string,
    apiKey: string,
    customBaseUrl?: string,
    proxyUrl?: string,
  ) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const newModel: ConfiguredModel = {
      id: `${providerId}-${model}-${Date.now()}`,
      providerId,
      providerLabel: provider.label,
      model,
      apiKey,
      baseUrl: customBaseUrl || provider.baseUrl,
      ...(proxyUrl && { proxyUrl }),
      createdAt: Date.now(),
      lastUsed: null,
      status: "unchecked",
    };

    setConfiguredModels((prev) => [...prev, newModel]);
    return newModel;
  }, [providers]);

  // ========== 更新已配置模型 ==========
  const updateModel = useCallback((id: string, updates: Partial<ConfiguredModel>) => {
    setConfiguredModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  // ========== 删除已配置模型 ==========
  const removeModel = useCallback((id: string) => {
    setConfiguredModels((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ========== 测试连接 (Mock) ==========
  const testConnection = useCallback(async (id: string) => {
    setConfiguredModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: "active" as const, lastUsed: Date.now() } : m
      )
    );
  }, []);

  // ========== 导出/导入配置 ==========
  const exportConfig = useCallback(() => {
    return JSON.stringify({
      version: 2,
      exportedAt: Date.now(),
      providers: providers.filter((p) => !p.isBuiltin || p.updatedAt),
      configuredModels,
    }, null, 2);
  }, [providers, configuredModels]);

  const importConfig = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.providers) {
        setProviders((prev) => {
          const currentIds = new Set(prev.map((p) => p.id));
          const imported = data.providers.filter((p: ModelProviderDef) => !currentIds.has(p.id));
          // 更新已有的自定义服务商
          const updated = prev.map((p) => {
            const match = data.providers.find((dp: ModelProviderDef) => dp.id === p.id && !p.isBuiltin);
            return match ? { ...p, ...match } : p;
          });
          return [...updated, ...imported];
        });
      }
      if (data.configuredModels) {
        setConfiguredModels((prev) => {
          const currentIds = new Set(prev.map((m) => m.id));
          const imported = data.configuredModels.filter((m: ConfiguredModel) => !currentIds.has(m.id));
          return [...prev, ...imported];
        });
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // ========== 统计 ==========
  const stats = useMemo(() => ({
    total: configuredModels.length,
    active: configuredModels.filter((m) => m.status === "active").length,
    ollamaCount: ollamaModels.length,
    providers: new Set(configuredModels.map((m) => m.providerId)).size,
    customProviders: providers.filter((p) => p.isCustom).length,
    totalProviders: providers.length,
  }), [configuredModels, ollamaModels, providers]);

  return {
    // 数据
    providers,
    configuredModels,
    ollamaModels,
    ollamaLoading,
    ollamaError,
    stats,
    availableModels,

    // 模态框
    modalOpen,
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),

    // 服务商 CRUD
    addProvider,
    updateProvider,
    removeProvider,
    resetProvider,
    addModelToProvider,
    removeModelFromProvider,

    // 已配置模型 CRUD
    addModel,
    updateModel,
    removeModel,
    testConnection,

    // Ollama
    fetchOllamaModels,

    // 导入/导出
    exportConfig,
    importConfig,
  };
}
