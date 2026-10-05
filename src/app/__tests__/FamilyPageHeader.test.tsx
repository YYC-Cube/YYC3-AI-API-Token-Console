/**
 * FamilyPageHeader.test.tsx
 * ==========================
 * ai-family/FamilyPageHeader.tsx — AI Family 子页面统一头部导航
 *
 * 覆盖范围:
 * - 标题 / 副标题 / 图标 / 操作区渲染
 * - 返回按钮导航 (自定义 backPath)
 * - subtitle 与 actions 的条件渲染
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { FamilyPageHeader } from "../components/ai-family/FamilyPageHeader";

const StubIcon = () => <svg data-testid="header-icon" />;

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

describe("ai-family/FamilyPageHeader", () => {
  it("应渲染图标 / 标题 / 副标题 / 操作区 / 返回按钮", () => {
    render(
      <MemoryRouter initialEntries={["/some-subpage"]}>
        <Routes>
          <Route
            path="*"
            element={
              <FamilyPageHeader
                icon={StubIcon}
                iconColor="#aa55ff"
                title="模型设置"
                subtitle="管理子页模型"
                backPath="/ai-family-home"
                backLabel="返回家园"
                actions={<button>action-btn</button>}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("header-icon")).toBeInTheDocument();
    expect(screen.getByText("模型设置")).toBeInTheDocument();
    expect(screen.getByText("管理子页模型")).toBeInTheDocument();
    expect(screen.getByText("action-btn")).toBeInTheDocument();
    expect(screen.getByText("返回家园")).toBeInTheDocument();
  });

  it("点击返回按钮应导航到 backPath", () => {
    render(
      <MemoryRouter initialEntries={["/some-subpage"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <FamilyPageHeader icon={StubIcon} title="模型设置" backPath="/ai-family-home" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("/some-subpage");
    fireEvent.click(screen.getByText("返回家园"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-home");
  });

  it("未传 subtitle 与 actions 时不应渲染对应区域", () => {
    render(
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route
            path="*"
            element={<FamilyPageHeader icon={StubIcon} title="纯净头部" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("纯净头部")).toBeInTheDocument();
    expect(screen.queryByText("action-btn")).not.toBeInTheDocument();
    // 仅标题, 无副标题 <p>
    expect(screen.getByText("纯净头部").parentElement!.querySelectorAll("p")).toHaveLength(0);
  });
});
