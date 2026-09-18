/**
 * useI18n.ts
 * ===========
 * 国际化 Hook · 支持中文/English 动态切换
 *
 * 特性:
 * - localStorage 持久化语言偏好
 * - React Context 全局共享
 * - 动态切换无需刷新
 * - t() 函数支持嵌套 key 和模板变量
 */

import React, { useState, useCallback, useMemo, createContext, useContext } from "react";
import { zhCN, enUS } from "../i18n";
import type { TranslationKeys } from "../i18n";
import type { Locale, LocaleInfo, I18nContextValue } from "../types";

// RF-011: Re-export 已移除

// ============================================================
// 语言包映射
// ============================================================

const localeMap: Record<Locale, TranslationKeys> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
  { code: "en-US", label: "English",  nativeLabel: "English" },
];

const STORAGE_KEY = "yyc3_locale";

// ============================================================
// 工具函数: 深度取值
// ============================================================

/**
 * 通过点分 key 获取嵌套翻译值
 * e.g. t("nav.dataMonitor") → zhCN.nav.dataMonitor
 */
function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

/**
 * 替换模板变量 e.g. "{n} 分钟前" + { n: 5 } → "5 分钟前"
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

// ============================================================
// Context
// ============================================================

export const I18nContext = createContext<I18nContextValue>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (key, vars) => {
    const raw = getNestedValue(zhCN as Record<string, any>, key);
    return vars ? interpolate(raw, vars) : raw;
  },
  locales: SUPPORTED_LOCALES,
});

// ============================================================
// Hook
// ============================================================

export function useI18nProvider() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "zh-CN";
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en-US" || saved === "zh-CN") return saved;
    return "zh-CN"; // 默认中文
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // storage unavailable
    }
  }, []);

  const translations = useMemo(() => localeMap[locale], [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw = getNestedValue(translations as Record<string, any>, key);
      return interpolate(raw, vars);
    },
    [translations]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales: SUPPORTED_LOCALES }),
    [locale, setLocale, t]
  );

  return value;
}

/**
 * 消费 i18n 上下文的快捷 Hook
 */
export function useI18n() {
  return useContext(I18nContext);
}