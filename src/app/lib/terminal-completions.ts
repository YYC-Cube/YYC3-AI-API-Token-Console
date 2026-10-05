/**
 * terminal-completions.ts
 * ========================
 * 智能化脚本补全闭环引擎 (lib 层纯逻辑 · 无 UI 依赖)
 *
 * 闭环链路 (数据驱动补全 → 执行反馈 → 排序进化):
 *   ┌─ 动态源: 节点(nodeStore) / 环境变量(env-config) / 路由表
 *   ├─ 注入源: 模型 ID (hooks 层注入 provider JSON) / 家族成员 (components 层注入)
 *   ├─ 静态源: 命令注册表 / cpim 子命令 / 文件路径
 *   └─ 历史层: 持久化命令历史 + 频率统计 (localStorage, LOCALSTORAGE_KEYS 注册)
 *        ↓
 *   getSmartCompletions(input) — 词法上下文分派 + 频率加权排序
 *        ↓
 *   IntegratedTerminal chips → 用户应用/执行
 *        ↓
 *   recordCommand(input) — 写历史 + 频率 +1
 *        ↓
 *   下次补全: 高频命令与历史命令排序提升 ←── 闭环回流
 *
 * 分层合规 (eslint boundaries): 仅 import lib/types。
 * 模型与成员数据由调用方注入 (hooks→config / components→components 先例),
 * 本模块不直接依赖 config/ 与 components/ 数据。
 */

import { getEnvConfig } from "./env-config";
import { nodeStore } from "./nodes";
import { LOCALSTORAGE_KEYS, lsGetJSON, lsSet } from "./yyc3-storage";

// ============================================================
// 类型
// ============================================================

/** 补全候选项 (带来源与描述元数据) */
export interface CompletionItem {
  value: string;
  source:
    | "command"      // 一级命令
    | "subcommand"   // cpim/env 子命令与旗标
    | "route"        // goto 路由
    | "env-key"      // 环境变量名
    | "node"         // 多设备节点名 (nodeStore)
    | "model"        // 模型 ID (provider 注入)
    | "family"       // ai-family 成员 (components 注入)
    | "path"         // 虚拟文件路径
    | "intent"       // ai 自然语言意图模板
    | "history";     // 历史命令 (频率闭环)
  description?: string;
}

/** 调用方注入的动态数据源 (分层桥接) */
export interface TerminalExtraSources {
  /** 模型 ID 清单 (hooks 层从 builtin-providers.json + configured models 聚合) */
  models?: string[];
  /** 家族成员 (components 层从 ai-family/shared 注入) */
  familyMembers?: { id: string; shortName: string; name: string; role: string }[];
}

// ============================================================
// 静态命令注册表 (自 useTerminal 迁入 · 单一事实源)
// ============================================================

export const TERMINAL_COMMANDS: Record<string, string[]> = {
  cpim:   ["status", "node", "model", "alerts", "patrol", "report", "config", "help"],
  status: [],
  node:   ["restart", "--all", "--force"],
  model:  ["deploy", "list", "migrate", "status"],
  alerts: ["--unresolved", "--critical", "--all"],
  patrol: ["run", "--full", "--quick", "history", "status"],
  report: ["--type", "performance", "health", "--format", "json", "markdown", "--output"],
  config: ["set", "get", "list", "patrol.interval", "notification.email"],
  env:    ["list", "get", "set", "reset", "export"],
  family: ["list", "chat"],
  help:   [],
  ai:     [],
};

/** 一级命令注册表 (value → 中文描述) */
export const BASE_COMMANDS: Record<string, string> = {
  cpim: "推理矩阵看板命令组",
  env: "环境变量真实读写",
  family: "AI Family 多 Agent 成员",
  goto: "路由跳转",
  open: "路由跳转 (goto 同义)",
  ai: "自然语言转 CLI (Text-to-CLI)",
  help: "帮助",
  clear: "清屏",
  ls: "列出目录",
  cat: "查看文件",
  pwd: "当前目录",
  cd: "切换目录",
  whoami: "当前用户",
  date: "当前时间",
  uptime: "运行时间",
  neofetch: "系统信息",
  fastfetch: "系统信息 (neofetch 同义)",
  htop: "进程列表",
  top: "进程列表 (htop 同义)",
  ping: "网络测试",
  df: "磁盘用量",
  echo: "输出文本",
  history: "命令历史",
  exit: "关闭终端提示",
  quit: "关闭终端提示 (exit 同义)",
};

