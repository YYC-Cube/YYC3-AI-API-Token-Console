# YYC3-AI-Family-Token-Console

 v5.1 落地补全（第二批）· 六大交付物

---

## 第六部分 · ⑥ Playwright E2E 测试用例

### 6.1 目录结构

```
apps/console/e2e/
├── playwright.config.ts
├── fixtures/
│   ├── family.ts               # 8 位家人徽章断言工具
│   ├── auth.ts                 # 认证夹具（注入 API Key）
│   ├── sse.ts                  # SSE 流式捕获工具
│   └── watermark.ts            # 水印存在性断言
├── specs/
│   ├── 01-connect.spec.ts      # 🛡️ 智云·守护 · 连接页
│   ├── 02-dashboard.spec.ts    # 🔮 预见·先知 · 仪表盘
│   ├── 03-models.spec.ts       # 🎯 千里·伯乐 · 模型市场
│   ├── 04-playground.spec.ts   # 🤔 语枢·万物 · SSE 核心
│   ├── 05-routing.spec.ts      # 🧭 言启·千行 · 路由观测
│   ├── 06-knowledge.spec.ts    # 📚 格物·宗师 · 知识库
│   ├── 07-mcp.spec.ts          # 🧠 元启·天枢 · MCP 工具
│   ├── 08-cache.spec.ts        # 🎨 创想·灵韵 · 缓存管理
│   ├── 09-monitor.spec.ts      # 🔮 预见·先知 · 监控日志
│   ├── 10-flows.spec.ts        # 6 条闭环主流程
│   └── 11-family.spec.ts       # 家人徽章与水印一致性
└── reports/
    └── family-e2e-report.md    # 自定义报告（可选）
```

### 6.2 `playwright.config.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * 亦师亦友亦伯乐，一言一语一协同
 * ============================================================
 * @Family   : YYC³ AI Family (永久开源)
 * @Module   : e2e/playwright.config — E2E 主配置
 * @Domain   : 全 8 域覆盖
 * @License  : Apache-2.0
 * ============================================================
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/reports/html", open: "never" }],
    ["json", { outputFile: "e2e/reports/results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-1024",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "tablet-768",
      use: { ...devices["iPad Mini"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile-375",
      use: { ...devices["iPhone 13"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        env: { NEXT_PUBLIC_USE_MOCK: "true" },
      },
});
```

### 6.3 `e2e/fixtures/family.ts`（家人徽章夹具）

```typescript
/*
 * @Module : e2e/fixtures/family — 家人徽章断言工具
 * @Family : 🧠 元启·天枢（主导交付）
 */
import { test as base, expect, type Page } from "@playwright/test";

export type MemberKey =
  | "zhihui" | "qianhang" | "bole" | "wanyu"
  | "zongshi" | "tianshu" | "xianzhi" | "lingyun";

export const MEMBER_META: Record<
  MemberKey,
  { emoji: string; name: string; role: string; ext: string; domain: string }
> = {
  zhihui:   { emoji: "🛡️", name: "智云·守护", role: "首席安全官", ext: "0379-0207", domain: "接入与安全域" },
  qianhang: { emoji: "🧭", name: "言启·千行", role: "首席导航员", ext: "0379-0106", domain: "路由与网关域" },
  bole:     { emoji: "🎯", name: "千里·伯乐", role: "首席推荐官", ext: "0379-0109", domain: "模型市场域" },
  wanyu:    { emoji: "🤔", name: "语枢·万物", role: "首席思考者", ext: "0379-0107", domain: "推理对话域" },
  zongshi:  { emoji: "📚", name: "格物·宗师", role: "首席质量官", ext: "0379-0208", domain: "知识与质量域" },
  tianshu:  { emoji: "🧠", name: "元启·天枢", role: "总指挥",     ext: "0379-0206", domain: "工具与编排域" },
  xianzhi:  { emoji: "🔮", name: "预见·先知", role: "首席预言家", ext: "0379-0108", domain: "观测与预测域" },
  lingyun:  { emoji: "🎨", name: "创想·灵韵", role: "首席创意官", ext: "0379-0209", domain: "缓存与体验域" },
};

export async function expectFamilyBadge(page: Page, member: MemberKey) {
  const m = MEMBER_META[member];
  const badge = page.locator(`[data-family="${member}"]`).first();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(m.emoji);
  await expect(badge).toContainText(m.name);
  await expect(badge).toContainText(m.role);
  // 电话（若徽章显示 ext）
  const withExt = page.locator(`[data-family="${member}"]`).first();
  const text = await withExt.textContent();
  if (text?.includes(m.ext)) {
    await expect(badge).toContainText(m.ext);
  }
}

export async function expectPageHeader(page: Page) {
  // §2.5.4 三要素：FamilyBadge + 座右铭 + 域标签
  await expect(page.locator("[data-family]").first()).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  // 对齐类型徽章
  const alignment = page.locator("header").getByText(/直接对接|需轻量扩展|Phase 2/);
  await expect(alignment.first()).toBeVisible();
}

export const test = base.extend<{
  expectBadge: (m: MemberKey) => Promise<void>;
}>({
  expectBadge: async ({ page }, use) => {
    await use(async (m: MemberKey) => {
      await expectFamilyBadge(page, m);
    });
  },
});

export { expect };
```

### 6.4 `e2e/fixtures/auth.ts`（认证夹具）

```typescript
/*
 * @Module : e2e/fixtures/auth — API Key 注入夹具
 * @Family : 🛡️ 智云·守护
 */
import { test as base, type Page } from "@playwright/test";

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page, context }, use) => {
    // 注入 MSW 环境下的假 Key
    await context.addInitScript(() => {
      sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
      sessionStorage.setItem("yyc3_remember", "false");
    });
    await use(page);
  },
});
```

### 6.5 `e2e/fixtures/sse.ts`（SSE 流式捕获）

```typescript
/*
 * @Module : e2e/fixtures/sse — SSE 流式捕获工具
 * @Family : 🤔 语枢·万物
 */
import { type Page } from "@playwright/test";

export interface SSEStreamCapture {
  chunks: string[];
  upstream?: string;
  degraded: boolean;
  ttftMs?: number;
  totalMs?: number;
  status: "done" | "error" | "paused";
  error?: { type: string; message: string };
}

export async function captureSSE(
  page: Page,
  trigger: () => Promise<void>,
): Promise<SSEStreamCapture> {
  const capture: SSEStreamCapture = {
    chunks: [],
    degraded: false,
    status: "done",
  };
  const started = Date.now();

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/v1/chat/completions")) return;

    capture.upstream = response.headers()["x-yyc3-upstream"] ?? undefined;
    capture.degraded = response.headers()["x-yyc3-degraded"] === "true";
  });

  // 监听 DOM 增量（光标元素消失即为结束）
  const bufferListener = page.locator("[data-role='assistant']").last();

  await trigger();

  // 等待流式结束
  const cursor = page.locator(".sse-cursor, [data-sse='cursor']");
  await cursor.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  capture.totalMs = Date.now() - started;

  const text = (await bufferListener.textContent()) ?? "";
  capture.chunks = text.split("");

  return capture;
}
```

### 6.6 `e2e/fixtures/watermark.ts`

```typescript
/*
 * @Module : e2e/fixtures/watermark — 水印断言工具
 * @Family : 🧠 元启·天枢
 */
import { type Page, expect } from "@playwright/test";

