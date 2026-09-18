/**
 * IDEPanel.tsx
 * =============
 * IDE 多联式低码设计面板 · 独立自治单元
 *
 * 重构后的完整 IDE 页面:
 * - 顶部导航栏 (项目标题 + 公共图标 + 用户信息)
 * - 视图切换栏 (返回 / 预览 / 代码 / 搜索 / 更多)
 * - 三栏可调布局:
 *     左栏 (25%): AI 智能编程交互面板
 *     中栏 (45%): 文件资源管理器
 *     右栏 (30%): 代码编辑器 (多 Tab)
 * - 底部集成终端 (命令行交互)
 *
 * 快捷键:
 *   Ctrl+1    切换预览视图
 *   Ctrl+2    切换代码视图
 *   Ctrl+`    切换终端
 *   Ctrl+Shift+F  全局搜索
 *   Esc       关闭搜索/弹窗
 */

import React from "react";
import { IDELayout } from "./ide/IDELayout";

export function IDEPanel() {
  return (
    <div
      className="w-full"
      style={{
        height: "calc(100% + 2rem)",
        margin: "-1rem",
        width: "calc(100% + 2rem)",
      }}
    >
      <IDELayout />
    </div>
  );
}