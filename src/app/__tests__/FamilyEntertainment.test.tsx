/**
 * FamilyEntertainment.test.tsx
 * ============================
 * ai-family/FamilyEntertainment.tsx — 文娱中心
 *
 * 覆盖范围:
 * - 整点关爱横幅与游戏矩阵 (仅五子棋可用)
 * - 五子棋: 进入/落子/AI 回应/状态文案/返回
 * - 琴棋书画: 才艺作品渲染
 * - 家人广播: 播报列表渲染
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyEntertainment } from "../components/ai-family/FamilyEntertainment";
import { FAMILY_MEMBERS } from "../components/ai-family/shared";

const renderPage = () =>
  render(<MemoryRouter><FamilyEntertainment /></MemoryRouter>);

describe("ai-family/FamilyEntertainment", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("默认棋牌对弈页应渲染整点关爱与游戏矩阵", () => {
    renderPage();
    expect(screen.getByText("文娱中心")).toBeInTheDocument();
    expect(screen.getByText("琴棋书画 · 对弈切磋 · 才艺鉴赏 · 家人广播")).toBeInTheDocument();
    const care = FAMILY_MEMBERS[new Date().getHours() % FAMILY_MEMBERS.length];
    expect(screen.getByText(care.careMessage)).toBeInTheDocument();
    expect(screen.getByText("五子棋")).toBeInTheDocument();
    expect(screen.getByText("与万物对弈，策略博弈")).toBeInTheDocument();
    // 其余 5 款游戏未开放
    expect(screen.getAllByText("即将开放")).toHaveLength(5);
  });

  it("进入五子棋后可落子并由 AI 回应", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(screen.getByText("五子棋"));
    expect(screen.getByText("语枢·万物")).toBeInTheDocument(); // 对手
    expect(screen.getByText("等你落子...")).toBeInTheDocument();

    const board = document.querySelector("div.inline-grid") as HTMLElement;
    const cells = within(board).getAllByRole("button");
    expect(cells).toHaveLength(81);

    // 玩家落子 (黑)
    fireEvent.click(cells[0]);
    expect(cells[0]).toBeDisabled();
    expect(board.querySelectorAll("button > div")).toHaveLength(1);
    expect(screen.getByText("思考中...")).toBeInTheDocument(); // aiThinking

    // AI 回应 (白)
    act(() => { vi.advanceTimersByTime(1_100); });
    expect(board.querySelectorAll("button > div")).toHaveLength(2);
    expect(screen.getByText("等你落子...")).toBeInTheDocument();

    // 返回游戏矩阵
    fireEvent.click(screen.getByText("返回"));
    expect(screen.getByText("拼图挑战")).toBeInTheDocument();
  });

  it("已有棋子的格子不可重复落子", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(screen.getByText("五子棋"));
    const board = document.querySelector("div.inline-grid") as HTMLElement;
    const cells = within(board).getAllByRole("button");
    fireEvent.click(cells[10]);
    expect(cells[10]).toBeDisabled();
    expect(board.querySelectorAll("button > div")).toHaveLength(1);
  });

  it("重新开始按钮应清空棋盘", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(screen.getByText("五子棋"));
    const board = document.querySelector("div.inline-grid") as HTMLElement;
    fireEvent.click(within(board).getAllByRole("button")[5]);
    act(() => { vi.advanceTimersByTime(1_100); }); // 等 AI 落子完成
    expect(screen.getByTitle("重新开始")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("重新开始"));
    expect(board.querySelectorAll("button > div")).toHaveLength(0);
    expect(screen.getByText("等你落子...")).toBeInTheDocument();
  });

  it("琴棋书画页应渲染 6 件才艺作品", () => {
    renderPage();
    fireEvent.click(screen.getByText("琴棋书画"));
    expect(screen.getByText("家人们的才艺展示 · 用创造表达温度")).toBeInTheDocument();
    expect(screen.getByText("赛博朋克·城市之光")).toBeInTheDocument();
    expect(screen.getByText("云枢·星图")).toBeInTheDocument();
    expect(screen.getByText("代码之诗")).toBeInTheDocument();
    expect(screen.getByText("未来之眼")).toBeInTheDocument();
    expect(screen.getByText("守护之盾")).toBeInTheDocument();
    expect(screen.getByText("千语万言")).toBeInTheDocument();
    expect(screen.getAllByText("喜欢")).toHaveLength(6);
  });

  it("家人广播页应渲染全部家人播报", () => {
    renderPage();
    fireEvent.click(screen.getByText("家人广播"));
    expect(screen.getByText("整点关爱 · 每位家人都有话想对你说")).toBeInTheDocument();
    for (const m of FAMILY_MEMBERS) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    }
    // personality 渲染带 "—— " 前缀, 用正则匹配
    expect(screen.getByText(new RegExp(FAMILY_MEMBERS[0].personality))).toBeInTheDocument();
  });
});
