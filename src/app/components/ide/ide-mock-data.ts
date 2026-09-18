/**
 * ide-mock-data.ts
 * =================
 * IDE 页面 Mock 数据
 */

import type { IDEFile, IDEProject, ChatMessage, GitChange, GitCommit, GitBranch } from "./ide-types";

export const MOCK_FILE_TREE: IDEFile[] = [
  {
    id: "src", name: "src", type: "folder", children: [
      {
        id: "src-app", name: "app", type: "folder", children: [
          { id: "app-tsx", name: "App.tsx", type: "file", language: "TSX", size: "4.2KB", modified: "2 min ago" },
          { id: "routes-ts", name: "routes.ts", type: "file", language: "TypeScript", size: "2.8KB", modified: "5 min ago" },
          {
            id: "src-components", name: "components", type: "folder", children: [
              { id: "layout-tsx", name: "Layout.tsx", type: "file", language: "TSX", size: "6.1KB", modified: "10 min ago" },
              { id: "sidebar-tsx", name: "Sidebar.tsx", type: "file", language: "TSX", size: "8.3KB", modified: "1 hr ago" },
              { id: "dashboard-tsx", name: "Dashboard.tsx", type: "file", language: "TSX", size: "12.5KB", modified: "30 min ago" },
              { id: "glasscard-tsx", name: "GlassCard.tsx", type: "file", language: "TSX", size: "1.2KB", modified: "2 hr ago" },
            ],
          },
          {
            id: "src-hooks", name: "hooks", type: "folder", children: [
              { id: "use-i18n", name: "useI18n.ts", type: "file", language: "TypeScript", size: "3.1KB", modified: "1 hr ago" },
              { id: "use-ws", name: "useWebSocketData.ts", type: "file", language: "TypeScript", size: "2.4KB", modified: "3 hr ago" },
            ],
          },
          {
            id: "src-lib", name: "lib", type: "folder", children: [
              { id: "env-config", name: "env-config.ts", type: "file", language: "TypeScript", size: "5.6KB", modified: "20 min ago" },
              { id: "create-store", name: "create-local-store.ts", type: "file", language: "TypeScript", size: "3.8KB", modified: "4 hr ago" },
            ],
          },
          {
            id: "src-stores", name: "stores", type: "folder", children: [
              { id: "dashboard-stores", name: "dashboard-stores.ts", type: "file", language: "TypeScript", size: "7.2KB", modified: "15 min ago" },
            ],
          },
          {
            id: "src-types", name: "types", type: "folder", children: [
              { id: "types-index", name: "index.ts", type: "file", language: "TypeScript", size: "9.4KB", modified: "1 hr ago" },
            ],
          },
        ],
      },
      {
        id: "src-styles", name: "styles", type: "folder", children: [
          { id: "theme-css", name: "theme.css", type: "file", language: "CSS", size: "2.1KB", modified: "6 hr ago" },
          { id: "fonts-css", name: "fonts.css", type: "file", language: "CSS", size: "0.5KB", modified: "1 day ago" },
        ],
      },
    ],
  },
  { id: "pkg-json", name: "package.json", type: "file", language: "JSON", size: "3.2KB", modified: "2 hr ago" },
  { id: "tsconfig", name: "tsconfig.json", type: "file", language: "JSON", size: "0.8KB", modified: "1 day ago" },
  { id: "vite-config", name: "vite.config.ts", type: "file", language: "TypeScript", size: "1.1KB", modified: "3 day ago" },
  { id: "readme-md", name: "README.md", type: "file", language: "Markdown", size: "2.4KB", modified: "1 day ago" },
  { id: "gitignore", name: ".gitignore", type: "file", language: "Text", size: "0.3KB", modified: "7 day ago" },
];

