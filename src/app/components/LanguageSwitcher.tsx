/**
 * LanguageSwitcher.tsx
 * =====================
 * 语言切换器组件 · 支持中文/English 动态切换
 */

import React, { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "../hooks/useI18n";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, locales, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const current = locales.find((l) => l.code === locale);

  return (
    <div className="relative" ref={dropdownRef} data-testid="language-switcher">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.06)] transition-all"
        style={{ fontSize: "0.72rem" }}
        data-testid="lang-trigger"
      >
        <Globe className="w-3.5 h-3.5" />
        {!compact && (
          <span>{current?.nativeLabel ?? locale}</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[140px] rounded-xl bg-[rgba(8,25,55,0.95)] backdrop-blur-xl border border-[rgba(0,180,255,0.2)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-50"
          data-testid="lang-dropdown"
        >
          {locales.map((loc) => {
            const isActive = loc.code === locale;
            return (
              <button
                key={loc.code}
                onClick={() => {
                  setLocale(loc.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "bg-[rgba(0,212,255,0.08)] text-[#00d4ff]"
                    : "text-[#c0dcf0] hover:bg-[rgba(0,212,255,0.04)]"
                }`}
                style={{ fontSize: "0.75rem" }}
                data-testid={`lang-${loc.code}`}
              >
                <span>{loc.nativeLabel}</span>
                {isActive && (
                  <span className="text-[#00d4ff]" style={{ fontSize: "0.6rem" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
