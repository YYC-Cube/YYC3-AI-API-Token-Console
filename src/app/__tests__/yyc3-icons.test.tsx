/**
 * yyc3-icons.test.tsx
 * =====================
 * 图标资源中心化配置守护测试 (unit-dom / jsdom)
 *
 * 覆盖范围:
 *  - icons / iconsCDN 键名 1:1 对齐 (36 物理文件 + 9 语义别名 = 45 键)
 *  - 本地路径全部挂载 Vite BASE_URL 前缀 (子路径部署兼容)
 *  - CDN 路径全部挂载 GitHub Raw 仓库前缀 + 末段文件名 URL 编码
 *  - handleIconError 本地 → CDN 回退 + 防无限循环
 *  - pwaManifestIcons 14 项结构与尺寸合法
 *  - REMOTE_FILE_MANIFEST 36 项无重复无缺扩展名
 *
 * 守护意图: 新增/删除图标资源必须同步更新本文件与下载清单, 否则 CI 拦截
 */

import { describe, expect, it } from "vitest";
import type { SyntheticEvent } from "react";
import {
  REMOTE_FILE_MANIFEST,
  handleIconError,
  icons,
  iconsCDN,
  pwaManifestIcons,
} from "../lib/yyc3-icons";

const GH_RAW_PREFIX =
  "https://raw.githubusercontent.com/YYC-Cube/Cloudpivotintellimatrix/main/public/yyc3-icons";

describe("yyc3-icons", () => {
  it("icons 与 iconsCDN 键名一一对应 (45 键)", () => {
    expect(Object.keys(icons)).toHaveLength(45);
    expect(Object.keys(iconsCDN)).toHaveLength(45);
    expect(Object.keys(icons)).toEqual(Object.keys(iconsCDN));
  });

  it("本地路径全部以 yyc3-icons/ 子路径挂载于 BASE_URL", () => {
    for (const value of Object.values(icons)) {
      expect(value).toMatch(/\/yyc3-icons\/.+/);
      expect(value.startsWith("/")).toBe(true);
      // 末段必为 .png 资源
      expect(value.endsWith(".png")).toBe(true);
    }
  });

  it("CDN 路径全部挂载 GitHub Raw 前缀, 末段文件名编码空格", () => {
    for (const value of Object.values(iconsCDN)) {
      expect(value.startsWith(`${GH_RAW_PREFIX}/`)).toBe(true);
      // 仅末段编码: 末段不允许含字面空格 (空格→%20)
      const lastSeg = value.split("/").pop() ?? "";
      expect(lastSeg).not.toContain(" ");
      expect(lastSeg).toContain(".png");
    }
  });

  it("handleIconError: 本地源加载失败时回退 CDN 源且防循环", () => {
    const img = document.createElement("img");
    img.src = icons.logo;
    const handler = handleIconError("logo");
    const event = { currentTarget: img } as unknown as SyntheticEvent<HTMLImageElement>;
    // jsdom/浏览器对含空格路径做 URL 序列化, 以规范化形态断言真实行为
    const cdnHref = new URL(iconsCDN.logo, "http://localhost").href;

    handler(event);
    // 首次: 本地 → CDN
    expect(img.src).toBe(cdnHref);
    // 二次: 已是 CDN 源, 不再改写 (防无限循环)
    handler(event);
    expect(img.src).toBe(cdnHref);
  });

  it("handleIconError: 本地源恰好等于 CDN 源时不改写", () => {
    const img = document.createElement("img");
    // 以浏览器序列化后的 CDN 源为初始值, 精确覆盖「已是 CDN → 不重写」守卫
    img.src = new URL(iconsCDN.favicon32, "http://localhost").href;
    const handler = handleIconError("favicon32");
    const event = { currentTarget: img } as unknown as SyntheticEvent<HTMLImageElement>;
    const cdnHref = new URL(iconsCDN.favicon32, "http://localhost").href;

    handler(event);
    expect(img.src).toBe(cdnHref);
  });

  it("pwaManifestIcons: 14 项结构合法", () => {
    expect(pwaManifestIcons).toHaveLength(14);
    for (const entry of pwaManifestIcons) {
      expect(entry.src).toMatch(/^yyc3-icons\/.+\.png$/);
      expect(entry.sizes).toMatch(/^\d+x\d+$/);
      expect(entry.type).toBe("image/png");
    }
    // purpose 字段可选但出现时必须合法
    for (const entry of pwaManifestIcons) {
      if (entry.purpose) expect(entry.purpose).toMatch(/^(any|maskable)( any| maskable)*$/);
    }
  });

  it("REMOTE_FILE_MANIFEST: 36 项无重复无缺扩展名", () => {
    expect(REMOTE_FILE_MANIFEST).toHaveLength(36);
    expect(new Set(REMOTE_FILE_MANIFEST).size).toBe(36);
    for (const file of REMOTE_FILE_MANIFEST) {
      expect(file.endsWith(".png")).toBe(true);
    }
  });
});
