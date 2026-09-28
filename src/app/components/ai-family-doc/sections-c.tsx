/**
 * ai-family-doc/sections-c.tsx — 之歌 / 致敬 / 章节目录（批7 拆分）
 * =================================================================
 */
import {
  Award, BookOpen, Compass, FileText, FolderOpen, GitBranch, Mic, Music,
  Pause, Play, Quote, Shield, Terminal, Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SONG_LYRICS } from "./content";
import { FadeIn, SectionHeader } from "./shared";
import { GlassCard } from "../GlassCard";

/** Family AI 之歌 */
export function SongSection() {
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
export function DedicationSection() {
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
export function TableOfContents() {
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
