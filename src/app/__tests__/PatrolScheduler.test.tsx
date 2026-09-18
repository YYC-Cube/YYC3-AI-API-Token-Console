/**
 * PatrolScheduler.test.tsx
 * =========================
 * PatrolScheduler 组件 - 巡查计划配置面板测试
 *
 * 覆盖范围:
 * - 面板标题渲染
 * - 自动巡查开关
 * - 间隔选择器
 * - 回调触发
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatrolScheduler } from "../components/PatrolScheduler";
import type { PatrolSchedule } from "../types";

const defaultSchedule: PatrolSchedule = {
  enabled: true,
  interval: 15,
  lastRun: Date.now() - 30 * 60 * 1000,
  nextRun: Date.now() + 15 * 60 * 1000,
};

describe("PatrolScheduler", () => {
  let onToggle: Mock;
  let onIntervalChange: Mock;

  beforeEach(() => {
    onToggle = vi.fn();
    onIntervalChange = vi.fn();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染面板标题", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText("巡查计划配置")).toBeInTheDocument();
    });

    it("应渲染自动巡查标签", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText("自动巡查")).toBeInTheDocument();
    });

    it("应渲染巡查间隔标签", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText("巡查间隔")).toBeInTheDocument();
    });

    it("应渲染 5 个间隔选项", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText("5 分钟")).toBeInTheDocument();
      expect(screen.getByText("10 分钟")).toBeInTheDocument();
      expect(screen.getByText("15 分钟")).toBeInTheDocument();
      expect(screen.getByText("30 分钟")).toBeInTheDocument();
      expect(screen.getByText("1 小时")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      const { container } = render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(container.querySelector("[data-testid='patrol-scheduler']")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 开关操作
  // ----------------------------------------------------------

  describe("开关操作", () => {
    it("点击开关应触发 onToggle(false) 当 enabled=true", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      const toggle = screen.getByTestId("patrol-toggle");
      fireEvent.click(toggle);
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it("点击开关应触发 onToggle(true) 当 enabled=false", () => {
      render(
        <PatrolScheduler
          schedule={{ ...defaultSchedule, enabled: false }}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      const toggle = screen.getByTestId("patrol-toggle");
      fireEvent.click(toggle);
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  // ----------------------------------------------------------
  // 间隔选择
  // ----------------------------------------------------------

  describe("间隔选择", () => {
    it("点击 30 分钟应触发 onIntervalChange(30)", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      fireEvent.click(screen.getByTestId("interval-30"));
      expect(onIntervalChange).toHaveBeenCalledWith(30);
    });

    it("当前间隔按钮应有激活样式", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      const activeBtn = screen.getByTestId("interval-15");
      expect(activeBtn.className).toContain("text-[#00d4ff]");
    });
  });

  // ----------------------------------------------------------
  // 调度信息
  // ----------------------------------------------------------

  describe("调度信息", () => {
    it("应显示上次巡查时间", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText(/上次巡查/)).toBeInTheDocument();
    });

    it("应显示下次巡查时间（当 enabled + nextRun 有值）", () => {
      render(
        <PatrolScheduler
          schedule={defaultSchedule}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.getByText(/下次巡查/)).toBeInTheDocument();
    });

    it("disabled 时不应显示下次巡查", () => {
      render(
        <PatrolScheduler
          schedule={{ ...defaultSchedule, enabled: false, nextRun: null }}
          onToggle={onToggle}
          onIntervalChange={onIntervalChange}
        />
      );
      expect(screen.queryByText(/下次巡查/)).not.toBeInTheDocument();
    });
  });
});