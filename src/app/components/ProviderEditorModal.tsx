/**
 * ProviderEditorModal.tsx
 * ========================
 * 服务商编辑器 — 新增 / 编辑 服务商
 *
 * 支持:
 * - 创建自定义服务商 (名称 / baseUrl / 认证方式 / 模型列表)
 * - 编辑已有服务商 (含内置服务商的 baseUrl / 模型列表)
 * - 动态增删模型名称
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, Server, Globe, Key, Cpu,
  ChevronDown, Save, RotateCcw,
} from "lucide-react";
import { useI18n } from "../hooks/useI18n";
import type { ModelProviderDef } from "../types";

// ============================================================
// Types
// ============================================================

interface ProviderEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 编辑模式: 传入已有服务商; 新增模式: null */
  editingProvider: ModelProviderDef | null;
  onSave: (provider: Omit<ModelProviderDef, "id" | "isBuiltin" | "isCustom" | "createdAt">) => void;
  onUpdate: (id: string, updates: Partial<ModelProviderDef>) => void;
  onReset?: (id: string) => void;
}

const AUTH_TYPES: { value: "bearer" | "api-key" | "none"; label: string }[] = [
  { value: "bearer", label: "Bearer Token" },
  { value: "api-key", label: "API Key Header" },
  { value: "none", label: "无认证 (本地)" },
];

// ============================================================
// Component
// ============================================================

