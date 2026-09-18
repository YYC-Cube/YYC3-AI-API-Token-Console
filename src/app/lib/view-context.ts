/**
 * view-context.ts
 * ================
 * ViewContext & WebSocketContext — extracted from Layout.tsx
 *
 * WHY: Layout.tsx statically imports IntegratedTerminal.tsx,
 *      which imported ViewContext back from Layout.tsx, creating
 *      a circular dependency that broke dynamic module loading
 *      in the Figma Make iframe sandbox.
 *
 * RULE: All components that need ViewContext or WebSocketContext
 *       must import from this file, NEVER from Layout.tsx.
 */

import React from "react";
import type { WebSocketDataState, ViewState } from "../types";

/**
 * WebSocket 上下文
 * 通过 React Context 将 WebSocket 数据传递到所有子页面
 */
export const WebSocketContext = React.createContext<WebSocketDataState | null>(null);

/**
 * 视口/响应式布局上下文
 */
export const ViewContext = React.createContext<ViewState | null>(null);
