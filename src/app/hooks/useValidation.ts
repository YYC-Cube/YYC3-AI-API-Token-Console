/**
 * useValidation.ts
 * ==================
 * 统一输入校验工具
 *
 * 提供:
 * - URL 格式校验
 * - API Key 格式校验
 * - 数值范围校验
 * - 必填项校验
 * - 端口号校验
 * - IP 地址校验
 * - 模型名称校验
 * - 批量校验 + 错误提示聚合
 */

import { useCallback, useState, useMemo } from "react";

// ============================================================
// 类型定义
// ============================================================

export interface ValidationRule {
  field: string;
  label: string;
  value: string | number | boolean;
  rules: Array<
    | { type: "required"; message?: string }
    | { type: "url"; message?: string }
    | { type: "apiKey"; message?: string }
    | { type: "port"; message?: string }
    | { type: "ip"; message?: string }
    | { type: "modelName"; message?: string }
    | { type: "range"; min?: number; max?: number; message?: string }
    | { type: "minLength"; min: number; message?: string }
    | { type: "maxLength"; max: number; message?: string }
    | { type: "pattern"; regex: RegExp; message?: string }
    | { type: "custom"; validate: (val: string) => string | null }
  >;
}

export interface ValidationError {
  field: string;
  label: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  errorMap: Record<string, string>;
}

// ============================================================
// 单字段校验函数
// ============================================================

export function validateUrl(value: string): string | null {
  if (!value) return null; // 空值由 required 规则处理
  try {
    const url = new URL(value);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      return "URL 协议必须为 http/https/ws/wss";
    }
    return null;
  } catch {
    return "URL 格式无效";
  }
}

export function validateApiKey(value: string): string | null {
  if (!value) return null;
  if (value.length < 8) return "API Key 长度不足 (最少 8 位)";
  if (/\s/.test(value)) return "API Key 不应包含空格";
  return null;
}

export function validatePort(value: string | number): string | null {
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return "端口号必须为数字";
  if (num < 1 || num > 65535) return "端口号范围 1-65535";
  return null;
}

export function validateIp(value: string): string | null {
  if (!value) return null;
  // 简单 IPv4 / CIDR 校验
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!ipv4Regex.test(line)) {
      return `无效 IP/CIDR: ${line}`;
    }
    const parts = line.split("/")[0].split(".");
    if (parts.some((p) => parseInt(p) > 255)) {
      return `IP 段超出范围: ${line}`;
    }
  }
  return null;
}

export function validateModelName(value: string): string | null {
  if (!value) return null;
  if (value.length > 128) return "模型名称过长 (最多 128 字符)";
  if (/[<>{}|\\]/.test(value)) return "模型名称包含非法字符";
  return null;
}

export function validateRange(value: string | number, min?: number, max?: number): string | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "必须为数字";
  if (min !== undefined && num < min) return `不能小于 ${min}`;
  if (max !== undefined && num > max) return `不能大于 ${max}`;
  return null;
}

// ============================================================
// 批量校验器
// ============================================================

export function validateFields(rules: ValidationRule[]): ValidationResult {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const val = String(rule.value ?? "");

    for (const r of rule.rules) {
      let errMsg: string | null = null;

      switch (r.type) {
        case "required":
          if (!val.trim()) errMsg = r.message || `${rule.label} 不能为空`;
          break;
        case "url":
          errMsg = validateUrl(val) ? (r.message || validateUrl(val)) : null;
          break;
        case "apiKey":
          errMsg = validateApiKey(val) ? (r.message || validateApiKey(val)) : null;
          break;
        case "port":
          errMsg = validatePort(val) ? (r.message || validatePort(val)) : null;
          break;
        case "ip":
          errMsg = validateIp(val) ? (r.message || validateIp(val)) : null;
          break;
        case "modelName":
          errMsg = validateModelName(val) ? (r.message || validateModelName(val)) : null;
          break;
        case "range":
          errMsg = validateRange(val, r.min, r.max) ? (r.message || validateRange(val, r.min, r.max)) : null;
          break;
        case "minLength":
          if (val.length < r.min) errMsg = r.message || `${rule.label} 最少 ${r.min} 字符`;
          break;
        case "maxLength":
          if (val.length > r.max) errMsg = r.message || `${rule.label} 最多 ${r.max} 字符`;
          break;
        case "pattern":
          if (!r.regex.test(val)) errMsg = r.message || `${rule.label} 格式不正确`;
          break;
        case "custom":
          errMsg = r.validate(val);
          break;
      }

      if (errMsg) {
        errors.push({ field: rule.field, label: rule.label, message: errMsg });
        break; // 每个字段只报第一个错误
      }
    }
  }

  const errorMap: Record<string, string> = {};
  errors.forEach((e) => { errorMap[e.field] = e.message; });

  return { valid: errors.length === 0, errors, errorMap };
}

// ============================================================
// Hook — 带实时校验状态
// ============================================================

export function useValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** 校验单个字段 */
  const validateField = useCallback((field: string, label: string, value: string, rules: ValidationRule["rules"]): boolean => {
    const result = validateFields([{ field, label, value, rules }]);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.errorMap[field]) {
        next[field] = result.errorMap[field];
      } else {
        delete next[field];
      }
      return next;
    });
    return result.valid;
  }, []);

  /** 批量校验 */
  const validateAll = useCallback((rules: ValidationRule[]): boolean => {
    const result = validateFields(rules);
    setErrors(result.errorMap);
    return result.valid;
  }, []);

  /** 清除单个字段错误 */
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** 清除全部错误 */
  const clearAll = useCallback(() => {
    setErrors({});
  }, []);

  /** 是否有任何错误 */
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return {
    errors,
    hasErrors,
    validateField,
    validateAll,
    clearError,
    clearAll,
  };
}
