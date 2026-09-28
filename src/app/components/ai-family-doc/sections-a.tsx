/**
 * ai-family-doc/sections-a.tsx — Hero / 哲学 / 模块概览 / 模块详情（批7 拆分）
 * ==========================================================================
 */
import {
  Bell, ChevronRight, Code, Compass, Gamepad2, GraduationCap, Headphones,
  Heart,
  Layers,
  Pause,
  Play,
  Rss, Settings, Sparkles, Sun, Target,
  TrendingUp, Volume2, Zap
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { GlassCard } from "../GlassCard";
import { CORE_PHILOSOPHY, DESIGN_SECTIONS, getModuleDetails, hexToRgb } from "./content";
import { FadeIn, SectionHeader } from "./shared";

/** 顶部 Hero Banner */
export function HeroBanner() {
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSubtitle(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative py-16 md:py-24 px-6 text-center overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute left-1/4 top-1/3 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(191,0,255,0.05) 0%, transparent 70%)" }}
        />
      </div>

      <FadeIn delay={0.1} className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.05)] mb-6">
          <Sparkles className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#00d4ff]" style={{ fontSize: "0.75rem", letterSpacing: "2px" }}>
            YYC³ AI FAMILY · 设计规划文档
          </span>
        </div>

        <h1
          className="bg-clip-text text-transparent bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#BF00FF]"
          style={{ fontSize: "clamp(1.8rem, 5vw, 3.2rem)", lineHeight: 1.2 }}
        >
          AI Family 之家
        </h1>

        <p
          className="mt-4 text-[rgba(224,240,255,0.6)] max-w-2xl mx-auto"
          style={{
            fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
            lineHeight: 1.8,
            opacity: showSubtitle ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
        >
          集众思成家逸 · 构建AI之家 · 纵向丝滑之极致协同
        </p>

        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
          style={{
            opacity: showSubtitle ? 1 : 0,
            transform: showSubtitle ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
          }}
        >
          {["以人为本", "AI为核", "纯粹为心", "智能为驱"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-md border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] text-[rgba(0,212,255,0.8)]"
              style={{ fontSize: "0.75rem" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}

/** 核心理念 · 五化一体 */
export function PhilosophySection() {
  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Compass}
        title="核心哲学 · 五化一体"
        subtitle={CORE_PHILOSOPHY.motto}
        color="#00d4ff"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8 max-w-6xl mx-auto">
        {CORE_PHILOSOPHY.principles.map((p, i) => (
          <FadeIn key={p.label} delay={i * 0.1}>
            <GlassCard className="p-5 h-full text-center group hover:scale-[1.02] transition-transform">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: `rgba(${hexToRgb(p.color)}, 0.1)`,
                  border: `1px solid rgba(${hexToRgb(p.color)}, 0.3)`,
                }}
              >
                <p.icon className="w-5 h-5" style={{ color: p.color }} />
              </div>
              <h4 className="text-[#e0f0ff] mb-1" style={{ fontSize: "0.95rem" }}>{p.label}</h4>
              <p className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
                {p.desc}
              </p>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/** 五大模块概览 */
export function ModulesOverview({ onSelectModule }: { onSelectModule: (id: string) => void }) {
  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Layers}
        title="五大核心模块"
        subtitle="覆盖智能协同、家园体验、学习成长、信息感知、进化之路"
        color="#00ff88"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 max-w-6xl mx-auto">
        {DESIGN_SECTIONS.map((section, i) => (
          <FadeIn
            key={section.id}
            delay={i * 0.1}
            className={i === 0 ? "md:col-span-2 lg:col-span-1" : ""}
          >
            <GlassCard
              className="p-6 h-full group hover:scale-[1.01] transition-all cursor-pointer"
              onClick={() => onSelectModule(section.id)}
              glowColor={`rgba(${hexToRgb(section.color)}, 0.08)`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, rgba(${hexToRgb(section.color)}, 0.15), rgba(${hexToRgb(section.color)}, 0.05))`,
                    border: `1px solid rgba(${hexToRgb(section.color)}, 0.3)`,
                  }}
                >
                  <section.icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#e0f0ff] mb-1" style={{ fontSize: "1rem" }}>{section.title}</h3>
                  <p style={{ fontSize: "0.7rem", color: section.color, letterSpacing: "1px" }}>
                    {section.subtitle}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.3)] group-hover:text-[#00d4ff] transition-colors shrink-0 mt-1" />
              </div>
              <p className="mt-4 text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
                {section.description}
              </p>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/** UI 线框概念图（纯代码绘制） */
function ModuleWireframe({ moduleId, color }: { moduleId: string; color: string }) {
  const wireframes: Record<string, ReactNode> = {
    "family-ai": (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full border-2 border-dashed" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.4)` }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded" style={{ width: "60%", background: `rgba(${hexToRgb(color)}, 0.15)` }} />
            <div className="h-2 rounded" style={{ width: "40%", background: `rgba(${hexToRgb(color)}, 0.08)` }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square rounded-full border flex items-center justify-center"
              style={{ borderColor: `rgba(${hexToRgb(color)}, 0.2)`, background: `rgba(${hexToRgb(color)}, 0.03)` }}>
              <div className="w-4 h-4 rounded-full" style={{ background: `rgba(${hexToRgb(color)}, 0.2)` }} />
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg border border-dashed" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.2)` }}>
          <div className="h-2 rounded mb-2" style={{ width: "80%", background: `rgba(${hexToRgb(color)}, 0.1)` }} />
          <div className="h-2 rounded" style={{ width: "55%", background: `rgba(${hexToRgb(color)}, 0.06)` }} />
        </div>
        <p className="text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          时钟环布局 · 8位AI成员 · 中心品牌标识 · 实时交互面板
        </p>
      </div>
    ),
    "home-feeling": (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" style={{ color }} />
            <div className="h-2.5 w-24 rounded" style={{ background: `rgba(${hexToRgb(color)}, 0.15)` }} />
          </div>
          <div className="flex gap-1.5">
            {[Sun, Bell, Settings].map((I, i) => (
              <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `rgba(${hexToRgb(color)}, 0.08)` }}>
                <I className="w-3.5 h-3.5" style={{ color: `rgba(${hexToRgb(color)}, 0.4)` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["欢迎回家", "今日天气", "待办事项"].map(label => (
            <div key={label} className="p-3 rounded-lg border" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)`, background: `rgba(${hexToRgb(color)}, 0.03)` }}>
              <div className="h-8 rounded mb-2" style={{ background: `rgba(${hexToRgb(color)}, 0.06)` }} />
              <span style={{ fontSize: "0.6rem", color: `rgba(${hexToRgb(color)}, 0.5)` }}>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          温馨首页 · 个性化问候 · 心情指数 · 家庭成员状态墙
        </p>
      </div>
    ),
    "leisure-learning": (
      <div className="p-6 space-y-4">
        <div className="flex gap-2 mb-4">
          {["知识库", "教程", "技能树", "互动问答"].map(tab => (
            <div key={tab} className="px-3 py-1.5 rounded-md" style={{ background: `rgba(${hexToRgb(color)}, 0.08)`, border: `1px solid rgba(${hexToRgb(color)}, 0.15)` }}>
              <span style={{ fontSize: "0.6rem", color: `rgba(${hexToRgb(color)}, 0.6)` }}>{tab}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border row-span-2" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)` }}>
            <GraduationCap className="w-5 h-5 mb-2" style={{ color: `rgba(${hexToRgb(color)}, 0.4)` }} />
            <div className="space-y-1.5">
              {[70, 45, 85, 30].map((w, i) => (
                <div key={i} className="h-2 rounded" style={{ width: `${w}%`, background: `rgba(${hexToRgb(color)}, 0.12)` }} />
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)` }}>
            <div className="h-12 rounded mb-2" style={{ background: `rgba(${hexToRgb(color)}, 0.05)` }} />
            <span style={{ fontSize: "0.6rem", color: `rgba(${hexToRgb(color)}, 0.4)` }}>学习进度</span>
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)` }}>
            <Gamepad2 className="w-4 h-4 mb-1" style={{ color: `rgba(${hexToRgb(color)}, 0.3)` }} />
            <span style={{ fontSize: "0.6rem", color: `rgba(${hexToRgb(color)}, 0.4)` }}>趣味挑战</span>
          </div>
        </div>
        <p className="text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          知识图谱 · 技能树系统 · AI教练 · 互动式学习
        </p>
      </div>
    ),
    "music-news": (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 音乐区 */}
          <div className="p-3 rounded-lg border" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)` }}>
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-4 h-4" style={{ color: `rgba(${hexToRgb(color)}, 0.5)` }} />
              <span style={{ fontSize: "0.65rem", color: `rgba(${hexToRgb(color)}, 0.6)` }}>正在播放</span>
            </div>
            <div className="w-full h-2 rounded-full mb-2" style={{ background: `rgba(${hexToRgb(color)}, 0.1)` }}>
              <div className="h-full rounded-full" style={{ width: "40%", background: `rgba(${hexToRgb(color)}, 0.4)` }} />
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {[Play, Pause, Volume2].map((I, i) => (
                <I key={i} className="w-3.5 h-3.5" style={{ color: `rgba(${hexToRgb(color)}, 0.3)` }} />
              ))}
            </div>
          </div>
          {/* 新闻区 */}
          <div className="p-3 rounded-lg border" style={{ borderColor: `rgba(${hexToRgb(color)}, 0.15)` }}>
            <div className="flex items-center gap-2 mb-3">
              <Rss className="w-4 h-4" style={{ color: `rgba(${hexToRgb(color)}, 0.5)` }} />
              <span style={{ fontSize: "0.65rem", color: `rgba(${hexToRgb(color)}, 0.6)` }}>行业快讯</span>
            </div>
            <div className="space-y-2">
              {[80, 65, 50].map((w, i) => (
                <div key={i} className="h-2 rounded" style={{ width: `${w}%`, background: `rgba(${hexToRgb(color)}, 0.1)` }} />
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          AI智能选曲 · 行业资讯聚合 · 沉浸式播放 · RSS订阅
        </p>
      </div>
    ),
    "grow-together": (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: `rgba(${hexToRgb(color)}, 0.5)` }} />
            <span style={{ fontSize: "0.65rem", color: `rgba(${hexToRgb(color)}, 0.6)` }}>成长轨迹</span>
          </div>
          <div className="flex gap-1">
            {["周", "月", "年"].map(t => (
              <span key={t} className="px-2 py-0.5 rounded" style={{ fontSize: "0.55rem", background: `rgba(${hexToRgb(color)}, 0.06)`, color: `rgba(${hexToRgb(color)}, 0.4)` }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        {/* 模拟图表 */}
        <div className="flex items-end gap-1 h-20 px-2">
          {[30, 45, 35, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(${hexToRgb(color)}, 0.3), rgba(${hexToRgb(color)}, 0.08))` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["技能成长", "贡献度", "协作指数"].map(label => (
            <div key={label} className="text-center p-2 rounded-lg" style={{ background: `rgba(${hexToRgb(color)}, 0.05)` }}>
              <span style={{ fontSize: "0.55rem", color: `rgba(${hexToRgb(color)}, 0.5)` }}>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          成长热力图 · 技能雷达图 · 贡献排行 · AI导师指引
        </p>
      </div>
    ),
  };

  return wireframes[moduleId] || <div className="p-6 text-center text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.7rem" }}>概念设计中...</div>;
}

/** 模块详情面板 */
export function ModuleDetailPanel({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const section = DESIGN_SECTIONS.find((s) => s.id === moduleId);
  if (!section) return null;

  const details = getModuleDetails(moduleId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,20,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <FadeIn delay={0}>
        <div
          className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(8,25,55,0.95), rgba(4,12,30,0.98))",
            border: `1px solid rgba(${hexToRgb(section.color)}, 0.3)`,
            boxShadow: `0 0 60px rgba(${hexToRgb(section.color)}, 0.1)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 p-6 border-b border-[rgba(0,180,255,0.1)]"
            style={{ background: "rgba(8,25,55,0.95)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(${hexToRgb(section.color)}, 0.2), rgba(${hexToRgb(section.color)}, 0.05))`,
                    border: `1px solid rgba(${hexToRgb(section.color)}, 0.4)`,
                  }}
                >
                  <section.icon className="w-7 h-7" style={{ color: section.color }} />
                </div>
                <div>
                  <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.25rem" }}>{section.title}</h2>
                  <p style={{ fontSize: "0.75rem", color: section.color }}>{section.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[rgba(0,180,255,0.2)] hover:bg-[rgba(0,212,255,0.1)] transition-colors text-[rgba(224,240,255,0.5)]"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* 设计目标 */}
            <div>
              <h3 className="text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
                <Target className="w-4 h-4" /> 设计目标
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {details.goals.map((goal, i) => (
                  <div key={`goal-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.08)]">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `rgba(${hexToRgb(section.color)}, 0.15)` }}
                    >
                      <span style={{ fontSize: "0.65rem", color: section.color }}>{i + 1}</span>
                    </div>
                    <span className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{goal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 核心功能 */}
            <div>
              <h3 className="text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
                <Zap className="w-4 h-4" /> 核心功能
              </h3>
              <div className="space-y-3">
                {details.features.map((feat, i) => (
                  <div key={`feat-${i}`} className="p-4 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)]">
                    <div className="flex items-center gap-2 mb-2">
                      <feat.icon className="w-4 h-4" style={{ color: section.color }} />
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{feat.name}</span>
                    </div>
                    <p className="text-[rgba(224,240,255,0.5)] pl-6" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
                      {feat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 组件清单 */}
            <div>
              <h3 className="text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
                <Code className="w-4 h-4" /> 组件清单
              </h3>
              <div className="flex flex-wrap gap-2">
                {details.components.map((comp) => (
                  <span
                    key={comp}
                    className="px-3 py-1.5 rounded-md font-mono border border-[rgba(0,180,255,0.15)] bg-[rgba(0,40,80,0.3)] text-[rgba(0,212,255,0.8)]"
                    style={{ fontSize: "0.7rem" }}
                  >
                    &lt;{comp} /&gt;
                  </span>
                ))}
              </div>
            </div>

            {/* UI 线框 */}
            <div>
              <h3 className="text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
                <Layers className="w-4 h-4" /> UI 概念线框
              </h3>
              <div className="rounded-xl border border-[rgba(0,180,255,0.15)] overflow-hidden">
                <ModuleWireframe moduleId={moduleId} color={section.color} />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
