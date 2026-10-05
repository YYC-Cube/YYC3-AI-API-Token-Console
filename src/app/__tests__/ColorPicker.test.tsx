/**
 * ColorPicker.test.tsx
 * ====================
 * HEX 颜色选择器组件测试
 *
 * 覆盖范围:
 * - 初始渲染: HEX 输入回填 / OKLch 展示 / swatch 底色
 * - HEX 输入: 非法字符过滤 / maxLength 截断 / Enter + blur 提交 / 短 hex 补零
 * - RGB 通道: 输入换算 onChange / 越界钳位 / 非法值回退 0
 * - SV 画布: mousedown 取色 + 拖拽 mousemove 连续取色 + mouseup 停止
 * - Hue 画布: mousedown 换色相
 * - 外部 value 变更同步 (rerender)
 *
 * Mock 契约 (零外部依赖):
 * - setup.ts 已提供 2d context 基础 mock; 本文件增强 createLinearGradient
 * - 画布 getBoundingClientRect stub 为固定矩形 (260×160), 取色坐标可预测
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ColorPicker } from "../components/theme/ColorPicker";

const ctx2d = {
  fillStyle: "",
  fillRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
};

function stubCanvasRect(): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 260,
    height: 160,
    right: 260,
    bottom: 160,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe("ColorPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx2d as unknown as CanvasRenderingContext2D
    );
    stubCanvasRect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderPicker(value = "#00d4ff", onChange = vi.fn()) {
    const utils = render(<ColorPicker value={value} onChange={onChange} />);
    return { ...utils, onChange };
  }

  /** 两个 HEX 输入 (顶部 swatch + 底部 Hex 栏) 均绑定同一状态 */
  function hexInputs() {
    return screen.getAllByDisplayValue("00d4ff");
  }

  it("初始渲染应回填 HEX 并展示 OKLch", () => {
    const { container } = renderPicker();
    expect(hexInputs().length).toBe(2);
    expect(screen.getByText("oklch(80.4% 0.146 219.5)")).toBeInTheDocument();
    // SV 画布与 Hue 画布均被绘制 (fillRect 被调用)
    expect(ctx2d.fillRect).toHaveBeenCalled();
    expect(container.querySelectorAll("canvas").length).toBe(2);
  });

  it("HEX 输入应过滤非法字符并截断至 6 位", () => {
    renderPicker();
    const input = hexInputs()[0];
    fireEvent.change(input, { target: { value: "zz12ab!987" } });
    expect((input as HTMLInputElement).value).toBe("12ab98");
  });

  it("Enter 提交完整 hex 应回调 onChange", () => {
    const onChange = vi.fn();
    renderPicker("#00d4ff", onChange);
    const input = hexInputs()[0];
    fireEvent.change(input, { target: { value: "aabbcc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("#aabbcc");
  });

  it("blur 提交短 hex 应右侧补零", () => {
    const onChange = vi.fn();
    renderPicker("#00d4ff", onChange);
    const input = hexInputs()[0];
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("#abc000");
  });

  it("R 通道输入应换算并回调 onChange", () => {
    const onChange = vi.fn();
    renderPicker("#00d4ff", onChange);
    const spinners = screen.getAllByRole("spinbutton");
    expect(spinners.length).toBe(3);
    fireEvent.change(spinners[0], { target: { value: "255" } });
    expect(onChange).toHaveBeenCalledWith("#ffd4ff");
  });

  it("RGB 越界值应钳位至 [0,255]", () => {
    const onChange = vi.fn();
    renderPicker("#00d4ff", onChange);
    const spinners = screen.getAllByRole("spinbutton");
    fireEvent.change(spinners[2], { target: { value: "300" } });
    expect(onChange).toHaveBeenCalledWith("#00d4ff"); // B 255 → 钳位后不变
  });

  it("RGB 非法值应回退 0", () => {
    const onChange = vi.fn();
    renderPicker("#00d4ff", onChange);
    const spinners = screen.getAllByRole("spinbutton");
    fireEvent.change(spinners[1], { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("#0000ff");
  });

  it("SV 画布 mousedown 应按坐标取色并回调", () => {
    const onChange = vi.fn();
    const { container } = renderPicker("#00d4ff", onChange);
    const svCanvas = container.querySelectorAll("canvas")[0];
    fireEvent.mouseDown(svCanvas, { clientX: 130, clientY: 80 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const hex = onChange.mock.calls[0][0] as string;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("SV 拖拽: mousemove 连续取色, mouseup 后停止", () => {
    const onChange = vi.fn();
    const { container } = renderPicker("#00d4ff", onChange);
    const svCanvas = container.querySelectorAll("canvas")[0];

    fireEvent.mouseDown(svCanvas, { clientX: 130, clientY: 80 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 40 });
    expect(onChange).toHaveBeenCalledTimes(2);

    fireEvent.mouseUp(window);
    fireEvent.mouseMove(window, { clientX: 10, clientY: 10 });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("Hue 画布 mousedown 应改变色相并回调", () => {
    const onChange = vi.fn();
    const { container } = renderPicker("#00d4ff", onChange);
    const hueCanvas = container.querySelectorAll("canvas")[1];
    fireEvent.mouseDown(hueCanvas, { clientX: 130, clientY: 7 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const hex = onChange.mock.calls[0][0] as string;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(hex).not.toBe("#00d4ff");
  });

  it("外部 value 变更应同步 HEX 输入", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColorPicker value="#00d4ff" onChange={onChange} />);
    expect(hexInputs().length).toBe(2);

    rerender(<ColorPicker value="#ff0000" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getAllByDisplayValue("ff0000").length).toBe(2);
    });
  });
});
