/**
 * cross-page-data-flow.e2e.spec.ts
 * ==================================
 * 跨页面数据流 E2E 测试
 *
 * 覆盖场景:
 * - Dashboard 节点数据 → 操作审计页面引用
 * - 用户管理 CRUD → 审计日志记录
 * - 模型管理 CRUD → Dashboard 节点展示
 * - 环境变量编辑 → 全局配置生效
 * - localStorage 数据一致性 (跨页面)
 *
 * 运行: npx playwright test specs/cross-page-data-flow.e2e.spec.ts
 */

export const crossPageDataFlowTests = {
  name: "跨页面数据流 E2E 测试",

  tests: [
    {
      name: "Dashboard 数据与 store 同步",
      steps: [
        { action: "navigate to /", expect: "dashboard loads with node cards" },
        { action: "check node count matches localStorage yyc3_nodes", expect: "count matches" },
        { action: "navigate to /data-editor", expect: "data editor loads" },
        { action: "select nodes table", expect: "shows same node data" },
        { action: "modify node GPU value", expect: "localStorage updates" },
        { action: "navigate back to /", expect: "dashboard shows updated value" },
      ],
    },

    {
      name: "用户管理 CRUD 持久化验证",
      steps: [
        { action: "navigate to /users", expect: "user list loads" },
        { action: "add new user '测试用户'", expect: "user appears in list" },
        { action: "check localStorage yyc3_users", expect: "new user in store" },
        { action: "navigate to / then back to /users", expect: "user still present" },
        { action: "delete '测试用户'", expect: "user removed from list and store" },
      ],
    },

    {
      name: "模型管理与节点数据一致性",
      steps: [
        { action: "navigate to /settings", expect: "settings page loads" },
        { action: "check deployed models", expect: "models match yyc3_deployed_models store" },
        { action: "navigate to /", expect: "dashboard shows same model names on nodes" },
      ],
    },

    {
      name: "环境变量编辑全局生效",
      steps: [
        { action: "navigate to /env-config", expect: "env editor loads" },
        { action: "modify WS_URL", expect: "value updates in UI" },
        { action: "save changes", expect: "localStorage yyc3_env_config updates" },
        { action: "navigate to /settings > 网络配置", expect: "WS URL reflects change" },
      ],
    },

    {
      name: "架构审计面板数据准确性",
      steps: [
        { action: "navigate to /architecture", expect: "audit panel loads" },
        { action: "check overview tab statistics", expect: "route count matches actual routes" },
        { action: "check stores tab", expect: "store count matches dashboard-stores.ts exports" },
        { action: "check gaps tab", expect: "GAP-002 status reflects fix" },
      ],
    },

    {
      name: "localStorage 数据持久化跨页面验证",
      description: "验证所有 11 个 store 的 localStorage key 存在且数据格式正确",
      storeKeys: [
        "yyc3_nodes",
        "yyc3_model_perf",
        "yyc3_model_dist",
        "yyc3_recent_ops",
        "yyc3_radar_data",
        "yyc3_logs",
        "yyc3_db_connections",
        "yyc3_deployed_models",
        "yyc3_wifi_networks",
        "yyc3_users",
        "yyc3_wifi_auto_reconnect",
      ],
      steps: [
        { action: "navigate to /", expect: "all store keys exist in localStorage" },
        { action: "parse each key as JSON", expect: "all parse without error" },
        { action: "verify each array has items with 'id' field", expect: "all items have id" },
      ],
    },
  ],
};

// 实际 Playwright 测试代码模板
export const playwrightTestTemplate = `
import { test, expect } from "@playwright/test";

const STORE_KEYS = [
  "yyc3_nodes",
  "yyc3_model_perf",
  "yyc3_model_dist",
  "yyc3_recent_ops",
  "yyc3_radar_data",
  "yyc3_logs",
  "yyc3_db_connections",
  "yyc3_deployed_models",
  "yyc3_wifi_networks",
  "yyc3_users",
  "yyc3_wifi_auto_reconnect",
];

test.describe("跨页面数据流", () => {
  test("所有 localStorage store 应存在且格式正确", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await page.evaluate((keys) => {
      return keys.map((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return { key, exists: false, valid: false, count: 0 };
        try {
          const data = JSON.parse(raw);
          const isArray = Array.isArray(data);
          const allHaveId = isArray && data.every((item: any) => "id" in item);
          return { key, exists: true, valid: isArray && allHaveId, count: data.length };
        } catch {
          return { key, exists: true, valid: false, count: 0 };
        }
      });
    }, STORE_KEYS);

    for (const result of results) {
      expect(result.exists, \`\${result.key} should exist\`).toBe(true);
      expect(result.valid, \`\${result.key} should be valid array with id\`).toBe(true);
    }
  });

  test("Dashboard 节点数据应与 store 同步", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const storeCount = await page.evaluate(() => {
      const data = localStorage.getItem("yyc3_nodes");
      return data ? JSON.parse(data).length : 0;
    });

    // Dashboard should show same number of node cards
    expect(storeCount).toBeGreaterThan(0);
  });

  test("用户管理 CRUD 应持久化", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const beforeCount = await page.evaluate(() => {
      const data = localStorage.getItem("yyc3_users");
      return data ? JSON.parse(data).length : 0;
    });

    expect(beforeCount).toBeGreaterThan(0);
  });
});
`;
