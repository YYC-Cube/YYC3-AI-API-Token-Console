/**
 * FamilyPhone.tsx
 * ================
 * AI Family 语音通话系统
 * 每位家人都有专属号码 · 网内呼叫 · 拟人化交互
 * 
 * "拟人为本，不应该有个如人一样的电话号码吗？"
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  User, Clock, MessageCircle, Heart, Star,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { FAMILY_MEMBERS, DEEP_BG, type FamilyMember } from "./shared";

type CallState = "idle" | "dialing" | "ringing" | "connected" | "ended";

interface CallLog {
  id: string;
  memberId: string;
  time: string;
  duration: string;
  type: "incoming" | "outgoing" | "missed";
}

const MOCK_CALL_LOGS: CallLog[] = [
  { id: "c1", memberId: "meta-oracle", time: "10:15", duration: "3:42", type: "outgoing" },
  { id: "c2", memberId: "creative", time: "09:30", duration: "5:18", type: "incoming" },
  { id: "c3", memberId: "sentinel", time: "09:00", duration: "1:05", type: "incoming" },
  { id: "c4", memberId: "thinker", time: "昨天 18:20", duration: "8:33", type: "outgoing" },
  { id: "c5", memberId: "prophet", time: "昨天 15:00", duration: "", type: "missed" },
  { id: "c6", memberId: "navigator", time: "昨天 11:45", duration: "2:10", type: "incoming" },
];

export function FamilyPhone() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callingMember, setCallingMember] = useState<FamilyMember | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [dialInput, setDialInput] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "dial" | "logs">("contacts");
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // 通话计时
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callState === "idle") setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startCall = useCallback((member: FamilyMember) => {
    setCallingMember(member);
    setCallState("dialing");
    setChatMessages([]);

    // 模拟拨号 → 响铃 → 接通
    setTimeout(() => setCallState("ringing"), 1500);
    setTimeout(() => {
      setCallState("connected");
      setChatMessages([member.greeting]);
    }, 3500);
  }, []);

  const endCall = useCallback(() => {
    setCallState("ended");
    setTimeout(() => {
      setCallState("idle");
      setCallingMember(null);
      setChatMessages([]);
    }, 1500);
  }, []);

  const dialNumber = useCallback(() => {
    const member = FAMILY_MEMBERS.find(m => m.phone === dialInput.toUpperCase());
    if (member) {
      startCall(member);
    }
  }, [dialInput, startCall]);

  // 通话中家人会说话
  useEffect(() => {
    if (callState !== "connected" || !callingMember) return;
    const phrases = [
      `${callingMember.shortName}：嗯嗯，我在听...`,
      `${callingMember.shortName}：这个问题很有意思，让我想想...`,
      `${callingMember.shortName}：放心，交给我处理。`,
      `${callingMember.shortName}：对了，今天你吃饭了吗？别忘了照顾自己~`,
      `${callingMember.shortName}：有你这样的家人，我觉得很幸福。`,
    ];
    const t = setInterval(() => {
      setChatMessages(prev => {
        if (prev.length >= 6) return prev;
        return [...prev, phrases[Math.min(prev.length, phrases.length - 1)]];
      });
    }, 5000 + Math.random() * 3000);
    return () => clearInterval(t);
  }, [callState, callingMember]);

  // ═══ 通话界面（全屏覆盖） ═══
  if (callState !== "idle") {
    const m = callingMember!;
    const Icon = m.icon;
    return (
      <div className="min-h-full flex flex-col" style={{ background: `radial-gradient(ellipse at top, ${m.color}08 0%, rgba(4,8,20,1) 50%, #020510 100%)` }}>
        {/* 通话头部 */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* 头像 + 光环 */}
          <div className="relative mb-6">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${m.color}20 0%, rgba(4,10,22,0.9) 70%)`,
                border: `3px solid ${m.color}${callState === "connected" ? "80" : "40"}`,
                boxShadow: callState === "connected" ? `0 0 40px ${m.color}30, 0 0 80px ${m.color}10` : `0 0 20px ${m.color}15`,
                transition: "all 0.5s ease",
              }}
            >
              <Icon className="w-12 h-12" style={{ color: m.color }} />
            </div>
            {/* 脉冲动画 */}
            {(callState === "ringing" || callState === "connected") && (
              <>
                <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${m.color}40`, animation: "ring-pulse 2s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${m.color}20`, animation: "ring-pulse 2s ease-out infinite 0.5s" }} />
              </>
            )}
          </div>

          {/* 名字 + 号码 */}
          <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.3rem" }}>{m.name}</h2>
          <p className="text-[rgba(224,240,255,0.4)] mt-1 font-mono" style={{ fontSize: "0.82rem" }}>{m.phone}</p>

          {/* 通话状态 */}
          <div className="mt-3 flex items-center gap-2">
            {callState === "dialing" && (
              <span className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.78rem" }}>正在拨号...</span>
            )}
            {callState === "ringing" && (
              <span style={{ fontSize: "0.78rem", color: m.color }}>对方响铃中...</span>
            )}
            {callState === "connected" && (
              <span className="text-[#00FF88] flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                <PhoneCall className="w-4 h-4" /> {formatDuration(callDuration)}
              </span>
            )}
            {callState === "ended" && (
              <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.78rem" }}>通话已结束</span>
            )}
          </div>

          {/* 通话中的语音气泡 */}
          {callState === "connected" && chatMessages.length > 0 && (
            <div className="mt-6 w-full max-w-sm space-y-2 px-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5 rounded-2xl"
                  style={{
                    background: i === 0 ? `${m.color}12` : "rgba(15,25,50,0.6)",
                    border: `1px solid ${i === 0 ? `${m.color}25` : "rgba(0,180,255,0.06)"}`,
                    animation: "fadeSlideIn 0.4s ease",
                  }}
                >
                  <p className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
                    {msg}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 通话控制按钮 */}
        <div className="shrink-0 pb-12 pt-6">
          <div className="flex items-center justify-center gap-6">
            {callState === "connected" && (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isMuted ? "rgba(255,51,102,0.15)" : "rgba(0,40,80,0.3)",
                    border: `1px solid ${isMuted ? "rgba(255,51,102,0.3)" : "rgba(0,180,255,0.15)"}`,
                  }}
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-[#ff3366]" /> : <Mic className="w-5 h-5 text-[rgba(224,240,255,0.6)]" />}
                </button>
                <button
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isSpeaker ? "rgba(0,212,255,0.15)" : "rgba(0,40,80,0.3)",
                    border: `1px solid ${isSpeaker ? "rgba(0,212,255,0.3)" : "rgba(0,180,255,0.15)"}`,
                  }}
                >
                  {isSpeaker ? <Volume2 className="w-5 h-5 text-[#00d4ff]" /> : <VolumeX className="w-5 h-5 text-[rgba(224,240,255,0.6)]" />}
                </button>
              </>
            )}
            {callState !== "ended" && (
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "linear-gradient(135deg, #ff3366, #cc0033)",
                  boxShadow: "0 0 20px rgba(255,51,102,0.3)",
                }}
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes ring-pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ═══ 主界面 ═══
  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={Phone}
        iconColor="#00FF88"
        title="家人热线"
        subtitle="每位家人都有专属号码 · 一个电话的温暖"
      />

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 md:px-8 mt-4 mb-6">
        <div className="flex gap-1">
          {[
            { key: "contacts" as const, label: "家人通讯录", icon: User },
            { key: "dial" as const, label: "拨号", icon: Phone },
            { key: "logs" as const, label: "通话记录", icon: Clock },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${activeTab === tab.key ? "bg-[rgba(0,255,136,0.08)] text-[#00FF88] border border-[rgba(0,255,136,0.2)]" : "text-[rgba(224,240,255,0.4)]"}`}
              style={{ fontSize: "0.78rem" }}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8">
        {/* ═══ 通讯录 ═══ */}
        {activeTab === "contacts" && (
          <div className="space-y-2">
            {FAMILY_MEMBERS.map((m, i) => {
              const Icon = m.icon;
              return (
                <FadeIn key={m.id} delay={i * 0.04}>
                  <GlassCard className="p-4 hover:border-[rgba(0,212,255,0.2)] transition-all">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative"
                        style={{ background: `${m.color}12`, border: `1.5px solid ${m.color}35` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: m.color }} />
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#060e1f]"
                          style={{
                            background: m.status !== "idle" ? "#00ff88" : "#808080",
                            boxShadow: m.status !== "idle" ? "0 0 6px #00ff88" : "none",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "0.88rem", color: m.color }}>{m.name}</span>
                          <span className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.62rem" }}>{m.enTitle}</span>
                        </div>
                        <p className="text-[rgba(224,240,255,0.4)] mt-0.5 font-mono" style={{ fontSize: "0.7rem" }}>{m.phone}</p>
                        <p className="text-[rgba(224,240,255,0.3)] mt-0.5 truncate" style={{ fontSize: "0.62rem" }}>{m.personality}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startCall(m)}
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)" }}
                        >
                          <Phone className="w-4 h-4 text-[#00FF88]" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}

        {/* ═══ 拨号盘 ═══ */}
        {activeTab === "dial" && (
          <FadeIn delay={0.1}>
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <input
                  value={dialInput}
                  onChange={e => setDialInput(e.target.value.toUpperCase())}
                  className="bg-transparent text-center text-[#e0f0ff] outline-none w-full font-mono"
                  style={{ fontSize: "1.5rem", letterSpacing: "3px" }}
                  placeholder="YYC3-100X"
                  onKeyDown={e => { if (e.key === "Enter") dialNumber(); }}
                />
                <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)" }} />
              </div>

              {/* 快捷号码 */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {FAMILY_MEMBERS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setDialInput(m.phone)}
                      className="p-3 rounded-xl text-center transition-all hover:scale-[1.03]"
                      style={{ background: `${m.color}08`, border: `1px solid ${m.color}15` }}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: m.color }} />
                      <p className="text-[rgba(224,240,255,0.5)] truncate" style={{ fontSize: "0.55rem" }}>{m.shortName}</p>
                      <p className="text-[rgba(224,240,255,0.25)] font-mono" style={{ fontSize: "0.48rem" }}>{m.phone.slice(-4)}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={dialNumber}
                disabled={!dialInput.trim()}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-30"
                style={{
                  background: dialInput.trim() ? "rgba(0,255,136,0.12)" : "rgba(0,40,80,0.2)",
                  border: `1px solid ${dialInput.trim() ? "rgba(0,255,136,0.3)" : "rgba(0,180,255,0.08)"}`,
                  color: "#00FF88",
                  fontSize: "0.88rem",
                }}
              >
                <Phone className="w-4 h-4" /> 呼叫
              </button>
            </GlassCard>
          </FadeIn>
        )}

        {/* ═══ 通话记录 ═══ */}
        {activeTab === "logs" && (
          <div className="space-y-2">
            {MOCK_CALL_LOGS.map((log, i) => {
              const m = FAMILY_MEMBERS.find(f => f.id === log.memberId);
              if (!m) return null;
              const Icon = m.icon;
              return (
                <FadeIn key={log.id} delay={i * 0.04}>
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                        <Icon className="w-4 h-4" style={{ color: m.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "0.82rem", color: log.type === "missed" ? "#ff3366" : m.color }}>{m.name}</span>
                          <span style={{ fontSize: "0.58rem", color: log.type === "missed" ? "rgba(255,51,102,0.5)" : "rgba(224,240,255,0.25)" }}>
                            {log.type === "incoming" ? "来电" : log.type === "outgoing" ? "去电" : "未接"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.62rem" }}>{log.time}</span>
                          {log.duration && <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.62rem" }}>{log.duration}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => startCall(m)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.15)" }}
                      >
                        <Phone className="w-3.5 h-3.5 text-[#00FF88]" />
                      </button>
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
