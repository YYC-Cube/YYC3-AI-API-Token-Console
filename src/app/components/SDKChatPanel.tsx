/**
 * SDKChatPanel.tsx
 * =================
 * AI 对话面板 · 基于 BigModel SDK 桥接层
 *
 * 功能:
 * - 模型选择 (从 useModelProvider 已配置模型中选取)
 * - 流式对话 (mock / 真实 API)
 * - 会话历史管理
 * - 使用统计展示
 * - 赛博朋克 GlassCard 风格
 *
 * i18n 已迁移
 */

import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import {
  MessageSquare, Send, Square, Plus, Trash2, User,
  Activity, Zap, BarChart3, Clock, AlertCircle,
  ChevronDown, Loader2, Cpu,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useModelProvider } from "../hooks/useModelProvider";
import { useBigModelSDK, PROVIDER_CAPABILITIES } from "../hooks/useBigModelSDK";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";
import { YYC3LogoSvg } from "./YYC3LogoSvg";
import type { ChatMessage, SDKConnectionStatus, ConfiguredModel } from "../types";

// ============================================================
// 子组件: 连接状态指示器
// ============================================================

function StatusBadge({ status, t }: { status: SDKConnectionStatus; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const cfg: Record<SDKConnectionStatus, { color: string; label: string }> = {
    idle:       { color: "rgba(0,212,255,0.4)", label: t("sdk.connectionIdle") },
    connecting: { color: "rgba(255,200,0,0.6)", label: t("sdk.connectionConnecting") },
    connected:  { color: "rgba(0,255,120,0.6)", label: t("sdk.connectionConnected") },
    error:      { color: "rgba(255,60,60,0.6)", label: t("sdk.connectionError") },
  };
  const { color, label } = cfg[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
      style={{ background: `${color}20`, border: `1px solid ${color}`, fontSize: "0.7rem", color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ============================================================
// 子组件: 消息气泡
// ============================================================

function MessageBubble({ msg, t }: { msg: ChatMessage; t: (key: string) => string }) {
  const isUser = msg.role === "user";
  const isError = msg.content.startsWith("[ERROR]");

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* 头像 */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isUser ? "rgba(0,212,255,0.15)" : "rgba(120,80,255,0.15)",
          border: `1px solid ${isUser ? "rgba(0,212,255,0.3)" : "rgba(120,80,255,0.3)"}`,
        }}
      >
        {isUser ? <User className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} /> : (
          <YYC3LogoSvg size={14} showText={false} />
        )}
      </div>

      {/* 消息体 */}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${isUser ? "text-right" : ""}`}
        style={{
          background: isUser
            ? "rgba(0,212,255,0.08)"
            : isError
              ? "rgba(255,60,60,0.08)"
              : "rgba(120,80,255,0.06)",
          border: `1px solid ${
            isUser ? "rgba(0,212,255,0.15)" : isError ? "rgba(255,60,60,0.2)" : "rgba(120,80,255,0.12)"
          }`,
          fontSize: "0.8rem",
          lineHeight: "1.5",
          color: isError ? "#ff6666" : "rgba(224,232,255,0.9)",
        }}
      >
        {/* 角色标签 */}
        <div className="flex items-center gap-1 mb-1" style={{ fontSize: "0.65rem", color: "rgba(0,212,255,0.5)" }}>
          <span>{isUser ? t("sdk.you") : t("sdk.assistant")}</span>
          {msg.model && <span>· {msg.model}</span>}
        </div>

        {/* 内容 - 简单 markdown 渲染 */}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>

        {/* token 信息 */}
        {msg.tokens && (
          <div className="mt-1 flex items-center gap-2" style={{ fontSize: "0.6rem", color: "rgba(0,212,255,0.35)" }}>
            <span>↑{msg.tokens.input} ↓{msg.tokens.output}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function SDKChatPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const { configuredModels } = useModelProvider();
  const sdk = useBigModelSDK();

  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [input, setInput] = useState("");
  const [showModelSelect, setShowModelSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 选中的模型对象
  const selectedModel: ConfiguredModel | undefined = configuredModels.find((m) => m.id === selectedModelId);

  // 自动选择第一个模型
  useEffect(() => {
    if (!selectedModelId && configuredModels.length > 0) {
      setSelectedModelId(configuredModels[0].id);
    }
  }, [configuredModels, selectedModelId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sdk.activeSession?.messages, sdk.streamingContent]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedModel || sdk.streaming) return;

    const content = input.trim();
    setInput("");

    // 确保有活跃会话
    let sid = sdk.activeSessionId;
    if (!sid) {
      const session = sdk.createSession(selectedModel.id, content.slice(0, 30));
      sid = session.id;
    }

    await sdk.sendMessageStream(selectedModel, content, sid);
  }, [input, selectedModel, sdk]);

  // 新建对话
  const handleNewChat = useCallback(() => {
    if (!selectedModel) return;
    sdk.createSession(selectedModel.id);
  }, [selectedModel, sdk]);

  // 键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const messages = sdk.activeSession?.messages ?? [];
  const isMock = selectedModel && !selectedModel.apiKey && selectedModel.providerId !== "ollama";

  return (
    <div className={`flex ${isMobile ? "flex-col" : ""} gap-4 h-full`} style={{ minHeight: "500px" }}>
      {/* ========== 左侧: 会话列表 (桌面端) ========== */}
      {!isMobile && (
        <div className="w-56 shrink-0 flex flex-col gap-3">
          {/* 新建对话按钮 */}
          <button
            onClick={handleNewChat}
            disabled={!selectedModel}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.25)",
              color: "#00d4ff",
              fontSize: "0.8rem",
              opacity: selectedModel ? 1 : 0.4,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("sdk.newChat")}
          </button>

          {/* 会话列表 */}
          <GlassCard className="flex-1 overflow-y-auto p-2">
            <div style={{ fontSize: "0.7rem", color: "rgba(0,212,255,0.5)", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
              {t("sdk.sessions")} ({sdk.sessions.length})
            </div>
            {sdk.sessions.length === 0 ? (
              <div className="text-center py-4" style={{ fontSize: "0.7rem", color: "rgba(224,232,255,0.3)" }}>
                {t("sdk.noSessions")}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {sdk.sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => sdk.setActiveSessionId(s.id)}
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all group"
                    style={{
                      background: s.id === sdk.activeSessionId ? "rgba(0,212,255,0.1)" : "transparent",
                      border: s.id === sdk.activeSessionId ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
                    }}
                  >
                    <MessageSquare className="w-3 h-3 shrink-0" style={{ color: "rgba(0,212,255,0.4)" }} />
                    <span className="flex-1 truncate" style={{ fontSize: "0.72rem", color: "rgba(224,232,255,0.8)" }}>
                      {s.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); sdk.deleteSession(s.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "rgba(255,60,60,0.5)" }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ========== 中间: 对话区域 ========== */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 顶部: 模型选择 + 状态 */}
        <GlassCard className="px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* 模型选择器 */}
            <div className="relative">
              <button
                onClick={() => setShowModelSelect(!showModelSelect)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all"
                style={{
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  fontSize: "0.78rem",
                  color: "rgba(224,232,255,0.85)",
                }}
              >
                <Cpu className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
                {selectedModel ? `${selectedModel.providerLabel} / ${selectedModel.model}` : t("sdk.selectModel")}
                <ChevronDown className="w-3 h-3" style={{ color: "rgba(0,212,255,0.5)" }} />
              </button>

              {/* 下拉列表 */}
              {showModelSelect && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden"
                  style={{
                    background: "rgba(8,25,55,0.95)",
                    border: "1px solid rgba(0,212,255,0.2)",
                    backdropFilter: "blur(20px)",
                    minWidth: "220px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  {configuredModels.length === 0 ? (
                    <div className="p-3" style={{ fontSize: "0.72rem", color: "rgba(224,232,255,0.4)" }}>
                      {t("modelProvider.noConfigured")}
                    </div>
                  ) : (
                    configuredModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModelId(m.id); setShowModelSelect(false); }}
                        className="w-full text-left px-3 py-2 transition-all hover:bg-[rgba(0,212,255,0.08)]"
                        style={{
                          fontSize: "0.75rem",
                          color: m.id === selectedModelId ? "#00d4ff" : "rgba(224,232,255,0.7)",
                          borderBottom: "1px solid rgba(0,212,255,0.06)",
                        }}
                      >
                        <div>{m.providerLabel} / {m.model}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(0,212,255,0.35)" }}>{m.baseUrl}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 状态 */}
            <div className="flex items-center gap-2">
              {isMock && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,200,0,0.1)", border: "1px solid rgba(255,200,0,0.2)", fontSize: "0.65rem", color: "rgba(255,200,0,0.7)" }}
                >
                  {t("sdk.mockMode")}
                </span>
              )}
              <StatusBadge status={sdk.connectionStatus} t={t} />
            </div>
          </div>
        </GlassCard>

        {/* 消息列表 */}
        <GlassCard className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {messages.length === 0 && !sdk.streaming ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div style={{ opacity: 0.25 }}>
                <YYC3LogoSvg size={40} showText={false} />
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(224,232,255,0.3)" }}>{t("sdk.noMessages")}</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(224,232,255,0.2)" }}>{t("sdk.startHint")}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} t={t} />
              ))}

              {/* 流式输出 */}
              {sdk.streaming && sdk.streamingContent && (
                <div className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: "rgba(120,80,255,0.15)", border: "1px solid rgba(120,80,255,0.3)" }}
                  >
                    <YYC3LogoSvg size={14} showText={false} />
                  </div>
                  <div
                    className="max-w-[80%] rounded-lg px-3 py-2"
                    style={{
                      background: "rgba(120,80,255,0.06)",
                      border: "1px solid rgba(120,80,255,0.12)",
                      fontSize: "0.8rem",
                      lineHeight: "1.5",
                      color: "rgba(224,232,255,0.9)",
                    }}
                  >
                    <div className="whitespace-pre-wrap break-words">{sdk.streamingContent}</div>
                    <div className="flex items-center gap-1 mt-1" style={{ fontSize: "0.6rem", color: "rgba(0,212,255,0.4)" }}>
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      {t("sdk.streaming")}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </GlassCard>

        {/* 输入区域 */}
        <GlassCard className="p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("sdk.inputPlaceholder")}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none"
              style={{
                fontSize: "0.82rem",
                color: "rgba(224,232,255,0.9)",
                maxHeight: "120px",
                minHeight: "36px",
              }}
            />
            {sdk.streaming ? (
              <button
                onClick={sdk.abort}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all"
                style={{ background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)" }}
              >
                <Square className="w-4 h-4" style={{ color: "#ff6060" }} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all"
                style={{
                  background: input.trim() && selectedModel ? "rgba(0,212,255,0.15)" : "rgba(0,212,255,0.05)",
                  border: `1px solid ${input.trim() && selectedModel ? "rgba(0,212,255,0.3)" : "rgba(0,212,255,0.1)"}`,
                  opacity: input.trim() && selectedModel ? 1 : 0.4,
                }}
              >
                <Send className="w-4 h-4" style={{ color: "#00d4ff" }} />
              </button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ========== 右侧: 统计面板 (桌面端) ========== */}
      {!isMobile && (
        <div className="w-52 shrink-0 flex flex-col gap-3">
          {/* 使用统计 */}
          <GlassCard className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
              <span style={{ fontSize: "0.75rem", color: "rgba(224,232,255,0.7)" }}>{t("sdk.stats")}</span>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { icon: Zap, label: t("sdk.totalRequests"), value: String(sdk.usageStats.totalRequests) },
                { icon: Activity, label: t("sdk.totalTokensIn"), value: sdk.usageStats.totalTokensIn.toLocaleString() },
                { icon: Activity, label: t("sdk.totalTokensOut"), value: sdk.usageStats.totalTokensOut.toLocaleString() },
                { icon: Clock, label: t("sdk.avgLatency"), value: `${sdk.usageStats.avgLatencyMs}ms` },
                { icon: AlertCircle, label: t("sdk.errorCount"), value: String(sdk.usageStats.errorCount) },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between" style={{ fontSize: "0.7rem" }}>
                  <span className="flex items-center gap-1.5" style={{ color: "rgba(224,232,255,0.5)" }}>
                    <item.icon className="w-3 h-3" style={{ color: "rgba(0,212,255,0.4)" }} />
                    {item.label}
                  </span>
                  <span style={{ color: "rgba(224,232,255,0.8)", fontFamily: "monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={sdk.resetStats}
              className="w-full mt-3 py-1.5 rounded-md transition-all"
              style={{
                background: "rgba(255,60,60,0.06)",
                border: "1px solid rgba(255,60,60,0.15)",
                fontSize: "0.68rem",
                color: "rgba(255,60,60,0.5)",
              }}
            >
              {t("sdk.resetStats")}
            </button>
          </GlassCard>

          {/* 能力列表 */}
          {selectedModel && (
            <GlassCard className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
                <span style={{ fontSize: "0.75rem", color: "rgba(224,232,255,0.7)" }}>{t("sdk.capabilities")}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(PROVIDER_CAPABILITIES.find((p) => p.providerId === selectedModel.providerId)?.capabilities ?? []).map((cap) => (
                  <span
                    key={cap}
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(0,212,255,0.06)",
                      border: "1px solid rgba(0,212,255,0.12)",
                      fontSize: "0.6rem",
                      color: "rgba(0,212,255,0.6)",
                    }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}