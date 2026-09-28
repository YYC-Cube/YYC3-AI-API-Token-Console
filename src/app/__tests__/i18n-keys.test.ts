/**
 * i18n 语言包 key 对齐守卫（批5-3）
 * 编译期已有 enUS: TranslationKeys(= DeepStringify<typeof zhCN>) 类型约束；
 * 本测试为运行时防线: 防 `as` 强转绕过类型检查 + 空串/非 string 叶子检测 + 空包真空断言。
 */
import { describe, expect, it } from "vitest";
import enUS from "../i18n/en-US";
import zhCN from "../i18n/zh-CN";

/** 深度遍历语言包, 收集全部叶子节点路径 */
function collectLeaves(obj: unknown, prefix = "", out: string[] = []): string[] {
  if (obj !== null && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      collectLeaves(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.push(prefix);
  }
  return out;
}

describe("i18n 语言包 key 对齐守卫", () => {
  it("zh-CN 包非空（防空导入真空断言）", () => {
    expect(collectLeaves(zhCN).length).toBeGreaterThan(50);
  });

  it("zh-CN 与 en-US 叶子 key 集合完全一致", () => {
    const zh = new Set(collectLeaves(zhCN));
    const en = new Set(collectLeaves(enUS));
    const missingInEn = [...zh].filter(k => !en.has(k));
    const extraInEn = [...en].filter(k => !zh.has(k));
    expect(missingInEn).toEqual([]); // en 缺失的 key
    expect(extraInEn).toEqual([]); // en 多出的 key
  });

  it("两语言包所有叶子值均为非空字符串", () => {
    const bad: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (node !== null && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          walk(v, path ? `${path}.${k}` : k);
        }
      } else if (typeof node !== "string" || node.trim().length === 0) {
        bad.push(path);
      }
    };
    walk(zhCN, "zh-CN");
    walk(enUS, "en-US");
    expect(bad).toEqual([]);
  });
});
