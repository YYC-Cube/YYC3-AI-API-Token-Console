/**
 * useTerminal.ts
 * ===============
 * CLI 终端模拟 Hook
 * 解析 cpim 命令、维护历史记录、智能补全闭环
 *
 * 支持:
 * - cpim 系列管理命令
 * - env 命令 — 真实读写 env-config.ts (localStorage 持久化)
 * - family 命令 — AI Family 多 Agent 成员档案 (成员数据由组件层注入)
 * - 常见 *nix 工具命令 (ls, cat, ping …)
 * - goto / open 路由跳转 (路由表与 routes.ts 对齐, 见 lib/terminal-completions)
 * - ai <prompt> Text-to-CLI (模拟)
 * - 智能补全闭环: 历史/频率持久化反馈补全排序 (lib/terminal-completions.ts)
 */

import { useState, useCallback, useMemo, useRef } from "react";
import type { TerminalHistoryEntry } from "../types";
import {
  env, getEnvConfig, setEnvConfig, resetEnvConfig, exportEnvConfig,
  type EnvConfig,
} from "../lib/env-config";
import {
  getSmartCompletions, loadCommandHistory, recordCommand,
  TERMINAL_ROUTES,
  type CompletionItem, type TerminalExtraSources,
} from "../lib/terminal-completions";
import builtinProvidersJson from "../config/providers/builtin-providers.json";

// ============================================================
// Command Registry (静态命令表与路由表已迁至 lib/terminal-completions)
// ============================================================

/** 路由路径 → 中文名 映射 (单一事实源: lib/terminal-completions.TERMINAL_ROUTES) */
const ROUTE_LABELS = TERMINAL_ROUTES;

/** 模型 ID 种子 (hooks→config 合规先例同 useModelProvider): 补全参数位消费 */
const PROVIDER_MODELS: string[] = (builtinProvidersJson as { models?: string[] }[])
  .flatMap((p) => p.models ?? []);

interface CommandResult {
  output: string;
  status: "success" | "error" | "info";
  navigate?: string;
  aiQuery?: string;
}

// ============================================================
// AI Text-to-CLI Mock
// ============================================================

function aiTextToCli(prompt: string): { suggestion: string; explanation: string } {
  const p = prompt.toLowerCase();

  if (p.includes("节点") && (p.includes("状态") || p.includes("列表") || p.includes("查看"))) {
    return { suggestion: "cpim node", explanation: "列出所有节点的状态信息" };
  }
  if (p.includes("重启") && p.includes("节点")) {
    return { suggestion: "cpim node restart --all --force", explanation: "强制重启所有异常节点" };
  }
  if (p.includes("告警") || p.includes("报警") || p.includes("异常")) {
    return { suggestion: "cpim alerts --unresolved", explanation: "显示所有未解决的告警" };
  }
  if (p.includes("巡查") || p.includes("巡检") || p.includes("健康检查")) {
    return { suggestion: "cpim patrol run --full", explanation: "执行完整巡查并生成报告" };
  }
  if (p.includes("模型") && (p.includes("列表") || p.includes("部署") || p.includes("查看"))) {
    if (p.includes("部署")) {
      const modelMatch = p.match(/(llama|deepseek|qwen|gpt)/i);
      return { suggestion: `cpim model deploy ${modelMatch?.[0] ?? "LLaMA-70B"}`, explanation: "部署指定模型到可用节点" };
    }
    return { suggestion: "cpim model list", explanation: "列出所有已部署模型及状态" };
  }
  if (p.includes("报告") || p.includes("性能") || p.includes("报表")) {
    return { suggestion: "cpim report --type performance --format json", explanation: "生成性能分析报告" };
  }
  if (p.includes("环境") || p.includes("env") || p.includes("变量") || p.includes("配置")) {
    return { suggestion: "env list", explanation: "查看所有环境变量配置" };
  }
  if (p.includes("存储") || p.includes("磁盘") || p.includes("硬盘")) {
    return { suggestion: "df", explanation: "查看文件系统磁盘使用情况" };
  }
  if (p.includes("进程") || p.includes("cpu") || p.includes("内存")) {
    return { suggestion: "htop", explanation: "查看当前运行进程和资源使用" };
  }
  if (p.includes("网络") || (p.includes("ping") || p.includes("延迟"))) {
    return { suggestion: "ping 192.168.3.1", explanation: "测试与网关的网络连通性" };
  }
  if (p.includes("系统") && (p.includes("信息") || p.includes("版本"))) {
    return { suggestion: "neofetch", explanation: "显示系统详细信息" };
  }
  if (p.includes("跳转") || p.includes("打开") || p.includes("去")) {
    if (p.includes("监控")) return { suggestion: "goto /", explanation: "跳转到数据监控页面" };
    if (p.includes("操作")) return { suggestion: "goto /operations", explanation: "跳转到操作中心" };
    if (p.includes("设置")) return { suggestion: "goto /settings", explanation: "跳转到系统设置" };
    return { suggestion: "goto /", explanation: "跳转到首页" };
  }
  if (p.includes("清") && (p.includes("屏") || p.includes("空"))) {
    return { suggestion: "clear", explanation: "清空终端屏幕" };
  }
  if (p.includes("帮助") || p.includes("help") || p.includes("命令")) {
    return { suggestion: "help", explanation: "显示所有可用命令列表" };
  }

  return { suggestion: "cpim status", explanation: "无法精确匹配意图，显示系统总览" };
}

