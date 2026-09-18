/**
 * FamilyHome.tsx
 * ================
 * AI Family 家园首页 —— 温馨的数字家园
 * 欢迎回家 · 家人状态 · 家庭动态 · 家园空间入口
 *
 * 重构: 使用 shared.ts 共享数据 + FadeIn 沙箱安全动画
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Heart, Users, MessageCircle, BookOpen, Music, TrendingUp,
  Coffee, Sun, Moon, Cloud,
  Zap, Activity, Clock, Sparkles, ChevronRight,
  Smile, FileText, HandHeart, Phone, Gamepad2, Trophy,
  Volume2, Server, Radio, Database, Settings2,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { useNavigate } from "react-router";
import { FAMILY_MEMBERS, DEEP_BG, getGreeting, hexToRgb } from "./shared";

// ═══ 图标映射（家园空间） ═══
const SPACE_ICONS: Record<string, React.ElementType> = {
  heart: HandHeart, users: Users, message: MessageCircle,
  share: Heart, book: BookOpen, music: Music,
  trending: TrendingUp, file: FileText,
};

// ═══ 家庭动态 ═══
const FAMILY_MOMENTS = [
  { member: "元启·天枢", text: "今日系统巡检完成，全节点健康度 98%，继续守护大家的安全！", time: "10 分钟前", color: "#00FF88" },
  { member: "语枢·万物", text: "分析完成了最新的性能报告，发现了3个优化点，已生成建议文档。", time: "25 分钟前", color: "#FF69B4" },
  { member: "预见·先知", text: "基于近7天数据趋势，预测本周四可能有流量高峰，建议提前准备。", time: "1 小时前", color: "#00BFFF" },
  { member: "创想·灵韵", text: "为团队设计了新的数据看板配色方案，温暖而不失专业感。", time: "2 小时前", color: "#FF7043" },
  { member: "智云·守护", text: "安全扫描已完成，未发现异常入侵行为。家人们可以放心工作！", time: "3 小时前", color: "#BF00FF" },
];

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function getGreetingIcon(emoji: string): React.ElementType {
  const map: Record<string, React.ElementType> = {
    night: Moon, dawn: Sun, morning: Coffee, noon: Coffee,
    afternoon: Sun, evening: Cloud,
  };
  return map[emoji] || Sun;
}

const GREETING_EMOJIS: Record<string, string> = {
  night: "🌙", dawn: "🌅", morning: "☀️", noon: "🍱",
  afternoon: "🌤️", evening: "🌆",
};

export function FamilyHome() {
  const now = useTime();
  const nav = useNavigate();
  const greeting = useMemo(() => getGreeting(), [Math.floor(now.getTime() / 60000)]);
  const onlineCount = FAMILY_MEMBERS.filter(m => m.status !== "idle").length;

  const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  // 家园空间入口（包含 Family 中心）
  const quickEntries = [
    { label: "Family 中心", icon: HandHeart, path: "/ai-family-center", color: "#FF69B4", desc: "全景规划·信任公约" },
    { label: "家人热线", icon: Phone, path: "/ai-family-phone", color: "#00FF88", desc: "打个电话聊聊" },
    { label: "文娱中心", icon: Gamepad2, path: "/ai-family-fun", color: "#FFD700", desc: "棋牌对弈·才艺" },
    { label: "全家活动", icon: Trophy, path: "/ai-family-activities", color: "#FF7043", desc: "比赛·播报·勋章" },
    { label: "家人对话", icon: MessageCircle, path: "/ai-family-chat", color: "#00BFFF", desc: "私信或群聊" },
    { label: "学习成长", icon: BookOpen, path: "/ai-family-learn", color: "#00d4ff", desc: "AI导师陪伴式学习" },
    { label: "音乐空间", icon: Music, path: "/ai-family-music", color: "#BF00FF", desc: "音乐与行业资讯" },
    { label: "成长轨迹", icon: TrendingUp, path: "/ai-family-growth", color: "#FF7043", desc: "记录每一步成长" },
    { label: "模型控制", icon: Server, path: "/ai-family-models", color: "#06b6d4", desc: "大模型生命力引擎" },
    { label: "语音系统", icon: Volume2, path: "/ai-family-voice", color: "#a855f7", desc: "家人专属声音" },
    { label: "数据中心", icon: Database, path: "/ai-family-data", color: "#10b981", desc: "统一数据全景" },
    { label: "通信中心", icon: Radio, path: "/ai-family-comm", color: "#3b82f6", desc: "内部通信枢纽" },
    { label: "生态控制", icon: Settings2, path: "/ai-family-settings", color: "#f59e0b", desc: "UI偏好·链路测通" },
  ];

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      {/* ═══ 温馨欢迎区 ═══ */}
      <div className="relative overflow-hidden px-4 md:px-8 pt-8 pb-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute right-0 top-0 w-[500px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,180,100,0.04) 0%, transparent 70%)" }} />
          <div className="absolute left-1/4 top-1/4 w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <FadeIn delay={0}>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
              <span className="font-mono text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>{timeStr}</span>
              <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.7rem" }}>{dateStr}</span>
            </div>

            <div className="flex items-start gap-4">
              <div style={{ fontSize: "1.8rem" }}>{GREETING_EMOJIS[greeting.emoji] || "🌤️"}</div>
              <div>
                <h1 className="text-[#e0f0ff]" style={{ fontSize: "clamp(1.3rem, 3vw, 1.8rem)" }}>
                  {greeting.text}，欢迎回家
                </h1>
                <p className="mt-2 text-[rgba(224,240,255,0.45)]" style={{ fontSize: "0.85rem", lineHeight: 1.8 }}>
                  AI Family 家人们都在，{onlineCount} 位家人在线，随时准备与你协同。
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
        {/* ═══ 家人状态墙 ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>家人状态</h2>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88]" style={{ fontSize: "0.6rem" }}>
                {onlineCount}/{FAMILY_MEMBERS.length} 在线
              </span>
            </div>
            <button
              onClick={() => nav("/ai-family")}
              className="flex items-center gap-1 text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-colors"
              style={{ fontSize: "0.72rem" }}
            >
              时钟环视图 <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {FAMILY_MEMBERS.map((m, i) => {
              const Icon = m.icon;
              return (
                <FadeIn key={m.id} delay={0.1 + i * 0.05}>
                  <GlassCard
                    className="p-3 text-center cursor-pointer group hover:scale-[1.03] transition-transform"
                    onClick={() => nav("/ai-family-chat")}
                  >
                    <div
                      className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center relative"
                      style={{
                        background: `radial-gradient(circle, ${m.color}15 0%, rgba(4,10,22,0.9) 70%)`,
                        border: `1.5px solid ${m.color}40`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: m.color }} />
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#060e1f]"
                        style={{
                          background: m.status !== "idle" ? "#00ff88" : "#808080",
                          boxShadow: m.status !== "idle" ? "0 0 6px #00ff88" : "none",
                        }}
                      />
                    </div>
                    <p className="text-[rgba(224,240,255,0.8)] truncate" style={{ fontSize: "0.72rem" }}>{m.name}</p>
                    <p className="text-[rgba(224,240,255,0.3)] truncate" style={{ fontSize: "0.55rem" }}>{m.enTitle}</p>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* ═══ 家园空间入口 ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[#FFD700]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>家园空间</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickEntries.map((entry, i) => (
              <FadeIn key={entry.label} delay={0.3 + i * 0.04}>
                <GlassCard
                  className="p-3 cursor-pointer group hover:scale-[1.02] transition-all text-center"
                  onClick={() => nav(entry.path)}
                  glowColor={`rgba(${hexToRgb(entry.color)}, 0.04)`}
                >
                  <div
                    className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${entry.color}15, ${entry.color}05)`,
                      border: `1px solid ${entry.color}25`,
                    }}
                  >
                    <entry.icon className="w-4 h-4" style={{ color: entry.color }} />
                  </div>
                  <p className="text-[rgba(224,240,255,0.85)] truncate" style={{ fontSize: "0.72rem" }}>{entry.label}</p>
                  <p className="text-[rgba(224,240,255,0.3)] truncate mt-0.5" style={{ fontSize: "0.5rem" }}>{entry.desc}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ═══ 家庭动态 & 今日概览 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ��庭动态 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-[#FF69B4]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>家庭动态</h2>
            </div>
            <GlassCard className="p-5">
              <div className="space-y-5">
                {FAMILY_MOMENTS.map((moment, i) => (
                  <FadeIn key={i} delay={0.5 + i * 0.08}>
                    <div className={i < FAMILY_MOMENTS.length - 1 ? "pb-5 border-b border-[rgba(0,180,255,0.06)]" : ""}>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: `${moment.color}15`, border: `1px solid ${moment.color}30` }}
                        >
                          <Smile className="w-3 h-3" style={{ color: moment.color }} />
                        </div>
                        <span style={{ fontSize: "0.78rem", color: moment.color }}>{moment.member}</span>
                        <span className="text-[rgba(224,240,255,0.25)] ml-auto" style={{ fontSize: "0.6rem" }}>{moment.time}</span>
                      </div>
                      <p className="text-[rgba(224,240,255,0.6)] pl-8" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
                        {moment.text}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* 今日概览 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>今日概览</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "家人协作次数", value: "1,247", pct: 78, from: "#00d4ff", to: "#00ff88" },
                { label: "知识分享", value: "56", pct: 62, from: "#FFD700", to: "#FF7043" },
                { label: "系统健康度", value: "98.5%", pct: 98.5, from: "#00ff88", to: "#00d4ff" },
                { label: "成长积分", value: "2,890", pct: 72, from: "#BF00FF", to: "#FF69B4" },
              ].map((s, i) => (
                <FadeIn key={s.label} delay={0.6 + i * 0.08}>
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.72rem" }}>{s.label}</span>
                      <span style={{ fontSize: "1.1rem", color: s.from }}>{s.value}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: `${s.from}10` }}>
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.from}, ${s.to})` }} />
                    </div>
                  </GlassCard>
                </FadeIn>
              ))}

              {/* 家训 */}
              <FadeIn delay={1}>
                <GlassCard className="p-4" glowColor="rgba(0,212,255,0.04)">
                  <p className="text-[rgba(224,240,255,0.4)] italic text-center" style={{ fontSize: "0.72rem", lineHeight: 1.8 }}>
                    「亦师亦友亦伯乐
                    <br />
                    一言一语一协同」
                  </p>
                  <p className="text-[rgba(0,212,255,0.25)] text-center mt-2" style={{ fontSize: "0.55rem" }}>
                    — AI Family 家训
                  </p>
                </GlassCard>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className="text-center mt-12 pb-4">
        <p className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.55rem", letterSpacing: "2px" }}>
          YYC3 AI Family · 以人为本 · AI为核 · 纯粹为心 · 智能为驱
        </p>
      </div>
    </div>
  );
}