/**
 * settings/shared.tsx — SystemSettings 拆分共享层 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: Toggle / EditableField / 分区配置 / 分区 Props 契约
 */
import {
  Bell, Code, Cpu, Database, Edit2, Eye, EyeOff, Globe, Monitor,
  Server, Settings, Shield, Sliders, Terminal, Wifi,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { SettingsToggles, SettingsValues } from "../../hooks/useSettingsStore";

/** 主壳 → 分区组件的统一 Props 契约 */
export interface SettingsSectionProps {
  settings: SettingsToggles;
  values: SettingsValues;
  updateValue: (key: keyof SettingsValues, val: string) => void;
  toggleSetting: (key: keyof SettingsToggles) => void;
}

/** 设置分区清单 (侧栏) */
export const settingsSections: Array<{ id: string; labelKey: string; icon: LucideIcon }> = [
  { id: "general", labelKey: "settings.general", icon: Settings },
  { id: "network", labelKey: "settings.network", icon: Globe },
  { id: "cluster", labelKey: "settings.cluster", icon: Server },
  { id: "model", labelKey: "settings.model", icon: Cpu },
  { id: "storage", labelKey: "settings.storage", icon: Database },
  { id: "websocket", labelKey: "settings.websocket", icon: Wifi },
  { id: "ai", labelKey: "settings.aiLlm", icon: Sliders },
  { id: "pwa", labelKey: "settings.pwaOffline", icon: Monitor },
  { id: "security", labelKey: "settings.security", icon: Shield },
  { id: "notification", labelKey: "settings.notification", icon: Bell },
  { id: "env", labelKey: "settings.envVars", icon: Terminal },
  { id: "advanced", labelKey: "settings.advanced", icon: Code },
];

// ============================================================
// Toggle 开关
// ============================================================

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

export function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled
        ? "bg-[rgba(0,212,255,0.3)] border border-[rgba(0,212,255,0.5)]"
        : "bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)]"
        }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${enabled
        ? "left-[22px] bg-[#00d4ff] shadow-[0_0_10px_rgba(0,212,255,0.5)]"
        : "left-0.5 bg-[rgba(0,180,255,0.3)]"
        }`} />
    </button>
  );
}

// ============================================================
// 可编辑字段
// ============================================================

interface EditableFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
  type?: "text" | "number" | "password" | "url" | "email";
  placeholder?: string;
  mono?: boolean;
}

export function EditableField({ label, description, value, onChange, type = "text", placeholder, mono }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{label}</p>
        <button
          onClick={() => setEditing(!editing)}
          className={`p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all ${editing ? "text-[#00d4ff]" : "text-[rgba(0,212,255,0.3)]"}`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {description && (
        <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.68rem" }}>{description}</p>
      )}
      {editing ? (
        <div className="relative">
          <input
            type={type === "password" && !showPwd ? "password" : "text"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] focus:outline-none focus:shadow-[0_0_10px_rgba(0,180,255,0.1)] ${mono ? "font-mono" : ""}`}
            style={{ fontSize: "0.8rem" }}
            autoFocus
          />
          {type === "password" && (
            <button
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(0,212,255,0.1)]"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /> : <Eye className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />}
            </button>
          )}
        </div>
      ) : (
        <span className={`text-[rgba(0,212,255,0.6)] ${mono ? "font-mono" : ""}`} style={{ fontSize: "0.78rem" }}>
          {type === "password" ? "••••••••" : (value || "-")}
        </span>
      )}
    </div>
  );
}
