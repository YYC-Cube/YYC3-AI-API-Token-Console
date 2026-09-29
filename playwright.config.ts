/**
 * playwright.config.ts — e2e 最小工具链 (批9 / §8.3 P1)
 * ======================================================
 * 被测对象: deploy/console-server.mjs (生产服务器, 鉴权启用形态)
 * webServer 编排: VITE_BASE=/console/ 构建 → 以测试凭据启动 → 就绪探测 auth/status
 * 端口 3199: 避开 dev(3030) / LAN(3113) / console 生产(3100)
 * 凭据为测试专用值 (非真实密钥, gitleaks 安全); 真实部署凭据见 .env.example
 */
import { defineConfig } from "@playwright/test";

const PORT = 3199;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // 服务端登录限流为内存态 (5 次/5 分钟/IP) — 串行保序, 防误触 429
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "VITE_BASE=/console/ pnpm build && node deploy/console-server.mjs",
    url: `${BASE_URL}/console/auth/status`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      CONSOLE_AUTH_SECRET: "e2e-test-secret-not-a-real-key",
      CONSOLE_ADMIN_PASSWORD: "e2e-test-password",
    },
  },
});
