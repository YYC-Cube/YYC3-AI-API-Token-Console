/**
 * ColorSwatch.tsx
 * ================
 * 单个颜色变量卡片 · 显示 OKLch + HEX，点击弹出颜色选择器
 */

import React, { useState, useRef, useEffect } from "react";
import { hexToOklch, formatOklch } from "./color-utils";
import { ColorPicker } from "./ColorPicker";

interface ColorSwatchProps {
  label: string;
  value: string; // HEX
  onChange: (hex: string) => void;
}

export function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const oklch = hexToOklch(value);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,20,40,0.3)] hover:border-[rgba(0,180,255,0.25)] hover:bg-[rgba(0,20,40,0.5)] transition-all text-left group"
      >
        <div
          className="w-8 h-8 rounded-md border border-[rgba(255,255,255,0.1)] shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.72rem" }}>{label}</p>
          <p className="text-[rgba(0,212,255,0.35)] truncate" style={{ fontSize: "0.58rem", fontFamily: "monospace" }}>
            {formatOklch(oklch)}
          </p>
        </div>
        <span className="text-[rgba(0,212,255,0.3)] group-hover:text-[rgba(0,212,255,0.5)] transition-colors shrink-0" style={{ fontSize: "0.65rem", fontFamily: "monospace" }}>
          {value.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0" style={{ top: "100%" }}>
          <ColorPicker value={value} onChange={onChange} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
