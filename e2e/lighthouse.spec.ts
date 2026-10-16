/**
 * e2e/lighthouse.spec.ts — Lighthouse Performance 基线 (S9-P1 / backlog L-02, 2026-10-17)
 * =====================================================================
 * 背景: dlx 与 devDep@13 均被 pnpm 供应链守卫拦 (传递依赖 bidi@157 接管疑警) —
 *       降版 lighthouse 12.6.1 (依赖树干净) 以 devDep 精确锁定落地。
 * 目标: webServer (生产 console-server + VITE_BASE=/console/ 构建产物) 上跑
 *       desktop preset Performance 审计, 断言 ≥90 并归档分数趋势。
 * 浏览器: 复用 playwright 的 Chrome for Testing (CHROME_PATH), 不另装 Chrome。
 * 限流: 纯页面加载不触发登录 → 不占 5/5min 预算。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** 在 playwright 缓存中解析 Chrome for Testing 主二进制 (版本随 @playwright/test 锁定) */
function resolveChrome(): string {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  for (const d of readdirSync(cache)) {
    if (!d.startsWith("chromium-")) continue;
    for (const cand of [
      join(cache, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
      join(cache, d, "chrome-linux/chrome"),
      join(cache, d, "chrome-win/chrome.exe"),
    ]) {
      if (existsSync(cand)) return cand;
    }
  }
  throw new Error("Chrome for Testing 未找到 — 先 pnpm exec playwright install chromium");
}

const THRESHOLD = 90;
const BASE = "http://127.0.0.1:3199/console/";
const OUT = "docs/audit/lighthouse-trend.jsonl";

test("Lighthouse Performance 基线 — desktop preset ≥90", () => {
  test.setTimeout(180_000);
  const chrome = resolveChrome();
  const raw = execFileSync(
    "node_modules/.bin/lighthouse",
    [
      BASE,
      "--preset=desktop",
      "--only-categories=performance",
      "--output=json",
      "--output-path=stdout",
      "--quiet",
      `--chrome-path=${chrome}`,
      "--chrome-flags=--headless=new --no-sandbox",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const report = JSON.parse(raw) as { categories: { performance: { score: number | null } }; audits: Record<string, { displayValue?: string }> };
  const score = Math.round((report.categories.performance.score ?? 0) * 100);
  const metrics = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]
    .map((k) => `${k}=${report.audits[k]?.displayValue ?? "?"}`)
    .join(" ");

  // 趋势归档 (追加 JSONL; 目录常在 — 由审计流程保证, 首次自建)
  try {
    writeFileSync(OUT, `${JSON.stringify({ ts: new Date().toISOString(), score, metrics })}\n`, { flag: "a" });
  } catch {
    writeFileSync(OUT, `${JSON.stringify({ ts: new Date().toISOString(), score, metrics })}\n`);
  }
  void readFileSync;

  console.log(`[lighthouse] perf=${score} | ${metrics}`);
  expect(score, `Lighthouse Performance ${score} < ${THRESHOLD}: ${metrics}`).toBeGreaterThanOrEqual(THRESHOLD);
});