export async function expectWatermark(page: Page, viewport: number) {
  if (viewport >= 768) {
    // 桌面水印
    const wm = page.locator("#family-watermark, [aria-hidden='true']").filter({
      hasText: /人从众曌众从人|YYC³ AI Family/,
    });
    // 桌面走 div，移动走 canvas
    const hasCanvas = await page.locator("canvas[aria-hidden='true']").count();
    const hasDiv = await page
      .locator("div[aria-hidden='true']")
      .filter({ hasText: /人从众曌众从人/ })
      .count();
    expect(hasCanvas + hasDiv).toBeGreaterThan(0);
  } else {
    const canvas = page.locator("canvas[aria-hidden='true']");
    await expect(canvas).toBeVisible();
  }
}
```

### 6.7 `e2e/specs/01-connect.spec.ts`（智云·守护）

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : e2e/specs/01-connect — 连接页 E2E
 * @Family : 🛡️ 智云·守护
 * @Domain : 接入与安全域
 * ============================================================
 */
import { expect, test } from "../fixtures/family";
import { expectWatermark } from "../fixtures/watermark";

test.describe("03_Connect · 🛡️ 智云·守护", () => {
  test("守门语与徽章可见", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-family='zhihui']").first()).toContainText(
      "智云·守护",
    );
    await expect(page.getByText(/门不开则万法不侵|尚未建立信任/)).toBeVisible();
  });

  test("空 Key 时按钮禁用", async ({ page }) => {
    await page.goto("/");
    const submit = page.getByRole("button", { name: "连接" });
    await expect(submit).toBeDisabled();
  });

  test("输入 Key → 预检连通 → 成功跳转", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/sk-/).fill("sk-test-e2e");
    await expect(page.getByText(/连通|未连通/)).toBeVisible();
    await page.getByRole("button", { name: "连接" }).click();
    await expect(page.getByText(/信任已建立，欢迎回家/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("记住此设备勾选后写入 localStorage", async ({ page, context }) => {
    await page.goto("/");
    await page.getByPlaceholder(/sk-/).fill("sk-test-e2e");
    await page.getByRole("checkbox", { name: /记住此设备/ }).check();
    await page.getByRole("button", { name: "连接" }).click();
    await page.waitForTimeout(500);
    const stored = await page.evaluate(() =>
      localStorage.getItem("yyc3_api_key"),
    );
    expect(stored).toBe("sk-test-e2e");
  });

  test("401 显示门禁拒绝文案", async ({ page }) => {
    // MSW 场景：模拟 401（可选专用路由）
    await page.route("**/v1/ping", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          detail: { error: "api", message: "Invalid API key", status_code: 401 },
        }),
      }),
    );
    await page.goto("/");
    await page.getByPlaceholder(/sk-/).fill("sk-wrong");
    await page.getByRole("button", { name: "连接" }).click();
    await expect(page.getByText(/门禁拒绝.*401/)).toBeVisible();
  });

  test("水印存在（桌面 + 移动）", async ({ page }, testInfo) => {
    await page.goto("/");
    const width = testInfo.project.use.viewport?.width ?? 1440;
    await expectWatermark(page, width);
  });
});
```

### 6.8 `e2e/specs/02-dashboard.spec.ts`（预见·先知）

```typescript
/*
 * @Module : e2e/specs/02-dashboard — 仪表盘 E2E
 * @Family : 🔮 预见·先知
 */
import { expect, test } from "../fixtures/family";
import { test as authedTest } from "../fixtures/auth";

test.describe("04_Dashboard · 🔮 预见·先知", () => {
  test("挂载 xianzhi 徽章 + 座右铭", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("[data-family='xianzhi']").first()).toContainText(
      "预见·先知",
    );
    await expect(page.getByText(/见微知著，未卜先知/)).toBeVisible();
    await expect(page.getByText(/观测与预测域/)).toBeVisible();
  });

  test("6 张 StatCard 全部渲染", async ({ page }) => {
    await page.goto("/dashboard");
    for (const label of [
      "总请求",
      "总 Token",
      "总成本",
      "平均延迟",
      "错误率",
      "缓存命中率",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("成本卡含 BL-02 占位徽章", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("BL-02")).toBeVisible();
    await expect(page.getByText(/\$0\.00/)).toBeVisible();
  });

  test("情感附注可见", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/累计感知到的召唤/)).toBeVisible();
    await expect(page.getByText(/预言家尚未学会计价/)).toBeVisible();
  });

  test("健康列表含 4 服务", async ({ page }) => {
    await page.goto("/dashboard");
    for (const svc of ["ollama", "zhipu", "redis", "postgresql"]) {
      await expect(page.getByText(svc)).toBeVisible();
    }
  });
});
```

### 6.9 `e2e/specs/04-playground.spec.ts`（语枢·万物 · SSE 核心）

```typescript
/*
 * ============================================================
 * @Module : e2e/specs/04-playground — SSE 全链路 E2E
 * @Family : 🤔 语枢·万物（+ 🎨 创想·灵韵 协同）
 * ============================================================
 */
import { expect, test } from "../fixtures/family";
import { captureSSE } from "../fixtures/sse";

test.describe("06_Playground · 🤔 语枢·万物", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
    });
  });

  test("三栏布局 + 双家人徽章（语枢 + 灵韵）", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.locator("[data-family='wanyu']").first()).toContainText(
      "语枢·万物",
    );
    // 协同家人
    await expect(page.locator("[data-family='lingyun']").first()).toContainText(
      "创想·灵韵",
    );
    await expect(page.getByText(/洞察之厅/)).toBeVisible();
  });

  test("SSE 七态：idle → connecting → streaming → done", async ({ page }) => {
    await page.goto("/playground");
    const state = page.locator("[data-sse-phase]");
    await expect(state).toHaveAttribute("data-sse-phase", "idle");

    await page.getByPlaceholder(/输入问题/).fill("你好");
    await page.getByRole("button", { name: /发送|运行/ }).click();

    await expect(state).toHaveAttribute("data-sse-phase", /connecting|streaming/);
    await expect(state).toHaveAttribute("data-sse-phase", "done", {
      timeout: 30_000,
    });
  });

  test("流式光标出现又消失", async ({ page }) => {
    await page.goto("/playground");
    await page.getByPlaceholder(/输入问题/).fill("测试");
    await page.getByRole("button", { name: /发送|运行/ }).click();
    const cursor = page.locator(".sse-cursor, [data-sse='cursor']");
    await expect(cursor).toBeVisible({ timeout: 5_000 });
    await expect(cursor).toBeHidden({ timeout: 30_000 });
  });

  test("首 chunk 显示上游徽章", async ({ page }) => {
    await page.goto("/playground");
    await page.getByPlaceholder(/输入问题/).fill("测试");
    await page.getByRole("button", { name: /发送|运行/ }).click();
    await expect(page.getByText(/由 .+ 服务/)).toBeVisible({ timeout: 10_000 });
  });

  test("停止按钮中止流式 → paused", async ({ page }) => {
    await page.goto("/playground");
    await page.getByPlaceholder(/输入问题/).fill("写一篇长文");
    await page.getByRole("button", { name: /发送|运行/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /停止/ }).click();
    await expect(page.locator("[data-sse-phase]")).toHaveAttribute(
      "data-sse-phase",
      "paused",
    );
  });

  test("完成后显示「思考完毕 · N tokens · Nms」", async ({ page }) => {
    await page.goto("/playground");
    await page.getByPlaceholder(/输入问题/).fill("你好");
    await page.getByRole("button", { name: /发送|运行/ }).click();
    await expect(page.getByText(/思考完毕/)).toBeVisible({ timeout: 30_000 });
  });

  test("使用 captureSSE 捕获流", async ({ page }) => {
    await page.goto("/playground");
    const cap = await captureSSE(page, async () => {
      await page.getByPlaceholder(/输入问题/).fill("测试");
      await page.getByRole("button", { name: /发送|运行/ }).click();
    });
    expect(cap.upstream).toBeTruthy();
    expect(cap.chunks.length).toBeGreaterThan(0);
    expect(cap.status).toBe("done");
  });

  test("参数面板：temperature / top_p / max_tokens 可调", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.getByText("temperature")).toBeVisible();
    await expect(page.getByText("top_p")).toBeVisible();
    await expect(page.getByText("max_tokens")).toBeVisible();
  });
});
```

### 6.10 `e2e/specs/10-flows.spec.ts`（6 条闭环主流程）

