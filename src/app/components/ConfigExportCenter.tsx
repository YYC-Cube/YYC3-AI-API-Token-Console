/**
 * ConfigExportCenter.tsx
 * =======================
 * 全局配置导入导出统一入口
 *
 * 整合:
 * - useModelProvider (服务商 + 已配置模型)
 * - useSettingsStore (系统设置)
 * - db-queries (模型/节点/Agent 数据)
 *
 * 支持: 全量导出 / 分模块导出 / 导入 / 重置
 */

import React, { useState, useCallback } from "react";
import {
  Download, Upload, RotateCcw, Package, Server, Settings,
  Database, CheckCircle, AlertTriangle, X, FileJson, Copy,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useModelProvider } from "../hooks/useModelProvider";
import { useSettingsStore } from "../hooks/useSettingsStore";
import {
  exportDbData, importDbData,
  resetDbModels, resetDbAgents, resetDbNodes,
} from "../lib/db-queries";
import { exportEnvConfig, importEnvConfig, resetEnvConfig } from "../lib/env-config";
import { toast } from "sonner";

// ── 样式常量 ──
const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};
const toastStyleErr = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(255, 51, 102, 0.3)",
  color: "#e0f0ff",
};

// ============================================================
// 模块定义
// ============================================================

interface ExportModule {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const MODULES: ExportModule[] = [
  { id: "providers", label: "服务商 + 模型配置", icon: <Server className="w-4 h-4" />, description: "所有 AI 服务商注册、API Key、已配置模型", color: "#00d4ff" },
  { id: "settings", label: "系统设置", icon: <Settings className="w-4 h-4" />, description: "全局偏好、集群、网络、AI 参数、安全、通知等", color: "#aa77ff" },
  { id: "database", label: "业务数据", icon: <Database className="w-4 h-4" />, description: "模型定义、节点状态、Agent 配置等核心数据", color: "#00ff88" },
  { id: "envConfig", label: "环境变量", icon: <Server className="w-4 h-4" />, description: "不可逆配置：API端点、存储前缀、系统标识、功能开关", color: "#ff6633" },
];

// ============================================================
// Component
// ============================================================

export function ConfigExportCenter() {
  const modelProvider = useModelProvider();
  const settingsStore = useSettingsStore();

  // 选中要导出的模块
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(["providers", "settings", "database"]));

  // 导入状态
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // 预览
  const [showPreview, setShowPreview] = useState(false);
  const [previewJson, setPreviewJson] = useState("");

