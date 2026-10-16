/**
 * service-test-panels.test.tsx
 * ==============================
 * service-test/panels.tsx 直连测试 (ServiceConnectionTest 测试中该模块被整体 mock, 此处直连真实实现)
 *
 * 覆盖范围:
 * - QuickTestButton: 静息态图标 / 点击后 loading (禁用 + 旋转图标) / 完成后复位
 * - DiagnosticCard: 标题 + 条目列表渲染
 * - EnvironmentDetectionPanel:
 *   - localhost 环境 (vitest jsdom 默认 URL http://localhost:3000): Origin/Hostname 展示、
 *     本地部署徽标、无沙箱警告、Ollama CORS 两段命令
 *   - isMac=true (navigator.userAgent 注入 Macintosh): macOS launchctl 永久设置块
 *   - 复制按钮: clipboard.writeText 成功 → toast.success; 失败 → 静默; clipboard 缺失 → 短路
 *
 * 不可构造分支 (jsdom 环境硬限制, 如实记录):
 * - `typeof window/navigator === "undefined"` 的 SSR 兜底侧 — jsdom 恒有 window/navigator
 * - hostname 非本地 (127.0.0.1 / 192.168.*) → isSandbox=true 的沙箱徽标 + 远程沙箱警告块 —
 *   jsdom 的 window.location 为 non-configurable (LegacyUnforgeable), 运行时无法伪造 hostname
 * - `origin || "(未知)"` / `hostname || "(未知)"` 的空值侧 — jsdom http URL 下恒非空
 *
 * Mock 契约 (零外部依赖):
 * - sonner toast mock (panels 仅用 toast.success)
 * - navigator.clipboard.writeText spyOn (setup.ts 已 polyfill clipboard 对象)
 * - navigator.userAgent 经 Object.defineProperty 注入 (原型 getter 可被实例属性遮蔽)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  QuickTestButton,
  DiagnosticCard,
  EnvironmentDetectionPanel,
} from "../components/service-test/panels";
import { toastStyle } from "../components/service-test/types";

// ============================================================
// Mock 中心
// ============================================================

const m = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: m.toastSuccess,
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const ORIGIN = "http://localhost:3000";
const OLLAMA_PRECISE = `OLLAMA_ORIGINS="${ORIGIN}" ollama serve`;
const OLLAMA_WILDCARD = 'OLLAMA_ORIGINS="*" ollama serve';

/** 注入含 "Mac" 的 UA 并返回恢复函数 (恢复为原值, jsdom UA 恒定) */
function stubMacUserAgent(): () => void {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, "userAgent", {
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    configurable: true,
  });
  return () => {
    Object.defineProperty(navigator, "userAgent", {
      value: original,
      configurable: true,
    });
  };
}