export function ProviderEditorModal({
  isOpen,
  onClose,
  editingProvider,
  onSave,
  onUpdate,
  onReset,
}: ProviderEditorModalProps) {
  const { t } = useI18n();
  const isEditing = !!editingProvider;
  const isBuiltin = editingProvider?.isBuiltin ?? false;

  // Form state
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState<"bearer" | "api-key" | "none">("bearer");
  const [requiresApiKey, setRequiresApiKey] = useState(true);
  const [isLocal, setIsLocal] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [newModelName, setNewModelName] = useState("");
  const [authDropOpen, setAuthDropOpen] = useState(false);

  // Initialize from editing provider
  useEffect(() => {
    if (editingProvider) {
      setLabel(editingProvider.label);
      setBaseUrl(editingProvider.baseUrl);
      setAuthType(editingProvider.authType);
      setRequiresApiKey(editingProvider.requiresApiKey);
      setIsLocal(editingProvider.isLocal);
      setModels([...editingProvider.models]);
    } else {
      resetForm();
    }
  }, [editingProvider, isOpen]);

  const resetForm = () => {
    setLabel("");
    setBaseUrl("");
    setAuthType("bearer");
    setRequiresApiKey(true);
    setIsLocal(false);
    setModels([]);
    setNewModelName("");
    setAuthDropOpen(false);
  };

  // Models management
  const handleAddModel = useCallback(() => {
    const name = newModelName.trim();
    if (name && !models.includes(name)) {
      setModels((prev) => [...prev, name]);
      setNewModelName("");
    }
  }, [newModelName, models]);

  const handleRemoveModel = useCallback((modelName: string) => {
    setModels((prev) => prev.filter((m) => m !== modelName));
  }, []);

  const handleModelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddModel();
    }
  };

  // Auth type change syncs requiresApiKey
  const handleAuthTypeChange = (type: "bearer" | "api-key" | "none") => {
    setAuthType(type);
    setRequiresApiKey(type !== "none");
    if (type === "none") setIsLocal(true);
    setAuthDropOpen(false);
  };

  // Submit
  const canSubmit = label.trim() && baseUrl.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (isEditing && editingProvider) {
      onUpdate(editingProvider.id, {
        label: label.trim(),
        baseUrl: baseUrl.trim(),
        authType,
        requiresApiKey,
        isLocal,
        models,
      });
    } else {
      onSave({
        label: label.trim(),
        baseUrl: baseUrl.trim(),
        authType,
        requiresApiKey,
        isLocal,
        models,
      });
    }
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { resetForm(); onClose(); }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-[rgba(8,20,45,0.98)] backdrop-blur-xl border border-[rgba(0,180,255,0.25)] shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-[rgba(8,20,45,0.98)] z-10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#00d4ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "1.05rem" }}>
              {isEditing ? "编辑服务商" : "添加自定义服务商"}
            </h3>
            {isBuiltin && (
              <span
                className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.5)]"
                style={{ fontSize: "0.58rem" }}
              >
                内置
              </span>
            )}
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,180,255,0.08)] transition-all"
          >
            <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ===== 服务商名称 ===== */}
          <div>
            <label className="flex items-center gap-1 mb-2">
              <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>服务商名称</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如: Claude API / 本地 vLLM..."
              className="w-full px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] transition-all"
              style={{ fontSize: "0.85rem" }}
              disabled={isBuiltin}
            />
            {isBuiltin && (
              <p className="text-[rgba(0,212,255,0.25)] mt-1" style={{ fontSize: "0.6rem" }}>
                内置服务商名称不可修改
              </p>
            )}
          </div>

          {/* ===== API 基地址 ===== */}
          <div>
            <label className="flex items-center gap-1 mb-2">
              <span className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>*</span>
              <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>API 基地址 (Base URL)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.5)] transition-all"
              style={{ fontSize: "0.85rem", fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>

          {/* ===== 认证方式 ===== */}
          <div>
            <label className="flex items-center gap-1 mb-2">
              <Key className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>认证方式</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setAuthDropOpen(!authDropOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,212,255,0.4)] transition-all text-left"
              >
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                  {AUTH_TYPES.find((a) => a.value === authType)?.label}
                </span>
                <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
              </button>

              {authDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[rgba(6,16,38,0.98)] border border-[rgba(0,180,255,0.25)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-10">
                  {AUTH_TYPES.map((at) => (
                    <button
                      key={at.value}
                      onClick={() => handleAuthTypeChange(at.value)}
                      className={`w-full text-left px-4 py-2.5 transition-all ${
                        authType === at.value
                          ? "bg-[rgba(0,120,200,0.2)] text-[#e0f0ff]"
                          : "text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,80,160,0.15)] hover:text-[#e0f0ff]"
                      }`}
                      style={{ fontSize: "0.85rem" }}
                    >
                      {at.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 本地服务开关 */}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocal}
                onChange={(e) => setIsLocal(e.target.checked)}
                className="accent-[#00d4ff] w-3.5 h-3.5"
              />
              <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>
                本地服务 (无需外网)
              </span>
            </label>
          </div>

          {/* ===== 模型列表管理 ===== */}
          <div>
            <label className="flex items-center gap-1 mb-2">
              <Cpu className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                模型列表 ({models.length})
              </span>
            </label>

            {/* 添加模型输入 */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyDown={handleModelKeyDown}
                placeholder="输入模型名称，回车添加..."
                className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] transition-all"
                style={{ fontSize: "0.78rem" }}
              />
              <button
                onClick={handleAddModel}
                disabled={!newModelName.trim()}
                className="px-3 py-2 rounded-lg bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontSize: "0.78rem" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 模型列表 */}
            {models.length > 0 ? (
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {models.map((modelName) => (
                  <div
                    key={modelName}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.08)] group"
                  >
                    <span className="text-[rgba(224,240,255,0.8)] truncate" style={{ fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
                      {modelName}
                    </span>
                    <button
                      onClick={() => handleRemoveModel(modelName)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,51,102,0.1)] transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-[rgba(255,51,102,0.5)]" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[rgba(0,212,255,0.25)] text-center py-2" style={{ fontSize: "0.7rem" }}>
                {editingProvider?.id === "ollama" ? "Ollama 模型从本地自动检测" : "暂无模型，请添加"}
              </p>
            )}
          </div>

          {/* ===== Divider ===== */}
          <div className="h-px bg-[rgba(0,180,255,0.1)]" />

          {/* ===== Actions ===== */}
          <div className="flex gap-2">
            {/* 重置按钮 (仅内置服务商) */}
            {isBuiltin && onReset && (
              <button
                onClick={() => {
                  onReset(editingProvider!.id);
                  onClose();
                }}
                className="px-4 py-3 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.15)] transition-all"
                style={{ fontSize: "0.82rem" }}
              >
                <RotateCcw className="w-4 h-4 inline mr-1.5" />
                恢复默认
              </button>
            )}

            {/* 保存按钮 */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                canSubmit
                  ? "bg-[rgba(0,140,200,0.8)] hover:bg-[rgba(0,160,220,0.9)] text-white shadow-[0_0_20px_rgba(0,140,200,0.3)]"
                  : "bg-[rgba(0,80,120,0.3)] text-[rgba(0,212,255,0.3)] cursor-not-allowed"
              }`}
              style={{ fontSize: "0.9rem" }}
            >
              <Save className="w-4 h-4" />
              {isEditing ? "保存修改" : "添加服务商"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
