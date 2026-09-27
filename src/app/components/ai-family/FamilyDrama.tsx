/**
 * FamilyDrama.tsx
 * =================
 * AI Family × 漫剧生产线 —— 生产看板（只读）
 *
 * 定位：YYC³ 三层生产体系的「运营看板层」——
 *   本页只读展示生产服务群健康与链路状态；
 *   生产执行在 manju-studio 工作台 / H3 console / 网关，不在此发起。
 *
 * 数据源：本地生产服务群 healthz 探针（fetch + 超时降级，不可达=离线，非错误）。
 * 服务清单与 src/app/config/providers/builtin-providers.json 的 yyc3-* 条目对应。
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, Film, ImageIcon, Mic, Clapperboard,
  ShieldCheck, Video, Workflow,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";

// ═══ 生产服务群（与 builtin-providers.json yyc3-* 对齐）═══

type ServiceState = "probing" | "online" | "offline";

interface ServiceDef {
  id: string;
  label: string;
  url: string;
  kind: "json" | "text";
  role: string;
}

const SERVICES: ServiceDef[] = [
  { id: "gateway",  label: "0379-World 网关",  url: "http://localhost:25080/healthz",  kind: "json",  role: "统一模型入口 / 路由熔断" },
  { id: "comfyui",  label: "ComfyUI 文生图",   url: "http://localhost:41888/healthz",  kind: "text",  role: "关键帧生成（fp16 预览）" },
  { id: "syncnet",  label: "SyncNet 口型评分", url: "http://localhost:42218/healthz",  kind: "json",  role: "音画同步门禁（<0.75 打回）" },
  { id: "tts",      label: "TTS 配音 (piper)", url: "http://localhost:42118/healthz",  kind: "json",  role: "中文配音（zh_CN-huayan）" },
  { id: "ollama",   label: "Ollama 本地推理",  url: "http://localhost:11434/api/tags", kind: "json",  role: "LLM 推理（qwen3 系）" },
];

const PROBE_TIMEOUT_MS = 2500;

async function probe(url: string, kind: "json" | "text"): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, mode: "cors" });
    if (!res.ok) return false;
    if (kind === "json") {
      await res.json();
    } else {
      await res.text();
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ═══ 网关真实指标（/health 轮询，30s 刷新）═══

interface GatewayMetrics {
  status: string;
  version: string;
  uptime_seconds: number;
  metrics: { active_requests: number; total_requests: number; cache_hit_rate: number };
}

async function fetchGatewayHealth(): Promise<GatewayMetrics | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch("http://localhost:25080/health", {
      signal: ctl.signal, mode: "cors",
    });
    if (!res.ok) return null;
    return (await res.json()) as GatewayMetrics;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ═══ 生产链六环节（只读状态；执行在 manju-studio / H3 console）═══

const PIPELINE_STAGES = [
  { icon: Workflow,     label: "剧本分镜", desc: "script_engine → StoryboardV1" },
  { icon: ImageIcon,    label: "关键帧生成", desc: "ComfyUI + IPAdapter 锚定" },
  { icon: ShieldCheck,  label: "一致性质检", desc: "anchor_guard ≥0.85 打回" },
  { icon: Mic,          label: "TTS 配音",  desc: "piper zh_CN-huayan" },
  { icon: Clapperboard, label: "合成串接",  desc: "ffmpeg H.264+AAC" },
  { icon: Video,        label: "口型门禁",  desc: "SyncNet ≥0.75（动态镜头）" },
];

// ═══ 子组件 ═══

const STATE_META: Record<ServiceState, { color: string; label: string }> = {
  probing: { color: "#f59e0b", label: "探测中" },
  online:  { color: "#22c55e", label: "在线" },
  offline: { color: "#64748b", label: "离线" },
};

function ServiceRow({ def, state, delay }: {
  def: ServiceDef; state: ServiceState; delay: number;
}) {
  const meta = STATE_META[state];
  return (
    <FadeIn delay={delay}>
      <GlassCard className="p-3 flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: meta.color,
            boxShadow: state === "online" ? `0 0 8px ${meta.color}` : "none",
            animation: state === "probing" ? "pulse 1.2s infinite" : undefined,
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white/85 truncate" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
              {def.label}
            </span>
            <span style={{ fontSize: "0.6rem", color: meta.color }}>{meta.label}</span>
          </div>
          <div className="text-white/35 truncate" style={{ fontSize: "0.62rem" }}>
            {def.role} · {def.url.replace(/^https?:\/\//, "")}
          </div>
        </div>
        <Activity className="w-3.5 h-3.5 shrink-0" style={{ color: `${meta.color}88` }} />
      </GlassCard>
    </FadeIn>
  );
}

// ═══ 主组件 ═══

export function FamilyDrama() {
  const [states, setStates] = useState<Record<string, ServiceState>>(
    () => Object.fromEntries(SERVICES.map(s => [s.id, "probing" as ServiceState])),
  );
  const [gwMetrics, setGwMetrics] = useState<GatewayMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    SERVICES.forEach(async def => {
      const ok = await probe(def.url, def.kind);
      if (alive) setStates(prev => ({ ...prev, [def.id]: ok ? "online" : "offline" }));
    });
    // 网关真实指标：首次拉取 + 30s 轮询
    const fetchMetrics = async () => {
      const m = await fetchGatewayHealth();
      if (alive) setGwMetrics(m);
    };
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 30_000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const onlineCount = useMemo(
    () => Object.values(states).filter(s => s === "online").length,
    [states],
  );

  return (
    <div
      className="min-h-screen px-4 py-6 md:px-8"
      style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}
    >
      {/* 标题 */}
      <FadeIn>
        <div className="flex items-center gap-3 mb-1">
          <Film className="w-5 h-5 text-cyan-300" />
          <h1 className="text-white/90" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
            漫剧生产线 · 生产看板
          </h1>
        </div>
        <p className="text-white/35 mb-5" style={{ fontSize: "0.68rem" }}>
          只读看板 · 生产执行在 manju-studio 工作台 / H3 console · 服务清单对齐 /models 注册表
        </p>
      </FadeIn>

      {/* 服务健康 */}
      <FadeIn delay={0.05}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/60" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            生产服务群
          </span>
          <span className="text-cyan-300/70" style={{ fontSize: "0.62rem" }}>
            {onlineCount}/{SERVICES.length} 在线
          </span>
        </div>
      </FadeIn>
      <div className="grid gap-2 md:grid-cols-2 mb-6">
        {SERVICES.map((def, i) => (
          <ServiceRow key={def.id} def={def} state={states[def.id]} delay={0.08 + i * 0.04} />
        ))}
      </div>

      {/* 网关真实指标 */}
      {gwMetrics && (
        <FadeIn delay={0.28}>
          <GlassCard className="p-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/60" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                网关实时指标（0379-World v{gwMetrics.version} · 30s 刷新）
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2" style={{ fontSize: "0.68rem" }}>
              {[
                { k: "运行状态", v: gwMetrics.status },
                { k: "在线时长", v: `${Math.floor(gwMetrics.uptime_seconds / 60)}m ${gwMetrics.uptime_seconds % 60}s` },
                { k: "累计请求", v: String(gwMetrics.metrics.total_requests) },
                { k: "缓存命中率", v: `${(gwMetrics.metrics.cache_hit_rate * 100).toFixed(1)}%` },
              ].map(m => (
                <div key={m.k}>
                  <div className="text-white/35" style={{ fontSize: "0.58rem" }}>{m.k}</div>
                  <div className="text-cyan-300/90" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeIn>
      )}

      {/* 生产链 */}
      <FadeIn delay={0.3}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/60" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            生产链路（六环节）
          </span>
        </div>
      </FadeIn>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 mb-6">
        {PIPELINE_STAGES.map((st, i) => (
          <FadeIn key={st.label} delay={0.32 + i * 0.04}>
            <GlassCard className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <st.icon className="w-3.5 h-3.5 text-cyan-300/80" />
                <span className="text-white/80" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                  {i + 1}. {st.label}
                </span>
              </div>
              <div className="text-white/35" style={{ fontSize: "0.6rem" }}>{st.desc}</div>
            </GlassCard>
          </FadeIn>
        ))}
      </div>

      {/* 红线声明 */}
      <FadeIn delay={0.55}>
        <GlassCard className="p-3">
          <div className="text-white/40" style={{ fontSize: "0.62rem", lineHeight: 1.7 }}>
            分层边界：本页为看板层（只读）。生产执行分发 —— 剧本/分镜/生成/质检在
            manju-studio 工作台（:20300/:25200）；批量流水线与精评在 H3 console；
            模型调用统一经 0379-World 网关（:25080）。服务端口规范见 YYC3-07 §八 A11。
          </div>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
