import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Vitest 4 配置
// ============================================================
// Vitest 4 已移除 environmentMatchGlobs / test.alias (顶层),
// 统一迁移至 projects 工作区模式:
//   - dom 项目:   .test.tsx → jsdom (React 组件测试)
//   - node 项目:  .test.ts  → node  (纯函数测试)
// ============================================================

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 10000,
    projects: [
      {
        test: {
          name: "dom",
          include: ["src/app/__tests__/**/*.test.{tsx,jsx}"],
          environment: "jsdom",
          setupFiles: ["src/app/__tests__/setup.ts"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "node",
          include: ["src/app/__tests__/**/*.test.{ts,js}"],
          environment: "node",
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
      // 80% 最低覆盖率门槛
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 80,
        statements: 80,
      },
    },
  },
});
