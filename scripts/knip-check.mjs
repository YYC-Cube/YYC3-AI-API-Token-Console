#!/usr/bin/env node
/**
 * knip-check.mjs — knip 基线只减不增门禁 (Phase 2 / Task 2.4)
 * ============================================================
 * knip --reporter json 输出为按文件的明细数组, 聚合计数后与
 * knip.config.ts BASELINE_COUNTS 比对:
 *   - 超基线的类别 → ::error 阻断 (新死代码禁止引入)
 *   - 低于基线     → 提示季度评审可下调
 */

import { execSync } from "node:child_process";

// 从 knip.config.ts 读取基线 (避免双处维护)
const configSrc = execSync("cat knip.config.ts", { encoding: "utf8" });
const baselineMatch = configSrc.match(/const BASELINE_COUNTS = \{([\s\S]*?)\};/);
if (!baselineMatch) {
  console.log("::error::无法解析 knip.config.ts BASELINE_COUNTS");
  process.exit(1);
}
const BASELINE = Object.fromEntries(
  [...baselineMatch[1].matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
);

let raw;
try {
  raw = execSync("npx knip --reporter json", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
} catch (e) {
  // knip 有 findings 时 exit 非零, stdout 仍带 JSON
  raw = e.stdout?.toString() ?? "";
}
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.log("::warning::knip JSON 输出解析失败, 降级为仅运行 knip (不比对基线)");
  process.exit(0);
}

// knip JSON reporter: { issues: [ { file, files, dependencies, exports, ... } ] }
// 类别 → 聚合函数 (跨所有文件条目计数)
const items = Array.isArray(report?.issues) ? report.issues : [];
const countAll = (get) => items.reduce((sum, file) => sum + get(file).length, 0);

const counts = {
  files: countAll((f) => f.files ?? []),
  dependencies: countAll((f) => f.dependencies ?? []),
  devDependencies: countAll((f) => f.devDependencies ?? []),
  exports: countAll((f) => f.exports ?? []),
  types: countAll((f) => f.types ?? []),
  duplicates: countAll((f) => f.duplicates ?? []),
  binaries: countAll((f) => f.binaries ?? []),
};

let errors = 0;
for (const [key, base] of Object.entries(BASELINE)) {
  const actual = counts[key] ?? 0;
  if (actual > base) {
    console.log(
      `::error::knip「${key}」超基线: ${base} → ${actual} — 新死代码禁止引入 (Task 2.4 只减不增铁律)`
    );
    errors++;
  } else if (actual < base) {
    console.log(`✓ knip「${key}」下降: ${base} → ${actual} (季度评审可下调基线)`);
  }
}

console.log(`\nknip-check: 基线比对完成, ${errors} error(s)`);
if (errors > 0) process.exit(1);
