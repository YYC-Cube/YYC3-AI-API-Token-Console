/**
 * Login.test.tsx
 * ===============
 * Login 组件 - 渲染与交互测试
 *
 * 覆盖范围:
 * - 表单元素渲染
 * - 邮箱/密码输入
 * - 登录成功/失败流程
 * - 密码显示/隐藏切换
 * - 错误信息展示
 * - 加载状态
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Login } from "../components/Login";

// console 公网形态开关 (镜像 supabase-console-auth.test.ts 的既有模式)
const consoleModeState = vi.hoisted(() => ({ enabled: false }));
vi.mock("../lib/ollama-url", () => ({
  isConsoleDeployment: () => consoleModeState.enabled,
}));

// Mock supabaseClient
vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

import { supabase } from "../lib/supabaseClient";

const mockSignIn = supabase.auth.signInWithPassword as Mock;

describe("Login", () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    consoleModeState.enabled = false;
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染登录表单", () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      // 品牌标题已迭代为 "YYC³ CP-IM" (源码为准)
      expect(screen.getByText("YYC³ CP-IM")).toBeInTheDocument();
      expect(screen.getByText("登录邮箱")).toBeInTheDocument();
      expect(screen.getByText("密码")).toBeInTheDocument();
      expect(screen.getByText("登 录")).toBeInTheDocument();
    });

    it("应渲染 Demo 账号提示", () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      expect(
        screen.getByText(/admin@cloudpivot\.local.*admin123/)
      ).toBeInTheDocument();
    });

    it("应包含邮箱和密码输入框", () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@cloudpivot.local");
      const pwdInput = screen.getByPlaceholderText("输入密码");

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
      expect(pwdInput).toBeInTheDocument();
      expect(pwdInput).toHaveAttribute("type", "password");
    });

    it("应显示品牌标语", () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      // 品牌标语已迭代为 "CloudPivot Intelli-Matrix · 数据看盘" (源码为准)
      expect(
        screen.getByText(/CloudPivot Intelli-Matrix/)
      ).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 密码显示切换
  // ----------------------------------------------------------

  describe("密码显隐切换", () => {
    it("点击眼睛按钮应切换密码可见性", async () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const pwdInput = screen.getByPlaceholderText("输入密码");
      expect(pwdInput).toHaveAttribute("type", "password");

      // 找到切换按钮 (眼睛图标的 button)
      const toggleBtns = screen.getAllByRole("button");
      const eyeBtn = toggleBtns.find(
        (btn) => btn.getAttribute("type") === "button"
      );
      expect(eyeBtn).toBeDefined();

      fireEvent.click(eyeBtn!);
      expect(pwdInput).toHaveAttribute("type", "text");

      fireEvent.click(eyeBtn!);
      expect(pwdInput).toHaveAttribute("type", "password");
    });
  });

  // ----------------------------------------------------------
  // 登录成功
  // ----------------------------------------------------------

  describe("登录成功", () => {
    it("正确凭据应调用 onLoginSuccess", async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { email: "admin@cloudpivot.local", role: "admin" } },
        error: null,
      });

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@cloudpivot.local");
      const pwdInput = screen.getByPlaceholderText("输入密码");

      await userEvent.type(emailInput, "admin@cloudpivot.local");
      await userEvent.type(pwdInput, "admin123");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);

      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ----------------------------------------------------------
  // 登录失败
  // ----------------------------------------------------------

  describe("登录失败", () => {
    it("错误密码应显示错误信息", async () => {
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: "邮箱或密码不正确" },
      });

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@cloudpivot.local");
      const pwdInput = screen.getByPlaceholderText("输入密码");

      await userEvent.type(emailInput, "admin@cloudpivot.local");
      await userEvent.type(pwdInput, "wrongpassword");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("邮箱或密码不正确")).toBeInTheDocument();
      });

      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });

    it("网络异常应显示网络错误信息", async () => {
      mockSignIn.mockRejectedValue(new Error("Network failure"));

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@cloudpivot.local");
      const pwdInput = screen.getByPlaceholderText("输入密码");

      await userEvent.type(emailInput, "admin@cloudpivot.local");
      await userEvent.type(pwdInput, "admin123");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("登录失败，请检查网络连接")
        ).toBeInTheDocument();
      });
    });
  });

  // ----------------------------------------------------------
  // 加载状态
  // ----------------------------------------------------------

  describe("加载状态", () => {
    it("提交后按钮应显示加载状态", async () => {
      // 永不 resolve，保持加载
      mockSignIn.mockReturnValue(new Promise(() => { }));

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@cloudpivot.local");
      const pwdInput = screen.getByPlaceholderText("输入密码");

      await userEvent.type(emailInput, "admin@cloudpivot.local");
      await userEvent.type(pwdInput, "admin123");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("验证中...")).toBeInTheDocument();
      });
    });
  });

  // ----------------------------------------------------------
  // 登录结果边界: data 为 null
  // ----------------------------------------------------------

  describe("登录结果边界", () => {
    it("signInWithPassword 返回 data 为 null 时不触发成功回调并复位 loading", async () => {
      mockSignIn.mockResolvedValue({ data: null, error: null });

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      await userEvent.type(
        screen.getByPlaceholderText("admin@cloudpivot.local"),
        "admin@cloudpivot.local"
      );
      await userEvent.type(screen.getByPlaceholderText("输入密码"), "admin123");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);
      expect(screen.getByText("验证中...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("登 录")).toBeInTheDocument();
      });
      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // console 公网形态 (isConsoleDeployment = true)
  // ----------------------------------------------------------

  describe("console 公网形态", () => {
    it("应隐藏邮箱输入与 Demo 提示, 显示服务端鉴权提示", () => {
      consoleModeState.enabled = true;
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      expect(screen.queryByPlaceholderText("admin@cloudpivot.local")).not.toBeInTheDocument();
      expect(screen.queryByText("登录邮箱")).not.toBeInTheDocument();
      expect(screen.queryByText(/Demo 账号/)).not.toBeInTheDocument();
      expect(screen.getByText("受服务端鉴权保护 · HttpOnly Cookie 会话")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("输入密码")).toBeInTheDocument();
    });

    it("密码直登: 仅提交密码 (email 为空串)", async () => {
      consoleModeState.enabled = true;
      mockSignIn.mockResolvedValue({
        data: { session: { user: { id: "console-admin" } } },
        error: null,
      });

      render(<Login onLoginSuccess={mockOnLoginSuccess} />);

      await userEvent.type(screen.getByPlaceholderText("输入密码"), "pw-123");
      fireEvent.submit(screen.getByText("登 录").closest("form")!);

      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockSignIn).toHaveBeenCalledWith({ email: "", password: "pw-123" });
    });
  });

  // ----------------------------------------------------------
  // Ghost 模式登录
  // ----------------------------------------------------------

  describe("Ghost 模式登录", () => {
    it("未传 onGhostLogin 时不渲染 Ghost 按钮", () => {
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      expect(
        screen.queryByRole("button", { name: /GHOST MODE/ })
      ).not.toBeInTheDocument();
    });

    it("悬停应切换 hover 态 (扫描线显隐)", () => {
      render(
        <Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={vi.fn()} />
      );
      const ghostBtn = screen.getByRole("button", { name: /GHOST MODE/ });
      const scanLine = () =>
        ghostBtn.querySelector("div.absolute.inset-0.pointer-events-none");

      expect(scanLine()).toBeNull();
      fireEvent.mouseEnter(ghostBtn);
      expect(scanLine()).not.toBeNull();
      fireEvent.mouseLeave(ghostBtn);
      expect(scanLine()).toBeNull();
    });

    it("点击应激活 Ghost 模式: 遮罩显隐、防重复触发、600ms 后回调", async () => {
      vi.useFakeTimers();
      try {
        const onGhostLogin = vi.fn();
        render(
          <Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={onGhostLogin} />
        );
        const ghostBtn = screen.getByRole("button", { name: /GHOST MODE/ });

        fireEvent.click(ghostBtn);
        // 激活遮罩出现 (遮罩文案 + 按钮文案均含 "GHOST MODE")
        expect(screen.getAllByText("GHOST MODE").length).toBeGreaterThanOrEqual(2);
        expect(ghostBtn).toBeDisabled();

        // 激活期间点击应被 ghostActivating guard 拦截。
        // 注: React 对 disabled button 抑制 onClick 派发, 故经 __reactProps
        // 直接调用当前 handler 以触达 guard 分支 (等价于浏览器禁用前的连续点击)
        const propsKey = Object.keys(ghostBtn).find((k) =>
          k.startsWith("__reactProps")
        );
        expect(propsKey).toBeDefined();
        const btnProps = (
          ghostBtn as unknown as Record<
            string,
            { onClick?: (e: unknown) => void }
          >
        )[propsKey!];
        btnProps?.onClick?.({ preventDefault: () => {} });
        expect(onGhostLogin).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(599);
        });
        expect(onGhostLogin).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(onGhostLogin).toHaveBeenCalledTimes(1);
        // ghostActivating 不复位, 按钮保持禁用
        expect(ghostBtn).toBeDisabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("Ghost 登录应清除已有错误信息", async () => {
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: "邮箱或密码不正确" },
      });

      render(
        <Login onLoginSuccess={mockOnLoginSuccess} onGhostLogin={vi.fn()} />
      );

      await userEvent.type(
        screen.getByPlaceholderText("admin@cloudpivot.local"),
        "admin@cloudpivot.local"
      );
      await userEvent.type(screen.getByPlaceholderText("输入密码"), "bad");

      fireEvent.submit(screen.getByText("登 录").closest("form")!);
      await waitFor(() => {
        expect(screen.getByText("邮箱或密码不正确")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /GHOST MODE/ }));
      expect(screen.queryByText("邮箱或密码不正确")).not.toBeInTheDocument();
    });
  });
});
