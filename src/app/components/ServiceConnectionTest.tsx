/**
 * ServiceConnectionTest.tsx
 * ==========================
 * 全链路服务连接测试面板 · 路由: /connection-test
 *
 * 功能:
 * - AI 模型服务商连接测试 (Z.ai / OpenAI / DeepSeek / Kimi / Ollama / ...)
 * - 数据库连接测试 (PostgreSQL / MySQL / Redis / MongoDB / SQLite)
 * - WebSocket 连接测试
 * - 网络连通性测试 (内网 / 外网)
 * - CORS 代理检测与自动配置
 * - 详细诊断日志 + 解决方案提示
 * - 一键全部测试 + 单项测试
 * - 测试结果持久化 (localStorage)
 *
 * 批7 Facade+Siblings 拆分: 测试执行器/结果卡/辅助面板移至 service-test/ 目录,
 * 本主壳仅保留状态编排 (runAllTests) 与页面骨架组装。
 * 规范: 新增分区放 service-test/ sibling, 禁止回填主壳。
 */

import {
  Activity, Database, Globe, Network, Play, Radio,
  RotateCcw, Server, Shield, Terminal, XCircle, Zap,
} from "lucide-react";
import { useCallback, useContext, useRef, useState } from "react";
import { toast } from "sonner";
import { useModelProvider } from "../hooks/useModelProvider";
import { env } from "../lib/env-config";
import { ViewContext } from "../lib/view-context";
import { LOCALSTORAGE_KEYS, lsGet, lsRemove, lsSet } from "../lib/yyc3-storage";
import { dbConnectionStore } from "../stores/dashboard-stores";
import { GlassCard } from "./GlassCard";
import { DiagnosticCard, EnvironmentDetectionPanel, QuickTestButton } from "./service-test/panels";
import { ResultCard } from "./service-test/results-view";
import { runAIProviderTest, runDBTest, runNetworkTest, runWebSocketTest } from "./service-test/tests";
import { clearStoredResults, loadResults, saveResults, toastStyle } from "./service-test/types";
import type { TestResult } from "./service-test/types";

// ============================================================
// Component
// ============================================================

