/**
 * NotFound.test.tsx
 * ==================
 * NotFound.tsx — 404 通配路由页面
 *
 * 覆盖范围:
 * - 404 大标题 + i18n 文案 (t: key => key)
 * - 当前路径展示
 * - 返回首页 / 返回上一页按钮
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

import { NotFound } from "../components/NotFound";

/** 路由探针: 显示当前 pathname 供断言 */
function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<><NotFound /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFound", () => {
  it("应渲染 404 与 i18n 文案", () => {
    renderAt("/missing/page");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("notFound.title")).toBeInTheDocument();
    expect(screen.getByText("notFound.desc")).toBeInTheDocument();
    expect(screen.getByText("notFound.footer")).toBeInTheDocument();
  });

  it("应展示当前访问路径", () => {
    renderAt("/missing/page");
    // 路径同时出现在 code 提示与路由探针中, 限定 code 元素
    expect(screen.getByText("/missing/page", { selector: "code" })).toBeInTheDocument();
  });

  it("点击返回首页应导航到 /", () => {
    renderAt("/missing/page");
    fireEvent.click(screen.getByText("notFound.goHome"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/");
  });

  it("点击返回上一页在无历史时保持原路径", () => {
    renderAt("/missing/page");
    fireEvent.click(screen.getByText("notFound.goBack"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/missing/page");
  });
});
