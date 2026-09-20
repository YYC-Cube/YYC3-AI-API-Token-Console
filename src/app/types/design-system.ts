/**
 * types/design-system.ts — 设计与端点: API 端点配置 / 设计系统 Token
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */

import type { ElementType } from "react";

/**
 * ============================================================
 *  36. API 端点配置 (API Configuration)
 * ============================================================
 */

/** 后端 API 端点配置 */
export interface APIEndpoints {
  /** 文件系统 API 基地址 */
  fsBase: string;
  /** 数据库管理 API 基地址 */
  dbBase: string;
  /** WebSocket 地址 */
  wsEndpoint: string;
  /** AI 推理 API 基地址 */
  aiBase: string;
  /** 集群管理 API 基地址 */
  clusterBase: string;
  /** 是否启用后端 API (false = 纯前端 Mock) */
  enableBackend: boolean;
  /** API 请求超时 (ms) */
  timeout: number;
  /** 最大重试次数 (指数退避, 0 = 不重试) */
  maxRetries: number;
}


/**
 * ============================================================
 *  37. 设计系统 (Design System)
 * ============================================================
 */

/** 色彩 Token */
export interface ColorToken {
  name: string;
  value: string;
  cssVar: string;
  usage: string;
}

/** 字体排版 Token */
export interface TypographyToken {
  name: string;
  family: string;
  weight: string;
  size: string;
  usage: string;
  sample: string;
}

/** 间距 Token */
export interface SpacingToken {
  name: string;
  value: string;
  px: number;
  usage: string;
}

/** 阴影 Token */
export interface ShadowToken {
  name: string;
  value: string;
  usage: string;
}

/** 动效 Token */
export interface AnimationToken {
  name: string;
  duration: string;
  easing: string;
  usage: string;
}

/** 状态定义 */
export interface StatusDef {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: ElementType;
  description: string;
}

/** 组件注册表条目 */
export interface ComponentEntry {
  name: string;
  tier: "atom" | "molecule" | "organism" | "template";
  path: string;
  description: string;
  props: string[];
  states: string[];
  responsive: boolean;
}

/** 交互规范 */
export interface InteractionSpec {
  name: string;
  trigger: string;
  duration: string;
  effect: string;
  feedback: string;
}

/** 阶段审核状态 */
export type ChapterStatus = "completed" | "partial" | "pending" | "deferred";

/** 章节审核 */
export interface ChapterReview {
  chapter: number;
  title: string;
  status: ChapterStatus;
  progress: number;        // 0-100
  deliverables: string[];
  notes: string;
}

/** 项目统计 */
export interface ProjectStats {
  label: string;
  value: string | number;
  color: string;
}

/** 验收清单项 */
export interface AcceptanceItem {
  category: string;
  items: { label: string; passed: boolean }[];
}
