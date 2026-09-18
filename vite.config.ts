import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================
// 子路径部署支持
// ============================================================
// 通过 VITE_BASE 环境变量注入部署基路径，默认 '/'（根路径部署不受影响）
//
//   pnpm dev                          → http://localhost:3030/          (根路径)
//   VITE_BASE=/console/ pnpm dev      → http://localhost:3030/console/  (子路径)
//   VITE_BASE=/console/ pnpm build    → dist/ 产物全部资源引用 /console/*
//
// 注意:
//   - 必须以 '/' 开头、'/' 结尾，否则 Vite/Router 解析异常
//   - 构建时注入，运行时只读 import.meta.env.BASE_URL
// ============================================================

const rawBase = process.env.VITE_BASE || '/'
// 规范化: 确保前后斜杠 (空字符串视为根路径)
const base = rawBase === '' ? '/' : rawBase.startsWith('/') ? rawBase : `/${rawBase}`
const normalizedBase = base.endsWith('/') ? base : `${base}/`

export default defineConfig({
  base: normalizedBase,
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
