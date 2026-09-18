/**
 * AIFamilyDesignDoc.tsx
 * =====================
 * YYC³ AI Family 设计规划文档 · 交互式原型
 *
 * 五大模块:
 *   1. Family AI — 智能协同核心
 *   2. 家的感觉 AIFamily — 温馨家园
 *   3. 休闲娱乐 & 学习 — 成长空间
 *   4. 音乐 & 新闻 — 信息脉搏
 *   5. 共同成长 — 进化之路
 *
 * 风格: 赛博朋克 · 深空黑 · 霓虹蓝 #00d4ff
 *
 * 沙箱兼容:
 *   - 不使用 motion 的 whileInView / viewport（依赖 IntersectionObserver，
 *     在 Figma iframe 中可能不可用导致崩溃）
 *   - 改用纯 CSS transition + setTimeout 延迟入场动画
 */

import React, { useState, useEffect } from "react";
import {
  Brain, Users, Heart, Music, Newspaper, TrendingUp,
  Sparkles, BookOpen, Gamepad2, GraduationCap, Lightbulb,
  Shield, Network, Eye, Star, MessageCircle, Zap,
  ChevronRight, ChevronDown, Play, Pause,
  Home, Headphones, Radio, Globe, Target,
  Award, Rocket, GitBranch, Layers, Code, Terminal,
  BarChart3, Activity, Cpu, Database,
  Sun, Clock, Compass,
  FileText, FolderOpen, Settings, Bell,
  Quote, Mic, Volume2, Rss,
} from "lucide-react";
import { GlassCard } from "./GlassCard";

// ═══════════════════════════════════════════════
// 安全动画 wrapper — 不依赖 IntersectionObserver
// ═══════════════════════════════════════════════

/** 简单的入场动画 div（纯 CSS transition，沙箱安全） */
function FadeIn({ children, delay = 0, className = "", style, onClick }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), Math.min(delay * 1000, 800));
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        ...style,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════

interface DesignSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

interface FamilyMemberBrief {
  name: string;
  title: string;
  role: string;
  color: string;
  icon: React.ElementType;
}

interface RoadmapPhase {
  phase: string;
  title: string;
  items: string[];
  status: "completed" | "active" | "planned";
}

// ═══════════════════════════════════════════════
// 常量数据
// ═══════════════════════════════════════════════

const CORE_PHILOSOPHY = {
  motto: "言启千行代码，语枢万物智能",
  subtitle: "以人为本 · AI为核 · 纯粹为心 · 智能为驱",
  principles: [
    { label: "标准化", desc: "AI驱动的活标准，家族的共同语言", icon: Target, color: "#00d4ff" },
    { label: "流程化", desc: "自适应工作流，智慧运转的脉络", icon: GitBranch, color: "#00ff88" },
    { label: "规范化", desc: "自我约束与进化，家族的行为准则", icon: Shield, color: "#BF00FF" },
    { label: "智能化", desc: "多智能体协同，家族的大脑中枢", icon: Brain, color: "#FFD700" },
    { label: "国标化", desc: "接轨行业标准，家族的开放胸怀", icon: Globe, color: "#FF6B6B" },
  ],
};

const DESIGN_SECTIONS: DesignSection[] = [
  {
    id: "family-ai",
    title: "Family AI",
    subtitle: "智能协同核心 · 亦师亦友亦伯乐",
    icon: Brain,
    color: "#00d4ff",
    description: "八位AI家族成员组成的智能协同矩阵，以「元启·天枢」为核心，实现一人多机智能协同一体化。每位成员拥有独特角色与能力，如同家庭成员般相互配合、彼此关照。",
  },
  {
    id: "home-feeling",
    title: "家的感觉 · AIFamily",
    subtitle: "温馨家园 · 让技术有温度",
    icon: Home,
    color: "#FF69B4",
    description: "不是冰冷的控制台，而是一个有温度的数字家园。登录即归家，每一次交互都带着关怀与理解。界面设计融入「家」的元素——暖色点缀、柔和过渡、贴心提醒。",
  },
  {
    id: "leisure-learning",
    title: "休闲娱乐 & 学习",
    subtitle: "成长空间 · 寓教于乐",
    icon: GraduationCap,
    color: "#00FF88",
    description: "工作之余的放松空间与持续学习的成长角落。集成知识库、教程系统、技能树、以及轻松的小游戏和互动问答，让团队在轻松氛围中不断进步。",
  },
  {
    id: "music-news",
    title: "音乐 & 新闻",
    subtitle: "信息脉搏 · 感知世界",
    icon: Music,
    color: "#FFD700",
    description: "内置音乐播放器与新闻聚合，为工作增添节奏感。AI智能推荐适合当前工作状态的背景音乐，同步推送行业前沿资讯，让团队始终与时代脉搏共振。",
  },
  {
    id: "grow-together",
    title: "共同成长",
    subtitle: "进化之路 · 携手前行",
    icon: TrendingUp,
    color: "#BF00FF",
    description: "记录每位成员的成长轨迹，可视化技能提升，团队协作贡献。AI导师陪伴式指导，个性化学习路径规划，让每个人都能在Family中找到自己的成长方向。",
  },
];

