/**
 * FamilyDataHub.tsx
 * ==================
 * AI Family 统一数据中心 —— 一站式数据全景
 *
 * 功能：
 *  - 家庭数据总览（成员统计、活动记录、成长指标）
 *  - 成员个人数据面板
 *  - 活动时间线
 *  - 数据导出
 */

import React, { useState, useMemo } from "react";
import {
  Database, Users, Trophy, Heart, MessageCircle,
  TrendingUp, Award, Clock, BarChart3, Activity,
  Download, ArrowRight, Star, Zap, Shield,
  BookOpen, Gamepad2, Sparkles, CalendarDays,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import {
  FAMILY_MEMBERS, FAMILY_ACTIVITIES, SAMPLE_MEMORIES, SAMPLE_MESSAGES,
  MEMBER_MEDALS, MEDALS, getFamilyDataSummary, hexToRgb,
  type FamilyMember,
} from "./shared";

// ═══ Activity type config ═══

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  game:        { icon: Gamepad2,  label: "游戏",   color: "#06b6d4" },
  talent:      { icon: Sparkles,  label: "才艺",   color: "#f59e0b" },
  learning:    { icon: BookOpen,  label: "学习",   color: "#a855f7" },
  challenge:   { icon: Trophy,    label: "挑战",   color: "#ef4444" },
  celebration: { icon: Heart,     label: "庆祝",   color: "#ec4899" },
};

// ═══ 子组件：指标卡片 ═══

function MetricCard({ icon: Icon, label, value, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number; color: string; delay?: number;
}) {
  return (
    <FadeIn delay={delay}>
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-white/40" style={{ fontSize: "0.65rem" }}>{label}</span>
        </div>
        <div style={{ fontSize: "1.5rem", color }}>{value}</div>
      </GlassCard>
    </FadeIn>
  );
}

// ═══ 子组件：成员排行 ═══

