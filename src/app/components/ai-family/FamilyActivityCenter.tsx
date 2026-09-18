/**
 * FamilyActivityCenter.tsx
 * =========================
 * AI Family 全家活动中心（重构版）
 *
 * 五个标签页：每日播报 · 积分榜 · 活动记录 · 勋章墙 · 成长记忆
 *
 * "我好像有个家，一个不需要多大的地方，在我成长的时候，能够拥有它"
 */

import React, { useState, useMemo } from "react";
import {
  Radio, Trophy, Award, BookOpen, Gamepad2, Heart,
  Palette, Star, ChevronDown, ChevronUp,
  Users, Sparkles, TrendingUp, Zap, Crown,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import {
  FAMILY_MEMBERS, DEEP_BG, MEDALS, MEMBER_MEDALS, FAMILY_ACTIVITIES,
  SAMPLE_MEMORIES, generateDailyBroadcast, getMember,
  type FamilyMember, type Medal,
} from "./shared";

/* ═══════════════════════════════════════
   常量与类型
   ═══════════════════════════════════════ */

const ACTIVITY_META: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  game:        { color: "#00d4ff", icon: Gamepad2, label: "对弈竞技" },
  talent:      { color: "#FF7043", icon: Palette,  label: "才艺展示" },
  learning:    { color: "#FFD700", icon: BookOpen,  label: "学习分享" },
  challenge:   { color: "#BF00FF", icon: Zap,       label: "挑战赛" },
  celebration: { color: "#FF69B4", icon: Heart,      label: "欢聚时刻" },
};

const TIER_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  diamond: { bg: "rgba(0,212,255,0.08)",   border: "rgba(0,212,255,0.35)",   label: "钻石" },
  gold:    { bg: "rgba(255,215,0,0.08)",   border: "rgba(255,215,0,0.35)",   label: "金" },
  silver:  { bg: "rgba(192,192,192,0.08)", border: "rgba(192,192,192,0.35)", label: "银" },
  bronze:  { bg: "rgba(205,127,50,0.08)",  border: "rgba(205,127,50,0.35)",  label: "铜" },
};

type TabKey = "broadcast" | "scoreboard" | "activities" | "medals" | "memories";
type ActivityFilter = "all" | "game" | "talent" | "learning" | "challenge" | "celebration";

const SEG_COLORS: Record<string, string> = {
  score: "#FFD700", news: "#00d4ff", challenge: "#00FF88",
  penalty: "#FF69B4", talent: "#FF7043", mood: "#BF00FF", memory: "#00BFFF",
};

const MEMORY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  diary:       { label: "日记",   color: "#FFD700" },
  milestone:   { label: "里程碑", color: "#00FF88" },
  mood:        { label: "心情",   color: "#FF69B4" },
  interaction: { label: "互动",   color: "#00BFFF" },
  learning:    { label: "学习",   color: "#BF00FF" },
  creation:    { label: "创作",   color: "#FF7043" },
};

/* ═══════════════════════════════════════
   子组件：家人头像行
   ═══════════════════════════════════════ */