export function ServiceConnectionTest() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const { providers, configuredModels } = useModelProvider();
  const dbConnections = dbConnectionStore.getAll();

  const [results, setResults] = useState<TestResult[]>(loadResults);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [proxyUrl, setProxyUrl] = useState(() => lsGet(LOCALSTORAGE_KEYS.corsProxy) || "");
  const [showProxy, setShowProxy] = useState(false);
  const abortRef = useRef(false);

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const saveProxy = (url: string) => {
    setProxyUrl(url);
    if (url) lsSet(LOCALSTORAGE_KEYS.corsProxy, url);
    else lsRemove(LOCALSTORAGE_KEYS.corsProxy);
  };

  // ============================================================
  // Run ALL tests (编排: network → ws → AI → DB)
  // ============================================================

  const runAllTests = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    const allResults: TestResult[] = [];

    toast.info("开始全链路连接测试...", { style: toastStyle, duration: 2000 });

    // 1. Network
    if (!abortRef.current) {
      const net = await runNetworkTest(proxyUrl || undefined);
      allResults.push(net);
      setResults([...allResults]);
    }

    // 2. WebSocket
    if (!abortRef.current) {
      const ws = await runWebSocketTest();
      allResults.push(ws);
      setResults([...allResults]);
    }

    // 3. AI providers (configured models)
    for (const cm of configuredModels) {
      if (abortRef.current) break;
      const provider = providers.find((p) => p.id === cm.providerId);
      if (!provider) continue;
      const res = await runAIProviderTest(
        cm.providerId,
        cm.providerLabel,
        cm.baseUrl,
        provider.authType,
        cm.apiKey,
        cm.model,
        provider.isLocal,
        cm.proxyUrl || proxyUrl || undefined,
      );
      allResults.push(res);
      setResults([...allResults]);
    }

    // If no configured models, test all providers with a probe
    if (configuredModels.length === 0) {
      for (const p of providers) {
        if (abortRef.current) break;
        const model = p.models[0] || "test";
        const res = await runAIProviderTest(
          p.id, p.label, p.baseUrl, p.authType, "", model, p.isLocal, proxyUrl || undefined,
        );
        allResults.push(res);
        setResults([...allResults]);
      }
    }

    // 4. Database connections
    for (const db of dbConnections) {
      if (abortRef.current) break;
      const res = await runDBTest(db);
      allResults.push(res);
      setResults([...allResults]);
    }

    saveResults(allResults);
    setRunning(false);

    const passCount = allResults.filter((r) => r.overallStatus === "pass").length;
    const failCount = allResults.filter((r) => r.overallStatus === "fail").length;
    const warnCount = allResults.filter((r) => r.overallStatus === "warn").length;
    toast.success(`测试完成: ${passCount} 通过 / ${warnCount} 警告 / ${failCount} 失败`, { style: toastStyle, duration: 4000 });
  }, [configuredModels, providers, dbConnections, proxyUrl]);

  const stopTests = () => { abortRef.current = true; };

  const clearResults = () => {
    setResults([]);
    clearStoredResults();
    toast.info("测试结果已清空", { style: toastStyle });
  };

  // ============================================================
  // Stats
  // ============================================================

  const stats = {
    total: results.length,
    pass: results.filter((r) => r.overallStatus === "pass").length,
    fail: results.filter((r) => r.overallStatus === "fail").length,
    warn: results.filter((r) => r.overallStatus === "warn").length,
  };

  const sysName = env("SYSTEM_NAME");

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,255,136,0.1)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              全链路服务连接测试
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {sysName} · AI / DB / WS / Network 全方位诊断
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowProxy(!showProxy)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <Shield className="w-3.5 h-3.5" />
            CORS 代理
          </button>
          <button
            onClick={clearResults}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            清空
          </button>
          {running ? (
            <button
              onClick={stopTests}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(255,51,102,0.15)] border border-[rgba(255,51,102,0.3)] text-[#ff3366] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <XCircle className="w-4 h-4" />
              停止测试
            </button>
          ) : (
            <button
              onClick={runAllTests}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.3)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <Play className="w-4 h-4" />
              一键全部测试
            </button>
          )}
        </div>
      </div>

      {/* ======== CORS Proxy Config ======== */}
      {showProxy && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#ffaa00]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>CORS 代理配置</h3>
          </div>
          <p className="text-[rgba(0,212,255,0.35)] mb-3" style={{ fontSize: "0.68rem" }}>
            浏览器安全策略禁止前端直接调用外部 API。配置 CORS 代理可绕过此限制。
          </p>
          <div className="flex items-center gap-2 mb-2">
            <input
              value={proxyUrl}
              onChange={(e) => saveProxy(e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] focus:outline-none focus:border-[rgba(0,212,255,0.4)] font-mono"
              style={{ fontSize: "0.75rem" }}
            />
            {proxyUrl && (
              <button onClick={() => saveProxy("")} className="p-2 rounded-lg text-[rgba(255,51,102,0.5)] hover:text-[#ff3366]">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.65rem" }}>
            <p className="text-[rgba(0,212,255,0.4)] mb-1">快速启动 CORS 代理:</p>
            <div className="space-y-1 font-mono text-[rgba(224,240,255,0.5)]">
              <p># 方法 1: cors-anywhere</p>
              <p className="text-[#00d4ff]">npx cors-anywhere --port 8080</p>
              <p className="mt-1"># 方法 2: local-cors-proxy</p>
              <p className="text-[#00d4ff]">npx local-cors-proxy --proxyUrl https://api.openai.com --port 8010</p>
              <p className="mt-1"># 方法 3: Nginx 反向代理 (生产推荐)</p>
              <p className="text-[rgba(224,240,255,0.3)]">location /api-proxy/ {"{"} proxy_pass https://api.openai.com/; {"}"}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ======== 环境检测面板 ======== */}
      <EnvironmentDetectionPanel />

      {/* ======== Stats ======== */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.total}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>测试项</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#00ff88]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.pass}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>通过</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ffaa00]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.warn}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>警告</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ff3366]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.fail}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>失败</p>
        </GlassCard>
      </div>

      {/* ======== Quick Test Buttons ======== */}
      <GlassCard className="p-4">
        <h3 className="text-[#e0f0ff] mb-3" style={{ fontSize: "0.88rem" }}>
          快速单项测试
        </h3>
        <div className="flex flex-wrap gap-2">
          <QuickTestButton label="网络连通性" icon={Network} color="#00d4ff" onClick={async () => {
            const r = await runNetworkTest(proxyUrl || undefined);
            setResults((prev) => { const next = [r, ...prev.filter((p) => p.id !== r.id)]; saveResults(next); return next; });
          }} />
          <QuickTestButton label="WebSocket" icon={Radio} color="#7b2ff7" onClick={async () => {
            const r = await runWebSocketTest();
            setResults((prev) => { const next = [r, ...prev.filter((p) => p.id !== r.id)]; saveResults(next); return next; });
          }} />
          {providers.filter(p => p.isLocal).map((p) => (
            <QuickTestButton key={p.id} label={p.label} icon={Server} color="#00ff88" onClick={async () => {
              const model = p.models[0] || "llama3:8b";
              const r = await runAIProviderTest(p.id, p.label, p.baseUrl, p.authType, "", model, true);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
          {providers.filter(p => !p.isLocal).slice(0, 4).map((p) => (
            <QuickTestButton key={p.id} label={p.label} icon={Globe} color="#00d4ff" onClick={async () => {
              const cm = configuredModels.find((m) => m.providerId === p.id);
              const model = cm?.model || p.models[0] || "test";
              const key = cm?.apiKey || "";
              const r = await runAIProviderTest(p.id, p.label, p.baseUrl, p.authType, key, model, false, cm?.proxyUrl || proxyUrl || undefined);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
          {dbConnections.slice(0, 3).map((db) => (
            <QuickTestButton key={db.id} label={db.name} icon={Database} color="#336791" onClick={async () => {
              const r = await runDBTest(db);
              setResults((prev) => { const next = [r, ...prev.filter((pr) => pr.id !== r.id)]; saveResults(next); return next; });
            }} />
          ))}
        </div>
      </GlassCard>

      {/* ======== Results ======== */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[#e0f0ff] px-1" style={{ fontSize: "0.88rem" }}>
            测试结果 ({results.length})
          </h3>
          {results.map((r) => (
            <ResultCard
              key={r.id}
              result={r}
              expanded={expanded[r.id] ?? false}
              onToggle={() => toggleExpand(r.id)}
            />
          ))}
        </div>
      )}

      {/* ======== Empty State ======== */}
      {results.length === 0 && !running && (
        <GlassCard className="p-8 text-center">
          <Activity className="w-10 h-10 text-[rgba(0,212,255,0.15)] mx-auto mb-3" />
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
            点击「一键全部测试」开始诊断
          </p>
          <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.68rem" }}>
            将测试: {providers.length} 个 AI 服务商 · {dbConnections.length} 个数据库 · WebSocket · 网络连通性
          </p>
        </GlassCard>
      )}

      {/* ======== Diagnostics Reference ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>诊断参考</h3>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DiagnosticCard
            title="CORS 跨域问题"
            color="#ffaa00"
            items={[
              "浏览器安全沙箱禁止前端直接访问不同域的 API",
              "Ollama: 设置 OLLAMA_ORIGINS=\"*\" 后重启",
              "云 API: 使用 CORS 代理或后端转发",
              "生产环境: Nginx 反向代理 (推荐)",
            ]}
          />
          <DiagnosticCard
            title="数据库连接"
            color="#336791"
            items={[
              "浏览器无法建立 TCP/Socket 连接",
              "方案 A: PostgREST / Hasura 暴 REST 接口",
              "方案 B: 后端 API 代理 SQL 请求",
              "方案 C: Supabase / PlanetScale 云数据库",
            ]}
          />
          <DiagnosticCard
            title="API Key 认证"
            color="#00d4ff"
            items={[
              "Z.ai: Bearer Token (官方 SDK 模式)",
              "OpenAI: Authorization: Bearer {key}",
              "Kimi / DeepSeek: 同 OpenAI 格式",
              "Ollama: 无需认证",
            ]}
          />
          <DiagnosticCard
            title="本地部署拓扑"
            color="#00ff88"
            items={[
              "Dashboard: 192.168.3.x:3118 (前端)",
              "Ollama: localhost:11434 (推理引擎)",
              "PostgreSQL: localhost:5433",
              "Redis: localhost:6379",
            ]}
          />
        </div>
      </GlassCard>
    </div>
  );
}
