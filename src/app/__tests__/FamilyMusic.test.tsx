/**
 * FamilyMusic.test.tsx
 * ====================
 * ai-family/FamilyMusic.tsx — 音乐 & 新闻空间
 *
 * 覆盖范围:
 * - 音乐页: 播放器 / 播放列表 / 进度推进 / 曲目自动切换
 * - 切歌(前进) / 点播列表曲目 / 收藏切换
 * - 资讯页: 新闻列表渲染
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyMusic } from "../components/ai-family/FamilyMusic";

const renderPage = () =>
  render(<MemoryRouter><FamilyMusic /></MemoryRouter>);

describe("ai-family/FamilyMusic", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("默认音乐页应渲染播放器与 8 首播放列表", () => {
    renderPage();
    expect(screen.getByText("音乐空间")).toBeInTheDocument();
    expect(screen.getByText("沉浸专注 · AI 智能推荐")).toBeInTheDocument();
    // 播放器标题与列表行同文本 → 各 2 处
    expect(screen.getAllByText("Family AI — 智慧工坊")).toHaveLength(2);
    expect(screen.getAllByText("YYC3 Family").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("8 首")).toBeInTheDocument();
    expect(screen.getByText("Deep Focus · 深海专注")).toBeInTheDocument();
    expect(screen.getByText("Gentle Rain · 温柔细雨")).toBeInTheDocument();
  });

  it("点击播放后进度按 300ms 步进推进", () => {
    vi.useFakeTimers();
    renderPage();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    const playBtn = document.querySelector("button svg.lucide-play")!.closest("button") as HTMLButtonElement;
    fireEvent.click(playBtn);
    // 播放中显示暂停图标
    expect(document.querySelector("svg.lucide-pause")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText("0:01")).toBeInTheDocument();
  });

  it("进度到 100% 后自动切换到下一曲目并归零", () => {
    vi.useFakeTimers();
    renderPage();
    fireEvent.click(document.querySelector("button svg.lucide-play")!.closest("button") as HTMLButtonElement);
    // 4:32 = 272s, 0.5%/300ms → 第 201 tick (60.3s) 时 p>=100 切歌
    act(() => { vi.advanceTimersByTime(60_500); });
    // 播放器标题与列表项同文本 → 至少 2 处
    expect(screen.getAllByText("Deep Focus · 深海专注").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("点击前进图标应切换到下一曲目", () => {
    renderPage();
    fireEvent.click(document.querySelector("svg.lucide-skip-forward")!);
    expect(screen.getAllByText("Deep Focus · 深海专注").length).toBeGreaterThanOrEqual(2);
  });

  it("点击播放列表曲目应变为当前曲目并开始播放", () => {
    renderPage();
    expect(document.querySelector("svg.lucide-pause")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Code Flow · 编程心流"));
    expect(screen.getAllByText("Code Flow · 编程心流").length).toBe(2); // 播放器 + 列表
    expect(document.querySelector("svg.lucide-pause")).toBeInTheDocument();
  });

  it("收藏心形可切换 (默认第 1 首已收藏)", () => {
    renderPage();
    const heartBtns = () =>
      screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-heart"));
    const fillOf = (i: number) =>
      (heartBtns()[i].querySelector("svg") as SVGElement).style.fill;
    expect(fillOf(0)).toBe("rgb(255, 105, 180)"); // jsdom 归一化 #FF69B4
    expect(fillOf(1)).toBe("none");
    fireEvent.click(heartBtns()[0]);
    expect(fillOf(0)).toBe("none");
    fireEvent.click(heartBtns()[1]);
    expect(fillOf(1)).toBe("rgb(255, 105, 180)");
  });

  it("静音按钮可切换图标", () => {
    renderPage();
    const muteBtn = document.querySelector("button svg.lucide-volume-2")!.closest("button") as HTMLButtonElement;
    fireEvent.click(muteBtn);
    expect(document.querySelector("button svg.lucide-volume-x")).toBeInTheDocument();
  });

  it("资讯页应渲染行业新闻列表", () => {
    renderPage();
    fireEvent.click(screen.getByText("资讯"));
    expect(screen.getByText("行业资讯")).toBeInTheDocument();
    expect(screen.getByText("AI 精选 · 行业前沿资讯")).toBeInTheDocument();
    expect(screen.getByText("OpenAI 发布 GPT-5 技术报告，推理能力大幅跃升")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes 2.0 路线图公布：AI工作负载原生支持")).toBeInTheDocument();
    expect(screen.getByText("AI前沿")).toBeInTheDocument();
    expect(screen.getByText("30分钟前")).toBeInTheDocument();
  });
});
