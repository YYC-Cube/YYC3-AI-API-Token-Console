/**
 * service-test-panels.sandbox-env.test.tsx
 * ==========================================
 * service-test/panels.tsx 沙箱分支直连测试 (service-test-panels.test.tsx 的伴生文件)
 *
 * WHY 单独文件: jsdom 的 window.location 为 non-configurable (LegacyUnforgeable),
 * 运行时无法伪造 hostname; isSandbox=true 分支只能通过 per-file environmentOptions
 * 指定非本地 URL 构造。环境类型仍为 vitest.config.ts projects 自动匹配的
 * jsdom (unit-dom, *.test.tsx), 未手写 @vitest-environment。
 *
 * 注意: 源码中 192.168.* 计入 isLocalhost (本地局域网部署), 真正的沙箱判定要求
 * hostname 既非 localhost/127.0.0.1 也不以 192.168. 开头 (如远程域名)。
 *
 * 覆盖范围 (hostname=example.com → isLocalhost=false / isSandbox=true):
 * - 沙箱环境徽标出现, 本地部署徽标缺席
 * - 远程沙箱警告块 (Figma Make 沙箱说明) 渲染
 * - Origin/Hostname 展示远程值, Ollama 精确 origin 命令随 origin 变化
 *
 * @vitest-environment-options {"url": "http://example.com:5173/"}
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvironmentDetectionPanel } from "../components/service-test/panels";

const ORIGIN = "http://example.com:5173";

describe("EnvironmentDetectionPanel (远程沙箱主机)", () => {
  it("应显示沙箱环境徽标与远程沙箱警告块, 不显示本地部署徽标", () => {
    render(<EnvironmentDetectionPanel />);
    expect(screen.getByText("沙箱环境")).toBeInTheDocument();
    expect(screen.queryByText("本地部署")).not.toBeInTheDocument();
    expect(screen.getByText("当前运行在远程沙箱中")).toBeInTheDocument();
    expect(screen.getByText(/Figma Make 沙箱的 localhost 指向云端服务器/)).toBeInTheDocument();
  });

  it("Origin/Hostname 应展示远程值, Ollama 命令使用精确 origin", () => {
    render(<EnvironmentDetectionPanel />);
    expect(screen.getByText(ORIGIN)).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText(`OLLAMA_ORIGINS="${ORIGIN}" ollama serve`)).toBeInTheDocument();
    // jsdom 默认 UA (darwin) 不含 "Mac" → 无 launchctl 块, 仅两个复制按钮
    expect(screen.getAllByText("复制")).toHaveLength(2);
  });
});
