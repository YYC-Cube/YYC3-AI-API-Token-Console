/**
 * types/index.ts — Facade (§6.6 Facade+Siblings)
 * ================================================
 * 类型定义已按领域拆分至 sibling 文件; 本文件仅做稳定重导出,
 * 全部消费方 `from "../types"` / `from "./types"` 路径保持不变。
 * 新增类型请放对应领域 sibling, 禁止回填本文件。
 */

export * from "./core";
export * from "./network-sync";
export * from "./ui-shared";
export * from "./ai-provider";
export * from "./ops-monitor";
export * from "./design-system";
