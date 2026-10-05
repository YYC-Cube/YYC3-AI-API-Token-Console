/**
 * ModelManagementSection.test.tsx
 * ================================
 * settings/ModelManagementSection.tsx — 模型管理分区
 *
 * 覆盖范围:
 * - 默认模型列表渲染 (状态标签 / 版本·大小·GPU)
 * - KV-Cache Toggle
 * - 添加模型 (表单默认值 / 空名称校验 / 创建成功)
 * - 编辑模型 (确认交互 / 取消 / 表单预填 / 保存)
 * - 删除模型 (确认 / 取消)
 * - 重置模型列表
 * - 空列表占位
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// 可控内存 store 替代 localStorage 版 deployedModelStore (自包含, 不依赖执行顺序)
vi.mock("../stores/dashboard-stores", async () => {
  const { vi } = await import("vitest");
  const defaults = [
    { id: "dm-1", name: "LLaMA-70B", version: "v1.2", size: "140GB", status: "deployed", gpu: "GPU-A100-01" },
    { id: "dm-2", name: "Qwen-72B", version: "v2.0", size: "145GB", status: "standby", gpu: "-" },
  ];
  let data: Array<Record<string, unknown>> = [];
  const store = {
    getAll: vi.fn(() => data),
    getById: vi.fn((id: string) => data.find((m) => m.id === id)),
    add: vi.fn((item: Record<string, unknown>) => {
      const m = { id: `dm-new-${data.length + 1}`, ...item };
      data = [...data, m];
      return m;
    }),
    update: vi.fn((id: string, updates: Record<string, unknown>) => {
      const idx = data.findIndex((m) => m.id === id);
      if (idx < 0) return null;
      data[idx] = { ...data[idx], ...updates };
      return data[idx];
    }),
    remove: vi.fn((id: string) => {
      const before = data.length;
      data = data.filter((m) => m.id !== id);
      return data.length < before;
    }),
    reset: vi.fn(() => {
      data = defaults.map((d) => ({ ...d }));
      return [...data];
    }),
  };
  return { deployedModelStore: store };
});

import { ModelManagementSection } from "../components/settings/ModelManagementSection";
import { deployedModelStore } from "../stores/dashboard-stores";
import { toast } from "sonner";
import type { SettingsToggles } from "../hooks/useSettingsStore";

function makeProps() {
  return {
    settings: { cacheEnabled: true } as SettingsToggles,
    toggleSetting: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  deployedModelStore.reset();
});

describe("settings/ModelManagementSection", () => {
  it("应渲染标题 / 默认模型列表 / KV-Cache 开关", () => {
    render(<ModelManagementSection {...makeProps()} />);
    expect(screen.getByText("模型管理")).toBeInTheDocument();
    expect(screen.getByText("LLaMA-70B")).toBeInTheDocument();
    expect(screen.getByText("Qwen-72B")).toBeInTheDocument();
    expect(screen.getByText("v1.2 · 140GB · GPU-A100-01")).toBeInTheDocument();
    expect(screen.getByText("已部署")).toBeInTheDocument();
    expect(screen.getByText("待命")).toBeInTheDocument();
    expect(screen.getByText("推理缓存 (KV-Cache)")).toBeInTheDocument();
  });

  it("切换 KV-Cache 开关应回调 toggleSetting(cacheEnabled)", () => {
    const p = makeProps();
    render(<ModelManagementSection {...p} />);
    const row = screen.getByText("推理缓存 (KV-Cache)").closest("div")!.parentElement as HTMLElement;
    fireEvent.click(row.querySelector("button")!);
    expect(p.toggleSetting).toHaveBeenCalledWith("cacheEnabled");
  });

  it("点击添加模型应打开表单且版本默认 v1.0 / GPU 默认 -", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getByText("添加模型"));
    expect(screen.getByText("添加新模型")).toBeInTheDocument();
    expect(screen.getByDisplayValue("v1.0")).toBeInTheDocument();
    expect(screen.getByDisplayValue("-")).toBeInTheDocument();
    expect(screen.getByDisplayValue("待命")).toBeInTheDocument();
  });

  it("填写表单后创建应调用 store.add 并刷新列表", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getByText("添加模型"));
    fireEvent.change(screen.getByPlaceholderText("例: LLaMA-70B"), {
      target: { value: "DeepSeek-V3" },
    });
    fireEvent.change(screen.getByPlaceholderText("140GB"), { target: { value: "180GB" } });
    fireEvent.click(screen.getByText("创建"));

    expect(deployedModelStore.add).toHaveBeenCalledWith({
      name: "DeepSeek-V3",
      version: "v1.0",
      size: "180GB",
      status: "standby",
      gpu: "-",
    });
    expect(toast.success).toHaveBeenCalledWith(
      "模型 DeepSeek-V3 已添加",
      expect.objectContaining({ style: expect.anything() }),
    );
    // 表单关闭 + 新模型入列
    expect(screen.queryByText("添加新模型")).not.toBeInTheDocument();
    expect(screen.getByText("DeepSeek-V3")).toBeInTheDocument();
  });

  it("名称为空时创建应提示错误且不调用 add", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getByText("添加模型"));
    fireEvent.click(screen.getByText("创建"));
    expect(toast.error).toHaveBeenCalledWith("模型名称不能为空");
    expect(deployedModelStore.add).not.toHaveBeenCalled();
    expect(screen.getByText("添加新模型")).toBeInTheDocument();
  });

  it("点击取消应关闭表单", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getByText("添加模型"));
    fireEvent.click(screen.getByText("取消"));
    expect(screen.queryByText("添加新模型")).not.toBeInTheDocument();
  });

  it("编辑需二次确认, 确认后表单预填并支持保存更新", () => {
    render(<ModelManagementSection {...makeProps()} />);
    // 进入确认态 (多行取第一行: LLaMA-70B)
    fireEvent.click(screen.getAllByTitle("编辑")[0]);
    expect(screen.getByText("确认编辑?")).toBeInTheDocument();
    // 取消回到普通态
    fireEvent.click(screen.getAllByTitle("取消")[0]);
    expect(screen.queryByText("确认编辑?")).not.toBeInTheDocument();
    // 再次进入并确认
    fireEvent.click(screen.getAllByTitle("编辑")[0]);
    fireEvent.click(screen.getByTitle("确认编辑"));
    // 表单预填
    expect(screen.getByText("编辑: LLaMA-70B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("LLaMA-70B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("v1.2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("140GB")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GPU-A100-01")).toBeInTheDocument();
    // 修改名称与状态后保存 (预填状态为已部署)
    fireEvent.change(screen.getByDisplayValue("LLaMA-70B"), { target: { value: "LLaMA-70B-Q4" } });
    fireEvent.change(screen.getByDisplayValue("已部署"), { target: { value: "error" } });
    fireEvent.click(screen.getByText("保存"));

    expect(deployedModelStore.update).toHaveBeenCalledWith("dm-1", {
      name: "LLaMA-70B-Q4",
      version: "v1.2",
      size: "140GB",
      status: "error",
      gpu: "GPU-A100-01",
    });
    expect(toast.success).toHaveBeenCalledWith(
      "模型 LLaMA-70B-Q4 已更新",
      expect.anything(),
    );
    expect(screen.getByText("异常")).toBeInTheDocument();
  });

  it("删除需二次确认, 确认后调用 remove 并刷新", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getAllByTitle("删除")[0]);
    // 普通删除按钮被确认按钮替换
    expect(screen.getAllByTitle("删除")).toHaveLength(1);
    fireEvent.click(screen.getByTitle("确认删除"));

    expect(deployedModelStore.remove).toHaveBeenCalledWith("dm-1");
    expect(deployedModelStore.getById).toHaveBeenCalledWith("dm-1");
    expect(toast.success).toHaveBeenCalledWith(
      "模型 LLaMA-70B 已删除",
      expect.anything(),
    );
    expect(screen.queryByText("LLaMA-70B")).not.toBeInTheDocument();
  });

  it("删除取消应回到普通态", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getAllByTitle("删除")[0]);
    fireEvent.click(screen.getAllByTitle("取消")[0]);
    expect(screen.getAllByTitle("删除")).toHaveLength(2);
    expect(screen.getByText("LLaMA-70B")).toBeInTheDocument();
  });

  it("点击重置应调用 store.reset 并提示", () => {
    render(<ModelManagementSection {...makeProps()} />);
    fireEvent.click(screen.getByText("重置"));
    expect(deployedModelStore.reset).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("模型列表已重置为默认值");
  });

  it("列表为空时应显示占位提示", () => {
    vi.mocked(deployedModelStore.getAll).mockReturnValueOnce([]);
    render(<ModelManagementSection {...makeProps()} />);
    expect(screen.getByText(/暂无模型/)).toBeInTheDocument();
  });
});