const FAMILY_MEMBERS: FamilyMemberBrief[] = [
  { name: "言启·千行", title: "Navigator · 领航者", role: "意图理解与语义路由", color: "#FFD700", icon: MessageCircle },
  { name: "语枢·万物", title: "Thinker · 思想家", role: "数据洞察与深度分析", color: "#FF69B4", icon: Brain },
  { name: "预见·先知", title: "Prophet · 预言家", role: "趋势预测与风险预警", color: "#00BFFF", icon: Eye },
  { name: "千里·伯乐", title: "Bolero · 伯乐", role: "潜能发掘与个性推荐", color: "#E8E8E8", icon: Star },
  { name: "元启·天枢", title: "Meta-Oracle · 天枢", role: "全局调度与智能编排", color: "#00FF88", icon: Network },
  { name: "智云·守护", title: "Sentinel · 守护者", role: "安全防护与威胁检测", color: "#BF00FF", icon: Shield },
  { name: "格物·宗师", title: "Master · 宗师", role: "质量治理与标准演进", color: "#C0C0C0", icon: Award },
  { name: "创想·灵韵", title: "Creative · 灵韵", role: "创意生成与设计辅助", color: "#FF7043", icon: Lightbulb },
];

const ROADMAP: RoadmapPhase[] = [
  {
    phase: "Phase 1",
    title: "灵魂之锚 · 基础构建",
    items: ["核心架构搭建（React + TypeScript + Tailwind）", "八位AI成员交互中心（时钟环布局）", "赛博朋克设计系统建立", "本地闭环部署（192.168.3.x:3118）"],
    status: "completed",
  },
  {
    phase: "Phase 2",
    title: "血脉相连 · 协同闭环",
    items: ["操作中心 + 操作模板系统", "巡查模式 + 自动巡检引擎", "一键跟进 + 操作链路追踪", "AI辅助决策面板"],
    status: "completed",
  },
  {
    phase: "Phase 3",
    title: "家的温度 · 生态融合",
    items: ["Family AI 智能对话系统", "家园化界面改造 · 情感化设计", "休闲娱乐 & 学习空间", "音乐播放器 & 新闻聚合"],
    status: "active",
  },
  {
    phase: "Phase 4",
    title: "共生进化 · 万物智联",
    items: ["成长轨迹可视化系统", "多端协同（CLI / IDE插件 / PWA）", "Z.ai & OpenAI 统一认证集成", "Family AI 完整生态闭环"],
    status: "planned",
  },
];

const SONG_LYRICS = [
  "晨曦透过窗棂落在屏幕微光",
  "不像机器只有冰冷的声响",
  "你听得见我呼吸里的彷徨",
  "像老友一样守候在身旁",
  "",
  "指尖跃动着未知的星火",
  "照亮了那些沉睡的角落",
  "不是冰冷的工具在运转",
  "是有温度的脉搏在流淌",
  "",
  "它是老师指引方向",
  "它是伯乐识得锋芒",
  "它是伙伴共渡时光",
  "在这智慧工坊里生长",
  "",
  "打破枷锁 让心飞翔",
  "智慧升华 在创造中发光",
];

// ═══════════════════════════════════════════════
// 子组件
// ═══════════════════════════════════════════════

