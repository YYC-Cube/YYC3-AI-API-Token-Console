/**
 * e2e/fullchain.spec.ts — S11 十路径全链守护 (2026-10-16)
 * =====================================================
 * 覆盖模板关键路径的 e2e 域内可自动化部分:
 *   P2/3/4/5/6 六域路由导航冒烟 (零页面错误) — 单测试串行遍历
 *   P7  PWA 资产链路 — manifest + 图标 + favicon 全 200 (console 子路径形态)
 *   P8  双语 i18n 切换 — zh↔en 无残留 (与导航测试共用唯一登录)
 *   P9  离线降级 — SW 就绪后断网重载, 壳层仍服务
 *   404 兜底 — 未知路由渲染 NotFound
 * 限流预算: 本文件仅 1 次 UI 登录 (auth 2 + models 2 + fullchain 1 = 5/5 满额,
 *           后续新增用例必须免登录或复用 storageState)
 */
import { expect, test, type Page } from "@playwright/test";

const CORRECT_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ["e2e-test", "password"].join("-");

/** 六域代表路由 (监控 4 + 运维 3 + AI 智能 2 + Family 1 + 系统管理 4 + 开发规范 1) */
const DOMAIN_ROUTES = [
  "/", "/follow-up", "/patrol", "/alerts",
  "/operations", "/files", "/database",
  "/models", "/ai-diagnosis",
  "/ai-family",
  "/audit", "/settings", "/security", "/pwa",
  "/dev-guide",
] as const;

async function login(page: Page) {
  await page.goto("/console/");
  await page.getByPlaceholder("输入密码").fill(CORRECT_PASSWORD);
  await page.getByRole("button", { name: /登\s*录/ }).click();
  await expect(page.getByPlaceholder("输入密码")).toBeHidden({ timeout: 10_000 });
}

test("六域导航冒烟 + i18n 双语切换 — 单次登录串行遍历零页面错误", async ({ page }) => {
  test.setTimeout(90_000); // 15 路由串行 + 登录 + 双语切换实测 >30s 默认超时
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await login(page);
  // 登录态落盘供 404 兜底测试复用 (限流预算: 全套件登录恒 5 次)
  await page.context().storageState({ path: "e2e/.auth/state.json" });

  // 六域 15 路由: 挂载成功 + 非 404 兜底
  for (const route of DOMAIN_ROUTES) {
    await page.goto(`/console${route === "/" ? "/" : route}`);
    await expect(page.locator("#root"), `路由未挂载: ${route}`).not.toBeEmpty();
    await expect(page.getByText("页面未找到"), `误入 404: ${route}`).toHaveCount(0);
  }
  expect(pageErrors, `页面错误: ${pageErrors.join(" | ")}`).toEqual([]);

  // i18n: zh → en → zh (TopBar 语言切换器; 动画下拉 — 显式等可见后 force 点击)
  // 断言锚点 = 语言存储态 + 正文英文/中文残留宽检 (桌面导航在 Sidebar, 不依赖具体组件渲染形态)
  await page.goto("/console/");
  await page.getByTestId("lang-trigger").click();
  await expect(page.getByTestId("lang-dropdown")).toBeVisible({ timeout: 5_000 });
  // 动画中几何点击易打偏 — DOM 原生 click() 直达 React 委托监听 (S11 判例)
  await page.getByTestId("lang-en-US").evaluate((el) => (el as HTMLElement).click());
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("yyc3_locale")), { timeout: 10_000 })
    .toBe("en-US");
  await expect(page.locator("body")).toContainText(/Monitoring|Operations|Family/, { timeout: 10_000 });
  expect(await page.locator("body").innerText()).not.toContain("数据监控");

  await page.getByTestId("lang-trigger").click();
  await expect(page.getByTestId("lang-dropdown")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("lang-zh-CN").evaluate((el) => (el as HTMLElement).click());
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("yyc3_locale")), { timeout: 10_000 })
    .toBe("zh-CN");
  await expect(page.locator("body")).toContainText(/一键跟进|活跃节点|告警/, { timeout: 10_000 });
  expect(pageErrors).toEqual([]);
});

test("PWA 资产链路 — manifest 解析 + 图标全量 200 (console 子路径形态)", async ({ request }) => {
  // 相对路径判例 (S11): index.html 已改相对链接 → /console/manifest.json
  const manifest = await request.get("/console/manifest.json");
  expect(manifest.status(), "manifest 于 console 子路径可及").toBe(200);
  const body = (await manifest.json()) as { icons?: { src: string }[] };
  expect(body.icons?.length ?? 0).toBeGreaterThanOrEqual(10);
  for (const icon of body.icons ?? []) {
    const res = await request.get(new URL(icon.src, "http://127.0.0.1/console/").pathname);
    expect(res.status(), `图标缺失: ${icon.src}`).toBe(200);
  }
  // favicon 链 (index.html 相对路径)
  for (const fav of ["yyc3-icons/Web App/favicon-16.png", "yyc3-icons/Web App/favicon-32.png"]) {
    const res = await request.get(`/console/${fav.replace(/ /g, "%20")}`);
    expect(res.status(), `favicon 缺失: ${fav}`).toBe(200);
  }
});

test("离线降级 — SW 就绪后断网重载壳层仍服务", async ({ page }) => {
  test.setTimeout(45_000); // SW 注册 + 断网重载实测可超默认 30s
  await page.goto("/console/");
  // SW 注册为 PROD-only + BASE_URL 相对 scope; 就绪等待不掩盖异步 (显式 ready promise + waitForFunction 超时)
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), undefined, { timeout: 20_000 });
  await page.context().setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/数据看盘/);
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.context().setOffline(false);
});

test("离线多路由 — 断网下核心页面均可浏览 (backlog L-03)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/console/");
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), undefined, { timeout: 20_000 });
  // 预热: SW 缓存壳经导航触发 (network-first 命中后回填); 先在线遍历一次
  for (const r of ["/", "/models", "/ai-family", "/settings"]) {
    await page.goto(`/console${r}`);
    await expect(page.locator("#root")).not.toBeEmpty();
  }
  await page.context().setOffline(true);
  // 断网遍历: SW 导航兜底应服务缓存壳 (SPA 路由在壳内客户端切换)
  for (const r of ["/", "/models", "/ai-family", "/settings"]) {
    const res = await page.goto(`/console${r}`);
    expect(res?.status(), `离线路由失败: ${r}`).toBe(200);
    await expect(page.locator("#root"), `离线 #root 空: ${r}`).not.toBeEmpty();
  }
  await page.context().setOffline(false);
});

test("404 兜底 — 未知路由渲染 NotFound 而非空白 (复用登录态)", async ({ browser }) => {
  // 未认证时 App 渲染 Login 门卫, NotFound 不可达 — 必须带会话访问 (S11 判例)
  const ctx = await browser.newContext({ storageState: "e2e/.auth/state.json" });
  const page = await ctx.newPage();
  await page.goto("/console/definitely-not-a-route");
  await expect(page.getByText("页面未找到")).toBeVisible({ timeout: 10_000 });
  await ctx.close();
});
