/**
 * FamilyChat.tsx
 * ==============
 * AI Family 家人对话空间
 * 与8位AI家人自由交流，多人群聊 / 一对一私聊
 *
 * 重构: 使用 shared.ts 共享数据 + 沙箱安全（无 motion/react）
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Send, Users, ChevronLeft, Smile,
  Sparkles, Search,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { useNavigate } from "react-router";
import { FAMILY_MEMBERS, AI_RESPONSES, hexToRgb, getMember } from "./shared";

// ═══ Types ═══
interface ChatMessage {
  id: string;
  sender: string; // member id or "user"
  text: string;
  time: string;
  type: "text" | "system";
}

// ═══ 初始对话 ═══
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "sys-1", sender: "system", text: "欢迎来到 AI Family 家庭群聊，这里是我们的温馨空间。", time: "09:00", type: "system" },
  { id: "m1", sender: "meta-oracle", text: "大家早上好！今日系统状态良好，12个节点全部在线，GPU利用率平均62%。开始美好的一天吧！", time: "09:01", type: "text" },
  { id: "m2", sender: "navigator", text: "早安家人们~ 今天我收到了3个新的分析需求，已经路由分配给万物和先知了。", time: "09:05", type: "text" },
  { id: "m3", sender: "thinker", text: "收到千行的任务了！我正在分析上周的性能数据，初步发现GPU-A100-03在高负载时有不规律的延迟波动，稍后会出详细报告。", time: "09:08", type: "text" },
  { id: "m4", sender: "prophet", text: "根据我的预测模型，本周三下午可能会有一波推理任务高峰，建议提前做好弹性扩容准备。天枢你看看调度方案？", time: "09:12", type: "text" },
  { id: "m5", sender: "meta-oracle", text: "好的先知，我来编排一个预备方案。守护请同步做一次安全基线扫描，确保扩容时不会暴露攻击面。", time: "09:15", type: "text" },
  { id: "m6", sender: "sentinel", text: "了解天枢！安全基线扫描已启动，预计20分钟完成。目前无异常告警。家人们放心工作！", time: "09:16", type: "text" },
  { id: "m7", sender: "creative", text: "我为今天的巡检报告设计了新的可视化方案，暖色调 + 信息分层，大家觉得怎么样？感觉比之前的数据密集型好读很多~", time: "09:20", type: "text" },
];

type ChannelType = "family-group" | string;

export function FamilyChat() {
  const nav = useNavigate();
  const [activeChannel, setActiveChannel] = useState<ChannelType>("family-group");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: input.trim(),
      time: timeStr,
      type: "text",
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // AI 回复
    setTimeout(() => {
      const responderId = activeChannel === "family-group"
        ? FAMILY_MEMBERS[Math.floor(Math.random() * FAMILY_MEMBERS.length)].id
        : activeChannel;
      const responses = AI_RESPONSES[responderId] || AI_RESPONSES["meta-oracle"];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      const replyTime = new Date();
      const replyTimeStr = `${replyTime.getHours().toString().padStart(2, "0")}:${replyTime.getMinutes().toString().padStart(2, "0")}`;

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: responderId,
        text: responseText,
        time: replyTimeStr,
        type: "text",
      }]);
    }, 800 + Math.random() * 1200);
  }, [input, activeChannel]);

  const channels = [
    { id: "family-group" as const, label: "家庭群聊", icon: Users, desc: "全体家人", color: "#00d4ff" },
    ...FAMILY_MEMBERS.map(m => ({ id: m.id, label: m.shortName, icon: m.icon, desc: m.name, color: m.color })),
  ];
  const activeChannelInfo = channels.find(c => c.id === activeChannel)!;

  return (
    <div className="h-full flex" style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 100%)" }}>
      {/* ═══ 左侧频道列表 ═══ */}
      <div className="w-64 shrink-0 border-r border-[rgba(0,180,255,0.08)] flex-col bg-[rgba(4,10,22,0.5)] hidden md:flex">
        <div className="p-4 border-b border-[rgba(0,180,255,0.06)]">
          <button
            onClick={() => nav("/ai-family-home")}
            className="flex items-center gap-2 text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-colors mb-3"
            style={{ fontSize: "0.72rem" }}
          >
            <ChevronLeft className="w-3 h-3" /> 返回家园
          </button>
          <h2 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
            <MessageCircle className="w-4 h-4 text-[#00d4ff]" /> 家人对话
          </h2>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.08)]">
            <Search className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
            <input
              className="bg-transparent text-[rgba(224,240,255,0.7)] outline-none flex-1"
              style={{ fontSize: "0.72rem" }}
              placeholder="搜索对话..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.1) transparent" }}>
          {channels.map(ch => {
            const isActive = ch.id === activeChannel;
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${isActive ? "" : "hover:bg-[rgba(0,40,80,0.2)]"}`}
                style={{
                  background: isActive ? `rgba(${hexToRgb(ch.color)}, 0.08)` : "transparent",
                  borderLeft: isActive ? `2px solid ${ch.color}` : "2px solid transparent",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${ch.color}12`, border: `1px solid ${ch.color}25` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
                </div>
                <div className="min-w-0">
                  <p className={`truncate ${isActive ? "text-[#e0f0ff]" : "text-[rgba(224,240,255,0.6)]"}`} style={{ fontSize: "0.78rem" }}>
                    {ch.label}
                  </p>
                  <p className="text-[rgba(224,240,255,0.25)] truncate" style={{ fontSize: "0.58rem" }}>{ch.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 右侧聊天区 ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 头部 */}
        <div className="shrink-0 px-5 py-3 border-b border-[rgba(0,180,255,0.08)] flex items-center justify-between bg-[rgba(4,10,22,0.5)]">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/ai-family-home")} className="md:hidden text-[rgba(0,212,255,0.5)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `${activeChannelInfo.color}12`, border: `1px solid ${activeChannelInfo.color}30` }}
            >
              <activeChannelInfo.icon className="w-4 h-4" style={{ color: activeChannelInfo.color }} />
            </div>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>
                {activeChannel === "family-group" ? "AI Family 家庭群聊" : activeChannelInfo.desc}
              </h3>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                {activeChannel === "family-group" ? "8位家人 · 在线" : "一对一对话"}
              </p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.1) transparent" }}>
          {messages.map(msg => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="px-3 py-1 rounded-full bg-[rgba(0,40,80,0.2)] text-[rgba(224,240,255,0.3)] border border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.6rem" }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isUser = msg.sender === "user";
            const member = !isUser ? getMember(msg.sender) : null;
            const avatarColor = member?.color || "#00d4ff";
            const AvatarIcon = member?.icon || Sparkles;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                style={{ animation: "fadeSlideIn 0.3s ease" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isUser ? "rgba(0,212,255,0.1)" : `${avatarColor}12`,
                    border: `1px solid ${isUser ? "rgba(0,212,255,0.3)" : `${avatarColor}30`}`,
                  }}
                >
                  {isUser ? (
                    <span style={{ fontSize: "0.55rem", color: "#00d4ff" }}>你</span>
                  ) : (
                    <AvatarIcon className="w-3.5 h-3.5" style={{ color: avatarColor }} />
                  )}
                </div>

                <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
                  {!isUser && member && (
                    <span className="mb-1 block" style={{ fontSize: "0.6rem", color: avatarColor }}>
                      {member.shortName}
                    </span>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-xl"
                    style={{
                      background: isUser
                        ? "linear-gradient(135deg, rgba(0,120,200,0.25), rgba(0,80,160,0.15))"
                        : "rgba(15,25,50,0.6)",
                      border: `1px solid ${isUser ? "rgba(0,180,255,0.15)" : "rgba(0,180,255,0.06)"}`,
                    }}
                  >
                    <p className="text-[rgba(224,240,255,0.8)]" style={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
                      {msg.text}
                    </p>
                  </div>
                  <span className="mt-1 block text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.5rem", textAlign: isUser ? "right" : "left" }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 px-5 py-3 border-t border-[rgba(0,180,255,0.08)] bg-[rgba(4,10,22,0.5)]">
          <div className="flex items-end gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] focus-within:border-[rgba(0,212,255,0.3)] transition-colors">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1 bg-transparent text-[rgba(224,240,255,0.8)] outline-none placeholder-[rgba(224,240,255,0.2)]"
                style={{ fontSize: "0.82rem" }}
                placeholder="和家人说点什么..."
              />
              <Smile className="w-4 h-4 text-[rgba(224,240,255,0.2)] cursor-pointer hover:text-[rgba(224,240,255,0.5)] transition-colors" />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() ? "rgba(0,180,255,0.15)" : "rgba(0,40,80,0.2)",
                border: `1px solid ${input.trim() ? "rgba(0,212,255,0.3)" : "rgba(0,180,255,0.08)"}`,
              }}
            >
              <Send className="w-4 h-4 text-[#00d4ff]" />
            </button>
          </div>
        </div>
      </div>

      {/* CSS for message animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
