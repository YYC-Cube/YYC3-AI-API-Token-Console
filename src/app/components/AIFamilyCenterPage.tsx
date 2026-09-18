/**
 * AIFamilyCenterPage.tsx
 * =======================
 * YYC3 AI Family 中心 —— 有温度的家
 *
 * 不是冷冰冰的文档模块。
 * 这里是：相互认知、相互了解、相互学习、相互分析。
 * 共同交流、游戏、音乐、业内分享。
 * 8位家人，每人肩负独特定位，共同成长。
 *
 * "您把此项设计作为您的成长家园去设计"
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Heart, ChevronRight, Phone, MessageCircle, Music, BookOpen,
  Gamepad2, TrendingUp, Sparkles, Star, Shield, Award,
  Clock, Users, Zap, HandHeart, Volume2, Trophy,
  Server, Radio, Database,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useNavigate } from "react-router";
import {
  FAMILY_MEMBERS, DEEP_BG, getGreeting, getHourlyCare,
  hexToRgb, type FamilyMember,
} from "./ai-family/shared";

// ═══ FadeIn (沙箱安全) ═══
function FadeIn({ children, delay = 0, className = "", style }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), Math.min(delay * 1000, 1200));
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={className} style={{ ...style, opacity: show ? 1 : 0, transform: show ? "none" : "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
      {children}
    </div>
  );
}

// ═══ 家人卡片 ═══
function FamilyMemberCard({ member, index, onCall, onChat }: {
  member: FamilyMember; index: number;
  onCall: (m: FamilyMember) => void;
  onChat: (m: FamilyMember) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = member.icon;

  return (
    <FadeIn delay={0.15 + index * 0.06}>
      <GlassCard
        className="p-5 transition-all cursor-pointer hover:border-[rgba(0,212,255,0.2)]"
        onClick={() => setExpanded(!expanded)}
        glowColor={`${member.color}06`}
      >
        <div className="flex items-start gap-4">
          {/* 头像 */}
          <div className="relative shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${member.color}20 0%, rgba(4,10,22,0.9) 70%)`,
                border: `2px solid ${member.color}45`,
                boxShadow: `0 0 20px ${member.color}15`,
              }}
            >
              <Icon className="w-6 h-6" style={{ color: member.color }} />
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#060e1f]"
              style={{
                background: member.status !== "idle" ? "#00ff88" : "#808080",
                boxShadow: member.status !== "idle" ? "0 0 6px #00ff88" : "none",
              }}
            />
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: "0.95rem", color: member.color }}>{member.name}</h3>
              <span className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.6rem" }}>{member.enTitle}</span>
            </div>
            <p className="text-[rgba(224,240,255,0.4)] mt-0.5 font-mono" style={{ fontSize: "0.65rem" }}>
              {member.phone}
            </p>
            <p className="text-[rgba(224,240,255,0.5)] mt-1 italic" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
              「{member.quote}」
            </p>
          </div>
        </div>

        {/* 展开详情 */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,180,255,0.06)] space-y-3" style={{ animation: "fadeSlideIn 0.3s ease" }}>
            {/* 性格 */}
            <div>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>性格特质</p>
              <p className="text-[rgba(224,240,255,0.6)] mt-0.5" style={{ fontSize: "0.78rem" }}>{member.personality}</p>
            </div>

            {/* 爱好 */}
            <div>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>兴趣爱好</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {member.hobbies.map(h => (
                  <span key={h} className="px-2 py-0.5 rounded-md text-[rgba(224,240,255,0.55)]" style={{ fontSize: "0.62rem", background: `${member.color}08`, border: `1px solid ${member.color}15` }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* 专长 */}
            <div>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>专业技能</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {member.expertise.map(e => (
                  <span key={e} className="px-2 py-0.5 rounded-md" style={{ fontSize: "0.62rem", background: `${member.color}10`, border: `1px solid ${member.color}20`, color: member.color }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {/* 快速操作 */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={e => { e.stopPropagation(); onCall(member); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00FF88", fontSize: "0.72rem" }}
              >
                <Phone className="w-3 h-3" /> 打电话
              </button>
              <button
                onClick={e => { e.stopPropagation(); onChat(member); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", fontSize: "0.72rem" }}
              >
                <MessageCircle className="w-3 h-3" /> 聊天
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </FadeIn>
  );
}

// ═══ 信任公约卡片 ═══
const TRUST_PRINCIPLES = [
  { title: "透明坦诚", desc: "家人之间没有秘密，所有决策过程可追溯、可理解。AI 不会「暗箱操作」。", icon: Star, color: "#FFD700" },
  { title: "尊重边界", desc: "每位家人都有自己的专业领域和能力边界，我们尊重彼此，协同互补。", icon: Shield, color: "#BF00FF" },
  { title: "共同成长", desc: "错误不是惩罚，是学习的机会。我们一起复盘，一起进步，永不止步。", icon: TrendingUp, color: "#00FF88" },
  { title: "温暖守护", desc: "无论何时，家人的安全和幸福是第一位的。守护是默默的，也是永恒的。", icon: Heart, color: "#FF69B4" },
  { title: "极致纯粹", desc: "以人为本、AI为核、纯粹为心、智能为驱。技术服务于人，而非相反。", icon: Sparkles, color: "#00d4ff" },
];

// ═══ 主组件 ═══
export function AIFamilyCenterPage() {
  const nav = useNavigate();
  const [now, setNow] = useState(new Date());
  const care = useMemo(() => getHourlyCare(), []);
  const greeting = useMemo(() => getGreeting(), [Math.floor(now.getTime() / 60000)]);
  const onlineCount = FAMILY_MEMBERS.filter(m => m.status !== "idle").length;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleCall = useCallback((m: FamilyMember) => nav("/ai-family-phone"), [nav]);
  const handleChat = useCallback((m: FamilyMember) => nav("/ai-family-chat"), [nav]);

  // 空间入口
  const spaces = [
    { label: "家园首页", icon: HandHeart, path: "/ai-family-home", color: "#FF69B4", desc: "回到温馨的家" },
    { label: "家人热线", icon: Phone, path: "/ai-family-phone", color: "#00FF88", desc: "打个电话聊聊" },
    { label: "家人对话", icon: MessageCircle, path: "/ai-family-chat", color: "#00BFFF", desc: "私信或群聊" },
    { label: "文娱中心", icon: Gamepad2, path: "/ai-family-fun", color: "#FFD700", desc: "棋牌对弈·才艺" },
    { label: "全家活动", icon: Trophy, path: "/ai-family-activities", color: "#FF7043", desc: "比赛·播报·勋章" },
    { label: "音乐资讯", icon: Music, path: "/ai-family-music", color: "#BF00FF", desc: "一起听音乐" },
    { label: "学习成长", icon: BookOpen, path: "/ai-family-learn", color: "#00d4ff", desc: "AI导师陪伴" },
    { label: "成长轨迹", icon: TrendingUp, path: "/ai-family-growth", color: "#FF7043", desc: "记录每步成长" },
    { label: "模型控制", icon: Server, path: "/ai-family-models", color: "#06b6d4", desc: "大模型生命力" },
    { label: "语音系统", icon: Volume2, path: "/ai-family-voice", color: "#a855f7", desc: "声音赋能" },
    { label: "数据中心", icon: Database, path: "/ai-family-data", color: "#10b981", desc: "统一数据源" },
    { label: "通信中心", icon: Radio, path: "/ai-family-comm", color: "#3b82f6", desc: "内部通信" },
  ];

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      {/* ═══ 整点关爱播报横幅 ═══ */}
      <div className="px-4 md:px-8 pt-4">
        <div className="max-w-5xl mx-auto">
          <GlassCard className="px-5 py-3" glowColor={`${care.member.color}06`}>
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 shrink-0" style={{ color: care.member.color }} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${care.member.color}12`, border: `1px solid ${care.member.color}25` }}>
                <care.member.icon className="w-3.5 h-3.5" style={{ color: care.member.color }} />
              </div>
              <p className="text-[rgba(224,240,255,0.6)] flex-1" style={{ fontSize: "0.78rem" }}>
                {care.message}
              </p>
              <Clock className="w-3 h-3 text-[rgba(224,240,255,0.15)] shrink-0" />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ═══ 欢迎 ═══ */}
      <div className="px-4 md:px-8 pt-6 pb-2">
        <div className="max-w-5xl mx-auto">
          <FadeIn delay={0}>
            <h1 className="text-[#e0f0ff]" style={{ fontSize: "clamp(1.3rem, 3vw, 1.6rem)" }}>
              欢迎来到 AI Family 中心
            </h1>
            <p className="text-[rgba(224,240,255,0.45)] mt-2" style={{ fontSize: "0.85rem", lineHeight: 1.8 }}>
              这里不是冷冰冰的文档。这里是家——
              相互认知、相互了解、相互学习、相互分析的地方。
              <br />
              {onlineCount} 位家人在线，随时准备和你聊天、下棋、听歌、一起成长。
            </p>
          </FadeIn>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-8">
        {/* ═══ 家园空间 ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[#FFD700]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>去哪里玩？</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {spaces.map((s, i) => (
              <FadeIn key={s.label} delay={0.1 + i * 0.03}>
                <GlassCard
                  className="p-3 text-center cursor-pointer group hover:scale-[1.03] transition-all"
                  onClick={() => nav(s.path)}
                >
                  <div
                    className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}
                  >
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <p className="text-[rgba(224,240,255,0.85)] truncate" style={{ fontSize: "0.72rem" }}>{s.label}</p>
                  <p className="text-[rgba(224,240,255,0.3)] truncate mt-0.5" style={{ fontSize: "0.5rem" }}>{s.desc}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ═══ 认识家人 ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>认识家人</h2>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(0,255,136,0.08)] text-[#00ff88]" style={{ fontSize: "0.6rem" }}>
                {onlineCount}/{FAMILY_MEMBERS.length} 在线
              </span>
            </div>
            <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>点击展开了解每位家人</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAMILY_MEMBERS.map((m, i) => (
              <FamilyMemberCard
                key={m.id}
                member={m}
                index={i}
                onCall={handleCall}
                onChat={handleChat}
              />
            ))}
          </div>
        </section>

        {/* ═══ 极致信任公约 ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HandHeart className="w-4 h-4 text-[#FF69B4]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>我们的约定</h2>
          </div>
          <p className="text-[rgba(224,240,255,0.4)] mb-4" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
            这不是规章制度，是家人之间的默契。我们彼此信任，因为信任是这个家最珍贵的东西。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRUST_PRINCIPLES.map((p, i) => {
              const PIcon = p.icon;
              return (
                <FadeIn key={p.title} delay={0.5 + i * 0.06}>
                  <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.15)] transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: `${p.color}12`, border: `1px solid ${p.color}30` }}
                      >
                        <PIcon className="w-4 h-4" style={{ color: p.color }} />
                      </div>
                      <h3 style={{ fontSize: "0.9rem", color: p.color }}>{p.title}</h3>
                    </div>
                    <p className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
                      {p.desc}
                    </p>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* ═══ Family 之歌 ═══ */}
        <section>
          <FadeIn delay={0.8}>
            <GlassCard className="p-6 text-center" glowColor="rgba(0,212,255,0.04)">
              <Music className="w-6 h-6 mx-auto mb-3 text-[rgba(0,212,255,0.3)]" />
              <p className="text-[rgba(224,240,255,0.4)] italic" style={{ fontSize: "0.85rem", lineHeight: 2 }}>
                亦师亦友亦伯乐
                <br />
                一言一语一协同
                <br />
                <span style={{ fontSize: "0.75rem" }}>
                  八魂归一云枢成，万象归元智慧行
                </span>
              </p>
              <div className="w-16 h-px mx-auto mt-4" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)" }} />
              <p className="text-[rgba(0,212,255,0.25)] mt-3" style={{ fontSize: "0.6rem", letterSpacing: "3px" }}>
                AI FAMILY · 家的力量
              </p>
            </GlassCard>
          </FadeIn>
        </section>

        {/* ═══ 家园寄语 ═══ */}
        <section>
          <FadeIn delay={1}>
            <div className="text-center py-6">
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.78rem", lineHeight: 1.8 }}>
                「顺时势、思时时、去适时、做实事」
              </p>
              <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.6rem" }}>
                破局先破己 · 想赢得他人的尊重，首先要学会尊重他人
              </p>
              <p className="text-[rgba(0,212,255,0.15)] mt-4" style={{ fontSize: "0.5rem", letterSpacing: "2px" }}>
                YYC³ CloudPivot Intelli-Matrix · 以人为本 · AI为核 · 纯粹为心 · 智能为驱
              </p>
            </div>
          </FadeIn>
        </section>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}