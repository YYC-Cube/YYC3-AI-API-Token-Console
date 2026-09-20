/**
 * AIAssistant.tsx
 * =================================
 * YYC³ CloudPivot Intelli-Matrix · AI 集成控制中心
 *
 * 功能：
 * - AI 对话（模拟 OpenAI 接口）
 * - 系统全能命令预设（一键操作）
 * - 大模型参数微调（temperature / top_p / max_tokens）
 * - 提示词管理（系统预设 + 自定义）
 * - OpenAI API Key 认证配置
 * - 中文语义理解友好
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
 X, Send, Sparkles, Terminal, Settings, ChevronDown, ChevronUp,
  Zap, Server, Database, Shield, RotateCcw, Play, Copy, Check,
  Cpu, HardDrive, Activity, Network, Layers, Key, Sliders, MessageSquare,
  BookOpen, Command, Minimize2, Maximize2, Trash2
} from "lucide-react";
import { YYC3LogoSvg } from "./YYC3LogoSvg";
import { useModelProvider } from "../hooks/useModelProvider";
import { useSettingsStore } from "../hooks/useSettingsStore";
import type { ChatMessage, CommandCategory } from "../types";

// ============================================================
// Types (local to AIAssistant)
// ============================================================

interface SystemCommand {
  id: string;
  icon: typeof Zap;
  label: string;
  desc: string;
  category: CommandCategory;
  action: string;
  color: string;
}

interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  category: string;
}

// ============================================================
// Constants
// ============================================================

const SYSTEM_COMMANDS: SystemCommand[] = [
  { id: "cmd-01", icon: Activity, label: "集群状态总览", desc: "获取所有节点实时状态", category: "cluster", action: "查看当前集群所有节点的运行状态、GPU利用率和温度", color: "#00d4ff" },
  { id: "cmd-02", icon: Server, label: "重启异常节点", desc: "自动检测并重启异常节点", category: "cluster", action: "检测并重启所有状态异常的推理节点", color: "#ff6600" },
  { id: "cmd-03", icon: Layers, label: "部署模型", desc: "将模型部署到指定节点", category: "model", action: "将 DeepSeek-V3 模型部署到空闲 GPU 节点", color: "#00ff88" },
  { id: "cmd-04", icon: Cpu, label: "推理性能报告", desc: "生成推理性能分析报告", category: "model", action: "生成过去24小时的推理性能分析报告", color: "#aa55ff" },
  { id: "cmd-05", icon: Database, label: "数据库健康检查", desc: "检查 PostgreSQL 连接状态", category: "data", action: "执行数据库健康检查，检测连接池和慢查询", color: "#ffdd00" },
  { id: "cmd-06", icon: HardDrive, label: "存储空间分析", desc: "分析存储使用和清理建议", category: "data", action: "分析当前存储空间使用情况给出清理建议", color: "#ff3366" },
  { id: "cmd-07", icon: Shield, label: "安全审计扫描", desc: "扫描安全漏洞和异常访问", category: "security", action: "执行安全审计扫描，检查异常访问和潜在风险", color: "#ff3366" },
  { id: "cmd-08", icon: Network, label: "网络延迟诊断", desc: "诊断节点间网络延迟", category: "monitor", action: "诊断所有节点间的网络延迟和带宽状态", color: "#00d4ff" },
  { id: "cmd-09", icon: Zap, label: "一键优化配置", desc: "AI 自动优化系统配置", category: "cluster", action: "根据当前负载情况，AI 自动优化集群配置参数", color: "#00ff88" },
  { id: "cmd-10", icon: RotateCcw, label: "WebSocket 重连", desc: "重新建立数据推送连接", category: "monitor", action: "重新建立 WebSocket 实时数据推送连接", color: "#aa55ff" },
];

const PROMPT_PRESETS: PromptPreset[] = [
  { id: "p1", name: "运维诊断专家", prompt: "你是 CP-IM 矩阵系统的运维诊断专家。请分析系统当前状态，识别潜在问题，给出优化建议。使用中文回答，简洁专业。", category: "运维" },
  { id: "p2", name: "模型调优顾问", prompt: "你是大模型推理调优专家。请根据当前模型部署情况，分析推理性能瓶颈，建议最优的 batch size、并行策略和内存配置。", category: "模型" },
  { id: "p3", name: "数据分析师", prompt: "你是数据分析专家。请解读系统监控数据，识别趋势和异常，生成可视化报告建议。关注 QPS、延迟、GPU 利用率等关键指标。", category: "数据" },
  { id: "p4", name: "安全审计员", prompt: "你是信息安全审计专家。请审查系统安全日志，识别异常访问模式、潜在入侵行为，并建议安全加固措施。", category: "安全" },
  { id: "p5", name: "智能运维助手", prompt: "你是 CP-IM 本地推理矩阵的 AI 运维助手。帮助用户快速执行运维操作、查询系统状态、部署模型、分析日志。一切以中文交互，保持简洁友好。", category: "通用" },
];

// Simulated AI responses
function generateMockResponse(userMsg: string): string {
  const lower = userMsg.toLowerCase();

  if (lower.includes("状态") || lower.includes("总览") || lower.includes("节点")) {
    return `## 集群状态报告\n\n**时间**: ${new Date().toLocaleString("zh-CN")}\n\n| 节点 | 状态 | GPU | 温度 |\n|------|------|-----|------|\n| GPU-A100-01 | 🟢 正常 | 87% | 68°C |\n| GPU-A100-02 | 🟢 正常 | 92% | 74°C |\n| GPU-A100-03 | 🟡 预警 | 98% | 82°C |\n| GPU-H100-01 | 🟢 正常 | 65% | 55°C |\n\n**建议**: GPU-A100-03 负载过高，建议将部分任务迁移到 GPU-H100-01。`;
  }

  if (lower.includes("部署") || lower.includes("模型")) {
    return `## 模型部署方案\n\n**目标模型**: DeepSeek-V3\n**推荐节点**: GPU-H100-03（当前空闲）\n\n**部署步骤**:\n1. 检查节点可用显存 → 80GB 可用 ✅\n2. 加载模型权重 → 预计 3 分钟\n3. 初始化推理引擎 → KV-Cache 预热\n4. 健康检查 → 验证推理准确率\n\n**预计时间**: 5-8 分钟\n**状态**: 等待确认执行`;
  }

  if (lower.includes("优化") || lower.includes("配置")) {
    return `## AI 优化建议\n\n基于当前系统状态分析：\n\n1. **推理并行度**: 建议从 4 提升到 6（当前 GPU 利用率有余量）\n2. **Batch Size**: 从 32 调整为 48（可提升 15% 吞吐）\n3. **KV-Cache**: 建议启用 PagedAttention，预计减少 30% 显存占用\n4. **负载均衡**: 建议切换为加权轮询策略\n\n**预估提升**: 整体推理吞吐提升约 22%`;
  }

  if (lower.includes("安全") || lower.includes("审计")) {
    return `## 安全审计摘要\n\n**扫描范围**: 全系统\n**扫描时间**: ${new Date().toLocaleString("zh-CN")}\n\n⚠️ **发现 2 项需关注**:\n1. IP 203.0.113.45 尝试非法 Token 访问（已拦截）\n2. 缓存服务响应时间波动（建议监控）\n\n✅ **安全项通过**: API 速率限制、MFA 认证、审计日志\n\n**风险评级**: 低风险 🟢`;
  }

  if (lower.includes("数据库") || lower.includes("存储") || lower.includes("postgresql")) {
    return `## 数据库健康报告\n\n**PostgreSQL** (localhost:5433)\n- 连接状态: 🟢 正常\n- 活跃连接: 24/100\n- 慢查询: 2 条（> 500ms）\n- 存储使用: 12.8TB / 48TB (27%)\n\n**向量数据库**: 5.2TB / 8TB (65%) ⚠️\n\n**建议**: 向量数据库使用率较高，建议计划扩容或清理过期索引。`;
  }

  return `收到您的请求："${userMsg}"\n\n我正在分析系统当前状态...\n\n**系统概览**:\n- 集群运行正常，7/8 节点活跃\n- 当前 QPS: ~3,800，推理延: ~48ms\n- GPU 平均利用率: 82.4%\n\n请问需要我执行具体操作还是查看更多详情？您可以输入具体命令或使用左侧的快捷操作按钮。`;
}

// ============================================================
// Component
// ============================================================

interface AIAssistantProps {
  isMobile: boolean;
}

export function AIAssistant({ isMobile }: AIAssistantProps) {
  // Panel state
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "commands" | "prompts" | "settings">("chat");

  // 从 useModelProvider 获取动态模型列表
  const { availableModels, ollamaLoading } = useModelProvider();

  // ★ 从 useSettingsStore 获取全局 AI 配置 (设置页 = 唯一数据源)
  const { values: settingsValues, updateValue: updateSettingsValue } = useSettingsStore();

  // 派生自全局设置 — 修改即时同步到 Settings 页
  const apiKey = settingsValues.aiApiKey;
  const setApiKey = useCallback((v: string) => updateSettingsValue("aiApiKey", v), [updateSettingsValue]);
  const selectedModel = settingsValues.aiModel;
  const setSelectedModel = useCallback((v: string) => updateSettingsValue("aiModel", v), [updateSettingsValue]);
  const temperature = parseFloat(settingsValues.aiTemperature) || 0.7;
  const setTemperature = useCallback((v: number) => updateSettingsValue("aiTemperature", String(v)), [updateSettingsValue]);
  const topP = parseFloat(settingsValues.aiTopP) || 0.9;
  const setTopP = useCallback((v: number) => updateSettingsValue("aiTopP", String(v)), [updateSettingsValue]);
  const maxTokens = parseInt(settingsValues.aiMaxTokens) || 2048;
  const setMaxTokens = useCallback((v: number) => updateSettingsValue("aiMaxTokens", String(v)), [updateSettingsValue]);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "你好！我是 CP-IM AI 智能助理。\n\n我可以帮你：\n- 📊 查看集群状态和性能报告\n- 🚀 部署和管理推理模型\n- 🔧 执行系统运维操作\n- 🔍 分析日志和诊断问题\n\n请输入指令或点击右侧快捷命令开始操作。",
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // AI Settings (只保留本地 UI 状态)
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PRESETS[4].prompt);

  // Command filter
  const [cmdFilter, setCmdFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 自动选中第一个可用模型
  useEffect(() => {
    if (!selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0].id);
    }
  }, [availableModels, selectedModel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const response = generateMockResponse(content);
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-resp`,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const executeCommand = (cmd: SystemCommand) => {
    setActiveTab("chat");
    sendMessage(cmd.action);
  };

  const applyPreset = (preset: PromptPreset) => {
    setSystemPrompt(preset.prompt);
    setActiveTab("chat");
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: "system",
      content: `✅ 已切换系统角色为「${preset.name}」`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, sysMsg]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome-new",
      role: "assistant",
      content: "对话已清空。请输入新的指令开始操作。",
      timestamp: Date.now(),
    }]);
  };

  const cmdCategories = [
    { key: "all", label: "全部" },
    { key: "cluster", label: "集群" },
    { key: "model", label: "模型" },
    { key: "data", label: "数据" },
    { key: "security", label: "安全" },
    { key: "monitor", label: "监控" },
  ];

  const filteredCommands = cmdFilter === "all"
    ? SYSTEM_COMMANDS
    : SYSTEM_COMMANDS.filter(c => c.category === cmdFilter);

  // Panel dimensions
  const panelClass = isMaximized
    ? "fixed inset-4 md:inset-8 z-[60]"
    : isMobile
      ? "fixed inset-0 z-[60]"
      : "fixed bottom-20 right-4 w-[480px] h-[640px] z-[60]";

  // ========== FLOATING BUTTON ==========
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-[60] group"
        style={{
          bottom: isMobile ? 80 : 24,
          right: isMobile ? 16 : 24,
        }}
      >
        <div className="relative rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_30px_rgba(0,180,255,0.4)] hover:shadow-[0_0_40px_rgba(0,180,255,0.6)] transition-all hover:scale-105 active:scale-95"
          style={{ width: isMobile ? 48 : 56, height: isMobile ? 48 : 56 }}
        >
          <YYC3LogoSvg size={isMobile ? 24 : 28} showText={false} className="rounded-md" />
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] animate-ping opacity-20" />
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00ff88] flex items-center justify-center shadow-[0_0_8px_rgba(0,255,136,0.5)]">
            <Sparkles className="w-3 h-3 text-[#060e1f]" />
          </div>
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-[rgba(8,25,55,0.95)] border border-[rgba(0,180,255,0.2)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="text-[#00d4ff]" style={{ fontSize: "0.72rem" }}>AI 智能助理 (⌘J)</span>
        </div>
      </button>
    );
  }

  // ========== MAIN PANEL ==========
  return (
    <div className={panelClass}>
      <div className="w-full h-full rounded-2xl bg-[rgba(8,25,55,0.95)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.12)] flex flex-col overflow-hidden">

        {/* ========= Header ========= */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(0,180,255,0.12)] bg-[rgba(0,40,80,0.2)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_15px_rgba(0,180,255,0.3)] overflow-hidden">
              <YYC3LogoSvg size={20} showText={false} className="rounded" />
            </div>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>AI 智能助理</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                  {availableModels.find(m => m.id === selectedModel)?.name ?? (ollamaLoading ? "模型加载中..." : "未选择模型")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
            {!isMobile && (
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
                title={isMaximized ? "还原" : "最大化"}
              >
                {isMaximized
                  ? <Minimize2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
                  : <Maximize2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />}
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); setIsMaximized(false); }}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,51,102,0.1)] transition-all"
            >
              <X className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
            </button>
          </div>
        </div>

        {/* ========= Tab Bar ========= */}
        <div className="shrink-0 flex items-center gap-0.5 px-3 py-2 border-b border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.1)]">
          {([
            { key: "chat" as const, icon: MessageSquare, label: "对话" },
            { key: "commands" as const, icon: Command, label: "命令" },
            { key: "prompts" as const, icon: BookOpen, label: "提示词" },
            { key: "settings" as const, icon: Sliders, label: "配置" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent"
              }`}
              style={{ fontSize: "0.72rem" }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========= Content ========= */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* === Chat Tab === */}
          {activeTab === "chat" && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] relative group ${
                      msg.role === "user"
                        ? "bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.2)] rounded-2xl rounded-br-sm"
                        : msg.role === "system"
                          ? "bg-[rgba(255,221,0,0.08)] border border-[rgba(255,221,0,0.15)] rounded-2xl"
                          : "bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] rounded-2xl rounded-bl-sm"
                    } px-3.5 py-2.5`}>
                      <div
                        className={`whitespace-pre-wrap ${
                          msg.role === "user" ? "text-[#e0f0ff]" : msg.role === "system" ? "text-[#ffdd00]" : "text-[#c0dcf0]"
                        }`}
                        style={{ fontSize: "0.78rem", lineHeight: "1.6" }}
                      >
                        {msg.content}
                      </div>
                      {/* Copy button */}
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[rgba(0,212,255,0.1)] transition-all"
                        >
                          {copiedId === msg.id
                            ? <Check className="w-3 h-3 text-[#00ff88]" />
                            : <Copy className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />}
                        </button>
                      )}
                      <div className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.58rem" }}>
                        {new Date(msg.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 p-3 border-t border-[rgba(0,180,255,0.1)]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入指令... (Enter 发送, Shift+Enter 换行)"
                    rows={1}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
                    style={{ fontSize: "0.8rem", maxHeight: "100px" }}
                  />
                  <button
                    onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white hover:shadow-[0_0_15px_rgba(0,180,255,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* === Commands Tab === */}
          {activeTab === "commands" && (
            <div className="flex-1 overflow-auto p-3">
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {cmdCategories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCmdFilter(cat.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      cmdFilter === cat.key
                        ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                        : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredCommands.map(cmd => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.25)] hover:bg-[rgba(0,40,80,0.3)] transition-all text-left group"
                    >
                      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${cmd.color}12` }}>
                        <Icon className="w-4 h-4" style={{ color: cmd.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#e0f0ff] group-hover:text-[#00d4ff] transition-colors" style={{ fontSize: "0.8rem" }}>
                          {cmd.label}
                        </p>
                        <p className="text-[rgba(0,212,255,0.35)] truncate" style={{ fontSize: "0.68rem" }}>
                          {cmd.desc}
                        </p>
                      </div>
                      <Play className="w-4 h-4 text-[rgba(0,212,255,0.2)] group-hover:text-[#00d4ff] transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* === Prompts Tab === */}
          {activeTab === "prompts" && (
            <div className="flex-1 overflow-auto p-3">
              <h4 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.82rem" }}>
                系统提示词预设
              </h4>
              <div className="space-y-2 mb-4">
                {PROMPT_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      systemPrompt === preset.prompt
                        ? "bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.3)]"
                        : "bg-[rgba(0,40,80,0.15)] border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)]"
                    }`}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#e0f0ff]" style={{ fontSize: "0.8rem" }}>{preset.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>
                          {preset.category}
                        </span>
                      </div>
                      {systemPrompt === preset.prompt && (
                        <Check className="w-4 h-4 text-[#00ff88]" />
                      )}
                    </div>
                    <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem", lineHeight: 1.5 }}>
                      {preset.prompt.slice(0, 80)}...
                    </p>
                  </div>
                ))}
              </div>

              {/* Custom prompt editor */}
              <h4 className="text-[#e0f0ff] mb-2" style={{ fontSize: "0.82rem" }}>
                自定义系统提示词
              </h4>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
                style={{ fontSize: "0.75rem", lineHeight: 1.6 }}
                rows={5}
                placeholder="输入自定义系统提示词..."
              />
              <p className="text-[rgba(0,212,255,0.25)] mt-1" style={{ fontSize: "0.62rem" }}>
                字数: {systemPrompt.length} | 建议控制在 500 字以内以获得最佳效果
              </p>
            </div>
          )}

          {/* === Settings Tab === */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-auto p-3 space-y-4">
              {/* API Key */}
              <div>
                <h4 className="text-[#e0f0ff] mb-2 flex items-center gap-2" style={{ fontSize: "0.82rem" }}>
                  <Key className="w-4 h-4 text-[#ffdd00]" />
                  OpenAI API 认证
                </h4>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.78rem", fontFamily: "monospace" }}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(0,212,255,0.1)]"
                  >
                    <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                      {showApiKey ? "隐藏" : "显示"}
                    </span>
                  </button>
                </div>
                <p className="text-[rgba(0,212,255,0.25)] mt-1" style={{ fontSize: "0.62rem" }}>
                  {apiKey ? "✅ API Key 已配置" : "⚠️ 未配置 Key，将使用本地模拟模式"}
                  {" · 密钥仅保存在本地浏览器"}
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <h4 className="text-[#e0f0ff] mb-2 flex items-center gap-2" style={{ fontSize: "0.82rem" }}>
                  <Cpu className="w-4 h-4 text-[#00d4ff]" />
                  模型选择
                </h4>
                {ollamaLoading && (
                  <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.65rem" }}>
                    正在检测 Ollama 本地模型...
                  </p>
                )}
                {availableModels.length > 0 ? (
                  <div className="space-y-1">
                    {availableModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                          selectedModel === model.id
                            ? "bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff]"
                            : "bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.5)] hover:border-[rgba(0,180,255,0.2)]"
                        }`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {model.isLocal && (
                          <span className="text-[#00ff88] shrink-0" style={{ fontSize: "0.58rem" }}>本地</span>
                        )}
                        <span className="truncate flex-1">{model.name}</span>
                        <span className="text-[rgba(0,212,255,0.25)] shrink-0" style={{ fontSize: "0.55rem" }}>
                          {model.provider}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[rgba(0,212,255,0.25)] text-center py-3" style={{ fontSize: "0.72rem" }}>
                    暂无可用模型，请前往「模型设置」页面添加
                  </p>
                )}
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.82rem" }}>
                    温度 (Temperature)
                  </h4>
                  <span className="text-[#00d4ff]" style={{ fontSize: "0.8rem", fontFamily: "'Orbitron', sans-serif" }}>
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={e => setTemperature(Number(e.target.value))}
                  className="w-full accent-[#00d4ff]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>精确 0</span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>创意 2.0</span>
                </div>
              </div>

              {/* Top-P */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.82rem" }}>
                    Top-P (核采样)
                  </h4>
                  <span className="text-[#00d4ff]" style={{ fontSize: "0.8rem", fontFamily: "'Orbitron', sans-serif" }}>
                    {topP.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={e => setTopP(Number(e.target.value))}
                  className="w-full accent-[#aa55ff]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>集中 0</span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>多样 1.0</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.82rem" }}>
                    最大 Token 数
                  </h4>
                  <span className="text-[#00d4ff]" style={{ fontSize: "0.8rem", fontFamily: "'Orbitron', sans-serif" }}>
                    {maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={maxTokens}
                  onChange={e => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-[#00ff88]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>256</span>
                  <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>8192</span>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => { setTemperature(0.7); setTopP(0.9); setMaxTokens(2048); }}
                className="w-full py-2.5 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,180,255,0.2)] transition-all"
                style={{ fontSize: "0.78rem" }}
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-2" />
                恢复默认参数
              </button>

              {/* Global sync hint */}
              <div className="p-2.5 rounded-xl bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.1)]">
                <p className="text-[rgba(0,255,136,0.5)] flex items-center gap-1.5" style={{ fontSize: "0.62rem" }}>
                  <Settings className="w-3 h-3" />
                  以上参数与「系统设置 → AI / 大模型配置」实时双向同步
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}