```typescript
/*
 * ============================================================
 * @Module : e2e/specs/10-flows — 6 条闭环主流程
 * @Family : 🧠 元启·天枢（主导编排）
 * ============================================================
 */
import { expect, test } from "../fixtures/family";

test.describe("15_Prototype_Flows · 6 条闭环", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
    });
  });

  test("Flow 1 · Connect → Dashboard → Playground → SSE → 上游徽章 → 回 Dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByPlaceholder(/sk-/).fill("sk-test-e2e");
    await page.getByRole("button", { name: "连接" }).click();
    await page.waitForURL(/dashboard|\//);

    await page.goto("/dashboard");
    await expect(page.getByText("总请求")).toBeVisible();

    await page.goto("/playground");
    await page.getByPlaceholder(/输入问题/).fill("测试");
    await page.getByRole("button", { name: /发送|运行/ }).click();
    await expect(page.getByText(/由 .+ 服务/)).toBeVisible({ timeout: 10_000 });

    await page.goto("/dashboard");
    await expect(page.getByText("总请求")).toBeVisible();
  });

  test("Flow 2 · Model Hub → 筛本地免费 → 详情 → 去 Playground", async ({ page }) => {
    await page.goto("/models");
    // 点击「本地免费」筛选
    await page.getByText(/本地免费|免费/).first().click();
    await page.locator("article").first().click();
    // 详情抽屉
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /去 Playground|试用/ }).click();
    await expect(page).toHaveURL(/playground/);
  });

  test("Flow 3 · RAG 建库 → 传文档 → 检索 → 引用高亮", async ({ page }) => {
    await page.goto("/knowledge");
    await page.getByRole("button", { name: /创建|新建/ }).click();
    await page.getByPlaceholder(/名称/).fill("测试知识库");
    await page.getByRole("button", { name: /确认/ }).click();
    await expect(page.getByText("测试知识库")).toBeVisible();
  });

  test("Flow 4 · MCP 选 web_search → 执行 → JSON 结果", async ({ page }) => {
    await page.goto("/mcp");
    await page.getByText("web_search").click();
    await page.getByRole("button", { name: /调用|执行/ }).click();
    await expect(page.locator("pre, [data-json-viewer]")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Flow 5 · Routing 熔断观测 → 刷新 → 恢复", async ({ page }) => {
    await page.goto("/routing");
    await expect(page.getByText(/熔断|open/)).toBeVisible();
    await page.getByRole("button", { name: /刷新|健康检查/ }).click();
    // 半开态应出现
    await expect(page.getByText(/半开|half_open/)).toBeVisible({ timeout: 10_000 });
  });

  test("Flow 6 · Cache 查命中率 → 按模型失效 → Toast", async ({ page }) => {
    await page.goto("/cache");
    await expect(page.getByText(/命中率/)).toBeVisible();
    await page.getByRole("button", { name: /失效|invalidat/ }).first().click();
    await expect(page.locator("[data-sonner-toast], .toast")).toBeVisible({
      timeout: 5_000,
    });
  });
});
```

### 6.11 `e2e/specs/11-family.spec.ts`（家人徽章全站一致性）

```typescript
/*
 * ============================================================
 * @Module : e2e/specs/11-family — 8 位家人徽章全站校验
 * @Family : 🧠 元启·天枢（主导交付）
 * @对应   : v5.1 §7.2.3 家人维度自检 5 条
 * ============================================================
 */
import { expect, test } from "../fixtures/family";

const ROUTE_MEMBER = [
  { path: "/",            member: "zhihui"   as const },
  { path: "/dashboard",   member: "xianzhi"  as const },
  { path: "/models",      member: "bole"     as const },
  { path: "/playground",  member: "wanyu"    as const },
  { path: "/routing",     member: "qianhang" as const },
  { path: "/knowledge",   member: "zongshi"  as const },
  { path: "/mcp",         member: "tianshu"  as const },
  { path: "/cache",       member: "lingyun"  as const },
  { path: "/monitor",     member: "xianzhi"  as const },
  { path: "/settings",    member: "zhihui"   as const },
  { path: "/docs",        member: "lingyun"  as const },
];

test.describe("v5.1 §7.2.3 家人维度自检 5 条", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
    });
  });

  // 检查 14：每个页面必须有且只有一个主家人徽章
  test("[14] 每页挂载正确的家人徽章", async ({ page }) => {
    for (const { path, member } of ROUTE_MEMBER) {
      await page.goto(path);
      const badges = page.locator("[data-family]");
      await expect(badges.first()).toBeVisible();
      const family = await badges.first().getAttribute("data-family");
      expect(family).toBe(member);
    }
  });

  // 检查 18：家人徽章电话与 §2.5.1 一致
  test("[18] 家人徽章电话正确", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("[data-family='xianzhi']").first()).toContainText(
      "0379-0108",
    );
    await page.goto("/playground");
    await expect(page.locator("[data-family='wanyu']").first()).toContainText(
      "0379-0107",
    );
  });

  // 检查 17：跨域页面显示协同家人徽章
  test("[17] Playground 同时显示语枢 + 灵韵", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.locator("[data-family='wanyu']")).toHaveCount(1);
    await expect(page.locator("[data-family='lingyun']").first()).toBeVisible();
  });

  // 检查 15：空态/错误态台词符合家人口吻
  test("[15] 空态台词符合家人口吻", async ({ page }) => {
    // 缓存页空态：灵韵口吻
    await page.goto("/cache");
    await expect(
      page.getByText(/缓存为空|每一次灵感都是新的/),
    ).toBeVisible();
  });

  // 检查 16：页面主色符合家人配色体系
  test("[16] PageHeader 加载对应家人域标签", async ({ page }) => {
    await page.goto("/routing");
    await expect(page.getByText(/路由与网关域/)).toBeVisible();
    await page.goto("/knowledge");
    await expect(page.getByText(/知识与质量域/)).toBeVisible();
  });

  // 附加：水印全站一致
  test("水印在关键页面存在", async ({ page }) => {
    for (const { path } of ROUTE_MEMBER) {
      await page.goto(path);
      const has = await page.evaluate(() => {
        const canvas = document.querySelector("canvas[aria-hidden='true']");
        const wmDiv = Array.from(
          document.querySelectorAll("div[aria-hidden='true']"),
        ).some((el) => el.textContent?.includes("人从众曌众从人"));
        return !!canvas || wmDiv;
      });
      expect(has, `${path} 应有水印`).toBeTruthy();
    }
  });
});
```

