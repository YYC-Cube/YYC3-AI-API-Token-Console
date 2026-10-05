/**
 * ThemeCustomizer.test.tsx
 * =========================
 * ThemeCustomizer 组件测试
 *
 * 覆盖范围:
 * - Header 渲染 (标题/重置/保存)
 * - Section 手风琴展开/折叠
 * - 品牌设置: 系统名称/标语输入
 * - 颜色自定义: 语义化变量
 * - 预设下拉: 打开/搜索/选择/空匹配
 * - 字体排版设置
 * - 阴影/圆角滑块
 * - 亮度调节
 * - 实时预览区域
 * - 重置按钮恢复默认
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

vi.mock("../components/theme/ColorSwatch", () => ({
  ColorSwatch: ({ label, value, onChange }: any) => (
    <div data-testid={`swatch-${label}`}>
      <span>{label}</span>
      <input data-testid={`swatch-input-${label}`} value={value} onChange={(e: any) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock("../components/theme/color-utils", () => ({
  hexToOklch: () => ({ L: 0.5, C: 0.2, h: 220 }),
  formatOklch: () => "oklch(0.50 0.20 220)",
  oklchToHex: () => "#00d4ff",
}));

vi.mock("../components/theme/theme-presets", () => ({
  THEME_PRESETS: [
    {
      id: "base",
      name: "赛博朋克",
      nameEn: "Cyberpunk",
      colors: {
        primary: "#00d4ff", primaryForeground: "#ffffff",
        secondary: "#1a2a40", secondaryForeground: "#c0dcf0",
        accent: "#7b2ff7", accentForeground: "#ffffff",
        background: "#060e1f", foreground: "#e0f0ff",
        card: "#0a1628", cardForeground: "#e0f0ff",
        popover: "#0a1628", popoverForeground: "#e0f0ff",
        muted: "#1a2a40", mutedForeground: "#8ab4d8",
        destructive: "#ff3366", destructiveForeground: "#ffffff",
        border: "#1a3050", input: "#1a3050", ring: "#00d4ff",
        chart1: "#00d4ff", chart2: "#00ff88", chart3: "#ff6600",
        chart4: "#aa55ff", chart5: "#ffdd00", chart6: "#ff3366",
        sidebar: "#040a16", sidebarForeground: "#c0dcf0",
        sidebarPrimary: "#00d4ff", sidebarPrimaryForeground: "#ffffff",
        sidebarAccent: "#1a2a40", sidebarAccentForeground: "#8ab4d8",
        sidebarBorder: "#1a3050", sidebarRing: "#00d4ff",
      },
    },
    {
      id: "nature",
      name: "自然绿",
      nameEn: "Nature Green",
      colors: {
        primary: "#22c55e", primaryForeground: "#ffffff",
        secondary: "#1a2a1f", secondaryForeground: "#c0f0d0",
        accent: "#10b981", accentForeground: "#ffffff",
        background: "#0a1f0e", foreground: "#e0ffe8",
        card: "#0f2a14", cardForeground: "#e0ffe8",
        popover: "#0f2a14", popoverForeground: "#e0ffe8",
        muted: "#1a3020", mutedForeground: "#8ad8a0",
        destructive: "#ef4444", destructiveForeground: "#ffffff",
        border: "#1a4030", input: "#1a4030", ring: "#22c55e",
        chart1: "#22c55e", chart2: "#10b981", chart3: "#059669",
        chart4: "#34d399", chart5: "#6ee7b7", chart6: "#a7f3d0",
        sidebar: "#081a0c", sidebarForeground: "#c0f0d0",
        sidebarPrimary: "#22c55e", sidebarPrimaryForeground: "#ffffff",
        sidebarAccent: "#1a3020", sidebarAccentForeground: "#8ad8a0",
        sidebarBorder: "#1a4030", sidebarRing: "#22c55e",
      },
    },
  ],
  DEFAULT_COLORS: {
    primary: "#00d4ff", primaryForeground: "#ffffff",
    secondary: "#1a2a40", secondaryForeground: "#c0dcf0",
    accent: "#7b2ff7", accentForeground: "#ffffff",
    background: "#060e1f", foreground: "#e0f0ff",
    card: "#0a1628", cardForeground: "#e0f0ff",
    popover: "#0a1628", popoverForeground: "#e0f0ff",
    muted: "#1a2a40", mutedForeground: "#8ab4d8",
    destructive: "#ff3366", destructiveForeground: "#ffffff",
    border: "#1a3050", input: "#1a3050", ring: "#00d4ff",
    chart1: "#00d4ff", chart2: "#00ff88", chart3: "#ff6600",
    chart4: "#aa55ff", chart5: "#ffdd00", chart6: "#ff3366",
    sidebar: "#040a16", sidebarForeground: "#c0dcf0",
    sidebarPrimary: "#00d4ff", sidebarPrimaryForeground: "#ffffff",
    sidebarAccent: "#1a2a40", sidebarAccentForeground: "#8ab4d8",
    sidebarBorder: "#1a3050", sidebarRing: "#00d4ff",
  },
  DEFAULT_TYPOGRAPHY: { sansSerif: "'Rajdhani', sans-serif", serif: "Georgia, serif", mono: "'JetBrains Mono', monospace" },
  DEFAULT_SHADOW: { offsetX: 0, offsetY: 4, blur: 12, spread: 0, color: "#0000000d" },
  DEFAULT_BRANDING: { systemName: "YYC³ CloudPivot Intelli-Matrix", tagline: "本地多端推理矩阵数据库", backgroundUrl: "" },
}));

// Mock Layout ViewContext
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false, isTablet: false, isDesktop: true, width: 1200, breakpoint: "lg", isTouch: false }),
}));

import { ThemeCustomizer } from "../components/ThemeCustomizer";
import { ViewContext } from "../lib/view-context";

describe("ThemeCustomizer", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Header", () => {
    it("应渲染标题", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("主题自定义")).toBeInTheDocument();
    });

    it("应渲染副标题", () => {
      render(<ThemeCustomizer />);
      // "OKLch" 同时出现于副标题与第 5 节手风琴标题 → getAllBy
      expect(screen.getAllByText(/OKLch/).length).toBeGreaterThan(0);
    });

    it("应渲染重置按钮", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("重置")).toBeInTheDocument();
    });

    it("应渲染保存按钮", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("保存主题")).toBeInTheDocument();
    });
  });

  describe("品牌设置 Section", () => {
    it("品牌设置默认展开", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("系统名称")).toBeInTheDocument();
    });

    it("应显示 YYC3 Logo", () => {
      render(<ThemeCustomizer />);
      expect(screen.getAllByTestId("yyc3-logo").length).toBeGreaterThan(0);
    });

    it("应渲染标语输入框", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("标语 (Tagline)")).toBeInTheDocument();
    });

    it("修改系统名称应更新输入值", () => {
      render(<ThemeCustomizer />);
      const inputs = screen.getAllByDisplayValue("YYC³ CloudPivot Intelli-Matrix");
      expect(inputs.length).toBeGreaterThan(0);
      fireEvent.change(inputs[0], { target: { value: "New Name" } });
      expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    });

    it("应渲染背景上传按钮", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("上传背景")).toBeInTheDocument();
    });
  });

  describe("颜色 Section", () => {
    it("颜色 section 默认展开", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByTestId("swatch-主色")).toBeInTheDocument();
    });

    it("应渲染多个颜色对", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByTestId("swatch-主色")).toBeInTheDocument();
      expect(screen.getByTestId("swatch-次色")).toBeInTheDocument();
      expect(screen.getByTestId("swatch-强调色")).toBeInTheDocument();
      expect(screen.getByTestId("swatch-背景色")).toBeInTheDocument();
      expect(screen.getByTestId("swatch-破坏性")).toBeInTheDocument();
    });
  });

  describe("Section 手风琴", () => {
    it("点击折叠的 section 应展开", () => {
      render(<ThemeCustomizer />);
      // "2. 环形区域" section is collapsed by default
      const sectionBtn = screen.getByText(/环形区域/);
      fireEvent.click(sectionBtn);
      expect(screen.getByTestId("swatch-环形 (Ring)")).toBeInTheDocument();
    });

    it("点击已展开的 section 应折叠", () => {
      render(<ThemeCustomizer />);
      // "1. 颜色" section is open by default
      const sectionBtn = screen.getByText(/颜色 · 语义化变量/);
      fireEvent.click(sectionBtn);
      // After folding, the swatch should disappear
      expect(screen.queryByTestId("swatch-主色")).not.toBeInTheDocument();
    });
  });

  describe("字体排版 Section", () => {
    it("点击展开后应渲染字体输入框", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/字体排版/));
      expect(screen.getByText("无衬线字体 (Sans-Serif)")).toBeInTheDocument();
      expect(screen.getByText("衬线字体 (Serif)")).toBeInTheDocument();
      expect(screen.getByText("等宽字体 (Monospace)")).toBeInTheDocument();
    });
  });

  describe("阴影/圆角 Section", () => {
    it("展开后应渲染圆角滑块", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/阴影 \/ 圆角/));
      expect(screen.getByText("圆角 (Radius)")).toBeInTheDocument();
      expect(screen.getByText("0.5rem")).toBeInTheDocument();
    });

    it("展开后应渲染阴影控制", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/阴影 \/ 圆角/));
      expect(screen.getByText("X 偏移量")).toBeInTheDocument();
      expect(screen.getByText("Y 偏移量")).toBeInTheDocument();
      expect(screen.getByText("模糊半径")).toBeInTheDocument();
    });
  });

  describe("亮度调节 Section", () => {
    it("展开后应渲染亮度百分比", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/OKLch · 亮度调节/));
      expect(screen.getByText(/亮度: 50%/)).toBeInTheDocument();
    });
  });

  describe("预设系统", () => {
    it("应显示当前预设名称", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText(/预设系统: 赛博朋克/)).toBeInTheDocument();
    });

    it("点击应打开预设下拉列表", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      // 下拉 + 预览面板中均渲染 "自然绿"，使用 getAllByText
      expect(screen.getAllByText("自然绿").length).toBeGreaterThanOrEqual(2);
    });

    it("选择预设应切换并关闭下拉", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      // 点击下拉列表中的 "自然绿"（取第一个匹配）
      const targets = screen.getAllByText("自然绿");
      fireEvent.click(targets[0]);
      expect(screen.getByText(/预设系统: 自然绿/)).toBeInTheDocument();
    });

    it("搜索应过滤预设列表", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      const searchInput = screen.getByPlaceholderText(/搜索设计系统/);
      fireEvent.change(searchInput, { target: { value: "green" } });
      // "自然绿" 在下拉 + 预览面板中均存在
      expect(screen.getAllByText("自然绿").length).toBeGreaterThanOrEqual(1);
      // 下拉列表内只剩 1 个预设按钮
      // 注意: 搜索输入框 class 含 absolute inset-0, 不能用 [class*='absolute'] 选下拉容器
      const dropdownContainer = screen.getByPlaceholderText(/搜索设计系统/).closest("[class*='relative']")!;
      const dropdown = dropdownContainer.querySelector("[class*='z-50']")!;
      const buttons = dropdown.querySelectorAll("button");
      expect(buttons.length).toBe(1);
    });

    it("无匹配时应显示空提示", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      const searchInput = screen.getByPlaceholderText(/搜索设计系统/);
      fireEvent.change(searchInput, { target: { value: "zzzzz" } });
      expect(screen.getByText("无匹配预设")).toBeInTheDocument();
    });
  });

  describe("实时预览", () => {
    it("应渲染实时预览区域", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("实时预览")).toBeInTheDocument();
    });

    it("应渲染预览中的操作按钮", () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText("主要操作")).toBeInTheDocument();
    });
  });

  describe("重置功能", () => {
    it("选择其他预设后重置应恢复默认", () => {
      render(<ThemeCustomizer />);
      // Select another preset
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      const targets = screen.getAllByText("自然绿");
      fireEvent.click(targets[0]);
      expect(screen.getByText(/预设系统: 自然绿/)).toBeInTheDocument();
      // Reset
      fireEvent.click(screen.getByText("重置"));
      expect(screen.getByText(/预设系统: 赛博朋克/)).toBeInTheDocument();
    });
  });

  describe("品牌设置交互", () => {
    it("修改标语应更新输入与预览", () => {
      render(<ThemeCustomizer />);
      fireEvent.change(screen.getByDisplayValue("本地多端推理矩阵数据库"), {
        target: { value: "新标语" },
      });
      expect(screen.getByDisplayValue("新标语")).toBeInTheDocument();
      // 预览区头部同步渲染标语
      expect(screen.getByText("新标语")).toBeInTheDocument();
    });

    it("选择文件后应显示背景预览并可移除", async () => {
      const { container } = render(<ThemeCustomizer />);
      // 点击上传按钮触发隐藏 file input 的 ref click
      fireEvent.click(screen.getByText("上传背景"));
      const fileInput = container.querySelector('input[type="file"]')!;
      expect(fileInput).toBeInTheDocument();
      const file = new File(["img-bytes"], "bg.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [file] } });
      // FileReader 异步回调后渲染预览图
      await waitFor(() => expect(screen.getByAltText("bg")).toBeInTheDocument());
      // 预览卡片同步应用背景图
      const previewCard = screen.getByAltText("bg");
      expect(previewCard).toBeInTheDocument();
      // 移除按钮 (与上传按钮同一行的第二个按钮)
      const rowButtons = screen.getByText("上传背景").closest("div")!.querySelectorAll("button");
      fireEvent.click(rowButtons[1]);
      expect(screen.queryByAltText("bg")).not.toBeInTheDocument();
    });

    it("未选择文件时应直接返回不渲染预览", () => {
      const { container } = render(<ThemeCustomizer />);
      const fileInput = container.querySelector('input[type="file"]')!;
      fireEvent.change(fileInput, { target: { files: [] } });
      expect(screen.queryByAltText("bg")).not.toBeInTheDocument();
    });
  });

  describe("颜色色板交互", () => {
    it("修改语义化变量色板应更新颜色状态", () => {
      render(<ThemeCustomizer />);
      const labels = [
        "主色", "主前景色", "次色", "次前景色", "强调色", "强调色前景",
        "背景色", "前景色", "卡片", "卡片前景色", "弹窗", "弹窗前景色",
        "柔和色", "柔和前景色", "破坏性", "破坏性前景色", "边框", "输入",
      ];
      for (const label of labels) {
        fireEvent.change(screen.getByTestId(`swatch-input-${label}`), {
          target: { value: "#102030" },
        });
      }
      expect(screen.getAllByDisplayValue("#102030").length).toBeGreaterThan(0);
    });

    it("修改环形/图表/侧边栏色板应更新颜色状态", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/环形区域/));
      const labels = [
        "环形 (Ring)", "图表 1", "图表 2", "图表 3", "图表 4", "图表 5", "图表 6",
        "侧边栏", "侧边栏前景色", "侧边栏主色", "侧边栏主前景色",
        "侧边栏强调色", "侧边栏强调色前景", "侧边栏边框", "侧边栏环形元素",
      ];
      for (const label of labels) {
        expect(screen.getByTestId(`swatch-${label}`)).toBeInTheDocument();
        fireEvent.change(screen.getByTestId(`swatch-input-${label}`), {
          target: { value: "#203040" },
        });
      }
      expect(screen.getAllByDisplayValue("#203040").length).toBeGreaterThan(0);
    });
  });

  describe("字体排版交互", () => {
    it("修改三种字体家族应更新预览", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/字体排版/));
      fireEvent.change(screen.getByDisplayValue("'Rajdhani', sans-serif"), {
        target: { value: "CyberFont" },
      });
      fireEvent.change(screen.getByDisplayValue("Georgia, serif"), {
        target: { value: "TimesNew" },
      });
      fireEvent.change(screen.getByDisplayValue("'JetBrains Mono', monospace"), {
        target: { value: "MonoX" },
      });
      expect(screen.getByText(/Sans-Serif: CyberFont/)).toBeInTheDocument();
      expect(screen.getByText(/Serif: TimesNew/)).toBeInTheDocument();
      expect(screen.getByText(/Mono: MonoX/)).toBeInTheDocument();
    });
  });

  describe("阴影/圆角交互", () => {
    it("调节圆角与阴影参数应更新预览", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/阴影 \/ 圆角/));
      const ranges = document.querySelectorAll('input[type="range"]');
      // 顺序: [圆角, X偏移, Y偏移, 模糊, 传播]
      expect(ranges.length).toBe(5);
      fireEvent.change(ranges[0], { target: { value: "1" } });
      expect(screen.getByText("1rem")).toBeInTheDocument();
      fireEvent.change(ranges[2], { target: { value: "20" } });
      expect(screen.getByText("20px")).toBeInTheDocument();
      // 阴影扩散色 swatch (onChange 追加透明度后缀)
      fireEvent.change(screen.getByTestId("swatch-input-扩散颜色"), {
        target: { value: "#112233" },
      });
      expect(screen.getByTestId("swatch-input-扩散颜色")).toHaveValue("#112233");
    });
  });

  describe("亮度调节交互", () => {
    it("拖动亮度滑块应更新百分比显示", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/OKLch · 亮度调节/));
      const range = document.querySelector('input[type="range"]')!;
      fireEvent.change(range, { target: { value: "80" } });
      expect(screen.getByText(/亮度: 80%/)).toBeInTheDocument();
    });
  });

  describe("预设快捷入口", () => {
    it("点击预览区预设圆点应切换预设", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByTitle("自然绿"));
      expect(screen.getByText(/预设系统: 自然绿/)).toBeInTheDocument();
    });

    it("点击底部预设卡片应切换预设", () => {
      render(<ThemeCustomizer />);
      // 下拉关闭时 "自然绿" 文案仅存在于底部预设卡片
      fireEvent.click(screen.getByText("自然绿"));
      expect(screen.getByText(/预设系统: 自然绿/)).toBeInTheDocument();
    });
  });

  describe("搜索下拉交互", () => {
    it("点击搜索输入框不应关闭下拉", () => {
      render(<ThemeCustomizer />);
      fireEvent.click(screen.getByText(/预设系统: 赛博朋克/));
      const searchInput = screen.getByPlaceholderText(/搜索设计系统/);
      fireEvent.click(searchInput);
      // stopPropagation 生效: 下拉仍打开 (搜索框仍渲染)
      expect(screen.getByPlaceholderText(/搜索设计系统/)).toBeInTheDocument();
      expect(screen.getAllByText("自然绿").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("移动端视口", () => {
    it("ViewContext 为空时应按移动端纵向布局渲染", () => {
      render(
        <ViewContext.Provider value={null as unknown as React.ContextType<typeof ViewContext>}>
          <ThemeCustomizer />
        </ViewContext.Provider>
      );
      expect(screen.getByText("主题自定义")).toBeInTheDocument();
    });
  });
});