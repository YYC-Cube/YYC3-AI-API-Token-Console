/**
 * i18n-packs.test.ts
 * ====================
 * 语言包完整性测试
 *
 * 覆盖范围:
 * - zh-CN 和 en-US key 结构一致性
 * - 所有翻译值非空
 * - 模板变量格式正确
 */

import { describe, it, expect } from "vitest";
import { zhCN, enUS } from "../i18n";

/** 递归获取所有叶子节点 key */
function getAllKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** 递归获取叶子值 */
function getLeafValue(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let current: any = obj;
  for (const p of parts) {
    if (current == null) return undefined;
    current = current[p];
  }
  return current;
}

describe("语言包完整性", () => {
  const zhKeys = getAllKeys(zhCN as Record<string, any>);
  const enKeys = getAllKeys(enUS as Record<string, any>);

  describe("结构一致性", () => {
    it("zh-CN 和 en-US 应有相同数量的 key", () => {
      expect(zhKeys.length).toBe(enKeys.length);
    });

    it("zh-CN 的每个 key 都应在 en-US 中存在", () => {
      for (const key of zhKeys) {
        expect(enKeys).toContain(key);
      }
    });

    it("en-US 的每个 key 都应在 zh-CN 中存在", () => {
      for (const key of enKeys) {
        expect(zhKeys).toContain(key);
      }
    });
  });

  describe("翻译值非空", () => {
    it("zh-CN 所有值应非空", () => {
      for (const key of zhKeys) {
        const val = getLeafValue(zhCN as Record<string, any>, key);
        expect(val, `zh-CN key "${key}" should not be empty`).toBeTruthy();
      }
    });

    it("en-US 所有值应非空", () => {
      for (const key of enKeys) {
        const val = getLeafValue(enUS as Record<string, any>, key);
        expect(val, `en-US key "${key}" should not be empty`).toBeTruthy();
      }
    });
  });

  describe("模板变量一致性", () => {
    it("包含 {n} 的 key 在两种语言中都应有 {n}", () => {
      for (const key of zhKeys) {
        const zhVal = getLeafValue(zhCN as Record<string, any>, key);
        const enVal = getLeafValue(enUS as Record<string, any>, key);
        if (typeof zhVal === "string" && zhVal.includes("{n}")) {
          expect(enVal, `en-US key "${key}" should contain {n}`).toContain("{n}");
        }
      }
    });
  });

  describe("key 覆盖范围", () => {
    it("应覆盖导航模块", () => {
      expect(zhKeys).toContain("nav.dataMonitor");
      expect(zhKeys).toContain("nav.operations");
      expect(zhKeys).toContain("nav.fileManager");
      expect(zhKeys).toContain("nav.aiDecision");
    });

    it("应覆盖 PWA 模块", () => {
      expect(zhKeys).toContain("pwa.title");
      expect(zhKeys).toContain("pwa.swStatus");
      expect(zhKeys).toContain("pwa.offlineReady");
    });

    it("应覆盖 AI 模块", () => {
      expect(zhKeys).toContain("ai.title");
      expect(zhKeys).toContain("ai.severity.critical");
      expect(zhKeys).toContain("ai.impact.high");
    });

    it("应覆盖通用模块", () => {
      expect(zhKeys).toContain("common.loading");
      expect(zhKeys).toContain("common.confirm");
      expect(zhKeys).toContain("common.minutesAgo");
    });
  });
});