beforeEach(() => {
  m.toastSuccess.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// QuickTestButton
// ============================================================

describe("QuickTestButton", () => {
  it("静息态应渲染标签与自定义图标, 按钮可用", () => {
    const TestIcon = (props: { className?: string }) => (
      <svg data-testid="qt-icon" {...props} />
    );
    render(
      <QuickTestButton label="快速测试" icon={TestIcon} color="#00d4ff" onClick={vi.fn(async () => {})} />
    );
    const btn = screen.getByRole("button", { name: "快速测试" });
    expect(btn).toBeEnabled();
    expect(screen.getByTestId("qt-icon")).toBeInTheDocument();
    expect(btn.querySelector(".animate-spin")).toBeNull();
  });

  it("点击后进入 loading: 禁用 + 旋转图标; 完成后复位", async () => {
    let release: () => void = () => {};
    const onClick = vi.fn(
      (): Promise<void> =>
        new Promise<void>((res) => {
          release = res;
        })
    );
    const TestIcon = (props: { className?: string }) => (
      <svg data-testid="qt-icon" {...props} />
    );
    render(<QuickTestButton label="网络测试" icon={TestIcon} color="#00ff88" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "网络测试" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const btn = screen.getByRole("button", { name: "网络测试" });
    expect(btn).toBeDisabled();
    expect(btn.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByTestId("qt-icon")).not.toBeInTheDocument();

    await act(async () => {
      release();
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "网络测试" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "网络测试" }).querySelector(".animate-spin")).toBeNull();
    expect(screen.getByTestId("qt-icon")).toBeInTheDocument();
  });
});

// ============================================================
// DiagnosticCard
// ============================================================

describe("DiagnosticCard", () => {
  it("应渲染标题与全部条目", () => {
    render(
      <DiagnosticCard
        title="诊断参考"
        color="#ffaa00"
        items={["检查 API Key", "确认 baseUrl", "放行 CORS"]}
      />
    );
    expect(screen.getByText("诊断参考")).toBeInTheDocument();
    expect(screen.getByText("检查 API Key")).toBeInTheDocument();
    expect(screen.getByText("确认 baseUrl")).toBeInTheDocument();
    expect(screen.getByText("放行 CORS")).toBeInTheDocument();
  });
});

// ============================================================
// EnvironmentDetectionPanel
// ============================================================

describe("EnvironmentDetectionPanel", () => {
  it("localhost 环境: 应展示 Origin/Hostname 与本地部署徽标, 无沙箱警告", () => {
    render(<EnvironmentDetectionPanel />);
    // vitest jsdom 默认 URL → hostname=localhost, 本地部署分支
    expect(screen.getByText(ORIGIN)).toBeInTheDocument();
    expect(screen.getByText("localhost")).toBeInTheDocument();
    expect(screen.getByText("本地部署")).toBeInTheDocument();
    expect(screen.queryByText("沙箱环境")).not.toBeInTheDocument();
    expect(screen.queryByText("当前运行在远程沙箱中")).not.toBeInTheDocument();
    // 非 Mac UA (darwin) → 无 macOS launchctl 块
    expect(screen.queryByText("macOS 永久设置 (launchctl)")).not.toBeInTheDocument();
  });

  it("应展示 Ollama CORS 两段配置命令", () => {
    render(<EnvironmentDetectionPanel />);
    expect(screen.getByText(OLLAMA_PRECISE)).toBeInTheDocument();
    expect(screen.getByText(OLLAMA_WILDCARD)).toBeInTheDocument();
    expect(screen.getAllByText("复制")).toHaveLength(2);
  });

  it("isMac=true 应追加 macOS launchctl 永久设置块", () => {
    const restoreUa = stubMacUserAgent();
    try {
      render(<EnvironmentDetectionPanel />);
      expect(screen.getByText("macOS 永久设置 (launchctl)")).toBeInTheDocument();
      expect(screen.getByText('launchctl setenv OLLAMA_ORIGINS "*"')).toBeInTheDocument();
      expect(screen.getAllByText("复制")).toHaveLength(3);
    } finally {
      restoreUa();
    }
  });

  it("复制精确 origin 命令: writeText 成功后应弹 toast.success", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(<EnvironmentDetectionPanel />);

    fireEvent.click(screen.getAllByText("复制")[0]!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OLLAMA_PRECISE));
    await waitFor(() =>
      expect(m.toastSuccess).toHaveBeenCalledWith("已复制到剪贴板", {
        style: toastStyle,
        duration: 1500,
      })
    );
  });

  it("复制通配符命令: writeText 收到 wildcard 命令", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(<EnvironmentDetectionPanel />);

    fireEvent.click(screen.getAllByText("复制")[1]!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OLLAMA_WILDCARD));
    expect(m.toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("复制 macOS 命令: writeText 收到 launchctl 命令", async () => {
    const restoreUa = stubMacUserAgent();
    try {
      const writeText = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      render(<EnvironmentDetectionPanel />);

      fireEvent.click(screen.getAllByText("复制")[2]!);
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith('launchctl setenv OLLAMA_ORIGINS "*"')
      );
    } finally {
      restoreUa();
    }
  });

  it("writeText 失败时应静默 (catch 分支, 不弹成功提示)", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValue(new Error("clipboard denied"));
    render(<EnvironmentDetectionPanel />);

    fireEvent.click(screen.getAllByText("复制")[0]!);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    // catch 分支吞掉 rejection, 等微任务冲刷后确认无成功提示
    await act(async () => {});
    expect(m.toastSuccess).not.toHaveBeenCalled();
  });

  it("clipboard 缺失时复制应短路且不抛错 (可选链空值分支)", async () => {
    // setup.ts 已 polyfill navigator.clipboard (writable) — 临时置空覆盖 ?. 分支
    const saved = navigator.clipboard;
    Reflect.set(navigator, "clipboard", undefined);
    try {
      render(<EnvironmentDetectionPanel />);
      expect(() => fireEvent.click(screen.getAllByText("复制")[0]!)).not.toThrow();
      await act(async () => {});
      expect(m.toastSuccess).not.toHaveBeenCalled();
    } finally {
      Reflect.set(navigator, "clipboard", saved);
    }
  });
});
