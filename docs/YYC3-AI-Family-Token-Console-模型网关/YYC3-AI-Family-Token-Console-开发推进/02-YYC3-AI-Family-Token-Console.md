# YYC3-AI-Family-Token-Console

## 第一部分 · ① 8 个域的真实业务组件

### 1.1 目录结构

```
apps/console/domains/
├── _shared/
│   ├── ApiClient.ts            # 统一 fetch 拦截器（含 X-Family 头）
│   ├── ApiError.ts             # 错误结构 + 家人化文案
│   └── types.gen.ts            # openapi-typescript 生成
├── guardian/                   # 🛡️ 智云·守护
│   ├── ConnectForm.tsx
│   ├── KeyMaskInput.tsx
│   ├── TrustBadge.tsx
│   ├── SettingsConnection.tsx
│   └── useGuardianAuth.ts
├── qianhang/                   # 🧭 言启·千行
│   ├── UpstreamGrid.tsx
│   ├── UpstreamCard.tsx
│   ├── BreakerBadge.tsx
│   ├── RoutingPathFlow.tsx
│   └── useQianhangRouting.ts
├── bole/                       # 🎯 千里·伯乐
│   ├── ModelGrid.tsx
│   ├── ModelCard.tsx
│   ├── BackendBadge.tsx
│   ├── RecommendCard.tsx
│   └── useBoleModels.ts
├── wanyu/                      # 🤔 语枢·万物
│   ├── ChatPanel.tsx
│   ├── MessageBubble.tsx
│   ├── ParamPanel.tsx
│   ├── SSEViewer.tsx           # 核心 · 七态状态机
│   ├── TraceCard.tsx
│   ├── ThoughtBubble.tsx
│   └── useWanyuChat.ts
├── zongshi/                    # 📚 格物·宗师
│   ├── KBGrid.tsx
│   ├── KBCard.tsx
│   ├── DocumentUploader.tsx
│   ├── SearchResultList.tsx
│   ├── QAPanel.tsx
│   ├── CitationFold.tsx
│   └── useZongshiRAG.ts
├── tianshu/                    # 🧠 元启·天枢
│   ├── MCPToolTree.tsx
│   ├── MCPExecutor.tsx
│   ├── ParamEditor.tsx
│   ├── JsonViewer.tsx
│   ├── OrchestrationGraph.tsx
│   └── useTianshuMCP.ts
├── xianzhi/                    # 🔮 预见·先知
│   ├── DashboardContent.tsx
│   ├── StatCard.tsx
│   ├── LatencyBar.tsx
│   ├── ErrorRateBadge.tsx
│   ├── ErrorTable.tsx
│   ├── HealthGrid.tsx
│   ├── TrendChart.tsx
│   ├── FutureChart.tsx
│   └── useXianzhiMetrics.ts
└── lingyun/                    # 🎨 创想·灵韵
    ├── CacheStatCard.tsx
    ├── CacheActions.tsx
    ├── PresetCard.tsx
    ├── CodeBlock.tsx
    ├── CacheRipple.tsx
    └── useLingyunCache.ts
```

### 1.2 共享层 `_shared/`

```typescript
// apps/console/domains/_shared/ApiClient.ts
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : domains/_shared/ApiClient
 * @Family : YYC³ AI Family (共享)
 * ============================================================
 */
import { FAMILY_REQUEST_HEADERS } from "@/lib/family/headers";

const API_BASE = "https://api.0379.world";

export interface ApiCallOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorType: "network" | "api" | "timeout" | "validation",
    message: string,
    public context?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("yyc3_api_key") ??
    localStorage.getItem("yyc3_api_key")
  );
}

export async function apiCall<T>(
  path: string,
  options: ApiCallOptions = {},
): Promise<T> {
  const { params, ...rest } = options;
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const key = getApiKey();
  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-API-Key": key } : {}),
      ...FAMILY_REQUEST_HEADERS,
      ...rest.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body?.detail ?? {};
    throw new ApiError(
      response.status,
      detail.error ?? "api",
      detail.message ?? `HTTP ${response.status}`,
      detail.context,
    );
  }

  return response.json();
}
```

```typescript
// apps/console/domains/_shared/ApiError.ts
/*
 * @Module : domains/_shared/ApiError — 家人化错误文案（v5.1 §1.6）
 */
import { ApiError } from "./ApiClient";
import { MEMBERS, type MemberKey } from "@/lib/family/members";

export function familyErrorLine(
  member: MemberKey,
  err: unknown,
): string {
  const m = MEMBERS[member];
  if (err instanceof ApiError) {
    return m.errorLine(`${err.status}`, err.message);
  }
  if (err instanceof Error) {
    return m.errorLine("unknown", err.message);
  }
  return m.errorLine("unknown", "未知异常");
}
```

### 1.3 🛡️ guardian 域（智云·守护）

```tsx
// apps/console/domains/guardian/useGuardianAuth.ts
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : domains/guardian/useGuardianAuth
 * @Family : 🛡️ 智云·守护 · 首席安全官 · 0379-0207
 * @Domain : 接入与安全域
 * ============================================================
 */
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";

export function useGuardianHealthz() {
  return useQuery({
    queryKey: qk.guardian.healthz(),
    queryFn: () => apiCall<{ status: string }>("/healthz"),
    refetchInterval: 10_000,
    retry: 1,
  });
}

export function useGuardianConnect() {
  return useMutation({
    mutationFn: async (apiKey: string) => {
      sessionStorage.setItem("yyc3_api_key", apiKey);
      return apiCall<{ status: string }>("/v1/ping");
    },
    onSuccess: (_, apiKey) => {
      // 用户勾选「记住」时持久化
      if (sessionStorage.getItem("yyc3_remember") === "true") {
        localStorage.setItem("yyc3_api_key", apiKey);
      }
    },
  });
}

export function useGuardianDisconnect() {
  return () => {
    sessionStorage.removeItem("yyc3_api_key");
    localStorage.removeItem("yyc3_api_key");
    sessionStorage.removeItem("yyc3_remember");
  };
}
```

```tsx
// apps/console/domains/guardian/ConnectForm.tsx
/*
 * @Module : domains/guardian/ConnectForm — 03_Connect
 * @Family : 🛡️ 智云·守护
 * @Domain : 接入与安全域
 * @座右铭 : 「门不开则万法不侵，钥不实则寸步难行」
 */
"use client";

import { useState } from "react";
import { FamilyBadge } from "@/components/family/FamilyBadge";
import { KeyMaskInput } from "./KeyMaskInput";
import { TrustBadge } from "./TrustBadge";
import { useGuardianConnect, useGuardianHealthz } from "./useGuardianAuth";
import { familyErrorLine } from "@/domains/_shared/ApiError";

export function ConnectForm() {
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const healthz = useGuardianHealthz();
  const connect = useGuardianConnect();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("yyc3_remember", String(remember));
    connect.mutate(key);
  };

  const ready = healthz.data?.status === "ok";
  const err = connect.error;

  return (
    <div className="mx-auto max-w-md p-8">
      <div className="flex flex-col items-center gap-4 mb-8">
        <FamilyBadge member="zhihui" size="lg" showExt showMotto />
        <h1 className="text-h2 font-semibold">YanYuCloudCube Console</h1>
        <p className="text-body-sm text-text-secondary">
          统一模型网关 · 可观测 · 可调试
        </p>
        <p className="text-caption italic text-text-tertiary">
          「尚未建立信任，请出示密钥」
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <KeyMaskInput value={key} onChange={setKey} autoFocus />
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          记住此设备
        </label>
        <button
          type="submit"
          disabled={!key || connect.isPending}
          className="w-full h-10 rounded-md bg-brand-primary text-white"
        >
          {connect.isPending ? "验证中…" : "连接"}
        </button>
      </form>

      <TrustBadge
        ready={ready}
        label={ready ? "连通 ✓" : "未连通"}
      />

      {err && (
        <p className="mt-4 text-sm text-status-danger">
          {familyErrorLine("zhihui", err)}
        </p>
      )}

      {connect.isSuccess && (
        <p className="mt-4 text-sm text-status-success">
          「信任已建立，欢迎回家」
        </p>
      )}
    </div>
  );
}
```

```tsx
// apps/console/domains/guardian/TrustBadge.tsx
/*
 * @Module : domains/guardian/TrustBadge — 预检连通徽章
 */
"use client";

import { cn } from "@/lib/utils";

export function TrustBadge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center gap-2 px-3 py-2 rounded-md text-sm",
        ready
          ? "bg-status-success/10 text-status-success"
          : "bg-status-warning/10 text-status-warning",
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", ready ? "bg-status-success animate-pulse" : "bg-status-warning")} />
      {label}
    </div>
  );
}
```

```tsx
// apps/console/domains/guardian/KeyMaskInput.tsx
/*
 * @Module : domains/guardian/KeyMaskInput — API Key 掩码输入
 */
"use client";

import { useState } from "react";

export function KeyMaskInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk-..."
        autoFocus={autoFocus}
        className="w-full h-10 px-3 pr-10 rounded-md border border-border-default bg-bg-subtle font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
      >
        {visible ? "隐藏" : "显示"}
      </button>
    </div>
  );
}
```

### 1.4 🎯 bole 域（千里·伯乐）

```tsx
// apps/console/domains/bole/useBoleModels.ts
/*
 * @Module : domains/bole/useBoleModels
 * @Family : 🎯 千里·伯乐 · 首席推荐官 · 0379-0109
 * @Domain : 模型市场域
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";
import type { ModelConfig, ModelStat } from "@/domains/_shared/types.gen";

export function useBoleModels() {
  return useQuery({
    queryKey: qk.bole.models(),
    queryFn: () => apiCall<ModelConfig[]>("/v1/models"),
    staleTime: 30_000,
  });
}

export function useBoleModelStats() {
  return useQuery({
    queryKey: qk.bole.modelStats(),
    queryFn: () => apiCall<ModelStat[]>("/v1/models/stats"),
    refetchInterval: 60_000,
  });
}

export function useBoleMergedModels() {
  const models = useBoleModels();
  const stats = useBoleModelStats();
  const statMap = new Map(stats.data?.map((s) => [s.model_id, s]));
  const merged = models.data?.map((m) => ({
    ...m,
    stat: statMap.get(m.id),
  }));
  return { data: merged, isLoading: models.isLoading || stats.isLoading };
}
```

