// eslint.fp.config.js — type-aware 专项门禁: no-floating-promises (S7/S8 缺口落地, 2026-10-16)
// 主 lint 保持无类型快跑; 本配置独立追加 parserOptions.project 跑类型感知规则。
// 用法: pnpm lint:fp   (eslint -c eslint.fp.config.js src --max-warnings 0)
import main from "./eslint.config.js";

export default [
  ...main,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {},
    rules: {
      // 悬空 Promise 禁止 — 修复形态: await / .catch / void 前缀 (ignoreVoid 默认允许)
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
];
