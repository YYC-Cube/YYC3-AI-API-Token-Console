/**
 * ConnectionStatus.test.tsx
 * ==========================
 * ConnectionStatus 组件 - 渲染测试
 *
 * 覆盖范围:
 * - 5 种连接状态的正确渲染
 * - 标签文本映射
 * - compact 模式
 * - 重连按钮显示逻辑
 * - 重连次数显示
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionStatus } from "../components/ConnectionStatus";
import type { ConnectionState } from "../types";

const defaultProps = {
  reconnectCount: 0,
  lastSyncTime: "14:30:00",
  onReconnect: vi.fn(),
};

describe("ConnectionStatus", () => {
  // ----------------------------------------------------------
  // 5 种连接状态
  // ----------------------------------------------------------

  describe("连接状态渲染", () => {
    const stateLabels: Record<ConnectionState, string> = {
      connected: "实时连接",
      connecting: "连接中...",
      reconnecting: "重连中",
      disconnected: "已断开",
      simulated: "模拟模式",
    };

    for (const [state, label] of Object.entries(stateLabels)) {
      it(`应正确渲染 "${state}" 状态文本`, () => {
        render(
          <ConnectionStatus
            state={state as ConnectionState}
            {...defaultProps}
          />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    }
  });

  // ----------------------------------------------------------
  // compact 模式
  // ----------------------------------------------------------

  describe("compact 模式", () => {
    it("compact=true 时应渲染为 button", () => {
      render(
        <ConnectionStatus state="connected" compact {...defaultProps} />
      );
      const btn = screen.getByRole("button");
      expect(btn).toBeInTheDocument();
      expect(btn.textContent).toContain("实时连接");
    });

    it("compact 模式点击应触发 onReconnect", () => {
      const handleReconnect = vi.fn();
      render(
        <ConnectionStatus
          state="connected"
          compact
          {...defaultProps}
          onReconnect={handleReconnect}
        />
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleReconnect).toHaveBeenCalledTimes(1);
    });

    it("compact 模式重连状态应显示计数 (x/10)", () => {
      render(
        <ConnectionStatus
          state="reconnecting"
          reconnectCount={3}
          lastSyncTime="14:30:00"
          onReconnect={vi.fn()}
          compact
        />
      );
      expect(screen.getByText("(3/10)")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 完整模式
  // ----------------------------------------------------------

  describe("完整模式", () => {
    it("应显示最后同步时间", () => {
      render(
        <ConnectionStatus state="connected" {...defaultProps} />
      );
      expect(screen.getByText("14:30:00")).toBeInTheDocument();
    });

    it("disconnected 时应显示重连按钮", () => {
      render(
        <ConnectionStatus state="disconnected" {...defaultProps} />
      );
      const reconnectBtn = screen.getByTitle("手动重连");
      expect(reconnectBtn).toBeInTheDocument();
    });

    it("simulated 时应显示重连按钮", () => {
      render(
        <ConnectionStatus state="simulated" {...defaultProps} />
      );
      const reconnectBtn = screen.getByTitle("手动重连");
      expect(reconnectBtn).toBeInTheDocument();
    });

    it("connected 时不应显示重连按钮", () => {
      render(
        <ConnectionStatus state="connected" {...defaultProps} />
      );
      expect(screen.queryByTitle("手动重连")).not.toBeInTheDocument();
    });

    it("重连按钮点击应触发 onReconnect", () => {
      const handleReconnect = vi.fn();
      render(
        <ConnectionStatus
          state="disconnected"
          {...defaultProps}
          onReconnect={handleReconnect}
        />
      );
      fireEvent.click(screen.getByTitle("手动重连"));
      expect(handleReconnect).toHaveBeenCalledTimes(1);
    });
  });
});
