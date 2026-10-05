/**
 * terminal-completions.test.ts
 * =============================
 * 智能化脚本补全闭环引擎测试 (lib 层 · node 项目)
 *
 * 覆盖:
 * - 静态命令/路由/路径补全
 * - 动态源: 节点 (nodeStore) / 环境变量 (env-config) / 模型 (注入) / 成员 (注入)
 * - 闭环: recordCommand 历史+频率持久化 → 补全排序回流
 * - 路由对齐守卫: TERMINAL_ROUTES 与 routes.ts 活跃路由一致 (防漂移)
 * - 大小写不敏感匹配 / 去重截断
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSmartCompletions, recordCommand, loadCommandHistory, getCommandStats,
  resetTerminalCompletionData, TERMINAL_ROUTES, BASE_COMMANDS,
} from "../lib/terminal-completions";
import { nodeStore } from "../lib/nodes";
import routesSource from "../routes.ts?raw";

// unit-node 项目无 localStorage (jsdom 才有) — 引擎持久化层依赖, 注入内存 stub
const memStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => void memStore.set(k, v),
  removeItem: (k: string) => void memStore.delete(k),
  clear: () => void memStore.clear(),
});

const MOCK_MEMBERS = [
  { id: "navigator", shortName: "千行", name: "言启·千行", role: "系统的「耳朵」" },
  { id: "thinker", shortName: "万物", name: "语枢·万物", role: "系统的「哲学家」" },
];
const MOCK_MODELS = ["glm-4-flash", "deepseek-chat", "qwen-72b"];

beforeEach(() => {
  resetTerminalCompletionData();
});

describe("terminal-completions 补全引擎", () => {
  describe("一级命令补全", () => {
    it("前缀 cp 应补全 cpim (含描述)", () => {
      const items = getSmartCompletions("cp");
      const cpim = items.find((i) => i.value === "cpim");
      expect(cpim).toBeDefined();
      expect(cpim?.source).toBe("command");
      expect(cpim?.description).toContain("推理矩阵");
    });

    it("完整命令名不再补全自身 (排除自身)", () => {
      expect(getSmartCompletions("ls")).toEqual([]);
      expect(getSmartCompletions("env")).toEqual([]);
    });

    it("空输入无补全", () => {
      expect(getSmartCompletions("")).toEqual([]);
      expect(getSmartCompletions("   ")).toEqual([]);
    });

    it("历史命令前缀建议优先于静态命令 (一词输入回填完整历史)", () => {
      recordCommand("cpim status");
      recordCommand("cpim patrol run --full");
      // 一词输入 "cpim": 静态自身排除, 但历史完整命令 "cpim status" 回填且排最前
      const items = getSmartCompletions("cpim");
      const first = items[0];
      expect(first?.source).toBe("history");
      expect(["cpim status", "cpim patrol run --full"]).toContain(first?.value);
    });
  });

  describe("cpim 子命令与动态参数", () => {
    it("cpim 二段补全子命令", () => {
      const values = getSmartCompletions("cpim st").map((i) => i.value);
      expect(values).toEqual(["status"]);
    });

    it("cpim node 参数位补全真实节点名 (多设备链路协同)", () => {
      const nodeIds = nodeStore.getAll().map((n) => n.id);
      expect(nodeIds.length).toBeGreaterThan(0);
      const items = getSmartCompletions("cpim node ");
      // 传入尾词为空格分割后的最后一个词 ("") — trim 后 parts 长度 2, 走子命令分支
      // 使用显式节点前缀验证参数位:
      const firstNode = nodeIds[0];
      const paramItems = getSmartCompletions(`cpim node ${firstNode.slice(0, 3)}`);
      expect(paramItems.some((i) => i.value === firstNode && i.source === "node")).toBe(true);
    });

    it("cpim node 参数位大小写不敏感", () => {
      const items = getSmartCompletions("cpim node gpu-a100-0");
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.source === "node")).toBe(true);
    });

    it("cpim model deploy 参数位补全注入模型 (模型管理协同)", () => {
      const items = getSmartCompletions("cpim model deploy glm", { models: MOCK_MODELS });
      expect(items.map((i) => i.value)).toContain("glm-4-flash");
      expect(items.every((i) => i.source === "model")).toBe(true);
    });

    it("未注入模型时 deploy 参数位为空", () => {
      expect(getSmartCompletions("cpim model deploy glm")).toEqual([]);
    });

    it("cpim node restart 旗标补全", () => {
      const values = getSmartCompletions("cpim node restart --").map((i) => i.value);
      expect(values).toContain("--force");
    });
  });

  describe("env 变量补全", () => {
    it("env 子命令与变量名补全", () => {
      expect(getSmartCompletions("env s").map((i) => i.value)).toEqual(["set"]);
      const keys = getSmartCompletions("env get SYSTEM").map((i) => i.value);
      expect(keys).toContain("SYSTEM_NAME");
      expect(keys.every((k) => k === k.toUpperCase())).toBe(true);
    });
  });

  describe("family 成员补全 (ai-family 多 Agent 协同)", () => {
    it("family 子命令补全", () => {
      const values = getSmartCompletions("family c").map((i) => i.value);
      expect(values).toEqual(["chat"]);
    });

    it("family chat 参数位补全成员 shortName + id (含描述)", () => {
      const items = getSmartCompletions("family chat 千", { familyMembers: MOCK_MEMBERS });
      const shortNameItem = items.find((i) => i.value === "千行");
      expect(shortNameItem).toBeDefined();
      expect(shortNameItem?.source).toBe("family");
      expect(shortNameItem?.description).toContain("言启·千行");

      const idItems = getSmartCompletions("family chat nav", { familyMembers: MOCK_MEMBERS });
      expect(idItems.map((i) => i.value)).toContain("navigator");
    });

    it("未注入成员时 family chat 参数位为空", () => {
      expect(getSmartCompletions("family chat 千")).toEqual([]);
    });
  });

  describe("路由补全 (v2 修正表)", () => {
    it("补全活跃路由并带中文描述", () => {
      const items = getSmartCompletions("goto /pat");
      expect(items.map((i) => i.value)).toEqual(["/patrol"]);
      expect(items[0].description).toBe("巡查模式");
    });

    it("不应再补全已重定向死路径 (缺陷修复回归)", () => {
      const routes = getSmartCompletions("goto /").map((i) => i.value);
      expect(routes).not.toContain("/terminal");
      expect(routes).not.toContain("/ide");
      expect(routes).not.toContain("/theme");
      expect(routes).not.toContain("/refactoring");
      expect(routes).not.toContain("/performance");
      expect(routes).not.toContain("/host-files");
      expect(routes).not.toContain("/data-editor");
    });

    it("应包含新增协同路由 (ai-family 系列/连接测试/网关密钥)", () => {
      const routes = getSmartCompletions("goto /").map((i) => i.value);
      expect(routes).toContain("/ai-family");
      expect(routes).toContain("/ai-family-center");
      expect(routes).toContain("/connection-test");
      expect(routes).toContain("/gateway-keys");
    });

    it("open 与 goto 同源", () => {
      expect(getSmartCompletions("open /set").map((i) => i.value)).toEqual(["/settings"]);
    });
  });

  describe("ai 意图模板补全", () => {
    it("ai 参数位补全意图短语 (含目标命令描述)", () => {
      const items = getSmartCompletions("ai 查看");
      const node = items.find((i) => i.value === "查看所有节点状态");
      expect(node).toBeDefined();
      expect(node?.description).toBe("→ cpim node");
    });
  });

  describe("ls/cat 路径补全", () => {
    it("路径前缀补全", () => {
      expect(getSmartCompletions("cat configs/p").map((i) => i.value)).toEqual(["configs/patrol.json"]);
      expect(getSmartCompletions("ls logs").length).toBeGreaterThan(0);
    });

    it("未知命令前缀无补全", () => {
      expect(getSmartCompletions("zzz q")).toEqual([]);
    });
  });

  describe("闭环: 历史与频率反馈", () => {
    it("recordCommand 持久化历史 (去重置顶 + 上限)", () => {
      recordCommand("cpim status");
      recordCommand("env list");
      recordCommand("cpim status"); // 重复 → 置顶不重复
      const history = loadCommandHistory();
      expect(history[0]).toBe("cpim status");
      expect(history).not.toContain("env list, cpim status");
      expect(history.filter((h) => h === "cpim status").length).toBe(1);

      for (let i = 0; i < 60; i++) recordCommand(`cmd-${i}`);
      expect(loadCommandHistory().length).toBeLessThanOrEqual(50);
    });

    it("recordCommand 累计频率统计", () => {
      recordCommand("cpim status");
      recordCommand("cpim status");
      recordCommand("cpim node");
      const stats = getCommandStats();
      expect(stats["cpim"]).toBe(3);
    });

    it("高频命令在一级补全中排序提升 (闭环回流)", () => {
      // 提升 fastfetch 频率 (默认排序中 f 族在 fe/fa 段落后)
      for (let i = 0; i < 5; i++) recordCommand("fastfetch");
      const items = getSmartCompletions("f");
      const values = items.map((i) => i.value);
      expect(values.indexOf("fastfetch")).toBeLessThan(values.indexOf("family"));
    });

    it("空输入 recordCommand 无副作用", () => {
      recordCommand("");
      recordCommand("   ");
      expect(loadCommandHistory()).toEqual([]);
      expect(getCommandStats()).toEqual({});
    });
  });

  describe("路由对齐守卫 (routes.ts 唯一事实源)", () => {
    // 防漂移: 终端路由表必须与 routes.ts 活跃路由一致。
    // 采用 ?raw 源码静态提取 (不执行 routes.ts — node 环境无 DOM, createBrowserRouter 需 document)。
    it("TERMINAL_ROUTES 每条路径都存在于 routes.ts 源码 path 声明", () => {
      const declared = new Set(
        [...routesSource.matchAll(/path:\s*"([^"]+)"/g)].map((m) => `/${m[1].replace(/^\//, "")}`)
      );

      for (const path of Object.keys(TERMINAL_ROUTES)) {
        if (path === "/") continue; // "/" 为 index 路由 (无 path 字面量), 单独断言
        expect(declared.has(path), `终端路由表含 routes.ts 不存在的路径: ${path}`).toBe(true);
      }
      // "/" 根路由 = index 声明
      expect(routesSource).toContain("index: true");
    });

    it("TERMINAL_ROUTES 与 BASE_COMMANDS 键值完备", () => {
      expect(Object.keys(TERMINAL_ROUTES).length).toBeGreaterThanOrEqual(25);
      expect(BASE_COMMANDS["cpim"]).toBeDefined();
      expect(BASE_COMMANDS["family"]).toBeDefined();
    });
  });

  describe("补全列表质量", () => {
    it("候选项去重且不超过 12 条", () => {
      const items = getSmartCompletions("goto /a");
      const values = items.map((i) => i.value);
      expect(new Set(values).size).toBe(values.length);
      expect(items.length).toBeLessThanOrEqual(12);
    });
  });
});