export const MOCK_FILE_CONTENTS: Record<string, string> = {
  "app-tsx": `import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}`,
  "routes-ts": `import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { DataMonitoring } from "./components/DataMonitoring";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: DataMonitoring },
      { path: "settings", Component: SystemSettings },
    ],
  },
]);`,
  "glasscard-tsx": `import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlassCard({ children, className = "", glowColor, ...rest }: GlassCardProps) {
  return (
    <div
      className={\`
        relative rounded-xl
        bg-[rgba(8,25,55,0.7)] backdrop-blur-xl
        border border-[rgba(0,180,255,0.15)]
        \${className}
      \`}
      {...rest}
    >
      {children}
    </div>
  );
}`,
  "env-config": `/**
 * env-config.ts
 * ==============
 * YYC3 Environment Configuration
 * 30+ environment variables centrally managed
 */

export const ENV = {
  APP_NAME: "YYC3 CloudPivot Intelli-Matrix",
  APP_VERSION: "2.4.0",
  API_BASE_URL: "http://192.168.3.100:3118",
  WS_URL: "ws://192.168.3.100:3118/ws",
  NODE_ENV: "production",
  DB_HOST: "192.168.3.100",
  DB_PORT: 5432,
  OLLAMA_ENDPOINT: "http://localhost:11434",
  ZHIPU_API_BASE: "https://open.bigmodel.cn/api/paas/v4",
  OPENAI_API_BASE: "https://api.openai.com/v1",
  PATROL_INTERVAL: 900,
  MAX_GPU_NODES: 16,
  CACHE_TTL: 3600,
  LOG_LEVEL: "info",
} as const;`,
  "dashboard-stores": `import { createLocalStore } from "../lib/create-local-store";
import type { NodeData } from "../types";

const DEFAULT_NODES = [
  { id: "GPU-A100-01", status: "active", gpu: 87, mem: 72, temp: 68, model: "LLaMA-70B", tasks: 128 },
  { id: "GPU-A100-02", status: "active", gpu: 92, mem: 85, temp: 74, model: "Qwen-72B", tasks: 156 },
  { id: "GPU-A100-03", status: "warning", gpu: 98, mem: 94, temp: 82, model: "LLaMA-70B", tasks: 203 },
  { id: "GPU-H100-01", status: "active", gpu: 65, mem: 58, temp: 62, model: "GPT-4o", tasks: 89 },
  { id: "GPU-H100-02", status: "error", gpu: 12, mem: 98, temp: 45, model: "DeepSeek-V3", tasks: 0 },
];

export const nodeStore = createLocalStore("yyc3_nodes", DEFAULT_NODES, "node");`,
  "layout-tsx": `import React from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Toaster } from "sonner";

export function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}`,
  "sidebar-tsx": `import React, { useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  Monitor, AlertTriangle, Shield, Search,
  Database, Settings, ChevronDown,
} from "lucide-react";
import { useI18n } from "../hooks/useI18n";

const NAV_GROUPS = [
  {
    category: "catMonitor",
    items: [
      { path: "/", icon: Monitor, label: "dataMonitor" },
      { path: "/patrol", icon: Search, label: "patrol" },
    ],
  },
  {
    category: "catAdmin",
    items: [
      { path: "/settings", icon: Settings, label: "settings" },
      { path: "/security", icon: Shield, label: "securityMonitor" },
    ],
  },
];

export function Sidebar() {
  const { t } = useI18n();
  const location = useLocation();
  // ... sidebar implementation
}`,
  "dashboard-tsx": `import React from "react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";

const THROUGHPUT_DATA = [
  { time: "00:00", value: 1200 },
  { time: "04:00", value: 890 },
  { time: "08:00", value: 2100 },
  { time: "12:00", value: 3200 },
  { time: "16:00", value: 2800 },
  { time: "20:00", value: 1500 },
];

export function Dashboard() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <GlassCard className="p-4 col-span-2">
        <h3 className="text-[#00d4ff] mb-4">{t("monitor.throughputChart")}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={THROUGHPUT_DATA}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#00d4ff" fill="rgba(0,212,255,0.1)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}`,
  "pkg-json": `{
  "name": "@yyc3/cloudpivot-intelli-matrix",
  "version": "2.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-router": "^7.13.0",
    "recharts": "^2.15.0",
    "lucide-react": "^0.487.0",
    "sonner": "^1.7.0",
    "@uiw/react-codemirror": "^4.25.0",
    "react-resizable-panels": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^6.3.0",
    "@vitejs/plugin-react": "^4.7.0",
    "tailwindcss": "^4.1.0",
    "vitest": "^4.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}`,
  "tsconfig": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
  "vite-config": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3118,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});`,
  "use-i18n": `import { useState, useCallback, useMemo } from "react";
import zhCN from "../i18n/zh-CN";
import enUS from "../i18n/en-US";

type Lang = "zh-CN" | "en-US";

