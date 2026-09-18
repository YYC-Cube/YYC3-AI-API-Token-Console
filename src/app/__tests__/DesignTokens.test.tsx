/**
 * DesignTokens.test.tsx
 * =======================
 * Design Tokens 展示组件测试
 *
 * 覆盖范围:
 * - 色彩 / 字体 / 间距 / 阴影 / 动效 标签页
 * - Token 数据完整性
 * - 标签切换
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DesignTokens,
  COLOR_TOKENS,
  TYPOGRAPHY_TOKENS,
  SPACING_TOKENS,
  SHADOW_TOKENS,
  ANIMATION_TOKENS,
} from "../components/design-system/DesignTokens";

describe("DesignTokens", () => {
  describe("Token 数据完整性", () => {
    it("应有 19 个色彩 Token", () => {
      expect(COLOR_TOKENS.length).toBe(19);
    });

    it("色彩 Token 应有 name/value/cssVar/usage", () => {
      for (const t of COLOR_TOKENS) {
        expect(t.name).toBeTruthy();
        expect(t.value).toBeTruthy();
        expect(t.cssVar).toBeTruthy();
        expect(t.usage).toBeTruthy();
      }
    });

    it("应有 8 个字体 Token", () => {
      expect(TYPOGRAPHY_TOKENS.length).toBe(8);
    });

    it("应有 9 个间距 Token", () => {
      expect(SPACING_TOKENS.length).toBe(9);
    });

    it("应有 9 个阴影 Token", () => {
      expect(SHADOW_TOKENS.length).toBe(9);
    });

    it("应有 9 个动效 Token", () => {
      expect(ANIMATION_TOKENS.length).toBe(9);
    });
  });

  describe("渲染", () => {
    it("应渲染主容器", () => {
      render(<DesignTokens />);
      expect(screen.getByTestId("design-tokens")).toBeInTheDocument();
    });

    it("应有 5 个标签按钮", () => {
      render(<DesignTokens />);
      expect(screen.getByTestId("token-tab-colors")).toBeInTheDocument();
      expect(screen.getByTestId("token-tab-typography")).toBeInTheDocument();
      expect(screen.getByTestId("token-tab-spacing")).toBeInTheDocument();
      expect(screen.getByTestId("token-tab-shadows")).toBeInTheDocument();
      expect(screen.getByTestId("token-tab-animations")).toBeInTheDocument();
    });

    it("默认应显示色彩面板", () => {
      render(<DesignTokens />);
      expect(screen.getByTestId("token-colors")).toBeInTheDocument();
    });

    it("切换到字体标签应显示字体面板", () => {
      render(<DesignTokens />);
      fireEvent.click(screen.getByTestId("token-tab-typography"));
      expect(screen.getByTestId("token-typography")).toBeInTheDocument();
    });

    it("切换到间距标签", () => {
      render(<DesignTokens />);
      fireEvent.click(screen.getByTestId("token-tab-spacing"));
      expect(screen.getByTestId("token-spacing")).toBeInTheDocument();
    });

    it("切换到阴影标签", () => {
      render(<DesignTokens />);
      fireEvent.click(screen.getByTestId("token-tab-shadows"));
      expect(screen.getByTestId("token-shadows")).toBeInTheDocument();
    });

    it("切换到动效标签", () => {
      render(<DesignTokens />);
      fireEvent.click(screen.getByTestId("token-tab-animations"));
      expect(screen.getByTestId("token-animations")).toBeInTheDocument();
    });
  });

  describe("Primary 色彩标注", () => {
    it("应含 #00d4ff 主色", () => {
      const primary = COLOR_TOKENS.find((c) => c.name === "Primary");
      expect(primary?.value).toBe("#00d4ff");
    });

    it("应含 #060e1f 背景色", () => {
      const bg = COLOR_TOKENS.find((c) => c.name === "Background");
      expect(bg?.value).toBe("#060e1f");
    });

    it("应含 #ff3366 危险色", () => {
      const dest = COLOR_TOKENS.find((c) => c.name === "Destructive");
      expect(dest?.value).toBe("#ff3366");
    });
  });
});
