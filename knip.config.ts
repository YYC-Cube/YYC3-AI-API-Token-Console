/**
 * knip.config.ts — 死代码检测配置 (Phase 2 / Task 2.4)
 * =====================================================
 * 模式: 告警起步 (CI 非阻断), 基线锁定 + 只减不增
 * 基线: 2026-09-20 首跑盘点 (见下方 BASELINE_COUNTS), 收敛后季度评审下调
 */

import type { KnipConfig } from "knip";

/** 首跑盘点基线 (2026-09-20) — 任何类别超基线即 CI 失败, 只减不增
 *  2026-09-29 批11 季度核对下调: dependencies 48→31, devDependencies 5→4 (knip 实测收敛)
 *  2026-09-29 批12 死代码清偿下调: files 9→0 (11 死文件归档移除后归零)
 *  2026-09-29 批13 deps 季度窗口处置: dependencies 31→0 归零 —
 *    date-fns 零消费真死移除 (package.json); 其余 30 项 (26 radix + cva/clsx/
 *    tailwind-merge/tw-animate-css) 为 shadcn/ui 生成物与 CSS 入口真实消费,
 *    因 ignore components/ui/** 与 css 不跟随构成 knip 判定盲区, 转入
 *    ignoreDependencies 白名单留证 (证据链见该数组分组注释) */
const BASELINE_COUNTS = {
  files: 0, // 未引用文件 (批12 死代码批量归档后归零)
  dependencies: 0, // 未使用 dependencies (批13 白名单留证后归零)
  devDependencies: 4,
  exports: 11,
  types: 3,
  duplicates: 1,
  binaries: 1,
};

/** knip 判定盲区白名单 (批13): 消费方为 src/app/components/ui/** 生成物
 *  (knip.config ignore 该目录致其 import 不计入依赖判定) 与 src/styles/tailwind.css
 *  (@import 'tw-animate-css', knip 不跟随 CSS 入口)。全部经 git grep 逐一取证:
 *  26 × @radix-ui/react-* ↔ ui/ 同名组件一一对应; cva/clsx/tailwind-merge → ui/utils.ts cn();
 *  tw-animate-css → tailwind.css:4。新增 shadcn/ui 组件时需同步补录。 */
const UI_ECOSYSTEM_WHITELIST = [
  // shadcn/ui 组件底层原语 (ui/*.tsx 生成物逐文件 import)
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  // cn() 工具链 (ui/utils.ts) 与 Tailwind 4 动画预设 (tailwind.css @import)
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "tw-animate-css",
];

const config: KnipConfig = {
  ignoreDependencies: UI_ECOSYSTEM_WHITELIST,
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

export { BASELINE_COUNTS, UI_ECOSYSTEM_WHITELIST };
export default config;
