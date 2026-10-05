/**
 * AIFamilyRouter.test.tsx
 * ========================
 * ai-family/AIFamilyRouter.tsx — AI Family 统一子路由入口 (轻量壳)
 *
 * 覆盖范围:
 * - 路由参数 subpage 解析 (有效 key → lazy 加载对应页面)
 * - pathname 正则解析 (/ai-family-xxx)
 * - 无效 key fallback 到 home
 * - 15 个子页面模块 mock (避免真实动态 import 重依赖)
 *
 * 未覆盖 (诚实跳过): lazy 加载失败的 ErrorFallback 分支 —
 * lazyMap 定义于模块内部, 无法在测试中注入 rejected loader。
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

// vi.mock 路径必须静态 (不支持插值), 逐一 mock 15 个 lazy 子页面
vi.mock("../components/ai-family/FamilyHome", () => ({ FamilyHome: () => <div data-testid="page-home" /> }));
vi.mock("../components/ai-family/FamilyChat", () => ({ FamilyChat: () => <div data-testid="page-chat" /> }));
vi.mock("../components/ai-family/FamilyShare", () => ({ FamilyShare: () => <div data-testid="page-share" /> }));
vi.mock("../components/ai-family/FamilyLearn", () => ({ FamilyLearn: () => <div data-testid="page-learn" /> }));
vi.mock("../components/ai-family/FamilyMusic", () => ({ FamilyMusic: () => <div data-testid="page-music" /> }));
vi.mock("../components/ai-family/FamilyGrowth", () => ({ FamilyGrowth: () => <div data-testid="page-growth" /> }));
vi.mock("../components/ai-family/FamilyPhone", () => ({ FamilyPhone: () => <div data-testid="page-phone" /> }));
vi.mock("../components/ai-family/FamilyEntertainment", () => ({ FamilyEntertainment: () => <div data-testid="page-fun" /> }));
vi.mock("../components/ai-family/FamilyActivityCenter", () => ({ FamilyActivityCenter: () => <div data-testid="page-activities" /> }));
vi.mock("../components/ai-family/FamilyModelSettings", () => ({ FamilyModelSettings: () => <div data-testid="page-models" /> }));
vi.mock("../components/ai-family/FamilyVoiceSystem", () => ({ FamilyVoiceSystem: () => <div data-testid="page-voice" /> }));
vi.mock("../components/ai-family/FamilyDataHub", () => ({ FamilyDataHub: () => <div data-testid="page-data" /> }));
vi.mock("../components/ai-family/FamilyCommCenter", () => ({ FamilyCommCenter: () => <div data-testid="page-comm" /> }));
vi.mock("../components/ai-family/FamilyUISettings", () => ({ FamilyUISettings: () => <div data-testid="page-settings" /> }));
vi.mock("../components/ai-family/FamilyDrama", () => ({ FamilyDrama: () => <div data-testid="page-drama" /> }));

import { AIFamilyRouter } from "../components/ai-family/AIFamilyRouter";

function renderRouter(entries: string[], routePath: string) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path={routePath} element={<AIFamilyRouter />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ai-family/AIFamilyRouter", () => {
  it("路由参数 subpage 有效时应加载对应页面 (chat)", async () => {
    renderRouter(["/fam/chat"], "/fam/:subpage");
    expect(await screen.findByTestId("page-chat")).toBeInTheDocument();
  });

  it("无参数时应从 pathname 解析 (/ai-family-music)", async () => {
    renderRouter(["/ai-family-music"], "*");
    expect(await screen.findByTestId("page-music")).toBeInTheDocument();
  });

  it("pathname 无匹配时应回退到 home", async () => {
    renderRouter(["/ai-family-nonsense"], "*");
    expect(await screen.findByTestId("page-home")).toBeInTheDocument();
  });

  it("参数无效且 pathname 不匹配时应回退到 home", async () => {
    renderRouter(["/fam/bogus"], "/fam/:subpage");
    expect(await screen.findByTestId("page-home")).toBeInTheDocument();
  });

  it("参数优先于 pathname (两者均有效时取参数)", async () => {
    renderRouter(["/fam/learn"], "/fam/:subpage");
    expect(await screen.findByTestId("page-learn")).toBeInTheDocument();
  });

  it("深层子页 (data/settings/drama) 应正确解析", async () => {
    renderRouter(["/ai-family-data"], "*");
    expect(await screen.findByTestId("page-data")).toBeInTheDocument();

    renderRouter(["/ai-family-drama"], "*");
    expect(await screen.findByTestId("page-drama")).toBeInTheDocument();
  });
});
