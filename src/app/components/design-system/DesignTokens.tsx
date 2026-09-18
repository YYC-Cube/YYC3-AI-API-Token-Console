/**
 * DesignTokens.tsx
 * ==================
 * 9.1 Design Tokens 展示 — 色彩 / 字体 / 间距 / 阴影 / 动效
 */

import React, { useState } from "react";
import { GlassCard } from "../GlassCard";
import type { ColorToken, TypographyToken, SpacingToken, ShadowToken, AnimationToken } from "../../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

/* ============================================================
 *  色彩系统
 * ============================================================ */

export const COLOR_TOKENS: ColorToken[] = [
  { name: "Background",        value: "#060e1f",                   cssVar: "--background",           usage: "全局页面背景" },
  { name: "Foreground",        value: "#e0f0ff",                   cssVar: "--foreground",            usage: "主文字颜色" },
  { name: "Primary",           value: "#00d4ff",                   cssVar: "--primary",               usage: "主色调 · 按钮 · 链接 · 焦点" },
  { name: "Primary Dark",      value: "#060e1f",                   cssVar: "--primary-foreground",    usage: "Primary 上的文字" },
  { name: "Secondary",         value: "rgba(0,180,255,0.15)",      cssVar: "--secondary",             usage: "次要背景 · 标签 · 辅助区域" },
  { name: "Muted",             value: "rgba(0,120,200,0.2)",       cssVar: "--muted",                 usage: "禁用 / 弱化内容背景" },
  { name: "Muted FG",          value: "#6bb8d9",                   cssVar: "--muted-foreground",      usage: "弱化文字 · 占位符" },
  { name: "Accent",            value: "rgba(0,200,255,0.1)",       cssVar: "--accent",                usage: "高亮悬浮 · 选中态" },
  { name: "Destructive",       value: "#ff3366",                   cssVar: "--destructive",           usage: "危险操作 · 错误 · 删除" },
  { name: "Border",            value: "rgba(0,180,255,0.2)",       cssVar: "--border",                usage: "边框 · 分割线" },
  { name: "Ring",              value: "rgba(0,212,255,0.5)",       cssVar: "--ring",                  usage: "焦点环 · 外发光" },
  { name: "Card",              value: "rgba(10,30,60,0.7)",        cssVar: "--card",                  usage: "GlassCard 背景" },
  { name: "Success",           value: "#00ff88",                   cssVar: "--chart-2",               usage: "成功 · 健康 · 正常" },
  { name: "Warning",           value: "#ffaa00",                   cssVar: "(custom)",                usage: "警告 · 接近阈值" },
  { name: "Chart 1",           value: "#00d4ff",                   cssVar: "--chart-1",               usage: "图表主色" },
  { name: "Chart 2",           value: "#00ff88",                   cssVar: "--chart-2",               usage: "图表副色" },
  { name: "Chart 3",           value: "#ff6600",                   cssVar: "--chart-3",               usage: "图表第三色" },
  { name: "Chart 4",           value: "#aa55ff",                   cssVar: "--chart-4",               usage: "图表第四色" },
  { name: "Chart 5",           value: "#ffdd00",                   cssVar: "--chart-5",               usage: "图表第五色" },
];

/* ============================================================
 *  字体排版
 * ============================================================ */

export const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  { name: "Display / H1",   family: "Orbitron",     weight: "500-700", size: "1.5rem",   usage: "页面大标题 · Logo 文字",       sample: "YYC³ CLOUDPIVOT" },
  { name: "Heading / H2",   family: "Orbitron",     weight: "500",     size: "1.25rem",  usage: "模块标题 · 卡片标题",          sample: "数据监控面板" },
  { name: "Subtitle / H3",  family: "Rajdhani",     weight: "500",     size: "1.125rem", usage: "区域标题 · 次级标题",          sample: "节点健康度巡查" },
  { name: "Body",           family: "Rajdhani",     weight: "400",     size: "0.875rem", usage: "正文 · 描述 · 段落",           sample: "GPU-A100-03 推理延迟异常，需要进行故障排查与修复操作。" },
  { name: "Caption",        family: "Rajdhani",     weight: "400",     size: "0.75rem",  usage: "辅助文字 · 时间戳 · 标签",     sample: "2026-02-25 10:23:45 · 3 分钟前" },
  { name: "Micro",          family: "Rajdhani",     weight: "400",     size: "0.625rem", usage: "极小标注 · 状态角标",          sample: "v1.4.2 · 48 项" },
  { name: "Mono / Code",    family: "JetBrains Mono", weight: "400",  size: "0.78rem",  usage: "代码 · 命令行 · 指标数值",      sample: "yyc3 node GPU-A100-03 --status" },
  { name: "Mono / Metric",  family: "Orbitron",     weight: "600",     size: "1.1rem",   usage: "大数字指标 · KPI 数值",        sample: "148K tok/s" },
];