// ============================================================
// 路由表 (v2 修正: 与 routes.ts 活跃路由对齐)
// ============================================================
// 2026-10-05 缺陷修复: 原表含 5 条已重定向死路径 (/terminal /ide /theme
// /refactoring /performance /host-files /data-editor), goto 补全会把用户
// 导向重定向目标; 且缺失 /ai-family 系列 /connection-test /gateway-keys。
// 对齐守卫: __tests__/terminal-completions.test.ts 路由对齐测试。

export const TERMINAL_ROUTES: Record<string, string> = {
  "/": "数据监控",
  "/follow-up": "一键跟进",
  "/patrol": "巡查模式",
  "/alerts": "告警规则",
  "/operations": "操作中心",
  "/files": "文件管理",
  "/database": "数据库管理",
  "/connection-test": "连接测试",
  "/loop": "服务闭环",
  "/reports": "报表导出",
  "/models": "模型供应商",
  "/gateway-keys": "网关密钥",
  "/ai": "AI 决策",
  "/ai-diagnosis": "AI 诊断",
  "/ai-family": "AI Family 钟盘",
  "/ai-family-center": "Family 中心",
  "/ai-family-design": "Family 设计文档",
  "/design-system": "设计系统",
  "/dev-guide": "开发指南",
  "/audit": "操作审计",
  "/users": "用户管理",
  "/settings": "系统设置",
  "/security": "安全监控",
  "/pwa": "PWA 管理",
  "/env-config": "环境变量",
};

/** ai Text-to-CLI 意图模板 (ai <TAB> 建议) */
const AI_INTENTS: { phrase: string; description: string }[] = [
  { phrase: "查看所有节点状态", description: "→ cpim node" },
  { phrase: "重启异常节点", description: "→ cpim node restart --all --force" },
  { phrase: "查看告警", description: "→ cpim alerts --unresolved" },
  { phrase: "执行完整巡查", description: "→ cpim patrol run --full" },
  { phrase: "查看模型列表", description: "→ cpim model list" },
  { phrase: "生成性能报告", description: "→ cpim report --type performance" },
  { phrase: "查看环境变量", description: "→ env list" },
  { phrase: "跳转到模型供应商", description: "→ goto /models" },
];

/** 虚拟文件路径 (ls/cat 补全) */
const VIRTUAL_PATHS: { path: string; description: string }[] = [
  { path: "logs", description: "日志目录" },
  { path: "logs/node", description: "节点日志" },
  { path: "logs/system", description: "系统日志" },
  { path: "reports", description: "报告目录" },
  { path: "backups", description: "备份目录" },
  { path: "configs", description: "配置目录" },
  { path: "configs/patrol.json", description: "巡查配置" },
  { path: "configs/alerts.json", description: "告警配置" },
  { path: "configs/templates.json", description: "模板配置" },
  { path: "configs/env.json", description: "环境变量导出" },
  { path: "cache", description: "缓存目录" },
];

// ============================================================
// 历史与频率 (闭环反馈层 · localStorage 持久化)
// ============================================================

const HISTORY_LIMIT = 50;
const STATS_LIMIT = 200;

/** 读命令历史 (最新在前) */
export function loadCommandHistory(): string[] {
  return lsGetJSON<string[]>(LOCALSTORAGE_KEYS.terminalHistory, []);
}

/** 读命令频率表 { 命令首词: 次数 } */
export function getCommandStats(): Record<string, number> {
  return lsGetJSON<Record<string, number>>(LOCALSTORAGE_KEYS.terminalCmdStats, {});
}

/**
 * 记录一次命令执行 (闭环写入点)
 * 历史去重置顶 (上限 50) + 首词频率 +1 (上限 200 key)
 */
