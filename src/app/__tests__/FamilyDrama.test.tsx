/**
 * FamilyDrama.test.tsx
 * ====================
 * ai-family/FamilyDrama.tsx — 漫剧生产线 · 生产看板（只读）
 *
 * 覆盖范围:
 * - 探测中初始态 / 生产链六环节 / 红线声明
 * - 探针全通 → 5/5 在线 + 网关实时指标
 * - 探针全挂 → 离线且无网关指标
 * - 部分在线混合态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilyDrama } from "../components/ai-family/FamilyDrama";

const GW_METRICS = {
  status: "running",
  version: "1.8.2",
  uptime_seconds: 3661,
  metrics: { active_requests: 3, total_requests: 1234, cache_hit_rate: 0.42 },
};

function okFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/health") && !url.includes("healthz")) {
      return { ok: true, json: async () => GW_METRICS };
    }
    return { ok: true, json: async () => ({}), text: async () => "ok" };
  });
}

describe("ai-family/FamilyDrama", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("初始渲染显示探测中并渲染生产链与红线声明", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => { /* 永不 resolve */ })));
    render(<FamilyDrama />);
    expect(screen.getByText("漫剧生产线 · 生产看板")).toBeInTheDocument();
    expect(screen.getAllByText("探测中")).toHaveLength(5);
    expect(screen.getByText("0/5 在线")).toBeInTheDocument();
    expect(screen.getByText("0379-World 网关")).toBeInTheDocument();
    expect(screen.getByText("Ollama 本地推理")).toBeInTheDocument();
    expect(screen.getByText("生产链路（六环节）")).toBeInTheDocument();
    expect(screen.getByText(/剧本分镜/)).toBeInTheDocument(); // 渲染带序号前缀 "1."
    expect(screen.getByText(/口型门禁/)).toBeInTheDocument();
    expect(screen.getByText(/分层边界：本页为看板层（只读）/)).toBeInTheDocument();
  });

  it("探针全部成功后显示 5/5 在线与网关实时指标", async () => {
    vi.stubGlobal("fetch", okFetch());
    render(<FamilyDrama />);
    expect(await screen.findByText("5/5 在线")).toBeInTheDocument();
    expect(screen.getAllByText("在线")).toHaveLength(5);
    expect(screen.queryByText("探测中")).not.toBeInTheDocument();
    // 网关指标卡
    expect(screen.getByText(/0379-World v1\.8\.2 · 30s 刷新/)).toBeInTheDocument();
    expect(screen.getByText("运行状态")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("61m 1s")).toBeInTheDocument(); // 3661s
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("42.0%")).toBeInTheDocument();
  });

  it("服务全部不可达时显示离线且无网关指标", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network unreachable");
    }));
    render(<FamilyDrama />);
    expect(await screen.findByText("0/5 在线")).toBeInTheDocument();
    expect(screen.getAllByText("离线")).toHaveLength(5);
    expect(screen.queryByText(/网关实时指标/)).not.toBeInTheDocument();
  });

  it("网关返回非 2xx 时指标缺失但探针状态正常呈现", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/health") && !url.includes("healthz")) {
        return { ok: false, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}), text: async () => "ok" };
    }));
    render(<FamilyDrama />);
    expect(await screen.findByText("5/5 在线")).toBeInTheDocument();
    expect(screen.queryByText(/网关实时指标/)).not.toBeInTheDocument();
  });

  it("混合态: 仅网关在线时显示 1/5", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("25080")) {
        if (url.includes("/health") && !url.includes("healthz")) {
          return { ok: true, json: async () => GW_METRICS };
        }
        return { ok: true, json: async () => ({}), text: async () => "ok" };
      }
      throw new TypeError("down");
    }));
    render(<FamilyDrama />);
    expect(await screen.findByText("1/5 在线")).toBeInTheDocument();
    expect(screen.getAllByText("离线")).toHaveLength(4);
  });
});
