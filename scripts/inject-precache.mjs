#!/usr/bin/env node
/**
 * inject-precache.mjs — 构建后产物清单注入 (批12 OBS-5)
 * ========================================================
 * 扫描 dist/assets/ 产物, 将清单注入 dist/sw.js 的 PRECACHE_MANIFEST 占位符,
 * 使 SW install 阶段预热全部 lazy chunk — 断网深链(未访问路由)离线直达可用。
 *
 * 设计约束:
 *   - 零依赖 (node:fs 原生实现, 延续手写 SW 的供应链纪律)
 *   - 清单存相对 scope 形式 ("assets/xxx"), sw.js 内 new URL(path, scope)
 *     按部署根自动解析 — 根路径(GitHub Pages)与子路径(VITE_BASE=/console/)通用
 *   - 只注入 /assets/ 下 js/css (immutable 内容 hash); 图标等静态资源走 SWR 无需预热
 *   - 幂等: 占位符缺失(重复运行/已注入)则报错退出, 防止静默漏注入
 *
 * 用法: pnpm build && node scripts/inject-precache.mjs
 * (已挂接 package.json build 末尾, 勿单独手工调用)
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SW_PATH = join(DIST, "sw.js");
const PLACEHOLDER = "const PRECACHE_MANIFEST = [];";

async function listAssets(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listAssets(join(dir, entry.name), rel)));
    } else if (/\.(js|css)$/.test(entry.name)) {
      const { size } = await stat(join(dir, entry.name));
      out.push({ path: rel, size });
    }
  }
  return out;
}

const sw = await readFile(SW_PATH, "utf8");
if (!sw.includes(PLACEHOLDER)) {
  console.error(
    "[inject-precache] 占位符未找到 — dist/sw.js 可能已被注入或 sw.js 源文件被改动, 拒绝盲写"
  );
  process.exit(1);
}

const assets = await listAssets(join(DIST, "assets"), "assets").catch(() => {
  console.error("[inject-precache] dist/assets/ 不存在 — 请先 pnpm build");
  process.exit(1);
});

if (assets.length === 0) {
  console.error("[inject-precache] dist/assets/ 无 js/css 产物, 异常构建, 拒绝注入空清单");
  process.exit(1);
}

const manifest = assets.map((a) => `"${a.path}"`).join(",\n  ");
const injected = sw.replace(
  PLACEHOLDER,
  `const PRECACHE_MANIFEST = [\n  ${manifest},\n];`
);
await writeFile(SW_PATH, injected, "utf8");

const totalKB = (assets.reduce((s, a) => s + a.size, 0) / 1024).toFixed(1);
console.log(
  `[inject-precache] ✓ 已注入 ${assets.length} 项产物清单 (${totalKB} KB) → dist/sw.js`
);

// ---- 预热体积观测 (批13) ----------------------------------------------------
// 全量预热的代价: 首次 install 多下载 totalKB (后台进行, 不阻塞首屏, 二次访问零成本)。
// 基线 99 项/2981KB (2026-09-29); 阈值默认 6MB ≈ 当前翻倍 — 超限提示改为核心路由
// 子集预热 (衔接报告 §8.3 P3 观测项)。PREWARM_WARN_MB 环境变量可调, 非阻断。
const warnMB = Number(process.env.PREWARM_WARN_MB ?? 6);
const totalMB = Number(totalKB) / 1024;
if (totalMB > warnMB) {
  console.log(
    `::warning::预热清单 ${totalMB.toFixed(1)} MB 超阈值 ${warnMB} MB (${assets.length} 项) — ` +
    `建议评审改为核心路由子集预热 (清单过滤需扩展本脚本)`
  );
} else {
  console.log(
    `[inject-precache] 预热体积 ${totalMB.toFixed(2)} MB ≤ 阈值 ${warnMB} MB (观测正常)`
  );
}
