#!/usr/bin/env node
/**
 * smart-audit.mjs — YYC³ 全链路多维智能审计 (2026-10-05)
 * ==========================================================
 * 用法: pnpm smart:audit — 一键串联十维度质量门禁并产出双格式报告
 *
 * 维度 (智能合并: 单测与覆盖率一次运行产出双指标):
 *   1 typecheck · 2 lint · 3+4 unit+coverage · 5 build · 6 astgrep
 *   7 size:check · 8 knip · 9 guardrail-probe · 10 doctor
 *
 * 智能特性:
 *   - 每维度限时防挂 + 失败自动摘录尾部日志 + 判例库提示
 *   - 覆盖率四指标从 coverage-summary.json 提取并与 vitest thresholds 比对
 *   - 报告: 控制台 Markdown 表 + smart-audit-report.json (机器可读)
 *
 * 退出码: 0 全绿 / 1 存在失败维度
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const REPORT_JSON = "smart-audit-report.json";
const COVERAGE_SUMMARY = "coverage/coverage-summary.json";

// ── 维度定义: cmd / 超时 / 指标提取器 ─────────────────────────
/** @typedef {{ id: string, name: string, cmd: string[], timeoutMs: number, metrics?: (out: string) => Record<string, string|number> }} Dim */

const DIMS = [
  { id: "typecheck", name: "TypeScript strict", cmd: ["pnpm", "typecheck"], timeoutMs: 180_000,
    hint: "判例: append 用例后 vitest 过 ≠ 类型过, 门禁必须完整重跑" },
  { id: "lint", name: "ESLint + boundaries", cmd: ["pnpm", "lint"], timeoutMs: 180_000 },
  { id: "test-coverage", name: "单测 + 覆盖率 (智能合并)", cmd: ["pnpm", "test:coverage"], timeoutMs: 420_000,
    metrics: (out) => {
      const m = {};
      const t = out.match(/Tests\s+(\d+) passed \((\d+)\)/);
      if (t) { m.testsPassed = Number(t[1]); m.testsTotal = Number(t[2]); }
      const d = out.match(/Duration\s+([\d.]+)s/);
      if (d) m.durationS = Number(d[1]);
      return m;
    },
    hint: "覆盖率失败先看 thresholds (90/85/80/88) 与四指标差距" },
  { id: "build", name: "Vite 生产构建 + 预缓存注入", cmd: ["pnpm", "build"], timeoutMs: 180_000,
    metrics: (out) => {
      const m = {};
      const n = out.match(/已注入 (\d+) 项产物清单 \(([\d.]+) KB\)/);
      if (n) { m.precacheItems = Number(n[1]); m.precacheKB = Number(n[2]); }
      const w = out.match(/预热体积 ([\d.]+) MB ≤ 阈值 (\d+) MB/);
      if (w) { m.prewarmMB = Number(w[1]); m.prewarmThresholdMB = Number(w[2]); }
      return m;
    } },
  { id: "astgrep", name: "ast-grep 反模式 (7 规则)", cmd: ["pnpm", "astgrep"], timeoutMs: 60_000 },
  { id: "size", name: "文件体量门禁", cmd: ["pnpm", "size:check"], timeoutMs: 60_000 },
  { id: "knip", name: "死代码基线", cmd: ["node", "scripts/knip-check.mjs"], timeoutMs: 120_000 },
  { id: "guardrail", name: "门禁有效性探针", cmd: ["pnpm", "guardrail-probe"], timeoutMs: 120_000 },
  { id: "doctor", name: "环境自诊断 (12 项)", cmd: ["pnpm", "doctor"], timeoutMs: 120_000,
    hint: "Node 主版本必须 =22 (PATH 判例见操作手册第 24/25 章)" },
];

/** 执行单维度: 超时守护 + 尾部日志摘录 */
function runDim(dim) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(dim.cmd[0], dim.cmd.slice(1), { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let out = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      out += `\n[smart-audit] 超时 ${dim.timeoutMs / 1000}s 被终止`;
      child.emit("close", 124, null);
    }, dim.timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      clearTimeout(timer);
      const ok = code === 0;
      const metrics = ok && dim.metrics ? dim.metrics(out) : {};
      resolve({
        id: dim.id, name: dim.name, ok, exitCode: code ?? -1,
        durationMs: Date.now() - started, metrics,
        ...(ok ? {} : { hint: dim.hint ?? "查看尾部日志定位", tail: out.split("\n").slice(-15).join("\n") }),
      });
    });
  });
}

