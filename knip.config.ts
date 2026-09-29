/**
 * knip.config.ts — 死代码检测配置 (Phase 2 / Task 2.4)
 * =====================================================
 * 模式: 告警起步 (CI 非阻断), 基线锁定 + 只减不增
 * 基线: 2026-09-20 首跑盘点 (见下方 BASELINE_COUNTS), 收敛后季度评审下调
 */

import type { KnipConfig } from "knip";

/** 首跑盘点基线 (2026-09-20) — 任何类别超基线即 CI 失败, 只减不增
 *  2026-09-29 批11 季度核对下调: dependencies 48→31, devDependencies 5→4 (knip 实测收敛)
 *  2026-09-29 批12 死代码清偿下调: files 9→0 (11 死文件归档移除后归零) */
const BASELINE_COUNTS = {
  files: 0, // 未引用文件 (批12 死代码批量归档后归零)
  dependencies: 31, // 未使用 dependencies (shadcn/ui 生态预留为主, 季度清理)
  devDependencies: 4,
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
    // e2e 最小工具链 (批9) — playwright 依赖经此消费
    "playwright.config.ts",
    "e2e/**/*.spec.ts",
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
