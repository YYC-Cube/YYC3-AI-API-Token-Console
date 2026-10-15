/**
 * gateway-skills.ts
 * ==================
 * 网关定制技能注册表与执行器（双端联通 P1 / 硬约束③ §11 技能封装）
 *
 * 定位: 0379-World 后端「人类可操作项」中无专属页面的操作, 封装为技能卡——
 * ⌘K 命令面板可搜索执行, /operations 工具广场可视化执行（参数表单 → 经 /console/gw
 * 代理调用 → 结果摘要内联呈现）。浏览器零密钥（代理注入）, console 形态外执行将被
 * 401 拒绝（结果面板如实显示）。
 *
 * 新端点消费（本批 P1 落地）: /v1/logs · /v1/usage/timeline · /v1/models/summary(真实成本) ·
 * /v1/admin/alerts —— 覆盖矩阵见方案 §11。
 */

import { getGatewayConfig } from "./api-config";

export interface SkillParam {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  /** text=单行(默认) · textarea=多行 JSON/长文本 · file=文件上传（multipart） */
  type?: "text" | "textarea" | "file";
}

export interface SkillResult {
  ok: boolean;
  summary: string;
  detail?: string;
}

export interface GatewaySkill {
  id: string;
  label: string;
  desc: string;
  category: "缓存" | "路由" | "注册中心" | "账单" | "日志" | "告警" | "观测";
  params: SkillParam[];
  /** 相对网关 base（已去 /v1 尾）的路径; buildQuery 由 params 值拼入查询串 */
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: (p: Record<string, string>) => string;
  /** POST JSON body 构造器（无 file 参数时; 有 file 参数走 multipart form 全量承载） */
  body?: (p: Record<string, string>) => Record<string, unknown>;
  /** 响应 → 人读摘要（不做任何数据伪造; 失败路径由执行器统一处理） */
  summarize: (data: unknown) => string;
}

const gwBase = (): string => getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");