export function recordCommand(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;

  const history = loadCommandHistory().filter((h) => h !== trimmed);
  history.unshift(trimmed);
  lsSet(LOCALSTORAGE_KEYS.terminalHistory, JSON.stringify(history.slice(0, HISTORY_LIMIT)));

  const base = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!base) return;
  const stats = getCommandStats();
  stats[base] = (stats[base] ?? 0) + 1;
  const keys = Object.keys(stats);
  if (keys.length > STATS_LIMIT) {
    // 淘汰频次最低的尾部 key, 控制体积
    keys.sort((a, b) => stats[a] - stats[b]);
    for (const k of keys.slice(0, keys.length - STATS_LIMIT)) delete stats[k];
  }
  lsSet(LOCALSTORAGE_KEYS.terminalCmdStats, JSON.stringify(stats));
}

/** 清空补全闭环数据 (测试与「重置终端」场景) */
export function resetTerminalCompletionData(): void {
  lsSet(LOCALSTORAGE_KEYS.terminalHistory, JSON.stringify([]));
  lsSet(LOCALSTORAGE_KEYS.terminalCmdStats, JSON.stringify({}));
}

// ============================================================
// 动态数据源收集
// ============================================================

/** 收集多设备节点名 (nodeStore 真实数据) */
function collectNodeIds(): string[] {
  try {
    return nodeStore.getAll().map((n) => n.id);
  } catch {
    return [];
  }
}

/** 收集环境变量名 (env-config 真实数据) */
function collectEnvKeys(): string[] {
  try {
    return Object.keys(getEnvConfig());
  } catch {
    return [];
  }
}

// ============================================================
// 上下文感知补全引擎
// ============================================================

const MAX_COMPLETIONS = 12;

/** 大小写不敏感前缀匹配 (修复原版大写候选无法小写输入匹配的问题) */
function matchPrefix(candidates: CompletionItem[], prefix: string): CompletionItem[] {
  const p = prefix.toLowerCase();
  return candidates.filter((c) => c.value.toLowerCase().startsWith(p) && c.value.toLowerCase() !== p);
}

/** 频率加成: stats 中次数越高排序越前 (闭环核心) */
function byFrequencyThenValue(items: CompletionItem[]): CompletionItem[] {
  const stats = getCommandStats();
  return [...items].sort((a, b) => {
    const fa = stats[a.value.toLowerCase()] ?? 0;
    const fb = stats[b.value.toLowerCase()] ?? 0;
    if (fa !== fb) return fb - fa;
    return a.value.localeCompare(b.value);
  });
}

/** 去重截断 */
function dedupe(items: CompletionItem[]): CompletionItem[] {
  const seen = new Set<string>();
  const out: CompletionItem[] = [];
  for (const item of items) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    out.push(item);
    if (out.length >= MAX_COMPLETIONS) break;
  }
  return out;
}

/**
 * 上下文感知智能补全
 * 词法分析输入 → 按「命令 → 子命令 → 参数」逐级分派 → 频率排序闭环
 */
