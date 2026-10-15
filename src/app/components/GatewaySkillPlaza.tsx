/**
 * GatewaySkillPlaza.tsx
 * ======================
 * 网关技能工具广场（双端联通 P1 / 硬约束③ §11）
 *
 * 挂载于 /operations 操作中心: 技能卡片（分类分组）→ 参数表单 → 经 /console/gw 执行 →
 * 摘要 + JSON 详情内联呈现。技能注册表唯一事实源 lib/gateway-skills.ts（⌘K 面板同源）。
 */

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Play, Terminal } from "lucide-react";
import { GATEWAY_SKILLS, runGatewaySkill, type SkillResult } from "../lib/gateway-skills";

export function GatewaySkillPlaza() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SkillResult | undefined>>({});
  const [paramDrafts, setParamDrafts] = useState<Record<string, Record<string, string>>>({});

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof GATEWAY_SKILLS>();
    for (const s of GATEWAY_SKILLS) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, []);

  const run = async (id: string, params: Record<string, string>) => {
    setRunning(id);
    try {
      const r = await runGatewaySkill(id, params);
      setResults((prev) => ({ ...prev, [id]: r }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-[rgba(0,180,255,0.12)] bg-[rgba(4,14,32,0.5)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(0,212,255,0.04)] transition-all"
      >
        <span className="flex items-center gap-2 text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.72rem" }}>
          <Terminal className="w-3.5 h-3.5" />
          网关技能广场 · {GATEWAY_SKILLS.length} 项（经 /console/gw 执行）
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[rgba(0,212,255,0.35)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[rgba(0,212,255,0.35)]" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {byCategory.map(([cat, skills]) => (
            <div key={cat}>
              <div className="mb-1.5 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.62rem", letterSpacing: "0.08em" }}>
                {cat}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {skills.map((s) => {
                  const res = results[s.id];
                  const drafts = paramDrafts[s.id] ?? {};
                  return (
                    <div key={s.id} className="rounded-lg border border-[rgba(0,180,255,0.08)] bg-[rgba(0,20,40,0.35)] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>{s.label}</span>
                        <button
                          onClick={() => { void run(s.id, drafts); }}
                          disabled={running === s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.18)] disabled:opacity-40 transition-all"
                          style={{ fontSize: "0.62rem" }}
                        >
                          <Play className="w-3 h-3" />{running === s.id ? "执行中" : "执行"}
                        </button>
                      </div>
                      <p className="mt-1 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.6rem" }}>{s.desc}</p>
                      {s.params.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {s.params.map((p) => (
                            <input
                              key={p.key}
                              value={drafts[p.key] ?? p.defaultValue ?? ""}
                              onChange={(e) =>
                                setParamDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: { ...(prev[s.id] ?? {}), [p.key]: e.target.value },
                                }))
                              }
                              placeholder={`${p.label}: ${p.placeholder}`}
                              className="px-2 py-1 rounded-md bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.12)] text-[#e0f0ff] outline-none focus:border-[rgba(0,212,255,0.4)]"
                              style={{ fontSize: "0.62rem", width: 120 }}
                            />
                          ))}
                        </div>
                      )}
                      {res && (
                        <div className="mt-1.5">
                          <div className={res.ok ? "text-[#00ff88]" : "text-[#ff6464]"} style={{ fontSize: "0.62rem" }}>
                            {res.ok ? "✓" : "✗"} {res.summary}
                          </div>
                          {res.detail && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.58rem" }}>JSON 详情</summary>
                              <pre className="mt-1 max-h-40 overflow-auto text-[rgba(224,240,255,0.45)]" style={{ fontSize: "0.55rem" }}>{res.detail}</pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