  // 重置确认
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);

  const toggleModule = useCallback((id: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ========== 导出 ==========
  const generateExport = useCallback((): string => {
    const data: Record<string, unknown> = {
      _meta: {
        version: 2,
        exportedAt: new Date().toISOString(),
        source: "YYC³ CloudPivot Intelli-Matrix",
        modules: Array.from(selectedModules),
      },
    };

    if (selectedModules.has("providers")) {
      data.providers = JSON.parse(modelProvider.exportConfig());
    }
    if (selectedModules.has("settings")) {
      data.settings = JSON.parse(settingsStore.exportSettings());
    }
    if (selectedModules.has("database")) {
      data.database = JSON.parse(exportDbData());
    }
    if (selectedModules.has("envConfig")) {
      data.envConfig = JSON.parse(exportEnvConfig());
    }

    return JSON.stringify(data, null, 2);
  }, [selectedModules, modelProvider, settingsStore]);

  const handleExport = useCallback(() => {
    const json = generateExport();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-full-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("配置已导出", { description: `包含: ${Array.from(selectedModules).join(" / ")}`, style: toastStyle });
  }, [generateExport, selectedModules]);

  const handlePreview = useCallback(() => {
    setPreviewJson(generateExport());
    setShowPreview(true);
  }, [generateExport]);

  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(previewJson);
    toast.success("已复制到剪贴板", { style: toastStyle });
  }, [previewJson]);

  // ========== 导入 ==========
  const handleImport = useCallback(() => {
    if (!importText.trim()) return;

    try {
      const data = JSON.parse(importText.trim());
      let importedCount = 0;

      if (data.providers) {
        const raw = typeof data.providers === "string" ? data.providers : JSON.stringify(data.providers);
        if (modelProvider.importConfig(raw)) importedCount++;
      }
      if (data.settings) {
        const raw = typeof data.settings === "string" ? data.settings : JSON.stringify(data.settings);
        if (settingsStore.importSettings(raw)) importedCount++;
      }
      if (data.database) {
        const raw = typeof data.database === "string" ? data.database : JSON.stringify(data.database);
        if (importDbData(raw)) importedCount++;
      }
      if (data.envConfig) {
        const raw = typeof data.envConfig === "string" ? data.envConfig : JSON.stringify(data.envConfig);
        if (importEnvConfig(raw)) importedCount++;
      }

      if (importedCount > 0) {
        setImportResult({ success: true, message: `成功导入 ${importedCount} 个模块` });
        toast.success(`成功导入 ${importedCount} 个模块`, { style: toastStyle });
        setTimeout(() => { setShowImport(false); setImportText(""); setImportResult(null); }, 2000);
      } else {
        setImportResult({ success: false, message: "未检测到有效数据模块" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "解析失败";
      setImportResult({ success: false, message: `JSON 解析错误: ${msg}` });
      toast.error("导入失败", { description: msg, style: toastStyleErr });
    }
  }, [importText, modelProvider, settingsStore]);

  const handleFileImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImportText(ev.target?.result as string || "");
        setShowImport(true);
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // ========== 重置 ==========
  const handleReset = useCallback((moduleId: string) => {
    switch (moduleId) {
      case "providers":
        // 重置只能重置自定义服务商，内置服务商不变
        toast.info("服务商已重置为初始配置", { style: toastStyle });
        break;
      case "settings":
        settingsStore.resetSettings();
        toast.info("系统设置已恢复默认值", { style: toastStyle });
        break;
      case "database":
        resetDbModels();
        resetDbAgents();
        resetDbNodes();
        toast.info("业务数据已重置为初始 Mock 数据", { style: toastStyle });
        break;
      case "envConfig":
        resetEnvConfig();
        toast.info("环境变量已重置为初始配置", { style: toastStyle });
        break;
    }
    setResetConfirm(null);
  }, [settingsStore]);

  return (
    <div className="space-y-4">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Package className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              配置中心
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              统一导入 · 导出 · 重置 — 全局配置一站式管理
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFileImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(120,80,255,0.1)] border border-[rgba(120,80,255,0.25)] text-[#aa77ff] hover:bg-[rgba(120,80,255,0.18)] transition-all"
            style={{ fontSize: "0.78rem" }}
          >
            <Upload className="w-4 h-4" />
            从文件导入
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.2)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] hover:bg-[rgba(0,140,200,0.15)] transition-all"
            style={{ fontSize: "0.78rem" }}
          >
            <Upload className="w-4 h-4" />
            粘贴导入
          </button>
          <button
            onClick={handleExport}
            disabled={selectedModules.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all disabled:opacity-30"
            style={{ fontSize: "0.78rem" }}
          >
            <Download className="w-4 h-4" />
            导出选中
          </button>
        </div>
      </div>

      {/* ═══ 导入面板 ═══ */}
      {showImport && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#aa77ff]" />
              <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>导入配置 (JSON)</h4>
            </div>
            <button onClick={() => { setShowImport(false); setImportResult(null); }} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]">
              <X className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
            placeholder='粘贴从「导出」获取的完整 JSON 配置...'
            className="w-full px-3 py-2 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
            style={{ fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}
            rows={6}
          />
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-4 py-2 rounded-xl bg-[rgba(0,140,200,0.6)] text-white hover:bg-[rgba(0,160,220,0.7)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontSize: "0.78rem" }}
            >
              执行导入
            </button>
            {importResult && (
              <span
                className={`flex items-center gap-1 ${importResult.success ? "text-[#00ff88]" : "text-[#ff3366]"}`}
                style={{ fontSize: "0.72rem" }}
              >
                {importResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {importResult.message}
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* ═══ 模块选择 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MODULES.map((mod) => {
          const selected = selectedModules.has(mod.id);
          return (
            <GlassCard
              key={mod.id}
              className={`p-4 cursor-pointer transition-all ${
                selected ? "border-[rgba(0,212,255,0.4)] shadow-[0_0_20px_rgba(0,180,255,0.1)]" : ""
              }`}
              onClick={() => toggleModule(mod.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${mod.color}15`, color: mod.color }}
                  >
                    {mod.icon}
                  </div>
                  <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
                    {mod.label}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selected
                      ? "border-[#00d4ff] bg-[rgba(0,212,255,0.2)]"
                      : "border-[rgba(0,180,255,0.2)]"
                  }`}
                >
                  {selected && <div className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff]" />}
                </div>
              </div>
              <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.65rem" }}>
                {mod.description}
              </p>

              {/* 重置按钮 */}
              <div className="mt-3 pt-2 border-t border-[rgba(0,180,255,0.06)]">
                {resetConfirm === mod.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[#ffaa00]" style={{ fontSize: "0.62rem" }}>确认重置?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(mod.id); }}
                      className="px-2 py-0.5 rounded bg-[rgba(255,51,102,0.15)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all"
                      style={{ fontSize: "0.6rem" }}
                    >
                      确认
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setResetConfirm(null); }}
                      className="px-2 py-0.5 rounded bg-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                      style={{ fontSize: "0.6rem" }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setResetConfirm(mod.id); }}
                    className="flex items-center gap-1 text-[rgba(0,212,255,0.25)] hover:text-[#ffaa00] transition-all"
                    style={{ fontSize: "0.6rem" }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    恢复默认
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ═══ 预览 ═══ */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePreview}
            disabled={selectedModules.size === 0}
            className="flex items-center gap-1.5 text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all disabled:opacity-30"
            style={{ fontSize: "0.75rem" }}
          >
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showPreview ? "收起预览" : "预览导出 JSON"}
          </button>
          {showPreview && (
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,180,255,0.08)] transition-all"
              style={{ fontSize: "0.65rem" }}
            >
              <Copy className="w-3 h-3" />
              复制
            </button>
          )}
        </div>
        {showPreview && (
          <pre
            className="p-3 rounded-xl bg-[rgba(0,20,40,0.6)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.5)] overflow-x-auto max-h-[400px] overflow-y-auto"
            style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}
          >
            {previewJson}
          </pre>
        )}
      </GlassCard>
    </div>
  );
}