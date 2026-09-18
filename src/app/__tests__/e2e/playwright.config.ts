/**
 * playwright.config.ts
 * =====================
 * YYC3 CloudPivot Intelli-Matrix Playwright E2E 测试配置
 *
 * 使用方式 (独立环境):
 *   npx playwright install
 *   npx playwright test
 *
 * 本文件为配置参考模板，Figma Make 环境不支持直接运行 Playwright。
 * 部署到独立 Vite/Node 环境后可直接使用。
 */

// import { defineConfig, devices } from "@playwright/test";

export const playwrightConfig = {
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "../../reports/playwright" }],
    ["json", { outputFile: "../../reports/playwright/results.json" }],
  ],
  use: {
    baseURL: "http://192.168.3.45:3118",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" as const },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" as const },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" as const },
    },
    {
      name: "Mobile Chrome",
      use: {
        browserName: "chromium" as const,
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3118",
    url: "http://192.168.3.45:3118",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

export default playwrightConfig;
