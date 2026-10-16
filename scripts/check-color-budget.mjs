#!/usr/bin/env node
/**
 * check-color-budget.mjs — 硬编码色值基线门禁 (S3 治理留账 D, 2026-10-16)
 * ==========================================================
 * 背景: CP-IM 暗色体系存量 ~6080 处 hex/rgba 直写, Design Tokens (types/design-system.ts)
 *       已建未全量接线。全量迁移为长期批; 本门禁冻结存量基线 — 只减不增:
 *       新增硬编码色值即阻断, 迫使增量代码走 tokens; 存量迁移批落地后同步下调基线。
 *
 * 口径 (与 2026-10-16 S3 审计取证一致, 变更口径须同步换算基线):
 *   扫描 src/app/components + src/app/hooks, 排除 __tests__
 *   计数正则: /#[0-9a-fA-F]{3,8}\b 与 rgba?( 全部出现次数 (含注释/字符串, 从宽从严)
 *
 * 用法: node scripts/check-color-budget.mjs   (或 pnpm color:check)
 * 退出码: 0 = 未超基线 / 1 = 超基线 (阻断)
 * 基线更新纪律: 仅允许下调 (迁移批落地时人工编辑 color-budget.json 并附原因+日期)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BASELINE_FILE = join(ROOT, "scripts", "color-budget.json");
const SCAN_DIRS = ["src/app/components", "src/app/hooks"];
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
const EXCLUDE = /__tests__|\.test\.|\.spec\./;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !EXCLUDE.test(p)) yield p;
  }
}

let count = 0;
/** @type {Record<string, number>} */
const byFile = {};
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const text = readFileSync(file, "utf8");
    const n = (text.match(COLOR_RE) ?? []).length;
    if (n > 0) {
      count += n;
      byFile[relative(ROOT, file)] = n;
    }
  }
}

if (!existsSync(BASELINE_FILE)) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify({ baseline: count, lockedAt: new Date().toISOString().slice(0, 10), note: "色值基线只减不增 (scripts/check-color-budget.mjs 口径); 下调须附迁移批说明", topFiles: Object.fromEntries(Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10)) }, null, 2)}\n`);
  console.log(`color-budget: 基线首建 ${count} (scripts/color-budget.json)`);
  process.exit(0);
}

const { baseline, lockedAt } = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
if (count > baseline) {
  const diff = count - baseline;
  const offenders = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([f, n]) => `  ${f}: ${n}`).join("\n");
  console.error(`color-budget: FAIL — 硬编码色值 ${count} > 基线 ${baseline} (+${diff}, 基线锁定于 ${lockedAt})`);
  console.error(`  新增代码必须走 Design Tokens (types/design-system.ts); 存量迁移后人工下调基线 (禁止上调)`);
  console.error(`  Top files:\n${offenders}`);
  process.exit(1);
}
const delta = baseline - count;
console.log(`color-budget: PASS — ${count}/${baseline} (余量 ${delta}${delta > 0 ? ", 可下调基线" : ""})`);