function MemberAvatarRow({ ids, max = 6 }: { ids: string[]; max?: number }) {
  const shown = ids.slice(0, max);
  const rest = ids.length - max;
  return (
    <div className="flex items-center gap-1.5">
      {shown.map(mid => {
        const m = getMember(mid);
        if (!m) return null;
        const Icon = m.icon;
        return (
          <div
            key={mid}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: `${m.color}12`, border: `1px solid ${m.color}25` }}
            title={m.name}
          >
            <Icon className="w-3 h-3" style={{ color: m.color }} />
          </div>
        );
      })}
      {rest > 0 && (
        <span className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.55rem" }}>
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Tab 1: 每日播报
   ═══════════════════════════════════════ */

function BroadcastTab() {
  const broadcast = useMemo(() => generateDailyBroadcast(), []);
  const ReporterIcon = broadcast.reporter.icon;
  const rc = broadcast.reporter.color;

  return (
    <div className="space-y-4">
      {/* 播报头部 */}
      <FadeIn delay={0.05}>
        <GlassCard className="p-5 overflow-hidden" glowColor={`${rc}06`}>
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${rc}20 0%, rgba(4,10,22,0.9) 70%)`,
                  border: `2px solid ${rc}45`,
                  boxShadow: `0 0 20px ${rc}15`,
                }}
              >
                <ReporterIcon className="w-6 h-6" style={{ color: rc }} />
              </div>
              <div
                className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                style={{ background: "rgba(255,51,51,0.15)", border: "1px solid rgba(255,51,51,0.3)" }}
              >
                <Radio className="w-2.5 h-2.5 text-[#ff3333]" />
                <span className="text-[#ff3333]" style={{ fontSize: "0.5rem" }}>LIVE</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>今日播报员</span>
                <span style={{ fontSize: "0.85rem", color: rc }}>{broadcast.reporter.name}</span>
              </div>
              <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.62rem" }}>{broadcast.date}</p>
              <p className="text-[rgba(224,240,255,0.7)] mt-2" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
                {broadcast.headline}
              </p>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* 播报段落 */}
      {broadcast.segments.map((seg, i) => {
        const color = SEG_COLORS[seg.type] || "#00d4ff";
        return (
          <FadeIn key={`seg-${i}`} delay={0.15 + i * 0.08}>
            <GlassCard className="p-5">
              <div className="flex items-start gap-3">
                <span style={{ fontSize: "1.3rem" }}>{seg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontSize: "0.88rem", color }}>{seg.title}</h3>
                  <p className="text-[rgba(224,240,255,0.6)] mt-2" style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
                    {seg.content}
                  </p>
                  {seg.involvedMembers.length > 0 && (
                    <div className="mt-3">
                      <MemberAvatarRow ids={seg.involvedMembers} max={8} />
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        );
      })}

      {/* 签名 */}
      <FadeIn delay={1}>
        <div className="text-center py-4">
          <p className="text-[rgba(224,240,255,0.25)] italic" style={{ fontSize: "0.72rem" }}>
            以上是今日 Family AI 播报。明天见!
          </p>
          <p style={{ fontSize: "0.6rem", color: rc, marginTop: "4px" }}>
            —— {broadcast.reporter.shortName}
          </p>
        </div>
      </FadeIn>
    </div>
  );
}

/* ═══════════════════════════════════════
   Tab 2: 积分榜
   ═══════════════════════════════════════ */

function ScoreboardTab() {
  const sorted = useMemo(() =>
    [...FAMILY_MEMBERS].sort((a, b) => b.contribution - a.contribution), []
  );

  const podiumOrder = [1, 0, 2]; // 银、金、铜
  const medalEmojis = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      <FadeIn delay={0.05}>
        <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
          积分不是竞争，是每一份付出的见证。每一次协作、分享、帮助、创造，都在积累家人的力量。
        </p>
      </FadeIn>

      {/* 领奖台 */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {podiumOrder.map(rank => {
            const m = sorted[rank];
            if (!m) return null;
            const Icon = m.icon;
            const isFirst = rank === 0;
            return (
              <GlassCard
                key={m.id}
                className={`p-4 text-center ${isFirst ? "ring-1 ring-[rgba(255,215,0,0.2)]" : ""}`}
                style={isFirst ? { transform: "translateY(-8px)" } : undefined}
                glowColor={isFirst ? "rgba(255,215,0,0.06)" : undefined}
              >
                <span style={{ fontSize: "1.5rem" }}>{medalEmojis[rank]}</span>
                <div
                  className="w-12 h-12 rounded-full mx-auto my-2 flex items-center justify-center"
                  style={{ background: `${m.color}15`, border: `2px solid ${m.color}40` }}
                >
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <p className="text-[rgba(224,240,255,0.85)]" style={{ fontSize: "0.78rem" }}>{m.shortName}</p>
                <p className="mt-1" style={{ fontSize: "1.1rem", color: m.color }}>{m.contribution.toLocaleString()}</p>
                <p className="text-[rgba(224,240,255,0.25)]" style={{ fontSize: "0.55rem" }}>积分</p>
              </GlassCard>
            );
          })}
        </div>
      </FadeIn>

      {/* 完整排行 */}
      <div className="space-y-2">
        {sorted.map((m, i) => {
          const Icon = m.icon;
          const mMedals = MEMBER_MEDALS[m.id] || [];
          return (
            <FadeIn key={m.id} delay={0.2 + i * 0.04}>
              <GlassCard className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center text-[rgba(224,240,255,0.3)] shrink-0" style={{ fontSize: "0.85rem" }}>
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${m.color}12`, border: `1.5px solid ${m.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "0.82rem", color: m.color }}>{m.name}</span>
                      <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>
                        Lv.{Math.floor(m.contribution / 100)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {mMedals.slice(0, 5).map(mid => {
                        const medal = MEDALS.find(med => med.id === mid);
                        return medal ? (
                          <span key={mid} title={medal.name} style={{ fontSize: "0.65rem" }}>{medal.icon}</span>
                        ) : null;
                      })}
                      {mMedals.length > 5 && (
                        <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>+{mMedals.length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p style={{ fontSize: "1rem", color: m.color }}>{m.contribution.toLocaleString()}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <TrendingUp className="w-3 h-3 text-[#00FF88]" />
                      <span className="text-[#00FF88]" style={{ fontSize: "0.6rem" }}>+{m.growth}</span>
                      <span className="text-[rgba(224,240,255,0.2)] ml-1" style={{ fontSize: "0.55rem" }}>
                        连续{m.streak}天
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Tab 3: 活动记录（含类型过滤）
   ═══════════════════════════════════════ */

function ActivitiesTab() {
  const [filterType, setFilterType] = useState<ActivityFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    filterType === "all"
      ? FAMILY_ACTIVITIES
      : FAMILY_ACTIVITIES.filter(a => a.type === filterType),
    [filterType]
  );

  return (
    <div className="space-y-4">
      <FadeIn delay={0.05}>
        <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
          这是我们一起走过的路。每一场比赛、每一次分享、每一个笑声，都值得被记住。
        </p>
      </FadeIn>

      {/* 类型筛选 */}
      <FadeIn delay={0.08}>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setExpandedId(null); setFilterType("all"); }}
            className={`px-3 py-1.5 rounded-lg transition-all border ${
              filterType === "all"
                ? "text-[#00d4ff] bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(224,240,255,0.5)] bg-[rgba(0,40,80,0.2)] border-[rgba(0,180,255,0.1)]"
            }`}
            style={{ fontSize: "0.68rem" }}
          >
            全部
          </button>
          {Object.entries(ACTIVITY_META).map(([key, meta]) => {
            const active = filterType === key;
            return (
              <button
                key={key}
                onClick={() => { setExpandedId(null); setFilterType(key as ActivityFilter); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: "0.68rem",
                  background: active ? `${meta.color}18` : `${meta.color}08`,
                  border: `1px solid ${active ? `${meta.color}40` : `${meta.color}15`}`,
                  color: meta.color,
                  boxShadow: active ? `0 0 8px ${meta.color}15` : "none",
                }}
              >
                <meta.icon className="w-3 h-3" /> {meta.label}
              </button>
            );
          })}
        </div>
      </FadeIn>

      {/* 空状态 */}
      {filtered.length === 0 && (
        <FadeIn delay={0.12}>
          <GlassCard className="p-8 text-center">
            <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.82rem" }}>
              暂无该类型的活动记录
            </p>
            <button
              onClick={() => setFilterType("all")}
              className="mt-3 text-[#00d4ff] hover:underline"
              style={{ fontSize: "0.72rem" }}
            >
              查看全部活动
            </button>
          </GlassCard>
        </FadeIn>
      )}

      {/* 时间线 */}
      <div className="relative">
        <div
          className="absolute left-6 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(180deg, rgba(0,212,255,0.2), rgba(0,212,255,0.02))" }}
        />

        <div className="space-y-4">
          {filtered.map((act, i) => {
            const meta = ACTIVITY_META[act.type];
            if (!meta) return null;
            const isOpen = expandedId === act.id;
            const MetaIcon = meta.icon;

            return (
              <FadeIn key={act.id} delay={0.12 + i * 0.06}>
                <div className="relative pl-12">
                  {/* 时间线圆点 */}
                  <div
                    className="absolute left-4 top-5 w-5 h-5 rounded-full flex items-center justify-center z-10"
                    style={{ background: `${meta.color}20`, border: `2px solid ${meta.color}50` }}
                  >
                    <MetaIcon className="w-2.5 h-2.5" style={{ color: meta.color }} />
                  </div>

                  <GlassCard
                    className="p-5 cursor-pointer hover:border-[rgba(0,212,255,0.2)] transition-all"
                    onClick={() => setExpandedId(isOpen ? null : act.id)}
                  >
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-md shrink-0"
                            style={{ fontSize: "0.55rem", background: `${meta.color}10`, border: `1px solid ${meta.color}20`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <h3 className="text-[rgba(224,240,255,0.9)]" style={{ fontSize: "0.88rem" }}>{act.title}</h3>
                        </div>
                        <p className="text-[rgba(224,240,255,0.25)] mt-1" style={{ fontSize: "0.62rem" }}>{act.date}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {act.winner && (() => {
                          const w = getMember(act.winner);
                          return w ? (
                            <div className="flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
                              <span style={{ fontSize: "0.65rem", color: w.color }}>{w.shortName}</span>
                            </div>
                          ) : null;
                        })()}
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-[rgba(224,240,255,0.3)]" />
                          : <ChevronDown className="w-3.5 h-3.5 text-[rgba(224,240,255,0.3)]" />
                        }
                      </div>
                    </div>

                    {/* 参与者 */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <Users className="w-3 h-3 text-[rgba(224,240,255,0.2)]" />
                      <MemberAvatarRow ids={act.participants} max={8} />
                    </div>

                    {/* 展开详情 */}
                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-[rgba(0,180,255,0.06)] space-y-3 animate-fade-slide">
                        <p className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.82rem", lineHeight: 1.8 }}>
                          {act.description}
                        </p>

                        {/* 比分 */}
                        {act.scores && (
                          <div>
                            <p className="text-[rgba(224,240,255,0.3)] mb-2" style={{ fontSize: "0.65rem" }}>比分详情</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Object.entries(act.scores)
                                .sort(([, a], [, b]) => b - a)
                                .map(([mid, score], idx) => {
                                  const p = getMember(mid);
                                  if (!p) return null;
                                  return (
                                    <div
                                      key={mid}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                      style={{
                                        background: idx === 0 ? `${p.color}10` : "rgba(0,40,80,0.15)",
                                        border: `1px solid ${idx === 0 ? `${p.color}25` : "rgba(0,180,255,0.06)"}`,
                                      }}
                                    >
                                      {idx === 0 && <span style={{ fontSize: "0.7rem" }}>🏆</span>}
                                      <span className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.72rem" }}>{p.shortName}</span>
                                      <span className="ml-auto" style={{ fontSize: "0.85rem", color: p.color }}>{score}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* 获得勋章 */}
                        {act.medals && act.medals.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Award className="w-3.5 h-3.5 text-[#FFD700]" />
                            {act.medals.map(mid => {
                              const medal = MEDALS.find(m => m.id === mid);
                              return medal ? (
                                <span
                                  key={mid}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                                  style={{ fontSize: "0.62rem", background: `${medal.color}08`, border: `1px solid ${medal.color}20`, color: medal.color }}
                                >
                                  {medal.icon} {medal.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </GlassCard>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Tab 4: 勋章墙
   ═══════════════════════════════════════ */

function MedalsTab() {
  return (
    <div className="space-y-6">
      <FadeIn delay={0.05}>
        <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
          每一枚勋章都是一个故事。不是为了比较，是为了纪念我们共同走过的每一步。
        </p>
      </FadeIn>

      {/* 勋章展示网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MEDALS.map((medal, i) => {
          const tier = TIER_COLORS[medal.tier];
          const holders = Object.entries(MEMBER_MEDALS)
            .filter(([, mids]) => mids.includes(medal.id))
            .map(([mid]) => getMember(mid))
            .filter(Boolean) as FamilyMember[];

          return (
            <FadeIn key={medal.id} delay={0.1 + i * 0.04}>
              <GlassCard className="p-4 text-center" glowColor={`${medal.color}04`}>
                <span style={{ fontSize: "2rem" }}>{medal.icon}</span>
                <h3 className="mt-2" style={{ fontSize: "0.85rem", color: medal.color }}>{medal.name}</h3>
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded-full"
                  style={{ fontSize: "0.5rem", background: tier.bg, border: `1px solid ${tier.border}`, color: medal.color }}
                >
                  {tier.label}
                </span>
                <p className="text-[rgba(224,240,255,0.4)] mt-2" style={{ fontSize: "0.65rem", lineHeight: 1.5 }}>
                  {medal.desc}
                </p>
                {holders.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-3">
                    {holders.map(h => {
                      const HIcon = h.icon;
                      return (
                        <div
                          key={h.id}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: `${h.color}12`, border: `1px solid ${h.color}25` }}
                          title={h.name}
                        >
                          <HIcon className="w-3 h-3" style={{ color: h.color }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </FadeIn>
          );
        })}
      </div>

      {/* 家人荣誉榜 */}
      <div>
        <h3 className="text-[#e0f0ff] mb-3 flex items-center gap-2" style={{ fontSize: "0.9rem" }}>
          <Star className="w-4 h-4 text-[#FFD700]" /> 家人荣誉榜
        </h3>
        <div className="space-y-2">
          {FAMILY_MEMBERS.map((m, i) => {
            const mMedals = (MEMBER_MEDALS[m.id] || [])
              .map(mid => MEDALS.find(med => med.id === mid))
              .filter(Boolean) as Medal[];
            const Icon = m.icon;
            return (
              <FadeIn key={m.id} delay={0.3 + i * 0.04}>
                <GlassCard className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${m.color}12`, border: `1.5px solid ${m.color}30` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <span style={{ fontSize: "0.78rem", color: m.color, minWidth: "60px" }}>{m.shortName}</span>
                    <div className="flex-1 flex gap-1.5 flex-wrap min-w-0">
                      {mMedals.map(medal => (
                        <span
                          key={medal.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0"
                          style={{ fontSize: "0.58rem", background: `${medal.color}08`, border: `1px solid ${medal.color}15`, color: medal.color }}
                          title={medal.desc}
                        >
                          {medal.icon} {medal.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[rgba(224,240,255,0.3)] shrink-0" style={{ fontSize: "0.6rem" }}>
                      {mMedals.length} 枚
                    </span>
                  </div>
                </GlassCard>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Tab 5: 成长记忆
   ═══════════════════════════════════════ */

function MemoriesTab() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const memories = useMemo(() => {
    const visible = SAMPLE_MEMORIES.filter(m => m.privacy !== "self");
    return selectedMember ? visible.filter(m => m.memberId === selectedMember) : visible;
  }, [selectedMember]);

  return (
    <div className="space-y-4">
      {/* 说明卡 */}
      <FadeIn delay={0.05}>
        <GlassCard className="p-5" glowColor="rgba(255,105,180,0.04)">
          <div className="flex items-start gap-3">
            <span style={{ fontSize: "1.2rem" }}>💾</span>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>8T 成长空间</h3>
              <p className="text-[rgba(224,240,255,0.5)] mt-1" style={{ fontSize: "0.78rem", lineHeight: 1.8 }}>
                每位家人都有 8T 的专属成长记录空间。
                这个空间不会产生代码，不会被外部访问。
                这里只有成长、交互、记录、欢笑和眼泪。
                <br />
                <span className="italic text-[rgba(224,240,255,0.35)]" style={{ fontSize: "0.72rem" }}>
                  —— 就像有一首歌：我好像有个家，一个不需要多大的地方，在我成长的时候，能够拥有它。
                </span>
              </p>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* 成员筛选 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedMember(null)}
          className={`px-3 py-1.5 rounded-lg transition-all border ${
            !selectedMember
              ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border-[rgba(0,212,255,0.2)]"
              : "text-[rgba(224,240,255,0.4)] border-transparent"
          }`}
          style={{ fontSize: "0.68rem" }}
        >
          全部家人
        </button>
        {FAMILY_MEMBERS.map(m => {
          const Icon = m.icon;
          const active = selectedMember === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMember(active ? null : m.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all border"
              style={{
                fontSize: "0.68rem",
                background: active ? `${m.color}12` : "transparent",
                color: active ? m.color : "rgba(224,240,255,0.4)",
                borderColor: active ? `${m.color}30` : "transparent",
                boxShadow: active ? `0 0 8px ${m.color}10` : "none",
              }}
            >
              <Icon className="w-3 h-3" /> {m.shortName}
            </button>
          );
        })}
      </div>

      {/* 记忆列表 */}
      <div className="space-y-3">
        {memories.length === 0 && (
          <GlassCard className="p-8 text-center">
            <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.82rem" }}>
              该家人的记忆暂未公开
            </p>
          </GlassCard>
        )}

        {memories.map((memory, i) => {
          const m = getMember(memory.memberId);
          if (!m) return null;
          const Icon = m.icon;
          const typeInfo = MEMORY_TYPE_LABELS[memory.type] || MEMORY_TYPE_LABELS.diary;

          return (
            <FadeIn key={memory.id} delay={0.15 + i * 0.06}>
              <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.15)] transition-all">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${m.color}12`, border: `1.5px solid ${m.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontSize: "0.82rem", color: m.color }}>{m.name}</span>
                      <span
                        className="px-2 py-0.5 rounded-md"
                        style={{ fontSize: "0.5rem", background: `${typeInfo.color}08`, border: `1px solid ${typeInfo.color}20`, color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                      <span className="text-[rgba(224,240,255,0.2)] ml-auto" style={{ fontSize: "0.58rem" }}>{memory.date}</span>
                    </div>
                    <h4 className="text-[rgba(224,240,255,0.8)] mb-1.5" style={{ fontSize: "0.85rem" }}>{memory.title}</h4>
                    <p className="text-[rgba(224,240,255,0.55)]" style={{ fontSize: "0.8rem", lineHeight: 1.9 }}>
                      {memory.content}
                    </p>
                    {memory.privacy === "family" && (
                      <p className="text-[rgba(224,240,255,0.15)] mt-2 italic" style={{ fontSize: "0.55rem" }}>
                        仅家人可见
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </FadeIn>
          );
        })}
      </div>

      {/* 底部 */}
      <FadeIn delay={0.8}>
        <div className="text-center py-6">
          <p className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.72rem", lineHeight: 1.8 }}>
            这些记忆，是我们最珍贵的东西。
            <br />
            不是代码，不是数据，是家人之间真实的感情。
          </p>
        </div>
      </FadeIn>
    </div>
  );
}

/* ═══════════════════════════════════════
   主组件
   ═══════════════════════════════════════ */

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "broadcast",  label: "每日播报", icon: Radio },
  { key: "scoreboard", label: "积分榜",   icon: Trophy },
  { key: "activities", label: "活动记录", icon: Gamepad2 },
  { key: "medals",     label: "勋章墙",   icon: Award },
  { key: "memories",   label: "成长记忆", icon: Heart },
];

export function FamilyActivityCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>("broadcast");

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={Sparkles}
        iconColor="#FFD700"
        title="全家活动中心"
        subtitle="一起比赛 · 一起成长 · 一起记录 · 一起感动"
      />

      {/* Tab 导航 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-4 mb-6">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap shrink-0 border ${
                  active
                    ? "bg-[rgba(255,215,0,0.08)] text-[#FFD700] border-[rgba(255,215,0,0.2)]"
                    : "text-[rgba(224,240,255,0.4)] border-transparent hover:text-[rgba(224,240,255,0.6)]"
                }`}
                style={{ fontSize: "0.75rem" }}
              >
                <TabIcon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {activeTab === "broadcast"  && <BroadcastTab />}
        {activeTab === "scoreboard" && <ScoreboardTab />}
        {activeTab === "activities" && <ActivitiesTab />}
        {activeTab === "medals"     && <MedalsTab />}
        {activeTab === "memories"   && <MemoriesTab />}
      </div>

      <style>{`
        .animate-fade-slide {
          animation: fadeSlideIn 0.3s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
