/**
 * IDETopBar.tsx
 * ==============
 * IDE 顶部导航栏
 * Logo + 项目标题 + AI 模型选择器 + 公共图标区 + 用户信息
 */

import React, { useState } from "react";
import {
  FolderOpen, Bell, Settings, Github, Share2, Rocket,
  Zap, ChevronDown, Bot, Circle,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import { AI_MODELS } from "./ide-mock-data";

interface IDETopBarProps {
  projectName: string;
  onBack: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function IDETopBar({ projectName, onBack, selectedModel, onModelChange }: IDETopBarProps) {
  const { t } = useI18n();
  const [showModelSelect, setShowModelSelect] = useState(false);

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];

  const ACTION_ICONS = [
    { icon: FolderOpen, label: t("ide.explorer"), color: "#00d4ff" },
    { icon: Bell, label: t("ide.notifications"), color: "#00d4ff" },
    { icon: Settings, label: t("ide.settings"), color: "#00d4ff" },
    { icon: Github, label: "GitHub", color: "#00d4ff" },
    { icon: Share2, label: t("ide.share"), color: "#00d4ff" },
    { icon: Rocket, label: t("ide.deploy"), color: "#00ff88" },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 h-10 shrink-0"
      style={{
        background: "linear-gradient(90deg, rgba(4,10,22,0.95) 0%, rgba(8,20,45,0.9) 100%)",
        borderBottom: "1px solid rgba(0,180,255,0.12)",
      }}
    >
      {/* Left: Logo + Project Name */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[rgba(0,212,255,0.08)] transition-all"
        >
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center">
            <span style={{ fontSize: "0.55rem", color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
              Y3
            </span>
          </div>
          <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.75rem" }}>
            CloudPivot AI
          </span>
        </button>
        <div className="w-px h-4 bg-[rgba(0,180,255,0.15)]" />
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[rgba(0,212,255,0.6)] truncate" style={{ fontSize: "0.72rem" }}>
            {projectName}
          </span>
          <ChevronDown className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0" />
        </div>
      </div>

      {/* Center: AI Model Selector */}
      <div className="relative flex items-center">
        <button
          onClick={() => setShowModelSelect(!showModelSelect)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] hover:border-[rgba(0,212,255,0.3)] transition-all"
          title={t("ide.modelSelector")}
        >
          <Bot className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
          <Circle
            className="w-1.5 h-1.5 shrink-0"
            style={{
              fill: currentModel.status === "online" ? "#00ff88" : "#ff3366",
              color: currentModel.status === "online" ? "#00ff88" : "#ff3366",
            }}
          />
          <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.68rem", maxWidth: "120px" }}>
            {currentModel.name}
          </span>
          <span className="text-[rgba(0,212,255,0.3)] hidden sm:inline" style={{ fontSize: "0.5rem" }}>
            {currentModel.provider}
          </span>
          <ChevronDown className={`w-3 h-3 text-[rgba(0,212,255,0.3)] transition-transform ${showModelSelect ? "rotate-180" : ""}`} />
        </button>

        {showModelSelect && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowModelSelect(false)}
            />
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: "rgba(8,20,45,0.95)",
                border: "1px solid rgba(0,180,255,0.2)",
                backdropFilter: "blur(12px)",
                minWidth: "200px",
              }}
            >
              <div
                className="px-3 py-1.5"
                style={{ borderBottom: "1px solid rgba(0,180,255,0.08)" }}
              >
                <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem", letterSpacing: "0.5px" }}>
                  {t("ide.modelSelector")}
                </span>
              </div>
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onModelChange(model.id); setShowModelSelect(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 transition-all ${
                    model.id === selectedModel
                      ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                      : "text-[#c0dcf0] hover:bg-[rgba(0,40,80,0.3)]"
                  }`}
                >
                  <Circle
                    className="w-1.5 h-1.5 shrink-0"
                    style={{
                      fill: model.status === "online" ? "#00ff88" : "#ff3366",
                      color: model.status === "online" ? "#00ff88" : "#ff3366",
                    }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate" style={{ fontSize: "0.68rem" }}>{model.name}</p>
                    <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.5rem" }}>{model.provider}</p>
                  </div>
                  {model.id === selectedModel && (
                    <Zap className="w-3 h-3 text-[#00d4ff] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Action Icons + User */}
      <div className="flex items-center gap-0.5">
        {ACTION_ICONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="p-1.5 rounded-md hover:bg-[rgba(0,212,255,0.08)] transition-all group"
              title={item.label}
            >
              <Icon
                className="w-3.5 h-3.5 transition-colors"
                style={{ color: "rgba(0,212,255,0.4)" }}
              />
            </button>
          );
        })}
        <div className="w-px h-4 bg-[rgba(0,180,255,0.15)] mx-1" />
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7b61ff] flex items-center justify-center">
          <span style={{ fontSize: "0.5rem", color: "#fff" }}>YY</span>
        </div>
      </div>
    </div>
  );
}
