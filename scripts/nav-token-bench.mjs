#!/usr/bin/env node
/**
 * nav-token-bench.mjs — 可导航性 token 评测 (Phase 4-4.1 最小版, bench.py 思路)
 * ==========================================================================
 *
 * 思路来源: 上游 AI 项目仓库基准 (bench.py) — 「为定位一个符号需读取的 token 数」。
 * 本脚本为零依赖启发式简化版:
 *   1. 解析 src/** 的静态 import 图 (from "./...")
 *   2. 从入口 (src/main.tsx) BFS 到每个目标文件的最短路径
 *   3. 导航成本 = 路径上全部文件 chars/4 (token 近似)
 *
 * ※ token 为 chars/4 近似估算, 非 tiktoken 精确值 — 仅用于同脚本口径下的相对对比。
 *
 * 用法:
 *   node scripts/nav-token-bench.mjs <root1> [root2 ...] [--label 名1,名2,...] [--json out.json]
 *
 * 典型场景 (上帝文件拆分前后对比, Phase 4-4.1 触发条件):
 *   git archive 37fe765^ | tar -x -C /tmp/nb-a   (批7 拆分前)
 *   git archive bef1cea^ | tar -x -C /tmp/nb-b   (批8 拆分前)
 *   git archive HEAD      | tar -x -C /tmp/nb-c   (当前)
 *   node scripts/nav-token-bench.mjs /tmp/nb-a /tmp/nb-b /tmp/nb-c --label 批7前,批8前,HEAD
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

/* ── CLI ─────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const roots = [];
const labels = [];
let jsonOut = null;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--label") labels.push(...argv[++i].split(","));
  else if (argv[i] === "--json") jsonOut = argv[++i];
  else roots.push(resolve(argv[i]));
}
if (roots.length === 0) {
  console.error("用法: node scripts/nav-token-bench.mjs <root1> [root2 ...] [--label a,b,c] [--json out.json]");
  process.exit(1);
}
const labelOf = (i) => labels[i] ?? basename(roots[i]) ?? `root-${i + 1}`;

/* ── 评测目标 (功能域 × 语义锚点, 文件不存在则跳过 → 支持历史版本) ── */

const ENTRY = "src/main.tsx";
const TARGET_DOMAINS = [
  { name: "DataEditor", files: ["src/app/components/DataEditorPanel.tsx", "src/app/components/data-editor/"] },
  { name: "AIFamilyDoc", files: ["src/app/components/AIFamilyDesignDoc.tsx", "src/app/components/ai-family-doc/"] },
  { name: "ServiceTest", files: ["src/app/components/ServiceConnectionTest.tsx", "src/app/components/service-test/"] },
];

/* ── 文件收集与 import 图 ─────────────────────────────── */

function collectSrcFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(relative(root, p).split("\\").join("/"));
    }
  };
  walk(join(root, "src"));
  return new Set(files);
}

