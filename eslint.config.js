import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 全局忽略 Global ignores — 构建产物 / 依赖 / 历史归档
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "src/app/ci/**", // CI 配置历史归档
      "src/imports/**", // Figma 导入原始物料
    ],
  },

  // 基础推荐 Base recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 源码与配置统一治理 Source & config files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React 19 hooks 完整规则集（含 exhaustive-deps）
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      // 渐进收敛：未消费变量降级为警告（存量 0 errors 门槛）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // 空块降级为警告（空 catch 为合法静默容错模式）
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Node 脚本层：部署服务器与工具脚本
  {
    files: ["deploy/**/*.mjs", "scripts/**/*.{cjs,mjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // 测试文件放宽：允许 any / 未消费存根 Test files relaxed
  {
    files: ["src/app/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
