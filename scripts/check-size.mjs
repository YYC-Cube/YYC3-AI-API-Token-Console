#!/usr/bin/env node
/**
 * check-size.mjs — Facade+Siblings 体量门禁 (Phase 2 / Task 2.2)
 * ================================================================
 * 规范: docs/YYC3-AI-Family-团队规范/标规文档/YYC3-团队通用-开发文档.md §6.6
 *
 * 两级判定:
 *   1) 任何文件 > MAX_LINES          → ::warning (拆分评审信号, 非阻断)
 *   2) BASELINE_FILE 基线文件行数增长 → ::error   (只减不增, 阻断)
 *
 * 基线清单随拆分进度季度更新 (规划文档 Phase 3 拆分后逐个移除)。
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const MAX_LINES = 1500; // 拆分触发阈值 (较上游收紧 25%)
// 基线: 2026-09-20 盘点锁定的超标存量文件 (§6.6.1) — 键为锁定行数
// types/index.ts (1781) 已于 2026-09-20 按 Facade+Siblings 拆分为 6 个领域
// sibling (§6.6.1 首个清零项), 从基线移出; index.ts 现 14 行 Facade
// SystemSettings.tsx (1373) 已于 2026-09-20 拆分至 settings/ 7 文件
// (主壳 193 + 6 sibling 全部 ≤306), 基线 4 → 3
const BASELINE = {
  "src/app/components/ServiceConnectionTest.tsx": 1265,
  "src/app/components/AIFamilyDesignDoc.tsx": 1217,
  "src/app/components/DataEditorPanel.tsx": 1188,
};

// 仅盘点 ts/tsx 源码 (排除测试/ui 生成物/历史归档, 与 eslint ignores 对齐)
const EXCLUDE = /(node_modules|dist|coverage|src\/app\/ci\/|src\/imports\/|__tests__\/|components\/ui\/|components\/figma\/|\.d\.ts$)/;

function listSourceFiles() {
  const out = execSync("git ls-files 'src/**/*.ts' 'src/**/*.tsx'", {
    encoding: "utf8",
  });
  return out.split("\n").filter((f) => f && !EXCLUDE.test(f));
}

let warnings = 0;
let errors = 0;
const linesOf = {};

for (const file of listSourceFiles()) {
  // 统一 wc -l 口径 (换行符计数), 与 2026-09-20 基线盘点方法一致
  const lines = parseInt(execSync(`wc -l < "${file}"`, { encoding: "utf8" }).trim(), 10);
  linesOf[file] = lines;

  if (lines > MAX_LINES && !(file in BASELINE)) {
    // 非基线文件越过阈值 → 告警并锁定为基线 (下轮起只减不增)
    console.log(
      `::warning file=${file}::文件 ${lines} 行 > ${MAX_LINES} 行阈值 — 触发 Facade+Siblings 拆分评审 (§6.6), 并已纳入基线只减不增`
    );
    warnings++;
  }

  if (file in BASELINE && lines > BASELINE[file]) {
    console.log(
      `::error file=${file}::基线文件行数增长 ${BASELINE[file]} → ${lines} — 违反「只减不增」铁律 (§6.6.1), 新逻辑请放新 sibling 文件`
    );
    errors++;
  }
}

// 基线达标提示 (清零一个移出一个)
for (const [file, locked] of Object.entries(BASELINE)) {
  if (!existsSync(file)) continue;
  const lines = linesOf[file];
  if (lines < locked) {
    console.log(`✓ ${file}: ${locked} → ${lines} 行 (基线下降 ${locked - lines} 行, 季度评审时可下调基线)`);
  }
}

console.log(`\nsize-check: ${warnings} warning(s), ${errors} error(s)`);
if (errors > 0) {
  console.log("::error::体量门禁未通过 — 基线文件行数增长禁止合入");
  process.exit(1);
}
