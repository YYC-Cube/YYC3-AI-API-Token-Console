/**
 * service-test/panels.tsx — 辅助面板组件（批7 拆分）
 * ==================================================
 * QuickTestButton: 快速单项测试按钮（自带 loading 态）
 * DiagnosticCard: 诊断参考卡片
 * EnvironmentDetectionPanel: 运行环境检测 + Ollama CORS 配置速查
 */
import {
  AlertTriangle, ArrowRight, Copy, Globe, Info, Loader2, Server,
} from "lucide-react";
import { useState } from "react";
import type { ElementType } from "react";
import { toast } from "sonner";
import { GlassCard } from "../GlassCard";
import { toastStyle } from "./types";

export function QuickTestButton({ label, icon: Icon, color, onClick }: {
  label: string;
  icon: ElementType;
  color: string;
  onClick: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try { await onClick(); } finally { setLoading(false); }
  };
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}25`,
        color: color,
        fontSize: "0.72rem",
      }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export function DiagnosticCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.3)] border border-[rgba(0,180,255,0.06)]">
      <h4 className="mb-2" style={{ fontSize: "0.75rem", color }}>{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5" style={{ fontSize: "0.62rem" }}>
            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-[rgba(0,212,255,0.2)]" />
            <span className="text-[rgba(224,240,255,0.45)]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnvironmentDetectionPanel() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
  const isSandbox = !isLocalhost;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMac = ua.includes("Mac");

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      toast.success("已复制到剪贴板", { style: toastStyle, duration: 1500 });
    });
  };

  const ollamaCmd = `OLLAMA_ORIGINS="${origin}" ollama serve`;
  const ollamaWildcard = `OLLAMA_ORIGINS="*" ollama serve`;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-[#00d4ff]" />
        <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>运行环境检测</h3>
        {isSandbox && (
          <span className="px-1.5 py-0.5 rounded bg-[rgba(255,170,0,0.1)] text-[#ffaa00]" style={{ fontSize: "0.55rem" }}>
            沙箱环境
          </span>
        )}
        {isLocalhost && (
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88]" style={{ fontSize: "0.55rem" }}>
            本地部署
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3" style={{ fontSize: "0.68rem" }}>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
          <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
          <div>
            <span className="text-[rgba(0,212,255,0.4)]">Origin: </span>
            <span className="text-[#e0f0ff] font-mono" style={{ fontSize: "0.62rem" }}>{origin || "(未知)"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
          <Server className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
          <div>
            <span className="text-[rgba(0,212,255,0.4)]">Hostname: </span>
            <span className="text-[#e0f0ff] font-mono" style={{ fontSize: "0.62rem" }}>{hostname || "(未知)"}</span>
          </div>
        </div>
      </div>

      {isSandbox && (
        <div className="p-3 rounded-xl bg-[rgba(255,170,0,0.05)] border border-[rgba(255,170,0,0.15)] mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffaa00]" />
            <span className="text-[#ffaa00]" style={{ fontSize: "0.72rem" }}>
              当前运行在远程沙箱中
            </span>
          </div>
          <p className="text-[rgba(224,240,255,0.5)] mb-2" style={{ fontSize: "0.65rem" }}>
            Figma Make 沙箱的 localhost 指向云端服务器, 不是你的 Mac。因此无法直接连接你本机的 Ollama / PostgreSQL / Redis。
          </p>
          <p className="text-[rgba(224,240,255,0.5)] mb-2" style={{ fontSize: "0.65rem" }}>
            将项目部署到本地 (192.168.3.x:3118) 后, 所有本地服务连接将可用。
          </p>
          <p className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.65rem" }}>
            部署后, Ollama 需要将此 Dashboard 的 origin 加入白名单:
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
              Ollama CORS 配置 (精确 origin)
            </span>
            <button
              onClick={() => copyText(ollamaCmd)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.58rem" }}
            >
              <Copy className="w-3 h-3" /> 复制
            </button>
          </div>
          <code className="text-[#00ff88] font-mono block break-all" style={{ fontSize: "0.65rem" }}>
            {ollamaCmd}
          </code>
        </div>

        <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
              Ollama CORS 配置 (允许所有 origin · 开发推荐)
            </span>
            <button
              onClick={() => copyText(ollamaWildcard)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.58rem" }}
            >
              <Copy className="w-3 h-3" /> 复制
            </button>
          </div>
          <code className="text-[#00ff88] font-mono block" style={{ fontSize: "0.65rem" }}>
            {ollamaWildcard}
          </code>
        </div>

        {isMac && (
          <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                macOS 永久设置 (launchctl)
              </span>
              <button
                onClick={() => copyText(`launchctl setenv OLLAMA_ORIGINS "*"`)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                style={{ fontSize: "0.58rem" }}
              >
                <Copy className="w-3 h-3" /> 复制
              </button>
            </div>
            <code className="text-[#00d4ff] font-mono block" style={{ fontSize: "0.65rem" }}>
              launchctl setenv OLLAMA_ORIGINS "*"
            </code>
            <p className="text-[rgba(224,240,255,0.3)] mt-1" style={{ fontSize: "0.58rem" }}>
              设置后重启 Ollama.app, CORS 白名单永久生效
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