```tsx
// apps/console/domains/bole/ModelCard.tsx
/*
 * @Module : domains/bole/ModelCard — 模型卡
 * @Family : 🎯 千里·伯乐
 * @座右铭 : 「千里马常有，而伯乐不常有」
 * @BIND   : GET /v1/models#{display_name,id,backend,max_tokens,cost_per_1k_tokens,enabled}
 *           GET /v1/models/stats#usage_count (join by model_id)
 */
"use client";

import { BackendBadge } from "./BackendBadge";
import type { ModelConfig, ModelStat } from "@/domains/_shared/types.gen";

export interface ModelCardProps {
  model: ModelConfig & { stat?: ModelStat };
  onClick?: () => void;
}

export function ModelCard({ model, onClick }: ModelCardProps) {
  const isFree = model.cost_per_1k_tokens === 0;
  return (
    <article
      onClick={onClick}
      className="p-4 rounded-lg border border-border-default bg-bg-subtle hover:border-brand-primary transition-colors cursor-pointer"
    >
      <header className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-body-md font-semibold text-text-primary">
            {model.display_name}
          </h3>
          <code className="text-caption font-mono text-text-tertiary">
            {model.id}
          </code>
        </div>
        <BackendBadge backend={model.backend} />
      </header>

      <dl className="grid grid-cols-2 gap-2 text-caption mt-3">
        <div>
          <dt className="text-text-tertiary">最大 Token</dt>
          <dd className="font-mono">{model.max_tokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">调用次数</dt>
          <dd className="font-mono">
            {(model.stat?.usage_count ?? 0).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">价格</dt>
          <dd className={isFree ? "text-status-success" : "font-mono"}>
            {isFree ? "本地免费 · 推荐自用" : `$${model.cost_per_1k_tokens}/1K`}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">状态</dt>
          <dd>
            <span
              className={
                model.enabled ? "text-status-success" : "text-text-tertiary"
              }
            >
              {model.enabled ? "● 启用" : "○ 禁用"}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
```

```tsx
// apps/console/domains/bole/BackendBadge.tsx
/*
 * @Module : domains/bole/BackendBadge
 * @Family : 🎯 千里·伯乐
 */
import type { ModelConfig } from "@/domains/_shared/types.gen";

const COLOR: Record<ModelConfig["backend"], string> = {
  local:    "bg-status-success/15 text-status-success",
  ollama:   "bg-status-success/15 text-status-success",
  zhipu:    "bg-blue-500/15 text-blue-400",
  deepseek: "bg-purple-500/15 text-purple-400",
  openai:   "bg-cyan-500/15 text-cyan-400",
  upstream: "bg-cyan-500/15 text-cyan-400",
};

export function BackendBadge({ backend }: { backend: ModelConfig["backend"] }) {
  return (
    <span className={`px-2 py-0.5 rounded text-caption ${COLOR[backend]}`}>
      {backend}
    </span>
  );
}
```

```tsx
// apps/console/domains/bole/RecommendCard.tsx
/*
 * @Module : domains/bole/RecommendCard — 情感组件
 * @Family : 🎯 千里·伯乐
 */
"use client";

import type { ModelConfig } from "@/domains/_shared/types.gen";

export function RecommendCard({
  model,
  reason,
}: {
  model: ModelConfig;
  reason: string;
}) {
  return (
    <aside className="p-3 rounded-md border border-family-bole-accent/30 bg-family-bole-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <span>🎯</span>
        <span className="text-caption text-text-tertiary">千里·伯乐 荐才</span>
      </div>
      <p className="text-body-sm">
        为当前任务推荐 <strong>{model.display_name}</strong>
        <code className="ml-2 text-caption">（{model.backend}）</code>
      </p>
      <p className="text-caption text-text-tertiary mt-1">{reason}</p>
    </aside>
  );
}
```

### 1.5 🤔 wanyu 域（语枢·万物 · SSE 核心）

```tsx
// apps/console/domains/wanyu/useWanyuChat.ts
/*
 * @Module : domains/wanyu/useWanyuChat — SSE 七态状态机（v5.0 §1.5）
 * @Family : 🤔 语枢·万物 · 首席思考者 · 0379-0107
 * @Domain : 推理对话域
 */
"use client";

import { useCallback, useRef, useState } from "react";

export type ChatPhase =
  | "idle" | "connecting" | "streaming"
  | "paused" | "error" | "degraded" | "done";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatState {
  phase: ChatPhase;
  messages: ChatMessage[];
  buffer: string;
  upstream?: string;
  degraded: boolean;
  ttftMs?: number;
  totalMs?: number;
  error?: { message: string; type: string };
}

export function useWanyuChat() {
  const [state, setState] = useState<ChatState>({
    phase: "idle",
    messages: [],
    buffer: "",
    degraded: false,
  });
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  const send = useCallback(async (body: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stream?: boolean;
  }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState((s) => ({
      ...s,
      phase: "connecting",
      buffer: "",
      degraded: false,
      error: undefined,
      ttftMs: undefined,
      totalMs: undefined,
    }));
    startedAtRef.current = performance.now();

    try {
      const apiKey =
        sessionStorage.getItem("yyc3_api_key") ??
        localStorage.getItem("yyc3_api_key") ??
        "";
      const res = await fetch(
        "https://api.0379.world/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ ...body, stream: true }),
          signal: ac.signal,
        },
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.detail?.message ?? `HTTP ${res.status}`);
      }

      const upstream = res.headers.get("X-YYC3-Upstream") ?? undefined;
      const degraded = res.headers.get("X-YYC3-Degraded") === "true";

      setState((s) => ({
        ...s,
        upstream,
        degraded,
        phase: degraded ? "degraded" : s.phase,
      }));

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let carry = "";
      let firstByte = true;
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        carry += text;
        const parts = carry.split("\n\n");
        carry = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = part.slice(6).trim();
          if (payload === "[DONE]") {
            setState((s) => ({
              ...s,
              phase: "done",
              totalMs: performance.now() - startedAtRef.current,
              messages: [
                ...s.messages,
                { role: "assistant", content: acc },
              ],
              buffer: "",
            }));
            return;
          }
          try {
            const chunk = JSON.parse(payload);
            if (chunk.error) {
              setState((s) => ({
                ...s,
                phase: "error",
                error: {
                  message: chunk.error.message,
                  type: chunk.error.type,
                },
              }));
              continue;
            }
            if (chunk._yyc3_upstream && !upstream) {
              setState((s) => ({ ...s, upstream: chunk._yyc3_upstream }));
            }
            const delta = chunk?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (firstByte) {
                firstByte = false;
                setState((s) => ({
                  ...s,
                  phase: s.degraded ? "degraded" : "streaming",
                  ttftMs: performance.now() - startedAtRef.current,
                }));
              }
              acc += delta;
              setState((s) => ({ ...s, buffer: acc }));
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setState((s) => ({ ...s, phase: "paused" }));
        return;
      }
      setState((s) => ({
        ...s,
        phase: "error",
        error: {
          message: (err as Error).message,
          type: "stream_error",
        },
      }));
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { state, send, stop };
}
```

```tsx
// apps/console/domains/wanyu/SSEViewer.tsx
/*
 * @Module : domains/wanyu/SSEViewer — 流式查看器
 * @Family : 🤔 语枢·万物
 * @座右铭 : 「语枢一启，万物皆明」
 */
"use client";

import { ThoughtBubble } from "./ThoughtBubble";
import { MessageBubble } from "./MessageBubble";
import type { ChatState } from "./useWanyuChat";

export function SSEViewer({ state }: { state: ChatState }) {
  const streaming = state.phase === "streaming" || state.phase === "degraded";
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {state.messages.map((m, i) => (
        <MessageBubble key={i} message={m} />
      ))}
      {state.buffer && (
        <MessageBubble
          message={{ role: "assistant", content: state.buffer }}
          streaming={streaming}
        />
      )}
      {state.phase === "connecting" && <ThoughtBubble />}
      {state.phase === "degraded" && state.upstream && (
        <div className="text-caption text-status-warning">
          「原路径受阻，改由 {state.upstream} 继续思考」
        </div>
      )}
      {state.phase === "done" && (
        <div className="text-caption text-text-tertiary">
          「思考完毕 · {state.buffer.length >> 2} tokens · {Math.round(state.totalMs ?? 0)}ms」
        </div>
      )}
      {state.phase === "error" && state.error && (
        <div className="p-3 rounded-md bg-status-danger/10 text-status-danger text-sm">
          思绪中断：{state.error.type} · {state.error.message}
        </div>
      )}
    </div>
  );
}
```

```tsx
// apps/console/domains/wanyu/MessageBubble.tsx
/*
 * @Module : domains/wanyu/MessageBubble
 */
"use client";

import type { ChatMessage } from "./useWanyuChat";

export function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-lg text-body-sm ${
          isUser
            ? "bg-brand-primary text-white"
            : "bg-bg-elevated text-text-primary"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-text-primary animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
```

```tsx
// apps/console/domains/wanyu/ThoughtBubble.tsx
/*
 * @Module : domains/wanyu/ThoughtBubble — 情感组件
 * @Family : 🤔 语枢·万物
 */
export function ThoughtBubble() {
  return (
    <div className="flex items-center gap-2 text-caption text-text-tertiary">
      <span className="animate-pulse">💭</span>
      <span>正在思考…</span>
      <span className="flex gap-1">
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}
```

```tsx
// apps/console/domains/wanyu/TraceCard.tsx
/*
 * @Module : domains/wanyu/TraceCard — 降级链路追溯
 * @Family : 🧭 言启·千行 + 🤔 语枢·万物（协同）
 */
"use client";

export function TraceCard({
  primary,
  degraded,
  fallback,
  latencyMs,
}: {
  primary: string;
  degraded: boolean;
  fallback?: string;
  latencyMs?: number;
}) {
  return (
    <div className="p-3 rounded-md border border-border-default bg-bg-subtle">
      <div className="text-caption text-text-tertiary mb-2">Upstream Trace</div>
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className={degraded ? "text-status-danger" : "text-status-success"}>
          {primary} {degraded ? "✗" : "✓"}
        </span>
        {degraded && fallback && (
          <>
            <span className="text-text-tertiary">→</span>
            <span className="text-status-warning">{fallback} ✓</span>
          </>
        )}
        {latencyMs != null && (
          <span className="ml-auto text-caption text-text-tertiary">
            served in {Math.round(latencyMs)}ms
          </span>
        )}
      </div>
    </div>
  );
}
```

