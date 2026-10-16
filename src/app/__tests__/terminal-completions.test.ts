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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSmartCompletions, recordCommand, loadCommandHistory, getCommandStats,
  resetTerminalCompletionData, TERMINAL_ROUTES, BASE_COMMANDS,
} from "../lib/terminal-completions";
import { nodeStore } from "../lib/nodes";
import { LOCALSTORAGE_KEYS } from "../lib/yyc3-storage";
import routesSource from "../routes.ts?raw";

// collectEnvKeys catch 降级臂注入开关 (vi.mock 工厂提升前读取, 故用 vi.hoisted)
const envFailure = vi.hoisted(() => ({ throwOnRead: false }));
vi.mock("../lib/env-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/env-config")>();
  return {
    ...actual,
    getEnvConfig: () => {
      if (envFailure.throwOnRead) throw new Error("env-config unavailable (mock)");
      return actual.getEnvConfig();
    },
  };
});

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
      const firstNode = nodeIds[0]!;
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
      expect(items[0]!.description).toBe("巡查模式");
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
        [...routesSource.matchAll(/path:\s*"([^"]+)"/g)].map((m) => `/${m[1]!.replace(/^\//, "")}`)
      );

      for (const path of Object.keys(TERMINAL_ROUTES)) {
        if (path === "/") continue; // "/" 为 index 路由 (无 path 字面量), 单独断言
        expect(declared.has(path), `终端路由表含 routes.ts 不存在的路径: ${path}`).toBe(true);
      }
      // "/" 根路由 = index 声明
      expect(routesSource).toContain("index: true");
    });

    it("TERMINAL_ROUTES 与 BASE_COMMANDS 键值完备", () => {
      // R3 清理批归档 /loop /users 后 22 条活跃路由
      expect(Object.keys(TERMINAL_ROUTES).length).toBeGreaterThanOrEqual(22);
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

  // ============================================================
  // S5 关键路径补测: 降级臂 / 淘汰臂 / 平局臂 / 限定臂
  // ============================================================
  describe("S5 补测: 动态源降级 (catch 臂)", () => {
    afterEach(() => {
      envFailure.throwOnRead = false;
      vi.restoreAllMocks();
    });

    it("collectNodeIds 降级: nodeStore.getAll 抛错时不外抛且参数位为空", () => {
      vi.spyOn(nodeStore, "getAll").mockImplementation(() => {
        throw new Error("node store unavailable (mock)");
      });
      // "gpu" 前缀在正常态可命中真实节点 (见上方多设备协同用例) → 降级后为空即证明走 catch 臂
      expect(() => getSmartCompletions("cpim node gpu")).not.toThrow();
      expect(getSmartCompletions("cpim node gpu")).toEqual([]);
    });

    it("collectEnvKeys 降级: getEnvConfig 抛错时不外抛且变量名为空", () => {
      envFailure.throwOnRead = true;
      // "SYSTEM" 前缀正常态命中 SYSTEM_NAME (见 env 补全用例) → 降级后为空即证明走 catch 臂
      expect(() => getSmartCompletions("env get SYSTEM")).not.toThrow();
      expect(getSmartCompletions("env get SYSTEM")).toEqual([]);
      expect(getSmartCompletions("env set SYSTEM")).toEqual([]);
    });

    it("动态源显式空数组与未注入等价 (空态)", () => {
      expect(getSmartCompletions("cpim model deploy glm", { models: [] })).toEqual([]);
      expect(getSmartCompletions("family chat 千", { familyMembers: [] })).toEqual([]);
    });
  });

  describe("S5 补测: cpim 子命令回落与限定臂", () => {
    it("cpim node 二段裸输入回落 node 子命令表 (prevWords<3 臂)", () => {
      // prefix "node" 与表内 restart/--all/--force 均不匹配, 但回落路径本身被覆盖
      expect(getSmartCompletions("cpim node").map((i) => i.value)).toEqual([]);
    });

    it("cpim model 二段补全子命令 (prevWords===2 参数位臂)", () => {
      expect(getSmartCompletions("cpim model l").map((i) => i.value)).toEqual(["list"]);
    });

    it("cpim model 裸输入不进 deploy 参数位 (deploy 门槛与短路臂)", () => {
      expect(getSmartCompletions("cpim model").map((i) => i.value)).toEqual([]);
    });

    it("cpim model list 三段非 deploy 参数回落 model 子命令表 (deploy 限定臂)", () => {
      expect(getSmartCompletions("cpim model list x").map((i) => i.value)).toEqual([]);
    });

    it("cpim alerts 三段无补全 (node/model 之外子命令回落臂)", () => {
      expect(getSmartCompletions("cpim alerts x").map((i) => i.value)).toEqual([]);
    });
  });

  describe("S5 补测: env / family 限定臂", () => {
    it("env set 参数位补全变量名 (get/set 双臂之 set)", () => {
      const keys = getSmartCompletions("env set SYSTEM").map((i) => i.value);
      expect(keys).toContain("SYSTEM_NAME");
      expect(keys.every((k) => k === k.toUpperCase())).toBe(true);
    });

    it("env list 三段无变量名补全 (仅 get/set 限定臂)", () => {
      expect(getSmartCompletions("env list x")).toEqual([]);
    });

    it("family list 三段无补全 (仅 chat 限定臂)", () => {
      expect(getSmartCompletions("family list x")).toEqual([]);
    });
  });

  describe("S5 补测: 频率排序平局与持久化淘汰", () => {
    it("同频命令平分时按 value 字典序排序 (byFrequencyThenValue 平分臂 + 缺频兜底臂)", () => {
      // 仅注入频率表 (beforeEach 已清空历史, 避免历史置顶干扰排序断言);
      // cd 缺频 → stats[...] ?? 0 兜底臂; cat/clear/cpim 同频 → localeCompare 平分臂
      localStorage.setItem(
        LOCALSTORAGE_KEYS.terminalCmdStats,
        JSON.stringify({ cat: 2, clear: 2, cpim: 2 })
      );
      const values = getSmartCompletions("c").map((i) => i.value);
      expect(values).toEqual(["cat", "clear", "cpim", "cd"]);
    });

    it("频率表超 200 key 时淘汰最低频尾部 (含脏 null 值容错)", () => {
      // 预置 200 个持久化 key (含 2 个 null 脏值, 模拟历史脏数据), 新命令触发淘汰
      const seeded: Record<string, number | null> = {};
      for (let i = 0; i < 198; i++) seeded[`legacy-${String(i).padStart(3, "0")}`] = 1;
      seeded["legacy-null-a"] = null;
      seeded["legacy-null-b"] = null;
      localStorage.setItem(LOCALSTORAGE_KEYS.terminalCmdStats, JSON.stringify(seeded));

      recordCommand("brand-new-cmd");

      const stats = getCommandStats();
      const keys = Object.keys(stats);
      expect(keys.length).toBe(200);
      expect(stats["brand-new-cmd"]).toBe(1);
      // null 脏值经 ?? 0 归零频排序最前 → 稳定排序下插入序第一个被淘汰
      expect(stats["legacy-null-a"]).toBeUndefined();
      expect(stats["legacy-null-b"]).toBeNull();
    });
  });
});
