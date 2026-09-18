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

import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  ModelProviderId,
  ModelProviderDef,
  ConfiguredModel,
  OllamaModel,
  OllamaTagsResponse,
} from "../types";
import { getOllamaTagsUrl } from "../lib/ollama-url";

// ============================================================
// 内置服务商默认值 (仅首次初始化时写入 localStorage)
// ============================================================

const BUILTIN_PROVIDERS: ModelProviderDef[] = [
  {
    id: "zhipu",
    label: "Z.ai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authType: "api-key",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-airx", "glm-4-long", "glm-4v-plus"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "zhipu-plan",
    label: "Z.ai-plan",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authType: "api-key",
    models: ["glm-4-plan", "glm-4-plan-plus"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "kimi-cn",
    label: "Kimi-CN",
    baseUrl: "https://api.moonshot.cn/v1",
    authType: "bearer",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "kimi-global",
    label: "Kimi-Global",
    baseUrl: "https://api.moonshot.ai/v1",
    authType: "bearer",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    authType: "bearer",
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "volcengine",
    label: "火山引擎",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    authType: "bearer",
    models: ["doubao-pro-32k", "doubao-pro-128k", "doubao-lite-32k"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "volcengine-plan",
    label: "火山引擎 Plan",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    authType: "bearer",
    models: ["doubao-plan-pro", "doubao-plan-lite"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: "ollama",
    label: "Ollama (本地)",
    baseUrl: "http://localhost:11434",
    authType: "none",
    models: [],  // 运行时从 /api/tags 自动获取
    requiresApiKey: false,
    isLocal: true,
    isBuiltin: true,
  },
];

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
    const raw = localStorage.getItem(PROVIDERS_KEY);
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
  try {
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
  } catch { /* Storage unavailable */ }
}

function loadModels(): ConfiguredModel[] {
  try {
    const raw = localStorage.getItem(MODELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveModels(models: ConfiguredModel[]) {
  try {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
  } catch { /* Storage unavailable */ }
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
  const fetchOllamaModels = useCallback(async (baseUrl?: string) => {
    const ollamaProvider = providers.find((p) => p.id === "ollama");
    const url = baseUrl || ollamaProvider?.baseUrl || "http://localhost:11434";
    setOllamaLoading(true);
    setOllamaError(null);

    try {
      // 如果传入了自定义 baseUrl 则直连, 否则走同源代理
      const tagsUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/tags` : getOllamaTagsUrl();
      const res = await fetch(tagsUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: OllamaTagsResponse = await res.json();
      const models = data.models || [];
      setOllamaModels(models);

      // 自动同步 Ollama provider 的 models 列表
      if (models.length > 0) {
        setProviders((prev) =>
          prev.map((p) =>
            p.id === "ollama"
              ? { ...p, models: models.map((m) => m.name), baseUrl: url }
              : p
          )
        );
      }

      return models;
    } catch (err: any) {
      // Mock fallback for development
      const mockModels: OllamaModel[] = [
        {
          name: "codegeex4:latest",
          model: "codegeex4:latest",
          modified_at: "2026-02-22T00:55:15.920502035+08:00",
          size: 5455323291,
          digest: "867b8e81d03898ac2289d809edb718d67a6d706d6a644bb1a922ee1607c7e5ed",
          details: { parent_model: "", format: "gguf", family: "chatglm", parameter_size: "9.4B", quantization_level: "Q4_0" },
        },
        {
          name: "qwen2.5:7b",
          model: "qwen2.5:7b",
          modified_at: "2026-02-22T00:28:20.785576365+08:00",
          size: 4683087332,
          digest: "845dbda0ea48ed749caafd9e6037047aa19acfcfd82e704d7ca97d631a0b697e",
          details: { parent_model: "", format: "gguf", family: "qwen2", parameter_size: "7.6B", quantization_level: "Q4_K_M" },
        },
        {
          name: "gpt-oss:120b-cloud",
          model: "gpt-oss:120b-cloud",
          modified_at: "2026-02-20T19:35:46.930016073+08:00",
          size: 384,
          digest: "569662207105c69bb0eca2f79a3fdf8691ad6301def477a5ec66f8e8bae237e3",
          details: { parent_model: "", format: "", family: "gptoss", parameter_size: "116.8B", quantization_level: "MXFP4" },
        },
        {
          name: "nomic-embed-text:latest",
          model: "nomic-embed-text:latest",
          modified_at: "2026-02-17T22:24:23.909072343+08:00",
          size: 274302450,
          digest: "0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f",
          details: { parent_model: "", format: "gguf", family: "nomic-bert", parameter_size: "137M", quantization_level: "F16" },
        },
        {
          name: "deepseek-v3.1:671b-cloud",
          model: "deepseek-v3.1:671b-cloud",
          modified_at: "2025-12-11T12:32:45.905310644+08:00",
          size: 405,
          digest: "d3749919e45f955731da7a7e76849e20f7ed310725d3b8b52822e811f55d0a90",
          details: { parent_model: "", format: "", family: "deepseek2", parameter_size: "671.0B", quantization_level: "FP8_E4M3" },
        },
        {
          name: "qwen2.5-coder:1.5b",
          model: "qwen2.5-coder:1.5b",
          modified_at: "2025-09-26T03:48:11.422863972+08:00",
          size: 986062089,
          digest: "d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668",
          details: { parent_model: "", format: "gguf", family: "qwen2", parameter_size: "1.5B", quantization_level: "Q4_K_M" },
        },
      ];
      setOllamaModels(mockModels);
      setOllamaError(`连接失败 (Mock 模式): ${err.message}`);

      // Mock 模式也同步
      setProviders((prev) =>
        prev.map((p) =>
          p.id === "ollama"
            ? { ...p, models: mockModels.map((m) => m.name) }
            : p
        )
      );

      return mockModels;
    } finally {
      setOllamaLoading(false);
    }
  }, [providers]);

  // ========== 初始化时自动获取 Ollama 模型 ==========
  useEffect(() => {
    fetchOllamaModels();
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
      proxyUrl: proxyUrl || undefined,
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