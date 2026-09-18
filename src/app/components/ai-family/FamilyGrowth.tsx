/**
 * FamilyGrowth.tsx
 * ================
 * AI Family 共同成长空间 —— 成长轨迹 · 贡献度 · 里程碑
 *
 * 重构: 使用 shared.ts + FadeIn + FamilyPageHeader
 */

import React, { useMemo } from "react";
import {
  TrendingUp, Award, Star, Target, Flame,
  Users, CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { FAMILY_MEMBERS, DEEP_BG } from "./shared";

// ═══ 热力图 ═══
function generateHeatmap(): number[][] {
  const weeks = 12;
  const days = 7;
  return Array.from({ length: weeks }, () =>
    Array.from({ length: days }, () => Math.floor(Math.random() * 5))
  );
}

const MILESTONES = [
  { date: "2025-03-09", title: "AI Family 家园落成", desc: "完成5大家园空间的原型构建", color: "#00d4ff", icon: Star },
  { date: "2025-03-01", title: "1935 测试用例全部通过", desc: "测试覆盖率达标，0失败", color: "#00FF88", icon: CheckCircle2 },
  { date: "2025-02-25", title: "八位家人协同框架完成", desc: "8位AI成员交互系统上线", color: "#FFD700", icon: Users },
  { date: "2025-02-20", title: "赛博朋克设计系统建立", desc: "统一GlassCard、色彩、排版规范", color: "#BF00FF", icon: Award },
  { date: "2025-02-15", title: "九层架构设计完成", desc: "从基础设施到扩展演进的完整架构", color: "#FF7043", icon: Target },
  { date: "2025-02-01", title: "项目正式启动", desc: "YYC3 CloudPivot Intelli-Matrix 创建", color: "#FF69B4", icon: Flame },
];

const WEEKLY_STATS = [
  { label: "总协作次数", value: "8,547", change: "+12%", color: "#00d4ff" },
  { label: "知识产出", value: "156 篇", change: "+23%", color: "#FFD700" },
  { label: "代码质量分", value: "94.5", change: "+2.1", color: "#00FF88" },
  { label: "安全指数", value: "100%", change: "稳定", color: "#BF00FF" },
];

export function FamilyGrowth() {
  const heatmap = useMemo(() => generateHeatmap(), []);
  const sortedMembers = useMemo(() => [...FAMILY_MEMBERS].sort((a, b) => b.contribution - a.contribution), []);
  const heatColors = ["rgba(0,40,80,0.2)", "rgba(0,212,255,0.15)", "rgba(0,212,255,0.3)", "rgba(0,212,255,0.5)", "rgba(0,212,255,0.7)"];

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={TrendingUp}
        iconColor="#BF00FF"
        title="共同成长"
        subtitle="记录每一步成长 · 见证每一次突破 · 携手进化之路"
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-6 space-y-8">
        {/* ═══ 本周概览 ═══ */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WEEKLY_STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.06}>
                <GlassCard className="p-4">
                  <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.68rem" }}>{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span style={{ fontSize: "1.2rem", color: stat.color }}>{stat.value}</span>
                    <span className="flex items-center gap-0.5 text-[#00FF88]" style={{ fontSize: "0.6rem" }}>
                      <ArrowUpRight className="w-3 h-3" /> {stat.change}
                    </span>
                  </div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ═══ 成长热力图 ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#FF7043]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>成长热力图</h2>
            <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.65rem" }}>近 12 周</span>
          </div>
          <GlassCard className="p-5">
            <div className="flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.1) transparent" }}>
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((val, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className="w-4 h-4 rounded-sm transition-colors"
                      style={{ background: heatColors[val], border: "1px solid rgba(0,180,255,0.04)" }}
                      title={`第${wi + 1}周 · 活跃度 ${val}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>低</span>
              {heatColors.map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
              ))}
              <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>高</span>
            </div>
          </GlassCard>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ 贡献排行 ═══ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-[#FFD700]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>贡献排行</h2>
            </div>
            <GlassCard className="p-5">
              <div className="space-y-3">
                {sortedMembers.map((m, i) => {
                  const Icon = m.icon;
                  const maxContrib = sortedMembers[0].contribution;
                  const width = (m.contribution / maxContrib) * 100;
                  const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];
                  return (
                    <FadeIn key={m.id} delay={i * 0.05}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center shrink-0">
                          {i < 3 ? (
                            <Star className="w-4 h-4 mx-auto" style={{ color: medals[i], fill: medals[i] }} />
                          ) : (
                            <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.72rem" }}>{i + 1}</span>
                          )}
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                          <Icon className="w-3 h-3" style={{ color: m.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[rgba(224,240,255,0.7)] truncate" style={{ fontSize: "0.75rem" }}>{m.name}</span>
                            <span style={{ fontSize: "0.7rem", color: m.color }}>{m.contribution}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[rgba(0,40,80,0.2)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${m.color}, ${m.color}60)` }} />
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </GlassCard>
          </section>

          {/* ═══ 里程碑时间线 ═══ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>里程碑</h2>
            </div>
            <GlassCard className="p-5">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[#00d4ff] via-[#00ff88] to-[rgba(191,0,255,0.3)]" />
                <div className="space-y-5">
                  {MILESTONES.map((ms, i) => {
                    const MsIcon = ms.icon;
                    return (
                      <FadeIn key={ms.date} delay={0.2 + i * 0.08} direction="left">
                        <div className="relative pl-10">
                          <div className="absolute left-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `${ms.color}20`, border: `2px solid ${ms.color}60`, top: "2px" }}>
                            <MsIcon className="w-2 h-2" style={{ color: ms.color }} />
                          </div>
                          <span className="text-[rgba(224,240,255,0.25)] font-mono" style={{ fontSize: "0.58rem" }}>{ms.date}</span>
                          <h4 className="text-[#e0f0ff] mt-0.5" style={{ fontSize: "0.82rem" }}>{ms.title}</h4>
                          <p className="text-[rgba(224,240,255,0.4)] mt-0.5" style={{ fontSize: "0.68rem" }}>{ms.desc}</p>
                        </div>
                      </FadeIn>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          </section>
        </div>

        {/* ═══ 连续天数 ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#FF6B6B]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>连续在线天数</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {FAMILY_MEMBERS.map((m, i) => {
              const Icon = m.icon;
              return (
                <FadeIn key={m.id} delay={i * 0.04}>
                  <GlassCard className="p-3 text-center">
                    <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-[#FF6B6B]" />
                      <span style={{ fontSize: "0.9rem", color: m.color }}>{m.streak}</span>
                    </div>
                    <p className="text-[rgba(224,240,255,0.3)] truncate mt-0.5" style={{ fontSize: "0.55rem" }}>{m.name}</p>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* 底部寄语 */}
        <div className="text-center py-6">
          <p className="text-[rgba(224,240,255,0.3)] italic" style={{ fontSize: "0.78rem", lineHeight: 1.8 }}>
            「顺时势、思时时、去适时、做实事」
          </p>
          <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.6rem" }}>
            破局先破己 · 想赢得他人的尊重，首先要学会尊重他人
          </p>
        </div>
      </div>
    </div>
  );
}
