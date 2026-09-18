/**
 * security-i18n.test.ts
 * =======================
 * security 命名空间 i18n 一致性测试
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

describe("security 命名空间 i18n", () => {
  const zhKeys = getNestedKeys(zhCN.security as Record<string, any>);
  const enKeys = getNestedKeys(enUS.security as Record<string, any>);

  it("zh-CN security 应有 70+ key", () => {
    expect(zhKeys.length).toBeGreaterThanOrEqual(70);
  });

  it("en-US security 应有 70+ key", () => {
    expect(enKeys.length).toBeGreaterThanOrEqual(70);
  });

  it("zh-CN 与 en-US security key 数量一致", () => {
    expect(zhKeys.length).toBe(enKeys.length);
  });

  it("zh-CN 每个 key 都存在于 en-US", () => {
    const missing = zhKeys.filter((k) => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("security.title 应为中文", () => {
    expect(zhCN.security.title).toBe("安全与性能监控");
  });

  it("security.title 应为英文", () => {
    expect(enUS.security.title).toBe("Security & Performance Monitor");
  });

  it("security.tabs 应有 4 个子 key", () => {
    const tabKeys = Object.keys(zhCN.security.tabs);
    expect(tabKeys.length).toBe(4);
    expect(tabKeys).toContain("security");
    expect(tabKeys).toContain("performance");
    expect(tabKeys).toContain("diagnostics");
    expect(tabKeys).toContain("dataManagement");
  });

  it("security.cspTitle 应为中文", () => {
    expect(zhCN.security.cspTitle).toContain("CSP");
  });

  it("security.vitalsTitle 应为中文", () => {
    expect(zhCN.security.vitalsTitle).toContain("用户体验");
  });

  it("security.deviceTitle 应为中文", () => {
    expect(zhCN.security.deviceTitle).toContain("设备能力");
  });

  it("security.networkTitle 应为中文", () => {
    expect(zhCN.security.networkTitle).toContain("网络质量");
  });

  it("security.browserTitle 应为中文", () => {
    expect(zhCN.security.browserTitle).toContain("浏览器");
  });

  it("security.dataSyncTitle 应为中文", () => {
    expect(zhCN.security.dataSyncTitle).toBe("数据同步");
  });

  it("security.dataCleanTitle 应为中文", () => {
    expect(zhCN.security.dataCleanTitle).toBe("数据清理");
  });

  it("security.startScan 应为中文", () => {
    expect(zhCN.security.startScan).toBe("开始扫描");
  });

  it("security.startScan 应为英文", () => {
    expect(enUS.security.startScan).toBe("Start Scan");
  });

  it("security.safe/warning/danger 应有值", () => {
    expect(zhCN.security.safe).toBe("安全");
    expect(zhCN.security.warning).toBe("警告");
    expect(zhCN.security.danger).toBe("危险");
    expect(enUS.security.safe).toBe("Safe");
    expect(enUS.security.warning).toBe("Warning");
    expect(enUS.security.danger).toBe("Danger");
  });
});
