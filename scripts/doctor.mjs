#!/usr/bin/env node
/**
 * doctor.mjs — YYC³ 环境自诊断 (Phase 3 / Task 3.5)
 * ===================================================
 * 思想来源: hermes-agent「doctor 自诊断命令」(L2 重实现, YYC³ 原创代码)
 * 用法: pnpm doctor  — 新机初始化到全绿 ≤ 10 分钟的验收工具
 *
 * 检查项: Node/pnpm 版本 → 依赖策略合规 → 关键文件 → 构建链 → 环境变量
 * 退出码: 0 全绿 / 1 存在 error (warning 不影响)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const results = [];
const check = (name, fn) => {
  try {
    const detail = fn();
    results.push({ name, level: "ok", detail: detail ?? "ok" });
  } catch (e) {
    const { level = "error", detail } = e;
    results.push({ name, level, detail: detail ?? e.message });
  }
};
const fail = (detail, level = "error") => {
  throw Object.assign(new Error("check failed"), { level, detail });
};

// ── 1. 运行时版本 ──
check("Node 版本 ≥ 22", () => {
  const v = Number(process.versions.node.split(".")[0]);
  if (v < 22) fail(`当前 ${process.versions.node}, 要求 ≥ 22 (CI 同版本)`);
  return process.versions.node;
});

check("pnpm 版本 ≥ 11", () => {
  const raw = execSync("pnpm --version", { encoding: "utf8" }).trim();
  const major = Number(raw.split(".")[0]);
  if (major < 11) fail(`当前 ${raw}, 要求 ≥ 11`);
  return raw;
});

// ── 2. 依赖策略合规 (协同开发文档 §6.4) ──
check("lockfile 与 manifest 一致", () => {
  execSync("pnpm install --frozen-lockfile --offline", { stdio: "pipe" });
  return "一致";
});

check("供应链策略已启用 (8 项)", () => {
  const ws = readFileSync("pnpm-workspace.yaml", "utf8");
  const required = [
    "saveExact: true",
    "dedupeDirectDeps: true",
    "engineStrict: true",
    "strictDepBuilds: true",
    "blockExoticSubdeps: true",
    "trustPolicy: no-downgrade",
    "verifyDepsBeforeRun: install",
    "optimisticRepeatInstall: true",
  ];
  const missing = required.filter((k) => !ws.includes(k));
  if (missing.length) fail(`缺失: ${missing.join(", ")}`, "warning");
  return `${required.length} 项齐备`;
});

check("无 ^/~ 漂移的 dependencies", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const drifted = Object.entries(pkg.dependencies ?? {})
    .filter(([, v]) => /^[\^~]/.test(v))
    .map(([k]) => k);
  if (drifted.length) fail(`漂移依赖: ${drifted.join(", ")}`, "warning");
  return "0 项漂移";
});

// ── 3. 关键文件 ──
check("关键文件齐备", () => {
  const required = [
    "AGENTS.md",
    "pnpm-workspace.yaml",
    "vitest.config.ts",
    "knip.config.ts",
    "public/CNAME",
    "scripts/ast-grep/sgconfig.yml",
    "docs/YYC3-可借鉴项实施规划-上游解耦版.md",
  ];
  const missing = required.filter((f) => !existsSync(f));
  if (missing.length) fail(`缺失: ${missing.join(", ")}`);
  return `${required.length} 个关键文件在位`;
});

check("CNAME 内容正确", () => {
  const c = readFileSync("public/CNAME", "utf8").trim();
  if (c !== "token.yyc3.vip") fail(`内容 ${c} ≠ token.yyc3.vip`, "warning");
  return c;
});

// ── 4. 守护工具链可用性 ──
check("ast-grep 二进制可用", () => {
  const v = execSync("node_modules/@ast-grep/cli/ast-grep --version", { encoding: "utf8" }).trim();
  return v;
});

check("ast-grep 规则库扫描通过", () => {
  execSync("node_modules/@ast-grep/cli/ast-grep scan -c scripts/ast-grep/sgconfig.yml src/", {
    stdio: "pipe",
  });
  return "0 违规";
});

check("体量门禁通过 (§6.6)", () => {
  execSync("node scripts/check-size.mjs", { stdio: "pipe" });
  return "基线只减不增达标";
});

check("knip 基线比对通过 (Task 2.4)", () => {
  execSync("node scripts/knip-check.mjs", { stdio: "pipe" });
  return "无新死代码";
});

// ── 5. 环境变量 (本地开发可选, 非阻断) ──
check("环境变量示例文件", () => {
  const hasExample = existsSync(".env.example");
  if (!hasExample) fail("无 .env.example (建议补充环境变量清单)", "warning");
  return ".env.example 在位";
});

// ── 报告 ──
const ICON = { ok: "✓", warning: "⚠️", error: "✗" };
console.log("\n🩺 YYC³ Doctor — 环境自诊断报告\n" + "=".repeat(46));
for (const r of results) {
  console.log(`${ICON[r.level]} ${r.name.padEnd(28)} ${r.detail}`);
}
const errors = results.filter((r) => r.level === "error").length;
const warnings = results.filter((r) => r.level === "warning").length;
console.log("=".repeat(46));
console.log(`结果: ${results.length - errors}/${results.length} 通过 · ${warnings} warning · ${errors} error\n`);

if (errors > 0) {
  console.log("请优先修复 error 项; warning 项不阻断但建议处理。");
  process.exit(1);
}
console.log("环境全绿 — 可执行 pnpm dev / pnpm build / pnpm test");
