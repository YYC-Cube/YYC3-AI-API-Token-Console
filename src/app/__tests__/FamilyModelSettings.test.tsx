/**
 * FamilyModelSettings.test.tsx
 * ============================
 * ai-family/FamilyModelSettings.tsx — 大模型控制中心
 *
 * 覆盖范围:
 * - 家人模型标签: 卡片展开 / 模型切换持久化 / 诊断失败(缺 Key) / 诊断全通过
 * - 语音预览 (TTS 参数)
 * - 密钥管理: 输入持久化 / 明文切换
 * - 总览: 统计 / 分配一览 / 一键测通按钮
 * - 搜索过滤 / 导出配置
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { FamilyModelSettings } from "../components/ai-family/FamilyModelSettings";
import { DEFAULT_VOICE_PROFILES } from "../components/ai-family/shared";

const KEYS_STORAGE = "yyc3-family-provider-keys";
const ASSIGN_STORAGE = "yyc3-family-model-assignments";

class UtteranceMock {
  text: string;
  pitch = 1;
  rate = 1;
  volume = 1;
  lang = "";
  voice: unknown = null;
  onend: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}

describe("ai-family/FamilyModelSettings", () => {
  const speakMock = vi.fn();
  const cancelMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak: speakMock, cancel: cancelMock, getVoices: vi.fn(() => []), onvoiceschanged: null },
    });
    vi.stubGlobal("SpeechSynthesisUtterance", UtteranceMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const expandCard = (shortName: string) => {
    fireEvent.click(screen.getByText(shortName));
  };

  it("默认家人模型标签应渲染头部统计与 8 张卡片", () => {
    render(<FamilyModelSettings />);
    expect(screen.getByText("AI Family 大模型控制中心")).toBeInTheDocument();
    expect(screen.getByText("1/6 接入")).toBeInTheDocument(); // 仅 ollama 免 Key
    expect(screen.getByText("0/8 已测通")).toBeInTheDocument();
    for (const name of ["千行", "万物", "先知", "伯乐", "天枢", "守护", "宗师", "灵韵"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("搜索家人...")).toBeInTheDocument();
  });

  it("展开卡片显示职能定位 / 模型选择器 / 操作按钮", () => {
    render(<FamilyModelSettings />);
    expandCard("千行");
    expect(screen.getByText("职能定位")).toBeInTheDocument();
    expect(screen.getByText("语义理解与意图识别")).toBeInTheDocument();
    expect(screen.getAllByText("GLM-4.5").length).toBeGreaterThanOrEqual(2); // 头部模型名 + 选择器按钮
    expect(screen.getAllByText("GPT-4o").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("连接测试")).toBeInTheDocument();
    expect(screen.getByText("语音预览")).toBeInTheDocument();
  });

  it("切换模型应持久化 assignment", () => {
    render(<FamilyModelSettings />);
    expandCard("千行");
    fireEvent.click(screen.getAllByText("GPT-4o")[0]);
    const saved = JSON.parse(localStorage.getItem(ASSIGN_STORAGE)!);
    expect(saved[0]).toMatchObject({ memberId: "navigator", providerId: "openai", modelId: "gpt-4o" });
  });

  it("诊断: 缺少 API Key 时失败并给出修复建议", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    render(<FamilyModelSettings />);
    expandCard("千行"); // 默认 zhipu, 无 Key
    fireEvent.click(screen.getByText("连接测试"));
    // 同步批渲染直接进入第一步 (诊断中... 被覆盖)
    expect(screen.getByText("API Key 检查...")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(screen.getByText("诊断失败")).toBeInTheDocument();
    expect(screen.getByText(/❌ API Key 检查: 缺少 zhipu API Key/)).toBeInTheDocument();
    expect(screen.getByText(/修复建议: 请在「密钥管理」标签页配置对应 API Key/)).toBeInTheDocument();
  });

  it("诊断: 配置 Key 后四步全部通过", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    render(<FamilyModelSettings />);
    // 先去密钥管理配置智谱 Key
    fireEvent.click(screen.getByText("密钥管理"));
    const zhipuInput = screen.getByPlaceholderText("输入 智谱 AI API Key...");
    fireEvent.change(zhipuInput, { target: { value: "sk-zhipu-123456" } });
    expect(JSON.parse(localStorage.getItem(KEYS_STORAGE)!).zhipu).toBe("sk-zhipu-123456");
    expect(screen.getByText("2/6 接入")).toBeInTheDocument();

    fireEvent.click(screen.getByText("家人模型"));
    expandCard("千行");
    fireEvent.click(screen.getByText("连接测试"));
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(screen.getByText(/全部通过/)).toBeInTheDocument(); // 徽标带 "(Nms)" 后缀
    expect(screen.getByText(/✅ API Key 检查: zhipu API Key 已配置/)).toBeInTheDocument();
    expect(screen.getByText(/✅ 推理响应测试/)).toBeInTheDocument();
    expect(screen.queryByText(/修复建议/)).not.toBeInTheDocument();
    expect(screen.getByText("1/8 已测通")).toBeInTheDocument();
  });

  it("语音预览应以家人语音档案参数调用 TTS", () => {
    render(<FamilyModelSettings />);
    expandCard("千行");
    fireEvent.click(screen.getByText("语音预览"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    const u = speakMock.mock.calls[0][0] as UtteranceMock;
    const profile = DEFAULT_VOICE_PROFILES[0];
    expect(u.text).toContain("千行");
    expect(u.pitch).toBe(profile.pitch);
    expect(u.rate).toBe(profile.rate);
    expect(u.lang).toBe(profile.lang);
    expect(cancelMock).toHaveBeenCalled();
  });

  it("密钥管理: 密钥输入持久化与明文切换", () => {
    render(<FamilyModelSettings />);
    fireEvent.click(screen.getByText("密钥管理"));
    const openaiInput = screen.getByPlaceholderText("输入 OpenAI API Key...") as HTMLInputElement;
    expect(openaiInput).toHaveAttribute("type", "password");
    fireEvent.change(openaiInput, { target: { value: "sk-test-abc" } });
    expect(JSON.parse(localStorage.getItem(KEYS_STORAGE)!).openai).toBe("sk-test-abc");
    // Eye 切换明文
    const eyeBtn = document.querySelector("button svg.lucide-eye")!.closest("button") as HTMLButtonElement;
    fireEvent.click(eyeBtn);
    expect(openaiInput).toHaveAttribute("type", "text");
    expect(document.querySelector("button svg.lucide-eye-off")).toBeInTheDocument();
  });

  it("搜索家人应过滤卡片", () => {
    render(<FamilyModelSettings />);
    fireEvent.change(screen.getByPlaceholderText("搜索家人..."), { target: { value: "先知" } });
    expect(screen.getByText("Prophet")).toBeInTheDocument();
    expect(screen.queryByText("千行")).not.toBeInTheDocument();
    expect(screen.queryByText("Navigator")).not.toBeInTheDocument();
  });

  it("总览标签应渲染统计与分配一览", () => {
    render(<FamilyModelSettings />);
    fireEvent.click(screen.getByText("总览"));
    expect(screen.getByText("可用模型")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument(); // 3+2+3+3+2+3
    expect(screen.getByText("密钥配置")).toBeInTheDocument();
    expect(screen.getByText("测试通过")).toBeInTheDocument();
    // 文本带 "家人" 前缀与箭头图标, 用正则匹配
    expect(screen.getByText(/模型分配一览/)).toBeInTheDocument();
    expect(screen.getAllByText("智谱 AI").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("一键测通全部家人")).toBeInTheDocument();
  });

  it("导出配置应触发 blob 下载", () => {
    const createObjectURLMock = vi.fn(() => "blob:x");
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURLMock, configurable: true, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true, writable: true });
    render(<FamilyModelSettings />);
    fireEvent.click(screen.getByText("导出配置"));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });
});
