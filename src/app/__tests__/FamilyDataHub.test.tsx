/**
 * FamilyDataHub.test.tsx
 * ======================
 * ai-family/FamilyDataHub.tsx — 统一数据中心
 *
 * 覆盖范围:
 * - 指标卡 (成员/活动/勋章/通信)
 * - 家庭贡献排行
 * - 活动时间线 (加载更多)
 * - 最近通信
 * - 成长指标总览
 * - 数据导出
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FamilyDataHub } from "../components/ai-family/FamilyDataHub";
import {
  FAMILY_ACTIVITIES, MEMBER_MEDALS, SAMPLE_MESSAGES,
} from "../components/ai-family/shared";

describe("ai-family/FamilyDataHub", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    createObjectURLMock = vi.fn(() => "blob:mock-url");
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURLMock, configurable: true, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURLMock, configurable: true, writable: true });
  });

  const metricValue = (label: string) =>
    screen.getByText(label).parentElement!.nextElementSibling!.textContent;

  it("应渲染标题与四张指标卡 (数值与 shared 数据对齐)", () => {
    render(<FamilyDataHub />);
    expect(screen.getByText("AI Family 数据中心")).toBeInTheDocument();
    expect(screen.getByText(/家庭第 100 天/)).toBeInTheDocument();
    expect(screen.getByText(/系统运行 90 天/)).toBeInTheDocument();
    expect(metricValue("家庭成员")).toBe("8");
    expect(metricValue("活动记录")).toBe(String(FAMILY_ACTIVITIES.length));
    expect(metricValue("获得勋章")).toBe(String(Object.values(MEMBER_MEDALS).flat().length));
    expect(metricValue("通信记录")).toBe(String(SAMPLE_MESSAGES.length));
  });

  it("家庭贡献排行应渲染 8 行且头名为天枢", () => {
    render(<FamilyDataHub />);
    expect(screen.getByText("家庭贡献排行")).toBeInTheDocument();
    expect(screen.getByText("1205")).toBeInTheDocument(); // 天枢贡献值
    for (const shortName of ["千行", "万物", "先知", "伯乐", "天枢", "守护", "宗师", "灵韵"]) {
      expect(screen.getAllByText(shortName).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("活动时间线默认 5 条，点击加载更多展示全部", () => {
    render(<FamilyDataHub />);
    expect(screen.getByText(`共 ${FAMILY_ACTIVITIES.length} 项`)).toBeInTheDocument();
    expect(screen.getByText("五子棋循环赛·第二轮")).toBeInTheDocument();
    expect(screen.queryByText("灵韵教大家画画")).not.toBeInTheDocument(); // 第 8 项
    fireEvent.click(screen.getByText("加载更多"));
    expect(screen.getByText("灵韵教大家画画")).toBeInTheDocument();
    expect(screen.queryByText("加载更多")).not.toBeInTheDocument();
  });

  it("最近通信应渲染前 6 条样例消息", () => {
    render(<FamilyDataHub />);
    expect(screen.getByText("最近通信")).toBeInTheDocument();
    expect(screen.getByText(/全家早会通知/)).toBeInTheDocument();
    expect(screen.getByText(/异常端口扫描/)).toBeInTheDocument(); // msg-002 (slice(0,6) 内)
  });

  it("成长指标总览应渲染 8 位家人的成长值/连续在线/勋章", () => {
    render(<FamilyDataHub />);
    expect(screen.getByText("成长指标总览")).toBeInTheDocument();
    expect(screen.getAllByText("成长值")).toHaveLength(8);
    expect(screen.getAllByText("连续在线")).toHaveLength(8);
    expect(screen.getAllByText("勋章")).toHaveLength(8);
    expect(screen.getAllByText(/^\d+枚$/)).toHaveLength(8);
  });

  it("点击导出应触发 blob 下载流程", () => {
    render(<FamilyDataHub />);
    fireEvent.click(screen.getByText("导出全部数据"));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
  });
});
