#!/usr/bin/env node
/**
 * check-dup-budget.mjs — 跨域重复代码基线门禁 (S8 缺口落地, 2026-10-16)
 * ==========================================================
 * 背景: 重复检测此前无自动化 (S8 如实登记)。jscpd 5.4.1 (devDep 精确锁定)
 *       token 级克隆检测, 基线冻结只减不增 — 新增重复即阻断;
 *       收缩后人工下调 scripts/dup-budget.json (禁止上调)。
 *
 * 口径 (与 2026-10-16 S8 首测一致, 变更口径须同步换算基线):
 *   范围 src/app (含 __tests__ — 测试域 mock 模式重复属可接受存量)
 *   min-tokens 70 · 跨文件克隆 · 输出 JSON 解析 clones/duplicatedLines
 *
 * 误报率评估 (入库前置, 2026-10-16): 106 克隆人工抽检 — 绝大多数为
 *   ①测试域 setup/beforeEach 重复样板 ②i18n 双语包对称键 ③mock 数据同构对象
 *   — 均为结构性重复非可抽象逻辑漂移; 逻辑级抽象机会已在 S3 类型收敛处理。
 *   基线因此按"冻结"而非"清零"设定。
 *
 * 用法: pnpm dup:check   退出码: 0 = 未超基线 / 1 = 超基线 (阻断)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASELINE_FILE = join(ROOT, "scripts", "dup-budget.json");
const MIN_TOKENS = 70;

const bin = join(ROOT, "node_modules", ".bin", "jscpd");
const out = execFileSync(bin, ["src/app", "--min-tokens", String(MIN_TOKENS), "--reporters", "json", "--output", "/tmp", "--silent"], { cwd: ROOT, encoding: "utf8" });
void out;
const report = JSON.parse(readFileSync("/tmp/jscpd-report.json", "utf8"));
const { clones, duplicatedLines } = report.statistics.total;

if (!existsSync(BASELINE_FILE)) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify({ minTokens: MIN_TOKENS, baselineClones: clones, baselineDupLines: duplicatedLines, lockedAt: new Date().toISOString().slice(0, 10), note: "重复基线只减不增 (scripts/check-dup-budget.mjs 口径); 下调须附抽象批说明" }, null, 2)}\n`);
  console.log(`dup-budget: 基线首建 clones=${clones} dupLines=${duplicatedLines}`);
  process.exit(0);
}

const { baselineClones, baselineDupLines, lockedAt } = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
const overClones = clones - baselineClones;
const overLines = duplicatedLines - baselineDupLines;
if (overClones > 0 || overLines > 0) {
  console.error(`dup-budget: FAIL — clones ${clones}>${baselineClones} (+${overClones}), dupLines ${duplicatedLines}>${baselineDupLines} (+${overLines}) (基线锁定 ${lockedAt})`);
  console.error(`  新增重复必须先抽象 (shared/contracts) 或改写; 收缩后人工下调 scripts/dup-budget.json (禁止上调)`);
  process.exit(1);
}
console.log(`dup-budget: PASS — clones ${clones}/${baselineClones}, dupLines ${duplicatedLines}/${baselineDupLines}${baselineClones - clones > 0 ? " (有收缩空间, 可下调基线)" : ""}`);
