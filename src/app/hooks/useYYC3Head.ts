/**
 * useYYC3Head.ts
 * ===============
 * 动态注入 YYC³ 品牌 <head> 标签
 *
 * 在无法直接编辑 index.html 的环境中，通过 React 运行时注入:
 * - favicon (PNG 16/32)
 * - apple-touch-icon (180×180)
 * - PWA manifest
 * - theme-color
 * - 页面标题
 *
 * 路径全部对齐仓库实际目录结构:
 *   public/yyc3-icons/Web App/*.png
 */

import { useEffect } from "react";
import { icons, iconsCDN } from "../lib/yyc3-icons";

export function useYYC3Head() {
  useEffect(() => {
    // ----------------------------------------------------------
    // 页面标题
    // ----------------------------------------------------------
    document.title = "YYC³ CloudPivot Intelli-Matrix · 数据看盘";

    // ----------------------------------------------------------
    // 辅助: 创建或更新 <link> 标签
    // ----------------------------------------------------------
    function upsertLink(
      rel: string,
      href: string,
      attrs?: Record<string, string>
    ): HTMLLinkElement {
      const selector = attrs?.sizes
        ? `link[rel="${rel}"][sizes="${attrs.sizes}"]`
        : attrs?.type
          ? `link[rel="${rel}"][type="${attrs.type}"]`
          : `link[rel="${rel}"]`;

      let link = document.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => link!.setAttribute(k, v));
      }
      return link;
    }

    function upsertMeta(name: string, content: string) {
      const attrName = name.startsWith("og:") ? "property" : "name";
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[${attrName}="${name}"]`
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attrName, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    }

    // ----------------------------------------------------------
    // Favicon — PNG (仓库 Web App/ 目录)
    //   本地优先，onError 可通过 handleIconError 回退 CDN
    // ----------------------------------------------------------
    upsertLink("icon", icons.favicon16, { type: "image/png", sizes: "16x16" });
    upsertLink("icon", icons.favicon32, { type: "image/png", sizes: "32x32" });

    // ----------------------------------------------------------
    // Apple Touch Icon — Web App/apple-touch-icon.png (180×180)
    // ----------------------------------------------------------
    upsertLink("apple-touch-icon", icons.webAppAppleTouch, { sizes: "180x180" });

    // ----------------------------------------------------------
    // PWA Manifest
    // 子路径部署: 相对拼接 BASE_URL (VITE_BASE 注入), 根路径时等价于 /manifest.json
    // ----------------------------------------------------------
    upsertLink("manifest", `${import.meta.env.BASE_URL || "/"}manifest.json`);

    // ----------------------------------------------------------
    // Theme Color
    // ----------------------------------------------------------
    upsertMeta("theme-color", "#060e1f");
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-title", "YYC³ CloudPivot");

    // ----------------------------------------------------------
    // SEO / OG 基础 (本地系统用不上, 但规范化)
    // ----------------------------------------------------------
    upsertMeta("description", "YYC³ CloudPivot Intelli-Matrix — 本地多端推理矩阵数据库数据看盘 — M4 Max + iMac + NAS 集群实时监控");
    upsertMeta("og:title", "YYC³ CloudPivot Intelli-Matrix");
    upsertMeta("og:description", "本地闭环多端推理矩阵数据看盘系统");
    upsertMeta("og:image", icons.webAppChrome512);
    upsertMeta("og:type", "website");

    // ----------------------------------------------------------
    // CDN Fallback: 为 favicon/apple-touch 添加 onerror 回退
    // ----------------------------------------------------------
    const faviconLinks = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="apple-touch-icon"]'
    );
    faviconLinks.forEach((link) => {
      if (link.sizes?.value === "16x16") {
        link.onerror = () => { link.href = iconsCDN.favicon16; };
      } else if (link.sizes?.value === "32x32") {
        link.onerror = () => { link.href = iconsCDN.favicon32; };
      } else if (link.sizes?.value === "180x180") {
        link.onerror = () => { link.href = iconsCDN.webAppAppleTouch; };
      }
    });
  }, []);
}
