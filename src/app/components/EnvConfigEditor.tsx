/**
 * EnvConfigEditor.tsx
 * ====================
 * 环境变量 UI 编辑面板 · 路由: /env-config
 *
 * 功能:
 * - 所有 env-config.ts 变量可视化展示 + 编辑
 * - 分组: 系统标识 / 网络端点 / 存储 / AI / 安全 / 功能开关
 * - 每项: 内联编辑 + 类型校验 + 不可逆标记
 * - 批量操作: 重置全部 / 导出 JSON / 导入 JSON
 * - localStorage 实时持久化
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Server, Globe, HardDrive, Brain, Shield, ToggleLeft,
  Save, RotateCcw, Download, Upload, Edit3, Check, X,
  AlertTriangle, Copy, Info,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import {
  getEnvConfig, setEnvConfig, resetEnvConfig,
  exportEnvConfig, importEnvConfig, type EnvConfig,
} from "../lib/env-config";
import { toast } from "sonner";

const f = { xs: "0.62rem", sm: "0.72rem", md: "0.82rem", lg: "0.95rem" };

// ── 分组定义 ──

interface FieldDef {
  key: keyof EnvConfig;
  label: string;
  desc: string;
  irreversible?: boolean;
}

interface GroupDef {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  fields: FieldDef[];
}

const GROUPS: GroupDef[] = [
  {
    id: "system", title: "系统标识", icon: <Server className="w-4 h-4" />, color: "#00d4ff",
    fields: [
      { key: "SYSTEM_NAME", label: "系统名称", desc: "Dashboard 标题栏显示", irreversible: true },
      { key: "SYSTEM_VERSION", label: "版本号", desc: "CLI / 关于页面版本号", irreversible: true },
      { key: "SYSTEM_BUILD", label: "构建日期", desc: "发布日期标记" },
      { key: "CLUSTER_ID", label: "集群 ID", desc: "集群唯一标识符" },
      { key: "NODE_ENV", label: "运行环境", desc: "development / production" },
    ],
  },
  {
    id: "network", title: "网络端点", icon: <Globe className="w-4 h-4" />, color: "#ff6633",
    fields: [
      { key: "API_BASE_URL", label: "API 基础 URL", desc: "后端 REST API 地址", irreversible: true },
      { key: "WS_ENDPOINT", label: "WebSocket 端点", desc: "实时推送连接地址", irreversible: true },
      { key: "OLLAMA_BASE_URL", label: "Ollama 地址", desc: "本地大模型推理地址", irreversible: true },
    ],
  },
  {
    id: "storage", title: "存储配置", icon: <HardDrive className="w-4 h-4" />, color: "#aa77ff",
    fields: [
      { key: "STORAGE_PREFIX", label: "存储键前缀", desc: "localStorage key 前缀 (修改后旧数据丢失)", irreversible: true },
      { key: "IDB_NAME", label: "IndexedDB 名称", desc: "本地数据库名 (修改后旧数据丢失)", irreversible: true },
      { key: "IDB_VERSION", label: "IDB 版本号", desc: "数据库迁移版本" },
    ],
  },
  {
    id: "ai", title: "AI 默认配置", icon: <Brain className="w-4 h-4" />, color: "#00ff88",
    fields: [
      { key: "DEFAULT_AI_BASE_URL", label: "AI API URL", desc: "默认 AI 服务端点" },
      { key: "DEFAULT_AI_MODEL", label: "默认模型", desc: "默认使用的 AI 模型" },
      { key: "DEFAULT_AI_TEMPERATURE", label: "Temperature", desc: "生成随机性 (0-2)" },
      { key: "DEFAULT_AI_MAX_TOKENS", label: "Max Tokens", desc: "最大输出 Token 数" },
      { key: "DEFAULT_AI_TIMEOUT", label: "超时时间", desc: "请求超时 (ms)" },
    ],
  },
  {
    id: "security", title: "安全配置", icon: <Shield className="w-4 h-4" />, color: "#ff3366",
    fields: [
      { key: "SESSION_TIMEOUT_MIN", label: "会话超时", desc: "登录会话过期时间 (分钟)" },
      { key: "MAX_LOGIN_ATTEMPTS", label: "最大登录尝试", desc: "连续失败锁定阈值" },
      { key: "CORS_ORIGINS", label: "CORS 白名单", desc: "允许的跨域来源 (逗号分隔)" },
    ],
  },
  {
    id: "features", title: "功能开关", icon: <ToggleLeft className="w-4 h-4" />, color: "#ffaa00",
    fields: [
      { key: "ENABLE_MOCK_MODE", label: "Mock 模式", desc: "启用模拟数据 (关闭后需真实后端)" },
      { key: "ENABLE_DEBUG", label: "调试模式", desc: "启用 console.debug 输出" },
      { key: "ENABLE_PWA", label: "PWA 支持", desc: "启用 Service Worker 离线缓存" },
      { key: "ENABLE_ELECTRON_IPC", label: "Electron IPC", desc: "启用桌面端 IPC 通信" },
    ],
  },
];

// ============================================================
// FieldRow 行级编辑组件
// ============================================================

function FieldRow({ field, value, onSave }: {
  field: FieldDef;
  value: string | number | boolean;
  onSave: (key: keyof EnvConfig, val: string | number | boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => { setEditing(false); setDraft(String(value)); };

  const confirmEdit = () => {
    let newVal: string | number | boolean;
    if (typeof value === "boolean") {
      newVal = draft === "true" || draft === "1";
    } else if (typeof value === "number") {
      newVal = draft.includes(".") ? parseFloat(draft) : parseInt(draft, 10);
      if (isNaN(newVal as number)) { toast.error("无效数值"); return; }
    } else {
      newVal = draft;
    }
    onSave(field.key, newVal);
    setEditing(false);
  };

  const copyValue = () => {
    navigator.clipboard.writeText(String(value));
    toast.success(`已复制: ${field.key}`);
  };

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[rgba(0,40,80,0.1)] transition-all group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {field.irreversible && <AlertTriangle className="w-3 h-3 text-[#ff6633] shrink-0" />}
            <span className="text-[#e0f0ff] truncate" style={{ fontSize: f.sm }}>{field.label}</span>
            <span className="text-[rgba(0,212,255,0.2)] hidden md:inline" style={{ fontSize: "0.55rem" }}>{field.key}</span>
          </div>
          <p className="text-[rgba(0,212,255,0.25)] truncate" style={{ fontSize: "0.55rem" }}>{field.desc}</p>
        </div>
        <button
          onClick={() => onSave(field.key, !value)}
          className={`px-3 py-1 rounded-lg transition-all ${
            value
              ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]"
              : "bg-[rgba(255,51,102,0.06)] text-[#ff6688] border border-[rgba(255,51,102,0.12)]"
          }`}
          style={{ fontSize: f.xs }}
        >
          {value ? "已启用" : "已关闭"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[rgba(0,40,80,0.1)] transition-all group">
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-1.5">
          {field.irreversible && <AlertTriangle className="w-3 h-3 text-[#ff6633] shrink-0" />}
          <span className="text-[#e0f0ff] truncate" style={{ fontSize: f.sm }}>{field.label}</span>
          <span className="text-[rgba(0,212,255,0.2)] hidden md:inline" style={{ fontSize: "0.55rem" }}>{field.key}</span>
        </div>
        <p className="text-[rgba(0,212,255,0.25)] truncate" style={{ fontSize: "0.55rem" }}>{field.desc}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
              className="w-40 md:w-56 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[#00d4ff] text-[#e0f0ff] outline-none font-mono"
              style={{ fontSize: f.xs }}
            />
            <button onClick={confirmEdit} className="p-1 rounded text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={cancelEdit} className="p-1 rounded text-[#ff6688] hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5" /></button>
          </>
        ) : (
          <>
            <span className="font-mono text-[rgba(224,240,255,0.7)] max-w-40 md:max-w-56 truncate" style={{ fontSize: f.xs }}>{String(value)}</span>
            <button onClick={copyValue} className="p-1 rounded text-[rgba(0,212,255,0.2)] hover:text-[#00d4ff] opacity-0 group-hover:opacity-100 transition-all"><Copy className="w-3 h-3" /></button>
            <button onClick={startEdit} className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] opacity-0 group-hover:opacity-100 transition-all"><Edit3 className="w-3 h-3" /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function EnvConfigEditor() {
  const [config, setConfig] = useState<EnvConfig>(() => getEnvConfig());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUPS.map((g) => g.id)));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback((key: keyof EnvConfig, val: string | number | boolean) => {
    const updated = setEnvConfig({ [key]: val } as Partial<EnvConfig>);
    setConfig(updated);
    toast.success(`${key} 已更新`);
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("确认重置所有环境变量为默认值？\n此操作将清除 localStorage 中的覆盖配置。")) return;
    const result = resetEnvConfig();
    setConfig(result);
    toast.info("环境变量已重置为默认值");
  }, []);

  const handleExport = useCallback(() => {
    const json = exportEnvConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-env-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("环境变量已导出");
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importEnvConfig(text)) {
        setConfig(getEnvConfig());
        toast.success("环境变量已导入");
      } else {
        toast.error("导入失败: JSON 格式错误");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const irreversibleCount = GROUPS.flatMap((g) => g.fields).filter((f) => f.irreversible).length;

  return (
    <div className="space-y-4" data-testid="env-config-editor">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,102,51,0.1)] flex items-center justify-center">
            <Server className="w-5 h-5 text-[#ff6633]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: f.lg }}>环境变量管理</h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: f.xs }}>
              {Object.keys(config).length} 项配置 · {irreversibleCount} 项不可逆 · localStorage 持久化
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)] text-[#ff6688] hover:bg-[rgba(255,51,102,0.1)] transition-all"
            style={{ fontSize: f.sm }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.08)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: f.sm }}
          >
            <Upload className="w-3.5 h-3.5" /> 导入
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,140,200,0.1)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.15)] transition-all"
            style={{ fontSize: f.sm }}
          >
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
        </div>
      </div>

      {/* 不可逆提示 */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[rgba(255,102,51,0.04)] border border-[rgba(255,102,51,0.1)]">
        <AlertTriangle className="w-4 h-4 text-[#ff6633] mt-0.5 shrink-0" />
        <div>
          <p className="text-[#ff9966]" style={{ fontSize: f.xs }}>
            标有 ⚠ 的变量为不可逆配置 — 修改后可能导致数据不兼容或丢失。所有变量通过 <code className="bg-[rgba(0,40,80,0.3)] px-1 py-0.5 rounded text-[#00d4ff]">env()</code> 函数读取，优先级: import.meta.env &gt; localStorage &gt; 默认值。
          </p>
          <p className="text-[rgba(0,212,255,0.25)] mt-0.5" style={{ fontSize: "0.55rem" }}>
            终端命令: env list / env get KEY / env set KEY VALUE / env reset --confirm / env export
          </p>
        </div>
      </div>

      {/* 分组卡片 */}
      {GROUPS.map((group) => (
        <GlassCard key={group.id} className="overflow-hidden">
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-[rgba(0,40,80,0.06)] transition-all"
          >
            <div className="flex items-center gap-2">
              <span style={{ color: group.color }}>{group.icon}</span>
              <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>{group.title}</span>
              <span className="px-1.5 py-0.5 rounded bg-[rgba(0,40,80,0.2)] text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.55rem" }}>
                {group.fields.length} 项
              </span>
            </div>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: f.xs }}>
              {expandedGroups.has(group.id) ? "▼" : "▶"}
            </span>
          </button>
          {expandedGroups.has(group.id) && (
            <div className="border-t border-[rgba(0,180,255,0.06)] px-1 py-1">
              {group.fields.map((field) => (
                <FieldRow key={field.key} field={field} value={config[field.key]} onSave={handleSave} />
              ))}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}