export const GATEWAY_SKILLS: GatewaySkill[] = [
  {
    id: "cache-stats",
    label: "缓存统计",
    desc: "网关 LLM 缓存命中率与条目数（GET /v1/cache/stats）",
    category: "缓存",
    params: [],
    method: "GET",
    path: () => "/v1/cache/stats",
    summarize: (d) => {
      const o = d as { hit_rate?: number; total_entries?: number; size?: number };
      return `命中率 ${o.hit_rate !== undefined ? `${(Number(o.hit_rate) * 100).toFixed(1)}%` : "—"} · 条目 ${o.total_entries ?? o.size ?? "—"}`;
    },
  },
  {
    id: "cache-invalidate",
    label: "缓存失效",
    desc: "按模型名清除网关 LLM 缓存（POST /v1/cache/invalidate/{model}）",
    category: "缓存",
    params: [{ key: "model", label: "模型名", placeholder: "glm-4-flash", defaultValue: "" }],
    method: "POST",
    path: (p) => `/v1/cache/invalidate/${encodeURIComponent(p.model || "")}`,
    summarize: (d) => {
      const o = d as { invalidated?: number };
      return `已失效条目 ${o.invalidated ?? "—"}`;
    },
  },
  {
    id: "upstream-probe",
    label: "上游池验活",
    desc: "手动触发全部上游健康探测（POST /v1/admin/upstreams/probe）",
    category: "路由",
    params: [],
    method: "POST",
    path: () => "/v1/admin/upstreams/probe",
    summarize: (d) => {
      const o = d as { results?: unknown[]; probed?: number };
      const n = Array.isArray(o.results) ? o.results.length : o.probed;
      return `探测完成 ${n ?? "—"} 个上游`;
    },
  },
  {
    id: "registry-audit",
    label: "注册中心审计",
    desc: "模型注册中心近期审计记录（GET /registry/v1/audit）",
    category: "注册中心",
    params: [],
    method: "GET",
    path: () => "/registry/v1/audit?limit=10",
    summarize: (d) => {
      const o = d as { entries?: unknown[]; audit?: unknown[]; total?: number };
      const n = o.entries?.length ?? o.audit?.length ?? o.total;
      return `审计记录 ${n ?? "—"} 条`;
    },
  },
  {
    id: "usage-summary",
    label: "账单汇总",
    desc: "近 N 天按模型分组的调用/Token/成本（GET /v1/admin/usage/summary）",
    category: "账单",
    params: [{ key: "days", label: "天数", placeholder: "7", defaultValue: "7" }],
    method: "GET",
    path: (p) => `/v1/admin/usage/summary?days=${encodeURIComponent(p.days || "7")}&group_by=model`,
    summarize: (d) => {
      const o = d as { total_calls?: number; total_cost_usd?: number; groups?: unknown[] };
      return `调用 ${o.total_calls ?? 0} 次 · 成本 $${Number(o.total_cost_usd ?? 0).toFixed(2)} · ${o.groups?.length ?? 0} 组`;
    },
  },
  {
    id: "usage-timeline",
    label: "用量时序",
    desc: "窗口内 calls/tokens/cost 分桶序列（GET /v1/usage/timeline · P1 新端点）",
    category: "账单",
    params: [
      { key: "minutes", label: "窗口(分)", placeholder: "1440", defaultValue: "1440" },
      { key: "step", label: "步长(分)", placeholder: "60", defaultValue: "60" },
    ],
    method: "GET",
    path: (p) =>
      `/v1/usage/timeline?minutes=${encodeURIComponent(p.minutes || "1440")}&step_minutes=${encodeURIComponent(p.step || "60")}&group_by=model`,
    summarize: (d) => {
      const o = d as { totals?: { calls?: number; tokens?: number; cost_usd?: number }; series?: Record<string, unknown[]> };
      const t = o.totals ?? {};
      return `调用 ${t.calls ?? 0} · Token ${t.tokens ?? 0} · 成本 $${Number(t.cost_usd ?? 0).toFixed(2)} · ${Object.keys(o.series ?? {}).length} 条序列`;
    },
  },
  {
    id: "logs-recent",
    label: "请求日志",
    desc: "近 N 分钟请求级日志（GET /v1/logs · P1 新端点, 含 status/延迟/成本列）",
    category: "日志",
    params: [
      { key: "minutes", label: "分钟", placeholder: "60", defaultValue: "60" },
      { key: "limit", label: "条数", placeholder: "20", defaultValue: "20" },
    ],
    method: "GET",
    path: (p) =>
      `/v1/logs?minutes=${encodeURIComponent(p.minutes || "60")}&limit=${encodeURIComponent(p.limit || "20")}`,
    summarize: (d) => {
      const o = d as { total?: number; logs?: Array<{ model?: string; status?: string; tokens?: number }> };
      const errs = (o.logs ?? []).filter((l) => l.status && l.status !== "ok").length;
      return `共 ${o.total ?? 0} 条（窗口内）· 错误 ${errs} 条`;
    },
  },
  {
    id: "alerts-critical",
    label: "告警总览",
    desc: "上游熔断 + 注册中心事件合成告警（GET /v1/admin/alerts · P1 新端点）",
    category: "告警",
    params: [{ key: "level", label: "级别", placeholder: "critical", defaultValue: "" }],
    method: "GET",
    path: (p) => `/v1/admin/alerts${p.level ? `?level=${encodeURIComponent(p.level)}` : ""}`,
    summarize: (d) => {
      const o = d as { alerts?: Array<{ level?: string }>; total?: number };
      const crit = (o.alerts ?? []).filter((a) => a.level === "critical").length;
      return `共 ${o.total ?? 0} 条 · critical ${crit} 条`;
    },
  },
  {
    id: "ocr",
    label: "图片 OCR",
    desc: "图片文本识别（POST /v1/ocr · multipart, VLM 多模态适配）",
    category: "观测",
    params: [
      { key: "file", label: "图片文件", placeholder: "选择 png/jpg", type: "file" },
      { key: "model", label: "模型(可选)", placeholder: "ocr", defaultValue: "" },
      { key: "prompt", label: "指令(可选)", placeholder: "提取全部文本", type: "textarea" },
    ],
    method: "POST",
    path: () => "/v1/ocr",
    summarize: (d) => {
      const o = d as { choices?: Array<{ message?: { content?: string } }>; text?: string };
      const text = o.choices?.[0]?.message?.content ?? o.text ?? "";
      return text ? `识别 ${text.length} 字: ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}` : "空结果";
    },
  },
  {
    id: "asr-transcribe",
    label: "语音转写",
    desc: "音频转文字（POST /v1/audio/transcriptions · multipart, Whisper 风格）",
    category: "观测",
    params: [
      { key: "file", label: "音频文件", placeholder: "选择 mp3/wav", type: "file" },
      { key: "model", label: "模型", placeholder: "whisper-1", defaultValue: "whisper-1" },
    ],
    method: "POST",
    path: () => "/v1/audio/transcriptions",
    summarize: (d) => {
      const o = d as { text?: string };
      return o.text ? `转写 ${o.text.length} 字: ${o.text.slice(0, 60)}${o.text.length > 60 ? "…" : ""}` : "空结果";
    },
  },
  {
    id: "mcp-tools",
    label: "MCP 工具发现",
    desc: "智谱+本地 MCP 工具全集（GET /v1/mcp/tools · §11 动态发现）",
    category: "注册中心",
    params: [],
    method: "GET",
    path: () => "/v1/mcp/tools",
    summarize: (d) => {
      const o = d as { tools?: unknown[]; local_tools?: unknown[]; total_count?: number };
      const n = o.total_count ?? ((o.tools?.length ?? 0) + (o.local_tools?.length ?? 0));
      return `共 ${n} 个工具（云 ${o.tools?.length ?? 0} · 本地 ${o.local_tools?.length ?? 0}）`;
    },
  },
  {
    id: "mcp-execute",
    label: "MCP 工具执行",
    desc: "按名执行 MCP 工具（POST /v1/mcp/execute · parameters 为 JSON 对象）",
    category: "注册中心",
    params: [
      { key: "tool_name", label: "工具名", placeholder: "web_search", defaultValue: "" },
      { key: "parameters", label: "参数 JSON", placeholder: "{}", defaultValue: "{}", type: "textarea" },
    ],
    method: "POST",
    path: () => "/v1/mcp/execute",
    body: (p) => {
      let parsed: unknown = {};
      try { parsed = JSON.parse(p.parameters || "{}"); } catch { parsed = {}; }
      return { tool_name: p.tool_name || "", parameters: parsed };
    },
    summarize: (d) => {
      const o = d as { success?: boolean; error?: string; tool_name?: string };
      return o.success ? `工具 ${o.tool_name ?? "?"} 执行成功` : `失败: ${o.error ?? "未知错误"}`;
    },
  },
  {
    id: "models-summary",
    label: "总量摘要",
    desc: "全站请求/Token/真实成本（GET /v1/models/summary · P1 cost 真实化）",
    category: "观测",
    params: [],
    method: "GET",
    path: () => "/v1/models/summary",
    summarize: (d) => {
      const o = d as { total_requests?: number; total_tokens?: number; cost_usd?: number };
      return `请求 ${o.total_requests ?? 0} · Token ${o.total_tokens ?? 0} · 成本 $${Number(o.cost_usd ?? 0).toFixed(2)}`;
    },
  },
];

