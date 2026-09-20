/**
 * ModelProviderPanel.tsx
 * =======================
 * AI 模型提供商管理面板 · 路由: /models
 *
 * 功能:
 * - 服务商管理 (查看 / 编辑 / 添加自定义 / 删除)
 * - 已配置模型列表 (添加 / 删除 / 测试连接)
 * - Ollama 本地模型状态
 * - 配置导入/导出
 */

import React, { useContext, useState } from "react";
import {
  Plus, Trash2, Plug, Server, Cpu,
  CheckCircle, AlertCircle, HelpCircle, RefreshCw,
  Edit3, Download, Upload, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { AddModelModal } from "./AddModelModal";
import { ProviderEditorModal } from "./ProviderEditorModal";
import { useModelProvider } from "../hooks/useModelProvider";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)}MB`;
  return `${bytes}B`;
}

export function ModelProviderPanel() {
  const view = useContext(ViewContext);
  const { t } = useI18n();
  const isMobile = view?.isMobile ?? false;

  const {
    providers,
    configuredModels,
    ollamaModels,
    ollamaLoading,
    ollamaError,
    stats,
    modalOpen,
    openModal,
    closeModal,
    addModel,
    removeModel,
    testConnection,
    fetchOllamaModels,
    addProvider,
    updateProvider,
    removeProvider,
    resetProvider,
    addModelToProvider,
    removeModelFromProvider,
    exportConfig,
    importConfig,
  } = useModelProvider();

  // Provider editor modal state
  const [providerEditorOpen, setProviderEditorOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<typeof providers[0] | null>(null);

  // Provider list expand
  const [showProviderList, setShowProviderList] = useState(false);

  // Import/export state
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const statusConfig = {
    active:    { color: "#00ff88", icon: CheckCircle, label: t("modelProvider.statusActive") },
    error:     { color: "#ff3366", icon: AlertCircle, label: t("modelProvider.statusError") },
    unchecked: { color: "rgba(0,212,255,0.3)", icon: HelpCircle, label: t("modelProvider.statusUnchecked") },
  };

  // Handle export
  const handleExport = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-model-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = () => {
    if (!importText.trim()) return;
    const success = importConfig(importText.trim());
    setImportResult(success ? "导入成功" : "导入失败，请检查 JSON 格式");
    if (success) {
      setImportText("");
      setTimeout(() => { setShowImport(false); setImportResult(null); }, 1500);
    }
  };

  return (
    <div className="space-y-4" data-testid="model-provider-panel">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("modelProvider.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("modelProvider.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 导入/导出 */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,140,200,0.15)] transition-all"
            style={{ fontSize: "0.72rem" }}
            title="导出配置"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,140,200,0.15)] transition-all"
            style={{ fontSize: "0.72rem" }}
            title="导入配置"
          >
            <Upload className="w-3.5 h-3.5" />
            导入
          </button>

          {/* 添加自定义服务商 */}
          <button
            onClick={() => { setEditingProvider(null); setProviderEditorOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(120,80,255,0.1)] border border-[rgba(120,80,255,0.25)] text-[#aa77ff] hover:bg-[rgba(120,80,255,0.18)] transition-all"
            style={{ fontSize: "0.78rem" }}
          >
            <Server className="w-4 h-4" />
            自定义服务商
          </button>

          {/* 添加模型 */}
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all"
            style={{ fontSize: "0.78rem" }}
            data-testid="open-add-model"
          >
            <Plus className="w-4 h-4" />
            {t("modelProvider.addModel")}
          </button>
        </div>
      </div>

      {/* ======== Import Panel ======== */}
      {showImport && (
        <GlassCard className="p-4">
          <h4 className="text-[#e0f0ff] mb-2 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
            <Upload className="w-4 h-4 text-[#00d4ff]" />
            导入配置 (JSON)
          </h4>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='粘贴从「导出」获取的 JSON 配置...'
            className="w-full px-3 py-2 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
            style={{ fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}
            rows={4}
          />
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-4 py-2 rounded-lg bg-[rgba(0,140,200,0.6)] text-white hover:bg-[rgba(0,160,220,0.7)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontSize: "0.78rem" }}
            >
              执行导入
            </button>
            {importResult && (
              <span
                className={importResult.includes("成功") ? "text-[#00ff88]" : "text-[#ff3366]"}
                style={{ fontSize: "0.72rem" }}
              >
                {importResult}
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* ======== Stats ======== */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.total}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
            {t("modelProvider.totalModels")}
          </p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#00ff88]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.active}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
            {t("modelProvider.activeModels")}
          </p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#7b2ff7]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.totalProviders}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
            服务商总数
          </p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ffaa00]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.ollamaCount}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
            {t("modelProvider.ollamaModels")}
          </p>
        </GlassCard>
      </div>

      {/* ======== API 网关/全链路契约速查与 52 端点 ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-[#00d4ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              API 网关全链路契约 (52 端点已冻结)
            </h3>
            <span className="px-2 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88]" style={{ fontSize: "0.58rem" }}>
              43 个直连 (82.7%)
            </span>
          </div>
          <a
            href="https://api.0379.world/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.65rem" }}
          >
            查看 OpenAPI JSON ↗
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)]">
            <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>对话与 WebSocket</p>
            <p className="text-[#e0f0ff] font-mono mt-0.5" style={{ fontSize: "0.68rem" }}>POST /v1/chat/completions</p>
            <p className="text-[rgba(0,255,136,0.6)] font-mono" style={{ fontSize: "0.58rem" }}>WS /ws/chat & /ws/monitor</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)]">
            <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>模型与上游路由池</p>
            <p className="text-[#e0f0ff] font-mono mt-0.5" style={{ fontSize: "0.68rem" }}>GET /v1/models & /stats</p>
            <p className="text-[#aa77ff] font-mono" style={{ fontSize: "0.58rem" }}>GET /v1/router/stats & /health</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)]">
            <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>知识库 RAG & MCP 工具集</p>
            <p className="text-[#e0f0ff] font-mono mt-0.5" style={{ fontSize: "0.68rem" }}>/v1/knowledge-bases (9端点)</p>
            <p className="text-[#ffaa00] font-mono" style={{ fontSize: "0.58rem" }}>/v1/mcp/* (14端点)</p>
          </div>
        </div>
      </GlassCard>

      {/* ======== 服务商注册表 ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#aa77ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              服务商注册表 ({providers.length})
            </h3>
            {stats.customProviders > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[rgba(120,80,255,0.1)] text-[#aa77ff]" style={{ fontSize: "0.55rem" }}>
                {stats.customProviders} 自定义
              </span>
            )}
          </div>
          <button
            onClick={() => setShowProviderList(!showProviderList)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.65rem" }}
          >
            {showProviderList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showProviderList ? "收起" : "展开"}
          </button>
        </div>

        {showProviderList && (
          <div className="space-y-1.5">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all group"
              >
                {/* 状态指示 */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: p.isLocal ? "#00ff88" : "#00d4ff",
                    boxShadow: `0 0 6px ${p.isLocal ? "rgba(0,255,136,0.4)" : "rgba(0,212,255,0.3)"}`,
                  }}
                />

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.78rem" }}>
                      {p.label}
                    </span>
                    {p.isBuiltin && (
                      <span className="px-1 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.5rem" }}>
                        内置
                      </span>
                    )}
                    {p.isCustom && (
                      <span className="px-1 py-0.5 rounded bg-[rgba(120,80,255,0.08)] text-[#aa77ff]" style={{ fontSize: "0.5rem" }}>
                        自定义
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[rgba(0,212,255,0.2)] truncate" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.baseUrl}
                    </span>
                    <span className="text-[rgba(0,212,255,0.15)]" style={{ fontSize: "0.55rem" }}>
                      · {p.models.length} 模型 · {p.authType}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingProvider(p); setProviderEditorOpen(true); }}
                    className="p-1.5 rounded-lg hover:bg-[rgba(0,180,255,0.08)] transition-all"
                    title="编辑服务商"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                  </button>
                  {!p.isBuiltin && (
                    <button
                      onClick={() => removeProvider(p.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,51,102,0.08)] transition-all"
                      title="删除服务商"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!showProviderList && (
          <div className="flex items-center gap-2 flex-wrap">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => { setEditingProvider(p); setProviderEditorOpen(true); }}
                className="px-2.5 py-1.5 rounded-lg bg-[rgba(0,40,80,0.1)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all flex items-center gap-1.5"
                style={{ fontSize: "0.68rem" }}
              >
                {p.isLocal ? (
                  <Server className="w-3 h-3 text-[#00ff88]" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
                {p.label}
                {p.isCustom && <span className="text-[#aa77ff]">*</span>}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ======== Ollama 本地模型 ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              {t("modelProvider.ollamaLocal")}
            </h3>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.6rem" }}>
              {providers.find((p) => p.id === "ollama")?.baseUrl || "http://localhost:11434"}
            </span>
          </div>
          <button
            onClick={() => fetchOllamaModels()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.65rem" }}
            disabled={ollamaLoading}
            data-testid="refresh-ollama-models"
          >
            <RefreshCw className={`w-3 h-3 ${ollamaLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
        </div>

        {ollamaModels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ollamaModels.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                data-testid={`ollama-model-${m.name}`}
              >
                <div className="w-2 h-2 rounded-full bg-[#00ff88] shrink-0" style={{ boxShadow: "0 0 6px rgba(0,255,136,0.4)" }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[#e0f0ff] truncate block" style={{ fontSize: "0.78rem" }}>
                    {m.name}
                  </span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>
                    {m.details.family} · {m.details.parameter_size} · {m.details.quantization_level} · {formatSize(m.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[rgba(0,212,255,0.25)] text-center py-3" style={{ fontSize: "0.75rem" }}>
            {ollamaLoading ? t("modelProvider.loadingModels") : t("modelProvider.noOllamaModels")}
          </p>
        )}

        {ollamaError && (
          <p className="text-[#ffaa00] mt-2" style={{ fontSize: "0.62rem" }}>
            {ollamaError}
          </p>
        )}
      </GlassCard>

      {/* ======== 已配置模型 ======== */}
      <GlassCard className="p-4">
        <h3 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.88rem" }}>
          {t("modelProvider.configuredModels")}
        </h3>

        {configuredModels.length > 0 ? (
          <div className="space-y-1.5">
            {configuredModels.map((cm) => {
              const stCfg = statusConfig[cm.status];
              const StIcon = stCfg.icon;
              return (
                <div
                  key={cm.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                  data-testid={`configured-model-${cm.id}`}
                >
                  <StIcon className="w-4 h-4 shrink-0" style={{ color: stCfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                        {cm.model}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ fontSize: "0.55rem", color: "#00d4ff", backgroundColor: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}
                      >
                        {cm.providerLabel}
                      </span>
                    </div>
                    <span className="text-[rgba(0,212,255,0.2)] block" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                      {cm.baseUrl}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => testConnection(cm.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(0,180,255,0.08)] transition-all"
                      title={t("modelProvider.testConnection")}
                    >
                      <Plug className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                    </button>
                    <button
                      onClick={() => removeModel(cm.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,51,102,0.08)] transition-all"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Cpu className="w-8 h-8 text-[rgba(0,212,255,0.15)] mx-auto mb-2" />
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.78rem" }}>
              {t("modelProvider.noConfigured")}
            </p>
            <p className="text-[rgba(0,212,255,0.15)] mt-1" style={{ fontSize: "0.65rem" }}>
              {t("modelProvider.noConfiguredHint")}
            </p>
          </div>
        )}
      </GlassCard>

      {/* ======== AddModelModal ======== */}
      <AddModelModal
        isOpen={modalOpen}
        onClose={closeModal}
        providers={providers}
        ollamaModels={ollamaModels}
        ollamaLoading={ollamaLoading}
        ollamaError={ollamaError}
        onFetchOllama={fetchOllamaModels}
        onAdd={addModel}
        onAddModelToProvider={addModelToProvider}
      />

      {/* ======== ProviderEditorModal ======== */}
      <ProviderEditorModal
        isOpen={providerEditorOpen}
        onClose={() => { setProviderEditorOpen(false); setEditingProvider(null); }}
        editingProvider={editingProvider}
        onSave={addProvider}
        onUpdate={updateProvider}
        onReset={resetProvider}
      />
    </div>
  );
}
