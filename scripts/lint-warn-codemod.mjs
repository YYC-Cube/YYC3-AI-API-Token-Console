#!/usr/bin/env node
/**
 * lint-warnings 渐进治理 codemod v2 (安全模式强化)
 * 仅处理: ESLint 报告的 no-unused-vars 中「import 声明的命名绑定」移除。
 * 安全边界 (v2 教训加固):
 *   1. 多行 import 的【中间行】绝不整行删除 — 只逐名摘除, 且摘除该名后行内剩余
 *      绑定必须仍以合法分隔形态存在 (逗号闭合)
 *   2. eslint 复验通过后, 再跑【全量 tsc --noEmit】; 失败则回滚本文件并中止
 *   3. 单绑定行 (import { X } from "..."; import Default from "...") 才允许整行删除
 *   4. 每文件移除后 vitest 相关测试不在本脚本内跑 — 由调用方跑全量 test:unit 兜底
 * 用法: node scripts/lint-warn-codemod.mjs [--dry]
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const DRY = process.argv.includes("--dry");

/** 1. 拉取 unused-vars 明细 */
const raw = execFileSync("pnpm", ["exec", "eslint", "src", "--format", "json"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const reports = JSON.parse(raw);

/** 2. 采集每个文件的待移除绑定 */
const targets = new Map(); // file -> [{line, name}]
for (const r of reports) {
  const binds = [];
  for (const m of r.messages) {
    if (m.ruleId !== "@typescript-eslint/no-unused-vars") continue;
    if (!/is defined but never used/.test(m.message)) continue;
    const name = m.message.match(/^'([^']+)'/)?.[1];
    if (!name || name.startsWith("_")) continue;
    binds.push({ line: m.line, name });
  }
  if (binds.length) targets.set(r.filePath, binds);
}

let changedFiles = 0;
let removedBinds = 0;
let skippedFiles = 0;
const rolledBack = [];

for (const [file, binds] of targets) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  /** 判定 line-1 是否位于某个 import 声明内 (单行或多行) */
  const importSpans = []; // {start, end}
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import[\s{]*$/.test(lines[i]) || /^\s*import\b.*from\s*['"]/.test(lines[i])) {
      let end = i;
      while (end < lines.length - 1 && !/from\s*['"]|;\s*$/.test(lines[end])) {
        if (/from\s*['"]/.test(lines[end])) break;
        end++;
        if (/from\s*['"]/.test(lines[end])) break;
        if (end - i > 40) break; // 防失控
      }
      importSpans.push({ start: i + 1, end: end + 1 }); // 1-based 闭区间
    }
  }
  const inImport = (ln) =>
    importSpans.some(({ start, end }) => ln >= start && ln <= end);

  const dropLines = new Set();
  const rewrites = new Map(); // line -> new text

  // 3a. 分类: 找出绑定所在行是否为「单绑定 import 行」
  for (const { line, name } of binds) {
    const text = lines[line - 1] ?? "";
    if (!inImport(line)) continue; // 非导入区绑定一律跳过

    const isFullLineImport = /^\s*import\b.*from\s*['"].*['"];?\s*$/.test(text);
    if (!isFullLineImport) continue; // 多行 import 中间行 → 走 3b 摘除

    // 单行 import: 仅当行内只出现这一个绑定名时整行删除
    const boundNames = [
      ...text.match(/\{([^}]*)\}/)?.[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g) ?? [],
    ].map((m) => m[1]);
    const defaultImport = text.match(/^import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/)?.[1];
    const namesInLine = new Set([...boundNames, ...(defaultImport ? [defaultImport] : [])]);
    const codeCount = namesInLine.size || 1;
    if (codeCount === 1 && namesInLine.has(name)) {
      dropLines.add(line);
    } else {
      // 单行多绑定 → 摘除
      queueRewrite(line, name);
    }
  }

  // 3b. 多行/多绑定摘除: 逐名移除, 保持语法完整
  function queueRewrite(line, name) {
    const text = lines[line - 1];
    const occurrences = text.match(new RegExp(`\\b${esc(name)}\\b`, "g"))?.length ?? 0;
    if (occurrences !== 1) return; // 歧义跳过
    let next = text
      .replace(new RegExp(`(\\s*)\\b${esc(name)}\\b\\s*,`), "") // 后随逗号: "A, "
      .replace(new RegExp(`,\\s*\\b${esc(name)}\\b(\\s*)`), "$1") // 前随逗号: ", A"
      .replace(new RegExp(`\\b${esc(name)}\\b(\\s*)`), "$1"); // 唯一绑定
    // 语法完整性: 若摘除后该行既无绑定也无 from → 标记整行删除
    const hasBinding = /\b[A-Za-z_$][\w$]*\b/.test(next.replace(/import|from|["'`;]/g, ""));
    if (!hasBinding && !/\bfrom\b/.test(next)) {
      if (!/from\s*['"]/.test(next)) dropLines.add(line);
      return;
    }
    // 尾随/重复逗号清理
    next = next.replace(/\{\s*,/g, "{").replace(/,\s*\}/g, " }").replace(/,\s*,/g, ",");
    if (/,\s*from/.test(next)) next = next.replace(/,\s*from/, " from");
    rewrites.set(line, next);
  }

  // 3a 中单行多绑定也走摘除
  for (const { line, name } of binds) {
    const text = lines[line - 1] ?? "";
    if (dropLines.has(line) || rewrites.has(line)) continue;
    if (!inImport(line)) continue;
    const isFullLineImport = /^\s*import\b.*from\s*['"].*['"];?\s*$/.test(text);
    if (isFullLineImport && !/^\s*import\s*\{/.test(text)) continue; // default-only 已在 3a
    if (!isFullLineImport) queueRewrite(line, name);
    else if (text.match(/\{([^}]*)\}/)?.[1].split(",").filter((s) => s.trim()).length > 1) {
      queueRewrite(line, name);
    }
  }

  // 4. 应用重写与删除
  let out = lines.filter((_, i) => !dropLines.has(i + 1));
  for (const [line, text] of rewrites) {
    const idx = out.findIndex((_, i) => i + 1 === line - [...dropLines].filter((l) => l < line).length);
    if (idx >= 0) out[idx] = text;
  }
  const result = out.join("\n");
  if (result === src) {
    skippedFiles++;
    continue;
  }
  if (DRY) {
    console.log(`[dry] ${path.relative(root, file)}: 将移除 ${binds.length} 绑定`);
    continue;
  }

  // 5a. 写入 + eslint 复验
  fs.writeFileSync(file, result);
  let ok = true;
  try {
    execSync(`pnpm exec eslint ${path.relative(root, file)}`, { stdio: "pipe" });
  } catch {
    ok = false;
  }
  // 5b. tsc 全量复验 (eslint 对未定义标识符不报错, tsc 才是语义真相)
  if (ok) {
    try {
      execSync("pnpm typecheck", { stdio: "pipe" });
    } catch {
      ok = false;
    }
  }
  if (ok) {
    changedFiles++;
    removedBinds += binds.length;
  } else {
    fs.writeFileSync(file, src);
    skippedFiles++;
    rolledBack.push(path.relative(root, file));
  }
}

console.log(
  `codemod v2 完成: 文件 ${changedFiles} 个改写, 绑定移除 ${removedBinds}, 跳过 ${skippedFiles}${rolledBack.length ? `, 回滚 ${rolledBack.length}: ${rolledBack.join(", ")}` : ""}`
);

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