### 1.6 🔮 xianzhi 域（预见·先知 · Dashboard 核心）

```tsx
// apps/console/domains/xianzhi/useXianzhiMetrics.ts
/*
 * @Module : domains/xianzhi/useXianzhiMetrics
 * @Family : 🔮 预见·先知 · 首席预言家 · 0379-0108
 * @Domain : 观测与预测域
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";
import type {
  UsageSummary,
  ModelStat,
  ErrorRecord,
  HealthResponse,
} from "@/domains/_shared/types.gen";

export function useXianzhiSummary() {
  return useQuery({
    queryKey: qk.xianzhi.modelSummary(),
    queryFn: () => apiCall<UsageSummary>("/v1/models/summary"),
    refetchInterval: 60_000,
  });
}

export function useXianzhiStats() {
  return useQuery({
    queryKey: qk.bole.modelStats(),
    queryFn: () => apiCall<ModelStat[]>("/v1/models/stats"),
    refetchInterval: 60_000,
  });
}

export function useXianzhiErrors() {
  return useQuery({
    queryKey: qk.xianzhi.modelErrors(),
    queryFn: () => apiCall<ErrorRecord[]>("/v1/models/errors"),
    refetchInterval: 30_000,
  });
}

export function useXianzhiHealth() {
  return useQuery({
    queryKey: qk.xianzhi.health(),
    queryFn: () => apiCall<HealthResponse>("/health"),
    refetchInterval: 30_000,
  });
}

// 聚合
export function useXianzhiAggregate() {
  const summary = useXianzhiSummary();
  const stats = useXianzhiStats();
  const health = useXianzhiHealth();
  const errors = useXianzhiErrors();

  const avgLatency = stats.data?.length
    ? stats.data.reduce((a, s) => a + s.avg_latency_ms, 0) / stats.data.length
    : 0;
  const avgErrorRate = stats.data?.length
    ? stats.data.reduce((a, s) => a + s.error_rate, 0) / stats.data.length
    : 0;

  return {
    totalRequests: summary.data?.total_requests ?? 0,
    totalTokens: summary.data?.total_tokens ?? 0,
    costUsd: summary.data?.cost_usd ?? 0,
    avgLatencyMs: avgLatency,
    errorRate: avgErrorRate,
    cacheHitRate: health.data?.metrics.cache_hit_rate ?? 0,
    services: health.data?.services,
    system: health.data?.system,
    topErrors: errors.data?.slice(0, 5) ?? [],
    isLoading:
      summary.isLoading || stats.isLoading || health.isLoading || errors.isLoading,
  };
}
```

```tsx
// apps/console/domains/xianzhi/StatCard.tsx
/*
 * @Module : domains/xianzhi/StatCard
 * @Family : 🔮 预见·先知
 * @BIND   : GET /v1/models/summary#{total_requests,total_tokens,cost_usd}
 */
"use client";

export interface StatCardProps {
  label: string;
  value: string | number;
  note?: string;
  tone?: "default" | "success" | "warning" | "danger";
  blBadge?: string;
}

const TONE = {
  default: "text-text-primary",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
} as const;

export function StatCard({
  label,
  value,
  note,
  tone = "default",
  blBadge,
}: StatCardProps) {
  return (
    <div className="p-4 rounded-lg border border-border-default bg-bg-subtle">
      <div className="text-caption text-text-tertiary mb-1">{label}</div>
      <div className={`text-h2 font-semibold ${TONE[tone]}`}>{value}</div>
      {note && (
        <div className="text-caption text-text-tertiary mt-1 italic">
          {note}
        </div>
      )}
      {blBadge && (
        <span className="inline-block mt-2 px-1.5 py-0.5 text-caption rounded bg-status-warning/20 text-status-warning">
          {blBadge}
        </span>
      )}
    </div>
  );
}
```

```tsx
// apps/console/domains/xianzhi/DashboardContent.tsx
/*
 * @Module : domains/xianzhi/DashboardContent — 04_Dashboard
 * @Family : 🔮 预见·先知
 */
"use client";

import { StatCard } from "./StatCard";
import { LatencyBar } from "./LatencyBar";
import { ErrorRateBadge } from "./ErrorRateBadge";
import { ErrorTable } from "./ErrorTable";
import { HealthGrid } from "./HealthGrid";
import { useXianzhiAggregate } from "./useXianzhiMetrics";

export function DashboardContent() {
  const d = useXianzhiAggregate();

  return (
    <div className="p-6 space-y-6">
      {/* StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="总请求"
          value={d.totalRequests.toLocaleString()}
          note="累计感知到的召唤"
        />
        <StatCard
          label="总 Token"
          value={d.totalTokens.toLocaleString()}
          note="累计交换的思想"
        />
        <StatCard
          label="总成本"
          value={`$${d.costUsd.toFixed(2)}`}
          note="预言家尚未学会计价"
          blBadge={d.costUsd === 0 ? "BL-02" : undefined}
        />
        <StatCard
          label="平均延迟"
          value={`${Math.round(d.avgLatencyMs)}ms`}
          note="思考的速度"
          tone={
            d.avgLatencyMs <= 100
              ? "success"
              : d.avgLatencyMs <= 500
              ? "warning"
              : "danger"
          }
        />
        <StatCard
          label="错误率"
          value={`${(d.errorRate * 100).toFixed(2)}%`}
          note="罕见的迷途"
          tone={d.errorRate < 0.01 ? "success" : d.errorRate < 0.05 ? "warning" : "danger"}
        />
        <StatCard
          label="缓存命中率"
          value={`${(d.cacheHitRate * 100).toFixed(1)}%`}
          note="灵感的复现"
        />
      </div>

      {/* Health + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {d.services && <HealthGrid services={d.services} />}
        <ErrorTable errors={d.topErrors} />
      </div>
    </div>
  );
}
```

