/**
 * settings/APIEndpointConfig.tsx — 后端 API 端点配置分区 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: ENDPOINT_META 分组渲染 + 跨标签页同步
 */
import { useCallback, useEffect, useState } from "react";
import { Globe, Plug, Repeat, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import {
  ENDPOINT_META,
  getAPIConfig,
  onAPIConfigChange,
  resetAPIConfig as resetAPIConfigDefaults,
  setAPIConfig,
  type APIEndpoints,
} from "../../lib/api-config";
import { Toggle } from "./shared";

export function APIEndpointConfig() {
  const [apiConfig, setApiConfigState] = useState<APIEndpoints>(getAPIConfig());

  // 监听跨标签页变更
  useEffect(() => {
    return onAPIConfigChange((config) => {
      setApiConfigState(config);
    });
  }, []);

  const updateField = useCallback((key: keyof APIEndpoints, value: string | boolean | number) => {
    const patch: Partial<APIEndpoints> = {};
    (patch as Record<string, unknown>)[key] = value;
    const updated = setAPIConfig(patch);
    setApiConfigState(updated);
    toast.success(`已更新: ${key}`, {
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        color: "#e0f0ff",
      },
    });
  }, []);

  const handleReset = useCallback(() => {
    const defaults = resetAPIConfigDefaults();
    setApiConfigState(defaults);
    toast.info("API 配置已重置为默认值");
  }, []);

  // Group ENDPOINT_META by group
  const groups = ENDPOINT_META.reduce<Record<string, typeof ENDPOINT_META>>((acc, meta) => {
    const g = meta.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(meta);
    return acc;
  }, {});

  return (
    <div className="p-4 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.1)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-[#00d4ff]" />
          <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>后端 API 端点配置</h4>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
          style={{ fontSize: "0.68rem" }}
        >
          <RotateCcw className="w-3 h-3" />
          重置默认
        </button>
      </div>

      <p className="text-[rgba(0,212,255,0.35)] mb-4" style={{ fontSize: "0.68rem" }}>
        控制后端 API 连接参数。关闭「启用后端 API」时使用前端 Mock 数据，无需真实后端服务。
      </p>

      {Object.entries(groups).map(([groupName, metas]) => (
        <div key={groupName} className="mb-4 last:mb-0">
          <p className="text-[rgba(0,212,255,0.5)] mb-2 px-1" style={{ fontSize: "0.7rem" }}>
            {groupName}
          </p>
          <div className="space-y-2">
            {metas.map((meta) => {
              const val = apiConfig[meta.key];

              if (meta.type === "boolean") {
                return (
                  <div key={meta.key} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                      <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.64rem" }}>{meta.description}</p>
                    </div>
                    <Toggle enabled={!!val} onChange={(v) => updateField(meta.key, v)} />
                  </div>
                );
              }

              if (meta.type === "number") {
                const numVal = Number(val) || 0;
                const isRetries = meta.key === "maxRetries";

                return (
                  <div key={meta.key} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isRetries ? <Repeat className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /> : <Timer className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />}
                        <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                      </div>
                      <span className="text-[#00d4ff] font-mono" style={{ fontSize: "0.78rem" }}>{numVal}</span>
                    </div>
                    <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.64rem" }}>{meta.description}</p>

                    {isRetries ? (
                      /* maxRetries: 可视化滑块 0~5 */
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={1}
                          value={numVal}
                          onChange={(e) => updateField(meta.key, parseInt(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, rgba(0,212,255,0.6) ${(numVal / 5) * 100}%, rgba(0,40,80,0.4) ${(numVal / 5) * 100}%)`,
                            accentColor: "#00d4ff",
                          }}
                        />
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => updateField(meta.key, n)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${numVal === n
                                ? "bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.5)] text-[#00d4ff]"
                                : "bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]"
                                }`}
                              style={{ fontSize: "0.65rem" }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* timeout: 数字输入框 */
                      <input
                        type="number"
                        value={numVal}
                        onChange={(e) => updateField(meta.key, parseInt(e.target.value) || 0)}
                        min={1000}
                        max={120000}
                        step={1000}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                        style={{ fontSize: "0.78rem" }}
                      />
                    )}

                    {/* maxRetries 额外提示 */}
                    {isRetries && (
                      <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.06)]">
                        <Repeat className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0" />
                        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                          {numVal === 0
                            ? "不重试，请求失败立即返回"
                            : `失败后最多重试 ${numVal} 次 (指数退避: ${[500, 1000, 2000, 4000, 8000].slice(0, numVal).join("ms → ")}ms)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }

              // URL type
              return (
                <div key={meta.key} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                    <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                  </div>
                  <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.64rem" }}>{meta.description}</p>
                  <input
                    type="text"
                    value={String(val)}
                    onChange={(e) => updateField(meta.key, e.target.value)}
                    placeholder={meta.placeholder}
                    className="w-full px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                    style={{ fontSize: "0.78rem" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 当前配置状态概要 */}
      <div className="mt-4 p-3 rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,180,255,0.06)]">
        <p className="text-[rgba(0,212,255,0.3)] mb-2" style={{ fontSize: "0.62rem" }}>当前配置概要</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-center">
            <p className={`font-mono ${apiConfig.enableBackend ? "text-[#00ff88]" : "text-[rgba(255,100,100,0.6)]"}`} style={{ fontSize: "0.75rem" }}>
              {apiConfig.enableBackend ? "已启用" : "Mock 模式"}
            </p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>后端 API</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono" style={{ fontSize: "0.75rem" }}>{apiConfig.timeout / 1000}s</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>超时</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono" style={{ fontSize: "0.75rem" }}>{apiConfig.maxRetries}x</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>最大重试</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono truncate" style={{ fontSize: "0.75rem" }}>{apiConfig.dbBase}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>数据库 API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
