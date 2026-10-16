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
 * 探针清单 (2026-10-16 扩至 7 规则 × 双语言全覆盖, S7 留账闭环):
 *   1. ast-grep 裸 WebSocket (.ts)  → no-bare-websocket
 *   2. ast-grep 裸 WebSocket (.tsx) → no-bare-websocket-tsx
 *   3. eslint 分层契约 hooks→stores → boundaries/dependencies
 *   4. ast-grep 裸 localStorage (.ts)  → no-raw-localstorage
 *   5. ast-grep 裸 localStorage (.tsx) → no-raw-localstorage-tsx
 *   6/7.  ast-grep document.write (.ts/.tsx)   → no-document-write(-tsx)
 *   8/9.  ast-grep innerHTML 赋值 (.ts/.tsx)   → no-innerhtml-assignment(-tsx)
 *   10/11. ast-grep 硬编码密钥 (.ts/.tsx)      → no-hardcoded-secret-literal(-tsx)
 *   12/13. ast-grep process.env 直读 (.ts/.tsx) → no-process-env-in-src(-tsx)
 *   14/15. ast-grep 字符串定时器 (.ts/.tsx)    → no-string-timer(-tsx)
 * 复合门禁探针 (S10 扩容, 2026-10-16 — 与真实门禁同源):
 *   16. tsc 类型错误样本 (双旗标项目内)         → pnpm typecheck
 *   17. gitleaks secret 样本 (隔离 tmpdir+仓库 config) → 同款命令
 *   18. knip 孤儿导出样本 (exports 基线外+1)    → node scripts/knip-check.mjs
 *   19. size 基线文件 +1 行 (受控变异→断言→恢复) → pnpm size:check
 *   20. coverage 阈值抬至 100 (子集必不达)      → vitest --coverage thresholds
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

// ── 探针 4: ast-grep 裸 localStorage (.ts) ──
expectIntercepted(
  "ast-grep 裸 localStorage (.ts)",
  [{ name: "probe-ls.ts", content: 'const v = localStorage.getItem("k");\nvoid v;\n' }],
  () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, "probe-ls.ts"))}`)
);

// ── 探针 5: ast-grep 裸 localStorage (.tsx) ──
expectIntercepted(
  "ast-grep 裸 localStorage (.tsx)",
  [{ name: "probe-ls.tsx", content: 'const v = localStorage.getItem("k");\nvoid v;\n' }],
  () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, "probe-ls.tsx"))}`)
);

// ── 探针 6/7: ast-grep document.write ──
for (const ext of ["ts", "tsx"]) {
  expectIntercepted(
    `ast-grep document.write (.${ext})`,
    [{ name: `probe-dw.${ext}`, content: 'document.write("<b>x</b>");\n' }],
    () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, `probe-dw.${ext}`))}`)
  );
}

// ── 探针 8/9: ast-grep innerHTML 赋值 ──
for (const ext of ["ts", "tsx"]) {
  expectIntercepted(
    `ast-grep innerHTML 赋值 (.${ext})`,
    [{ name: `probe-ih.${ext}`, content: 'const el = document.createElement("div");\nel.innerHTML = "<b>x</b>";\nvoid el;\n' }],
    () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, `probe-ih.${ext}`))}`)
  );
}

// ── 探针 10/11: ast-grep 硬编码密钥字面量 ──
// 样本为规则 regex 的探测形态 (sk_live_ + 16 位), 非真实凭据 — 规则命中即证明拦截有效
for (const ext of ["ts", "tsx"]) {
  expectIntercepted(
    `ast-grep 硬编码密钥 (.${ext})`,
    [{ name: `probe-secret.${ext}`, content: 'const k = "sk_live_ABCDEFGHIJKLMNOPQRST";\nvoid k;\n' }],
    () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, `probe-secret.${ext}`))}`)
  );
}

// ── 探针 12/13: ast-grep process.env 直读 ──
for (const ext of ["ts", "tsx"]) {
  expectIntercepted(
    `ast-grep process.env 直读 (.${ext})`,
    [{ name: `probe-pe.${ext}`, content: 'const v = process.env.NODE_ENV;\nvoid v;\n' }],
    () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, `probe-pe.${ext}`))}`)
  );
}