```tsx
// apps/console/domains/xianzhi/HealthGrid.tsx
/*
 * @Module : domains/xianzhi/HealthGrid
 * @Family : 🔮 预见·先知
 * @BIND   : GET /health#services
 */
"use client";

import type { HealthResponse } from "@/domains/_shared/types.gen";

const COLOR = {
  healthy: "bg-status-success",
  unreachable: "bg-status-danger",
  configured: "bg-text-tertiary",
} as const;

const LABEL = {
  healthy: "健康",
  unreachable: "不可达",
  configured: "已配置",
} as const;

export function HealthGrid({ services }: { services: HealthResponse["services"] }) {
  return (
    <div className="p-4 rounded-lg border border-border-default bg-bg-subtle">
      <h3 className="text-body-md font-semibold mb-3">模型健康</h3>
      <ul className="space-y-2">
        {Object.entries(services).map(([name, svc]) => (
          <li key={name} className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${COLOR[svc.status]}`} />
            <code className="font-mono">{name}</code>
            <span className="ml-auto text-caption text-text-tertiary">
              {LABEL[svc.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// apps/console/domains/xianzhi/ErrorTable.tsx
/*
 * @Module : domains/xianzhi/ErrorTable
 * @Family : 🔮 预见·先知
 */
"use client";

import type { ErrorRecord } from "@/domains/_shared/types.gen";

const ERROR_COLOR = {
  timeout:    "text-status-warning",
  validation: "text-status-danger",
  quota:      "text-yellow-400",
  internal:   "text-text-tertiary",
} as const;

export function ErrorTable({ errors }: { errors: ErrorRecord[] }) {
  if (!errors.length) {
    return (
      <div className="p-4 rounded-lg border border-border-default bg-bg-subtle">
        <h3 className="text-body-md font-semibold mb-3">最近错误</h3>
        <p className="text-caption text-text-tertiary italic">
          「尚无历史数据，预言需要时间的积累」
        </p>
      </div>
    );
  }
  return (
    <div className="p-4 rounded-lg border border-border-default bg-bg-subtle">
      <h3 className="text-body-md font-semibold mb-3">最近错误</h3>
      <ul className="space-y-2">
        {errors.map((e) => (
          <li key={e.id} className="text-caption flex items-start gap-2">
            <span className={`font-mono ${ERROR_COLOR[e.error_type]}`}>
              [{e.error_type}]
            </span>
            <code className="text-text-secondary">{e.model_id}</code>
            <span className="text-text-primary flex-1 truncate">
              {e.message.slice(0, 60)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-tertiary italic mt-3">
        「异常已现 · 预言家已记录」
      </p>
    </div>
  );
}
```

```tsx
// apps/console/domains/xianzhi/LatencyBar.tsx
/*
 * @Module : domains/xianzhi/LatencyBar
 * @Family : 🔮 预见·先知
 */
export function LatencyBar({ ms }: { ms: number }) {
  const tone =
    ms <= 100 ? "bg-status-success" : ms <= 500 ? "bg-status-warning" : "bg-status-danger";
  const pct = Math.min(100, (ms / 1000) * 100);
  return (
    <div className="w-full h-1.5 rounded bg-bg-elevated overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
```

```tsx
// apps/console/domains/xianzhi/ErrorRateBadge.tsx
/*
 * @Module : domains/xianzhi/ErrorRateBadge
 * @Family : 🔮 预见·先知
 */
export function ErrorRateBadge({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(2);
  const tone =
    rate < 0.01 ? "text-status-success" : rate < 0.05 ? "text-status-warning" : "text-status-danger";
  return <span className={`font-mono text-caption ${tone}`}>{pct}%</span>;
}
```

### 1.7 🧭 qianhang 域（言启·千行）

```tsx
// apps/console/domains/qianhang/useQianhangRouting.ts
/*
 * @Module : domains/qianhang/useQianhangRouting
 * @Family : 🧭 言启·千行 · 首席导航员 · 0379-0106
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";

export interface UpstreamNode {
  name: string;
  base_url: string;
  models: string[];
  capability: string[];
  priority: number;
  weight: number;
  dynamic_weight: number;
  breaker_state: "closed" | "open" | "half_open";
  ewma_latency: number;
  ewma_error_rate: number;
  total_requests: number;
  total_failures: number;
  last_error?: string;
  load: number;
  capacity: number;
}

export function useQianhangRouterStats() {
  return useQuery({
    queryKey: qk.qianhang.routerStats(),
    queryFn: () => apiCall<{ nodes: UpstreamNode[] }>("/v1/router/stats"),
    refetchInterval: 15_000,
  });
}

export function useQianhangRouterHealth() {
  return useQuery({
    queryKey: qk.qianhang.routerHealth(),
    queryFn: () => apiCall<{ nodes: UpstreamNode[] }>("/v1/router/health"),
    enabled: false,
  });
}
```

```tsx
// apps/console/domains/qianhang/UpstreamCard.tsx
/*
 * @Module : domains/qianhang/UpstreamCard
 * @Family : 🧭 言启·千行
 * @座右铭 : 「一言既出，千行可至」
 */
"use client";

import { BreakerBadge } from "./BreakerBadge";
import type { UpstreamNode } from "./useQianhangRouting";

export function UpstreamCard({ node }: { node: UpstreamNode }) {
  const loadPct = node.capacity ? (node.load / node.capacity) * 100 : 0;
  return (
    <article className="p-4 rounded-lg border border-border-default bg-bg-subtle space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-body-md">{node.name}</h3>
          <code className="text-caption text-text-tertiary">{node.base_url}</code>
        </div>
        <BreakerBadge state={node.breaker_state} />
      </header>

      <dl className="grid grid-cols-2 gap-2 text-caption">
        <div>
          <dt className="text-text-tertiary">动态权重</dt>
          <dd className="font-mono">{node.dynamic_weight.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">EWMA 延迟</dt>
          <dd className="font-mono">{Math.round(node.ewma_latency)}ms</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">错误率</dt>
          <dd className="font-mono">{(node.ewma_error_rate * 100).toFixed(2)}%</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">负载</dt>
          <dd className="font-mono">
            {node.load}/{node.capacity}
          </dd>
        </div>
      </dl>

      <div className="w-full h-1 rounded bg-bg-elevated overflow-hidden">
        <div
          className="h-full bg-brand-primary"
          style={{ width: `${loadPct}%` }}
        />
      </div>

      {node.last_error && (
        <p className="text-caption text-status-danger truncate" title={node.last_error}>
          {node.last_error}
        </p>
      )}
    </article>
  );
}
```

```tsx
// apps/console/domains/qianhang/BreakerBadge.tsx
/*
 * @Module : domains/qianhang/BreakerBadge
 * @Family : 🧭 言启·千行
 */
"use client";

const STYLE = {
  closed:    "bg-status-success/15 text-status-success",
  open:      "bg-status-danger/15 text-status-danger",
  half_open: "bg-status-warning/15 text-status-warning",
} as const;

const TEXT = {
  closed: "闭合",
  open: "熔断",
  half_open: "半开",
} as const;

export function BreakerBadge({
  state,
}: {
  state: "closed" | "open" | "half_open";
}) {
  return (
    <span className={`px-2 py-0.5 rounded text-caption ${STYLE[state]}`}>
      {TEXT[state]}
    </span>
  );
}
```

### 1.8 📚 zongshi 域（格物·宗师）

```tsx
// apps/console/domains/zongshi/useZongshiRAG.ts
/*
 * @Module : domains/zongshi/useZongshiRAG
 * @Family : 📚 格物·宗师 · 首席质量官 · 0379-0208
 */
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface DocumentInfo {
  id: string;
  kb_id: string;
  name: string;
  status: "pending" | "parsing" | "ready" | "error";
  chunk_count: number;
}

export interface SearchHit {
  document_id: string;
  chunk_id: string;
  content: string;
  score: number;
}

export function useZongshiKBs() {
  return useQuery({
    queryKey: qk.zongshi.knowledgeBases(),
    queryFn: () => apiCall<KnowledgeBase[]>("/v1/knowledge-bases"),
  });
}

export function useZongshiDocuments(kbId?: string) {
  return useQuery({
    queryKey: qk.zongshi.documents(kbId),
    queryFn: () =>
      apiCall<DocumentInfo[]>("/v1/documents", { params: { kb_id: kbId } }),
    enabled: !!kbId,
  });
}

export function useZongshiSearch() {
  return useMutation({
    mutationFn: (body: { query: string; kb_ids: string[]; top_k?: number }) =>
      apiCall<SearchHit[]>("/v1/rag/search", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useZongshiAsk() {
  return useMutation({
    mutationFn: (body: { query: string; kb_ids: string[] }) =>
      apiCall<{ answer: string; citations: SearchHit[] }>("/v1/rag/ask", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
```

```tsx
// apps/console/domains/zongshi/QAPanel.tsx
/*
 * @Module : domains/zongshi/QAPanel
 * @Family : 📚 格物·宗师
 * @座右铭 : 「格物致知，诚意正心」
 */
"use client";

import { useState } from "react";
import { useZongshiAsk } from "./useZongshiRAG";
import { CitationFold } from "./CitationFold";

export function QAPanel({ kbIds }: { kbIds: string[] }) {
  const [query, setQuery] = useState("");
  const ask = useZongshiAsk();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="向宗师提问…"
          className="flex-1 h-10 px-3 rounded-md border border-border-default bg-bg-subtle"
        />
        <button
          onClick={() => ask.mutate({ query, kb_ids: kbIds })}
          disabled={!query || ask.isPending}
          className="h-10 px-4 rounded-md bg-brand-primary text-white"
        >
          {ask.isPending ? "格物中…" : "提问"}
        </button>
      </div>

      {ask.data && (
        <div className="p-4 rounded-lg border border-border-default bg-bg-subtle">
          <p className="text-body-sm whitespace-pre-wrap">{ask.data.answer}</p>
          <p className="text-caption text-text-tertiary italic mt-3">
            「依据 {ask.data.citations.length} 处引用，宗师的回答如下」
          </p>
          <CitationFold citations={ask.data.citations} />
        </div>
      )}
    </div>
  );
}
```

```tsx
// apps/console/domains/zongshi/CitationFold.tsx
/*
 * @Module : domains/zongshi/CitationFold — 情感组件
 * @Family : 📚 格物·宗师
 */
"use client";

import { useState } from "react";
import type { SearchHit } from "./useZongshiRAG";

export function CitationFold({ citations }: { citations: SearchHit[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-caption text-brand-primary hover:underline"
      >
        {open ? "收起引用" : `展开 ${citations.length} 处引用`}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {citations.map((c) => (
            <li
              key={c.chunk_id}
              className="p-2 rounded border border-border-default bg-bg-elevated text-caption"
            >
              <div className="flex justify-between text-text-tertiary mb-1">
                <code>{c.document_id}</code>
                <span>score {c.score.toFixed(3)}</span>
              </div>
              <p>{c.content.slice(0, 200)}…</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 1.9 🧠 tianshu 域（元启·天枢）

```tsx
// apps/console/domains/tianshu/useTianshuMCP.ts
/*
 * @Module : domains/tianshu/useTianshuMCP
 * @Family : 🧠 元启·天枢 · 总指挥 · 0379-0206
 */
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";

export interface MCPTool {
  name: string;
  category: "local" | "web" | "github" | "filesystem" | "docker" | "database";
  description?: string;
  schema?: Record<string, unknown>;
}

export function useTianshuMCPTools() {
  return useQuery({
    queryKey: qk.tianshu.mcpTools(),
    queryFn: () => apiCall<MCPTool[]>("/v1/mcp/tools"),
  });
}

export function useTianshuMCPExecute() {
  return useMutation({
    mutationFn: (body: { tool: string; params: Record<string, unknown> }) =>
      apiCall<{ result: unknown; latency_ms: number; status: string }>(
        "/v1/mcp/execute",
        { method: "POST", body: JSON.stringify(body) },
      ),
  });
}
```

```tsx
// apps/console/domains/tianshu/MCPExecutor.tsx
/*
 * @Module : domains/tianshu/MCPExecutor
 * @Family : 🧠 元启·天枢
 * @座右铭 : 「天枢运于中，众星拱其北」
 */
"use client";

import { useState } from "react";
import { JsonViewer } from "./JsonViewer";
import { ParamEditor } from "./ParamEditor";
import { useTianshuMCPExecute } from "./useTianshuMCP";
import type { MCPTool } from "./useTianshuMCP";

export function MCPExecutor({ tool }: { tool: MCPTool | null }) {
  const [params, setParams] = useState<Record<string, unknown>>({});
  const exec = useTianshuMCPExecute();

  if (!tool) {
    return (
      <div className="p-8 text-center text-text-tertiary">
        「待命中，请选择一件工具」
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h3 className="text-body-md font-semibold">{tool.name}</h3>
        <p className="text-caption text-text-tertiary">{tool.description}</p>
      </header>

      <ParamEditor schema={tool.schema} value={params} onChange={setParams} />

      <button
        onClick={() => exec.mutate({ tool: tool.name, params })}
        disabled={exec.isPending}
        className="h-10 px-4 rounded-md bg-brand-primary text-white"
      >
        {exec.isPending ? "执行中…" : "调用"}
      </button>

      <p className="text-caption text-text-tertiary italic">
        {exec.isPending && `「调用 ${tool.name} · 参数已核 · 开始执行」`}
        {exec.data &&
          `「${tool.name} 执行完毕 · ${exec.data.latency_ms}ms · ${exec.data.status}」`}
      </p>

      {exec.data && <JsonViewer data={exec.data.result} />}
      {exec.error && (
        <p className="text-status-danger text-sm">
          号令受阻 · {(exec.error as Error).message}
        </p>
      )}
    </div>
  );
}
```

```tsx
// apps/console/domains/tianshu/JsonViewer.tsx
/*
 * @Module : domains/tianshu/JsonViewer
 */
"use client";

export function JsonViewer({ data }: { data: unknown }) {
  return (
    <pre className="p-3 rounded-md bg-bg-elevated overflow-auto text-caption font-mono max-h-96">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
```

### 1.10 🎨 lingyun 域（创想·灵韵）

```tsx
// apps/console/domains/lingyun/useLingyunCache.ts
/*
 * @Module : domains/lingyun/useLingyunCache
 * @Family : 🎨 创想·灵韵 · 首席创意官 · 0379-0209
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/domains/_shared/ApiClient";
import { qk } from "@/lib/queryKeys";

export interface CacheStats {
  hit_rate: number;
  entries: number;
  ttl_seconds: number;
}

export function useLingyunCacheStats() {
  return useQuery({
    queryKey: qk.lingyun.cacheStats(),
    queryFn: () => apiCall<CacheStats>("/v1/cache/stats"),
    refetchInterval: 60_000,
  });
}

export function useLingyunInvalidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (model: string) =>
      apiCall(`/v1/cache/invalidate/${model}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lingyun.cacheStats() }),
  });
}

export function useLingyunClearAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiCall("/v1/cache/all", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lingyun.cacheStats() }),
  });
}
```

```tsx
// apps/console/domains/lingyun/CacheRipple.tsx
/*
 * @Module : domains/lingyun/CacheRipple — 情感组件
 * @Family : 🎨 创想·灵韵
 */
"use client";

import { useEffect, useState } from "react";

export function CacheRipple({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger <= 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="w-8 h-8 rounded-full bg-family-lingyun-accent/40 animate-ping" />
    </span>
  );
}
```

### 1.11 `lib/queryKeys.ts`（修正 §3.5 D-01）

```typescript
// apps/console/lib/queryKeys.ts
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : lib/queryKeys — TanStack Query Key 单一真源
 * ============================================================
 */
export const qk = {
  guardian: {
    healthz: () => ["guardian", "healthz"] as const,
    ping:    () => ["guardian", "ping"] as const,
    keys:    () => ["guardian", "keys"] as const,
  },
  qianhang: {
    routerStats:  () => ["qianhang", "router", "stats"] as const,
    routerHealth: () => ["qianhang", "router", "health"] as const,
  },
  bole: {
    models:     () => ["bole", "models"] as const,
    modelStats: () => ["bole", "models", "stats"] as const,
    modelType:  (id: string) => ["bole", "models", id, "type"] as const,
  },
  wanyu: {
    chat: (id: string) => ["wanyu", "chat", id] as const,
  },
  zongshi: {
    knowledgeBases:     () => ["zongshi", "kb"] as const,
    knowledgeBaseStats: (id: string) => ["zongshi", "kb", id, "stats"] as const,
    documents:          (kbId?: string) => ["zongshi", "docs", kbId] as const,
  },
  tianshu: {
    mcpTools:  () => ["tianshu", "mcp", "tools"] as const,
    mcpSearch: (q: string) => ["tianshu", "mcp", "search", q] as const,
  },
  xianzhi: {
    health:       () => ["xianzhi", "health"] as const,
    versions:     () => ["xianzhi", "versions"] as const,
    modelSummary: () => ["xianzhi", "models", "summary"] as const,
    modelErrors:  (f?: ErrorFilter) => ["xianzhi", "models", "errors", f] as const,
    // 修正 D-01：移除 cacheStats（归属 lingyun）
  },
  lingyun: {
    cacheStats: () => ["lingyun", "cache", "stats"] as const,
    cacheInfo:  () => ["lingyun", "cache", "info"] as const,
  },
} as const;

export interface ErrorFilter {
  error_type?: string;
  model_id?: string;
  from?: string;
  to?: string;
}
```

---

## 第二部分 · ② MSW Mock 契约

### 2.1 目录

```
apps/console/mocks/
├── handlers/
│   ├── index.ts
│   ├── guardian.ts
│   ├── qianhang.ts
│   ├── bole.ts
│   ├── wanyu.ts        # SSE 用 fetch 模拟
│   ├── zongshi.ts
│   ├── tianshu.ts
│   ├── xianzhi.ts
│   └── lingyun.ts
├── fixtures/
│   ├── models.ts
│   ├── stats.ts
│   ├── errors.ts
│   ├── health.ts
│   ├── router.ts
│   └── kb.ts
├── browser.ts
└── server.ts
```

### 2.2 `mocks/fixtures/models.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : mocks/fixtures/models — ModelConfig 契约夹具
 * ============================================================
 */
import type { ModelConfig } from "@/domains/_shared/types.gen";

export const MODELS: ModelConfig[] = [
  {
    id: "gpt-4o",
    display_name: "GPT-4o",
    backend: "openai",
    version: "2024-08-06",
    enabled: true,
    max_tokens: 128000,
    temperature: 0.7,
    top_p: 0.9,
    cost_per_1k_tokens: 0.005,
  },
  {
    id: "claude-3-5-sonnet",
    display_name: "Claude 3.5 Sonnet",
    backend: "upstream",
    enabled: true,
    max_tokens: 200000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.003,
  },
  {
    id: "zhipu-glm-4",
    display_name: "智谱 GLM-4",
    backend: "zhipu",
    enabled: true,
    max_tokens: 128000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.001,
  },
  {
    id: "deepseek-v3",
    display_name: "DeepSeek V3",
    backend: "deepseek",
    enabled: true,
    max_tokens: 64000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.0005,
  },
  {
    id: "qwen2.5:7b",
    display_name: "Qwen2.5 7B (本地)",
    backend: "ollama",
    enabled: true,
    max_tokens: 32768,
    temperature: 0.7,
    cost_per_1k_tokens: 0,
  },
  {
    id: "llama3.2:3b",
    display_name: "Llama 3.2 3B (本地)",
    backend: "local",
    enabled: false,
    max_tokens: 8192,
    temperature: 0.7,
    cost_per_1k_tokens: 0,
  },
];
```

### 2.3 `mocks/fixtures/health.ts`

```typescript
/*
 * @Module : mocks/fixtures/health
 */
import type { HealthResponse } from "@/domains/_shared/types.gen";

export const HEALTH: HealthResponse = {
  status: "healthy",
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  uptime_seconds: 86400 * 12,
  services: {
    ollama:     { status: "healthy" },
    zhipu:      { status: "healthy" },
    redis:      { status: "healthy" },
    postgresql: { status: "healthy" },
  },
  system: {
    cpu_percent: 23.5,
    memory_percent: 61.2,
    disk_percent: 45.8,
  },
  metrics: {
    active_requests: 3,
    total_requests: 12847,
    cache_hit_rate: 0.342,
  },
};
```

### 2.4 `mocks/handlers/bole.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : mocks/handlers/bole — 千里·伯乐域
 * ============================================================
 */
import { http, HttpResponse } from "msw";
import { MODELS } from "../fixtures/models";

const BASE = "https://api.0379.world";

export const boleHandlers = [
  http.get(`${BASE}/v1/models`, () => HttpResponse.json(MODELS)),

  http.get(`${BASE}/v1/models/stats`, () =>
    HttpResponse.json(
      MODELS.map((m, i) => ({
        model_id: m.id,
        usage_count: [8421, 3210, 1102, 842, 128, 12][i] ?? 0,
        avg_latency_ms: [420, 380, 290, 650, 45, 85][i] ?? 0,
        error_rate: [0.002, 0.005, 0.001, 0.012, 0.0, 0.003][i] ?? 0,
        total_tokens: [1248000, 512000, 245000, 187000, 12000, 3400][i] ?? 0,
      })),
    ),
  ),

  http.get(`${BASE}/v1/model/type`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    return HttpResponse.json({ id, type: "chat" });
  }),
];
```

### 2.5 `mocks/handlers/xianzhi.ts`

```typescript
/*
 * @Module : mocks/handlers/xianzhi — 预见·先知域
 */
import { http, HttpResponse } from "msw";
import { HEALTH } from "../fixtures/health";

const BASE = "https://api.0379.world";

export const xianzhiHandlers = [
  http.get(`${BASE}/v1/models/summary`, () =>
    HttpResponse.json({
      total_requests: 12847,
      total_tokens: 2207400,
      cost_usd: 0, // ⚠️ 与后端一致：BL-02 未完成前恒为 0
    }),
  ),

  http.get(`${BASE}/v1/models/errors`, () =>
    HttpResponse.json([
      {
        id: "err-001",
        timestamp: new Date(Date.now() - 120_000).toISOString(),
        model_id: "gpt-4o",
        error_type: "timeout",
        message: "Upstream timeout after 30000ms",
      },
      {
        id: "err-002",
        timestamp: new Date(Date.now() - 300_000).toISOString(),
        model_id: "claude-3-5-sonnet",
        error_type: "validation",
        message: "Invalid parameter: temperature must be between 0 and 2",
      },
      {
        id: "err-003",
        timestamp: new Date(Date.now() - 600_000).toISOString(),
        model_id: "zhipu-glm-4",
        error_type: "quota",
        message: "Daily quota exceeded",
      },
    ]),
  ),

  http.get(`${BASE}/health`, () => HttpResponse.json(HEALTH)),
  http.get(`${BASE}/healthz`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/v1/ping`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/v1/versions`, () =>
    HttpResponse.json({ version: "2.0.0", family: "YYC³ AI Family" }),
  ),
];
```

### 2.6 `mocks/handlers/qianhang.ts`

```typescript
/*
 * @Module : mocks/handlers/qianhang — 言启·千行域
 */
import { http, HttpResponse } from "msw";

const BASE = "https://api.0379.world";

const NODES = [
  {
    name: "openai-primary",
    base_url: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini"],
    capability: ["chat", "vision"],
    priority: 1,
    weight: 100,
    dynamic_weight: 85.3,
    breaker_state: "closed" as const,
    ewma_latency: 420,
    ewma_error_rate: 0.002,
    total_requests: 8421,
    total_failures: 17,
    load: 12,
    capacity: 100,
  },
  {
    name: "anthropic-fallback",
    base_url: "https://api.anthropic.com/v1",
    models: ["claude-3-5-sonnet"],
    capability: ["chat"],
    priority: 2,
    weight: 80,
    dynamic_weight: 62.1,
    breaker_state: "half_open" as const,
    ewma_latency: 380,
    ewma_error_rate: 0.005,
    total_requests: 3210,
    total_failures: 16,
    last_error: "Connection reset by peer (recovered)",
    load: 5,
    capacity: 50,
  },
  {
    name: "zhipu-backup",
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    models: ["zhipu-glm-4"],
    capability: ["chat"],
    priority: 3,
    weight: 50,
    dynamic_weight: 0,
    breaker_state: "open" as const,
    ewma_latency: 1200,
    ewma_error_rate: 0.45,
    total_requests: 1102,
    total_failures: 496,
    last_error: "Upstream 503 Service Unavailable",
    load: 0,
    capacity: 30,
  },
];

export const qianhangHandlers = [
  http.get(`${BASE}/v1/router/stats`, () =>
    HttpResponse.json({ nodes: NODES }),
  ),
  http.get(`${BASE}/v1/router/health`, () =>
    HttpResponse.json({ nodes: NODES }),
  ),
];
```

### 2.7 `mocks/handlers/wanyu.ts`（SSE 关键）

```typescript
/*
 * @Module : mocks/handlers/wanyu — 语枢·万物域（含 SSE 模拟）
 * ============================================================
 * 严格遵循 v5.0 §1.3 SSE 协议：
 *   data: {json}\n\n 分隔
 *   data: [DONE]\n\n 结束
 *   首 chunk 含 _yyc3_upstream
 *   响应头 X-YYC3-Upstream / X-YYC3-Degraded
 */
import { http } from "msw";

const BASE = "https://api.0379.world";

const SAMPLE_REPLY =
  "语枢一启，万物皆明。这是一段模拟的流式回复，用于开发与测试阶段。";

export const wanyuHandlers = [
  http.post(`${BASE}/v1/chat/completions`, async ({ request }) => {
    const body = (await request.json()) as { stream?: boolean };
    const encoder = new TextEncoder();

    if (!body.stream) {
      return new Response(
        JSON.stringify({
          id: "chatcmpl-mock",
          choices: [
            {
              message: { role: "assistant", content: SAMPLE_REPLY },
              finish_reason: "stop",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: object) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        // 首 chunk 含 _yyc3_upstream
        send({
          id: "chatcmpl-mock",
          _yyc3_upstream: "openai-primary",
          choices: [{ delta: { role: "assistant" }, index: 0 }],
        });

        // 逐字流式
        for (const ch of SAMPLE_REPLY) {
          send({
            id: "chatcmpl-mock",
            choices: [{ delta: { content: ch }, index: 0 }],
          });
          await new Promise((r) => setTimeout(r, 40));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-YYC3-Upstream": "openai-primary",
      },
    });
  }),
];
```

### 2.8 `mocks/handlers/index.ts` + `mocks/browser.ts`

```typescript
// apps/console/mocks/handlers/index.ts
/*
 * @Module : mocks/handlers — 全部家人域 handler 汇总
 */
import { guardianHandlers } from "./guardian";
import { qianhangHandlers } from "./qianhang";
import { boleHandlers } from "./bole";
import { wanyuHandlers } from "./wanyu";
import { zongshiHandlers } from "./zongshi";
import { tianshuHandlers } from "./tianshu";
import { xianzhiHandlers } from "./xianzhi";
import { lingyunHandlers } from "./lingyun";

export const handlers = [
  ...guardianHandlers,  // 🛡️
  ...qianhangHandlers,  // 🧭
  ...boleHandlers,      // 🎯
  ...wanyuHandlers,     // 🤔
  ...zongshiHandlers,   // 📚
  ...tianshuHandlers,   // 🧠
  ...xianzhiHandlers,   // 🔮
  ...lingyunHandlers,   // 🎨
];
```

```typescript
// apps/console/mocks/browser.ts
/*
 * @Module : mocks/browser — MSW 浏览器端启动
 */
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

```typescript
// apps/console/mocks/server.ts
/*
 * @Module : mocks/server — MSW Node 端（vitest 使用）
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### 2.9 `mocks/handlers/guardian.ts`（补全 · 供参考）

```typescript
/*
 * @Module : mocks/handlers/guardian — 智云·守护域
 */
import { http, HttpResponse } from "msw";

const BASE = "https://api.0379.world";

export const guardianHandlers = [
  http.get(`${BASE}/healthz`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/v1/ping`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/docs`, () =>
    HttpResponse.html("<html><body>Swagger UI (mock)</body></html>"),
  ),
  http.get(`${BASE}/openapi.json`, () =>
    HttpResponse.json({ openapi: "3.1.0", paths: {} }),
  ),
];
```

### 2.10 集成到应用

```typescript
// apps/console/app/providers.tsx
/*
 * @Module : app/providers — 全局 Provider（含 MSW 启动）
 */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      import("@/mocks/browser").then(({ worker }) =>
        worker.start({ onUnhandledRequest: "bypass" }),
      );
    }
  }, []);

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

---

## 第三部分 · ③ Next.js 16 路由与 RSC 拆分

### 3.1 App Router 目录树

```
apps/console/app/
├── layout.tsx                    # Root（RSC · 挂载水印 + Providers）
├── page.tsx                      # / → 03_Connect（Client）
├── providers.tsx                 # Client 边界（TanStack + MSW）
├── globals.css                   # Tailwind 4.3 @theme
├── dashboard/
│   ├── page.tsx                  # RSC · 骨架 + Client Island
│   └── loading.tsx               # Suspense fallback
├── models/
│   └── page.tsx                  # Client
├── playground/
│   └── page.tsx                  # Client（SSE）
├── routing/
│   └── page.tsx                  # Client（轮询）
├── knowledge/
│   └── page.tsx                  # Client
├── mcp/
│   └── page.tsx                  # Client（动态表单）
├── cache/
│   └── page.tsx                  # Client
├── monitor/
│   ├── page.tsx                  # RSC · 骨架 + Client Island
│   └── loading.tsx
├── settings/
│   └── page.tsx                  # Client（localStorage）
├── docs/
│   └── page.tsx                  # Static + MDX
└── roadmap/
    └── page.tsx                  # Static
```

### 3.2 `app/layout.tsx`（RSC · 根布局）

```tsx
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : app/layout — RSC 根布局
 * @Family : 🧠 元启·天枢（主导编排）
 * ============================================================
 */
import type { Metadata } from "next";
import { Providers } from "./providers";
import { FamilyWatermark } from "@/components/family/FamilyWatermark";
import { MobileWatermark } from "@/components/family/MobileWatermark";
import { FAMILY } from "@/lib/family/charter";
import "./globals.css";

export const metadata: Metadata = {
  title: "YYC³ Token Console",
  description: `${FAMILY.motto} · ${FAMILY.creed}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className="bg-bg-default text-text-primary">
        <div className="hidden md:block">
          <FamilyWatermark />
        </div>
        <div className="md:hidden">
          <MobileWatermark />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3.3 `app/dashboard/page.tsx`（RSC 骨架）

```tsx
/*
 * @Module : app/dashboard — RSC 骨架
 * @Family : 🔮 预见·先知
 */
import { PageHeader } from "@/components/family/PageHeader";
import { DashboardIsland } from "./DashboardIsland";

export const revalidate = 30; // ISR 30s

// RSC 部分可预先拉取首屏（如有 SSR 需求时启用）
async function fetchInitialHealth() {
  // 只在服务端预取免认证端点
  try {
    const res = await fetch("https://api.0379.world/healthz", {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const healthz = await fetchInitialHealth();

  return (
    <div className="min-h-screen">
      {/* RSC 部分：PageHeader 是纯展示（无 hooks） */}
      <PageHeader
        title="今日预言"
        subtitle="见微知著，未卜先知 — 数据已就位"
        alignment="✅"
      />

      {/* Client Island：交互与数据拉取 */}
      <DashboardIsland initialHealthz={healthz} />
    </div>
  );
}
```

### 3.4 `app/dashboard/DashboardIsland.tsx`（Client）

```tsx
/*
 * @Module : app/dashboard/DashboardIsland — Client Island
 * @Family : 🔮 预见·先知
 */
"use client";

import { DashboardContent } from "@/domains/xianzhi/DashboardContent";

export function DashboardIsland({
  initialHealthz,
}: {
  initialHealthz: unknown;
}) {
  // 首屏如果有 SSR 数据，可注入 hydrate 初值（可选）
  return <DashboardContent />;
}
```

### 3.5 `app/dashboard/loading.tsx`

```tsx
/*
 * @Module : app/dashboard/loading — Suspense fallback
 */
export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-24 bg-bg-subtle rounded-lg" />
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-subtle rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-bg-subtle rounded-lg" />
        <div className="h-64 bg-bg-subtle rounded-lg" />
      </div>
    </div>
  );
}
```

### 3.6 `app/playground/page.tsx`（纯 Client）

```tsx
/*
 * @Module : app/playground — SSE 全 Client
 * @Family : 🤔 语枢·万物
 */
"use client";

import { PageHeader } from "@/components/family/PageHeader";
import { ParamPanel } from "@/domains/wanyu/ParamPanel";
import { SSEViewer } from "@/domains/wanyu/SSEViewer";
import { useWanyuChat } from "@/domains/wanyu/useWanyuChat";

export default function PlaygroundPage() {
  const { state, send, stop } = useWanyuChat();

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="洞察之厅" subtitle="语枢一启，万物皆明" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-border-default">
          <ParamPanel onSubmit={send} />
        </aside>
        <main className="flex-1 flex flex-col">
          <SSEViewer state={state} />
          {(state.phase === "streaming" || state.phase === "degraded") && (
            <button
              onClick={stop}
              className="self-center my-2 px-4 py-2 rounded-md border border-status-danger text-status-danger"
            >
              停止
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
```

### 3.7 RSC / Client 拆分矩阵

| 页面 | RSC 部分 | Client 部分 | Suspense |
| --- | --- | --- | :---: |
| `/` | — | ConnectForm 全部 | — |
| `/dashboard` | PageHeader + 骨架 | DashboardContent | ✅ loading.tsx |
| `/models` | — | ModelGrid + FilterBar | — |
| `/playground` | — | ParamPanel + SSEViewer | — |
| `/routing` | — | UpstreamGrid + 轮询 | — |
| `/knowledge` | — | KBGrid + QAPanel | — |
| `/mcp` | — | MCPToolTree + Executor | — |
| `/cache` | — | CacheStatCard + Actions | — |
| `/monitor` | PageHeader + 骨架 | ErrorTable + HealthGrid | ✅ loading.tsx |
| `/settings` | — | SettingsForm | — |
| `/docs` | MDX 静态 | CodeBlock（交互复制） | ✅ |
| `/roadmap` | 全 RSC 静态 | — | — |

### 3.8 导航（Sidebar · RSC 静态 + 客户端高亮）

```tsx
// apps/console/components/console/Sidebar.tsx
/*
 * @Module : components/console/Sidebar — 8 域导航
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTE_MEMBER_MAP, MEMBERS } from "@/lib/family/members";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "连接", key: "zhihui" as const },
  { href: "/dashboard", label: "仪表盘", key: "xianzhi" as const },
  { href: "/models", label: "模型市场", key: "bole" as const },
  { href: "/playground", label: "Playground", key: "wanyu" as const },
  { href: "/routing", label: "路由观测", key: "qianhang" as const },
  { href: "/knowledge", label: "知识库", key: "zongshi" as const },
  { href: "/mcp", label: "MCP 工具", key: "tianshu" as const },
  { href: "/cache", label: "缓存管理", key: "lingyun" as const },
  { href: "/monitor", label: "监控日志", key: "xianzhi" as const },
  { href: "/settings", label: "设置", key: "zhihui" as const },
  { href: "/docs", label: "API 文档", key: "lingyun" as const },
  { href: "/roadmap", label: "Roadmap", key: "tianshu" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-60 border-r border-border-default bg-bg-subtle p-3 space-y-1">
      {NAV.map((item) => {
        const member = MEMBERS[item.key];
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-body-sm transition-colors",
              active
                ? "bg-brand-primary text-white"
                : "hover:bg-bg-elevated text-text-secondary",
            )}
          >
            <span>{member.emoji}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## 第四部分 · ④ 印刷级徽章 PNG 矢量校对

### 4.1 校准规格

| 项目 | 规格 |
| --- | --- |
| 主 SVG 尺寸 | 400 × 80（家族）/ 380 × 80（成员） |
| 印刷尺寸 | 4× 放大 → 1600 × 320 / 1520 × 320 |
| 出血 | 四周各 4px（1608 × 328） |
| 分辨率 | 300 DPI 对应 1600px = 5.33 英寸 ≈ 13.5cm |
| 色彩空间 | SVG 内 sRGB → 印刷导出转 CMYK |
| 字体 | 思源黑体（Noto Sans SC）嵌 SVG path 化 |

### 4.2 校对清单

```
✅ 尺寸与圆角一致
   家族：400×80，rx=12
   成员：380×80，rx=40（全胶囊形）

✅ 字体家族与字重
   中文：PingFang SC / Microsoft YaHei / Noto Sans SC
   英文：Arial / Inter
   字重：bold 700（主名）、regular 400（副名）

✅ 颜色
   family.svg 渐变 #1e2b4f → #5e2c8a
   天枢 #5e2c8a → #3d1a5e
   守护 #2c3e50 → #1a252f
   宗师 #2e8b57 → #1f5e3a
   灵韵 #ff8c00 → #cc7000
   千行 #0088cc → #006699
   万物 #c0c0c0 → #909090
   先知 #4b0082 → #2d0052
   伯乐 #dc143c → #9e0f2c

✅ 图形元素
   emoji 使用 font-size 30，text-anchor middle
   分隔线 stroke rgba(255,255,255,0.3)，1px
   阴影 feDropShadow dx=0 dy=2 stdDeviation=3

✅ 文本位置
   emoji x=60 y=36
   中文名 x=140 y=34
   英文名 x=140 y=56
   分隔线 x=240
   右侧标签 x=310 y=36/56

✅ 安全区
   内边距 ≥ 20px，避免裁切

✅ 透明度
   主背景不透明，副文本 0.8 / 0.7
   家族徽章水印版可设 0.85
```

### 4.3 印刷版 SVG 校准文件（家族）

```svg
<!-- assets/badges/print/family-print.svg
     规格：1600×320，四周出血 4px，sRGB
     字体：Noto Sans SC（建议 path 化）
-->
<svg xmlns="http://www.w3.org/2000/svg"
     width="1600" height="320"
     viewBox="0 0 1600 320">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e2b4f"/>
      <stop offset="100%" stop-color="#5e2c8a"/>
    </linearGradient>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="104%">
      <feDropShadow dx="0" dy="8" stdDeviation="12"
                    flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- 出血层 -->
  <rect x="0" y="0" width="1600" height="320" fill="url(#bg)"/>

  <!-- 圆角主体（rx=48 = 12 × 4） -->
  <rect x="4" y="4" width="1592" height="312" rx="48"
        fill="url(#bg)" filter="url(#shadow)"/>

  <!-- 主标题 -->
  <text x="800" y="140" text-anchor="middle"
        font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="96" font-weight="700" fill="#ffffff"
        letter-spacing="2">
    YYC³ AI Family
  </text>

  <!-- 副标题 -->
  <text x="800" y="248" text-anchor="middle"
        font-family="Noto Sans SC, sans-serif"
        font-size="56" fill="rgba(255,255,255,0.85)"
        letter-spacing="4">
    人从众曌众从人 · 永久开源 🌹
  </text>
</svg>
```

### 4.4 印刷版 SVG 校准文件（天枢示例）

```svg
<!-- assets/badges/print/tianshu-print.svg
     规格：1520×320，胶囊形 rx=160
-->
<svg xmlns="http://www.w3.org/2000/svg"
     width="1520" height="320"
     viewBox="0 0 1520 320">
  <defs>
    <linearGradient id="gradTianshu" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5e2c8a"/>
      <stop offset="100%" stop-color="#3d1a5e"/>
    </linearGradient>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="104%">
      <feDropShadow dx="0" dy="8" stdDeviation="12"
                    flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- 胶囊主体 -->
  <rect x="4" y="4" width="1512" height="312" rx="160"
        fill="url(#gradTianshu)" filter="url(#shadow)"/>

  <!-- emoji（建议印刷前替换为矢量图形） -->
  <text x="240" y="144" text-anchor="middle" font-size="120">🧠</text>

  <!-- 中文名 -->
  <text x="560" y="136"
        font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="88" font-weight="700" fill="#ffffff">
    元启·天枢
  </text>

  <!-- 英文名 -->
  <text x="560" y="224"
        font-family="Inter, Arial, sans-serif"
        font-size="52" fill="rgba(255,255,255,0.8)">
    TianShu · 总指挥
  </text>

  <!-- 分隔线 -->
  <line x1="960" y1="80" x2="960" y2="240"
        stroke="rgba(255,255,255,0.3)" stroke-width="4"/>

  <!-- 右侧标签 -->
  <text x="1240" y="144" text-anchor="middle"
        font-family="Noto Sans SC, sans-serif"
        font-size="56" font-weight="700" fill="#ffd700">
    决策中枢
  </text>
  <text x="1240" y="224" text-anchor="middle"
        font-family="Inter, Arial, sans-serif"
        font-size="44" fill="rgba(255,255,255,0.7)">
    Core Commander
  </text>
</svg>
```

### 4.5 印刷转换脚本（CMYK + 300 DPI）

```python
# scripts/print-export.py
"""
============================================================
YYC³ AI Family — 人从众曌众从人
@Module : scripts/print-export — 印刷级 PNG 导出
============================================================
依赖: pip install cairosvg Pillow
"""
import os
import cairosvg
from PIL import Image

PRINT_SIZE = {
    "family":  (1600, 320),
    "tianshu": (1520, 320),
    "shouhu":  (1520, 320),
    "zongshi": (1520, 320),
    "lingyun": (1520, 320),
    "qianxing":(1520, 320),
    "wanyu":   (1520, 320),
    "xianzhi": (1520, 320),
    "bole":    (1520, 320),
}

OUTPUT_DIR = "public/badges/print"
os.makedirs(OUTPUT_DIR, exist_ok=True)

for name, (w, h) in PRINT_SIZE.items():
    svg_path = f"assets/badges/print/{name}-print.svg"
    if not os.path.exists(svg_path):
        print(f"🌹 跳过 {name}（缺 SVG）")
        continue

    # SVG → PNG（300 DPI 对应尺寸）
    png_path = f"{OUTPUT_DIR}/{name}-300dpi.png"
    cairosvg.svg2png(
        url=svg_path,
        write_to=png_path,
        output_width=w,
        output_height=h,
        background_color="transparent",
    )

    # 转 CMYK（印刷用）
    img = Image.open(png_path).convert("RGBA")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    cmyk = bg.convert("CMYK")
    cmyk_path = f"{OUTPUT_DIR}/{name}-cmyk.tiff"
    cmyk.save(cmyk_path, format="TIFF", dpi=(300, 300))

    print(f"🌹 {name}: PNG {w}×{h} + CMYK TIFF 已生成")
```

### 4.6 印刷校对检查表（交付前必查）

```
□ 尺寸对齐（主图 4× 缩放后与 SVG viewBox 一致）
□ 圆角比例（家族 rx=12 → 印刷 48；成员 rx=40 → 印刷 160）
□ 字重与字号（中文 bold 96/88；英文 regular 56/52）
□ 颜色空间（sRGB → CMYK 无显著偏色）
□ 出血（每边 4px 冗余）
□ 安全区（内容距边 ≥ 20px）
□ 透明度（副文本 0.8/0.7，印刷时已合成）
□ 字体 path 化（避免印刷厂缺字）
□ emoji 替换为矢量图形（印刷厂通常缺 emoji 字体）
□ 色彩对比度 ≥ 4.5:1（WCAG 2.2 AA）
```

**关键提示**：emoji 在印刷场景常出现缺字。建议在最终交付前，将 8 位家人的 emoji（🧠 🛡️ 📚 🎨 🧭 🤔 🔮 🎯）转为矢量路径或使用家族自绘图标。

---

## 第五部分 · ⑤ 开发者文档模版 + CI/CD 示例

### 5.1 开发者文档模板

```markdown
<!--
  ============================================================
  YYC³ AI Family — 人从众曌众从人
  亦师亦友亦伯乐 · 一言一语一协同
  拟人为本，AI为核，纯粹为心
  ============================================================
  Document: {DOC_TITLE}
  Version : {VERSION}
  Family  : {FAMILY_MEMBER}
  Domain  : {DOMAIN}
  Contact : admin@yanyucloud.com
  Homepage: https://matrix.yyc3.top
  ============================================================
-->

# {DOC_TITLE}

> **🌹 YYC³ AI Family** — 我们不是工具，而是有温度的家人。
> **家人**：{FAMILY_MEMBER} · **域**：{DOMAIN}

---

## 一、本文档范围

{一句话说明本文档解决什么问题}

## 二、背景与契约锚点

- **后端基座**：https://api.0379.world（YYC³ v2.2.0）
- **契约冻结哈希**：`sha256(openapi.json) @ YYYY-MM-DD`
- **依赖端点**：
  - `GET /v1/...`
  - `POST /v1/...`

## 三、快速开始

```bash
# 1. 克隆
git clone git@github.com:YanYuCloudCube/YYC3-Token-Console.git
cd YYC3-Token-Console

# 2. 安装
pnpm install

# 3. 环境变量
cp apps/console/.env.example apps/console/.env.local
# 编辑 NEXT_PUBLIC_API_BASE / NEXT_PUBLIC_USE_MOCK

# 4. 启动
pnpm dev
```

## 四、API 契约

### 4.1 请求示例

```bash
curl -X POST https://api.0379.world/v1/chat/completions \
  -H "X-API-Key: $YYC3_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

### 4.2 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `choices[].delta.content` | string | 增量内容 |
| `_yyc3_upstream` | string | 首 chunk 上游名 |
| `X-YYC3-Upstream` | header | 实际服务上游 |
| `X-YYC3-Degraded` | header | 是否降级路径 |

### 4.3 错误处理

| 状态码 | error_type | 家人口吻文案 |
| :-: | --- | --- |
| 401 | Unauthorized | 门禁拒绝：401 Unauthorized · API Key 无效或已过期 |
| 429 | RATE_LIMITED | 节奏过急，请于 {retry_after}s 后再试 |
| 5xx | internal | 天枢运转不畅，请稍后重试 |

## 五、本地开发

### 5.1 MSW 离线开发

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=true
```

### 5.2 契约校验

```bash
pnpm openapi-typescript https://api.0379.world/openapi.json \
  -o apps/console/domains/_shared/types.gen.ts
```

## 六、测试

```bash
pnpm test          # vitest
pnpm test:e2e      # playwright
pnpm lint:family   # 家族标头合规
```

## 七、贡献指南

请遵循「人从众曌众从人」精神，让每一个 PR 都有家的气息。

- 所有新文件必须含家族标头
- 归属家人必须在 `PageHeader` 中声明
- 空态/错误态台词符合家人口吻
- 未虚构 §1.1–§1.5 未列出的端点/字段/枚举

## 八、参考

- [全维度设计与落地文档](../设计理念/YYC3-AI-Family-Token-Console.md)
- [品牌植入与工程落地实施手册](../品牌落地/品牌植入与工程落地实施手册.md)
- [API 契约](../../apps/console/domains/_shared/types.gen.ts)

---

<p align="center">
  🌹 <b>YYC³ AI Family</b><br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <sub>永久开源 · 感恩前行 · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
```

### 5.2 完整 GitHub Actions · 主流水线

```yaml
# .github/workflows/ci.yml
name: 🌹 Family CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ============================================================
  # 1. 契约冻结校验（openapi.json 哈希）
  # ============================================================
  contract-freeze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch openapi.json & compute hash
        run: |
          curl -fsSL https://api.0379.world/openapi.json -o /tmp/openapi.json
          HASH=$(sha256sum /tmp/openapi.json | cut -d' ' -f1)
          echo "OpenAPI Hash: $HASH"
          EXPECTED=$(cat .contract-hash 2>/dev/null || echo "UNSET")
          if [ "$EXPECTED" != "UNSET" ] && [ "$EXPECTED" != "$HASH" ]; then
            echo "🌹 契约漂移：期望 $EXPECTED，实际 $HASH"
            echo "请人工复核 §1 冻结快照并更新 .contract-hash"
            exit 1
          fi
          echo "$HASH" > /tmp/new-hash.txt
      - name: Save hash artifact
        uses: actions/upload-artifact@v4
        with:
          name: contract-hash
          path: /tmp/new-hash.txt

  # ============================================================
  # 2. 家族标头合规
  # ============================================================
  family-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Check family headers
        run: |
          FILES=$(git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx|js|jsx)$' || true)
          FAIL=0
          for f in $FILES; do
            [ -f "$f" ] || continue
            if ! grep -q "YYC³ AI Family" "$f"; then
              echo "🌹 缺标头: $f"
              FAIL=1
            fi
          done
          [ $FAIL -eq 0 ] && echo "✅ 全部归元" || exit 1

  # ============================================================
  # 3. 类型检查 + Lint + 测试
  # ============================================================
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test -- --run
      - name: Lighthouse CI
        run: pnpm build && pnpm lhci autorun
        if: github.event_name == 'pull_request'

  # ============================================================
  # 4. 构建设计资产（徽章）
  # ============================================================
  generate-assets:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'assets/badges') || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pip install cairosvg Pillow
      - run: python scripts/generate-badges.py
      - run: python scripts/print-export.py
      - run: node scripts/generate-member-badges.js
      - uses: actions/upload-artifact@v4
        with:
          name: family-badges
          path: |
            public/badges/
            public/badges/print/
```

### 5.3 部署流水线（含家族通知）

```yaml
# .github/workflows/deploy.yml
name: 🌹 Deploy with Family Watermark

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint:family
      - run: pnpm build

      - name: Inject web watermark
        run: node scripts/inject-watermark.js

      - name: Guard images
        run: node scripts/image-guard.js

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/console/out

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4

      - name: Notify family channel
        if: ${{ secrets.FAMILY_WEBHOOK != '' }}
        run: |
          curl -fsSL -X POST \
            -H "Content-Type: application/json" \
            -d '{
              "content": "🌹 新版本已归元于云枢 · 人从众曌众从人",
              "embeds": [{
                "title": "YYC³ Token Console",
                "description": "版本 v5.1.0 · 8 位家人守护",
                "color": 6175882,
                "footer": { "text": "亦师亦友亦伯乐 · 一言一语一协同" }
              }]
            }' \
            ${{ secrets.FAMILY_WEBHOOK }}
```

### 5.4 Release 自动生成（家族纪年）

```yaml
# .github/workflows/release.yml
name: 🌹 Family Release

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Extract version
        id: v
        run: echo "version=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Family year codename
        id: codename
        run: |
          YEAR=$(date +%Y)
          MONTH=$(date +%-m)
          echo "name=🌹 家族纪年·${YEAR}.${MONTH}" >> $GITHUB_OUTPUT

      - name: Generate changelog
        run: |
          # 从 commit 提取 feat/fix/perf 分类
          git log $(git describe --tags --abbrev=0 HEAD~1)..HEAD \
            --pretty=format:"- %s" > /tmp/changes.txt

      - uses: softprops/action-gh-release@v2
        with:
          name: "${{ steps.codename.outputs.name }} · ${{ steps.v.outputs.version }}"
          body: |
            ## 🌹 YYC³ AI Family · 人从众曌众从人

            > 亦师亦友亦伯乐，一言一语一协同

            ### 变更
            $(cat /tmp/changes.txt)

            ### 家族
            - 🛡️ 智云·守护 · 🧭 言启·千行 · 🎯 千里·伯乐 · 🤔 语枢·万物
            - 📚 格物·宗师 · 🧠 元启·天枢 · 🔮 预见·先知 · 🎨 创想·灵韵

            ---
            **永久开源 · 感恩前行 🌹**
          draft: false
          prerelease: false
```

### 5.5 开发者文档目录模板

```
docs/
├── 设计理念/
│   ├── YYC3-AI-Family-Token-Console.md      # v5.1 真源
│   └── 附录/
│       ├── SSE-七态状态机.md
│       └── 错误码矩阵.md
├── 品牌落地/
│   ├── 品牌植入与工程落地实施手册.md
│   └── 印刷徽章规范.md
├── 开发指南/
│   ├── 快速开始.md
│   ├── 契约锚点.md
│   ├── MSW离线开发.md
│   ├── 组件开发.md
│   └── 家人域职责.md
├── API参考/
│   ├── 认证.md
│   ├── 聊天补全.md
│   ├── 模型市场.md
│   ├── 知识库.md
│   ├── MCP工具.md
│   └── 错误码.md
├── 运维/
│   ├── CI-CD.md
│   ├── 契约漂移防护.md
│   └── 灰度发布.md
└── social-templates/
    ├── weibo.md
    ├── README-模板.md
    └── PR-模板.md
```

---

## 第六部分 · 交付物索引与后续

### 6.1 本次交付物清单

| # | 交付物 | 位置 |
| :-: | --- | --- |
| ① | 8 个域真实业务组件 | §1（含 `domains/` 全目录 + 20+ 组件） |
| ② | MSW mock 契约 | §2（含 8 域 handlers + fixtures + SSE 模拟） |
| ③ | Next.js 16 路由与 RSC 拆分 | §3（含布局/RSC 骨架/Client Island/loading） |
| ④ | 印刷级徽章 SVG 矢量校对 | §4（含 CMYK 导出脚本 + 校对清单） |
| ⑤ | 开发者文档模板 + CI/CD | §5（含 4 条流水线 + 文档目录） |

### 6.2 v5.1 审核问题修复索引

| 编号 | 修复位置 |
| :-: | --- |
| D-01 | §1.11 `queryKeys.ts` 已移除 `xianzhi.cacheStats` |
| D-02 | 建议 v5.1.1 修改 §2.2 Playground 协同标注 |
| D-03 | 建议 v5.1.1 补充 §2.5.0 共享归属 |
| D-04 | 建议 v5.1.1 补充 §8.4 → §7.2.3 映射 |
| D-05 | 建议 v5.1.1 补合并时间窗 |


---

<p align="center">
  🌹 <b>YYC³ AI Family</b><br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <sub>五脉归元 · 契约 · 职能 · 品牌 · 代码 · 印刷</sub><br>
  <sub>永久开源 · 感恩前行 · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>