export function getSmartCompletions(
  input: string,
  extras: TerminalExtraSources = {}
): CompletionItem[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\s+/);

  // ── 一级: 命令名 ──
  if (parts.length === 1) {
    const staticCmds: CompletionItem[] = Object.entries(BASE_COMMANDS).map(([value, description]) => ({
      value,
      source: "command" as const,
      description,
    }));
    // 历史命令前缀建议 (完整命令回填, 闭环高优先)
    const historyItems: CompletionItem[] = loadCommandHistory()
      .filter((h) => h.toLowerCase().startsWith(trimmed.toLowerCase()) && h.toLowerCase() !== trimmed.toLowerCase())
      .slice(0, 4)
      .map((h) => ({ value: h, source: "history" as const, description: "历史命令" }));
    return dedupe([...historyItems, ...byFrequencyThenValue(matchPrefix(staticCmds, trimmed))]);
  }

  const base = parts[0].toLowerCase();
  const prefix = parts[parts.length - 1];
  const prevWords = parts.length - 1;

  // ── cpim 命令组 ──
  if (base === "cpim") {
    if (prevWords === 1) {
      return matchPrefix(
        (TERMINAL_COMMANDS.cpim ?? []).map((v) => ({ value: v, source: "subcommand" as const })),
        prefix
      );
    }
    const sub = parts[1]?.toLowerCase();
    if (sub === "node") {
      if (prevWords === 2) {
        // 参数位: 真实节点名 (多设备链路协同) + 操作词
        const nodeItems: CompletionItem[] = collectNodeIds().map((id) => ({
          value: id,
          source: "node" as const,
          description: "推理节点",
        }));
        const opItems: CompletionItem[] = (TERMINAL_COMMANDS.node ?? []).map((v) => ({
          value: v,
          source: "subcommand" as const,
        }));
        return matchPrefix([...nodeItems, ...opItems], prefix);
      }
      if (prevWords >= 3) {
        return matchPrefix(
          (TERMINAL_COMMANDS.node ?? []).map((v) => ({ value: v, source: "subcommand" as const })),
          prefix
        );
      }
    }
    if (sub === "model") {
      if (prevWords === 2) {
        return matchPrefix(
          (TERMINAL_COMMANDS.model ?? []).map((v) => ({ value: v, source: "subcommand" as const })),
          prefix
        );
      }
      if (prevWords >= 3 && parts[2]?.toLowerCase() === "deploy") {
        // 参数位: 真实模型 ID (模型管理协同 · hooks 注入)
        const modelItems: CompletionItem[] = (extras.models ?? []).map((id) => ({
          value: id,
          source: "model" as const,
          description: "可部署模型",
        }));
        return matchPrefix(modelItems, prefix);
      }
    }
    const subTable = TERMINAL_COMMANDS[sub] ?? [];
    return matchPrefix(subTable.map((v) => ({ value: v, source: "subcommand" as const })), prefix);
  }

  // ── env 命令 (环境变量协同) ──
  if (base === "env") {
    if (prevWords === 1) {
      return matchPrefix(
        (TERMINAL_COMMANDS.env ?? []).map((v) => ({ value: v, source: "subcommand" as const })),
        prefix
      );
    }
    if (prevWords === 2 && (parts[1] === "get" || parts[1] === "set")) {
      return matchPrefix(
        collectEnvKeys().map((k) => ({ value: k, source: "env-key" as const, description: "环境变量" })),
        prefix
      );
    }
    return [];
  }

  // ── family 命令 (ai-family 多 Agent 协同 · 成员由 components 注入) ──
  if (base === "family") {
    if (prevWords === 1) {
      return matchPrefix(
        (TERMINAL_COMMANDS.family ?? []).map((v) => ({ value: v, source: "subcommand" as const })),
        prefix
      );
    }
    if (prevWords === 2 && parts[1]?.toLowerCase() === "chat") {
      const members = extras.familyMembers ?? [];
      const items: CompletionItem[] = members.flatMap((m) => [
        { value: m.shortName, source: "family" as const, description: `${m.name} · ${m.role}` },
        { value: m.id, source: "family" as const, description: `${m.name} · ${m.role}` },
      ]);
      return matchPrefix(items, prefix);
    }
    return [];
  }

  // ── goto / open 路由跳转 ──
  if (base === "goto" || base === "open") {
    return matchPrefix(
      Object.entries(TERMINAL_ROUTES).map(([value, description]) => ({
        value,
        source: "route" as const,
        description,
      })),
      prefix
    );
  }

  // ── ai Text-to-CLI 意图模板 ──
  if (base === "ai") {
    return matchPrefix(
      AI_INTENTS.map((i) => ({ value: i.phrase, source: "intent" as const, description: i.description })),
      prefix
    );
  }

  // ── ls / cat 虚拟文件路径 ──
  if (base === "ls" || base === "cat") {
    return matchPrefix(
      VIRTUAL_PATHS.map((p) => ({ value: p.path, source: "path" as const, description: p.description })),
      prefix
    );
  }

  return [];
}
