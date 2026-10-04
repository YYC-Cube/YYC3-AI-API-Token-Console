/**
 * e2e/models.spec.ts — /models 提供商矩阵渲染守护 (批18 临时探针固化 / §8.3 P2)
 * ==========================================================================
 * 背景: 批18 曾以临时 Playwright 探针实证 10 家新提供商 10/10 渲染 (PROBE PASS),
 *       本文件将其固化为常驻 e2e 守护 — providers 声明式扩容后渲染回归即时拦截。
 * 断言层次:
 *   1. 路由冒烟 — /console/models 挂载成功 (200 + SPA 根渲染)
 *   2. UI 登录 + 24 提供商 label 全量渲染 (18 云 + 6 本地, builtin-providers.json 单一事实源)
 *   3. 页面健康 — /models 全程零页面错误 (对齐批18 探针口径)
 * 前置: playwright.config.ts webServer 已启动 console 生产服务器 (VITE_BASE=/console/)
 * 限流约束: 服务端登录限流 5 次/5 分钟/IP — 本文件登录 2 次 + auth.spec 2 次 = 4 次 ≤ 5,
 *           新增用例须复用登录态或评估限流窗口, 不得盲目加 login()
 * 维护约定: builtin-providers.json 扩容/改名后, 同步更新本文件 label 数组
 */
import { expect, test, type Page } from "@playwright/test";

/** 与 src/app/config/providers/builtin-providers.json 对齐 (2026-10-05, 24 提供商) */
const CLOUD_PROVIDERS = [
  "Z.ai",
  "Z.ai-plan",
  "Kimi-CN",
  "Kimi-Global",
  "DeepSeek",
  "火山引擎",
  "火山引擎 Plan",
  "OpenAI",
  "Anthropic",
  "Google Gemini",
  "阿里云百炼 (Qwen)",
  "腾讯混元",
  "讯飞星火",
  "MiniMax",
  "阶跃星辰",
  "xAI (Grok)",
  "硅基流动",
  "OpenRouter",
] as const;

const LOCAL_PROVIDERS = [
  "Ollama (本地)",
  "YYC³ 网关 (0379-World)",
  "YYC³ ComfyUI (文生图)",
  "YYC³ SyncNet (口型评分)",
  "YYC³ TTS (piper 配音)",
  "YYC³ MiniMax-H3 (图生视频)",
] as const;

/** 与 playwright.config.ts webServer.env 注入的测试凭据一致 */
const CORRECT_PASSWORD = "e2e-test-password";

/**
 * console 形态 UI 登录 (真实用户路径):
 * App.tsx 前端门卫未认证渲染 Login → supabaseClient console 分支
 * POST /console/auth/login 签发 HttpOnly Cookie → authenticated → 主应用
 */
async function login(page: Page) {
  await page.goto("/console/");
  await page.getByPlaceholder("输入密码").fill(CORRECT_PASSWORD);
  await page.getByRole("button", { name: /登\s*录/ }).click();
  // 登录成功标志: 登录表单消失 (主应用接管渲染)
  await expect(page.getByPlaceholder("输入密码")).toBeHidden({ timeout: 10_000 });
}

test("路由冒烟 — /console/models 挂载成功", async ({ page }) => {
  const res = await page.goto("/console/models");
  expect(res?.status()).toBe(200);
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("提供商 24 家全量渲染 — UI 登录后云端 18 + 本地 6", async ({ page }) => {
  await login(page);
  await page.goto("/console/models");
  // exact 匹配消除「火山引擎 / 火山引擎 Plan」「Z.ai / Z.ai-plan」前缀包含
  for (const label of CLOUD_PROVIDERS) {
    await expect(
      page.getByText(label, { exact: true }).first(),
      `云端提供商缺失: ${label}`
    ).toBeVisible({ timeout: 15_000 });
  }
  for (const label of LOCAL_PROVIDERS) {
    await expect(
      page.getByText(label, { exact: true }).first(),
      `本地提供商缺失: ${label}`
    ).toBeVisible({ timeout: 15_000 });
  }
});

test("页面健康 — /models 全程零页面错误", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await login(page);
  await page.goto("/console/models");
  // 等待懒加载路由 chunk 与提供商卡片稳定 (首个云端 label 可见即渲染完成)
  await expect(page.getByText("DeepSeek", { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });
  expect(pageErrors, `页面错误: ${pageErrors.join(" | ")}`).toHaveLength(0);
});