const PACKS: Record<Lang, typeof zhCN> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export function useI18n() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("yyc3-lang");
    return (stored === "en-US" ? "en-US" : "zh-CN") as Lang;
  });

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const keys = key.split(".");
      let val: any = PACKS[lang];
      for (const k of keys) {
        val = val?.[k];
        if (val === undefined) return key;
      }
      if (typeof val !== "string") return key;
      if (params) {
        return Object.entries(params).reduce(
          (s, [k, v]) => s.replace(\`{$\{k}}\`, String(v)),
          val
        );
      }
      return val;
    },
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "zh-CN" ? "en-US" : "zh-CN";
      localStorage.setItem("yyc3-lang", next);
      return next;
    });
  }, []);

  return useMemo(() => ({ t, lang, toggleLang }), [t, lang, toggleLang]);
}`,
  "readme-md": `# YYC³ CloudPivot Intelli-Matrix

> 本地多端推理矩阵数据库数据看盘

## Features

- 实时 GPU 节点监控
- AI 辅助决策系统
- 巡查模式 & 操作中心
- 多语言支持 (zh-CN / en-US)
- 赛博朋克深色主题
- PWA 离线运行

## Quick Start

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Open http://192.168.3.100:3118

## Architecture

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- React Router v7
- Recharts for visualization
- CodeMirror for code editing
- Vitest for testing
`,
  "create-store": `/**
 * create-local-store.ts
 * ======================
 * 通用 localStorage CRUD 工厂
 */

interface StoreItem {
  id: string;
  [key: string]: unknown;
}

export function createLocalStore<T extends StoreItem>(
  key: string,
  defaults: T[],
  entityName: string
) {
  const getAll = (): T[] => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaults;
    } catch {
      return defaults;
    }
  };

  const save = (items: T[]) => {
    localStorage.setItem(key, JSON.stringify(items));
  };

  const getById = (id: string) => getAll().find((i) => i.id === id);

  const create = (item: T) => {
    const items = getAll();
    items.push(item);
    save(items);
    return item;
  };

  const update = (id: string, patch: Partial<T>) => {
    const items = getAll().map((i) =>
      i.id === id ? { ...i, ...patch } : i
    );
    save(items);
    return items.find((i) => i.id === id);
  };

  const remove = (id: string) => {
    const items = getAll().filter((i) => i.id !== id);
    save(items);
  };

  const reset = () => save(defaults);

  return { getAll, getById, create, update, remove, reset, entityName };
}`,
  "types-index": `/**
 * types/index.ts
 * ================
 * YYC³ 全局类型定义
 */

export interface NodeData {
  id: string;
  status: "active" | "warning" | "error" | "offline";
  gpu: number;
  mem: number;
  temp: number;
  model: string;
  tasks: number;
}

export interface AlertEvent {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  nodeId?: string;
  timestamp: string;
  resolved: boolean;
}

export interface PatrolResult {
  id: string;
  timestamp: string;
  nodeHealth: number;
  storageCapacity: number;
  networkLatency: number;
  issues: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  status: "success" | "failed" | "warning";
  risk: "low" | "medium" | "high";
}`,
};

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    id: "msg-1",
    role: "system",
    content: "YYC3 AI 编程助手已就绪。支持自然语言编程、代码生成、错误诊断。",
    timestamp: "10:00:00",
  },
  {
    id: "msg-2",
    role: "user",
    content: "帮我创建一个新的 React 组件，用于显�� GPU 节点状态卡片",
    timestamp: "10:05:23",
  },
  {
    id: "msg-3",
    role: "assistant",
    content: "好的，我为你生成了 `NodeStatusCard` 组件：\n\n```tsx\nexport function NodeStatusCard({ node }: { node: NodeData }) {\n  return (\n    <GlassCard>\n      <div className=\"p-4\">\n        <h3>{node.id}</h3>\n        <span>GPU: {node.gpu}%</span>\n      </div>\n    </GlassCard>\n  );\n}\n```\n\n该组件使用了项目的 GlassCard 和赛博朋克主题样式。",
    timestamp: "10:05:25",
  },
];

export const MOCK_RECENT_PROJECTS: IDEProject[] = [
  { id: "p1", name: "YYC3 Dashboard", description: "主控制面板", updatedAt: "2 分钟前", status: "active" },
  { id: "p2", name: "Node Monitor", description: "节点监控组件", updatedAt: "1 小时前", status: "active" },
  { id: "p3", name: "AI Chat Widget", description: "AI 对话组件", updatedAt: "3 小时前", status: "active" },
  { id: "p4", name: "Report Generator", description: "报告生成器", updatedAt: "1 天前", status: "archived" },
];

