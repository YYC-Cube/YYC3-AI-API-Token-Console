#!/usr/bin/env node
/**
 * guardrail-probe.mjs — 门禁有效性探针 (P0-3 / 2026-09-24)
 * ==========================================================
 * 背景: 2026-09-24 审核发现两条架构防腐门禁 (eslint-plugin-boundaries 分层契约 +
 *       ast-grep 结构化守护) 均因「工具升级 + 配置语法脱节」而静默失效 — 门禁空心
 *       但 CI 绿灯 (useWebSocketData→stores 跨层、裸 new WebSocket 双双漏检)。
 * 探针: 运行时植入已知违规样本, 断言门禁必须拦截 (exit ≠ 0)。若某条门禁未拦截
 *       (exit = 0), 判定该门禁再次失效并阻断 CI — 从根上杜绝「门禁本身需要防腐」。
 *
 * 用法: node scripts/guardrail-probe.mjs  (或 pnpm guardrail-probe)
 * 退出码: 0 = 全部拦截成功 / 1 = 存在门禁失效 (已知违规未被拦截)
 *
 * 探针清单:
 *   1. ast-grep 裸 WebSocket (.ts)  → no-bare-websocket
 *   2. ast-grep 裸 WebSocket (.tsx) → no-bare-websocket-tsx
 *   3. eslint 分层契约 hooks→stores → boundaries/dependencies
 */

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

// 探针样本统一放在 hooks element 下 (临时创建 + 强制清理, 不进 git):
//   - ast-grep 规则 files=src/** (ignores 仅 network-utils.ts 与 __tests__), 覆盖 .ts/.tsx
//   - boundaries 规则以「已知 element」为 from 才触发 (unknown element 默认不检查)
const PROBE_DIR = join(process.cwd(), "src/app/hooks/__guardrail_probe__");

const ASTGREP = "node_modules/@ast-grep/cli/ast-grep";
const ESLINT = "node_modules/.bin/eslint";

/** 执行命令, 返回 { exit, output } (不抛异常) */
function run(cmd) {
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    return { exit: 0, output };
  } catch (e) {
    const code = typeof e.status === "number" ? e.status : 1;
    return { exit: code, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const results = [];

/**
 * 植入样本 → 跑门禁 → 断言「必须拦截 (exit ≠ 0)」→ 清理。
 * @param name 探针名称
 * @param files 样本文件列表 [{ name, content }]
 * @param runGate 门禁执行器, 接收样本绝对路径数组, 返回 run() 结果
 */
function expectIntercepted(name, files, runGate) {
  // 先清残留 (上次异常中断), 再写入样本
  rmSync(PROBE_DIR, { recursive: true, force: true });
  mkdirSync(PROBE_DIR, { recursive: true });

  const paths = files.map(({ name, content }) => {
    const p = join(PROBE_DIR, name);
    writeFileSync(p, content, "utf8");
    // 关键: 传相对路径 — ast-grep 规则 files glob (src/**) 对命令行绝对路径不匹配 (0.45.3 实测)
    return relative(process.cwd(), p);
  });

  try {
    const { exit, output } = runGate(paths);
    if (exit !== 0) {
      results.push({ name, ok: true, detail: `已拦截 (exit ${exit})` });
    } else {
      results.push({
        name,
        ok: false,
        detail: "⚠️ 未拦截 — 门禁失效!",
        output,
      });
    }
  } catch (e) {
    results.push({ name, ok: false, detail: `探针执行异常: ${e.message}` });
  } finally {
    rmSync(PROBE_DIR, { recursive: true, force: true });
  }
}

// ── 探针 1: ast-grep 裸 WebSocket (.ts) ──
expectIntercepted(
  "ast-grep 裸 WebSocket (.ts)",
  [{ name: "probe-ws.ts", content: 'const ws = new WebSocket("ws://localhost:9999");\nvoid ws;\n' }],
  () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, "probe-ws.ts"))}`)
);

// ── 探针 2: ast-grep 裸 WebSocket (.tsx) ──
expectIntercepted(
  "ast-grep 裸 WebSocket (.tsx)",
  [{ name: "probe-ws.tsx", content: 'const ws = new WebSocket("ws://localhost:9999");\nvoid ws;\n' }],
  () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, "probe-ws.tsx"))}`)
);

// ── 探针 3: eslint 分层契约 hooks→stores 跨层 ──
expectIntercepted(
  "eslint 分层契约 hooks→stores 跨层",
  [{ name: "probe-boundary.ts", content: 'import { nodeStore } from "../../stores/dashboard-stores";\nexport const probe = nodeStore;\n' }],
  () => run(`${ESLINT} ${join(PROBE_DIR, "probe-boundary.ts")}`)
);

// ── 报告 ──
const ICON = { true: "✓", false: "✗" };
console.log("\n🛡️ 门禁有效性探针\n" + "=".repeat(50));
for (const r of results) {
  console.log(`${ICON[r.ok]} ${r.name.padEnd(34)} ${r.detail}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log("=".repeat(50));
console.log(
  `结果: ${results.length - failed}/${results.length} 门禁有效` +
  (failed ? ` · ${failed} 失效 ⛔` : "") +
  "\n"
);

if (failed > 0) {
  for (const r of results) {
    if (!r.ok && r.output) {
      console.log(`── ${r.name} 门禁输出 ──\n${r.output.slice(0, 800)}`);
    }
  }
  console.log("⛔ 门禁失效 — 已知违规未被拦截。请检查工具版本升级是否导致配置脱节。");
  process.exit(1);
}

console.log("门禁全有效 — 分层契约与结构化守护均在真实拦截违规。");
