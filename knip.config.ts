/**
 * knip.config.ts — 死代码检测配置 (Phase 2 / Task 2.4)
 * =====================================================
 * 模式: 告警起步 (CI 非阻断), 基线锁定 + 只减不增
 * 基线: 2026-09-20 首跑盘点 (见下方 BASELINE_COUNTS), 收敛后季度评审下调
 */

import type { KnipConfig } from "knip";

/** 首跑盘点基线 (2026-09-20) — 任何类别超基线即 CI 失败, 只减不增 */
const BASELINE_COUNTS = {
  files: 9, // 未引用文件
  dependencies: 48, // 未使用 dependencies (shadcn/ui 生态预留为主, 季度清理)
  devDependencies: 5,
  exports: 11,
  types: 3,
  duplicates: 1,
  binaries: 1,
};

const config: KnipConfig = {
  entry: [
    "src/main.tsx",
    "src/app/App.tsx",
    "src/app/routes.ts",
    "index.html",
    "deploy/server.mjs",
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignore: [
    // shadcn/ui 生成物按需取用, 不视为死代码
    "src/app/components/ui/**",
    // AI Family 子页经字符串路由分发 (ai-family-sub/:subpage), 静态分析不可达
    "src/app/components/ai-family/**",
    // 设计文档型组件 (展示用途, 保留)
    "src/app/docs/**",
  ],
  ignoreExportsUsedInFile: true,
};

export { BASELINE_COUNTS };
export default config;
