/**
 * YYC3Logo.tsx
 * =============
 * YYC³ 统一品牌 Logo 组件
 *
 * 使用远程仓库真实 PNG 图标渲染，支持:
 * - 多尺寸 (xs / sm / md / lg / xl)
 * - 发光动画效果
 * - 在线状态指示点
 * - 圆角 overflow-hidden 保证视觉一致
 */

import React from "react";
import { YYC3LogoSvg } from "./YYC3LogoSvg";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface YYC3LogoProps {
  size?: LogoSize;
  /** 是否显示右上角状态点 */
  showStatus?: boolean;
  /** 状态点颜色 (默认绿色 #00ff88) */
  statusColor?: string;
  /** 是否显示发光效果 */
  glow?: boolean;
  /** 自定义 className */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

const sizeConfig: Record<LogoSize, { px: number; dot: string; radius: string }> = {
  xs: { px: 20, dot: "w-1.5 h-1.5 -top-0.5 -right-0.5", radius: "rounded-md" },
  sm: { px: 24, dot: "w-2 h-2 -top-0.5 -right-0.5", radius: "rounded-lg" },
  md: { px: 28, dot: "w-2.5 h-2.5 -top-0.5 -right-0.5", radius: "rounded-lg" },
  lg: { px: 40, dot: "w-3 h-3 -top-0.5 -right-0.5", radius: "rounded-xl" },
  xl: { px: 48, dot: "w-3.5 h-3.5 -top-0.5 -right-0.5", radius: "rounded-xl" },
};

export function YYC3Logo({
  size = "md",
  showStatus = true,
  statusColor = "#00ff88",
  glow = true,
  className = "",
  onClick,
}: YYC3LogoProps) {
  const cfg = sizeConfig[size];

  return (
    <div
      className={`
        relative shrink-0 ${cfg.radius} overflow-hidden
        flex items-center justify-center
        ${glow ? "shadow-[0_0_20px_rgba(0,180,255,0.4)]" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{ width: cfg.px, height: cfg.px }}
      onClick={onClick}
    >
      <YYC3LogoSvg
        size={cfg.px}
        showText={false}
        className={cfg.radius}
      />

      {/* 状态指示点 */}
      {showStatus && (
        <div
          className={`absolute ${cfg.dot} rounded-full animate-pulse`}
          style={{
            backgroundColor: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
          }}
        />
      )}
    </div>
  );
}
