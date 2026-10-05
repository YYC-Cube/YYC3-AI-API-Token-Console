/**
 * ColorSwatch.test.tsx
 * =====================
 * theme/ColorSwatch.tsx — 单个颜色变量卡片
 *
 * 覆盖范围:
 * - 色块 / 标签 / HEX 大写渲染 (formatOklch 真实计算)
 * - 点击开合颜色选择器 (ColorPicker mock)
 * - 选择器 onClose 关闭 / 点击外部关闭
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../components/theme/ColorPicker", () => ({
  ColorPicker: (props: { value: string; onChange: (hex: string) => void; onClose?: () => void }) => (
    <div data-testid="color-picker" data-value={props.value}>
      <button onClick={() => props.onChange?.("#00ff00")}>picker-change</button>
      <button onClick={props.onClose}>picker-close</button>
    </div>
  ),
}));

import { ColorSwatch } from "../components/theme/ColorSwatch";

describe("theme/ColorSwatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应渲染标签 / OKLch 行 / HEX 大写", () => {
    render(<ColorSwatch label="主色" value="#ff0000" onChange={vi.fn()} />);
    expect(screen.getByText("主色")).toBeInTheDocument();
    expect(screen.getByText("#FF0000")).toBeInTheDocument();
    // formatOklch 真实输出 (oklch 前缀)
    expect(screen.getByText(/oklch/i)).toBeInTheDocument();
  });

  it("默认不渲染选择器, 点击后打开并透传 value", () => {
    render(<ColorSwatch label="主色" value="#ff0000" onChange={vi.fn()} />);
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("#FF0000"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
    expect(screen.getByTestId("color-picker")).toHaveAttribute("data-value", "#ff0000");
  });

  it("再次点击按钮应关闭选择器", () => {
    render(<ColorSwatch label="主色" value="#ff0000" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("#FF0000"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
    fireEvent.click(screen.getByText("#FF0000"));
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
  });

  it("选择器 onClose 应关闭弹层", () => {
    render(<ColorSwatch label="主色" value="#ff0000" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("#FF0000"));
    fireEvent.click(screen.getByText("picker-close"));
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
  });

  it("选择器内选色应回调 onChange", () => {
    const onChange = vi.fn();
    render(<ColorSwatch label="主色" value="#ff0000" onChange={onChange} />);
    fireEvent.click(screen.getByText("#FF0000"));
    fireEvent.click(screen.getByText("picker-change"));
    expect(onChange).toHaveBeenCalledWith("#00ff00");
  });

  it("点击卡片外部应关闭选择器", () => {
    render(
      <div>
        <ColorSwatch label="主色" value="#ff0000" onChange={vi.fn()} />
        <button>outside-zone</button>
      </div>,
    );
    fireEvent.click(screen.getByText("#FF0000"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText("outside-zone"));
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
  });
});
