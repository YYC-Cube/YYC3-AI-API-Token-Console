/**
 * e2e/auth.spec.ts — console 鉴权链路 ×3 + SPA 路由冒烟 (批9 / §8.3 P1)
 * =====================================================================
 * 替代批4 手搓 curl 烟测, 全链路闭环:
 *   1. 登录 401 — 错误密码被拒, 无会话签发
 *   2. 登录成功 — HttpOnly Cookie 签发, status 已认证, 会话穿门 (gw 非 401)
 *   3. gw 未认证 401 — 无会话 Cookie 的代理请求一律拒绝
 *   4. 路由冒烟 — SPA 于 /console/ 子路径正常挂载
 * 前置: playwright.config.ts webServer 已以鉴权启用形态启动生产服务器
 */
import { expect, test } from "@playwright/test";

const LOGIN = "/console/auth/login";
const STATUS = "/console/auth/status";
const GW = "/console/gw/v0/models";
/** 与 playwright.config.ts webServer.env 注入的测试凭据一致 */
const CORRECT_PASSWORD = "e2e-test-password";

test("登录 401 — 错误密码被拒且无会话签发", async ({ request }) => {
  const res = await request.post(LOGIN, { data: { password: "definitely-wrong-password" } });
  expect(res.status()).toBe(401);
  expect((await res.json()).error).toContain("密码不正确");

  const status = await request.get(STATUS);
  expect((await status.json()).authenticated).toBe(false);
});

test("登录成功 — HttpOnly 会话签发且可穿门", async ({ request }) => {
  const login = await request.post(LOGIN, { data: { password: CORRECT_PASSWORD } });
  expect(login.status()).toBe(200);
  const setCookie = login.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain("console_session=");
  expect(setCookie).toContain("HttpOnly");

  // 会话态: 同一 request 上下文自动携带 Cookie → status 已认证
  const status = await request.get(STATUS);
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({ enabled: true, authenticated: true });

  // 会话穿门: 已认证 gw 请求越过 401 门禁 (e2e 环境未配 GW_ADMIN_KEY → 503, 唯独不该是 401)
  const gw = await request.get(GW);
  expect(gw.status()).not.toBe(401);
});

test("gw 未认证 401 — 无会话 Cookie 的代理请求一律拒绝", async ({ request }) => {
  // request fixture 每用例独立上下文 — 本用例未登录, 必然无会话
  const res = await request.get(GW);
  expect(res.status()).toBe(401);
  expect((await res.json()).error).toContain("未认证");
});

test("路由冒烟 — SPA 于 /console/ 子路径正常挂载", async ({ page }) => {
  const res = await page.goto("/console/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/数据看盘/);
  // React 挂载完成: 根节点渲染出内容 (自动等待 SPA 启动)
  await expect(page.locator("#root")).not.toBeEmpty();
});
