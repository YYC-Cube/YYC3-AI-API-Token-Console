/**
 * GatewayKeysPanel.tsx
 * ====================
 * YYC³ 网关虚拟密钥管理 · 路由: /gateway-keys
 *
 * 对接 0379-World 网关真实 API（第 2 步）：
 * - GET    /v1/admin/virtual-keys            列表（key 脱敏 hint）
 * - POST   /v1/admin/virtual-keys            创建（明文仅返回一次）
 * - PATCH  /v1/admin/virtual-keys/{id}       启停 / 预算 / TPM / 白名单
 * - DELETE /v1/admin/virtual-keys/{id}       删除
 * - GET    /v1/admin/virtual-keys/{id}/usage 用量
 * 鉴权：网关 ADMIN 密钥（api-config gatewayAdminKey，仅内网使用）
 */

import {
  AlertCircle,
  CheckCircle,
  Copy,
  Gauge,
  KeyRound,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getGatewayConfig } from "../lib/api-config";
import { GlassCard } from "./GlassCard";

interface VK {
  id: string;
  name: string;
  owner: string;
  model_whitelist: string[];
  monthly_budget_usd: number;
  spent_usd: number;
  rate_limit_tpm: number;
  status: "active" | "disabled";
  expires_at: string | null;
  created_at: string;
  key_hint: string;
}

interface CreatedPlain {
  key_id: string;
  plaintext_key?: string;
  plain_key?: string;
  key?: string;
}

const btn =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[0.62rem] transition-all border";
const btnPrimary = `${btn} border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]`;
const btnGhost = `${btn} border-[rgba(255,255,255,0.12)] text-[rgba(224,240,255,0.6)] hover:text-[#e0f0ff]`;

// 网关请求辅助 — 纯函数 (仅读 lib 配置, 无组件态闭包)
// 批9 上提模块级: 原组件内定义身份每渲染必变, 致 exhaustive-deps 警告且不可安全入 deps
const cfg = () => getGatewayConfig();
const base = () => cfg().gatewayBase.replace(/\/v1\/?$/, "");
const headers = (): Record<string, string> => ({
  "X-API-Key": cfg().gatewayAdminKey,
  "Content-Type": "application/json",
});

