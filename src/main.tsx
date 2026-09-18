/**
 * main.tsx
 * =========
 * YYC³ CloudPivot Intelli-Matrix — 应用入口
 *
 * 职责:
 *   1. 挂载 React 应用到 #root
 *   2. 引入全局样式 (fonts → tailwind → theme)
 *   3. StrictMode 双重渲染提前暴露副作用问题 (高可用)
 *
 * 全端 Logo 链路: index.html 静态声明 + useYYC3Head 运行时注入 (CDN 回退)
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
