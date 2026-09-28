/**
 * ai-family-doc/shared.tsx — 通用展示组件（批7 Facade+Siblings 拆分）
 * ===================================================================
 * FadeIn: 沙箱安全入场动画（纯 CSS transition, 不依赖 IntersectionObserver）
 * SectionHeader: 章节标题头（图标圆徽 + 标题 + 副题）
 */
import type { CSSProperties, ElementType, MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { hexToRgb } from "./content";

export function FadeIn({ children, delay = 0, className = "", style, onClick }: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), Math.min(delay * 1000, 800));
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        ...style,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: ElementType;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background: `rgba(${hexToRgb(color)}, 0.1)`,
          border: `1px solid rgba(${hexToRgb(color)}, 0.3)`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.3rem" }}>{title}</h2>
      <p className="text-[rgba(224,240,255,0.5)] mt-2" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
        {subtitle}
      </p>
    </div>
  );
}
