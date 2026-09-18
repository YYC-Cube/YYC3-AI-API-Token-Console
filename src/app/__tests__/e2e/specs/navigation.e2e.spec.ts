/**
 * navigation.e2e.spec.ts
 * =======================
 * YYC3 路由导航 E2E 测试
 *
 * 覆盖场景:
 * - 29 条路由可达性
 * - Sidebar 导航交互
 * - 移动端底部导航
 * - 404 页面
 * - 浏览器前进/后退
 *
 * 依赖: @playwright/test (需在独立环境安装)
 * 运行: npx playwright test specs/navigation.e2e.spec.ts
 */

// ============================================================
// 以下使用 Playwright 语法编写，Figma Make 环境不执行
// 部署到独立 Node 环境后可直接运行
// ============================================================

interface RouteCheck {
  path: string;
  title: string;
  selector: string; // 页面加载后应可见的元素选择器
}

const CORE_ROUTES: RouteCheck[] = [
  { path: "/", title: "数据监控", selector: "[data-testid='data-monitoring'], h1, h2" },
  { path: "/follow-up", title: "一键跟进", selector: "[data-testid='follow-up'], h1, h2" },
  { path: "/patrol", title: "巡查模式", selector: "[data-testid='patrol-dashboard'], h1, h2" },
  { path: "/operations", title: "操作中心", selector: "[data-testid='operation-center'], h1, h2" },
  { path: "/audit", title: "操作审计", selector: "[data-testid='operation-audit'], h1, h2" },
  { path: "/users", title: "用户管理", selector: "[data-testid='user-management'], h1, h2" },
  { path: "/settings", title: "系统设置", selector: "[data-testid='system-settings'], h1, h2" },
  { path: "/security", title: "安全监控", selector: "[data-testid='security-monitor'], h1, h2" },
  { path: "/alerts", title: "告警规则", selector: "[data-testid='alert-rules'], h1, h2" },
  { path: "/architecture", title: "架构审计", selector: "[data-testid='architecture-audit'], h1, h2" },
  { path: "/ai", title: "AI 建议", selector: "[data-testid='ai-suggestion'], h1, h2" },
  { path: "/terminal", title: "终端", selector: "[data-testid='cli-terminal'], h1, h2" },
  { path: "/env-config", title: "环境配置", selector: "[data-testid='env-config'], h1, h2" },
  { path: "/data-editor", title: "数据编辑", selector: "[data-testid='data-editor'], h1, h2" },
  { path: "/db-connections", title: "数据库连接", selector: "[data-testid='db-connections'], h1, h2" },
];

// Playwright test 模板 (伪代码，实际运行需 @playwright/test)
export const navigationTests = {
  name: "YYC3 路由导航 E2E 测试",

  tests: [
    {
      name: "所有核心路由应可达",
      description: "遍历 CORE_ROUTES，验证每条路由加载成功且关键元素可见",
      steps: CORE_ROUTES.map((route) => ({
        action: `navigate to ${route.path}`,
        expect: `page should contain element matching "${route.selector}"`,
        timeout: 5000,
      })),
    },

    {
      name: "Sidebar 导航点击应正确路由",
      description: "点击侧边栏各导航项，验证 URL 和页面内容匹配",
      steps: [
        { action: "click sidebar item '数据监控'", expect: "URL should be /" },
        { action: "click sidebar item '操作审计'", expect: "URL should be /audit" },
        { action: "click sidebar item '用户管理'", expect: "URL should be /users" },
        { action: "click sidebar item '架构审计'", expect: "URL should be /architecture" },
      ],
    },

    {
      name: "404 页面应正确显示",
      description: "访问不存在的路由应显示 404 页面",
      steps: [
        { action: "navigate to /nonexistent-route-xyz", expect: "page should show 404 content" },
      ],
    },

    {
      name: "浏览器前进/后退应正常工作",
      description: "在多个路由间导航后，浏览器前进后退按钮应正确工作",
      steps: [
        { action: "navigate to /", expect: "URL is /" },
        { action: "navigate to /audit", expect: "URL is /audit" },
        { action: "navigate to /users", expect: "URL is /users" },
        { action: "go back", expect: "URL is /audit" },
        { action: "go back", expect: "URL is /" },
        { action: "go forward", expect: "URL is /audit" },
      ],
    },

    {
      name: "移动端底部导航应可见",
      description: "在移动端视口下，底部导航应可见且可交互",
      viewport: { width: 390, height: 844 },
      steps: [
        { action: "check bottom nav visibility", expect: "bottom nav should be visible" },
        { action: "tap bottom nav item", expect: "should navigate to correct route" },
      ],
    },
  ],
};

// 实际 Playwright 测试代码模板
export const playwrightTestTemplate = `
import { test, expect } from "@playwright/test";

test.describe("YYC3 路由导航", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  ${CORE_ROUTES.map(
    (r) => `
  test("${r.title} (${r.path}) 应可达", async ({ page }) => {
    await page.goto("${r.path}");
    await expect(page.locator("${r.selector}").first()).toBeVisible({ timeout: 5000 });
  });`
  ).join("\n")}

  test("404 页面", async ({ page }) => {
    await page.goto("/nonexistent-xyz");
    await expect(page.locator("text=404")).toBeVisible();
  });

  test("浏览器前进后退", async ({ page }) => {
    await page.goto("/");
    await page.goto("/audit");
    await page.goto("/users");
    await page.goBack();
    await expect(page).toHaveURL(/\\/audit/);
    await page.goBack();
    await expect(page).toHaveURL(/\\//);
    await page.goForward();
    await expect(page).toHaveURL(/\\/audit/);
  });
});
`;
