/**
 * FamilyMusic.tsx
 * ================
 * AI Family 音乐 & 新闻空间
 * 音乐播放器 · 行业资讯 · AI 智能推荐
 *
 * 重构: 使用 shared.ts + FadeIn + FamilyPageHeader
 */

import React, { useState, useEffect } from "react";
import {
  Music, Newspaper, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Heart, Shuffle, Repeat, List, Rss,
  ExternalLink, Sparkles,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { DEEP_BG } from "./shared";

// ═══ 音乐数据 ═══
const PLAYLIST = [
  { id: 1, title: "Family AI — 智慧工坊", artist: "YYC3 Family", duration: "4:32", color: "#FF69B4" },
  { id: 2, title: "Deep Focus · 深海专注", artist: "AI Ambient", duration: "6:15", color: "#00d4ff" },
  { id: 3, title: "Code Flow · 编程心流", artist: "Digital Waves", duration: "5:48", color: "#00FF88" },
  { id: 4, title: "Dawn Break · 晨曦微光", artist: "Nature Synth", duration: "4:05", color: "#FFD700" },
  { id: 5, title: "Cyber Night · 赛博之夜", artist: "Neon Dreams", duration: "5:20", color: "#BF00FF" },
  { id: 6, title: "Thinking Space · 思考空间", artist: "AI Ambient", duration: "7:00", color: "#00BFFF" },
  { id: 7, title: "Victory Loop · 成功循环", artist: "Epic Sound", duration: "3:55", color: "#FF7043" },
  { id: 8, title: "Gentle Rain · 温柔细雨", artist: "Nature Synth", duration: "8:30", color: "#C0C0C0" },
];

const NEWS_ITEMS = [
  { id: "n1", title: "OpenAI 发布 GPT-5 技术报告，推理能力大幅跃升", source: "AI前沿", time: "30分钟前", category: "AI", color: "#00d4ff" },
  { id: "n2", title: "DeepSeek V3 开源模型性能超越 Claude 3.5", source: "开源社区", time: "1小时前", category: "开源", color: "#00FF88" },
  { id: "n3", title: "英伟达发布 Blackwell Ultra 芯片，推理性能翻倍", source: "硬件资讯", time: "2小时前", category: "硬件", color: "#FFD700" },
  { id: "n4", title: "React 20 正式发布：Server Components 全面稳定", source: "前端周刊", time: "3小时前", category: "前端", color: "#00BFFF" },
  { id: "n5", title: "智谱 AI 推出 GLM-5 系列模型，支持超长上下文", source: "国内AI", time: "4小时前", category: "AI", color: "#BF00FF" },
  { id: "n6", title: "Kubernetes 2.0 路线图公布：AI工作负载原生支持", source: "云原生", time: "5小时前", category: "架构", color: "#FF7043" },
  { id: "n7", title: "全球 AI 安全峰会达成共识：建立统一评估标准", source: "行业动态", time: "6小时前", category: "安全", color: "#FF6B6B" },
  { id: "n8", title: "Rust 在系统编程领域市场份额突破15%", source: "编程语言", time: "昨天", category: "语言", color: "#E8E8E8" },
];

function formatTime(progress: number, duration: string): string {
  const parts = duration.split(":");
  const totalSecs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  const currentSecs = Math.floor(totalSecs * progress / 100);
  const m = Math.floor(currentSecs / 60);
  const s = currentSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FamilyMusic() {
  const [activeTab, setActiveTab] = useState<"music" | "news">("music");
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set([1]));

  const track = PLAYLIST[currentTrack];

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setCurrentTrack(c => (c + 1) % PLAYLIST.length);
          return 0;
        }
        return p + 0.5;
      });
    }, 300);
    return () => clearInterval(t);
  }, [isPlaying]);

  const toggleLike = (id: number) => {
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={activeTab === "music" ? Music : Newspaper}
        iconColor={activeTab === "music" ? "#FFD700" : "#00d4ff"}
        title={activeTab === "music" ? "音乐空间" : "行业资讯"}
        subtitle={activeTab === "music" ? "沉浸专注 · AI 智能推荐" : "AI 精选行业前沿动态"}
      />

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("music")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === "music" ? "bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[rgba(255,215,0,0.2)]" : "text-[rgba(224,240,255,0.4)]"}`}
            style={{ fontSize: "0.78rem" }}
          >
            <Music className="w-3.5 h-3.5" /> 音乐
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === "news" ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]" : "text-[rgba(224,240,255,0.4)]"}`}
            style={{ fontSize: "0.78rem" }}
          >
            <Newspaper className="w-3.5 h-3.5" /> 资讯
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {activeTab === "music" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 播放器 */}
            <div className="lg:col-span-1">
              <GlassCard className="p-6" glowColor={`${track.color}08`}>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-5" style={{ background: `radial-gradient(circle, ${track.color}15 0%, rgba(4,10,22,0.9) 70%)`, border: `1px solid ${track.color}20` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-end gap-1 h-16">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const h = isPlaying ? 20 + Math.random() * 80 : 15 + (i % 3) * 10;
                        return (
                          <div
                            key={i}
                            className="w-2 rounded-t transition-all"
                            style={{
                              height: `${h}%`,
                              background: `linear-gradient(to top, ${track.color}60, ${track.color}15)`,
                              transitionDuration: isPlaying ? "0.3s" : "0.5s",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(0,0,0,0.5)]">
                      <Sparkles className="w-3 h-3 text-[#FFD700]" />
                      <span className="text-[rgba(255,215,0,0.7)]" style={{ fontSize: "0.55rem" }}>AI 推荐</span>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>{track.title}</h3>
                  <p className="text-[rgba(224,240,255,0.4)] mt-1" style={{ fontSize: "0.72rem" }}>{track.artist}</p>
                </div>

                <div className="mb-4">
                  <div className="h-1 rounded-full bg-[rgba(0,40,80,0.3)] cursor-pointer overflow-hidden" onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setProgress((e.clientX - rect.left) / rect.width * 100);
                  }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${track.color}, ${track.color}60)` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>{formatTime(progress, track.duration)}</span>
                    <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem" }}>{track.duration}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-5">
                  <Shuffle className="w-4 h-4 text-[rgba(224,240,255,0.25)] cursor-pointer hover:text-[rgba(224,240,255,0.6)] transition-colors" />
                  <SkipBack className="w-5 h-5 text-[rgba(224,240,255,0.5)] cursor-pointer hover:text-[#e0f0ff] transition-colors" onClick={() => { setCurrentTrack(c => (c - 1 + PLAYLIST.length) % PLAYLIST.length); setProgress(0); }} />
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                    style={{ background: `${track.color}20`, border: `2px solid ${track.color}50`, boxShadow: isPlaying ? `0 0 20px ${track.color}20` : "none" }}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" style={{ color: track.color }} /> : <Play className="w-5 h-5 ml-0.5" style={{ color: track.color }} />}
                  </button>
                  <SkipForward className="w-5 h-5 text-[rgba(224,240,255,0.5)] cursor-pointer hover:text-[#e0f0ff] transition-colors" onClick={() => { setCurrentTrack(c => (c + 1) % PLAYLIST.length); setProgress(0); }} />
                  <Repeat className="w-4 h-4 text-[rgba(224,240,255,0.25)] cursor-pointer hover:text-[rgba(224,240,255,0.6)] transition-colors" />
                </div>

                <div className="flex items-center gap-2 mt-4 px-4">
                  <button onClick={() => setMuted(!muted)} className="text-[rgba(224,240,255,0.3)]">
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1 h-1 rounded-full bg-[rgba(0,40,80,0.3)] cursor-pointer" onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setVolume(Math.round((e.clientX - rect.left) / rect.width * 100));
                    setMuted(false);
                  }}>
                    <div className="h-full rounded-full bg-[rgba(0,212,255,0.4)]" style={{ width: `${muted ? 0 : volume}%` }} />
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* 播放列表 */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <List className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
                <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>播放列表</h3>
                <span className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.65rem" }}>{PLAYLIST.length} 首</span>
              </div>
              <div className="space-y-2">
                {PLAYLIST.map((t, i) => {
                  const isCurrent = i === currentTrack;
                  return (
                    <FadeIn key={t.id} delay={i * 0.04}>
                      <GlassCard
                        className={`p-3 cursor-pointer group transition-all ${isCurrent ? "" : "hover:bg-[rgba(0,40,80,0.15)]"}`}
                        onClick={() => { setCurrentTrack(i); setProgress(0); setIsPlaying(true); }}
                        glowColor={isCurrent ? `${t.color}06` : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center shrink-0">
                            {isCurrent && isPlaying ? (
                              <div className="flex items-end justify-center gap-0.5 h-4">
                                {[0, 1, 2].map(j => (
                                  <div key={j} className="w-1 rounded-t animate-pulse" style={{ height: `${40 + Math.random() * 60}%`, background: t.color, animationDelay: `${j * 0.15}s` }} />
                                ))}
                              </div>
                            ) : (
                              <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.72rem" }}>{i + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${isCurrent ? "" : "text-[rgba(224,240,255,0.7)]"}`} style={{ fontSize: "0.8rem", color: isCurrent ? t.color : undefined }}>
                              {t.title}
                            </p>
                            <p className="text-[rgba(224,240,255,0.3)] truncate" style={{ fontSize: "0.6rem" }}>{t.artist}</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); toggleLike(t.id); }} className="shrink-0 p-1">
                            <Heart className="w-3.5 h-3.5 transition-colors" style={{ color: liked.has(t.id) ? "#FF69B4" : "rgba(224,240,255,0.15)", fill: liked.has(t.id) ? "#FF69B4" : "none" }} />
                          </button>
                          <span className="text-[rgba(224,240,255,0.2)] shrink-0" style={{ fontSize: "0.65rem" }}>{t.duration}</span>
                        </div>
                      </GlassCard>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Rss className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.72rem" }}>AI 精选 · 行业前沿资讯</span>
            </div>
            {NEWS_ITEMS.map((news, i) => (
              <FadeIn key={news.id} delay={i * 0.05}>
                <GlassCard className="p-5 cursor-pointer group hover:border-[rgba(0,212,255,0.2)] transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "0.58rem", background: `${news.color}10`, border: `1px solid ${news.color}20`, color: news.color }}>
                          {news.category}
                        </span>
                        <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.6rem" }}>{news.source}</span>
                        <span className="text-[rgba(224,240,255,0.15)]" style={{ fontSize: "0.55rem" }}>{news.time}</span>
                      </div>
                      <h3 className="text-[rgba(224,240,255,0.8)] group-hover:text-[#e0f0ff] transition-colors" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                        {news.title}
                      </h3>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[rgba(224,240,255,0.1)] group-hover:text-[rgba(0,212,255,0.5)] transition-colors shrink-0 mt-1" />
                  </div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
