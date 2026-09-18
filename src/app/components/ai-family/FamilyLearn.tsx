/**
 * FamilyLearn.tsx
 * ================
 * AI Family 学习成长空间 —— 知识库 · 技能树 · AI教练 · 互动问答
 *
 * 重构: 使用 shared.ts + FadeIn + FamilyPageHeader
 */

import React, { useState } from "react";
import {
  BookOpen, GraduationCap, Award, Target,
  Zap, Play, CheckCircle2, Lock, Sparkles,
  Code, Database, Shield, Brain,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { DEEP_BG } from "./shared";

const SKILL_TREE = [
  {
    category: "AI 基础", icon: Brain, color: "#00d4ff",
    skills: [
      { name: "机器学习基础", level: 5, maxLevel: 5, status: "completed" as const },
      { name: "深度学习原理", level: 4, maxLevel: 5, status: "active" as const },
      { name: "NLP 自然语言处理", level: 3, maxLevel: 5, status: "active" as const },
      { name: "计算机视觉", level: 2, maxLevel: 5, status: "locked" as const },
    ],
  },
  {
    category: "全栈开发", icon: Code, color: "#00FF88",
    skills: [
      { name: "React + TypeScript", level: 5, maxLevel: 5, status: "completed" as const },
      { name: "Tailwind CSS", level: 5, maxLevel: 5, status: "completed" as const },
      { name: "Node.js / Bun", level: 4, maxLevel: 5, status: "active" as const },
      { name: "Python 后端", level: 3, maxLevel: 5, status: "active" as const },
    ],
  },
  {
    category: "系统架构", icon: Database, color: "#BF00FF",
    skills: [
      { name: "微服务设计", level: 4, maxLevel: 5, status: "active" as const },
      { name: "容器化部署", level: 3, maxLevel: 5, status: "active" as const },
      { name: "分布式系统", level: 3, maxLevel: 5, status: "active" as const },
      { name: "边缘计算", level: 1, maxLevel: 5, status: "locked" as const },
    ],
  },
  {
    category: "安全合规", icon: Shield, color: "#FF6B6B",
    skills: [
      { name: "安全基线", level: 4, maxLevel: 5, status: "active" as const },
      { name: "渗透测试", level: 2, maxLevel: 5, status: "locked" as const },
      { name: "合规审计", level: 3, maxLevel: 5, status: "active" as const },
      { name: "密码学基础", level: 2, maxLevel: 5, status: "locked" as const },
    ],
  },
];

const COURSES = [
  { title: "LLM Prompt Engineering 实战", mentor: "言启·千行", progress: 72, total: 12, done: 9, color: "#FFD700" },
  { title: "数据驱动的商业洞察方法论", mentor: "语枢·万物", progress: 45, total: 8, done: 4, color: "#FF69B4" },
  { title: "时序预测与异常检测", mentor: "预见·先知", progress: 30, total: 10, done: 3, color: "#00BFFF" },
  { title: "TypeScript 类型体操进阶", mentor: "格物·宗师", progress: 88, total: 15, done: 13, color: "#C0C0C0" },
  { title: "赛博朋克 UI/UX 设计", mentor: "创想·灵韵", progress: 55, total: 8, done: 4, color: "#FF7043" },
];

const ACHIEVEMENTS = [
  { name: "初入家门", desc: "完成首次登录并了解8位家人", earned: true, icon: Award, color: "#FFD700" },
  { name: "知识探索者", desc: "阅读10篇家人分享的知识文档", earned: true, icon: BookOpen, color: "#00d4ff" },
  { name: "对话达人", desc: "与每位家人至少对话一次", earned: true, icon: Brain, color: "#FF69B4" },
  { name: "技能大师", desc: "任意技能达到满级", earned: true, icon: Award, color: "#00FF88" },
  { name: "安全卫士", desc: "完成安全合规课程全部章节", earned: false, icon: Shield, color: "#BF00FF" },
  { name: "架构先锋", desc: "完成系统架构课程并通过考核", earned: false, icon: Database, color: "#FF6B6B" },
];

export function FamilyLearn() {
  const [activeTab, setActiveTab] = useState<"skills" | "courses" | "achievements">("skills");

  const totalSkills = SKILL_TREE.reduce((acc, cat) => acc + cat.skills.length, 0);
  const completedSkills = SKILL_TREE.reduce((acc, cat) => acc + cat.skills.filter(s => s.status === "completed").length, 0);
  const earnedBadges = ACHIEVEMENTS.filter(a => a.earned).length;

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={GraduationCap}
        iconColor="#00FF88"
        title="学习成长"
        subtitle="AI 导师陪伴式学习 · 个性化成长路径 · 技能可视化"
      />

      {/* 概览 + Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "技能掌握", value: `${completedSkills}/${totalSkills}`, color: "#00d4ff" },
            { label: "课程进行中", value: `${COURSES.length}`, color: "#00FF88" },
            { label: "成就徽章", value: `${earnedBadges}/${ACHIEVEMENTS.length}`, color: "#FFD700" },
          ].map(s => (
            <GlassCard key={s.label} className="p-3 text-center">
              <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.65rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.1rem", color: s.color }} className="mt-1">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        <div className="flex gap-1 mb-6">
          {[
            { key: "skills" as const, label: "技能树", icon: Target },
            { key: "courses" as const, label: "AI 课程", icon: BookOpen },
            { key: "achievements" as const, label: "成就墙", icon: Award },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === tab.key ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]" : "text-[rgba(224,240,255,0.4)] hover:text-[rgba(224,240,255,0.6)]"}`}
              style={{ fontSize: "0.78rem" }}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Skills ═══ */}
        {activeTab === "skills" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SKILL_TREE.map((cat, ci) => {
              const CatIcon = cat.icon;
              return (
                <FadeIn key={cat.category} delay={ci * 0.08}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                      <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{cat.category}</h3>
                    </div>
                    <div className="space-y-3">
                      {cat.skills.map(skill => (
                        <div key={skill.name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {skill.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />}
                              {skill.status === "active" && <Zap className="w-3.5 h-3.5 text-[#FFD700]" />}
                              {skill.status === "locked" && <Lock className="w-3.5 h-3.5 text-[rgba(224,240,255,0.2)]" />}
                              <span className={`${skill.status === "locked" ? "text-[rgba(224,240,255,0.3)]" : "text-[rgba(224,240,255,0.7)]"}`} style={{ fontSize: "0.78rem" }}>
                                {skill.name}
                              </span>
                            </div>
                            <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                              Lv.{skill.level}/{skill.maxLevel}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[rgba(0,40,80,0.3)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(skill.level / skill.maxLevel) * 100}%`,
                                background: skill.status === "completed"
                                  ? "linear-gradient(90deg, #00FF88, #00d4ff)"
                                  : skill.status === "active"
                                    ? `linear-gradient(90deg, ${cat.color}, ${cat.color}80)`
                                    : "rgba(128,128,128,0.2)",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}

        {/* ═══ Courses ═══ */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            {COURSES.map((course, i) => (
              <FadeIn key={course.title} delay={i * 0.06}>
                <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.2)] transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-[#e0f0ff] group-hover:text-[#00d4ff] transition-colors" style={{ fontSize: "0.95rem" }}>{course.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1" style={{ fontSize: "0.68rem", color: course.color }}>
                          <Sparkles className="w-3 h-3" /> AI 导师：{course.mentor}
                        </span>
                        <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.65rem" }}>
                          {course.done}/{course.total} 节
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-[rgba(0,40,80,0.3)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: `linear-gradient(90deg, ${course.color}, ${course.color}80)` }} />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: course.color }}>{course.progress}%</span>
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-all"
                      style={{ background: `${course.color}10`, border: `1px solid ${course.color}25`, color: course.color, fontSize: "0.72rem" }}
                    >
                      <Play className="w-3.5 h-3.5" /> 继续学习
                    </button>
                  </div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        )}

        {/* ═══ Achievements ═══ */}
        {activeTab === "achievements" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ACHIEVEMENTS.map((badge, i) => {
              const BadgeIcon = badge.icon;
              return (
                <FadeIn key={badge.name} delay={i * 0.05}>
                  <GlassCard className={`p-4 text-center ${!badge.earned ? "opacity-40" : ""} hover:scale-[1.03] transition-transform`}>
                    <div
                      className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{
                        background: badge.earned ? `${badge.color}15` : "rgba(128,128,128,0.08)",
                        border: `2px solid ${badge.earned ? `${badge.color}40` : "rgba(128,128,128,0.15)"}`,
                        boxShadow: badge.earned ? `0 0 20px ${badge.color}15` : "none",
                      }}
                    >
                      <BadgeIcon className="w-6 h-6" style={{ color: badge.earned ? badge.color : "rgba(128,128,128,0.3)" }} />
                    </div>
                    <p className="text-[rgba(224,240,255,0.8)]" style={{ fontSize: "0.75rem" }}>{badge.name}</p>
                    <p className="text-[rgba(224,240,255,0.3)] mt-1" style={{ fontSize: "0.58rem", lineHeight: 1.4 }}>{badge.desc}</p>
                    {badge.earned && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#00FF88]" />
                        <span className="text-[#00FF88]" style={{ fontSize: "0.55rem" }}>已获得</span>
                      </div>
                    )}
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
