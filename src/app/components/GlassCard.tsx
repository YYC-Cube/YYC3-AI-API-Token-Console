import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export function GlassCard({ children, className = "", glowColor, onClick, style, ref, ...rest }: GlassCardProps) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        relative rounded-xl
        bg-[rgba(8,25,55,0.7)] backdrop-blur-xl
        border border-[rgba(0,180,255,0.15)]
        shadow-[0_0_30px_rgba(0,180,255,0.05)]
        transition-all duration-300
        hover:border-[rgba(0,212,255,0.3)]
        hover:shadow-[0_0_40px_rgba(0,180,255,0.1)]
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={glowColor ? { boxShadow: `0 0 30px ${glowColor}`, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
}