// 静态 import + 动态 import() (routes.ts lazy 路由表是主链路, 缺一不可)
const STATIC_IMPORT_RE = /from\s+["'](\.[^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["'](\.[^"']+)["']/g;

function resolveImport(root, fromRel, spec, fileSet) {
  const base = join(root, dirname(fromRel), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const c of candidates) {
    const rel = relative(root, c).split("\\").join("/");
    if (fileSet.has(rel)) return rel;
  }
  return null;
}

function buildGraph(root, fileSet) {
  const graph = new Map();
  for (const f of fileSet) {
    const deps = [];
    const text = readFileSync(join(root, f), "utf8");
    for (const re of [STATIC_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
      for (const m of text.matchAll(re)) {
        const dep = resolveImport(root, f, m[1], fileSet);
        if (dep && dep !== f) deps.push(dep);
      }
    }
    graph.set(f, deps);
  }
  return graph;
}

function bfs(graph, entry, target) {
  const queue = [[entry]];
  const seen = new Set([entry]);
  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === target) return path;
    for (const next of graph.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

/* ── 成本估算 ────────────────────────────────────────── */

const tokensOf = (root, rel) => Math.round(readFileSync(join(root, rel), "utf8").length / 4);

/** 目录目标 → 目录下全部文件; 文件目标 → 单文件; 不存在 → [] */
function expandTarget(root, t) {
  const abs = join(root, t);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isDirectory()) {
    return [...collectSrcFiles(root)].filter((f) => f.startsWith(t));
  }
  return [t];
}

function evalRoot(root) {
  const fileSet = collectSrcFiles(root);
  const hasEntry = fileSet.has(ENTRY);
  const graph = hasEntry ? buildGraph(root, fileSet) : null;
  const domains = TARGET_DOMAINS.map((d) => {
    const targets = [];
    for (const t of d.files) {
      for (const f of expandTarget(root, t)) {
        const selfTokens = tokensOf(root, f);
        const path = graph ? bfs(graph, ENTRY, f) : null;
        targets.push({
          file: f,
          selfTokens,
          depth: path ? path.length - 1 : null,
          navTokens: path ? path.reduce((acc, n) => acc + tokensOf(root, n), 0) : null,
          status: !graph ? "no-entry" : path ? "ok" : "unreachable",
        });
      }
    }
    const oks = targets.filter((t) => t.status === "ok");
    return {
      name: d.name,
      targets,
      maxNavTokens: oks.length > 0 ? Math.max(...oks.map((t) => t.navTokens)) : null,
      maxSelfTokens: targets.length > 0 ? Math.max(...targets.map((t) => t.selfTokens)) : null,
    };
  });
  return { root, entryExists: hasEntry, fileCount: fileSet.size, domains };
}

/* ── 输出 ────────────────────────────────────────────── */

const results = roots.map(evalRoot);

const mdLines = [];
mdLines.push("# 可导航性 token 评测摘要 (Phase 4-4.1 最小版)");
mdLines.push("");
mdLines.push("> token = chars/4 近似估算 (非 tiktoken 精确值), 仅用于同脚本口径下的相对对比。");
mdLines.push("> 导航成本 = 入口 src/main.tsx → 目标 BFS 最短 import 路径上全部文件 token 之和。");
mdLines.push("");
for (const r of results) {
  const idx = results.indexOf(r);
  mdLines.push(`## ${labelOf(idx)} (${r.fileCount} 个 TS 文件, 入口${r.entryExists ? "存在" : "缺失"})`);
  mdLines.push("");
  mdLines.push("| 功能域 | 目标文件 | 自身 tok | 深度 | 导航成本 tok | 状态 |");
  mdLines.push("| --- | --- | --- | --- | --- | --- |");
  for (const d of r.domains) {
    for (const t of d.targets) {
      mdLines.push(
        `| ${d.name} | ${t.file} | ${t.selfTokens} | ${t.depth ?? "—"} | ${t.navTokens ?? "—"} | ${t.status} |`
      );
    }
    if (d.targets.length === 0) mdLines.push(`| ${d.name} | (目标不存在) | — | — | — | absent |`);
  }
  mdLines.push("");
}
mdLines.push("## 功能域对比 (域内最大导航成本)");
mdLines.push("");
mdLines.push(`| 功能域 | ${results.map((_, i) => labelOf(i)).join(" | ")} |`);
mdLines.push(`| --- | ${results.map(() => "---").join(" | ")} |`);
for (const d of TARGET_DOMAINS) {
  const cells = results.map((r) => {
    const dom = r.domains.find((x) => x.name === d.name);
    return dom?.maxNavTokens != null ? dom.maxNavTokens : "—";
  });
  mdLines.push(`| ${d.name} | ${cells.join(" | ")} |`);
}
mdLines.push("");

const markdown = mdLines.join("\n");
console.log(markdown);

if (jsonOut) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        meta: {
          tokenApprox: "chars/4 (非 tiktoken 精确值, 仅相对对比)",
          entry: ENTRY,
          roots: roots.map((r, i) => ({ label: labelOf(i), path: r })),
        },
        results,
      },
      null,
      2
    )
  );
  console.log(`JSON 已写入: ${jsonOut}`);
}