export const AI_MODELS = [
  { id: "glm-4-flash", name: "GLM-4 Flash", provider: "Z.ai", status: "online" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", status: "online" },
  { id: "llama3-8b", name: "LLaMA-3 8B", provider: "Ollama", status: "online" },
  { id: "deepseek-v3", name: "DeepSeek-V3", provider: "DeepSeek", status: "offline" },
  { id: "qwen-72b", name: "Qwen-72B", provider: "Ollama", status: "online" },
];

// ======== Git Mock Data ========

export const MOCK_GIT_BRANCHES: GitBranch[] = [
  { name: "main", current: false, lastCommit: "2 hr ago", behind: 0, ahead: 0 },
  { name: "develop", current: true, lastCommit: "5 min ago", behind: 0, ahead: 3 },
  { name: "feature/ide-panel", current: false, lastCommit: "1 hr ago", behind: 2, ahead: 5 },
  { name: "fix/gpu-alert", current: false, lastCommit: "3 hr ago", behind: 1, ahead: 1 },
];

export const MOCK_GIT_CHANGES: GitChange[] = [
  { id: "gc-1", filename: "IDELayout.tsx", filepath: "src/app/components/ide/IDELayout.tsx", status: "modified", staged: true, additions: 45, deletions: 12 },
  { id: "gc-2", filename: "AIChatPanel.tsx", filepath: "src/app/components/ide/AIChatPanel.tsx", status: "modified", staged: true, additions: 23, deletions: 8 },
  { id: "gc-3", filename: "GitPanel.tsx", filepath: "src/app/components/ide/GitPanel.tsx", status: "added", staged: false, additions: 180, deletions: 0 },
  { id: "gc-4", filename: "StatusBar.tsx", filepath: "src/app/components/ide/IDEStatusBar.tsx", status: "added", staged: false, additions: 95, deletions: 0 },
  { id: "gc-5", filename: "old-helper.ts", filepath: "src/app/lib/old-helper.ts", status: "deleted", staged: false, additions: 0, deletions: 45 },
  { id: "gc-6", filename: "ide-types.ts", filepath: "src/app/components/ide/ide-types.ts", status: "modified", staged: false, additions: 38, deletions: 2 },
];

export const MOCK_GIT_COMMITS: GitCommit[] = [
  { id: "cm-1", hash: "a3f8c2d", message: "feat(ide): add model selector to top bar", author: "YYC3 Dev", date: "5 min ago", branch: "develop", filesChanged: 4, additions: 120, deletions: 35 },
  { id: "cm-2", hash: "b7e1a4f", message: "fix(patrol): correct health check interval", author: "YYC3 Dev", date: "1 hr ago", branch: "develop", filesChanged: 2, additions: 8, deletions: 3 },
  { id: "cm-3", hash: "c9d2b6e", message: "refactor: extract GlassCard to shared components", author: "YYC3 Dev", date: "2 hr ago", branch: "develop", filesChanged: 6, additions: 45, deletions: 89 },
  { id: "cm-4", hash: "d4f3c8a", message: "feat(terminal): add git commands to mock terminal", author: "YYC3 Dev", date: "3 hr ago", branch: "develop", filesChanged: 3, additions: 67, deletions: 12 },
  { id: "cm-5", hash: "e2a7d9b", message: "feat(ai): integrate Z.ai GLM-4 Flash model", author: "YYC3 Dev", date: "5 hr ago", branch: "develop", filesChanged: 5, additions: 234, deletions: 18 },
  { id: "cm-6", hash: "f1b6e3c", message: "chore: update dependencies, fix lint warnings", author: "YYC3 Dev", date: "8 hr ago", branch: "develop", filesChanged: 2, additions: 15, deletions: 10 },
  { id: "cm-7", hash: "g8c4a2d", message: "feat(monitor): add GPU temperature heatmap", author: "YYC3 Dev", date: "1 day ago", branch: "main", filesChanged: 3, additions: 156, deletions: 0 },
  { id: "cm-8", hash: "h5d9b1e", message: "fix(security): patch CSP header configuration", author: "YYC3 Dev", date: "1 day ago", branch: "main", filesChanged: 1, additions: 4, deletions: 2 },
];
