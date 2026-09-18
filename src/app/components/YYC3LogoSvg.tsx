/**
 * YYC3LogoSvg.tsx
 * ================
 * YYC³ 品牌 Logo — 使用本地 public/yyc3-icons/ PNG 图标资源
 *
 * 全链路对齐实际目录:
 *   public/yyc3-icons/{Android,Web App,iOS,macOS,watchOS}/*.png
 *
 * 原 figma:asset 虚拟模块导入已迁移至本地静态资源,
 * Vite dev/build 均可原生解析, 测试环境无需特殊 mock。
 */

import React from "react";

const BASE = `${import.meta.env.BASE_URL || "/"}yyc3-icons`;

const LOGO_SIZES = {
  16: `${BASE}/Web App/favicon-16.png`,
  32: `${BASE}/Web App/favicon-32.png`,
  48: `${BASE}/Android/mdpi.png`,
  64: `${BASE}/macOS/64.png`,
  96: `${BASE}/Android/xhdpi.png`,
  128: `${BASE}/macOS/128.png`,
  192: `${BASE}/Web App/android-chrome-192.png`,
  256: `${BASE}/macOS/256.png`,
  512: `${BASE}/Web App/android-chrome-512.png`,
} as const;

type LogoSize = keyof typeof LOGO_SIZES;

function pickLogo(size: number): string {
  const keys = Object.keys(LOGO_SIZES).map(Number) as LogoSize[];
  const matched = keys.find((k) => size <= k);
  return LOGO_SIZES[matched ?? 512];
}

interface YYC3LogoSvgProps {
  size?: number;
  className?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}

export function YYC3LogoSvg({
  size = 40,
  className = "",
  showText: _showText = true,
  style,
}: YYC3LogoSvgProps) {
  return (
    <img
      src={pickLogo(size)}
      alt="YYC³ Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={style}
      draggable={false}
    />
  );
}

export default YYC3LogoSvg;
