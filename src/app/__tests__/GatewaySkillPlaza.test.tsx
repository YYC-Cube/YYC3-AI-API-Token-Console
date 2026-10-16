/**
 * GatewaySkillPlaza.test.tsx
 * ===========================
 * 网关技能工具广场测试（双端联通 R7 审核 · 覆盖率修复）
 *
 * 覆盖: 折叠/展开 · 分类分组 · 参数输入（text/file 双形态）· 执行成功/失败结果呈现 ·
 * JSON 详情折叠 · 执行中禁用
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { GatewaySkillPlaza } from "../components/GatewaySkillPlaza";
import * as skills from "../lib/gateway-skills";

describe("GatewaySkillPlaza", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  const openPlaza = () => {
    const utils = render(<GatewaySkillPlaza />);
    fireEvent.click(screen.getByText(/网关技能广场 · 13 项/));
    return utils;
  };

  it("折叠态仅标题行; 展开后按分类分组渲染 13 技能", () => {
    render(<GatewaySkillPlaza />);
    expect(screen.queryByText("缓存统计")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/网关技能广场 · 13 项/));
    expect(screen.getByText("缓存统计")).toBeInTheDocument();
    expect(screen.getByText("图片 OCR")).toBeInTheDocument();
    expect(screen.getByText("MCP 工具发现")).toBeInTheDocument();
    for (const cat of ["缓存", "路由", "注册中心", "账单", "日志", "告警", "观测"]) {
      expect(screen.getAllByText(cat).length).toBeGreaterThan(0);
    }
  });

  it("无参技能: 执行成功 → 摘要绿条 + JSON 详情可展开", async () => {
    const spy = vi.spyOn(skills, "runGatewaySkill").mockResolvedValue({
      ok: true, summary: "命中率 42.0% · 条目 87", detail: '{"hit_rate":0.42}',
    });
    openPlaza();
    fireEvent.click(screen.getAllByText("执行")[0]!);
    await waitFor(() => expect(screen.getByText(/✓ 命中率 42.0%/)).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith("cache-stats", {});
    fireEvent.click(screen.getByText("JSON 详情"));
    expect(screen.getByText(/"hit_rate":0.42/)).toBeInTheDocument();
  });

  it("失败结果 → 红条呈现错误摘要（不伪造成功）", async () => {
    vi.spyOn(skills, "runGatewaySkill").mockResolvedValue({ ok: false, summary: "HTTP 401（console 形态请先登录）" });
    openPlaza();
    const idx = skills.GATEWAY_SKILLS.findIndex((s) => s.id === "cache-stats");
    fireEvent.click(screen.getAllByText("执行")[idx]!);
    await waitFor(() => expect(screen.getByText(/✗ HTTP 401/)).toBeInTheDocument());
  });

  it("带参技能: 文本输入值随执行提交; 文件参数渲染 file input", async () => {
    const spy = vi.spyOn(skills, "runGatewaySkill").mockResolvedValue({ ok: true, summary: "共 3 个工具" });
    openPlaza();
    // mcp-execute 的 tool_name 输入
    const toolInput = screen.getByPlaceholderText("工具名: web_search") as HTMLInputElement;
    fireEvent.change(toolInput, { target: { value: "web_search" } });
    const card = toolInput.closest("div.rounded-lg") as HTMLElement;
    fireEvent.click(within(card).getByText("执行"));
    await waitFor(() => expect(screen.getByText(/✓ 共 3 个工具/)).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith("mcp-execute", expect.objectContaining({ tool_name: "web_search" }));
    // OCR 文件参数
    expect(screen.getByTitle("图片文件: 选择 png/jpg")).toHaveAttribute("type", "file");
  });

  it("执行中按钮禁用并显示「执行中」", async () => {
    let resolveRun: (v: skills.SkillResult) => void = () => {};
    vi.spyOn(skills, "runGatewaySkill").mockImplementation(
      () => new Promise<skills.SkillResult>((r) => { resolveRun = r; }),
    );
    openPlaza();
    const idx = skills.GATEWAY_SKILLS.findIndex((s) => s.id === "cache-stats");
    fireEvent.click(screen.getAllByText("执行")[idx]!);
    await waitFor(() => expect(screen.getAllByText("执行中").length).toBeGreaterThan(0));
    resolveRun({ ok: true, summary: "done" });
    await waitFor(() => expect(screen.getByText(/✓ done/)).toBeInTheDocument());
  });
});
