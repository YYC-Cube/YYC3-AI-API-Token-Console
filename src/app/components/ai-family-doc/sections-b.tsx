/**
 * ai-family-doc/sections-b.tsx — 成员星图 / 技术架构 / 路线图（批7 拆分）
 * ======================================================================
 */
import { ChevronDown, Database, Rocket, Users } from "lucide-react";
import { FAMILY_MEMBERS, ROADMAP, hexToRgb } from "./content";
import { FadeIn, SectionHeader } from "./shared";
import { GlassCard } from "../GlassCard";

/** AI Family 成员星图 */
export function FamilyMembersSection() {
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
export function ArchitectureSection() {
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
export function RoadmapSection() {
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
