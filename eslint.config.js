import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
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
  },

  // ============================================================
  // 架构分层契约 — import 边界强制 (Phase 3 / Task 3.1)
  // ============================================================
  // 分层方向 (唯一下游): components → hooks → lib → types
  // 借鉴 dify「import-linter 分层契约」思想 (L0/L1), 以 TS 生态等价实现
  // 铁律: 例外清单「只减不增」— 移除条目任意 PR 可做, 新增条目需评审说明
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/App.tsx", mode: "full" },
        { type: "routes", pattern: "src/app/routes.ts", mode: "full" },
        { type: "main", pattern: "src/main.tsx", mode: "full" },
        { type: "tests", pattern: "src/app/__tests__/**" },
        { type: "components", pattern: "src/app/components/**" },
        { type: "hooks", pattern: "src/app/hooks/**" },
        { type: "stores", pattern: "src/app/stores/**" },
        { type: "lib", pattern: "src/app/lib/**" },
        { type: "types", pattern: "src/app/types/**" },
      ],
    },
    rules: {
      // tests 可自由引用被测对象; main/routes/app 为组合根不受限
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "${file.type} 不允许引用 ${dependency.type} — 分层契约: components → hooks → lib → types (协同开发文档 §6.7)",
          rules: [
            { from: ["main", "routes", "app"], allow: ["components", "hooks", "stores", "lib", "types"] },
            { from: "tests", allow: ["components", "hooks", "stores", "lib", "types"] },
            { from: "components", allow: ["components", "hooks", "stores", "lib", "types"] },
            // 例外清单 (只减不增): 当前为空 — useWebSocketData → stores 豁免已于
            // 2026-09-20 消除 (分层修复: 节点数据读取改为 lib 层注入), 首个豁免清零
            { from: "hooks", allow: ["hooks", "lib", "types"] },
            { from: "stores", allow: ["lib", "types"] },
            { from: "lib", allow: ["lib", "types"] },
            { from: "types", allow: [] },
          ],
        },
      ],
    },
  },
);