// ============================================================
// env 命令处理器 (真实读写 env-config.ts)
// ============================================================

function processEnvCommand(parts: string[]): CommandResult {
  const action = parts[1]?.toLowerCase();

  if (!action || action === "list") {
    const cfg = getEnvConfig();
    const lines = Object.entries(cfg).map(([k, v]) => {
      const val = typeof v === "string" ? `"${v}"` : String(v);
      return `  ${k.padEnd(28)} = ${val}`;
    });
    return {
      status: "success",
      output: `环境变量配置 (${Object.keys(cfg).length} 项):\n${lines.join("\n")}\n\n  优先级: import.meta.env > localStorage > 默认值\n  提示: env set <KEY> <VALUE> 修改配置`,
    };
  }

  if (action === "get") {
    const key = parts[2];
    if (!key) return { status: "error", output: "用法: env get <KEY>\n  示例: env get SYSTEM_NAME" };
    const cfg = getEnvConfig();
    const k = key as keyof EnvConfig;
    if (k in cfg) {
      const val = cfg[k];
      return { status: "success", output: `${k} = ${typeof val === "string" ? `"${val}"` : val}` };
    }
    const fuzzy = Object.keys(cfg).filter((ck) => ck.toLowerCase().includes(key.toLowerCase()));
    if (fuzzy.length > 0) {
      return { status: "error", output: `未找到: ${key}\n相似变量: ${fuzzy.join(", ")}` };
    }
    return { status: "error", output: `未找到环境变量: ${key}\n输入 env list 查看所有变量` };
  }

  if (action === "set") {
    const key = parts[2];
    const rawVal = parts.slice(3).join(" ");
    if (!key || !rawVal) {
      return { status: "error", output: "用法: env set <KEY> <VALUE>\n  示例: env set SYSTEM_NAME \"My System\"\n  示例: env set DEFAULT_AI_TEMPERATURE 0.8\n  示例: env set ENABLE_DEBUG true" };
    }
    const cfg = getEnvConfig();
    const k = key as keyof EnvConfig;
    if (!(k in cfg)) {
      return { status: "error", output: `未知变量: ${key}\n输入 env list 查看所有可用变量` };
    }

    const currentVal = cfg[k];
    let newVal: string | number | boolean;

    if (typeof currentVal === "boolean") {
      newVal = rawVal === "true" || rawVal === "1";
    } else if (typeof currentVal === "number") {
      newVal = rawVal.includes(".") ? parseFloat(rawVal) : parseInt(rawVal, 10);
      if (isNaN(newVal as number)) return { status: "error", output: `无效数值: ${rawVal}` };
    } else {
      newVal = rawVal.replace(/^["']|["']$/g, ""); // strip quotes
    }

    setEnvConfig({ [k]: newVal } as Partial<EnvConfig>);
    return {
      status: "success",
      output: `✅ ${k} = ${typeof newVal === "string" ? `"${newVal}"` : newVal}  (已保存到 localStorage)\n  旧值: ${typeof currentVal === "string" ? `"${currentVal}"` : currentVal}`,
    };
  }

  if (action === "reset") {
    const confirmed = parts[2] === "--confirm" || parts[2] === "-y";
    if (!confirmed) {
      return { status: "info", output: "⚠️  此操作将清除所有 localStorage 中的环境变量覆盖,\n   恢复为默认值 + import.meta.env 值。\n\n   确认执行: env reset --confirm" };
    }
    const result = resetEnvConfig();
    return { status: "success", output: `✅ 环境变量已重置 (${Object.keys(result).length} 项恢复默认)` };
  }

  if (action === "export") {
    const json = exportEnvConfig();
    return { status: "success", output: `环境变量导出 JSON:\n${json}` };
  }

  return { status: "error", output: `未知 env 操作: ${action}\n用法: env [list|get|set|reset|export]` };
}

// ============================================================
// Command Processor
// ============================================================

function processCommand(input: string): CommandResult {
  const parts = input.trim().split(/\s+/);
  const base = parts[0]?.toLowerCase();

  if (!base) return { output: "", status: "info" };
  if (base === "clear") return { output: "__CLEAR__", status: "info" };

  // ── env 命令 (真实 env-config 读写) ──
  if (base === "env") return processEnvCommand(parts);

  // ── goto / open 路由跳转 ──
  if (base === "goto" || base === "open") {
    const target = parts[1];
    if (!target) {
      const routeList = Object.entries(ROUTE_LABELS)
        .map(([path, label]) => `  ${path.padEnd(18)} ${label}`)
        .join("\n");
      return { status: "info", output: `用法: ${base} <path>\n\n可用路由:\n${routeList}` };
    }
    let matchedPath = target.startsWith("/") ? target : `/${target}`;
    const byLabel = Object.entries(ROUTE_LABELS).find(([, label]) => label.includes(target));
    if (byLabel) matchedPath = byLabel[0];
    const label = ROUTE_LABELS[matchedPath];
    if (label) {
      return { status: "success", output: `导航至: ${label} (${matchedPath})`, navigate: matchedPath };
    }
    return { status: "error", output: `未知路由: ${target}\n输入 ${base} 查看所有可用路由` };
  }

  // ── ai <prompt> Text-to-CLI ──
  if (base === "ai") {
    const prompt = parts.slice(1).join(" ");
    if (!prompt) {
      return { status: "info", output: `用法: ai <自然语言描述>\n\n示例:\n  ai 查看所有节点状态\n  ai 重启异常节点\n  ai 查看环境变量\n  ai 生成性能报告` };
    }
    return { status: "info", output: "", aiQuery: prompt };
  }

  if (base === "help" || input === "cpim help" || input === "cpim --help") {
    const sysName = env("SYSTEM_NAME");
    const sysVer = env("SYSTEM_VERSION");
    return {
      status: "info",
      output: `${sysName} CLI v${sysVer}

CPIM 命令:
  cpim status                     查看系统总览
  cpim node [name]                查看节点列表/详情
  cpim node restart [--all]       重启节点
  cpim model list                 列出已部署模型
  cpim model deploy <name>        部署模型
  cpim alerts [--unresolved]      查看告警列表
  cpim patrol run [--full]        执行巡查
  cpim patrol history             查看巡查历史
  cpim report [--type perf]       生成报告
  cpim config [get|set|list]      配置管理

环境变量 (真实读写):
  env list                        查看所有环境变量
  env get <KEY>                   读取指定变量
  env set <KEY> <VALUE>           修改变量 (持久化)
  env reset --confirm             重置为默认值
  env export                      导出 JSON

路由跳转:
  goto <path>   导航到指定页面     open <path>   同义
  goto          列出所有可用路由

AI 助手:
  ai <描述>     自然语言转 CLI 命令 (Text-to-CLI)

AI Family 多 Agent:
  family                       列出 8 位家人成员档案
  family chat <成员>           查看成员详情 (Tab 补全成员名)

系统命令:
  ls [dir]      列出目录内容      cat <file>    查看文件内容
  pwd           当前目录          cd <dir>      切换目录
  whoami        当前用户          date          当前时间
  uptime        运行时间          df            磁盘用量
  htop / top    进程列表          ping <host>   网络测试
  neofetch      系统信息          echo <text>   输出文本
  history       命令历史          clear         清屏
  exit          关闭终端

快捷键:  ↑/↓ 历史导航 · Tab 自动补全 · Ctrl+\` 切换终端`,
    };
  }

  if (base === "cpim") {
    const sub = parts[1]?.toLowerCase();
    const sysName = env("SYSTEM_NAME");
    const sysVer = env("SYSTEM_VERSION");
    const wsEndpoint = env("WS_ENDPOINT");

    if (!sub || sub === "status") {
      return {
        status: "success",
        output: `┌─────────────────────────────────────────┐
│  ${sysName}  v${sysVer}         │
│  ─────────────────────────────────────  │
│  活跃节点:    7/8        ✅             │
│  GPU 利用率:  82.4%      ●●●●●●●●○○    │
│  推理 QPS:    3,842      ↑12.3%        │
│  平均延迟:    48ms       ↓5.2%         │
│  Token 吞吐:  138K/s                    │
│  存储使用:    12.8TB / 48TB             │
│  告警:        5 条 (1 严重)             │
│  ─────────────────────────────────────  │
│  上次巡查: 30 分钟前 · 健康度 96%      │
│  WebSocket: ${wsEndpoint} ✅      │
│  PostgreSQL: localhost:5433 ✅          │
└─────────────────────────────────────────┘`,
      };
    }

    if (sub === "node") {
      const target = parts[2];
      if (!target) {
        return {
          status: "success",
          output: `节点列表:
  ✅ GPU-A100-01   GPU: 72%  Mem: 65%  45°C  LLaMA-70B    3 任务
  ✅ GPU-A100-02   GPU: 68%  Mem: 58%  42°C  DeepSeek-V3  2 任务
  ⚠️  GPU-A100-03   GPU: 91%  Mem: 89%  78°C  LLaMA-70B    5 任务  延迟高
  ✅ GPU-A100-04   GPU: 45%  Mem: 32%  38°C  Qwen-72B     1 任务
  ✅ GPU-H100-01   GPU: 55%  Mem: 48%  41°C  DeepSeek-V3  2 任务
  🔴 GPU-H100-02   GPU: 98%  Mem: 95%  85°C  LLaMA-70B    0 任务  显存不足
  ✅ M4-Max-01     GPU: 30%  Mem: 42%  52°C  Qwen-72B     1 任务

  共 7 节点, 6 正常, 1 警告, 1 异常`,
        };
      }
      if (target === "restart") {
        const force = parts.includes("--force");
        return {
          status: "success",
          output: `${force ? "强制" : ""}重启节点...
  ⏳ GPU-A100-03  重启中...    [████████░░] 80%
  ⏳ GPU-H100-02  重启中...    [██████░░░░] 60%
  ✅ 2 个节点已发送重启指令`,
        };
      }
      return {
        status: "success",
        output: `节点详情: ${target}
  状态:    ✅ 在线
  GPU:     72% ●●●●●●●○○○
  内存:    65% ●●●●●●○○○○
  温度:    45°C
  模型:    LLaMA-70B
  活跃任务: 3
  运行时间: 48h 23m
  最近告警: 无`,
      };
    }

    if (sub === "model") {
      const action = parts[2]?.toLowerCase();
      if (action === "list" || !action) {
        return {
          status: "success",
          output: `已部署模型:
  │ 模型          │ 节点         │ 延迟     │ 状态   │
  │───────────────│──────────────│──────────│────────│
  │ LLaMA-70B     │ GPU-A100-01  │ 820ms   │ ✅     │
  │ DeepSeek-V3   │ GPU-A100-02  │ 1,200ms │ ✅     │
  │ Qwen-72B      │ GPU-A100-04  │ 950ms   │ ✅     │
  │ LLaMA-70B     │ GPU-A100-03  │ 2,450ms │ ⚠️     │

  共 4 个部署实例`,
        };
      }
      if (action === "deploy") {
        const modelName = parts[3] ?? "unknown";
        return {
          status: "success",
          output: `部署模型: ${modelName}
  ⏳ 检查节点可用性...  ✅
  ⏳ 上传模型权重...    [████████████████████] 100%
  ⏳ 配置推理参数...    ✅
  ⏳ 冒烟测试...        ✅  延迟 890ms
  ✅ 模型 ${modelName} 部署成功`,
        };
      }
      return { status: "error", output: `未知模型操作: ${action}\n使用 cpim model --help 查看帮助` };
    }

    if (sub === "alerts") {
      return {
        status: "success",
        output: `告警列表:
  🔴 [AL-0032] GPU-A100-03 推理延迟异常   2,450ms > 2,000ms     活跃
  🟠 [AL-0035] NAS-Storage-01 存储 85.8%  接近阈值 85%          活跃
  🟠 [AL-0038] 网络延迟偏高               平均 45ms > 30ms      排查中
  🟠 [AL-0040] GPU-H100-02 显存使用率 98% 接近满载              活跃
  🔵 [AL-0042] 推理队列积压               等待任务 23 > 15      已解决

  共 5 条告警: 1 严重, 1 错误, 2 警告, 1 信息`,
      };
    }

    if (sub === "patrol") {
      const action = parts[2]?.toLowerCase();
      if (action === "run") {
        return {
          status: "success",
          output: `执行巡查${parts.includes("--full") ? " (完整模式)" : ""}...
  ⏳ 检查节点健康...    [████████████] 6/6 ✅
  ⏳ 检查存储容量...    [████████████] 3/3 ⚠️
  ⏳ 检查网络延迟...    [████████████] 3/3 ⚠️
  ⏳ 检查模型服务...    [████████████] 3/3 ✅
  ⏳ 检查数据库...      [████████████] 2/2 ✅
  ⏳ 检查进程状态...    [████████████] 3/3 ✅

  巡查完成!
  健康度: 85%  耗时: 12s
  通过: 17  警告: 3  严重: 0`,
        };
      }
      if (action === "history") {
        return {
          status: "success",
          output: `巡查历史:
  │ 时间               │ 健康度 │ 通过 │ 警告 │ 严重 │ 触发   │
  │────────────────────│────────│──────│──────│──────│────────│
  │ 2026-03-07 10:00   │  96%   │  18  │   2  │   0  │ 自动   │
  │ 2026-03-07 09:30   │  95%   │  17  │   3  │   0  │ 自动   │
  │ 2026-03-07 09:00   │  97%   │  19  │   1  │   0  │ 自动   │
  │ 2026-03-07 08:00   │  92%   │  16  │   3  │   1  │ 手动   │

  共 4 条记录`,
        };
      }
      return {
        status: "success",
        output: `巡查状态:
  自动巡查: ✅ 启用 (每 15 分钟)
  上次巡查: 30 分钟前  健康度 96%
  下次巡查: 约 15 分钟后
  累计巡查: 127 次`,
      };
    }

    if (sub === "report") {
      return {
        status: "success",
        output: `生成报告...
  类型: ${parts.includes("health") ? "健康" : "性能"}报告
  格式: ${parts.includes("markdown") ? "Markdown" : "JSON"}
  ✅ 报告已生成: ~/.cpim-cloudpivot/reports/daily/2026-03-07.json
  📊 节点性能: 82.4% 平均 GPU 利用率
  📈 推理延迟: 48ms 平均 (↓5.2%)
  📁 文件大小: 156KB`,
      };
    }

    if (sub === "config") {
      const action = parts[2]?.toLowerCase();
      if (action === "list") {
        return {
          status: "success",
          output: `系统配置:
  patrol.interval         = ${env("ENABLE_MOCK_MODE") ? "15" : "15"}
  patrol.auto_enabled     = true
  notification.email      = admin@cpim.local
  ws.endpoint             = ${env("WS_ENDPOINT")}
  ollama.base_url         = ${env("OLLAMA_BASE_URL")}
  storage.prefix          = ${env("STORAGE_PREFIX")}
  log.retention_days      = 30
  提示: 更多配置请使用 env list 查看环境变量`,
        };
      }
      if (action === "get") {
        const key = parts[3] ?? "unknown";
        const values: Record<string, string> = {
          "patrol.interval": "15",
          "notification.email": "admin@cpim.local",
          "ws.endpoint": env("WS_ENDPOINT"),
        };
        return {
          status: values[key] ? "success" : "error",
          output: values[key] ? `${key} = ${values[key]}` : `未找到配置项: ${key}`,
        };
      }
      if (action === "set") {
        const key = parts[3];
        const val = parts[4];
        if (key && val) {
          return { status: "success", output: `✅ ${key} = ${val}  (已更新)` };
        }
        return { status: "error", output: "用法: cpim config set <key> <value>" };
      }
      return { status: "info", output: "用法: cpim config [get|set|list]" };
    }

    return { status: "error", output: `未知子命令: ${sub}\n输入 cpim help 查看帮助` };
  }

  // ── Unix-like 命令 ──
  if (base === "ls") {
    const dir = parts[1];
    if (!dir) return { status: "success", output: "logs/  reports/  backups/  configs/  cache/" };
    const dirs: Record<string, string> = {
      "logs": "node/  system/",
      "logs/": "node/  system/",
      "reports": "daily/  weekly/  monthly/",
      "reports/": "daily/  weekly/  monthly/",
      "configs": "patrol.json  alerts.json  templates.json  env.json",
      "configs/": "patrol.json  alerts.json  templates.json  env.json",
      "backups": "nodes/  models/  config/",
      "backups/": "nodes/  models/  config/",
      "cache": "queries/",
      "cache/": "queries/",
      "logs/node": "GPU-A100-01/  GPU-A100-02/  GPU-A100-03/  GPU-A100-04/  GPU-H100-01/  GPU-H100-02/  M4-Max-01/",
      "logs/system": "app.log  performance.json",
    };
    return {
      status: dirs[dir] ? "success" : "error",
      output: dirs[dir] ?? `ls: cannot access '${dir}': No such file or directory`,
    };
  }
  if (base === "pwd") return { status: "success", output: "~/.cpim-cloudpivot" };
  if (base === "whoami") return { status: "success", output: "admin@cpim-cloudpivot" };
  if (base === "date") return { status: "success", output: new Date().toLocaleString("zh-CN") };
  if (base === "uptime") {
    return {
      status: "success",
      output: ` ${new Date().toLocaleTimeString("zh-CN")} up 48 days, 12:37,  3 users,  load average: 2.15, 1.89, 1.72`,
    };
  }
  if (base === "neofetch" || base === "fastfetch") {
    const sysName = env("SYSTEM_NAME");
    const sysVer = env("SYSTEM_VERSION");
    return {
      status: "info",
      output: `        ╭──────────────────────────────╮
   ╱╲   │  ${sysName.slice(0, 24).padEnd(24)}  │
  ╱  ╲  │  v${sysVer.padEnd(26)}│
 ╱ ╱╲ ╲ │  OS:     macOS 15.3 (M4 Max) │
╱ ╱──╲ ╲│  Host:   Mac Studio (2025)   │
╲ ╲──╱ ╱│  Kernel: Darwin 24.3.0       │
 ╲ ╲╱ ╱ │  Shell:  cpim-cli ${sysVer}      │
  ╲  ╱  │  CPU:    M4 Max (16-core)    │
   ╲╱   │  GPU:    M4 Max (40-core)    │
         │  Memory: 128GB Unified       │
         │  Nodes:  7/8 Active          │
         │  Models: 4 Deployed          │
         │  Uptime: 48d 12h 37m         │
         ╰──────────────────────────────╯`,
    };
  }
  if (base === "htop" || base === "top") {
    return {
      status: "info",
      output: `PID    USER      CPU%  MEM%  TIME+     COMMAND
 1024  admin     72.3  65.2  12:45:23  llama-inference (GPU-A100-01)
 1156  admin     68.1  58.4  10:32:11  deepseek-serve  (GPU-A100-02)
 1287  admin     91.2  89.1  08:15:47  llama-inference (GPU-A100-03) ⚠️
 1345  admin     45.3  32.1  06:42:33  qwen-inference  (GPU-A100-04)
 1478  admin     55.7  48.9  04:28:15  deepseek-serve  (GPU-H100-01)
 1589  admin     98.1  95.2  02:14:08  llama-inference (GPU-H100-02) 🔴
 1623  admin     30.4  42.6  01:05:44  qwen-inference  (M4-Max-01)
 ────────────────────────────────────────────────────
 Tasks: 7 total, 7 running | CPU: 65.9% | Mem: 61.5%`,
    };
  }
  if (base === "ping") {
    const host = parts[1] ?? "localhost";
    return {
      status: "success",
      output: `PING ${host} (192.168.3.${Math.floor(Math.random() * 254) + 1}): 56 data bytes
64 bytes: icmp_seq=0 ttl=64 time=0.${Math.floor(Math.random() * 900) + 100} ms
64 bytes: icmp_seq=1 ttl=64 time=0.${Math.floor(Math.random() * 900) + 100} ms
64 bytes: icmp_seq=2 ttl=64 time=0.${Math.floor(Math.random() * 900) + 100} ms

--- ${host} ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max = 0.123/0.456/0.789 ms`,
    };
  }
  if (base === "df") {
    return {
      status: "success",
      output: `Filesystem      Size  Used  Avail  Use%  Mounted on
/dev/nvme0n1    2.0T  1.2T  800G   60%   /
/dev/nas0       48T   12.8T 35.2T  27%   /mnt/nas
tmpfs           64G   12G   52G    19%   /dev/shm`,
    };
  }
  if (base === "echo") return { status: "success", output: parts.slice(1).join(" ") };
  if (base === "cat") {
    const file = parts[1];
    if (file === "configs/patrol.json") {
      return {
        status: "success",
        output: `{
  "interval": 15,
  "auto_enabled": true,
  "checks": ["nodes", "storage", "network", "models", "database", "processes"],
  "thresholds": { "gpu_temp": 80, "mem_usage": 90, "latency_ms": 100 }
}`,
      };
    }
    if (file === "configs/alerts.json") {
      return {
        status: "success",
        output: `{
  "thresholds": {
    "gpu_usage": 90,
    "memory_usage": 85,
    "latency_ms": 2000,
    "storage_percent": 85,
    "temperature_c": 80
  },
  "notification": { "email": true, "push": true, "sound": false }
}`,
      };
    }
    if (file === "configs/templates.json") {
      return {
        status: "success",
        output: `{
  "templates": [
    { "id": "t-001", "name": "模型部署标准流程", "steps": 5 },
    { "id": "t-002", "name": "节点故障排查流程", "steps": 8 },
    { "id": "t-003", "name": "每日备份任务", "steps": 3 }
  ]
}`,
      };
    }
    if (file === "configs/env.json") {
      return { status: "success", output: exportEnvConfig() };
    }
    return { status: "error", output: file ? `cat: ${file}: No such file or directory` : "cat: missing operand" };
  }
  if (base === "cd") return { status: "success", output: "" };
  if (base === "history") {
    const persisted = loadCommandHistory();
    if (persisted.length === 0) {
      return { status: "info", output: "命令历史为空 (跨会话持久化于 localStorage)。\nUse ↑/↓ arrow keys to navigate." };
    }
    const lines = persisted
      .slice(0, 20)
      .map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`)
      .join("\n");
    return {
      status: "info",
      output: `Command history (持久化 · 最近 ${Math.min(persisted.length, 20)}/${persisted.length} 条):\n${lines}\n\nUse ↑/↓ arrow keys to navigate.`,
    };
  }
  if (base === "exit" || base === "quit") return { status: "info", output: "Use Ctrl+` or click ✕ to close the integrated terminal." };

  return { status: "error", output: `命令未找到: ${base}\n输入 help 查看可用命令` };
}

// ============================================================
// Autocomplete — 已升级为 lib/terminal-completions 智能闭环引擎
// (上下文感知分派 + 历史/频率持久化排序; 本文件仅保留 Hook 接线)
// ============================================================

// ============================================================
// Hook
// ============================================================

interface UseTerminalOptions {
  onNavigate?: (path: string) => void;
  tabId?: string;
  /** 组件层注入的动态补全源 (family 成员等, 分层桥接) */
  extraSources?: TerminalExtraSources;
}

/** family 命令处理 (成员数据由组件层注入, 不在 lib 依赖 components) */
function processFamilyCommand(
  input: string,
  members: NonNullable<TerminalExtraSources["familyMembers"]>
): CommandResult {
  const parts = input.trim().split(/\s+/);
  const action = parts[1]?.toLowerCase();

  if (!action || action === "list") {
    const lines = members
      .map((m) => `  ${m.shortName.padEnd(4)}  ${m.name}  ·  ${m.role}  [${m.id}]`)
      .join("\n");
    return {
      status: "success",
      output: `AI Family 成员 (${members.length} 位):\n${lines}\n\n  提示: family chat <成员名> 查看详情 · Tab 可补全成员名`,
    };
  }

  if (action === "chat") {
    const target = parts.slice(2).join(" ").toLowerCase();
    if (!target) {
      return { status: "info", output: "用法: family chat <成员名>\n成员: " + members.map((m) => m.shortName).join(" / ") };
    }
    const member = members.find(
      (m) => m.id.toLowerCase() === target || m.shortName === target || m.name === target ||
             m.shortName.includes(target) || m.name.toLowerCase().includes(target)
    );
    if (!member) {
      return { status: "error", output: `未找到成员: ${target}\n输入 family list 查看全部成员` };
    }
    return {
      status: "success",
      output: `👨‍👩‍👧 ${member.name} (${member.shortName} · ${member.id})
  角色: ${member.role}
  状态: 可对话
  前往对话: goto /ai-family (Tab 补全路由)`,
    };
  }

  return { status: "error", output: `未知 family 操作: ${action}\n用法: family [list|chat <成员>]` };
}

export function useTerminal(options: UseTerminalOptions = {}) {
  const { onNavigate, tabId = "main", extraSources } = options;
  const sysName = env("SYSTEM_NAME");
  const sysVer = env("SYSTEM_VERSION");

  const [history, setHistory] = useState<TerminalHistoryEntry[]>([
    {
      id: `init-${tabId}`,
      input: "",
      output: `${sysName} CLI v${sysVer}\n本地闭环终端 · 输入 help 查看可用命令\n提示: ai <自然语言> 可将描述转为 CLI 命令 · env list 查看环境变量 · Tab 智能补全\n`,
      timestamp: Date.now(),
      status: "info",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);

  // 跨会话历史: 初始化自持久化层 (闭环回流), 会话内新增置顶
  const persistedHistory = useMemo(() => loadCommandHistory(), []);
  const inputHistory = useRef<string[]>([...persistedHistory]);

  const execute = useCallback((input: string) => {
    if (!input.trim()) return;

    // 闭环写入: 历史 + 频率 (补全排序反馈)
    recordCommand(input);
    inputHistory.current = [input, ...inputHistory.current.filter((h) => h !== input).slice(0, 49)];
    setHistoryIndex(-1);

    // ── family 命令 (成员注入) ──
    const base = input.trim().split(/\s+/)[0]?.toLowerCase();
    if (base === "family") {
      const result = processFamilyCommand(input, extraSources?.familyMembers ?? []);
      setHistory((prev) => [
        ...prev,
        { id: `cmd-${Date.now()}`, input, output: result.output, timestamp: Date.now(), status: result.status },
      ]);
      setInputValue("");
      setCompletionItems([]);
      return;
    }

    const result = processCommand(input);

    if (result.output === "__CLEAR__") {
      setHistory([]);
      setInputValue("");
      setCompletionItems([]);
      return;
    }

    // ── AI Text-to-CLI ──
    if (result.aiQuery) {
      const { suggestion, explanation } = aiTextToCli(result.aiQuery);
      const aiEntry: TerminalHistoryEntry = {
        id: `cmd-${Date.now()}`,
        input,
        output: `🤖 AI Text-to-CLI\n  意图: ${result.aiQuery}\n  建议: ${suggestion}\n  说明: ${explanation}\n\n  ▶ 正在自动执行: ${suggestion}`,
        timestamp: Date.now(),
        status: "info",
      };
      setHistory((prev) => [...prev, aiEntry]);

      setTimeout(() => {
        const followUp = processCommand(suggestion);
        if (followUp.navigate && onNavigate) onNavigate(followUp.navigate);
        if (followUp.output !== "__CLEAR__") {
          const followEntry: TerminalHistoryEntry = {
            id: `cmd-ai-${Date.now()}`,
            input: suggestion,
            output: followUp.output,
            timestamp: Date.now(),
            status: followUp.status,
          };
          setHistory((prev) => [...prev, followEntry]);
        }
      }, 400);

      setInputValue("");
      setCompletionItems([]);
      return;
    }

    if (result.navigate && onNavigate) onNavigate(result.navigate);

    const entry: TerminalHistoryEntry = {
      id: `cmd-${Date.now()}`,
      input,
      output: result.output,
      timestamp: Date.now(),
      status: result.status,
    };

    setHistory((prev) => [...prev, entry]);
    setInputValue("");
    setCompletionItems([]);
  }, [onNavigate, extraSources]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setCompletionItems(
      value.trim()
        ? getSmartCompletions(value, { ...extraSources, models: PROVIDER_MODELS })
        : []
    );
  }, [extraSources]);

  const handleHistoryNav = useCallback((direction: "up" | "down") => {
    if (inputHistory.current.length === 0) return;
    if (direction === "up") {
      const newIndex = Math.min(historyIndex + 1, inputHistory.current.length - 1);
      setHistoryIndex(newIndex);
      setInputValue(inputHistory.current[newIndex]);
    } else {
      const newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setInputValue("");
      } else {
        setHistoryIndex(newIndex);
        setInputValue(inputHistory.current[newIndex]);
      }
    }
  }, [historyIndex]);

  const applyCompletion = useCallback((completion: string) => {
    const parts = inputValue.trim().split(/\s+/);
    parts[parts.length - 1] = completion;
    const newInput = parts.join(" ") + " ";
    setInputValue(newInput);
    setCompletionItems(getSmartCompletions(newInput, { ...extraSources, models: PROVIDER_MODELS }));
  }, [inputValue, extraSources]);

  // 对外兼容: completions 保持 string[] (既有 UI/测试), 元数据单独上抛
  const completions = useMemo(() => completionItems.map((c) => c.value), [completionItems]);
  const completionMeta = useMemo(() => {
    const meta: Record<string, { source: CompletionItem["source"]; description?: string }> = {};
    for (const c of completionItems) meta[c.value] = { source: c.source, description: c.description };
    return meta;
  }, [completionItems]);

  return {
    history,
    inputValue,
    completions,
    completionMeta,
    execute,
    handleInputChange,
    handleHistoryNav,
    applyCompletion,
  };
}
