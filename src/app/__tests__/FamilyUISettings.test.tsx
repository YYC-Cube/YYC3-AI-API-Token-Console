/**
 * FamilyUISettings.test.tsx
 * =========================
 * ai-family/FamilyUISettings.tsx — AI Family 生态控制中心
 *
 * 覆盖范围:
 * - 生态链路标签 (默认): 13 节点 / 单链路测通 / 一键测通 / 自动修复入口
 * - 外观偏好: 动画速度/信息密度 pill + 开关持久化
 * - 通知设置: 各开关与保留天数持久化
 * - 数据管理: 存储概览空态/有数据 / 全量导出 / 清除全部 / 恢复默认
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { FamilyUISettings } from "../components/ai-family/FamilyUISettings";

const CONFIG_KEY = "yyc3-family-ui-config";

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={["/ai-family-settings"]}>
      <Routes>
        <Route path="*" element={<><FamilyUISettings /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** SettingRow 内的开关按钮 (label → row 根节点 → button) */
const rowToggle = (label: string) => {
  const row = screen.getByText(label).parentElement!.parentElement!;
  return row.querySelector("button") as HTMLButtonElement;
};

describe("ai-family/FamilyUISettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("生态链路 (默认标签)", () => {
    it("应渲染 13 个链路节点与数据流向图", () => {
      renderSettings();
      expect(screen.getByText("AI Family 生态控制中心")).toBeInTheDocument();
      expect(screen.getByText(/UI 偏好 · 生态链路 · 智能测通 · 数据管理/)).toBeInTheDocument();
      expect(screen.getByText(/一键智能测通 \(13 模块\)/)).toBeInTheDocument();
      for (const name of ["家园首页", "Family 中心", "家人对话", "家人热线", "文娱中心", "全家活动", "学习成长", "音乐空间", "成长轨迹", "模型控制", "语音系统", "数据中心", "通信中心"]) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }
      expect(screen.getByText("生态数据流向")).toBeInTheDocument();
      expect(screen.getByText("用户输入")).toBeInTheDocument();
      expect(screen.getByText("数据存储")).toBeInTheDocument();
      expect(screen.getByText("0/13 已检测")).toBeInTheDocument();
    });

    it("单链路测通: 测试中 → 链路正常", async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      renderSettings();
      const card = screen.getByText("家园首页").closest(".group") as HTMLElement;
      fireEvent.click(within(card).getByTitle("测试链路"));
      expect(within(card).getByText("测试中...")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      expect(within(card).getByText(/链路正常/)).toBeInTheDocument();
      expect(screen.getByText("1/13 已检测")).toBeInTheDocument();
      // 未全部测通 → 无"全链路健康"
      expect(screen.queryByText("全链路健康")).not.toBeInTheDocument();
    });

    it("一键智能测通后全部通过并显示全链路健康", async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      localStorage.setItem("yyc3-family-activities", JSON.stringify([{ id: "a" }]));
      renderSettings();
      fireEvent.click(screen.getByText(/一键智能测通/));
      await act(async () => { await vi.advanceTimersByTimeAsync(9_000); });
      expect(screen.getByText("13/13 已检测")).toBeInTheDocument();
      expect(screen.getAllByText(/链路正常/)).toHaveLength(13);
      expect(screen.getByText("全链路健康")).toBeInTheDocument();
      // 头部统计徽标: 13 个 ok
      expect(screen.getAllByText("13").length).toBeGreaterThanOrEqual(1);
    });

    it("链路「前往」按钮应导航至对应路由", () => {
      renderSettings();
      const card = screen.getByText("家人热线").closest(".group") as HTMLElement;
      fireEvent.click(within(card).getByTitle("前往"));
      expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-phone");
    });
  });

  describe("外观偏好", () => {
    it("动画速度与信息密度 pill 持久化", () => {
      renderSettings();
      fireEvent.click(screen.getByText("外观偏好"));
      expect(screen.getByText("动画速度")).toBeInTheDocument();
      fireEvent.click(screen.getByText("快速"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).animationSpeed).toBe("fast");
      fireEvent.click(screen.getByText("紧凑"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).infoDensity).toBe("compact");
    });

    it("开关 (默认展开卡片 / 显示离线家人) 持久化", () => {
      renderSettings();
      fireEvent.click(screen.getByText("外观偏好"));
      fireEvent.click(rowToggle("默认展开卡片"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).defaultExpandCards).toBe(true);
      fireEvent.click(rowToggle("显示离线家人"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).showOfflineMembers).toBe(false);
      expect(screen.getByText("拖拽排序功能开发中")).toBeInTheDocument();
      expect(screen.getByText("简体中文")).toBeInTheDocument();
      fireEvent.click(screen.getByText("English"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).locale).toBe("en-US");
    });
  });

  describe("通知设置", () => {
    it("各通知开关与保留天数持久化", () => {
      renderSettings();
      fireEvent.click(screen.getByText("通知设置"));
      for (const label of ["启用通知", "整点关爱播报", "每日家庭播报", "声音效果", "自动标记已读"]) {
        fireEvent.click(rowToggle(label));
      }
      const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY)!);
      expect(cfg.notificationsEnabled).toBe(false);
      expect(cfg.hourlyCareEnabled).toBe(false);
      expect(cfg.dailyBroadcastEnabled).toBe(false);
      expect(cfg.soundEnabled).toBe(false);
      expect(cfg.autoMarkRead).toBe(true);

      fireEvent.click(screen.getByText("90天"));
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).messageRetentionDays).toBe(90);
    });
  });

  describe("数据管理", () => {
    it("空存储显示空态与总计 0.0KB", () => {
      renderSettings();
      fireEvent.click(screen.getByText("数据管理"));
      expect(screen.getByText("总计 0.0KB")).toBeInTheDocument();
      expect(screen.getByText("暂无存储数据")).toBeInTheDocument();
    });

    it("有存储数据时渲染条目与大小", () => {
      localStorage.setItem("yyc3-family-comm-messages", JSON.stringify([{ id: 1 }]));
      renderSettings();
      fireEvent.click(screen.getByText("数据管理"));
      expect(screen.getByText("comm-messages")).toBeInTheDocument();
      expect(screen.queryByText("暂无存储数据")).not.toBeInTheDocument();
    });

    it("全量导出触发 blob 下载", () => {
      const createObjectURLMock = vi.fn(() => "blob:x");
      Object.defineProperty(URL, "createObjectURL", { value: createObjectURLMock, configurable: true, writable: true });
      Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true, writable: true });
      renderSettings();
      fireEvent.click(screen.getByText("数据管理"));
      fireEvent.click(screen.getByText("全量导出"));
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    });

    it("清除全部: 状态提示 + localStorage 清空 + 配置变更后概览重算", () => {
      localStorage.setItem("yyc3-family-activities", JSON.stringify([{ id: 1 }]));
      renderSettings();
      fireEvent.click(screen.getByText("数据管理"));
      fireEvent.click(screen.getByText("清除全部"));
      expect(screen.getByText("已清除所有 AI Family 数据")).toBeInTheDocument();
      expect(localStorage.getItem("yyc3-family-activities")).toBeNull();
      // 现有组件行为: loadConfig() 无存储时返回 DEFAULT_CONFIG 本体,
      // setConfig(DEFAULT_CONFIG) 触发 React bail-out → 概览保持旧 memo
      expect(screen.getByText("activities")).toBeInTheDocument();
      // 触发配置变更 (updateConfig 自身会持久化 ui-config) → 概览重算显示新条目
      fireEvent.click(screen.getByText("通知设置"));
      fireEvent.click(rowToggle("启用通知"));
      fireEvent.click(screen.getByText("数据管理"));
      expect(screen.getByText("ui-config")).toBeInTheDocument();
      expect(screen.queryByText("暂无存储数据")).not.toBeInTheDocument();
    });

    it("恢复默认设置: 提示并重写配置", () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ animationSpeed: "slow" }));
      renderSettings();
      fireEvent.click(screen.getByText("数据管理"));
      fireEvent.click(screen.getByText("恢复默认设置"));
      expect(screen.getByText("UI 偏好已恢复默认")).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!).animationSpeed).toBe("normal");
    });
  });
});