// ── 探针 14/15: ast-grep 字符串定时器 ──
for (const ext of ["ts", "tsx"]) {
  expectIntercepted(
    `ast-grep 字符串定时器 (.${ext})`,
    [{ name: `probe-st.${ext}`, content: 'setTimeout("doWork()", 100);\n' }],
    () => run(`${ASTGREP} scan -c scripts/ast-grep/sgconfig.yml ${relative(process.cwd(), join(PROBE_DIR, `probe-st.${ext}`))}`)
  );
}

// ── 探针 16: tsc 类型错误样本 (项目内, 双旗标真拦截) ──
expectIntercepted(
  "tsc 类型错误样本",
  [{ name: "probe-tsc.ts", content: "export const __probeTypeErr: number = \"not-a-number\";\n" }],
  () => run("pnpm exec tsc --noEmit --pretty false")
);

// ── 探针 17: gitleaks secret 样本 (隔离 tmpdir, 与生产同 config 同源) ──
{
  // 样本为规则探测形态 (ghp_+高熵随机串), 非真实凭据。判例 (S10, 2026-10-16):
  // ① gitleaks GitHub Old Token 规则要求 ≥36 位 (ast-grep 侧 30+, 两库阈值不同);
  // ② 含字母表序列的低熵样本会被 gitleaks stopwords 反误报机制豁免 — 样本必须高熵无序列。
  // allowlist 不覆盖 ghp_ 形态 → 必须命中。
  const GL_DIR = "/tmp/__guardrail_gl_probe__";
  rmSync(GL_DIR, { recursive: true, force: true });
  mkdirSync(GL_DIR, { recursive: true });
  writeFileSync(join(GL_DIR, "leak.txt"), 'token = "ghp_7xQm2Kv9Zb4Nt8Fs3Jp6Hy1Cd5Rg0Lw2VnQ5e"\n', "utf8");
  const r17 = run(`gitleaks detect --no-git --source ${GL_DIR} --config .gitleaks.toml --no-banner --redact`);
  results.push({ name: "gitleaks secret 样本", ok: r17.exit !== 0, detail: r17.exit !== 0 ? `已拦截 (exit ${r17.exit})` : "⚠️ 未拦截 — 门禁失效!", output: r17.output });
  rmSync(GL_DIR, { recursive: true, force: true });
}

// ── 探针 18: knip 孤儿导出样本 (exports 基线 7 外 +1) ──
expectIntercepted(
  "knip 孤儿导出样本",
  [{ name: "probe-knip.ts", content: "export const __probeUnusedExport = 1;\n" }],
  () => run("node scripts/knip-check.mjs")
);

// ── 探针 19: size 基线文件受控变异 (+1 行 → 断言 → finally 恢复原文) ──
// size 门禁走 git ls-files, 探针新文件不可见 — 唯一同源形态是临时改动基线内受跟踪文件
{
  const TARGET = join(process.cwd(), "src/app/components/ServiceConnectionTest.tsx");
  const original = readFileSync(TARGET, "utf8");
  try {
    writeFileSync(TARGET, `${original}\n`, "utf8");
    const r19 = run("node scripts/check-size.mjs");
    results.push({ name: "size 基线 +1 行样本", ok: r19.exit !== 0, detail: r19.exit !== 0 ? `已拦截 (exit ${r19.exit})` : "⚠️ 未拦截 — 门禁失效!", output: r19.output });
  } finally {
    writeFileSync(TARGET, original, "utf8");
  }
}

// ── 探针 20: coverage 阈值执法 (阈值抬至 100, 单文件子集必不达) ──
{
  // 与生产同执链 (vitest thresholds 强制): 覆盖率退化在真实门禁同样 exit≠0 (R8 判例 78.3% 阻断)
  const r20 = run("pnpm exec vitest run src/app/__tests__/http.test.ts --coverage --coverage.thresholds.lines=100 --coverage.thresholds.branches=100 --coverage.reporter=text-summary");
  results.push({ name: "coverage 阈值执法样本", ok: r20.exit !== 0, detail: r20.exit !== 0 ? `已拦截 (exit ${r20.exit})` : "⚠️ 未拦截 — 门禁失效!", output: r20.output });
}

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