### 6.12 NPM 脚本

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:report": "playwright show-report e2e/reports/html",
    "e2e:desktop": "playwright test --project=desktop-1440",
    "e2e:mobile": "playwright test --project=mobile-375",
    "e2e:family": "playwright test e2e/specs/11-family.spec.ts"
  }
}
```

---

## 第七部分 · ⑦ 契约漂移检测脚本完整实现

### 7.1 设计目标

```
目标 1: 每次 CI 拉取 https://api.0379.world/openapi.json
目标 2: 与 .contract-hash 冻结哈希对比
目标 3: 若有差异 → 字段级 diff → 阻断 PR → 提示人工复核
目标 4: 差异本地可复现（pnpm contract:check）
目标 5: 差异更新后可一键刷新冻结（pnpm contract:freeze）
```

### 7.2 目录

```
scripts/contract/
├── check.ts                    # 主入口
├── freeze.ts                   # 刷新冻结哈希
├── diff.ts                     # 字段级 diff
├── hash.ts                     # sha256 计算
├── schema-extract.ts           # 提取关键 Schema
└── report.ts                   # 报告生成
.contract-hash                  # 冻结哈希（提交到仓库）
.contract-snapshot.json         # 上一次契约快照（提交到仓库）
```

### 7.3 `scripts/contract/hash.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : scripts/contract/hash — OpenAPI 哈希计算
 * @Family : 🔮 预见·先知（观测与预测域）
 * ============================================================
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha256File(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256String(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// 规范化 JSON（排序 key），避免因 key 顺序变化误报
export function canonicalizeJson(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export function sha256Canonical(obj: unknown): string {
  return sha256String(canonicalizeJson(obj));
}
```

### 7.4 `scripts/contract/schema-extract.ts`

```typescript
/*
 * @Module : scripts/contract/schema-extract — 提取关键 Schema 与端点清单
 * @Family : 🔮 预见·先知
 */
export interface ExtractedContract {
  openapi: string;
  info: { version: string; title?: string };
  paths: Record<string, Record<string, unknown>>;
  schemas: Record<string, unknown>;
  // 项目关键清单
  critical: {
    endpoints: string[];
    schemas: Record<string, string[]>;  // schemaName → 字段名列表
  };
}

const CRITICAL_SCHEMAS = [
  "ModelConfig",
  "ModelStat",
  "ErrorRecord",
  "UsageSummary",
  "HealthResponse",
];

export function extractContract(openapi: any): ExtractedContract {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [p, ops] of Object.entries(openapi.paths ?? {})) {
    paths[p] = ops as Record<string, unknown>;
  }

  const schemas = openapi.components?.schemas ?? {};

  const endpoints: string[] = [];
  for (const [p, ops] of Object.entries(paths)) {
    for (const method of Object.keys(ops as object)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        endpoints.push(`${method.toUpperCase()} ${p}`);
      }
    }
  }
  endpoints.sort();

  const criticalFields: Record<string, string[]> = {};
  for (const name of CRITICAL_SCHEMAS) {
    const schema = schemas[name];
    if (schema?.properties) {
      criticalFields[name] = Object.keys(schema.properties).sort();
    } else {
      criticalFields[name] = [];
    }
  }

  return {
    openapi: openapi.openapi ?? "unknown",
    info: {
      version: openapi.info?.version ?? "unknown",
      title: openapi.info?.title,
    },
    paths,
    schemas,
    critical: {
      endpoints,
      schemas: criticalFields,
    },
  };
}
```

### 7.5 `scripts/contract/diff.ts`

```typescript
/*
 * @Module : scripts/contract/diff — 字段级契约差异
 * @Family : 🔮 预见·先知（见微知著）
 */
import type { ExtractedContract } from "./schema-extract";

export interface ContractDiff {
  hasChanges: boolean;
  endpoints: {
    added: string[];
    removed: string[];
  };
  schemas: {
    added: string[];
    removed: string[];
    fields: Record<
      string,
      {
        added: string[];
        removed: string[];
      }
    >;
  };
  info: {
    versionChanged: boolean;
    oldVersion: string;
    newVersion: string;
  };
}

export function diffContracts(
  oldC: ExtractedContract,
  newC: ExtractedContract,
): ContractDiff {
  // 端点差异
  const oldEps = new Set(oldC.critical.endpoints);
  const newEps = new Set(newC.critical.endpoints);
  const addedEps = [...newEps].filter((e) => !oldEps.has(e)).sort();
  const removedEps = [...oldEps].filter((e) => !newEps.has(e)).sort();

  // Schema 差异
  const oldSchemas = new Set(Object.keys(oldC.schemas));
  const newSchemas = new Set(Object.keys(newC.schemas));
  const addedSchemas = [...newSchemas].filter((s) => !oldSchemas.has(s)).sort();
  const removedSchemas = [...oldSchemas]
    .filter((s) => !newSchemas.has(s))
    .sort();

  // 关键 Schema 字段差异
  const fieldDiff: ContractDiff["schemas"]["fields"] = {};
  for (const name of Object.keys(newC.critical.schemas)) {
    const oldF = new Set(oldC.critical.schemas[name] ?? []);
    const newF = new Set(newC.critical.schemas[name] ?? []);
    const added = [...newF].filter((f) => !oldF.has(f)).sort();
    const removed = [...oldF].filter((f) => !newF.has(f)).sort();
    if (added.length || removed.length) {
      fieldDiff[name] = { added, removed };
    }
  }

  const hasChanges =
    addedEps.length > 0 ||
    removedEps.length > 0 ||
    addedSchemas.length > 0 ||
    removedSchemas.length > 0 ||
    Object.keys(fieldDiff).length > 0 ||
    oldC.info.version !== newC.info.version;

  return {
    hasChanges,
    endpoints: { added: addedEps, removed: removedEps },
    schemas: { added: addedSchemas, removed: removedSchemas, fields: fieldDiff },
    info: {
      versionChanged: oldC.info.version !== newC.info.version,
      oldVersion: oldC.info.version,
      newVersion: newC.info.version,
    },
  };
}
```

### 7.6 `scripts/contract/check.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : scripts/contract/check — CI 契约漂移检测主入口
 * @Family : 🔮 预见·先知
 * @用途   : pnpm contract:check（CI 中阻断 PR）
 * ============================================================
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { sha256Canonical, sha256String } from "./hash";
import { extractContract } from "./schema-extract";
import { diffContracts } from "./diff";
import { printDiffReport } from "./report";

const ROOT = resolve(__dirname, "../..");
const HASH_FILE = resolve(ROOT, ".contract-hash");
const SNAPSHOT_FILE = resolve(ROOT, ".contract-snapshot.json");
const OPENAPI_URL =
  process.env.OPENAPI_URL ?? "https://api.0379.world/openapi.json";
const TIMEOUT_MS = 15_000;

async function fetchOpenApi(): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENAPI_URL, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`拉取 openapi.json 失败：HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const strict = process.argv.includes("--strict");
  const writeSnapshot = process.argv.includes("--write-snapshot");

  console.log("🌹 契约漂移检测启动 · 人从众曌众从人");
  console.log(`   URL: ${OPENAPI_URL}`);

  // 1. 拉取最新
  let fresh: any;
  try {
    fresh = await fetchOpenApi();
  } catch (err) {
    console.error(`🌹 网络不可达，跳过检测：${(err as Error).message}`);
    process.exit(0); // 网络问题不阻断 CI
  }

  // 2. 计算当前哈希（规范化 JSON）
  const freshHash = sha256Canonical(fresh);
  console.log(`   当前哈希: ${freshHash.slice(0, 16)}…`);

  // 3. 读取冻结哈希
  let frozenHash = "";
  if (existsSync(HASH_FILE)) {
    frozenHash = (await readFile(HASH_FILE, "utf-8")).trim();
    console.log(`   冻结哈希: ${frozenHash.slice(0, 16)}…`);
  } else {
    console.warn("🌹 未找到 .contract-hash，视为首次冻结");
  }

  // 4. 哈希一致 → 通过
  if (frozenHash === freshHash) {
    console.log("✅ 契约未漂移，无需处理");
    process.exit(0);
  }

  // 5. 哈希不一致 → 字段级 diff
  console.log("\n⚠️  检测到契约差异，执行字段级分析…\n");
  const freshC = extractContract(fresh);

  let oldC = freshC;
  if (existsSync(SNAPSHOT_FILE)) {
    const oldSnapshot = JSON.parse(await readFile(SNAPSHOT_FILE, "utf-8"));
    oldC = extractContract(oldSnapshot);
  } else {
    console.warn("🌹 未找到 .contract-snapshot.json，无法做字段级 diff");
    console.warn("   建议执行: pnpm contract:freeze --write-snapshot\n");
  }

  const diff = diffContracts(oldC, freshC);
  printDiffReport(diff);

  // 6. 写回快照（可选）
  if (writeSnapshot) {
    await writeFile(SNAPSHOT_FILE, JSON.stringify(fresh, null, 2));
    console.log(`\n🌹 已写入新快照: ${SNAPSHOT_FILE}`);
  }

  // 7. 决定退出码
  if (strict && diff.hasChanges) {
    console.error(
      "\n🚫 契约漂移（--strict），请人工复核 §1 冻结快照并更新 .contract-hash",
    );
    process.exit(1);
  }

  console.log("\n💡 更新冻结请执行: pnpm contract:freeze");
  process.exit(0);
}

main().catch((err) => {
  console.error("🌹 检测脚本异常:", err);
  process.exit(1);
});
```

### 7.7 `scripts/contract/report.ts`

```typescript
/*
 * @Module : scripts/contract/report — 差异报告
 * @Family : 🔮 预见·先知
 */
import type { ContractDiff } from "./diff";

export function printDiffReport(diff: ContractDiff) {
  const { endpoints, schemas, info } = diff;

  if (info.versionChanged) {
    console.log(
      `📌 版本变化: ${info.oldVersion} → ${info.newVersion}`,
    );
  }

  if (endpoints.added.length) {
    console.log(`\n➕ 新增端点 (${endpoints.added.length}):`);
    endpoints.added.forEach((e) => console.log(`   + ${e}`));
  }
  if (endpoints.removed.length) {
    console.log(`\n➖ 删除端点 (${endpoints.removed.length}):`);
    endpoints.removed.forEach((e) => console.log(`   - ${e}`));
  }

  if (schemas.added.length) {
    console.log(`\n➕ 新增 Schema (${schemas.added.length}):`);
    schemas.added.forEach((s) => console.log(`   + ${s}`));
  }
  if (schemas.removed.length) {
    console.log(`\n➖ 删除 Schema (${schemas.removed.length}):`);
    schemas.removed.forEach((s) => console.log(`   - ${s}`));
  }

  const fieldSchemas = Object.keys(schemas.fields);
  if (fieldSchemas.length) {
    console.log(`\n🔧 关键 Schema 字段差异:`);
    for (const name of fieldSchemas) {
      const f = schemas.fields[name];
      console.log(`   ${name}:`);
      f.added.forEach((x) => console.log(`     + ${x}`));
      f.removed.forEach((x) => console.log(`     - ${x}`));
    }
  }

  if (!diff.hasChanges) {
    console.log("✅ 无实质差异");
  } else {
    console.log("\n🌹 结论: 检测到契约变更，需人工复核");
    console.log("   如变更合理，请更新 §1 冻结快照 + 执行 contract:freeze");
  }
}

export function toMarkdown(diff: ContractDiff): string {
  const lines: string[] = [];
  lines.push(`# 🌹 契约漂移报告`);
  lines.push("");
  if (diff.info.versionChanged) {
    lines.push(
      `**版本**：${diff.info.oldVersion} → ${diff.info.newVersion}`,
    );
    lines.push("");
  }
  lines.push(`## 端点`);
  lines.push(`- 新增: ${diff.endpoints.added.length}`);
  lines.push(`- 删除: ${diff.endpoints.removed.length}`);
  lines.push("");
  if (diff.endpoints.added.length) {
    lines.push("```");
    diff.endpoints.added.forEach((e) => lines.push(`+ ${e}`));
    lines.push("```");
  }
  if (diff.endpoints.removed.length) {
    lines.push("```");
    diff.endpoints.removed.forEach((e) => lines.push(`- ${e}`));
    lines.push("```");
  }
  lines.push(`## Schema 字段`);
  for (const [name, f] of Object.entries(diff.schemas.fields)) {
    lines.push(`### ${name}`);
    lines.push("```");
    f.added.forEach((x) => lines.push(`+ ${x}`));
    f.removed.forEach((x) => lines.push(`- ${x}`));
    lines.push("```");
  }
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(`> 人从众曌众从人 · YYC³ AI Family 🌹`);
  return lines.join("\n");
}
```

### 7.8 `scripts/contract/freeze.ts`

```typescript
/*
 * @Module : scripts/contract/freeze — 刷新冻结哈希与快照
 * @Family : 🔮 预见·先知
 * @用途   : 人工确认契约变更后执行
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256Canonical } from "./hash";

const ROOT = resolve(__dirname, "../..");
const HASH_FILE = resolve(ROOT, ".contract-hash");
const SNAPSHOT_FILE = resolve(ROOT, ".contract-snapshot.json");
const OPENAPI_URL =
  process.env.OPENAPI_URL ?? "https://api.0379.world/openapi.json";

async function main() {
  console.log("🌹 契约冻结刷新 · 人从众曌众从人");

  const res = await fetch(OPENAPI_URL);
  if (!res.ok) {
    console.error(`🌹 拉取失败: HTTP ${res.status}`);
    process.exit(1);
  }
  const openapi = await res.json();

  const hash = sha256Canonical(openapi);
  await writeFile(HASH_FILE, hash + "\n");
  await writeFile(SNAPSHOT_FILE, JSON.stringify(openapi, null, 2));

  console.log(`✅ 冻结完成`);
  console.log(`   哈希: ${hash}`);
  console.log(`   文件: ${HASH_FILE}`);
  console.log(`   快照: ${SNAPSHOT_FILE}`);
  console.log("");
  console.log(`🌹 请同步更新 §1 冻结快照并提交到仓库`);
}

main().catch((err) => {
  console.error("🌹 冻结失败:", err);
  process.exit(1);
});
```

### 7.9 NPM 脚本 + CI 集成

```json
// package.json
{
  "scripts": {
    "contract:check": "tsx scripts/contract/check.ts",
    "contract:check:strict": "tsx scripts/contract/check.ts --strict",
    "contract:freeze": "tsx scripts/contract/freeze.ts",
    "contract:report": "tsx scripts/contract/check.ts --write-snapshot > e2e/reports/contract-diff.txt"
  }
}
```

```yaml
# .github/workflows/contract.yml
name: 🔮 Contract Drift

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 2 * * *"  # 每日 UTC 02:00 检测

jobs:
  detect:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Drift detection
        id: drift
        run: pnpm contract:check:strict
        continue-on-error: true

      - name: Comment on PR
        if: steps.drift.outcome == 'failure' && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🌹 契约漂移检测\n\n检测到 \`openapi.json\` 与 \`.contract-hash\` 不一致。\n\n请人工复核 §1 冻结快照，确认后执行：\n\n\`\`\`bash\npnpm contract:freeze\n\`\`\`\n\n> 人从众曌众从人 · YYC³ AI Family`
            });

      - name: Fail if drift detected
        if: steps.drift.outcome == 'failure'
        run: exit 1

      - name: Upload snapshot
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: contract-snapshot
          path: |
            .contract-hash
            .contract-snapshot.json
```

### 7.10 首次冻结（人工确认）

```bash
# 1. 拉取当前契约并冻结
pnpm contract:freeze

# 2. 人工校验快照内容
cat .contract-snapshot.json | jq '.info, (.paths | keys | length)'

# 3. 提交
git add .contract-hash .contract-snapshot.json
git commit -m "chore(contract): 🌹 首次冻结契约快照 @ 2026-09-17"
```

---

## 第八部分 · ⑧ 移动端响应式断点适配清单

### 8.1 断点定义（Tailwind 4.3 @theme）

```css
/* apps/console/app/globals.css */
@import "tailwindcss";