export function getSkill(id: string): GatewaySkill | undefined {
  return GATEWAY_SKILLS.find((s) => s.id === id);
}

/** 执行技能: 经 /console/gw 代理调用网关; 失败如实回报（不伪造成功） */
export async function runGatewaySkill(
  id: string,
  paramValues: Record<string, string | File> = {},
): Promise<SkillResult> {
  const skill = getSkill(id);
  if (!skill) return { ok: false, summary: `未知技能: ${id}` };
  if (typeof fetch !== "function") return { ok: false, summary: "当前环境不可用 fetch" };
  // 路径/JSON body 只消费字符串参数（File 仅 multipart 形态承载）
  const strParams = Object.fromEntries(
    Object.entries(paramValues).map(([k, v]) => [k, v instanceof File ? "" : v]),
  );
  const url = `${gwBase()}${skill.path(strParams)}`;
  try {
    const hasFile = skill.params.some((p) => p.type === "file");
    let body: FormData | string | undefined;
    let headers: Record<string, string> | undefined;
    if (hasFile) {
      // multipart: file + 其余参数全部作 form 字段（OCR/ASR 契约形态）
      const fd = new FormData();
      for (const p of skill.params) {
        const v = paramValues[p.key];
        if (v instanceof File) { if (v.size > 0) fd.append(p.key, v); continue; }
        const s = v ?? p.defaultValue ?? "";
        if (s === "") continue;
        fd.append(p.key, s);
      }
      body = fd; // 不设 Content-Type — 浏览器自动带 boundary
    } else if (skill.body) {
      body = JSON.stringify(skill.body(strParams));
      headers = { "Content-Type": "application/json" };
    } else if (skill.method !== "GET") {
      headers = { "Content-Type": "application/json" };
    }
    const r = await fetch(url, {
      method: skill.method,
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      const hint = r.status === 401 ? "（console 形态请先登录）" : r.status === 503 ? "（GW_ADMIN_KEY 未配置）" : "";
      return { ok: false, summary: `HTTP ${r.status} ${hint}`.trim() };
    }
    const data: unknown = await r.json();
    return { ok: true, summary: skill.summarize(data), detail: JSON.stringify(data, null, 2).slice(0, 4000) };
  } catch (e) {
    return { ok: false, summary: `执行失败: ${e instanceof Error ? e.message : String(e)}` };
  }
}
