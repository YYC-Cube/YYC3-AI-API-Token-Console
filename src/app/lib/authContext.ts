/**
 * authContext.ts
 * ===============
 * AuthContext 独立模块 — 打破 App.tsx ↔ Layout.tsx 的循环依赖
 */

import { createContext } from "react";
import type { AuthContextValue } from "../types";

/** 认证上下文 - 提供登出功能和当前用户信息 */
export const AuthContext = createContext<AuthContextValue>({
  logout: () => {},
  userEmail: "",
  userRole: "",
  isGhost: false,
});