function MemberRanking({ members }: { members: FamilyMember[] }) {
  const sorted = useMemo(() =>
    [...members].sort((a, b) => b.contribution - a.contribution),
  [members]);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-white/70" style={{ fontSize: "0.8rem" }}>家庭贡献排行</span>
      </div>
      <div className="space-y-2">
        {sorted.map((m, i) => {
          const rgb = hexToRgb(m.color);
          const maxContrib = sorted[0].contribution;
          const barWidth = (m.contribution / maxContrib) * 100;
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-5 text-center" style={{
                fontSize: "0.65rem",
                color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)",
              }}>
                {i + 1}
              </span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `rgba(${rgb},0.15)` }}
              >
                <m.icon className="w-3 h-3" style={{ color: m.color }} />
              </div>
              <span className="text-white/60 w-12 shrink-0" style={{ fontSize: "0.7rem" }}>{m.shortName}</span>
              <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, rgba(${rgb},0.3), rgba(${rgb},0.6))` }}
                />
              </div>
              <span className="text-white/50 w-10 text-right shrink-0" style={{ fontSize: "0.65rem" }}>{m.contribution}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ═══ 子组件：活动时间线 ═══

function ActivityTimeline() {
  const [limit, setLimit] = useState(5);
  const activities = FAMILY_ACTIVITIES.slice(0, limit);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-cyan-400" />
        <span className="text-white/70" style={{ fontSize: "0.8rem" }}>活动时间线</span>
        <span className="text-white/30 ml-auto" style={{ fontSize: "0.6rem" }}>共 {FAMILY_ACTIVITIES.length} 项</span>
      </div>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.06]" />
        <div className="space-y-4">
          {activities.map(act => {
            const config = ACTIVITY_TYPE_CONFIG[act.type] || ACTIVITY_TYPE_CONFIG.game;
            const Icon = config.icon;
            return (
              <div key={act.id} className="relative pl-8">
                <div
                  className="absolute left-1 top-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: `${config.color}20`, border: `1px solid ${config.color}40` }}
                >
                  <Icon className="w-2 h-2" style={{ color: config.color }} />
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/70" style={{ fontSize: "0.75rem" }}>{act.title}</span>
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.55rem", background: `${config.color}15`, color: config.color }}>
                      {config.label}
                    </span>
                    {act.winner && (
                      <span className="text-amber-400" style={{ fontSize: "0.55rem" }}>
                        {FAMILY_MEMBERS.find(m => m.id === act.winner)?.shortName}
                      </span>
                    )}
                  </div>
                  <div className="text-white/30 mb-1.5" style={{ fontSize: "0.6rem" }}>{act.date}</div>
                  <div className="text-white/50" style={{ fontSize: "0.65rem", lineHeight: "1.5" }}>
                    {act.description.length > 120 ? act.description.slice(0, 120) + "..." : act.description}
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {act.participants.slice(0, 6).map(pid => {
                      const m = FAMILY_MEMBERS.find(fm => fm.id === pid);
                      if (!m) return null;
                      const rgb = hexToRgb(m.color);
                      return (
                        <div
                          key={pid}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          title={m.shortName}
                          style={{ background: `rgba(${rgb},0.15)` }}
                        >
                          <m.icon className="w-2.5 h-2.5" style={{ color: m.color }} />
                        </div>
                      );
                    })}
                    {act.participants.length > 6 && (
                      <span className="text-white/20" style={{ fontSize: "0.55rem" }}>+{act.participants.length - 6}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {limit < FAMILY_ACTIVITIES.length && (
        <button
          onClick={() => setLimit(prev => prev + 5)}
          className="mt-3 w-full py-2 text-center text-white/30 hover:text-white/50 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-all"
          style={{ fontSize: "0.7rem" }}
        >
          加载更多
        </button>
      )}
    </GlassCard>
  );
}

// ═══ 子组件：最近消息 ═══

function RecentMessages() {
  const msgs = SAMPLE_MESSAGES.slice(0, 6);
  const typeIcons: Record<string, React.ElementType> = {
    announcement: Sparkles,
    alert: Shield,
    text: MessageCircle,
    heartbeat: Heart,
  };
  const typeColors: Record<string, string> = {
    announcement: "#f59e0b",
    alert: "#ef4444",
    text: "#3b82f6",
    heartbeat: "#ec4899",
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-blue-400" />
        <span className="text-white/70" style={{ fontSize: "0.8rem" }}>最近通信</span>
      </div>
      <div className="space-y-2">
        {msgs.map(msg => {
          const from = FAMILY_MEMBERS.find(m => m.id === msg.from);
          if (!from) return null;
          const Icon = typeIcons[msg.type] || MessageCircle;
          const color = typeColors[msg.type] || "#3b82f6";
          const rgb = hexToRgb(from.color);
          return (
            <div key={msg.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `rgba(${rgb},0.15)` }}
              >
                <from.icon className="w-3 h-3" style={{ color: from.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white/60" style={{ fontSize: "0.7rem" }}>{from.shortName}</span>
                  <Icon className="w-2.5 h-2.5" style={{ color }} />
                  <span className="text-white/20 ml-auto" style={{ fontSize: "0.55rem" }}>
                    {msg.timestamp.split("T")[1]?.slice(0, 5)}
                  </span>
                </div>
                <div className="text-white/40 mt-0.5 truncate" style={{ fontSize: "0.65rem" }}>{msg.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ═══ 主组件 ═══

export function FamilyDataHub() {
  const summary = useMemo(() => getFamilyDataSummary(), []);

  const handleExportAll = () => {
    const data = {
      exportDate: new Date().toISOString(),
      summary,
      members: FAMILY_MEMBERS.map(m => ({
        id: m.id, name: m.name, shortName: m.shortName, enTitle: m.enTitle,
        contribution: m.contribution, growth: m.growth, streak: m.streak, mood: m.mood,
        medals: MEMBER_MEDALS[m.id] || [],
      })),
      activities: FAMILY_ACTIVITIES,
      memories: SAMPLE_MEMORIES,
      messages: SAMPLE_MESSAGES,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `yyc3-family-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-white/90" style={{ fontSize: "1.25rem" }}>AI Family 数据中心</h1>
                <p className="text-white/40" style={{ fontSize: "0.7rem" }}>
                  统一数据来源 · 家庭第 {summary.familyAge} 天 · 系统运行 {summary.systemUptime} 天
                </p>
              </div>
            </div>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.08] transition-all"
              style={{ fontSize: "0.7rem" }}
            >
              <Download className="w-3 h-3" />
              导出全部数据
            </button>
          </div>
        </FadeIn>

        {/* Metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard icon={Users} label="家庭成员" value={FAMILY_MEMBERS.length} color="#00d4ff" delay={0.02} />
          <MetricCard icon={Trophy} label="活动记录" value={summary.totalActivities} color="#f59e0b" delay={0.04} />
          <MetricCard icon={Award} label="获得勋章" value={summary.totalMedals} color="#a855f7" delay={0.06} />
          <MetricCard icon={MessageCircle} label="通信记录" value={summary.totalMessages} color="#3b82f6" delay={0.08} />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Ranking + Messages */}
          <div className="space-y-4">
            <FadeIn delay={0.1}>
              <MemberRanking members={FAMILY_MEMBERS} />
            </FadeIn>
            <FadeIn delay={0.15}>
              <RecentMessages />
            </FadeIn>
          </div>

          {/* Right: Timeline */}
          <FadeIn delay={0.12}>
            <ActivityTimeline />
          </FadeIn>
        </div>

        {/* Member growth overview */}
        <FadeIn delay={0.18}>
          <GlassCard className="p-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-white/70" style={{ fontSize: "0.8rem" }}>成长指标总览</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FAMILY_MEMBERS.map(m => {
                const rgb = hexToRgb(m.color);
                const medals = MEMBER_MEDALS[m.id] || [];
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: `rgba(${rgb},0.15)` }}
                      >
                        <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                      </div>
                      <span className="text-white/70" style={{ fontSize: "0.75rem" }}>{m.shortName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white/30" style={{ fontSize: "0.6rem" }}>成长值</span>
                        <span className="text-emerald-400" style={{ fontSize: "0.7rem" }}>+{m.growth}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/30" style={{ fontSize: "0.6rem" }}>连续在线</span>
                        <span className="text-cyan-400" style={{ fontSize: "0.7rem" }}>{m.streak}天</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/30" style={{ fontSize: "0.6rem" }}>勋章</span>
                        <span className="text-amber-400" style={{ fontSize: "0.7rem" }}>{medals.length}枚</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    </div>
  );
}
