/**
 * NodeDetailModal.test.tsx
 * =========================
 * NodeDetailModal 组件 - 渲染 + 交互测试
 *
 * 覆盖范围:
 * - 节点信息展示 (ID/状态/指标/模型)
 * - 状态标签映射 (active/warning/inactive)
 * - 关闭按钮 + 遮罩层关闭
 * - 操作按钮: 查看日志 (展开/收起日志面板)
 * - 操作按钮: 重启节点 (二次确认 → 确认/取消)
 * - 操作按钮: 移除节点 (二次确认 → 确认/取消 → onClose 调用)
 * - Recharts 图表渲染
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NodeDetailModal } from "../components/NodeDetailModal";
import type { NodeData } from "../types";

// Mock recharts (jsdom 不支持 SVG 渲染)
vi.mock("recharts", () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockActiveNode: NodeData = {
  id: "GPU-A100-01",
  status: "active",
  gpu: 87,
  mem: 72,
  temp: 68,
  model: "LLaMA-70B",
  tasks: 128,
};

const mockWarningNode: NodeData = {
  id: "GPU-A100-03",
  status: "warning",
  gpu: 98,
  mem: 94,
  temp: 82,
  model: "DeepSeek-V3",
  tasks: 89,
};

const mockInactiveNode: NodeData = {
  id: "GPU-H100-03",
  status: "inactive",
  gpu: 0,
  mem: 12,
  temp: 32,
  model: "-",
  tasks: 0,
};

describe("NodeDetailModal", () => {
  let mockOnClose: Mock;
  let mockOnNodeRemoved: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose = vi.fn();
    mockOnNodeRemoved = vi.fn();
  });

  // ----------------------------------------------------------
  // 节点信息渲染
  // ----------------------------------------------------------

  describe("节点信息渲染", () => {
    it("应显示节点 ID", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("GPU-A100-01")).toBeInTheDocument();
    });

    it("active 节点应显示'运行中'标签", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("运行中")).toBeInTheDocument();
    });

    it("warning 节点应显示'预警'标签", () => {
      render(<NodeDetailModal node={mockWarningNode} onClose={mockOnClose} />);
      expect(screen.getByText("预警")).toBeInTheDocument();
    });

    it("inactive 节点应显示'离线'标签", () => {
      render(<NodeDetailModal node={mockInactiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("离线")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 指标显示
  // ----------------------------------------------------------

  describe("指标显示", () => {
    it("应显示 GPU 负载", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("87%")).toBeInTheDocument();
      expect(screen.getByText("GPU 负载")).toBeInTheDocument();
    });

    it("应显示内存使用", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("72%")).toBeInTheDocument();
      expect(screen.getByText("内存使用")).toBeInTheDocument();
    });

    it("应显示温度", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("68°C")).toBeInTheDocument();
      expect(screen.getByText("温度")).toBeInTheDocument();
    });

    it("应显示任务数", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("128")).toBeInTheDocument();
      expect(screen.getByText("任务数")).toBeInTheDocument();
    });

    it("应显示当前部署的模型", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("LLaMA-70B")).toBeInTheDocument();
      expect(screen.getByText("当前模型")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 图表
  // ----------------------------------------------------------

  describe("图表渲染", () => {
    it("应渲染历史负载趋势标题", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByText("历史负载趋势")).toBeInTheDocument();
    });

    it("应渲染 LineChart 组件", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 操作按钮渲染
  // ----------------------------------------------------------

  describe("操作按钮渲染", () => {
    it("应包含查看日志按钮", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByTestId("view-logs-btn")).toBeInTheDocument();
      expect(screen.getByText("查看日志")).toBeInTheDocument();
    });

    it("应包含重启节点按钮", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByTestId("restart-node-btn")).toBeInTheDocument();
      expect(screen.getByText("重启节点")).toBeInTheDocument();
    });

    it("应包含移除节点按钮", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.getByTestId("remove-node-btn")).toBeInTheDocument();
      expect(screen.getByText("移除节点")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 查看日志交互
  // ----------------------------------------------------------

  describe("查看日志交互", () => {
    it("点击查看日志应展开日志面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      expect(screen.queryByTestId("log-panel")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.getByTestId("log-panel")).toBeInTheDocument();
    });

    it("日志面板应显示节点 ID", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId("view-logs-btn"));

      expect(screen.getByText(/节点日志.*GPU-A100-01/)).toBeInTheDocument();
    });

    it("日志面板应包含模拟日志条目", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId("view-logs-btn"));

      // 应至少包含一条日志
      expect(screen.getByText(/推理任务.*#12847.*完成/)).toBeInTheDocument();
    });

    it("再次点击查看日志应收起日志面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.getByTestId("log-panel")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.queryByTestId("log-panel")).not.toBeInTheDocument();
    });

    it("展开日志时应关闭重启确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      // 先触发重启确认
      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();

      // 点击查看日志
      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.getByTestId("log-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 重启节点交互 (二次确认)
  // ----------------------------------------------------------

  describe("重启节点交互", () => {
    it("点击重启节点应显示确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();
    });

    it("确认面板应显示节点 ID 和任务数", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId("restart-node-btn"));

      expect(screen.getByText(/确认重启节点.*GPU-A100-01/)).toBeInTheDocument();
      expect(screen.getByText(/128.*个推理任务/)).toBeInTheDocument();
    });

    it("点击取消应关闭确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("restart-cancel-btn"));
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
    });

    it("点击确认重启应触发 toast 并关闭确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("restart-node-btn"));
      fireEvent.click(screen.getByTestId("restart-confirm-btn"));

      expect(mockToastSuccess).toHaveBeenCalledWith(
        "节点 GPU-A100-01 重启指令已发送",
        expect.objectContaining({ description: expect.any(String) })
      );
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
    });

    it("确认重启后应显示'重启中...'状态", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("restart-node-btn"));
      fireEvent.click(screen.getByTestId("restart-confirm-btn"));

      expect(screen.getByText("重启中...")).toBeInTheDocument();
    });

    it("重启中按钮应被禁用", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("restart-node-btn"));
      fireEvent.click(screen.getByTestId("restart-confirm-btn"));

      const restartBtn = screen.getByTestId("restart-node-btn");
      expect(restartBtn).toBeDisabled();
    });

    it("重启应关闭日志面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      // 先打开日志
      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.getByTestId("log-panel")).toBeInTheDocument();

      // 再点击重启
      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.queryByTestId("log-panel")).not.toBeInTheDocument();
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 移除节点交互 (二次确认)
  // ----------------------------------------------------------

  describe("移除节点交互", () => {
    it("点击移除节点应显示确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("remove-node-btn"));
      expect(screen.getByTestId("remove-confirm")).toBeInTheDocument();
    });

    it("确认面板应显示节点 ID", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId("remove-node-btn"));

      expect(screen.getByText(/确认移除节点.*GPU-A100-01/)).toBeInTheDocument();
    });

    it("确认面板应提示不可逆", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId("remove-node-btn"));

      expect(screen.getByText(/不可逆/)).toBeInTheDocument();
    });

    it("点击取消应关闭确认面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("remove-node-btn"));
      expect(screen.getByTestId("remove-confirm")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("remove-cancel-btn"));
      expect(screen.queryByTestId("remove-confirm")).not.toBeInTheDocument();
    });

    it("确认移除应触发 toast + onClose", () => {
      render(
        <NodeDetailModal
          node={mockActiveNode}
          onClose={mockOnClose}
          onNodeRemoved={mockOnNodeRemoved}
        />
      );

      fireEvent.click(screen.getByTestId("remove-node-btn"));
      fireEvent.click(screen.getByTestId("remove-confirm-btn"));

      expect(mockToastSuccess).toHaveBeenCalledWith(
        "节点 GPU-A100-01 已从集群移除",
        expect.objectContaining({ description: expect.any(String) })
      );
      expect(mockOnNodeRemoved).toHaveBeenCalledWith("GPU-A100-01");
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("确认移除无 onNodeRemoved 回调也不应报错", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId("remove-node-btn"));
      fireEvent.click(screen.getByTestId("remove-confirm-btn"));

      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("移除确认应关闭重启确认", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      // 先触发重启确认
      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();

      // 再触发移除确认
      fireEvent.click(screen.getByTestId("remove-node-btn"));
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
      expect(screen.getByTestId("remove-confirm")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 互斥状态测试
  // ----------------------------------------------------------

  describe("操作面板互斥", () => {
    it("同时只能展示一个操作面板", () => {
      render(<NodeDetailModal node={mockActiveNode} onClose={mockOnClose} />);

      // 打开日志
      fireEvent.click(screen.getByTestId("view-logs-btn"));
      expect(screen.getByTestId("log-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
      expect(screen.queryByTestId("remove-confirm")).not.toBeInTheDocument();

      // 切换到重启确认
      fireEvent.click(screen.getByTestId("restart-node-btn"));
      expect(screen.queryByTestId("log-panel")).not.toBeInTheDocument();
      expect(screen.getByTestId("restart-confirm")).toBeInTheDocument();
      expect(screen.queryByTestId("remove-confirm")).not.toBeInTheDocument();

      // 切换到移除确认
      fireEvent.click(screen.getByTestId("remove-node-btn"));
      expect(screen.queryByTestId("log-panel")).not.toBeInTheDocument();
      expect(screen.queryByTestId("restart-confirm")).not.toBeInTheDocument();
      expect(screen.getByTestId("remove-confirm")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 关闭交互
  // ----------------------------------------------------------

  describe("关闭交互", () => {
    it("点击遮罩层应触发关闭", () => {
      const handleClose = vi.fn();
      const { container } = render(
        <NodeDetailModal node={mockActiveNode} onClose={handleClose} />
      );
      // 点击最外层容器（遮罩层）
      fireEvent.click(container.firstElementChild!);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("点击弹窗内容不应触发关闭（事件阻止冒泡）", () => {
      const handleClose = vi.fn();
      render(
        <NodeDetailModal node={mockActiveNode} onClose={handleClose} />
      );
      // 点击弹窗内部内容
      fireEvent.click(screen.getByText("GPU-A100-01"));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});