/* ============================================================
 *  间距规范
 * ============================================================ */

export const SPACING_TOKENS: SpacingToken[] = [
  { name: "4xs", value: "0.125rem", px: 2,  usage: "最小间距 · 图标内部" },
  { name: "3xs", value: "0.25rem",  px: 4,  usage: "紧凑间距 · Badge 内边距" },
  { name: "2xs", value: "0.375rem", px: 6,  usage: "小间距 · 标签间距" },
  { name: "xs",  value: "0.5rem",   px: 8,  usage: "常规内边距 · 按钮垂直" },
  { name: "sm",  value: "0.75rem",  px: 12, usage: "卡片内边距 · 组件间距" },
  { name: "md",  value: "1rem",     px: 16, usage: "标准间距 · 页面边距" },
  { name: "lg",  value: "1.5rem",   px: 24, usage: "较大间距 · 区块间距" },
  { name: "xl",  value: "2rem",     px: 32, usage: "大间距 · 页面留白" },
  { name: "2xl", value: "3rem",     px: 48, usage: "超大间距 · 模块分隔" },
];

/* ============================================================
 *  阴影效果
 * ============================================================ */

export const SHADOW_TOKENS: ShadowToken[] = [
  { name: "Glow-SM",      value: "0 0 15px rgba(0,180,255,0.05)",    usage: "微弱发光 · 静态状态" },
  { name: "Glow-MD",      value: "0 0 30px rgba(0,180,255,0.1)",     usage: "默认发光 · GlassCard" },
  { name: "Glow-LG",      value: "0 0 40px rgba(0,180,255,0.15)",    usage: "Hover 发光 · 焦点状态" },
  { name: "Glow-XL",      value: "0 0 60px rgba(0,180,255,0.2)",     usage: "强调发光 · 活跃选中" },
  { name: "Glow-Primary", value: "0 0 16px rgba(0,212,255,0.4)",     usage: "主色发光 · 按钮活跃" },
  { name: "Glow-Success",  value: "0 0 12px rgba(0,255,136,0.3)",     usage: "成功发光 · 健康状态" },
  { name: "Glow-Danger",  value: "0 0 8px rgba(255,51,102,0.5)",     usage: "危险发光 · 告警角标" },
  { name: "Drop-SM",      value: "0 4px 15px rgba(0,0,0,0.2)",       usage: "弹出菜单 · 下拉" },
  { name: "Drop-LG",      value: "0 10px 50px rgba(0,0,0,0.5)",      usage: "模态框 · 抽屉" },
];

/* ============================================================
 *  动效定义
 * ============================================================ */

export const ANIMATION_TOKENS: AnimationToken[] = [
  { name: "Micro",       duration: "100ms",  easing: "ease-out",   usage: "按钮反馈 · 颜色变化" },
  { name: "Fast",        duration: "200ms",  easing: "ease-out",   usage: "Hover 过渡 · 边框" },
  { name: "Normal",      duration: "300ms",  easing: "ease-in-out", usage: "面板展开 · 标签切换" },
  { name: "Smooth",      duration: "500ms",  easing: "ease-in-out", usage: "抽屉滑入 · 模态淡入" },
  { name: "Slow",        duration: "800ms",  easing: "ease-in-out", usage: "页面转场 · 大面积变化" },
  { name: "Pulse",       duration: "2s",     easing: "linear infinite", usage: "脉冲点 · 活跃指示" },
  { name: "Spin",        duration: "1s",     easing: "linear infinite", usage: "Loading 旋转" },
  { name: "Scan Line",   duration: "8s",     easing: "linear infinite", usage: "背景扫描线" },
  { name: "Flow Pulse",  duration: "2s",     easing: "linear infinite", usage: "数据流连线动画" },
];

/* ============================================================
 *  渲染组件
 * ============================================================ */

