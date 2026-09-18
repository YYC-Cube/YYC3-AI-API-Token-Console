/**
 * i18n-consistency.test.ts
 * =========================
 * 全量 i18n key 一致性验证
 *
 * 覆盖范围:
 * - zh-CN / en-US 完全一致
 * - 所有命名空间存在性
 * - key 总数统计
 * - 无空值检查
 */

import { describe, it, expect } from "vitest";
import zhCN from "../i18n/zh-CN";
import enUS from "../i18n/en-US";

function getNestedKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null) {
      keys.push(...getNestedKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null) return undefined;
    result = result[k];
  }
  return result;
}

const zhKeys = getNestedKeys(zhCN as Record<string, any>);
const enKeys = getNestedKeys(enUS as Record<string, any>);

describe("i18n 全量一致性验证", () => {
  describe("key 数量", () => {
    it("zh-CN 应有 300+ key", () => {
      expect(zhKeys.length).toBeGreaterThanOrEqual(300);
    });

    it("en-US 应有 300+ key", () => {
      expect(enKeys.length).toBeGreaterThanOrEqual(300);
    });

    it("zh-CN 与 en-US key 数量相等", () => {
      expect(zhKeys.length).toBe(enKeys.length);
    });
  });

  describe("key 一致性", () => {
    it("zh-CN 每个 key 都存在于 en-US", () => {
      const missing = zhKeys.filter((k) => !enKeys.includes(k));
      expect(missing).toEqual([]);
    });

    it("en-US 每个 key 都存在于 zh-CN", () => {
      const missing = enKeys.filter((k) => !zhKeys.includes(k));
      expect(missing).toEqual([]);
    });
  });

  describe("无空值", () => {
    it("zh-CN 所有 key 都有非空值", () => {
      const empty = zhKeys.filter((k) => {
        const val = getNestedValue(zhCN as Record<string, any>, k);
        return val === "" || val === null || val === undefined;
      });
      expect(empty).toEqual([]);
    });

    it("en-US 所有 key 都有非空值", () => {
      const empty = enKeys.filter((k) => {
        const val = getNestedValue(enUS as Record<string, any>, k);
        return val === "" || val === null || val === undefined;
      });
      expect(empty).toEqual([]);
    });
  });

  describe("命名空间完整性", () => {
    const expectedNamespaces = [
      "common", "nav", "bottomNav", "monitor", "followUp",
      "patrol", "operations", "fileManager", "log", "report",
      "ai", "palette", "pwa", "settings", "loop", "devGuide",
      "modelProvider", "sdk", "security",
    ];

    expectedNamespaces.forEach((ns) => {
      it(`zh-CN 应有 "${ns}" 命名空间`, () => {
        expect((zhCN as Record<string, any>)[ns]).toBeDefined();
      });

      it(`en-US 应有 "${ns}" 命名空间`, () => {
        expect((enUS as Record<string, any>)[ns]).toBeDefined();
      });
    });
  });

  describe("modelProvider 命名空间", () => {
    it("zh-CN modelProvider 应有 25+ key", () => {
      const keys = getNestedKeys(zhCN.modelProvider as Record<string, any>);
      expect(keys.length).toBeGreaterThanOrEqual(25);
    });

    it("modelProvider.addModel 应为中文", () => {
      expect(zhCN.modelProvider.addModel).toBe("添加模型");
    });

    it("modelProvider.addModel 应为英文", () => {
      expect(enUS.modelProvider.addModel).toBe("Add Model");
    });
  });

  describe("sdk 命名空间", () => {
    it("zh-CN sdk 应有 30+ key", () => {
      const keys = getNestedKeys(zhCN.sdk as Record<string, any>);
      expect(keys.length).toBeGreaterThanOrEqual(30);
    });

    it("sdk.title 应为中文", () => {
      expect(zhCN.sdk.title).toBe("AI 对话");
    });

    it("sdk.title 应为英文", () => {
      expect(enUS.sdk.title).toBe("AI Chat");
    });

    it("sdk.send 应为中文", () => {
      expect(zhCN.sdk.send).toBe("发送");
    });

    it("sdk.send 应为英文", () => {
      expect(enUS.sdk.send).toBe("Send");
    });

    it("sdk.mockMode 应为中文", () => {
      expect(zhCN.sdk.mockMode).toBe("Mock 模式");
    });
  });
});