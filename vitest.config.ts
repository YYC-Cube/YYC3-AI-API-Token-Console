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

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 10000,
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
      },
      {
        test: {
          name: "unit-node",
          include: ["src/app/__tests__/*.test.{ts,js}"],
          exclude: ["src/app/__tests__/**/*.integration.*"],
          environment: "node",
        },
        resolve: { alias },
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