export function DesignTokens() {
  const [activeSection, setActiveSection] = useState<string>("colors");

  const sections = [
    { key: "colors",     label: "色彩系统" },
    { key: "typography", label: "字体排版" },
    { key: "spacing",    label: "间距规范" },
    { key: "shadows",    label: "阴影效果" },
    { key: "animations", label: "动效定义" },
  ];

  return (
    <div data-testid="design-tokens">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-4">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSection === s.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                : "text-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] border border-transparent"
            }`}
            style={{ fontSize: "0.72rem" }}
            data-testid={`token-tab-${s.key}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Colors */}
      {activeSection === "colors" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" data-testid="token-colors">
          {COLOR_TOKENS.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
            >
              <div
                className="w-8 h-8 rounded-lg shrink-0 border border-[rgba(255,255,255,0.1)]"
                style={{ backgroundColor: c.value }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[#e0f0ff] truncate" style={{ fontSize: "0.75rem" }}>{c.name}</p>
                <p className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {c.cssVar}
                </p>
                <p className="text-[rgba(0,212,255,0.2)] truncate" style={{ fontSize: "0.55rem" }}>
                  {c.usage}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Typography */}
      {activeSection === "typography" && (
        <div className="space-y-3" data-testid="token-typography">
          {TYPOGRAPHY_TOKENS.map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-[rgba(0,40,80,0.06)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#00d4ff]" style={{ fontSize: "0.72rem" }}>{t.name}</span>
                <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {t.family} · {t.weight} · {t.size}
                </span>
              </div>
              <p
                className="text-[#e0f0ff] mb-1"
                style={{ fontFamily: `'${t.family}', sans-serif`, fontSize: t.size }}
              >
                {t.sample}
              </p>
              <p className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.55rem" }}>{t.usage}</p>
            </div>
          ))}
        </div>
      )}

      {/* Spacing */}
      {activeSection === "spacing" && (
        <div className="space-y-1.5" data-testid="token-spacing">
          {SPACING_TOKENS.map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(0,40,80,0.06)]">
              <span className="text-[#00d4ff] w-8 shrink-0" style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {s.name}
              </span>
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="h-3 rounded bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.2)]"
                  style={{ width: `${Math.min(s.px * 3, 200)}px` }}
                />
                <span className="text-[rgba(0,212,255,0.3)] shrink-0" style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.value} ({s.px}px)
                </span>
              </div>
              <span className="text-[rgba(0,212,255,0.2)] hidden sm:block shrink-0" style={{ fontSize: "0.55rem" }}>{s.usage}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shadows */}
      {activeSection === "shadows" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="token-shadows">
          {SHADOW_TOKENS.map((s) => (
            <div
              key={s.name}
              className="p-4 rounded-xl bg-[rgba(8,25,55,0.7)] border border-[rgba(0,180,255,0.15)] text-center"
              style={{ boxShadow: s.value }}
            >
              <p className="text-[#e0f0ff] mb-1" style={{ fontSize: "0.78rem" }}>{s.name}</p>
              <p className="text-[rgba(0,212,255,0.25)] mb-1" style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </p>
              <p className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.55rem" }}>{s.usage}</p>
            </div>
          ))}
        </div>
      )}

      {/* Animations */}
      {activeSection === "animations" && (
        <div className="space-y-1.5" data-testid="token-animations">
          {ANIMATION_TOKENS.map((a) => (
            <div key={a.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)]">
              <span className="text-[#00d4ff] w-20 shrink-0" style={{ fontSize: "0.72rem" }}>{a.name}</span>
              <span className="text-[rgba(0,212,255,0.3)] w-16 shrink-0" style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {a.duration}
              </span>
              <span className="text-[rgba(0,212,255,0.2)] w-28 shrink-0 hidden sm:block" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {a.easing}
              </span>
              {/* Live preview bar */}
              <div className="flex-1 h-2 rounded-full bg-[rgba(0,40,80,0.2)] overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-[#00d4ff]"
                  style={{
                    width: "30%",
                    animation: a.duration.includes("infinite")
                      ? undefined
                      : `tokenSlide ${a.duration} ${a.easing.split(" ")[0]} infinite alternate`,
                  }}
                />
              </div>
              <span className="text-[rgba(0,212,255,0.2)] shrink-0 hidden md:block" style={{ fontSize: "0.55rem" }}>{a.usage}</span>
            </div>
          ))}
          <style>{`
            @keyframes tokenSlide {
              0% { transform: translateX(0); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}