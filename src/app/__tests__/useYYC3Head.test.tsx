/**
 * useYYC3Head.test.tsx
 * ====================
 * 动态注入 YYC³ 品牌 <head> 标签 Hook 测试
 *
 * 覆盖范围:
 * - 页面标题注入
 * - favicon 16/32 / apple-touch-icon / manifest link 注入
 * - theme-color / apple 系 / SEO+OG meta 注入 (name 与 property 双属性路由)
 * - upsert 幂等: 已存在同 selector 标签时更新而非重复创建
 * - CDN onerror 回退挂载 (16/32/apple-touch 三档)
 *
 * Mock 契约 (零外部依赖):
 * - jsdom 28 未实现 HTMLLinkElement.sizes IDL — 以最小契约 stub 补齐
 *   (getter 反射 sizes attribute), 使 hook 的 sizes 分支可进入
 * - href 断言使用 getAttribute 原始值 (jsdom 会将含空格相对路径按 base 解析编码)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useYYC3Head } from "../hooks/useYYC3Head";
import { icons, iconsCDN } from "../lib/yyc3-icons";

describe("useYYC3Head", () => {
  let sizesRestore: (() => void) | null = null;

  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
    // jsdom 未实现 link.sizes IDL — 补最小契约 (反射 attribute)
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLLinkElement.prototype,
      "sizes"
    );
    Object.defineProperty(HTMLLinkElement.prototype, "sizes", {
      configurable: true,
      get(this: HTMLLinkElement) {
        const v = this.getAttribute("sizes");
        return v === null ? undefined : { value: v };
      },
    });
    sizesRestore = () => {
      if (descriptor) {
        Object.defineProperty(HTMLLinkElement.prototype, "sizes", descriptor);
      } else {
        delete (HTMLLinkElement.prototype as { sizes?: unknown }).sizes;
      }
    };
  });

  afterEach(() => {
    sizesRestore?.();
    sizesRestore = null;
  });

  it("应注入页面标题", () => {
    renderHook(() => useYYC3Head());
    expect(document.title).toBe("YYC³ CloudPivot Intelli-Matrix · 数据看盘");
  });

  it("应注入 16/32 favicon 并带 type+sizes 属性", () => {
    renderHook(() => useYYC3Head());

    const f16 = document.head.querySelector<HTMLLinkElement>(
      'link[rel="icon"][sizes="16x16"]'
    );
    const f32 = document.head.querySelector<HTMLLinkElement>(
      'link[rel="icon"][sizes="32x32"]'
    );
    expect(f16).not.toBeNull();
    expect(f16!.getAttribute("type")).toBe("image/png");
    expect(f16!.getAttribute("href")).toBe(icons.favicon16);
    expect(f32).not.toBeNull();
    expect(f32!.getAttribute("href")).toBe(icons.favicon32);
  });

  it("应注入 apple-touch-icon 与 manifest", () => {
    renderHook(() => useYYC3Head());

    const touch = document.head.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"][sizes="180x180"]'
    );
    expect(touch).not.toBeNull();
    expect(touch!.getAttribute("href")).toBe(icons.webAppAppleTouch);

    const manifest = document.head.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]'
    );
    expect(manifest).not.toBeNull();
    expect(manifest!.getAttribute("href")).toContain("manifest.json");
  });

  it("应注入 theme-color 与 apple 系列 meta (name 属性)", () => {
    renderHook(() => useYYC3Head());

    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content
    ).toBe("#060e1f");
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      )!.content
    ).toBe("black-translucent");
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-capable"]'
      )!.content
    ).toBe("yes");
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-title"]'
      )!.content
    ).toBe("YYC³ CloudPivot");
  });

  it("应注入 description (name) 与 OG 系列 meta (property 属性)", () => {
    renderHook(() => useYYC3Head());

    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    ).not.toBeNull();
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')!.content
    ).toBe("YYC³ CloudPivot Intelli-Matrix");
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:type"]')!.content
    ).toBe("website");
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')!.content
    ).toBe(icons.webAppChrome512);
  });

  it("upsert 应幂等: 已存在同 selector 标签时更新 href 而非重复创建", () => {
    const pre = document.createElement("link");
    pre.rel = "icon";
    pre.setAttribute("sizes", "16x16");
    pre.setAttribute("href", "/old-favicon.png");
    document.head.appendChild(pre);

    renderHook(() => useYYC3Head());

    const links = document.head.querySelectorAll('link[rel="icon"][sizes="16x16"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe(icons.favicon16);
  });

  it("favicon 加载失败时应回退 CDN 地址", () => {
    renderHook(() => useYYC3Head());

    const f16 = document.head.querySelector<HTMLLinkElement>(
      'link[rel="icon"][sizes="16x16"]'
    )!;
    const f32 = document.head.querySelector<HTMLLinkElement>(
      'link[rel="icon"][sizes="32x32"]'
    )!;
    const touch = document.head.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"][sizes="180x180"]'
    )!;

    expect(typeof f16.onerror).toBe("function");
    expect(typeof f32.onerror).toBe("function");
    expect(typeof touch.onerror).toBe("function");

    f16.onerror?.(new Event("error"));
    f32.onerror?.(new Event("error"));
    touch.onerror?.(new Event("error"));

    expect(f16.getAttribute("href")).toBe(iconsCDN.favicon16);
    expect(f32.getAttribute("href")).toBe(iconsCDN.favicon32);
    expect(touch.getAttribute("href")).toBe(iconsCDN.webAppAppleTouch);
  });
});
