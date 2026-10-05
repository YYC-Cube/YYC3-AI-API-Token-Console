/**
 * FamilyActivityCenter.test.tsx
 * ==============================
 * ai-family/FamilyActivityCenter.tsx — 全家活动中心（五标签页）
 *
 * 覆盖范围:
 * - 每日播报: 播报员 / 段落 / 签名
 * - 积分榜: 领奖台 / 完整排行 / 勋章与等级
 * - 活动记录: 类型过滤 / 展开详情(比分/勋章) / 收起
 * - 勋章墙: 勋章网格 / 家人荣誉榜
 * - 成长记忆: 隐私过滤 / 成员筛选 / 空态
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyActivityCenter } from "../components/ai-family/FamilyActivityCenter";
import {
  FAMILY_MEMBERS, FAMILY_ACTIVITIES, MEDALS, MEMBER_MEDALS, SAMPLE_MEMORIES,
  getTodayReporter, generateDailyBroadcast,
} from "../components/ai-family/shared";

const renderPage = () =>
  render(<MemoryRouter><FamilyActivityCenter /></MemoryRouter>);

describe("ai-family/FamilyActivityCenter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("每日播报（默认标签）", () => {
    it("应渲染标题 / 播报员 / 段落 / 签名", () => {
      renderPage();
      expect(screen.getByText("全家活动中心")).toBeInTheDocument();
      expect(screen.getByText("今日播报员")).toBeInTheDocument();
      const broadcast = generateDailyBroadcast();
      expect(screen.getByText(broadcast.reporter.name)).toBeInTheDocument();
      expect(screen.getByText(broadcast.headline)).toBeInTheDocument();
      expect(screen.getByText("今日家庭积分榜")).toBeInTheDocument();
      expect(screen.getByText("今日记忆存档")).toBeInTheDocument();
      expect(screen.getByText("以上是今日 Family AI 播报。明天见!")).toBeInTheDocument();
    });
  });

  describe("积分榜", () => {
    it("应渲染领奖台与完整排行（按贡献降序）", () => {
      renderPage();
      fireEvent.click(screen.getByText("积分榜"));
      expect(screen.getByText(/积分不是竞争/)).toBeInTheDocument();
      // 领奖台三席均显示"积分"标签
      expect(screen.getAllByText("积分")).toHaveLength(3);
      // 头名天枢 1,205 分 (领奖台 + 排行行均 toLocaleString)
      expect(screen.getAllByText("1,205").length).toBe(2);
      // 完整排行 8 行: 每位家人全名都出现
      for (const m of FAMILY_MEMBERS) {
        expect(screen.getAllByText(m.name).length).toBeGreaterThanOrEqual(1);
      }
      expect(screen.getAllByText(/连续/).length).toBe(8);
      // 等级 Lv. = floor(contribution/100)
      expect(screen.getByText("Lv.12")).toBeInTheDocument();
    });
  });

  describe("活动记录", () => {
    it("默认全部并支持类型过滤", () => {
      renderPage();
      fireEvent.click(screen.getByText("活动记录"));
      expect(screen.getByText(/这是我们一起走过的路/)).toBeInTheDocument();
      expect(screen.getByText("五子棋循环赛·第二轮")).toBeInTheDocument();
      expect(screen.getByText("灵韵的即兴画展")).toBeInTheDocument();

      fireEvent.click(screen.getAllByText("对弈竞技")[0]); // 筛选按钮 (同文本还有活动徽标)
      expect(screen.getByText("成语接龙大赛")).toBeInTheDocument();
      expect(screen.queryByText("灵韵的即兴画展")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("全部"));
      expect(screen.getByText("灵韵的即兴画展")).toBeInTheDocument();
    });

    it("点击卡片应展开详情（描述 / 比分 / 勋章），再次点击收起", () => {
      renderPage();
      fireEvent.click(screen.getByText("活动记录"));
      const title = screen.getByText("五子棋循环赛·第二轮");
      expect(screen.queryByText("比分详情")).not.toBeInTheDocument();
      fireEvent.click(title);
      expect(screen.getByText(/万物三战全胜/)).toBeInTheDocument();
      expect(screen.getByText("比分详情")).toBeInTheDocument();
      expect(screen.getByText(/棋王/)).toBeInTheDocument(); // 获得勋章 (icon + 名称)
      fireEvent.click(title);
      expect(screen.queryByText("比分详情")).not.toBeInTheDocument();
    });
  });

  describe("勋章墙", () => {
    it("应渲染勋章网格与家人荣誉榜", () => {
      renderPage();
      fireEvent.click(screen.getByText("勋章墙"));
      expect(screen.getByText(/每一枚勋章都是一个故事/)).toBeInTheDocument();
      for (const medal of MEDALS) {
        expect(screen.getByText(medal.name)).toBeInTheDocument();
      }
      expect(screen.getByText("家人荣誉榜")).toBeInTheDocument();
      // 千行/天枢/灵韵 各 5 枚勋章
      expect(screen.getAllByText("5 枚")).toHaveLength(3);
      expect(Object.values(MEMBER_MEDALS).flat().length).toBeGreaterThan(0);
    });
  });

  describe("成长记忆", () => {
    it("应过滤 self 隐私记忆并标注仅家人可见", () => {
      renderPage();
      fireEvent.click(screen.getByText("成长记忆"));
      expect(screen.getByText("8T 成长空间")).toBeInTheDocument();
      const visible = SAMPLE_MEMORIES.filter(m => m.privacy !== "self");
      expect(visible.length).toBe(7);
      expect(screen.getByText("今天学会了一个新方言")).toBeInTheDocument();
      // mem-007 (self) 不可见
      expect(screen.queryByText("和千行的深夜对话")).not.toBeInTheDocument();
      const familyCount = visible.filter(m => m.privacy === "family").length;
      expect(screen.getAllByText("仅家人可见")).toHaveLength(familyCount);
    });

    it("成员筛选: 有公开记忆时显示, 无公开记忆时显示空态", () => {
      renderPage();
      fireEvent.click(screen.getByText("成长记忆"));
      fireEvent.click(screen.getByText("宗师"));
      expect(screen.getByText("从错误中学到的")).toBeInTheDocument();
      expect(screen.queryByText("画了一幅日出")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("伯乐"));
      expect(screen.getByText("该家人的记忆暂未公开")).toBeInTheDocument();

      // 再点一次取消筛选
      fireEvent.click(screen.getByText("伯乐"));
      expect(screen.getByText("画了一幅日出")).toBeInTheDocument();
    });

    it("时间线活动数量与 shared 数据对齐", () => {
      renderPage();
      fireEvent.click(screen.getByText("活动记录"));
      fireEvent.click(screen.getByText("全部"));
      const rendered = screen.getAllByText(/2026-03/);
      expect(rendered.length).toBe(FAMILY_ACTIVITIES.length);
    });
  });
});
