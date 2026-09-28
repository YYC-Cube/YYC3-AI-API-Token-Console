/**
 * ai-family-doc/content.ts — 数据常量与工具（批7 Facade+Siblings 拆分）
 * =====================================================================
 * 设计文档的静态数据: 接口定义 / 五大模块 / 八位成员 / 路线图 / 歌词 /
 * 模块详情。纯数据无 JSX; 修改文案或增删模块请改本文件。
 */
import {
  Activity, Award, BarChart3, BookOpen, Brain, Clock, Compass, Eye, Gamepad2,
  GitBranch, Globe, GraduationCap, Headphones, Heart, Home, Lightbulb,
  MessageCircle, Music, Network, Newspaper, Radio, Shield, Star, Sun,
  Target, TrendingUp, Users,
} from "lucide-react";
import type React from "react";

export interface DesignSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

export interface FamilyMemberBrief {
  name: string;
  title: string;
  role: string;
  color: string;
  icon: React.ElementType;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  items: string[];
  status: "completed" | "active" | "planned";
}

export const CORE_PHILOSOPHY = {
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

export const DESIGN_SECTIONS: DesignSection[] = [
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

export const FAMILY_MEMBERS: FamilyMemberBrief[] = [
  { name: "言启·千行", title: "Navigator · 领航者", role: "意图理解与语义路由", color: "#FFD700", icon: MessageCircle },
  { name: "语枢·万物", title: "Thinker · 思想家", role: "数据洞察与深度分析", color: "#FF69B4", icon: Brain },
  { name: "预见·先知", title: "Prophet · 预言家", role: "趋势预测与风险预警", color: "#00BFFF", icon: Eye },
  { name: "千里·伯乐", title: "Bolero · 伯乐", role: "潜能发掘与个性推荐", color: "#E8E8E8", icon: Star },
  { name: "元启·天枢", title: "Meta-Oracle · 天枢", role: "全局调度与智能编排", color: "#00FF88", icon: Network },
  { name: "智云·守护", title: "Sentinel · 守护者", role: "安全防护与威胁检测", color: "#BF00FF", icon: Shield },
  { name: "格物·宗师", title: "Master · 宗师", role: "质量治理与标准演进", color: "#C0C0C0", icon: Award },
  { name: "创想·灵韵", title: "Creative · 灵韵", role: "创意生成与设计辅助", color: "#FF7043", icon: Lightbulb },
];

export const ROADMAP: RoadmapPhase[] = [
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

export const SONG_LYRICS = [
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

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,212,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

/** 获取模块详情数据 */
export function getModuleDetails(moduleId: string) {
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
