/**
 * AddModelModal.tsx
 * ==================
 * 添加模型 模态框
 *
 * UI 匹配截图:
 * - 服务商下拉 (Z.ai / Z.ai-plan / Kimi-CN / ... / Ollama)
 * - 模型下拉 (根据服务商动态切换; Ollama 自动识别)
 * - API 密钥输入 (Ollama 不需要)
 * - 添加模型按钮
 */

import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Loader2, Server, Key, Cpu, RefreshCw } from "lucide-react";
import { useI18n } from "../hooks/useI18n";
import type { ModelProviderId, ModelProviderDef, OllamaModel } from "../types";

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ModelProviderDef[];
  ollamaModels: OllamaModel[];
  ollamaLoading: boolean;
  ollamaError: string | null;
  onFetchOllama: (baseUrl?: string) => Promise<OllamaModel[]>;
  onAdd: (providerId: ModelProviderId, model: string, apiKey: string, customBaseUrl?: string, proxyUrl?: string) => void;
  onAddModelToProvider?: (providerId: ModelProviderId, modelName: string) => void;
}

export function AddModelModal({
  isOpen,
  onClose,
  providers,
  ollamaModels,
  ollamaLoading,
  ollamaError,
  onFetchOllama,
  onAdd,
  onAddModelToProvider,
}: AddModelModalProps) {
  const { t } = useI18n();

  // Form state
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | "">("");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [customModelName, setCustomModelName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [showProxyInput, setShowProxyInput] = useState(false);

  // Dropdown open state
  const [providerDropOpen, setProviderDropOpen] = useState(false);
  const [modelDropOpen, setModelDropOpen] = useState(false);

  // Refs for click outside
  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderDropOpen(false);
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // When provider changes, reset model and fetch Ollama if needed
  useEffect(() => {
    setSelectedModel("");
    if (selectedProviderId === "ollama") {
      onFetchOllama(ollamaUrl);
    }
  }, [selectedProviderId]);

  // Get selected provider
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  // Available models for selected provider
  const availableModels: string[] =
    selectedProviderId === "ollama"
      ? ollamaModels.map((m) => m.name)
      : selectedProvider?.models ?? [];

  // Can submit?
  const canSubmit =
    selectedProviderId &&
    selectedModel &&
    (selectedProvider?.requiresApiKey ? apiKey.trim().length > 0 : true);

  // Reset form
  const resetForm = () => {
    setSelectedProviderId("");
    setSelectedModel("");
    setApiKey("");
    setProviderDropOpen(false);
    setModelDropOpen(false);
    setShowCustomInput(false);
    setProxyUrl("");
    setShowProxyInput(false);
  };

  // Handle submit
  const handleSubmit = () => {
    if (!canSubmit || !selectedProviderId) return;
    onAdd(
      selectedProviderId as ModelProviderId,
      selectedModel,
      apiKey,
      selectedProviderId === "ollama" ? ollamaUrl : undefined,
      proxyUrl.trim() || undefined,
    );
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="add-model-modal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { resetForm(); onClose(); }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[480px] mx-4 rounded-2xl bg-[rgba(8,20,45,0.98)] backdrop-blur-xl border border-[rgba(0,180,255,0.25)] shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        data-testid="modal-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "1.05rem" }}>
            {t("modelProvider.addModel")}
          </h3>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,180,255,0.08)] transition-all"
            data-testid="close-modal"
          >
            <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ===== 服务商下拉 ===== */}
          <div>
            <label className="flex items-center gap-1 mb-2">
              <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                {t("modelProvider.provider")}
              </span>
            </label>
            <div className="relative" ref={providerRef}>
              <button
                onClick={() => { setProviderDropOpen(!providerDropOpen); setModelDropOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,212,255,0.4)] transition-all text-left"
                data-testid="provider-select"
              >
                <span style={{ fontSize: "0.85rem", color: selectedProvider ? "#e0f0ff" : "rgba(0,212,255,0.3)" }}>
                  {selectedProvider ? selectedProvider.label : t("modelProvider.selectProvider")}
                </span>
                {providerDropOpen ? (
                  <ChevronUp className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
                )}
              </button>

              {providerDropOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 max-h-[280px] overflow-y-auto rounded-xl bg-[rgba(6,16,38,0.98)] border border-[rgba(0,180,255,0.25)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-10"
                  data-testid="provider-dropdown"
                >
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProviderId(p.id);
                        setProviderDropOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 transition-all ${
                        selectedProviderId === p.id
                          ? "bg-[rgba(0,120,200,0.2)] text-[#e0f0ff]"
                          : "text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,80,160,0.15)] hover:text-[#e0f0ff]"
                      }`}
                      style={{ fontSize: "0.88rem" }}
                      data-testid={`provider-option-${p.id}`}
                    >
                      <div className="flex items-center gap-2">
                        {p.isLocal ? (
                          <Server className="w-3.5 h-3.5 text-[#00ff88] shrink-0" />
                        ) : (
                          <Cpu className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] shrink-0" />
                        )}
                        {p.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Ollama URL (仅 Ollama 显示) ===== */}
          {selectedProviderId === "ollama" && (
            <div>
              <label className="flex items-center gap-1 mb-2">
                <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                  {t("modelProvider.ollamaEndpoint")}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] transition-all"
                  style={{ fontSize: "0.85rem" }}
                  data-testid="ollama-url-input"
                />
                <button
                  onClick={() => onFetchOllama(ollamaUrl)}
                  className="p-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,212,255,0.4)] transition-all"
                  disabled={ollamaLoading}
                  data-testid="refresh-ollama"
                >
                  {ollamaLoading ? (
                    <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
                  )}
                </button>
              </div>
              {ollamaError && (
                <p className="text-[#ffaa00] mt-1.5" style={{ fontSize: "0.65rem" }}>
                  {ollamaError}
                </p>
              )}
              {ollamaModels.length > 0 && (
                <p className="text-[#00ff88] mt-1" style={{ fontSize: "0.62rem" }}>
                  {t("modelProvider.detectedModels", { n: ollamaModels.length })}
                </p>
              )}
            </div>
          )}

          {/* ===== 模型下拉 ===== */}
          {selectedProviderId && (
            <div>
              <label className="flex items-center gap-1 mb-2">
                <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                  {t("modelProvider.model")}
                </span>
              </label>
              <div className="relative" ref={modelRef}>
                <button
                  onClick={() => { setModelDropOpen(!modelDropOpen); setProviderDropOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,212,255,0.4)] transition-all text-left"
                  data-testid="model-select"
                >
                  <span style={{ fontSize: "0.85rem", color: selectedModel ? "#e0f0ff" : "rgba(0,212,255,0.3)" }}>
                    {selectedModel || t("modelProvider.selectModel")}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
                </button>

                {modelDropOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 max-h-[220px] overflow-y-auto rounded-xl bg-[rgba(6,16,38,0.98)] border border-[rgba(0,180,255,0.25)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-10"
                    data-testid="model-dropdown"
                  >
                    {ollamaLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin" />
                        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.78rem" }}>
                          {t("modelProvider.loadingModels")}
                        </span>
                      </div>
                    ) : availableModels.length > 0 ? (
                      availableModels.map((m) => {
                        // For Ollama, show additional info
                        const ollamaInfo = selectedProviderId === "ollama"
                          ? ollamaModels.find((om) => om.name === m)
                          : null;
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              setSelectedModel(m);
                              setModelDropOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-all ${
                              selectedModel === m
                                ? "bg-[rgba(0,120,200,0.2)] text-[#e0f0ff]"
                                : "text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,80,160,0.15)] hover:text-[#e0f0ff]"
                            }`}
                            style={{ fontSize: "0.85rem" }}
                            data-testid={`model-option-${m}`}
                          >
                            <span>{m}</span>
                            {ollamaInfo && (
                              <span className="ml-2 text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.6rem" }}>
                                {ollamaInfo.details.parameter_size} · {ollamaInfo.details.quantization_level} · {(ollamaInfo.size / 1e9).toFixed(1)}GB
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-4 text-center text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
                        {t("modelProvider.noModels")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== 自定义模型名输入 ===== */}
          {selectedProviderId && selectedProviderId !== "ollama" && (
            <div>
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all flex items-center gap-1"
                style={{ fontSize: "0.7rem" }}
              >
                <Cpu className="w-3 h-3" />
                {showCustomInput ? "收起自定义" : "输入自定义模型名"}
              </button>
              {showCustomInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customModelName.trim()) {
                        e.preventDefault();
                        setSelectedModel(customModelName.trim());
                        if (onAddModelToProvider && selectedProviderId) {
                          onAddModelToProvider(selectedProviderId, customModelName.trim());
                        }
                        setCustomModelName("");
                        setShowCustomInput(false);
                      }
                    }}
                    placeholder="输入模型名称，回车确认..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] transition-all"
                    style={{ fontSize: "0.78rem" }}
                  />
                  <button
                    onClick={() => {
                      if (customModelName.trim()) {
                        setSelectedModel(customModelName.trim());
                        if (onAddModelToProvider && selectedProviderId) {
                          onAddModelToProvider(selectedProviderId, customModelName.trim());
                        }
                        setCustomModelName("");
                        setShowCustomInput(false);
                      }
                    }}
                    disabled={!customModelName.trim()}
                    className="px-3 py-2 rounded-lg bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all disabled:opacity-30"
                    style={{ fontSize: "0.78rem" }}
                  >
                    确认
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== API 密钥 (非 Ollama) ===== */}
          {selectedProvider && selectedProvider.requiresApiKey && (
            <div>
              <label className="flex items-center gap-1 mb-2">
                <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                  {t("modelProvider.apiKey")}
                </span>
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t("modelProvider.enterApiKey")}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] transition-all"
                  style={{ fontSize: "0.85rem" }}
                  data-testid="api-key-input"
                />
              </div>
            </div>
          )}

          {/* ===== 代理 URL (可选) ===== */}
          {selectedProvider && selectedProvider.requiresApiKey && (
            <div>
              <button
                onClick={() => setShowProxyInput(!showProxyInput)}
                className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all flex items-center gap-1"
                style={{ fontSize: "0.7rem" }}
              >
                <Cpu className="w-3 h-3" />
                {showProxyInput ? "收起代理 URL" : "输入代理 URL"}
              </button>
              {showProxyInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    placeholder="输入代理 URL，回车确认..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] transition-all"
                    style={{ fontSize: "0.78rem" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ===== Divider ===== */}
          <div className="h-px bg-[rgba(0,180,255,0.1)]" />

          {/* ===== Submit Button ===== */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl transition-all ${
              canSubmit
                ? "bg-[rgba(0,140,200,0.8)] hover:bg-[rgba(0,160,220,0.9)] text-white shadow-[0_0_20px_rgba(0,140,200,0.3)]"
                : "bg-[rgba(0,80,120,0.3)] text-[rgba(0,212,255,0.3)] cursor-not-allowed"
            }`}
            style={{ fontSize: "0.9rem" }}
            data-testid="submit-add-model"
          >
            {t("modelProvider.addModel")}
          </button>
        </div>
      </div>
    </div>
  );
}