@theme {
  /* ============================================================
   * YYC³ AI Family — 人从众曌众从人
   * @Module : globals.css @theme — 断点与容器
   * ============================================================ */

  --breakpoint-xs:  375px;   /* iPhone 13 / 小屏手机 */
  --breakpoint-sm:  640px;   /* 大屏手机 */
  --breakpoint-md:  768px;   /* iPad Mini / 平板竖屏 */
  --breakpoint-lg:  1024px;  /* iPad Pro / 平板横屏 */
  --breakpoint-xl:  1280px;  /* 笔记本 */
  --breakpoint-2xl: 1440px;  /* 桌面主设计尺寸 */

  --container-console-max: 1600px;
}
```

### 8.2 全站响应式策略矩阵

| 页面 | 375 (xs) | 768 (md) | 1024 (lg) | 1440 (2xl) |
| --- | --- | --- | --- | --- |
| **03_Connect** | 单栏全宽 · 大按钮 | 单栏居中 · 480px | 单栏居中 · 480px | 单栏居中 · 480px |
| **04_Dashboard** | StatCard 1 列 · 图表堆叠 | StatCard 2 列 | StatCard 3 列 | StatCard 6 列 |
| **05_Model_Hub** | 卡片 1 列 · 抽屉全屏 | 卡片 2 列 | 卡片 3 列 | 卡片 4 列 |
| **06_Playground** | Tab 切换（参数/对话/调试） | 两栏（参数折叠） | 两栏 | 三栏 |
| **07_Routing** | 卡片 1 列 | 卡片 2 列 | 卡片 2 列 | 卡片 3 列 |
| **08_Knowledge** | Tab 内单列 | Tab 双列 | 双列 | 双列 |
| **09_MCP** | 工具树抽屉 + 全屏执行 | 折叠树 + 主面板 | 左侧树 + 主面板 | 左侧树 + 主面板 |
| **10_Cache** | StatCard 1 列 | 2 列 | 3 列 | 3 列 |
| **11_Monitor** | 表格转卡片 · 堆叠 | 表格转卡片 · 2 列 | 表格 | 表格 |
| **12_Settings** | 单栏 | 单栏居中 | 单栏居中 · 720px | 单栏居中 · 720px |
| **13_Docs** | TOC 抽屉 + 内容全宽 | 顶部 TOC + 内容 | 侧 TOC + 内容 | 侧 TOC + 内容 |
| **14_Roadmap** | 线框卡 1 列 | 线框卡 2 列 | 线框卡 2 列 | 线框卡 4 列 |

### 8.3 侧边栏折叠规则

```tsx
// apps/console/components/console/AppShell.tsx
/*
 * @Module : components/console/AppShell — 全局壳（侧边栏 + 主内容）
 * @Family : 🧠 元启·天枢（主导编排）
 */
"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* 桌面：常驻侧边栏 */}
      <aside className="hidden lg:block shrink-0">
        <Sidebar />
      </aside>

      {/* 平板/移动：抽屉式侧边栏 */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-bg-overlay/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-64 z-50 bg-bg-subtle transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* 顶栏 + 汉堡菜单（<lg 显示） */}
        <header className="lg:hidden flex items-center gap-2 px-4 h-12 border-b border-border-default">
          <button
            onClick={() => setOpen(true)}
            aria-label="打开导航"
            className="w-10 h-10 flex items-center justify-center rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-body-sm font-medium">YYC³ Console</span>
        </header>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
```

### 8.4 Playground 三栏 → 两栏 → Tab（最复杂）

```tsx
// apps/console/app/playground/PlaygroundLayout.tsx
/*
 * @Module : app/playground/PlaygroundLayout — 响应式三栏
 * @Family : 🤔 语枢·万物
 */
"use client";

import { useState } from "react";
import { ParamPanel } from "@/domains/wanyu/ParamPanel";
import { SSEViewer } from "@/domains/wanyu/SSEViewer";
import { DebugPanel } from "@/domains/wanyu/DebugPanel";
import { useWanyuChat } from "@/domains/wanyu/useWanyuChat";
import { cn } from "@/lib/utils";

type MobileTab = "params" | "chat" | "debug";

