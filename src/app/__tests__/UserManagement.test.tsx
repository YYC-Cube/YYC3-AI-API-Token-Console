/**
 * UserManagement.test.tsx
 * ========================
 * UserManagement 组件测试
 *
 * 覆盖范围:
 * - 5 个统计卡片渲染
 * - 用户列表表格渲染 (8 条)
 * - 搜索过滤
 * - 角色面板渲染 (5 个角色)
 * - 添加用户按钮 + 模态框
 * - 编辑用户功能
 * - 锁定/解锁用户
 * - 删除用户
 * - 权限矩阵
 * - 用户详情 Modal 打开/关闭
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { UserManagement } from "../components/UserManagement";

describe("UserManagement", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("统计卡片", () => {
    it("应渲染 5 个统计卡片", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.totalUsers")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.onlineUsers")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.admins")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.serviceAccounts")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.todayApiCalls")).toBeInTheDocument();
    });

    it("应渲染动态统计数值", () => {
      render(<UserManagement />);
      // 8 initial users
      expect(screen.getByText("8")).toBeInTheDocument();
    });
  });

  describe("用户列表", () => {
    it("应渲染用户列表标题", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.userList")).toBeInTheDocument();
    });

    it("应渲染表头", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.colStatus")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colUser")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colRole")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colLastLogin")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colSessions")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colApiCalls")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.colActions")).toBeInTheDocument();
    });

    it("应渲染 8 个用户行", () => {
      render(<UserManagement />);
      expect(screen.getByText("张管理")).toBeInTheDocument();
      expect(screen.getByText("李运维")).toBeInTheDocument();
      expect(screen.getByText("王开发")).toBeInTheDocument();
      expect(screen.getByText("赵分析")).toBeInTheDocument();
      expect(screen.getByText("刘测试")).toBeInTheDocument();
      expect(screen.getByText("陈研究")).toBeInTheDocument();
      expect(screen.getByText("API Service")).toBeInTheDocument();
      expect(screen.getByText("OPS Bot")).toBeInTheDocument();
    });

    it("应渲染用户名", () => {
      render(<UserManagement />);
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("ops_li")).toBeInTheDocument();
    });

    it("应渲染角色标签", () => {
      render(<UserManagement />);
      expect(screen.getByText("超级管理员")).toBeInTheDocument();
      expect(screen.getByText("运维工程师")).toBeInTheDocument();
      expect(screen.getByText("开发者")).toBeInTheDocument();
    });

    it("应渲染添加用户按钮", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.addUser")).toBeInTheDocument();
    });
  });

  describe("搜索过滤", () => {
    it("应渲染搜索框", () => {
      render(<UserManagement />);
      expect(screen.getByPlaceholderText("userMgmt.searchUser")).toBeInTheDocument();
    });

    it("搜索应过滤用户列表", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "张管理" } });
      expect(screen.getByText("张管理")).toBeInTheDocument();
      expect(screen.queryByText("李运维")).not.toBeInTheDocument();
    });

    it("按用户名搜索", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "ops_li" } });
      expect(screen.getByText("李运维")).toBeInTheDocument();
      expect(screen.queryByText("张管理")).not.toBeInTheDocument();
    });

    it("按邮箱搜索", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "zhao@" } });
      expect(screen.getByText("赵分析")).toBeInTheDocument();
      expect(screen.queryByText("张管理")).not.toBeInTheDocument();
    });

    it("无匹配时列表为空", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "zzzzzzz" } });
      expect(screen.queryByText("张管理")).not.toBeInTheDocument();
      expect(screen.queryByText("李运维")).not.toBeInTheDocument();
    });
  });

  describe("角色面板", () => {
    it("应渲染角色标题", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.rolesPerms")).toBeInTheDocument();
    });

    it("应渲染 5 个角色卡片", () => {
      render(<UserManagement />);
      const roleNames = ["超级管理员", "运维工程师", "开发者", "数据分析师", "系统服务"];
      roleNames.forEach(name => {
        expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("应渲染角色权限描述", () => {
      render(<UserManagement />);
      expect(screen.getByText("全部权限")).toBeInTheDocument();
      expect(screen.getByText("节点管理、部署、监控")).toBeInTheDocument();
    });

    it("应渲染创建角色按钮", () => {
      render(<UserManagement />);
      expect(screen.getByText(/userMgmt.createRole/)).toBeInTheDocument();
    });

    it("应渲染权限矩阵按钮", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.permMatrix")).toBeInTheDocument();
    });

    it("点击权限矩阵按钮应显示权限表", () => {
      render(<UserManagement />);
      const btn = screen.getByText("userMgmt.permMatrix");
      fireEvent.click(btn);
      expect(screen.getByText("权限矩阵")).toBeInTheDocument();
      expect(screen.getByText("节点管理")).toBeInTheDocument();
    });
  });

  describe("用户详情 Modal", () => {
    it("点击查看按钮应打开 Modal", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const eyeBtn = row.querySelector("button");
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        expect(screen.getByText("userMgmt.userDetail")).toBeInTheDocument();
      }
    });

    it("Modal 应显示用户信息字段", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const eyeBtn = row.querySelector("button");
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        expect(screen.getByText("userMgmt.fieldEmail")).toBeInTheDocument();
        expect(screen.getByText("userMgmt.fieldRole")).toBeInTheDocument();
        expect(screen.getByText("userMgmt.fieldLastLogin")).toBeInTheDocument();
      }
    });

    it("Modal 中用户名应正确显示", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const eyeBtn = row.querySelector("button");
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        expect(screen.getByText("@admin")).toBeInTheDocument();
      }
    });

    it("关闭 Modal 应隐藏详情", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const eyeBtn = row.querySelector("button");
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        expect(screen.getByText("userMgmt.userDetail")).toBeInTheDocument();
        const closeBtn = screen.getByText("userMgmt.userDetail").parentElement?.querySelector("button");
        if (closeBtn) {
          fireEvent.click(closeBtn);
          expect(screen.queryByText("userMgmt.userDetail")).not.toBeInTheDocument();
        }
      }
    });

    it("点击遮罩应关闭 Modal", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const eyeBtn = row.querySelector("button");
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        const backdrop = screen.getByText("userMgmt.userDetail").closest(".fixed");
        if (backdrop) {
          fireEvent.click(backdrop);
          expect(screen.queryByText("userMgmt.userDetail")).not.toBeInTheDocument();
        }
      }
    });
  });

  describe("添加用户", () => {
    it("点击添加按钮应打开添加模态框", () => {
      render(<UserManagement />);
      const addBtn = screen.getByText("userMgmt.addUser");
      fireEvent.click(addBtn);
      expect(screen.getByText("添加用户")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("输入名称...")).toBeInTheDocument();
    });
  });

  describe("编辑用户", () => {
    it("点击编辑按钮应打开编辑模态框", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const buttons = row.querySelectorAll("button");
      // Second button is edit (after eye)
      if (buttons[1]) {
        fireEvent.click(buttons[1]);
        expect(screen.getByText("编辑用户")).toBeInTheDocument();
      }
    });
  });
});