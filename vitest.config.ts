import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Vitest 4 配置 — 测试分级门禁 (Phase 2 / Task 2.3)
// ============================================================
// Vitest 4 projects 工作区模式 + ragflow 式分级 (L1 借鉴, YYC³ 自有配置):
//   - unit 项目 (CI 默认):        *.test.tsx → jsdom | *.test.ts → node
//       红线: 零外部依赖, 网络/WS/IndexedDB 一律 mock 或 stub
//   - integration 项目 (显式开启): *.integration.test.ts → node
//       需 YYC3_TEST_INTEGRATION=1 环境变量, 避免无环境时误跑
//   - e2e: 未接入 (test:e2e 显式报错提示)
// ============================================================

const alias = { "@": path.resolve(__dirname, "./src") };

// S22 测试隔离 (2026-10-19): envPrefix 换非 VITE_ 前缀——项目根 .env (部署联调配置,
// 70 键含 10 个 VITE_YYC3_*) 不再被 loadEnv 吸入, 测试 import.meta.env / process.env
// 固定在 env-config DEFAULTS 基线 (探针判例: 根级 envDir/envPrefix/test.env 均无法
// 阻断注入, 唯 project 级 envPrefix 生效——根级 Vite 选项不下传 projects)。
// CI 无 .env 本就处于此基线, 本地从此与 CI 同基线; 测试自需变量走 test.env 注入
// (运行时合并 {...viteEnv, ...test.env} 不受 envPrefix 限制)。
const TEST_ENV_PREFIX = "__yyc3_test_no_load__";

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 10000,
    // 并发收敛 (S4 留账落地, 2026-10-16): 多 worker 满并行 (16 核) 曾现一次性 16 用例
    // 并发资源竞争 (单 worker 全套绿 + 嫌疑文件串行 3 连绿定性, R3 判例); 封顶 8 平衡
    // 速度与稳定性, 本地/CI 同值 (本地绿=CI 绿红线)。若再现有界并发竞争, 收紧至 4 或
    // 对 Family 系并发敏感文件 isolate。
    maxWorkers: 8,
    projects: [
      {
        test: {
          name: "unit-dom",
          include: ["src/app/__tests__/*.test.{tsx,jsx}"],
          exclude: ["src/app/__tests__/**/*.integration.*"],
          environment: "jsdom",
          setupFiles: ["src/app/__tests__/setup.ts"],
        },
        resolve: { alias },
        envPrefix: TEST_ENV_PREFIX,
      },
      {
        test: {
          name: "unit-node",
          include: ["src/app/__tests__/*.test.{ts,js}"],
          exclude: ["src/app/__tests__/**/*.integration.*"],
          environment: "node",
        },
        resolve: { alias },
        envPrefix: TEST_ENV_PREFIX,
      },
      {
        test: {
          name: "integration",
          include: ["src/app/__tests__/**/*.integration.test.{ts,tsx}"],
          environment: "node",
          // 双保险: 未显式开启环境变量时整项目跳过 (CI 默认不跑)
          ...(process.env.YYC3_TEST_INTEGRATION === "1" ? {} : { enabled: false }),
        },
        resolve: { alias },
        envPrefix: TEST_ENV_PREFIX,
      },
    ],
    // 覆盖率配置
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/app/lib/**/*.ts",
        "src/app/hooks/**/*.ts",
        "src/app/components/**/*.tsx",
        "src/app/types/**/*.ts",
      ],
      exclude: [
        "src/app/components/ui/**",
        "src/app/components/figma/**",
        "src/app/docs/**",
        "src/app/__tests__/**",
      ],
      // 覆盖率门槛 — 2026-10-05 爬坡冲刺后锁定 (五批补测 45.31 → 91.77, 越过 80% 长期目标)
      // 实测值: lines 91.77% / functions 86.83% / branches 81.64% / statements 89.68%
      // 门槛略低于实测值留缓冲; 新增代码不得拉低, 退化即 CI 阻断
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 80,
        statements: 88,
      },
    },
  },
});
