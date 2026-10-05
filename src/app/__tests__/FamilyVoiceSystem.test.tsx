/**
 * FamilyVoiceSystem.test.tsx
 * ==========================
 * ai-family/FamilyVoiceSystem.tsx — AI Family 语音系统
 *
 * 覆盖范围:
 * - TTS 不可用降级分支
 * - 8 张家人语音卡片渲染 / 播放 → 播报中 → 停止
 * - 语音设置展开: 音高/语速/音量调节 + 持久化 + 恢复默认 + 快捷预览
 * - 语音对话面板: 文字输入回复 / SpeechRecognition 识别流
 * - 整点关爱 / 全家播报 (顺序播报)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { FamilyVoiceSystem } from "../components/ai-family/FamilyVoiceSystem";
import { AI_RESPONSES, FAMILY_MEMBERS, DEFAULT_VOICE_PROFILES } from "../components/ai-family/shared";

const PROFILES_KEY = "yyc3-family-voice-profiles";
const CONV_KEY = "yyc3-family-voice-conversations";

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

class FakeRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  maxAlternatives = 1;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { instances.push(this); }
}
const instances: FakeRecognition[] = [];

const speakMock = vi.fn();
const cancelMock = vi.fn();

function installSpeech() {
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: speakMock, cancel: cancelMock, getVoices: vi.fn(() => []), onvoiceschanged: null },
  });
  vi.stubGlobal("SpeechSynthesisUtterance", UtteranceMock);
}

const cardOf = (shortName: string) => screen.getByText(shortName).closest(".rounded-xl") as HTMLElement;

describe("ai-family/FamilyVoiceSystem", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    instances.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "speechSynthesis");
    Reflect.deleteProperty(window, "SpeechRecognition");
  });

  it("TTS 不可用时应显示降级警告与 N/A 状态", () => {
    Reflect.deleteProperty(window, "speechSynthesis");
    render(<FamilyVoiceSystem />);
    expect(screen.getByText("AI Family 语音系统")).toBeInTheDocument();
    // 头部状态行为多段文本节点, 用正则匹配
    expect(screen.getByText(/TTS 不可用/)).toBeInTheDocument();
    expect(screen.getByText(/语音识别不可用/)).toBeInTheDocument();
    expect(screen.getByText("Speech Synthesis N/A")).toBeInTheDocument();
    expect(screen.getByText("Speech Recognition N/A (use text)")).toBeInTheDocument();
    expect(screen.getByText(/当前环境不支持 Web Speech API/)).toBeInTheDocument();
    expect(screen.getByText(/0 条对话记录/)).toBeInTheDocument();
  });

  it("TTS 就绪时应渲染 8 张家人语音卡片", () => {
    installSpeech();
    render(<FamilyVoiceSystem />);
    expect(screen.getByText(/TTS 就绪/)).toBeInTheDocument();
    expect(screen.getByText("Speech Synthesis OK")).toBeInTheDocument();
    for (const m of FAMILY_MEMBERS) {
      expect(screen.getByText(m.shortName)).toBeInTheDocument();
    }
    // 千行默认语音档案 meta
    expect(screen.getByText("音高 1.2 · 语速 1.1 · 音量 90%")).toBeInTheDocument();
  });

  it("点击播放应朗读问候语并显示播报中，停止后取消", () => {
    installSpeech();
    render(<FamilyVoiceSystem />);
    const card = cardOf("千行");
    fireEvent.click(card.querySelector("button svg.lucide-play")!.closest("button") as HTMLButtonElement);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect((speakMock.mock.calls[0][0] as UtteranceMock).text).toBe(FAMILY_MEMBERS[0].greeting);
    expect(screen.getByText("播报中")).toBeInTheDocument();
    expect(screen.getByText("停止")).toBeInTheDocument();
    fireEvent.click(screen.getByText("停止"));
    expect(cancelMock).toHaveBeenCalled();
    expect(screen.queryByText("播报中")).not.toBeInTheDocument();
  });

  it("语音设置: 调节音高持久化，恢复默认回写", () => {
    installSpeech();
    render(<FamilyVoiceSystem />);
    const card = cardOf("千行");
    fireEvent.click(card.querySelector("button svg[class*='lucide-sliders']")!.closest("button") as HTMLButtonElement);
    expect(within(card).getByText("音高 (Pitch)")).toBeInTheDocument();
    expect(within(card).getByText("语速 (Rate)")).toBeInTheDocument();
    expect(within(card).getByText("音量 (Volume)")).toBeInTheDocument();

    const pitch = within(card).getByDisplayValue("1.2") as HTMLInputElement;
    fireEvent.change(pitch, { target: { value: "1.6" } });
    expect(within(card).getByDisplayValue("1.6")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PROFILES_KEY)!)[0].pitch).toBe(1.6);

    fireEvent.click(within(card).getByText("恢复默认"));
    expect(within(card).getByDisplayValue("1.2")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PROFILES_KEY)!)[0].pitch).toBe(1.2);
  });

  it("快捷预览: 问候语 / 关爱播报 触发对应文本朗读", () => {
    installSpeech();
    render(<FamilyVoiceSystem />);
    const card = cardOf("千行");
    fireEvent.click(card.querySelector("button svg[class*='lucide-sliders']")!.closest("button") as HTMLButtonElement);
    fireEvent.click(within(card).getByText("问候语"));
    expect((speakMock.mock.calls[0][0] as UtteranceMock).text).toBe(FAMILY_MEMBERS[0].greeting);
    fireEvent.click(within(card).getByText("关爱播报"));
    expect((speakMock.mock.calls[1][0] as UtteranceMock).text).toBe(FAMILY_MEMBERS[0].careMessage);
  });

  it("语音对话面板: 文字输入 → 回复 → 对话持久化", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    installSpeech();
    render(<FamilyVoiceSystem />);
    fireEvent.click(within(cardOf("千行")).getByTitle("语音对话"));
    expect(screen.getByText(/与 千行 语音对话/)).toBeInTheDocument();
    expect(screen.getByText("语音识别不可用，请使用文字输入")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("对 千行 说点什么...");
    fireEvent.change(input, { target: { value: "你好" } });
    fireEvent.click(document.querySelector("button svg.lucide-message-circle")!.closest("button") as HTMLButtonElement);
    expect(screen.getByText("回复中")).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    // AI 回复取 AI_RESPONSES.navigator[2]
    const expectedReply = AI_RESPONSES.navigator[2];
    expect(screen.getByText(expectedReply)).toBeInTheDocument();
    expect(screen.getByText("你好")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.getByText(/1 条对话记录/)).toBeInTheDocument();
    const convs = JSON.parse(localStorage.getItem(CONV_KEY)!);
    expect(convs).toHaveLength(1);
    expect(convs[0]).toMatchObject({ memberId: "navigator", userText: "你好" });

    // TTS onend → 回复中消失
    act(() => { (speakMock.mock.calls.at(-1)![0] as UtteranceMock).onend?.(); });
    expect(screen.queryByText("回复中")).not.toBeInTheDocument();
  });

  it("语音识别可用时: 麦克风启动 → 识别结果 → 发送", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    installSpeech();
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: FakeRecognition });
    render(<FamilyVoiceSystem />);
    expect(screen.getByText("Speech Recognition OK")).toBeInTheDocument();
    fireEvent.click(within(cardOf("千行")).getByTitle("语音对话"));

    // 面板内圆形麦克风按钮 (w-14)
    const micBtn = document.querySelector("button.w-14") as HTMLButtonElement;
    fireEvent.click(micBtn);
    expect(instances[0].start).toHaveBeenCalledTimes(1);
    expect(screen.getByText("录音中")).toBeInTheDocument();

    // 模拟识别结果 (final)
    act(() => {
      instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "测试语音" }, length: 1 }],
      });
    });
    expect(screen.getByText("识别结果")).toBeInTheDocument();
    expect(screen.getByText("测试语音")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/发送给 千行/));
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    const convs = JSON.parse(localStorage.getItem(CONV_KEY)!);
    expect(convs.at(-1).userText).toBe("测试语音");

    // onend → 录音中消失
    act(() => { instances[0].onend?.(); });
    expect(screen.queryByText("录音中")).not.toBeInTheDocument();
  });

  it("整点关爱应朗读当前时段家人的关爱语", () => {
    installSpeech();
    render(<FamilyVoiceSystem />);
    fireEvent.click(screen.getByText("整点关爱"));
    const care = FAMILY_MEMBERS[new Date().getHours() % FAMILY_MEMBERS.length];
    expect((speakMock.mock.calls[0][0] as UtteranceMock).text).toBe(care.careMessage);
    expect(screen.getByText("播报中")).toBeInTheDocument();
  });

  it("全家播报应按顺序朗读全部家人 (8 次)", async () => {
    vi.useFakeTimers();
    installSpeech();
    render(<FamilyVoiceSystem />);
    fireEvent.click(screen.getByText("全家播报"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      for (let i = 0; i < 8; i++) {
        (speakMock.mock.calls[i][0] as UtteranceMock).onend?.();
        await vi.advanceTimersByTimeAsync(300);
      }
    });
    expect(speakMock).toHaveBeenCalledTimes(8);
    expect((speakMock.mock.calls[7][0] as UtteranceMock).text).toContain("灵韵");
    expect(screen.queryByText("停止")).not.toBeInTheDocument();
  });

  it("历史对话持久化后重进应显示对话记录", () => {
    installSpeech();
    localStorage.setItem(CONV_KEY, JSON.stringify([
      { id: "vc-1", memberId: "thinker", userText: "在吗", aiText: "在的", timestamp: new Date().toISOString() },
    ]));
    render(<FamilyVoiceSystem />);
    expect(screen.getByText(/1 条对话记录/)).toBeInTheDocument();
    fireEvent.click(within(cardOf("万物")).getByTitle("语音对话"));
    expect(screen.getByText("在吗")).toBeInTheDocument();
    expect(screen.getByText("在的")).toBeInTheDocument();
  });
});
