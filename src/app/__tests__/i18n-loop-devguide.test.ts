/**
 * i18n-loop-devguide.test.ts
 * ============================
 * 语言包新增 key 验证: loop + devGuide
 *
 * 覆盖范围:
 * - zh-CN 和 en-US 新增 key 一致性
 * - loop.* 完整性 (35+ key)
 * - devGuide.* 完整性 (22+ key)
 * - nav 新增 key
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

describe("i18n loop + devGuide key 验证", () => {
  describe("zh-CN 新增 key", () => {
    it("应有 loop 命名空间", () => {
      expect(zhCN.loop).toBeDefined();
    });

    it("loop 应有 title / subtitle / startLoop / abort", () => {
      expect(zhCN.loop.title).toBeTruthy();
      expect(zhCN.loop.subtitle).toBeTruthy();
      expect(zhCN.loop.startLoop).toBeTruthy();
      expect(zhCN.loop.abort).toBeTruthy();
    });

    it("loop.stages 应有 6 个阶段", () => {
      expect(zhCN.loop.stages.monitor).toBeTruthy();
      expect(zhCN.loop.stages.analyze).toBeTruthy();
      expect(zhCN.loop.stages.decide).toBeTruthy();
      expect(zhCN.loop.stages.execute).toBeTruthy();
      expect(zhCN.loop.stages.verify).toBeTruthy();
      expect(zhCN.loop.stages.optimize).toBeTruthy();
    });

    it("loop.stageStatus 应有 5 个状态", () => {
      expect(zhCN.loop.stageStatus.idle).toBeTruthy();
      expect(zhCN.loop.stageStatus.running).toBeTruthy();
      expect(zhCN.loop.stageStatus.completed).toBeTruthy();
      expect(zhCN.loop.stageStatus.error).toBeTruthy();
      expect(zhCN.loop.stageStatus.skipped).toBeTruthy();
    });

    it("应有 devGuide 命名空间", () => {
      expect(zhCN.devGuide).toBeDefined();
    });

    it("devGuide 应有 title / subtitle / techStack", () => {
      expect(zhCN.devGuide.title).toBeTruthy();
      expect(zhCN.devGuide.subtitle).toBeTruthy();
      expect(zhCN.devGuide.techStack).toBeTruthy();
    });

    it("nav 应有 serviceLoop / designSystem / devGuide", () => {
      expect(zhCN.nav.serviceLoop).toBeTruthy();
      expect(zhCN.nav.designSystem).toBeTruthy();
      expect(zhCN.nav.devGuide).toBeTruthy();
    });
  });

  describe("zh-CN / en-US key 一致性", () => {
    const zhKeys = getNestedKeys(zhCN as Record<string, any>);
    const enKeys = getNestedKeys(enUS as Record<string, any>);

    it("zh-CN key 数量应等于 en-US", () => {
      expect(zhKeys.length).toBe(enKeys.length);
    });

    it("每个 zh-CN key 都应在 en-US 中存在", () => {
      for (const key of zhKeys) {
        expect(enKeys).toContain(key);
      }
    });

    it("每个 en-US key 都应在 zh-CN 中存在", () => {
      for (const key of enKeys) {
        expect(zhKeys).toContain(key);
      }
    });
  });

  describe("loop key 数量", () => {
    it("loop 命名空间应有 20+ 顶级 key", () => {
      const loopTopKeys = Object.keys(zhCN.loop);
      expect(loopTopKeys.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("devGuide key 数量", () => {
    it("devGuide 命名空间应有 15+ 顶级 key", () => {
      const devKeys = Object.keys(zhCN.devGuide);
      expect(devKeys.length).toBeGreaterThanOrEqual(15);
    });
  });
});
