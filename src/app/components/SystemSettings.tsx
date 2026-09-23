/**
 * SystemSettings.tsx — 主壳 (§6.6 Facade+Siblings)
 * =================================================
 * 设置分区已拆分至 settings/ 领域 sibling; 本组件仅负责:
 * 侧栏导航 + 分区路由 (switch 委派) + 保存/重置操作条。
 * 新增分区请放 settings/ 对应 sibling, 禁止回填本文件。
 */
import { RefreshCw, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "../hooks/useI18n";
import { useSettingsStore } from "../hooks/useSettingsStore";
import { GlassCard } from "./GlassCard";
import { ModelManagementSection } from "./settings/ModelManagementSection";
import { AdvancedSection, NotificationSection, SecuritySection } from "./settings/sections-admin";
import { AISection, EnvSection, PWASection, WebSocketSection } from "./settings/sections-connect";
import { ClusterSection, GeneralSection, NetworkSection, StorageSection } from "./settings/sections-core";
import { settingsSections } from "./settings/shared";

export function SystemSettings() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState("general");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 统一持久化设置 (localStorage + BroadcastChannel)
  const settingsStore = useSettingsStore();
  const { settings, values, toggleSetting: storeToggle, updateValue: storeUpdate, resetSettings } = settingsStore;

  const updateValue = (key: keyof typeof values, val: string) => {
    storeUpdate(key, val);
    setHasChanges(true);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    storeToggle(key);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // 数据已自动持久化到 localStorage, 此处仅为 UI 反馈
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setHasChanges(false);
    toast.success(t("settings.saved"), {
      description: t("settings.savedDesc"),
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        color: "#e0f0ff",
      },
    });
  };

  const handleReset = () => {
    resetSettings();
    setHasChanges(false);
    toast.info(t("settings.resetDone"), {
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 180, 255, 0.3)",
        color: "#e0f0ff",
      },
    });
  };

  // ============================================================
  // 分区路由 (Facade 委派)
  // ============================================================

  const sectionProps = { settings, values, updateValue, toggleSetting };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection {...sectionProps} />;
      case "network":
        return <NetworkSection {...sectionProps} />;
      case "cluster":
        return <ClusterSection {...sectionProps} />;
      case "model":
        return <ModelManagementSection settings={settings} toggleSetting={toggleSetting} />;
      case "storage":
        return <StorageSection {...sectionProps} />;
      case "websocket":
        return <WebSocketSection {...sectionProps} />;
      case "ai":
        return <AISection {...sectionProps} />;
      case "pwa":
        return <PWASection {...sectionProps} />;
      case "security":
        return <SecuritySection {...sectionProps} />;
      case "notification":
        return <NotificationSection {...sectionProps} />;
      case "env":
        return <EnvSection {...sectionProps} />;
      case "advanced":
        return <AdvancedSection {...sectionProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-full">
      {/* Left sidebar */}
      <GlassCard className="md:col-span-3 p-3">
        <h3 className="text-[#e0f0ff] px-3 mb-4" style={{ fontSize: "0.9rem" }}>系统设置</h3>
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${activeSection === section.id
                ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]"
                : "text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.05)] border border-transparent"
                }`}
              style={{ fontSize: "0.82rem" }}
            >
              <section.icon className="w-4 h-4" />
              {t(section.labelKey)}
            </button>
          ))}
        </div>

        {/* System Health */}
        <div className="mt-6 p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)]">
          <h4 className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.75rem" }}>系统健康度</h4>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="text-[#00ff88]" style={{ fontSize: "0.72rem" }}>所有服务正常</span>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "API Gateway", status: "ok" },
              { name: "推理引擎", status: "ok" },
              { name: "数据库", status: "ok" },
              { name: "消息队列", status: "ok" },
              { name: "缓存服务", status: "warn" },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between">
                <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>{svc.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${svc.status === "ok" ? "bg-[#00ff88]" : "bg-[#ffdd00] animate-pulse"}`} />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Right content */}
      <GlassCard className="md:col-span-9 p-4 md:p-6 overflow-auto">
        {renderSection()}

        {/* Save / Reset buttons - sticky at bottom */}
        <div className={`flex items-center gap-3 mt-8 pt-4 border-t border-[rgba(0,180,255,0.08)] ${hasChanges ? "" : "opacity-60"}`}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all shadow-[0_0_15px_rgba(0,180,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "0.82rem" }}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t("settings.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("settings.saveChanges")}
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.82rem" }}
          >
            <RotateCcw className="w-4 h-4" />
            {t("settings.resetDefault")}
          </button>
          {hasChanges && (
            <span className="ml-auto text-[#ffdd00] flex items-center gap-1" style={{ fontSize: "0.72rem" }}>
              <div className="w-2 h-2 rounded-full bg-[#ffdd00] animate-pulse" />
              ⚠
            </span>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
