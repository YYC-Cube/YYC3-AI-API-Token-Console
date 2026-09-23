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
  // 修复记录 (2026-09-24): eslint-plugin-boundaries 升级 7.2 后, 原 v5/v6 legacy 语法
  //   (mode:"full" / rules 选项 / bare selector / ${...} 模板) 已静默失效 (仅告警不拦截,
  //   useWebSocketData→stores 跨层引用漏检)。本段重写为 v7 语法:
  //   boundaries/dependencies + policies + to:{element:{type}} + partialMatch:false,
  //   组合根单文件 (mode:"full" 精确匹配) 改用 file descriptor + category。
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/elements": [
        { type: "components", pattern: "src/app/components", partialMatch: false },
        { type: "hooks", pattern: "src/app/hooks", partialMatch: false },
        { type: "stores", pattern: "src/app/stores", partialMatch: false },
        { type: "lib", pattern: "src/app/lib", partialMatch: false },
        { type: "types", pattern: "src/app/types", partialMatch: false },
        { type: "tests", pattern: "src/app/__tests__", partialMatch: false },
      ],
      // 组合根单文件: v7 元素为 folder 语义, 单文件精确匹配改用 file descriptor + category
      "boundaries/files": [
        { category: "app", pattern: "src/app/App.tsx" },
        { category: "routes", pattern: "src/app/routes.ts" },
        { category: "main", pattern: "src/main.tsx" },
      ],
      // v7 依赖 eslint 生态的 import resolver 解析相对路径 → 实际文件 (否则 to element 恒为 unknown)
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message: "架构分层契约违反 — 仅允许 components → hooks → lib → types 单向依赖 (协同开发文档 §6.7)",
          policies: [
            // 组合根 (main/routes/app) 不受限: to 可能是 element 或另一个组合根单文件
            // allow 数组为 OR 语义 — 单文件 (App.tsx 等) 无 element type, 需独立 entry
            {
              from: { file: { categories: ["app", "routes", "main"] } },
              allow: [
                { to: { element: { types: { anyOf: ["components", "hooks", "stores", "lib", "types"] } } } },
                { to: { file: { categories: ["app", "routes", "main"] } } },
              ],
            },
            // tests 可自由引用被测对象 (含动态 import 组合根单文件)
            {
              from: { element: { type: "tests" } },
              allow: [
                { to: { element: { types: { anyOf: ["components", "hooks", "stores", "lib", "types"] } } } },
                { to: { file: { categories: ["app", "routes", "main"] } } },
              ],
            },
            // components 可引用 components/hooks/stores/lib/types
            {
              from: { element: { type: "components" } },
              allow: { to: { element: { types: { anyOf: ["components", "hooks", "stores", "lib", "types"] } } } },
            },
            // hooks 禁止引 components/stores, 仅 hooks/lib/types (例外清单当前为空)
            {
              from: { element: { type: "hooks" } },
              allow: { to: { element: { types: { anyOf: ["hooks", "lib", "types"] } } } },
            },
            // stores 仅 lib/types
            {
              from: { element: { type: "stores" } },
              allow: { to: { element: { types: { anyOf: ["lib", "types"] } } } },
            },
            // lib 仅 lib/types
            {
              from: { element: { type: "lib" } },
              allow: { to: { element: { types: { anyOf: ["lib", "types"] } } } },
            },
            // types 不允许引用任何 (default: disallow 已覆盖, 无需显式 policy)
          ],
        },
      ],
    },
  },
);
