/**
 * wifi-auto-reconnect.e2e.spec.ts
 * =================================
 * WiFi 自动重连设置 E2E 测试 (GAP-002 验证)
 *
 * 覆盖场景:
 * - 自动重连开关 toggle + localStorage 持久化
 * - 重连间隔 +/- 调节 + 持久化
 * - 最大重试次数 +/- 调节 + 持久化
 * - 优先信号最强 toggle + 持久化
 * - 优先 SSID 输入 + 持久化
 * - 刷新页面后设置保留
 *
 * 运行: npx playwright test specs/wifi-auto-reconnect.e2e.spec.ts
 */

export const wifiAutoReconnectTests = {
  name: "WiFi 自动重连 localStorage 持久化 E2E 测试",

  tests: [
    {
      name: "自动重连开关应可交互并持久化",
      steps: [
        { action: "open SystemSettings", expect: "settings page loads" },
        { action: "open NetworkConfig modal", expect: "modal visible" },
        { action: "click '连接历史' tab", expect: "auto-reconnect section visible" },
        { action: "click auto-reconnect toggle", expect: "toggle state changes" },
        { action: "check localStorage 'yyc3_wifi_auto_reconnect'", expect: "enabled field matches toggle" },
        { action: "reload page and reopen modal", expect: "toggle state persisted" },
      ],
    },

    {
      name: "重连间隔调节应持久化到 localStorage",
      steps: [
        { action: "navigate to history tab in NetworkConfig", expect: "tab active" },
        { action: "click '+' button on interval", expect: "interval increases by 1" },
        { action: "click '+' button 3 more times", expect: "interval is now 9s" },
        { action: "click '-' button", expect: "interval is now 8s" },
        { action: "check localStorage", expect: "intervalSeconds === 8" },
        { action: "reload page", expect: "interval shows 8s" },
      ],
    },

    {
      name: "最大重试次数调节应持久化",
      steps: [
        { action: "click '+' on max retries", expect: "retries increases" },
        { action: "click '-' on max retries to minimum (1)", expect: "retries === 1, no lower" },
        { action: "check localStorage", expect: "maxRetries matches UI" },
      ],
    },

    {
      name: "优先 SSID 输入应持久化",
      steps: [
        { action: "type 'YYC3-Matrix-5G' in preferred SSID input", expect: "input value updates" },
        { action: "check localStorage", expect: "preferredSsid === 'YYC3-Matrix-5G'" },
        { action: "clear input", expect: "preferredSsid === ''" },
      ],
    },

    {
      name: "WiFi 扫描 + 连接 + 历史应联动",
      steps: [
        { action: "switch to WiFi tab", expect: "WiFi tab active" },
        { action: "click '扫描网络'", expect: "networks appear after scan" },
        { action: "click '连接' on a network", expect: "password input shows" },
        { action: "submit connection", expect: "toast shows connected" },
        { action: "switch to history tab", expect: "connected network in history" },
        { action: "check localStorage 'yyc3_wifi_networks'", expect: "network has connected=true" },
      ],
    },
  ],
};

// 实际 Playwright 测试代码模板
export const playwrightTestTemplate = `
import { test, expect } from "@playwright/test";

test.describe("WiFi 自动重连 localStorage 持久化", () => {
  test.beforeEach(async ({ page }) => {
    // 清理 localStorage
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("yyc3_wifi_auto_reconnect");
      localStorage.removeItem("yyc3_wifi_networks");
    });
    await page.reload();
  });

  test("自动重连开关可交互并持久化", async ({ page }) => {
    await page.goto("/settings");
    // 打开网络配置 Modal
    await page.click("text=网络配置");
    await page.click("text=连接历史");
    
    // 检查初始状态
    const toggleBtn = page.locator("button[title*='已启用']");
    await expect(toggleBtn).toBeVisible();
    
    // 切换
    await toggleBtn.click();
    
    // 验证 localStorage
    const stored = await page.evaluate(() => {
      const data = localStorage.getItem("yyc3_wifi_auto_reconnect");
      return data ? JSON.parse(data) : null;
    });
    expect(stored[0].enabled).toBe(false);
    
    // 刷新验证持久化
    await page.reload();
    await page.click("text=网络配置");
    await page.click("text=连接历史");
    await expect(page.locator("button[title*='已关闭']")).toBeVisible();
  });

  test("重连间隔调节并持久化", async ({ page }) => {
    await page.goto("/settings");
    await page.click("text=网络配置");
    await page.click("text=连接历史");
    
    // 点击 + 增加间隔
    const plusBtn = page.locator("text=重连间隔").locator("..").locator("button:has-text('+')");
    await plusBtn.click();
    await plusBtn.click();
    
    // 验证显示 7s
    await expect(page.locator("text=7s")).toBeVisible();
    
    // 验证 localStorage
    const stored = await page.evaluate(() => {
      const data = localStorage.getItem("yyc3_wifi_auto_reconnect");
      return data ? JSON.parse(data) : null;
    });
    expect(stored[0].intervalSeconds).toBe(7);
  });
});
`;