export function GatewayKeysPanel() {
  const [keys, setKeys] = useState<VK[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [createdPlain, setCreatedPlain] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", owner: "yanyu", budget: "5", tpm: "0", whitelist: "" });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${base()}/v1/admin/virtual-keys`, { headers: headers(), signal: AbortSignal.timeout(8000) });
      if (r.status === 401 || r.status === 403) throw new Error("鉴权失败：请在系统设置填入网关 ADMIN 密钥（sk-admin…）");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setKeys(d.keys ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // base/headers 为模块级纯函数, 非组件态依赖

  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    setBusyId("__create");
    try {
      const r = await fetch(`${base()}/v1/admin/virtual-keys`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: form.name.trim(),
          owner: form.owner.trim() || "yanyu",
          monthly_budget_usd: Number(form.budget) || 0,
          rate_limit_tpm: Number(form.tpm) || 0,
          model_whitelist: form.whitelist.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const d = (await r.json()) as CreatedPlain & { detail?: string };
      if (!r.ok) throw new Error(d.detail ?? `HTTP ${r.status}`);
      const plain = d.plaintext_key ?? d.plain_key ?? d.key ?? "";
      setCreatedPlain(plain);
      setShowCreate(false);
      setForm({ name: "", owner: "yanyu", budget: "5", tpm: "0", whitelist: "" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId("");
    }
  };

  const toggle = async (k: VK) => {
    setBusyId(k.id);
    try {
      await fetch(`${base()}/v1/admin/virtual-keys/${k.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status: k.status === "active" ? "disabled" : "active" }),
      });
      await load();
    } finally { setBusyId(""); }
  };

  const remove = async (k: VK) => {
    if (!window.confirm(`确认删除密钥「${k.name}」？此操作不可恢复。`)) return;
    setBusyId(k.id);
    try {
      await fetch(`${base()}/v1/admin/virtual-keys/${k.id}`, { method: "DELETE", headers: headers() });
      await load();
    } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-3 p-1">
      {/* 头部 */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#00d4ff]" />
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>
              网关虚拟密钥管理
              <span className="ml-2 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                0379-World · {keys.length} 把
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className={btnGhost} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> 刷新
            </button>
            <button onClick={() => setShowCreate((v) => !v)} className={btnPrimary}>
              <Plus className="w-3 h-3" /> 创建密钥
            </button>
          </div>
        </div>
        {err && (
          <p className="mt-2 flex items-center gap-1 text-[#f87171]" style={{ fontSize: "0.62rem" }}>
            <AlertCircle className="w-3 h-3" /> {err}
          </p>
        )}
      </GlassCard>

      {/* 明文一次性展示 */}
      {createdPlain && (
        <GlassCard className="p-4 border-[rgba(0,255,136,0.3)]">
          <p className="text-[#00ff88] flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
            <CheckCircle className="w-3.5 h-3.5" /> 密钥已创建 —— 明文仅此一次展示，请立即复制保存
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-[rgba(0,0,0,0.4)] text-[#e0f0ff] font-mono break-all" style={{ fontSize: "0.66rem" }}>
              {createdPlain}
            </code>
            <button
              className={btnGhost}
              onClick={() => { navigator.clipboard.writeText(createdPlain); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            >
              {copied ? <CheckCircle className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3" />} 复制
            </button>
            <button className={btnGhost} onClick={() => setCreatedPlain("")}>我已保存</button>
          </div>
        </GlassCard>
      )}

      {/* 创建表单 */}
      {showCreate && (
        <GlassCard className="p-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {([
              ["name", "名称 *", "vk-xxx"],
              ["owner", "归属人", "yanyu"],
              ["budget", "月预算 USD", "5"],
              ["tpm", "TPM 限速（0=不限）", "0"],
            ] as const).map(([k, label, ph]) => (
              <label key={k} className="block">
                <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.58rem" }}>{label}</span>
                <input
                  value={(form as Record<string, string>)[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  placeholder={ph}
                  className="w-full mt-0.5 px-2 py-1 rounded bg-[rgba(0,0,0,0.35)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] font-mono outline-none focus:border-[rgba(0,212,255,0.4)]"
                  style={{ fontSize: "0.66rem" }}
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-[rgba(0,212,255,0.5)] flex items-center gap-1" style={{ fontSize: "0.58rem" }}>
              <ListFilter className="w-3 h-3" /> 模型白名单（逗号分隔，留空=全部）
            </span>
            <input
              value={form.whitelist}
              onChange={(e) => setForm((f) => ({ ...f, whitelist: e.target.value }))}
              placeholder="glm-4-flash, qwen3:8b"
              className="w-full mt-0.5 px-2 py-1 rounded bg-[rgba(0,0,0,0.35)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] font-mono outline-none focus:border-[rgba(0,212,255,0.4)]"
              style={{ fontSize: "0.66rem" }}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setShowCreate(false)}>取消</button>
            <button className={btnPrimary} onClick={create} disabled={busyId === "__create"}>
              {busyId === "__create" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} 创建
            </button>
          </div>
        </GlassCard>
      )}

      {/* 列表 */}
      <GlassCard className="p-4">
        {loading ? (
          <p className="flex items-center gap-2 text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.66rem" }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中…
          </p>
        ) : keys.length === 0 ? (
          <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.66rem" }}>暂无密钥 —— 点右上「创建密钥」。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "0.64rem" }}>
              <thead>
                <tr className="text-left text-[rgba(0,212,255,0.45)]">
                  <th className="py-1.5 pr-2">名称</th><th className="pr-2">Key Hint</th><th className="pr-2">归属</th>
                  <th className="pr-2">预算/已用</th><th className="pr-2">TPM</th><th className="pr-2">白名单</th>
                  <th className="pr-2">状态</th><th className="pr-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-[#e0f0ff]">
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-[rgba(0,180,255,0.06)] hover:bg-[rgba(0,180,255,0.03)]">
                    <td className="py-1.5 pr-2 font-mono">{k.name}</td>
                    <td className="pr-2 font-mono text-[rgba(224,240,255,0.5)]">{k.key_hint}…</td>
                    <td className="pr-2 text-[rgba(224,240,255,0.6)]">{k.owner}</td>
                    <td className="pr-2">
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-[#ffaa00]" /> ${k.spent_usd?.toFixed(3)} / ${k.monthly_budget_usd}
                      </span>
                    </td>
                    <td className="pr-2"><span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3 text-[#aa77ff]" /> {k.rate_limit_tpm || "∞"}</span></td>
                    <td className="pr-2 text-[rgba(224,240,255,0.5)] truncate max-w-[140px]">
                      {k.model_whitelist?.length ? k.model_whitelist.join(", ") : "全部"}
                    </td>
                    <td className="pr-2">
                      <span className="px-1.5 py-0.5 rounded" style={{
                        fontSize: "0.56rem",
                        background: k.status === "active" ? "rgba(0,255,136,0.1)" : "rgba(248,113,113,0.1)",
                        color: k.status === "active" ? "#00ff88" : "#f87171",
                      }}>{k.status}</span>
                    </td>
                    <td className="pr-2 text-right whitespace-nowrap">
                      <button className={`${btnGhost} mr-1`} onClick={() => toggle(k)} disabled={busyId === k.id} title={k.status === "active" ? "停用" : "启用"}>
                        {busyId === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : k.status === "active" ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      </button>
                      <button className={`${btnGhost} text-[#f87171]`} onClick={() => remove(k)} disabled={busyId === k.id} title="删除">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