// ── 覆盖率四指标提取 + 门槛比对 ──────────────────────────────
function extractCoverage() {
  try {
    const summary = JSON.parse(readFileSync(COVERAGE_SUMMARY, "utf8")).total ?? {};
    const cfg = readFileSync("vitest.config.ts", "utf8");
    const th = {};
    for (const k of ["lines", "functions", "branches", "statements"]) {
      const m = cfg.match(new RegExp(`${k}:\\s*(\\d+)`));
      if (m) th[k] = Number(m[1]);
    }
    const metrics = {};
    let allPass = true;
    for (const k of Object.keys(th)) {
      const pct = Math.round((summary[k]?.pct ?? 0) * 100) / 100;
      metrics[k] = pct;
      metrics[`${k}Threshold`] = th[k];
      if (pct < th[k]) allPass = false;
    }
    return { ok: allPass, metrics };
  } catch (e) {
    return { ok: false, metrics: {}, error: String(e.message ?? e) };
  }
}

// ── 主流程 ───────────────────────────────────────────────────
const auditStarted = Date.now();
console.log("🧠 YYC³ Smart Audit — 全链路多维智能审计");
console.log("=".repeat(64));

const results = [];
for (const dim of DIMS) {
  process.stdout.write(`▶ ${dim.name} ... `);
  const r = await runDim(dim);
  results.push(r);
  console.log(`${r.ok ? "✅" : "❌"} ${r.durationMs >= 1000 ? (r.durationMs / 1000).toFixed(1) + "s" : r.durationMs + "ms"}`);
}

// coverage 维度独立判定 (vitest 进程退出码不含 thresholds 违例时以 summary 复核)
const testDim = results.find((r) => r.id === "test-coverage");
if (testDim?.ok) {
  const cov = extractCoverage();
  if (!cov.ok) testDim.ok = false;
  testDim.metrics = { ...testDim.metrics, ...cov.metrics };
  if (!cov.ok && cov.error) testDim.tail = `coverage-summary 解析失败: ${cov.error}`;
  if (!testDim.ok) testDim.hint = "覆盖率四指标低于 thresholds";
}

const failed = results.filter((r) => !r.ok);
const totalMs = Date.now() - auditStarted;
const passRate = Math.round(((results.length - failed.length) / results.length) * 100);

// ── 控制台 Markdown 报告 ─────────────────────────────────────
console.log("\n" + "=".repeat(64));
console.log(`📊 审计汇总: ${results.length - failed.length}/${results.length} 通过 (通过率 ${passRate}%) · 总耗时 ${(totalMs / 1000).toFixed(1)}s\n`);
console.log("| 维度 | 结果 | 耗时 | 关键指标 |");
console.log("| ---- | ---- | ---- | -------- |");
for (const r of results) {
  const m = Object.entries(r.metrics)
    .filter(([k]) => !k.endsWith("Threshold"))
    .slice(0, 4)
    .map(([k, v]) => `${k}=${v}`).join(" · ");
  console.log(`| ${r.name} | ${r.ok ? "✅" : "❌"} | ${(r.durationMs / 1000).toFixed(1)}s | ${m || "—"} |`);
}
const tc = testDim?.metrics ?? {};
if (tc.lines) {
  console.log(`\n覆盖率对门槛: lines ${tc.lines}/${tc.linesThreshold} · funcs ${tc.functions}/${tc.functionsThreshold} · branches ${tc.branches}/${tc.branchesThreshold} · stmts ${tc.statements}/${tc.statementsThreshold}`);
}
if (failed.length) {
  console.log("\n❌ 失败维度摘录:");
  for (const f of failed) {
    console.log(`\n── ${f.name} (exit ${f.exitCode}) ──\n  提示: ${f.hint}`);
    if (f.tail) console.log(f.tail.split("\n").map((l) => "  " + l).join("\n"));
  }
}

// ── 机器可读报告 ─────────────────────────────────────────────
const report = {
  _type: "yyc3-smart-audit",
  generatedAt: new Date().toISOString(),
  git: { node: process.versions.node },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, passRate, totalMs },
  dimensions: results,
};
writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
console.log(`\n📄 机器可读报告: ${REPORT_JSON}`);

process.exit(failed.length ? 1 : 0);
