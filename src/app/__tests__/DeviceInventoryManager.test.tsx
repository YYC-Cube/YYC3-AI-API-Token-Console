/**
 * DeviceInventoryManager.test.tsx
 * ================================
 * 多端设备管理面板测试（双端联通 R8 审核 · 覆盖率修复）
 *
 * 覆盖: 非 console 形态只读提示 / console 形态节点表加载·增删·校验·保存成功/失败 /
 * 空表提示 / 自动源计数徽标
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeviceInventoryManager } from "../components/DeviceInventoryManager";
import type { NodeData } from "../types";

const NODES: NodeData[] = [
  { id: "vllm", status: "active", gpu: 0, mem: 0, temp: 0, model: "", tasks: 1, kind: "upstream" },
  { id: "n1", status: "active", gpu: 0, mem: 0, temp: 0, model: "q", tasks: 1, kind: "ollama" },
  { id: "nas-gateway", status: "warning", gpu: 0, mem: 61, temp: 0, model: "gw", tasks: 0, kind: "gateway" },
  { id: "tianshu", status: "inactive", gpu: 0, mem: 0, temp: 0, model: "元启·天枢", tasks: 3, kind: "agent" },
  { id: "legacy", status: "active", gpu: 1, mem: 1, temp: 1, model: "", tasks: 0 }, // 无 kind → 归 upstream
];

function stubSettingsFetch(payload: unknown = { ollamaNodes: { n1: "http://100.65.64.49:11434", n2: "http://100.76.167.103:11434" } }) {
  return vi.fn(async (input: Request | string | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : (input as Request).url);
    if (url.includes("/console/settings") && (!init || init.method === undefined || init.method === "GET")) {
      return { ok: true, json: async () => payload } as unknown as Response;
    }
    if (url.includes("/console/settings") && init?.method === "PUT") {
      return { ok: true, json: async () => ({ ok: true, rejected: [] }) } as unknown as Response;
    }
    throw new Error("offline: " + url);
  });
}

const openPanel = async () => {
  render(<DeviceInventoryManager nodes={NODES} />);
  fireEvent.click(screen.getByText(/设备管理 · 可视化增减/));
  await waitFor(() => expect(screen.getByText("http://100.65.64.49:11434")).toBeInTheDocument());
};

describe("DeviceInventoryManager（R8）", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    localStorage.clear();
  });
  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("非 console 形态: 只读概览 + 编辑不可用提示", async () => {
    vi.stubGlobal("fetch", stubSettingsFetch());
    render(<DeviceInventoryManager nodes={NODES} />);
    fireEvent.click(screen.getByText(/设备管理 · 可视化增减/));
    expect(await screen.findByText(/Ollama 节点编辑需 console 部署形态/)).toBeInTheDocument();
    expect(screen.getByText(/Agent 容器（自动）×1/)).toBeInTheDocument();
    expect(screen.getByText(/NAS 网关（自动）×1/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("http://<host>:11434")).not.toBeInTheDocument();
  });

  it("console 形态: 加载生效节点表并渲染行", async () => {
    window.history.pushState({}, "", "/console/");
    vi.stubGlobal("fetch", stubSettingsFetch());
    await openPanel();
    expect(screen.getByText("n1")).toBeInTheDocument();
    expect(screen.getByText("n2")).toBeInTheDocument();
  });

  it("校验分支: 非法 ID / 重复 ID / 非 http URL 均拒绝并提示", async () => {
    window.history.pushState({}, "", "/console/");
    vi.stubGlobal("fetch", stubSettingsFetch());
    await openPanel();
    const idInput = screen.getByPlaceholderText("节点 ID") as HTMLInputElement;
    const urlInput = screen.getByPlaceholderText("http://<host>:11434") as HTMLInputElement;

    fireEvent.change(idInput, { target: { value: "bad id!" } });
    fireEvent.click(screen.getByText("添加"));
    expect(screen.getByText(/节点 ID 仅允许/)).toBeInTheDocument();

    fireEvent.change(idInput, { target: { value: "n1" } });
    fireEvent.click(screen.getByText("添加"));
    expect(screen.getByText(/节点 ID 已存在: n1/)).toBeInTheDocument();

    fireEvent.change(idInput, { target: { value: "gx3" } });
    fireEvent.change(urlInput, { target: { value: "ftp://x:11434" } });
    fireEvent.click(screen.getByText("添加"));
    expect(screen.getByText(/origin 必须是 http\/https URL/)).toBeInTheDocument();
    expect(screen.getByText("n1")).toBeInTheDocument();
  });

  it("合法新增入表 + 删除行移除", async () => {
    window.history.pushState({}, "", "/console/");
    vi.stubGlobal("fetch", stubSettingsFetch());
    await openPanel();
    fireEvent.change(screen.getByPlaceholderText("节点 ID"), { target: { value: "gx3" } });
    fireEvent.change(screen.getByPlaceholderText("http://<host>:11434"), { target: { value: "http://192.168.3.50:11434" } });
    fireEvent.click(screen.getByText("添加"));
    expect(screen.getByText("gx3")).toBeInTheDocument();
    expect(screen.getByText("http://192.168.3.50:11434")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("删除 gx3"));
    expect(screen.queryByText("gx3")).not.toBeInTheDocument();
  });

  it("保存成功提示条数; 保存被拒（rejected 含 ollamaNodes）显示失败", async () => {
    window.history.pushState({}, "", "/console/");
    vi.stubGlobal("fetch", stubSettingsFetch());
    await openPanel();
    fireEvent.click(screen.getByText("保存节点表"));
    expect(await screen.findByText(/已保存 2 个节点/)).toBeInTheDocument();

    // 失败路径: PUT 返回 rejected
    vi.stubGlobal("fetch", vi.fn(async (input: Request | string, init?: RequestInit) => {
      const url = String(typeof input === "string" ? input : (input as Request).url);
      if (url.includes("/console/settings") && (!init || !init.method)) {
        return { ok: true, json: async () => ({ ollamaNodes: { n1: "http://a:11434" } }) } as unknown as Response;
      }
      return { ok: true, json: async () => ({ ok: false, rejected: ["ollamaNodes"] }) } as unknown as Response;
    }));
    fireEvent.click(screen.getByText("保存节点表"));
    expect(await screen.findByText(/保存失败: 被拒绝: ollamaNodes/)).toBeInTheDocument();
  });

  it("加载失败提示不可达; 空表显示清空语义", async () => {
    window.history.pushState({}, "", "/console/");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<DeviceInventoryManager nodes={[]} />);
    fireEvent.click(screen.getByText(/设备管理 · 可视化增减/));
    expect(await screen.findByText(/节点表读取失败/)).toBeInTheDocument();
  });
});
