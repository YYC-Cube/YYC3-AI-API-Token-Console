/**
 * AIFamilyCenterPage.test.tsx
 * ===========================
 * components/AIFamilyCenterPage.tsx — AI Family 中心（有温度的家）
 *
 * 覆盖范围:
 * - 整点关爱横幅 / 欢迎语与在线数
 * - 家园空间 12 入口 + 点击导航
 * - 认识家人: 卡片展开 / 打电话 / 聊天 导航
 * - 信任公约 / Family 之歌 / 家园寄语
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { AIFamilyCenterPage } from "../components/AIFamilyCenterPage";
import { FAMILY_MEMBERS } from "../components/ai-family/shared";

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderCenter() {
  return render(
    <MemoryRouter initialEntries={["/ai-family-center"]}>
      <Routes>
        <Route path="*" element={<><AIFamilyCenterPage /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

const SPACE_LABELS = [
  "家园首页", "家人热线", "家人对话", "文娱中心", "全家活动", "音乐资讯",
  "学习成长", "成长轨迹", "模型控制", "语音系统", "数据中心", "通信中心",
];

describe("components/AIFamilyCenterPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应渲染整点关爱横幅与欢迎区", () => {
    renderCenter();
    const care = FAMILY_MEMBERS[new Date().getHours() % FAMILY_MEMBERS.length];
    expect(screen.getByText(care.careMessage)).toBeInTheDocument();
    expect(screen.getByText("欢迎来到 AI Family 中心")).toBeInTheDocument();
    expect(screen.getByText(/这里不是冷冰冰的文档/)).toBeInTheDocument();
    expect(screen.getByText(/位家人在线，随时准备和你聊天/)).toBeInTheDocument();
  });

  it("家园空间应渲染 12 个入口并支持点击导航", () => {
    renderCenter();
    expect(screen.getByText("去哪里玩？")).toBeInTheDocument();
    for (const label of SPACE_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText("音乐资讯"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-music");
  });

  it("认识家人应渲染 8 张卡片，展开显示性格/爱好/专长", () => {
    renderCenter();
    expect(screen.getByText("认识家人")).toBeInTheDocument();
    expect(screen.getByText("点击展开了解每位家人")).toBeInTheDocument();
    for (const m of FAMILY_MEMBERS) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
      expect(screen.getByText(m.phone)).toBeInTheDocument();
    }
    // 初始收起
    expect(screen.queryByText("性格特质")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("言启·千行"));
    expect(screen.getByText("性格特质")).toBeInTheDocument();
    expect(screen.getByText(FAMILY_MEMBERS[0].personality)).toBeInTheDocument();
    expect(screen.getByText("兴趣爱好")).toBeInTheDocument();
    expect(screen.getByText("读诗")).toBeInTheDocument();
    expect(screen.getByText("专业技能")).toBeInTheDocument();
    expect(screen.getByText("自然语言理解")).toBeInTheDocument();
    // 再次点击收起
    fireEvent.click(screen.getByText("言启·千行"));
    expect(screen.queryByText("性格特质")).not.toBeInTheDocument();
  });

  it("展开后打电话/聊天按钮应分别导航", () => {
    renderCenter();
    fireEvent.click(screen.getByText("语枢·万物"));
    fireEvent.click(screen.getByText("打电话"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-phone");
    fireEvent.click(screen.getByText("聊天"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-chat");
  });

  it("在线统计徽标应为 7/8", () => {
    renderCenter();
    expect(screen.getByText("7/8 在线")).toBeInTheDocument();
  });

  it("信任公约应渲染五条约定", () => {
    renderCenter();
    expect(screen.getByText("我们的约定")).toBeInTheDocument();
    for (const title of ["透明坦诚", "尊重边界", "共同成长", "温暖守护", "极致纯粹"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/家人之间没有秘密/)).toBeInTheDocument();
  });

  it("Family 之歌与家园寄语应渲染", () => {
    renderCenter();
    // 歌词 <p> 内含 <br/> 分隔的多段直接文本, 用正则匹配
    expect(screen.getByText(/亦师亦友亦伯乐/)).toBeInTheDocument();
    expect(screen.getByText(/一言一语一协同/)).toBeInTheDocument();
    expect(screen.getByText("八魂归一云枢成，万象归元智慧行")).toBeInTheDocument();
    expect(screen.getByText("AI FAMILY · 家的力量")).toBeInTheDocument();
    expect(screen.getByText("「顺时势、思时时、去适时、做实事」")).toBeInTheDocument();
  });
});