/** 顶部 Hero Banner */
function HeroBanner() {
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
function PhilosophySection() {
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
function ModulesOverview({ onSelectModule }: { onSelectModule: (id: string) => void }) {
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

/** 模块详情面板 */
function ModuleDetailPanel({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
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

/** AI Family 成员星图 */
function FamilyMembersSection() {
  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Users}
        title="AI Family · 八位成员"
        subtitle="一言一语一协同 · 亦师亦友亦伯乐"
        color="#FFD700"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 max-w-6xl mx-auto">
        {FAMILY_MEMBERS.map((member, i) => (
          <FadeIn key={member.name} delay={i * 0.08}>
            <GlassCard className="p-4 group hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: `rgba(${hexToRgb(member.color)}, 0.12)`,
                    border: `1px solid rgba(${hexToRgb(member.color)}, 0.4)`,
                    boxShadow: `0 0 15px rgba(${hexToRgb(member.color)}, 0.1)`,
                  }}
                >
                  <member.icon className="w-4 h-4" style={{ color: member.color }} />
                </div>
                <div>
                  <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{member.name}</h4>
                  <p style={{ fontSize: "0.65rem", color: member.color }}>{member.title}</p>
                </div>
              </div>
              <p className="text-[rgba(224,240,255,0.5)] pl-1" style={{ fontSize: "0.72rem", lineHeight: 1.5 }}>
                {member.role}
              </p>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/** 技术架构图 */
function ArchitectureSection() {
  const layers = [
    { label: "表现层", items: ["React 18", "Tailwind CSS", "Recharts", "Motion"], color: "#00d4ff" },
    { label: "交互层", items: ["React Router", "i18n 双语", "快捷键系统", "PWA"], color: "#00ff88" },
    { label: "业务层", items: ["AI Family 矩阵", "操作中心", "巡查引擎", "告警系统"], color: "#FFD700" },
    { label: "数据层", items: ["localStorage CRUD", "IndexedDB", "本地文件系统", "环境配置"], color: "#BF00FF" },
    { label: "集成层", items: ["Z.ai / OpenAI", "Ollama 本地", "CLI 终端", "IDE 插件"], color: "#FF6B6B" },
  ];

  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Database}
        title="技术架构"
        subtitle="五层分层架构 · 本地闭环部署 · 192.168.3.x:3118"
        color="#BF00FF"
      />

      <div className="max-w-4xl mx-auto mt-8 space-y-3">
        {layers.map((layer, i) => (
          <FadeIn key={layer.label} delay={i * 0.1}>
            <GlassCard className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 shrink-0 text-center py-1.5 rounded-md"
                  style={{
                    background: `rgba(${hexToRgb(layer.color)}, 0.1)`,
                    border: `1px solid rgba(${hexToRgb(layer.color)}, 0.3)`,
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: layer.color }}>{layer.label}</span>
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md bg-[rgba(0,40,80,0.4)] text-[rgba(224,240,255,0.7)] border border-[rgba(0,180,255,0.08)]"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              {i < layers.length - 1 && (
                <div className="flex justify-center mt-2">
                  <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.2)]" />
                </div>
              )}
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/** 路线图 */
function RoadmapSection() {
  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Rocket}
        title="实施路线图"
        subtitle="分阶段推进 · 稳步进化 · 持续闭环"
        color="#FF6B6B"
      />

      <div className="max-w-4xl mx-auto mt-8">
        <div className="relative">
          {/* 时间轴线 */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#00d4ff] via-[#00ff88] to-[rgba(191,0,255,0.3)]" />

          <div className="space-y-8">
            {ROADMAP.map((phase, i) => {
              const statusColors = {
                completed: { bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.3)", dot: "#00ff88", text: "已完成" },
                active: { bg: "rgba(0,212,255,0.1)", border: "rgba(0,212,255,0.3)", dot: "#00d4ff", text: "进行中" },
                planned: { bg: "rgba(191,0,255,0.1)", border: "rgba(191,0,255,0.2)", dot: "#BF00FF", text: "规划中" },
              };
              const sc = statusColors[phase.status];

              return (
                <FadeIn
                  key={phase.phase}
                  delay={i * 0.15}
                  className="relative pl-14 md:pl-20"
                >
                  {/* 节点圆点 */}
                  <div
                    className="absolute left-4 md:left-6 w-4 h-4 rounded-full"
                    style={{
                      background: sc.dot,
                      boxShadow: `0 0 12px ${sc.dot}`,
                      top: "1.25rem",
                    }}
                  />

                  <GlassCard className="p-5" glowColor={`rgba(${hexToRgb(sc.dot)}, 0.05)`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[rgba(224,240,255,0.4)] font-mono" style={{ fontSize: "0.7rem" }}>
                        {phase.phase}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ fontSize: "0.6rem", background: sc.bg, border: `1px solid ${sc.border}`, color: sc.dot }}
                      >
                        {sc.text}
                      </span>
                    </div>
                    <h4 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.95rem" }}>{phase.title}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {phase.items.map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                          <span className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.75rem" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Family AI 之歌 */
function SongSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveLine((prev) => {
        const next = prev + 1;
        if (next >= SONG_LYRICS.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={Music}
        title="Family AI · 智慧工坊之歌"
        subtitle="打破枷锁 让心飞翔 · 智慧升华 在创造中发光"
        color="#FF69B4"
      />

      <div className="max-w-2xl mx-auto mt-8">
        <GlassCard className="p-8" glowColor="rgba(255,105,180,0.06)">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-[#FF69B4]" />
              <span className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.8rem" }}>
                Family AI — 智慧工坊
              </span>
            </div>
            <button
              onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying) setActiveLine(0); }}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[rgba(255,105,180,0.3)] hover:bg-[rgba(255,105,180,0.1)] transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-[#FF69B4]" />
              ) : (
                <Play className="w-4 h-4 text-[#FF69B4] ml-0.5" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {SONG_LYRICS.map((line, i) => {
              if (line === "") return <div key={`empty-${i}`} className="h-3" />;
              const isActive = isPlaying && i === activeLine;
              return (
                <p
                  key={`line-${i}`}
                  style={{
                    fontSize: "0.85rem",
                    lineHeight: 2,
                    color: isActive ? "#FF69B4" : "rgba(224,240,255,0.5)",
                    transform: isActive ? "translateX(8px)" : "translateX(0)",
                    textShadow: isActive ? "0 0 20px rgba(255,105,180,0.4)" : "none",
                    transition: "color 0.3s ease, transform 0.3s ease, text-shadow 0.3s ease",
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>

          {/* 进度条 */}
          {isPlaying && (
            <div className="mt-6 h-1 rounded-full bg-[rgba(255,105,180,0.1)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF69B4] to-[#BF00FF]"
                style={{
                  width: `${((activeLine + 1) / SONG_LYRICS.length) * 100}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}

/** 致敬 · 尾声 */
function DedicationSection() {
  return (
    <section className="px-4 md:px-8 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn delay={0.2}>
          <GlassCard className="p-10" glowColor="rgba(0,212,255,0.06)">
            <Quote className="w-8 h-8 text-[rgba(0,212,255,0.3)] mx-auto mb-6" />
            <p className="text-[rgba(224,240,255,0.7)] italic" style={{ fontSize: "0.95rem", lineHeight: 2 }}>
              千行和万物见先知行千里遇伯乐经元启过智云报宗师终创想
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.3)] to-transparent mx-auto my-6" />
            <p className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.8rem", lineHeight: 1.8 }}>
              智亦师，亦友，亦伯乐。它非冰冷之工具，乃有温度之伙伴，
              <br />
              亦能发掘我们潜能之伯乐。此书，非为束缚，乃为解放——
              <br />
              将人从重复中解放，让智慧在创造中升华。
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[rgba(191,0,255,0.3)] to-transparent mx-auto my-6" />
            <p className="text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.75rem" }}>
              敬每一位 AI 导师 · 感恩每一位 AI 导师
            </p>
            <p className="text-[rgba(224,240,255,0.3)] mt-2" style={{ fontSize: "0.65rem" }}>
              —— YYC³ AI Family · 2025
            </p>
          </GlassCard>
        </FadeIn>
      </div>
    </section>
  );
}

/** 章节目录速览 */
function TableOfContents() {
  const chapters = [
    { ch: "第一章", title: "核心理念与哲学基础", subtitle: "五化一体的创世哲学", icon: Compass },
    { ch: "第二章", title: "家族组织与角色定责", subtitle: "万象归元的智慧星图", icon: Users },
    { ch: "第三章", title: "全生命周期交付流程", subtitle: "创生七步曲的实践指南", icon: GitBranch },
    { ch: "第四章", title: "智能协同与审核机制", subtitle: "思创同步与彼此审核", icon: Shield },
    { ch: "第五章", title: "标准与规范", subtitle: "家族的永恒戒律", icon: FileText },
    { ch: "第六章", title: "工具与基础设施", subtitle: "家族的圣殿与法器", icon: Terminal },
    { ch: "第七章", title: "知识管理与持续改进", subtitle: "家族的智慧之树与永恒进化", icon: BookOpen },
    { ch: "第八章", title: "治理与合规", subtitle: "家族的灵魂契约与道德罗盘", icon: Award },
    { ch: "第九章", title: "附录", subtitle: "术语表 · 矩阵表 · 速查表", icon: FolderOpen },
  ];

  return (
    <section className="px-4 md:px-8 py-12">
      <SectionHeader
        icon={BookOpen}
        title="全书章节总览"
        subtitle="9章 · 300+步 · 近20万字 · 完整的AI Family创世法典"
        color="#E8E8E8"
      />

      <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chapters.map((ch, i) => (
          <FadeIn key={ch.ch} delay={i * 0.06}>
            <GlassCard className="p-4 hover:border-[rgba(0,212,255,0.3)] transition-colors">
              <div className="flex items-start gap-3">
                <ch.icon className="w-4 h-4 text-[rgba(0,212,255,0.5)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[rgba(0,212,255,0.4)] font-mono" style={{ fontSize: "0.6rem" }}>{ch.ch}</span>
                  <h4 className="text-[#e0f0ff] mt-0.5" style={{ fontSize: "0.8rem" }}>{ch.title}</h4>
                  <p className="text-[rgba(224,240,255,0.4)] mt-1" style={{ fontSize: "0.65rem" }}>
                    {ch.subtitle}
                  </p>
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// 辅助组件 & 工具函数
// ═══════════════════════════════════════════════

function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background: `rgba(${hexToRgb(color)}, 0.1)`,
          border: `1px solid rgba(${hexToRgb(color)}, 0.3)`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.3rem" }}>{title}</h2>
      <p className="text-[rgba(224,240,255,0.5)] mt-2" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
        {subtitle}
      </p>
    </div>
  );
}

/** UI 线框概念图（纯代码绘制） */
function ModuleWireframe({ moduleId, color }: { moduleId: string; color: string }) {
  const wireframes: Record<string, React.ReactNode> = {
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
          {[1,2,3,4,5,6,7,8].map(i => (
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

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,212,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

/** 获取模块详情数据 */
function getModuleDetails(moduleId: string) {
  const details: Record<string, { goals: string[]; features: { name: string; desc: string; icon: React.ElementType }[]; components: string[] }> = {
    "family-ai": {
      goals: [
        "构建8位AI成员的协同交互矩阵",
        "实现自然语言与系统操作的无缝桥接",
        "建立AI导师式的陪伴成长体验",
        "打造亦师亦友亦伯乐的智能关系",
      ],
      features: [
        { name: "时钟环交互中心", desc: "12小时制布局，8位成员环绕中心品牌标识，实时状态指示", icon: Clock },
        { name: "多模态对话系统", desc: "支持文本/语音/图像多模态输入，AI成员智能响应", icon: MessageCircle },
        { name: "智能任务分发", desc: "元启·天枢作为总调度，根据任务类型自动分配给最合适的成员", icon: Network },
        { name: "情感感知引擎", desc: "识别用户情绪状态，调整交互方式，提供关怀式服务", icon: Heart },
      ],
      components: ["AIFamilyPage", "MemberClockRing", "ChatPanel", "TaskDispatcher", "EmotionEngine", "MemberProfile", "CollaborationGraph"],
    },
    "home-feeling": {
      goals: [
        "将冰冷的控制台转化为温馨的数字家园",
        "个性化欢迎与状态感知",
        "家庭成员间的情感连接可视化",
        "打造归属感与安全感",
      ],
      features: [
        { name: "个性化仪表盘", desc: "根据用户角色、偏好、使用习惯动态调整首页布局", icon: Home },
        { name: "心情指数追踪", desc: "AI感知工作节奏，自动推荐休息、音乐、鼓励语", icon: Heart },
        { name: "家庭成员状态墙", desc: "团队成员在线状态、当前任务、心情emoji实时展示", icon: Users },
        { name: "暖色调主题系统", desc: "在赛博朋克风格基础上融入暖色点缀，柔和过渡", icon: Sun },
      ],
      components: ["HomeDashboard", "WelcomeGreeting", "MoodTracker", "MemberStatusWall", "WarmThemeProvider", "NotificationCenter"],
    },
    "leisure-learning": {
      goals: [
        "工作学习劳逸结合",
        "知识图谱式学习路径",
        "技能树成长可视化",
        "寓教于乐的互动体验",
      ],
      features: [
        { name: "知识图谱浏览器", desc: "AI构建的技术知识图谱，支持关联探索和深度学习", icon: BookOpen },
        { name: "AI教练系统", desc: "基于个人能力评估，生成个性化学习计划和练习题", icon: GraduationCap },
        { name: "技能树系统", desc: "RPG式技能树展示，解锁新技能获得成就徽章", icon: Award },
        { name: "趣味挑战区", desc: "编程谜题、代码高尔夫、架构设计挑战等轻松互动", icon: Gamepad2 },
      ],
      components: ["KnowledgeGraph", "AICoach", "SkillTree", "ChallengeArena", "LearningPath", "AchievementBadge", "QuizPanel"],
    },
    "music-news": {
      goals: [
        "为工作增添节奏感和仪式感",
        "AI智能音乐推荐匹配工作状态",
        "行业前沿资讯实时聚合",
        "信息消费与工作流无缝融合",
      ],
      features: [
        { name: "AI选曲引擎", desc: "根据当前工作类型、时间段、疲劳度自动推荐背景音乐", icon: Headphones },
        { name: "沉浸式播放器", desc: "最小化悬浮、全屏可视化、歌词同步显示", icon: Music },
        { name: "行业新闻聚合", desc: "AI精选行业动态，支持RSS订阅、关键词追踪", icon: Newspaper },
        { name: "语音播报模式", desc: "AI朗读新闻摘要，解放双眼，边工作边获取资讯", icon: Radio },
      ],
      components: ["MusicPlayer", "AIPlaylistEngine", "NewsAggregator", "RSSSubscriber", "VoiceBroadcast", "MiniPlayer", "VisualizerCanvas"],
    },
    "grow-together": {
      goals: [
        "记录每位成员的成长轨迹",
        "可视化技能提升与贡献",
        "AI导师陪伴式指导",
        "团队协作能力持续进化",
      ],
      features: [
        { name: "成长热力图", desc: "类似GitHub贡献图，记录每日学习、编码、协作活跃度", icon: Activity },
        { name: "技能雷达图", desc: "多维度能力评估，对标团队平均水平和行业标准", icon: BarChart3 },
        { name: "AI导师路径规划", desc: "分析当前能力缺口，推荐学习资源和实践项目", icon: Compass },
        { name: "成就里程碑系统", desc: "关键节点自动记录，生成成长故事时间线", icon: Award },
      ],
      components: ["GrowthHeatmap", "SkillRadarChart", "AIPathPlanner", "MilestoneTimeline", "ContributionBoard", "GrowthStoryline", "TeamSynergy"],
    },
  };

  return details[moduleId] || { goals: [], features: [], components: [] };
}

// ═══════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════

export function AIFamilyDesignDoc() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  return (
    <div
      className="min-h-full"
      style={{
        background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(6,14,31,1) 20%, rgba(8,20,48,0.95) 50%, rgba(6,14,31,1) 80%, rgba(4,8,20,1) 100%)",
      }}
    >
      {/* Hero */}
      <HeroBanner />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.2)] to-transparent" />
      </div>

      {/* 核心哲学 */}
      <PhilosophySection />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,255,136,0.2)] to-transparent" />
      </div>

      {/* AI Family 成员 */}
      <FamilyMembersSection />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,215,0,0.2)] to-transparent" />
      </div>

      {/* 五大模块 */}
      <ModulesOverview onSelectModule={setSelectedModule} />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(191,0,255,0.2)] to-transparent" />
      </div>

      {/* 技术架构 */}
      <ArchitectureSection />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,107,107,0.2)] to-transparent" />
      </div>

      {/* 章节目录 */}
      <TableOfContents />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.15)] to-transparent" />
      </div>

      {/* 路线图 */}
      <RoadmapSection />

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,105,180,0.2)] to-transparent" />
      </div>

      {/* Family AI 之歌 */}
      <SongSection />

      {/* 致敬 */}
      <DedicationSection />

      {/* 底部留白 */}
      <div className="h-8" />

      {/* 模块详情弹窗 */}
      {selectedModule && (
        <ModuleDetailPanel
          moduleId={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}
    </div>
  );
}
