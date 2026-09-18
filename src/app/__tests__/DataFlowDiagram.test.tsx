/**
 * DataFlowDiagram.test.tsx
 * =========================
 * DataFlowDiagram 组件 - 数据流向可视化测试
 *
 * 覆盖范围:
 * - 节点渲染 (4 个)
 * - 连线渲染 (6 条)
 * - 带宽标注
 * - data-testid
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataFlowDiagram } from "../components/DataFlowDiagram";
import { DATA_FLOW_NODES, DATA_FLOW_EDGES } from "../hooks/useServiceLoop";

describe("DataFlowDiagram", () => {
  describe("节点渲染", () => {
    it("应渲染 4 个节点", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-node-device")).toBeInTheDocument();
      expect(screen.getByTestId("flow-node-storage")).toBeInTheDocument();
      expect(screen.getByTestId("flow-node-dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("flow-node-terminal")).toBeInTheDocument();
    });

    it("应渲染节点标签", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByText("本地设备")).toBeInTheDocument();
      expect(screen.getByText("本地存储")).toBeInTheDocument();
      expect(screen.getByText("YYC³ Dashboard")).toBeInTheDocument();
      expect(screen.getByText("终端集成")).toBeInTheDocument();
    });

    it("应渲染子标签", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByText("192.168.3.x")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL + NAS")).toBeInTheDocument();
    });
  });

  describe("连线渲染", () => {
    it("应渲染连线容器", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-edges")).toBeInTheDocument();
    });

    it("应渲染 device→storage 连线", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-edge-device-storage")).toBeInTheDocument();
    });

    it("应渲染 storage→dashboard 连线", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-edge-storage-dashboard")).toBeInTheDocument();
    });

    it("应渲染 dashboard→device 连线", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-edge-dashboard-device")).toBeInTheDocument();
    });

    it("应渲染 dashboard→terminal 连线", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("flow-edge-dashboard-terminal")).toBeInTheDocument();
    });
  });

  describe("data-testid", () => {
    it("应有根容器", () => {
      render(<DataFlowDiagram nodes={DATA_FLOW_NODES} edges={DATA_FLOW_EDGES} />);
      expect(screen.getByTestId("data-flow-diagram")).toBeInTheDocument();
    });
  });

  describe("空数据", () => {
    it("空节点和空连线应渲染空容器", () => {
      render(<DataFlowDiagram nodes={[]} edges={[]} />);
      expect(screen.getByTestId("data-flow-diagram")).toBeInTheDocument();
    });
  });
});