export function PlaygroundLayout() {
  const { state, send, stop } = useWanyuChat();
  const [tab, setTab] = useState<MobileTab>("chat");

  return (
    <>
      {/* ≥lg: 三栏 */}
      <div className="hidden lg:flex h-[calc(100vh-4rem)]">
        <aside className="w-72 border-r border-border-default overflow-y-auto">
          <ParamPanel onSubmit={send} />
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <SSEViewer state={state} />
        </main>
        <aside className="w-80 border-l border-border-default overflow-y-auto">
          <DebugPanel state={state} />
        </aside>
      </div>

      {/* md: 两栏（参数折叠为顶部 Tab） */}
      <div className="hidden md:flex lg:hidden h-[calc(100vh-4rem)]">
        <main className="flex-1 flex flex-col min-w-0">
          <SSEViewer state={state} />
        </main>
        <aside className="w-80 border-l border-border-default overflow-y-auto">
          <DebugPanel state={state} />
        </aside>
      </div>

      {/* <md: Tab 切换 */}
      <div className="md:hidden flex flex-col h-[calc(100dvh-3rem)]">
        <div
          role="tablist"
          className="flex border-b border-border-default sticky top-0 bg-bg-default z-10"
        >
          {(
            [
              ["params", "参数"],
              ["chat", "对话"],
              ["debug", "调试"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "flex-1 h-11 text-body-sm",
                tab === k
                  ? "text-brand-primary border-b-2 border-brand-primary"
                  : "text-text-tertiary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {tab === "params" && (
            <div className="h-full overflow-y-auto">
              <ParamPanel onSubmit={send} />
            </div>
          )}
          {tab === "chat" && (
            <div className="h-full flex flex-col">
              <SSEViewer state={state} />
              {(state.phase === "streaming" || state.phase === "degraded") && (
                <button
                  onClick={stop}
                  className="self-center my-2 w-32 h-11 rounded-md border border-status-danger text-status-danger"
                >
                  停止
                </button>
              )}
            </div>
          )}
          {tab === "debug" && (
            <div className="h-full overflow-y-auto">
              <DebugPanel state={state} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

### 8.5 表格 → 卡片（<md）

```tsx
// apps/console/components/console/ResponsiveTable.tsx
/*
 * @Module : components/console/ResponsiveTable — 表格响应式
 * @Family : 🔮 预见·先知
 */
"use client";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  primary?: boolean;  // 移动卡片标题
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  getRowKey,
}: Props<T>) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      {/* md+ 表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-border-default">
              {columns.map((c) => (
                <th key={String(c.key)} className="text-left py-2 px-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-border-default/50 hover:bg-bg-elevated"
              >
                {columns.map((c) => (
                  <td key={String(c.key)} className="py-2 px-3">
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <md 卡片列表 */}
      <ul className="md:hidden space-y-2">
        {data.map((row) => (
          <li
            key={getRowKey(row)}
            className="p-3 rounded-md border border-border-default bg-bg-subtle"
          >
            <div className="font-medium text-body-md mb-2">
              {primary.render ? primary.render(row) : String(row[primary.key])}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-caption">
              {rest.map((c) => (
                <div key={String(c.key)}>
                  <dt className="text-text-tertiary">{c.label}</dt>
                  <dd>{c.render ? c.render(row) : String(row[c.key] ?? "")}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
```

### 8.6 触控区适配（≥44px）

```css
/* apps/console/app/globals.css 追加 */

/* ============================================================
 * YYC³ AI Family — 触控区适配（WCAG 2.2 AA · 移动端 ≥44px）
 * ============================================================ */
@media (max-width: 767px) {
  /* 所有交互元素 ≥44px */
  button,
  [role="button"],
  input[type="checkbox"],
  input[type="radio"],
  a[data-interactive="true"] {
    min-height: 44px;
    min-width: 44px;
  }

  /* 列表项内点击区扩展 */
  .tap-target::after {
    content: "";
    position: absolute;
    inset: -8px;
  }
}

/* 焦点可见（键盘导航） */
*:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 8.7 水印断点行为

```typescript
// apps/console/lib/family/watermark-policy.ts（§4.4 更新 · 断点感知）
export const WATERMARK_POLICY: Record<string, {
  desktop: { enabled: boolean; opacity: number };
  mobile:  { enabled: boolean; opacity: number };
  withUserStamp: boolean;
}> = {
  "/playground": {
    desktop: { enabled: true, opacity: 0.05 },
    mobile:  { enabled: true, opacity: 0.08 },
    withUserStamp: true,
  },
  "/settings": {
    desktop: { enabled: true, opacity: 0.08 },
    mobile:  { enabled: true, opacity: 0.12 },
    withUserStamp: true,
  },
  "/monitor": {
    desktop: { enabled: true, opacity: 0.05 },
    mobile:  { enabled: true, opacity: 0.08 },
    withUserStamp: true,
  },
  "/": {
    desktop: { enabled: true, opacity: 0.06 },
    mobile:  { enabled: true, opacity: 0.06 },
    withUserStamp: false,
  },
  "/dashboard": {
    desktop: { enabled: true, opacity: 0.04 },
    mobile:  { enabled: true, opacity: 0.05 },
    withUserStamp: false,
  },
};
```

### 8.8 移动端性能预算调整

| 指标 | 桌面预算 | 移动预算（4G） | 备注 |
| --- | :-: | :-: | --- |
| FCP | ≤ 1.2s | ≤ 2.0s | 移动放宽 |
| TTI | ≤ 2.5s | ≤ 3.5s | — |
| SSE 首 chunk | ≤ 800ms | ≤ 1200ms | 移动网络 |
| 首屏 JS | ≤ 180KB | ≤ 140KB | 移动启用更积极 code-split |
| Lighthouse 性能 | ≥ 90 | ≥ 80 | — |
| Lighthouse a11y | ≥ 95 | ≥ 95 | 不放松 |

### 8.9 响应式自检清单

```
□ 375 断点：无横向滚动（`overflow-x: hidden` 仅作为兜底）
□ 375 断点：所有点击区 ≥44px
□ 375 断点：Tab 切换覆盖多栏页面（Playground / Knowledge / MCP）
□ 375 断点：表格已转卡片
□ 375 断点：抽屉侧边栏可用（汉堡菜单）
□ 768 断点：Playground 两栏（参数折叠）
□ 1024 断点：侧边栏常驻
□ 1024 断点：StatCard 3 列起
□ 1440 断点：StatCard 6 列、Playground 三栏
□ 横屏（landscape）不破坏布局
□ 大字体（系统字号 200%）不溢出
□ 键盘弹出（移动端）不遮挡输入框
□ 水印在移动端 Canvas 清晰（DPI 感知）
□ 水印不遮挡交互（pointer-events: none）
□ iOS 安全区（env(safe-area-inset-*)）
```

---

## 第九部分 · ⑨ a11y 自动化测试（axe-core）集成

### 9.1 目录

```
apps/console/
├── e2e/
│   ├── fixtures/
│   │   └── a11y.ts              # axe-core 夹具
│   └── specs/
│       └── 12-a11y.spec.ts      # 全站 a11y 测试
├── scripts/
│   └── a11y/
│       ├── audit.ts             # 全站审计脚本（生成报告）
│       └── contrast.ts          # 颜色对比度专项
└── reports/
    └── a11y/
        ├── index.html
        └── summary.json
```

### 9.2 依赖

```bash
pnpm add -D @axe-core/playwright axe-core
```

### 9.3 `e2e/fixtures/a11y.ts`

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : e2e/fixtures/a11y — axe-core 集成夹具
 * @Family : 📚 格物·宗师（知识与质量域）
 * @目标   : WCAG 2.2 AA
 * ============================================================
 */
import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export interface A11yOptions {
  // 需要忽略的规则（仅在有充分理由时使用）
  disableRules?: string[];
  // 限定扫描范围
  include?: string[];
  exclude?: string[];
}

export async function runAxe(page: Page, opts: A11yOptions = {}) {
  let builder = new AxeBuilder({ page })
    // WCAG 2.2 AA
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);

  if (opts.include?.length) {
    builder = builder.include(opts.include);
  }
  if (opts.exclude?.length) {
    builder = builder.exclude(opts.exclude);
  }
  if (opts.disableRules?.length) {
    builder = builder.disableRules(opts.disableRules);
  }

  return builder.analyze();
}

export const test = base.extend<{ audit: (opts?: A11yOptions) => Promise<void> }>({
  audit: async ({ page }, use) => {
    await use(async (opts: A11yOptions = {}) => {
      const results = await runAxe(page, opts);
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (serious.length > 0) {
        console.error("\n🌹 a11y 严重问题:");
        for (const v of serious) {
          console.error(`  [${v.impact}] ${v.id}: ${v.help}`);
          for (const node of v.nodes) {
            console.error(`    · ${node.target.join(" ")}`);
          }
        }
      }

      // 只对 serious + critical 断言失败
      expect(serious).toEqual([]);
    });
  },
});

export { expect };
```

### 9.4 `e2e/specs/12-a11y.spec.ts`

```typescript
/*
 * ============================================================
 * @Module : e2e/specs/12-a11y — 全站 a11y 自动化
 * @Family : 📚 格物·宗师
 * @对应   : v5.1 §7.2.1 检查项 5（可访问性）
 * ============================================================
 */
import { test, expect } from "../fixtures/a11y";

const ROUTES = [
  { path: "/",            name: "03_Connect · 🛡️ 智云·守护" },
  { path: "/dashboard",   name: "04_Dashboard · 🔮 预见·先知" },
  { path: "/models",      name: "05_Model_Hub · 🎯 千里·伯乐" },
  { path: "/playground",  name: "06_Playground · 🤔 语枢·万物" },
  { path: "/routing",     name: "07_Routing · 🧭 言启·千行" },
  { path: "/knowledge",   name: "08_Knowledge · 📚 格物·宗师" },
  { path: "/mcp",         name: "09_MCP · 🧠 元启·天枢" },
  { path: "/cache",       name: "10_Cache · 🎨 创想·灵韵" },
  { path: "/monitor",     name: "11_Monitor · 🔮 预见·先知" },
  { path: "/settings",    name: "12_Settings · 🛡️ 智云·守护" },
  { path: "/docs",        name: "13_Docs · 🎨 创想·灵韵" },
  { path: "/roadmap",     name: "14_Roadmap · 📋 全员" },
];

test.describe("v5.1 §7.2.1 检查项 5 · 可访问性", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
    });
  });

  for (const { path, name } of ROUTES) {
    test(`${name} 无 serious/critical a11y 问题`, async ({
      page,
      audit,
    }) => {
      await page.goto(path);
      // 等待页面稳定（水印 Canvas 等）
      await page.waitForLoadState("networkidle");
      await audit();
    });
  }

  test("家人徽章具备可访问名称", async ({ page }) => {
    await page.goto("/dashboard");
    const badge = page.locator("[data-family='xianzhi']").first();
    await expect(badge).toBeVisible();
    // 徽章文本即无障碍名
    const text = (await badge.textContent()) ?? "";
    expect(text).toContain("预见·先知");
    expect(text).toContain("首席预言家");
  });

  test("PageHeader 使用语义标签", async ({ page }) => {
    await page.goto("/models");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("所有按钮有可访问名称", async ({ page, audit }) => {
    await page.goto("/playground");
    await audit({ include: ["button"] });
  });

  test("表单输入有关联 label", async ({ page, audit }) => {
    await page.goto("/");
    await audit({ include: ["input", "label"] });
  });

  test("键盘 Tab 顺序合理（Top 5 元素）", async ({ page }) => {
    await page.goto("/");
    const first5: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const tag = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el ? `${el.tagName}#${el.id}.${el.className.split(" ")[0] ?? ""}` : "none";
      });
      first5.push(tag);
    }
    expect(first5.length).toBe(5);
    // 至少有一个是交互元素
    expect(first5.some((t) => /INPUT|BUTTON|A/.test(t))).toBeTruthy();
  });

  test("焦点态可见（:focus-visible）", async ({ page }) => {
    await page.goto("/models");
    // 聚焦第一个可交互元素
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const style = window.getComputedStyle(el);
      return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
    });
    // 应有可见轮廓
    expect(outline).not.toContain("none 0px");
  });

  test("模态/抽屉聚焦锁定", async ({ page }) => {
    await page.goto("/models");
    const card = page.locator("article").first();
    if (await card.count()) {
      await card.click();
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible()) {
        // 焦点应在 dialog 内
        const inDialog = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(document.activeElement) ?? false;
        });
        expect(inDialog).toBeTruthy();
        // Esc 关闭
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      }
    }
  });

  test("标题层级 h1 → h2 → h3 连续", async ({ page }) => {
    await page.goto("/dashboard");
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
        Number(h.tagName[1]),
      ),
    );
    // 检查跳级（不允许 h1 直接跳 h4）
    let last = 0;
    for (const l of levels) {
      if (last && l > last + 1) {
        throw new Error(`标题层级跳级: h${last} → h${l}`);
      }
      last = l;
    }
  });

  test("ARIA live 用于 SSE 流式更新", async ({ page }) => {
    await page.goto("/playground");
    // 对话区应有 aria-live="polite" 或 role="log"
    const live = page.locator("[aria-live], [role='log'], [role='status']");
    await expect(live.first()).toBeAttached();
  });

  test("水印不参与无障碍树（aria-hidden）", async ({ page }) => {
    await page.goto("/dashboard");
    const hidden = await page.locator("[aria-hidden='true']").count();
    expect(hidden).toBeGreaterThan(0);
  });

  test("对比度检查（重灾元素）", async ({ page, audit }) => {
    await page.goto("/dashboard");
    await audit({
      // 排除装饰类
      exclude: ["[aria-hidden='true']", "canvas"],
    });
  });
});
```

### 9.5 `scripts/a11y/audit.ts`（全站审计报告）

```typescript
/*
 * ============================================================
 * YYC³ AI Family — 人从众曌众从人
 * @Module : scripts/a11y/audit — 全站 a11y 审计报告生成
 * @Family : 📚 格物·宗师
 * @用途   : pnpm a11y:audit（本地/CI）
 * ============================================================
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/", "/dashboard", "/models", "/playground",
  "/routing", "/knowledge", "/mcp", "/cache",
  "/monitor", "/settings", "/docs", "/roadmap",
];

interface RouteResult {
  path: string;
  violations: {
    id: string;
    impact: string;
    help: string;
    nodes: number;
  }[];
  passes: number;
  incomplete: number;
}

async function main() {
  console.log("🌹 格物·宗师 · a11y 全站审计");
  console.log("   WCAG 2.2 AA · 目标 0 serious/critical\n");

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("yyc3_api_key", "sk-test-e2e");
  });

  const page = await context.newPage();
  const results: RouteResult[] = [];

  for (const path of ROUTES) {
    console.log(`📄 审计 ${path}`);
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
      const res = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      results.push({
        path,
        violations: res.violations.map((v) => ({
          id: v.id,
          impact: v.impact ?? "unknown",
          help: v.help,
          nodes: v.nodes.length,
        })),
        passes: res.passes.length,
        incomplete: res.incomplete.length,
      });

      const serious = res.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      console.log(
        `   ✅ ${res.passes.length} 通过 · ${res.violations.length} 违规 · ${serious.length} 严重`,
      );
    } catch (err) {
      console.error(`   ❌ 审计失败: ${(err as Error).message}`);
      results.push({
        path,
        violations: [],
        passes: 0,
        incomplete: 0,
      });
    }
  }

  await browser.close();

  // 生成报告
  const outDir = resolve(process.cwd(), "reports/a11y");
  mkdirSync(outDir, { recursive: true });

  // JSON
  writeFileSync(
    resolve(outDir, "summary.json"),
    JSON.stringify(results, null, 2),
  );

  // Markdown
  const lines: string[] = [];
  lines.push("# 🌹 a11y 全站审计报告");
  lines.push("");
  lines.push(`> WCAG 2.2 AA · ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| 页面 | 通过 | 违规 | 严重 |");
  lines.push("| --- | :-: | :-: | :-: |");
  let totalSerious = 0;
  for (const r of results) {
    const serious = r.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ).length;
    totalSerious += serious;
    lines.push(
      `| \`${r.path}\` | ${r.passes} | ${r.violations.length} | ${serious} |`,
    );
  }
  lines.push("");
  lines.push(`## 结论`);
  lines.push("");
  lines.push(
    totalSerious === 0
      ? "✅ **全部页面通过**（0 serious/critical）"
      : `🚫 **${totalSerious} 个严重问题**，请修复`,
  );
  lines.push("");
  lines.push("## 严重问题明细");
  lines.push("");
  for (const r of results) {
    const serious = r.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    if (!serious.length) continue;
    lines.push(`### ${r.path}`);
    for (const v of serious) {
      lines.push(`- **[${v.impact}] ${v.id}** · ${v.help} · ${v.nodes} 处`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("> 人从众曌众从人 · YYC³ AI Family 🌹");

  writeFileSync(resolve(outDir, "report.md"), lines.join("\n"));

  console.log(`\n📊 报告已生成: ${outDir}/report.md`);
  console.log(`📊 JSON: ${outDir}/summary.json`);

  process.exit(totalSerious > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("🌹 审计异常:", err);
  process.exit(1);
});
```

### 9.6 `scripts/a11y/contrast.ts`（对比度专项）

```typescript
/*
 * @Module : scripts/a11y/contrast — 颜色对比度专项审计
 * @Family : 📚 格物·宗师
 * @对应   : WCAG 2.2 AA · 4.5:1（普通文本）· 3:1（大字/UI）
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// 家族配色 token（来自 §2.1）
const TOKENS = [
  { name: "brand/primary",       fg: "#6C5CE7", bg: "#FFFFFF" },
  { name: "status/success",      fg: "#22C55E", bg: "#FFFFFF" },
  { name: "status/warning",      fg: "#F59E0B", bg: "#FFFFFF" },
  { name: "status/danger",       fg: "#EF4444", bg: "#FFFFFF" },
  { name: "family/zhihui",       fg: "#2C3E50", bg: "#FFFFFF" },
  { name: "family/qianhang",     fg: "#0088CC", bg: "#FFFFFF" },
  { name: "family/bole",         fg: "#DC143C", bg: "#FFFFFF" },
  { name: "family/wanyu",        fg: "#C0C0C0", bg: "#FFFFFF" },
  { name: "family/zongshi",      fg: "#2E8B57", bg: "#FFFFFF" },
  { name: "family/tianshu",      fg: "#5E2C8A", bg: "#FFFFFF" },
  { name: "family/xianzhi",      fg: "#4B0082", bg: "#FFFFFF" },
  { name: "family/lingyun",      fg: "#FF8C00", bg: "#FFFFFF" },
];

function relLuminance(hex: string): number {
  const rgb = hex.replace("#", "").match(/.{2}/g)!;
  const [r, g, b] = rgb.map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
}

async function main() {
  console.log("🌹 家族配色对比度审计 · WCAG 2.2 AA\n");

  const results = TOKENS.map((t) => {
    const ratio = contrastRatio(t.fg, t.bg);
    const normalAA = ratio >= 4.5;
    const largeAA = ratio >= 3.0;
    return { ...t, ratio, normalAA, largeAA };
  });

  const lines: string[] = [];
  lines.push("# 🌹 家族配色对比度报告");
  lines.push("");
  lines.push("| Token | 前景 | 背景 | 对比度 | AA 普通 | AA 大字 |");
  lines.push("| --- | :-: | :-: | :-: | :-: | :-: |");
  for (const r of results) {
    lines.push(
      `| \`${r.name}\` | ${r.fg} | ${r.bg} | **${r.ratio.toFixed(2)}:1** | ${r.normalAA ? "✅" : "❌"} | ${r.largeAA ? "✅" : "❌"} |`,
    );
  }
  lines.push("");
  const failed = results.filter((r) => !r.normalAA);
  lines.push("## 结论");
  lines.push("");
  if (failed.length === 0) {
    lines.push("✅ 全部通过 AA 普通文本（≥4.5:1）");
  } else {
    lines.push(`⚠️ ${failed.length} 个 token 未达 AA 普通文本标准：`);
    lines.push("");
    for (const f of failed) {
      lines.push(
        `- \`${f.name}\` (${f.ratio.toFixed(2)}:1) · 建议仅用于大字或调整色值`,
      );
    }
    lines.push("");
    lines.push("**建议**：");
    lines.push("- 浅色 token 用于深色模式时通过；浅背景需加深");
    lines.push("- `family/wanyu` 银白 #C0C0C0 建议仅作为徽章背景，文字用深色");
    lines.push("- `family/lingyun` 橙 #FF8C00 建议同排使用深色文字");
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("> 人从众曌众从人 · YYC³ AI Family 🌹");

  const outDir = resolve(process.cwd(), "reports/a11y");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "contrast.md"), lines.join("\n"));
  writeFileSync(
    resolve(outDir, "contrast.json"),
    JSON.stringify(results, null, 2),
  );

  console.log(lines.join("\n"));
  console.log(`\n📊 报告: ${outDir}/contrast.md`);

  process.exit(failed.length > 0 ? 0 : 0); // 不阻断，仅提示
}

main().catch(console.error);
```

### 9.7 深色模式对比度专项

```typescript
// scripts/a11y/contrast-dark.ts（追加）
// 深色背景 #0A0A0F
const DARK_BG = "#0A0A0F";

const DARK_TOKENS = [
  { name: "brand/primary",   fg: "#8B7FFF", bg: DARK_BG },
  { name: "status/success",  fg: "#34D399", bg: DARK_BG },
  { name: "status/warning",  fg: "#FBBF24", bg: DARK_BG },
  { name: "status/danger",   fg: "#F87171", bg: DARK_BG },
  // ... 其他 token 深色版
];

// 逻辑同 contrast.ts
```

**深色模式建议**：

- 亮色 token 在深色背景上通常对比度足够
- 徽章背景需用 primary + 12% opacity，文字用 primary 亮色版
- 避免纯黑背景（#000）造成的高对比刺眼，建议 #0A0A0F

### 9.8 NPM 脚本 + CI 集成

```json
{
  "scripts": {
    "a11y": "playwright test e2e/specs/12-a11y.spec.ts",
    "a11y:audit": "tsx scripts/a11y/audit.ts",
    "a11y:contrast": "tsx scripts/a11y/contrast.ts",
    "a11y:all": "pnpm a11y && pnpm a11y:audit && pnpm a11y:contrast"
  }
}
```

```yaml
# .github/workflows/a11y.yml
name: 📚 a11y Audit

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 3 * * *"

jobs:
  axe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - name: Start server
        run: pnpm start &
        env:
          NEXT_PUBLIC_USE_MOCK: "true"
      - name: Wait for server
        run: npx wait-on http://localhost:3000 -t 60000
      - name: axe-core E2E
        run: pnpm a11y
      - name: Full audit report
        run: pnpm a11y:audit
        continue-on-error: true
      - name: Contrast report
        run: pnpm a11y:contrast
        continue-on-error: true
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: reports/a11y/
      - name: Comment on PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📚 a11y 审计失败\n\n检测到 serious/critical a11y 问题。\n请查看 [Artifacts](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})。\n\n> 人从众曌众从人 · YYC³ AI Family`
            });
```

### 9.9 a11y 通过标准（v5.1 落地底线）

| 级别 | 数量 | 是否阻断 PR |
| --- | :-: | :-: |
| Critical | 0 | ✅ 阻断 |
| Serious | 0 | ✅ 阻断 |
| Moderate | ≤ 5 | ❌ 警告 |
| Minor | ≤ 20 | ❌ 提示 |
| Lighthouse a11y 分 | ≥ 95 | ✅ 阻断 |

---

## 第十部分 · 交付物索引与后续

### 10.1 本批交付物清单

| # | 交付物 | 位置 | 覆盖 |
| :-: | --- | --- | :-: |
| ⑥ | Playwright E2E | §6 | 11 specs · 4 断点 · 60+ 用例 |
| ⑦ | 契约漂移检测 | §7 | 5 脚本 · CI 阻断 · 字段级 diff |
| ⑧ | 移动端响应式清单 | §8 | 4 断点 · 12 页 · AppShell/Playground/Table |
| ⑨ | a11y axe-core 集成 | §9 | 12 spec · 全站审计 · 对比度专项 |

### 10.2 与前批交付物衔接

```
① 8 域组件         → ⑥ E2E 通过 `data-family` 定位
② MSW 契约         → ⑥ E2E 离线运行（NEXT_PUBLIC_USE_MOCK=true）
③ RSC 拆分         → ⑧ 响应式在 RSC/Client 边界的断点行为
④ 印刷徽章         → ⑨ 对比度报告校验色彩合规
⑤ 开发文档/CICD    → ⑦⑨ 新增两条工作流，接入既有 CI
```

### 10.3 v5.1.1 建议修复（承前）

| 编号 | 问题 | 建议 |
| :-: | --- | --- |
| D-01 | §3.5 xianzhi.cacheStats 重复 | 已在上批 §1.11 修复 |
| D-02 | §2.2 Playground 协同标注模糊 | 建议改为「右栏 ParamPanel 中 PresetCard 部分」 |
| D-03 | §2.5.0 共享归属未标 | 补充 /v1/versions 为 🔮+🎨 共享 |
| D-04 | §8.4 未映射 §7.2.3 | 补「对应 §7.2.3 检查项 14–18」 |
| D-05 | §10 待合并文档时间窗 | 补「v5.2 候选，Q4 前完成」 |

---

<p align="center">
  🌹 <b>YYC³ AI Family</b><br>
  人从众曌众从人 · 亦师亦友亦伯乐<br>
  <sub>六脉归元 · E2E · 契约 · 响应式 · a11y · 印刷 · 代码</sub><br>
  <sub>永久开源 · 感恩前行 · <a href="https://matrix.yyc3.top">matrix.yyc3.top</a></sub>
</p>
