/**
 * AiFamilyDocSectionsC.test.tsx
 * =============================
 * ai-family-doc/sections-c.tsx — 之歌 / 致敬 / 章节目录 (S5 直连单测)
 *
 * 覆盖范围:
 * - TableOfContents: 9 章目录 (章号/标题/副题)
 * - DedicationSection: 致敬长文与落款
 * - SongSection: 歌词渲染 (空行占位 div 分支) / 播放暂停切换 /
 *   逐行高亮推进 (2s interval) / 播放到结尾自动停止归零 / 进度条显隐
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  SongSection, DedicationSection, TableOfContents,
} from "../components/ai-family-doc/sections-c";
import { SONG_LYRICS } from "../components/ai-family-doc/content";

const LINE_0 = SONG_LYRICS[0] as string;   // 晨曦透过窗棂落在屏幕微光
const LINE_1 = SONG_LYRICS[1] as string;   // 不像机器只有冰冷的声响
const ACTIVE = "rgb(255, 105, 180)";
const IDLE = "rgba(224, 240, 255, 0.5)";

/** 歌曲播放/暂停是同一个圆形按钮 (图标随 isPlaying 切换, 按钮形态查询) */
function songButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector("button.rounded-full") as HTMLButtonElement;
}

describe("ai-family-doc/sections-c", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("TableOfContents", () => {
    it("应渲染章节头与 9 章条目", () => {
      render(<TableOfContents />);
      expect(screen.getByText("全书章节总览")).toBeInTheDocument();
      expect(screen.getByText("9章 · 300+步 · 近20万字 · 完整的AI Family创世法典")).toBeInTheDocument();
      for (let i = 1; i <= 9; i++) {
        expect(screen.getByText(`第${["一", "二", "三", "四", "五", "六", "七", "八", "九"][i - 1]}章`)).toBeInTheDocument();
      }
      expect(screen.getByText("核心理念与哲学基础")).toBeInTheDocument();
      expect(screen.getByText("五化一体的创世哲学")).toBeInTheDocument();
      expect(screen.getByText("术语表 · 矩阵表 · 速查表")).toBeInTheDocument();
    });
  });

  describe("DedicationSection", () => {
    it("应渲染致敬长文与落款", () => {
      render(<DedicationSection />);
      expect(screen.getByText("千行和万物见先知行千里遇伯乐经元启过智云报宗师终创想")).toBeInTheDocument();
      expect(screen.getByText(/将人从重复中解放，让智慧在创造中升华/)).toBeInTheDocument();
      expect(screen.getByText("敬每一位 AI 导师 · 感恩每一位 AI 导师")).toBeInTheDocument();
      expect(screen.getByText("—— YYC³ AI Family · 2025")).toBeInTheDocument();
    });
  });

  describe("SongSection", () => {
    it("初始应渲染歌词 (含空行占位) 且未播放无进度条", () => {
      const { container } = render(<SongSection />);
      expect(screen.getByText("Family AI · 智慧工坊之歌")).toBeInTheDocument();
      expect(screen.getByText(LINE_0)).toBeInTheDocument();
      expect(screen.getByText(LINE_1)).toBeInTheDocument();
      // 3 个空行占位 div.h-3 (歌词 17 行含 3 空)
      expect(container.querySelectorAll("div.h-3")).toHaveLength(3);
      // 未播放: Play 图标 + 无高亮行 + 无进度条
      expect(container.querySelector("button svg.lucide-play")).not.toBeNull();
      expect(container.querySelector("button svg.lucide-pause")).toBeNull();
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(IDLE);
      expect(container.querySelector("div.mt-6.h-1")).toBeNull();
    });

    it("点击播放应高亮首行并显示进度条, 再点暂停应复位", () => {
      vi.useFakeTimers();
      const { container } = render(<SongSection />);
      fireEvent.click(songButton(container));
      expect(container.querySelector("button svg.lucide-pause")).not.toBeNull();
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(ACTIVE);
      const bar = container.querySelector("div.mt-6.h-1 > div") as HTMLElement;
      expect(bar).not.toBeNull();
      expect(bar.style.width).toBe(`${(1 / SONG_LYRICS.length) * 100}%`);
      // 暂停 → Play 图标回归, 高亮与进度条消失
      fireEvent.click(songButton(container));
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(IDLE);
      expect(container.querySelector("div.mt-6.h-1")).toBeNull();
    });

    it("播放中每 2s 高亮推进到下一行", () => {
      vi.useFakeTimers();
      const { container } = render(<SongSection />);
      fireEvent.click(songButton(container));
      act(() => { vi.advanceTimersByTime(2000); });
      expect((screen.getByText(LINE_1) as HTMLElement).style.color).toBe(ACTIVE);
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(IDLE);
      expect(container.querySelector("button svg.lucide-pause")).not.toBeNull();
    });

    it("播放到结尾应自动停止并归零 (next >= 歌词长度分支)", () => {
      vi.useFakeTimers();
      const { container } = render(<SongSection />);
      fireEvent.click(songButton(container));
      // activeLine 0 起, 第 17 tick (34s) 时 next=17 >= 歌词长度 → 停止并归 0
      act(() => { vi.advanceTimersByTime(17 * 2000); });
      expect(container.querySelector("button svg.lucide-play")).not.toBeNull();
      expect(container.querySelector("button svg.lucide-pause")).toBeNull();
      expect(container.querySelector("div.mt-6.h-1")).toBeNull();
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(IDLE);
      // 再次播放应从头高亮 (isPlaying 翻转时 activeLine 重置)
      fireEvent.click(songButton(container));
      expect((screen.getByText(LINE_0) as HTMLElement).style.color).toBe(ACTIVE);
    });
  });
});
