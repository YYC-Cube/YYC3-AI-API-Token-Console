/**
 * useTerminal.test.tsx
 * =====================
 * useTerminal Hook - CLI 终端模拟测试
 *
 * 覆盖范围:
 * - 初始状态（欢迎消息）
 * - 命令执行（cpim status / node / alerts / help / clear）
 * - goto / open 路由跳转
 * - ai <prompt> Text-to-CLI
 * - 未知命令错误提示
 * - 输入历史导航
 * - 自动补全
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTerminal } from "../hooks/useTerminal";
import { resetEnvConfig } from "../lib/env-config";

describe("useTerminal", () => {
  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("history 应有欢迎消息", () => {
      const { result } = renderHook(() => useTerminal());
      expect(result.current.history.length).toBe(1);
      expect(result.current.history[0].output).toContain("YYC³");
    });

    it("inputValue 应为空", () => {
      const { result } = renderHook(() => useTerminal());
      expect(result.current.inputValue).toBe("");
    });

    it("completions 应为空", () => {
      const { result } = renderHook(() => useTerminal());
      expect(result.current.completions.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 命令执行
  // ----------------------------------------------------------

  describe("命令执行", () => {
    it("help 应显示帮助信息", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("help");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("cpim status");
      expect(last.status).toBe("info");
    });

    it("cpim status 应显示系统状态", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim status");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("活跃节点");
      expect(last.output).toContain("GPU 利用率");
      expect(last.status).toBe("success");
    });

    it("cpim node 应列出节点", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim node");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("GPU-A100-01");
      expect(last.status).toBe("success");
    });

    it("cpim node GPU-A100-01 应显示节点详情", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim node GPU-A100-01");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("节点详情");
      expect(last.status).toBe("success");
    });

    it("cpim alerts 应列出告警", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim alerts");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("AL-0032");
      expect(last.status).toBe("success");
    });

    it("cpim model list 应列出模型", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim model list");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("LLaMA-70B");
    });

    it("cpim patrol run --full 应执行巡查", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim patrol run --full");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("巡查完成");
    });

    it("cpim report 应生成报告", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim report");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("报告已生成");
    });

    it("cpim config list 应列出配置", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim config list");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("patrol.interval");
    });

    it("cpim config set key value 应设置成功", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim config set patrol.interval 30");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("已更新");
      expect(last.status).toBe("success");
    });

    it("clear 应清空历史", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim status");
      });
      act(() => {
        result.current.execute("clear");
      });
      expect(result.current.history.length).toBe(0);
    });

    it("空输入不应添加历史", () => {
      const { result } = renderHook(() => useTerminal());
      const before = result.current.history.length;
      act(() => {
        result.current.execute("");
      });
      expect(result.current.history.length).toBe(before);
    });

    it("未知命令应返回错误", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("foobar");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("命令未找到");
      expect(last.status).toBe("error");
    });

    it("未知 cpim 子命令应返回错误", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim foobar");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("未知子命令");
      expect(last.status).toBe("error");
    });
  });

  // ----------------------------------------------------------
  // goto / open 路由跳转
  // ----------------------------------------------------------

  describe("路由跳转", () => {
    it("goto /patrol 应触发 onNavigate", () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      act(() => {
        result.current.execute("goto /patrol");
      });
      expect(onNavigate).toHaveBeenCalledWith("/patrol");
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("巡查模式");
      expect(last.status).toBe("success");
    });

    it("open /operations 应触发 onNavigate", () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      act(() => {
        result.current.execute("open /operations");
      });
      expect(onNavigate).toHaveBeenCalledWith("/operations");
    });

    it("goto 不带参数应列出所有路由", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("goto");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("可用路由");
      expect(last.status).toBe("info");
    });

    it("goto 中文名应模糊匹配", () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      act(() => {
        result.current.execute("goto 巡查");
      });
      expect(onNavigate).toHaveBeenCalledWith("/patrol");
    });

    it("goto 未知路由应返回错误", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("goto /nonexistent");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("未知路由");
      expect(last.status).toBe("error");
    });
  });

  // ----------------------------------------------------------
  // ai Text-to-CLI
  // ----------------------------------------------------------

  describe("ai Text-to-CLI", () => {
    it("ai 不带参数应显示用法", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("ai");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("ai <自然语言描述>");
      expect(last.status).toBe("info");
    });

    it("ai 查看节点状态 应产生 AI 建议", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("ai 查看节点状态");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("AI Text-to-CLI");
      expect(last.output).toContain("cpim node");
    });

    it("ai 告警 应建议 cpim alerts", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("ai 查看告警");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("cpim alerts");
    });
  });

  // ----------------------------------------------------------
  // 输入管理
  // ----------------------------------------------------------

  describe("输入管理", () => {
    it("handleInputChange 应更新输入值", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("cpim");
      });
      expect(result.current.inputValue).toBe("cpim");
    });

    it("execute 后应清空输入", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("help");
      });
      act(() => {
        result.current.execute("help");
      });
      expect(result.current.inputValue).toBe("");
    });
  });

  // ----------------------------------------------------------
  // 自动补全
  // ----------------------------------------------------------

  describe("自动补全", () => {
    it("输入 cp 应补全 cpim", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("cp");
      });
      expect(result.current.completions).toContain("cpim");
    });

    it("输入 cpim st 应补全 status", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("cpim st");
      });
      expect(result.current.completions).toContain("status");
    });

    it("applyCompletion 应更新输入值", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("cpim st");
      });
      act(() => {
        result.current.applyCompletion("status");
      });
      expect(result.current.inputValue).toContain("status");
    });

    it("空输入应无补全", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("");
      });
      expect(result.current.completions.length).toBe(0);
    });

    it("goto 应补全路由路径", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleInputChange("goto /pa");
      });
      expect(result.current.completions).toContain("/patrol");
    });
  });

  // ----------------------------------------------------------
  // 历史导航
  // ----------------------------------------------------------

  describe("历史导航", () => {
    it("执行命令后应能上下导航历史", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("cpim status");
      });
      act(() => {
        result.current.execute("help");
      });

      act(() => {
        result.current.handleHistoryNav("up");
      });
      expect(result.current.inputValue).toBe("help");

      act(() => {
        result.current.handleHistoryNav("up");
      });
      expect(result.current.inputValue).toBe("cpim status");

      act(() => {
        result.current.handleHistoryNav("down");
      });
      expect(result.current.inputValue).toBe("help");

      act(() => {
        result.current.handleHistoryNav("down");
      });
      expect(result.current.inputValue).toBe("");
    });
  });

  // ----------------------------------------------------------
  // 多 Tab 支持
  // ----------------------------------------------------------

  describe("多 Tab 支持", () => {
    it("不同 tabId 应有独立初始消息", () => {
      const { result: r1 } = renderHook(() => useTerminal({ tabId: "tab-1" }));
      const { result: r2 } = renderHook(() => useTerminal({ tabId: "tab-2" }));
      expect(r1.current.history[0].id).toContain("tab-1");
      expect(r2.current.history[0].id).toContain("tab-2");
    });

    it("不同 Tab 执行命令互不影响", () => {
      const { result: r1 } = renderHook(() => useTerminal({ tabId: "tab-a" }));
      const { result: r2 } = renderHook(() => useTerminal({ tabId: "tab-b" }));

      act(() => {
        r1.current.execute("cpim status");
      });
      // tab-a: welcome + status = 2
      expect(r1.current.history.length).toBe(2);
      // tab-b: just welcome = 1
      expect(r2.current.history.length).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // Unix 命令
  // ----------------------------------------------------------

  describe("Unix 命令", () => {
    it("ls 应列出目录内容", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("ls");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("logs/");
      expect(last.status).toBe("success");
    });

    it("pwd 应返回当前目录", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("pwd");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("cpim");
    });

    it("whoami 应返回用户名", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("whoami");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("admin");
    });

    it("echo hello 应输出 hello", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("echo hello");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toBe("hello");
    });

    it("df 应显示磁盘信息", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("df");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("Filesystem");
    });

    it("neofetch 应显示系统信息", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.execute("neofetch");
      });
      const last = result.current.history[result.current.history.length - 1];
      expect(last.output).toContain("M4 Max");
    });
  });
});

// ============================================================
//  覆盖率补测 (第三批 P2) — env 命令 / cpim 子命令 / ai 意图 / Unix / 补全
// ============================================================

describe("useTerminal 覆盖率补测", () => {
  type HookResult = { current: ReturnType<typeof useTerminal> };

  /** 执行命令并返回最后一条历史 */
  function exec(result: HookResult, cmd: string) {
    act(() => {
      result.current.execute(cmd);
    });
    return result.current.history[result.current.history.length - 1];
  }

  /** 等待 ai 建议的 400ms 自动执行 follow-up 触发 */
  async function waitFollowUp(result: HookResult) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 550));
    });
    return result.current.history[result.current.history.length - 1];
  }

  /** 设置输入并返回补全结果 */
  function completionsOf(result: HookResult, input: string): string[] {
    act(() => {
      result.current.handleInputChange(input);
    });
    return result.current.completions;
  }

  beforeEach(() => {
    // env 命令真实读写 localStorage, 每用例前复位单例缓存
    localStorage.removeItem("yyc3_env_config");
    resetEnvConfig();
  });

  // ----------------------------------------------------------
  //  cpim 子命令
  // ----------------------------------------------------------

  describe("cpim 子命令补测", () => {
    it("cpim 裸命令默认显示系统状态", () => {
      const { result } = renderHook(() => useTerminal());
      const last = exec(result, "cpim");
      expect(last.output).toContain("活跃节点");
      expect(last.status).toBe("success");
    });

    it("cpim help / cpim --help 等价 help", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "cpim help").output).toContain("CPIM 命令");
      expect(exec(result, "cpim --help").output).toContain("环境变量 (真实读写)");
    });

    it("cpim node restart 普通与强制模式", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "cpim node restart").output).toContain("已发送重启指令");
      expect(exec(result, "cpim node restart --force").output).toContain("强制重启节点");
    });

    it("cpim model 裸命令/deploy/未知操作", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "cpim model").output).toContain("已部署模型");
      expect(exec(result, "cpim model deploy deepseek-r1").output).toContain("部署模型: deepseek-r1");
      const err = exec(result, "cpim model frob");
      expect(err.output).toContain("未知模型操作");
      expect(err.status).toBe("error");
    });

    it("cpim patrol 裸命令/run/history", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "cpim patrol").output).toContain("巡查状态");
      const run = exec(result, "cpim patrol run");
      expect(run.output).toContain("巡查完成");
      expect(run.output).not.toContain("(完整模式)");
      expect(exec(result, "cpim patrol history").output).toContain("巡查历史");
    });

    it("cpim report 健康 + Markdown 组合", () => {
      const { result } = renderHook(() => useTerminal());
      const last = exec(result, "cpim report --type health --format markdown");
      expect(last.output).toContain("类型: 健康");
      expect(last.output).toContain("格式: Markdown");
    });

    it("cpim config get 命中/未命中/缺 key", () => {
      const { result } = renderHook(() => useTerminal());
      const ok = exec(result, "cpim config get patrol.interval");
      expect(ok.status).toBe("success");
      expect(ok.output).toContain("patrol.interval = 15");
      const miss = exec(result, "cpim config get nope.key");
      expect(miss.status).toBe("error");
      expect(miss.output).toContain("未找到配置项");
      expect(exec(result, "cpim config get").output).toContain("未找到配置项: unknown");
    });

    it("cpim config set 缺 value / 裸 config 用法", () => {
      const { result } = renderHook(() => useTerminal());
      const err = exec(result, "cpim config set patrol.interval");
      expect(err.status).toBe("error");
      expect(err.output).toContain("用法: cpim config set");
      const usage = exec(result, "cpim config");
      expect(usage.status).toBe("info");
      expect(usage.output).toContain("用法: cpim config");
    });
  });

  // ----------------------------------------------------------
  //  env 命令 (真实 env-config 读写)
  // ----------------------------------------------------------

  describe("env 命令", () => {
    it("env 裸命令与 env list 输出全部变量", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "env").output).toContain("环境变量配置");
      expect(exec(result, "env list").output).toContain("SYSTEM_NAME");
    });

    it("env get 命中 / 缺 key / 模糊匹配 / 未找到", () => {
      const { result } = renderHook(() => useTerminal());
      const ok = exec(result, "env get SYSTEM_NAME");
      expect(ok.status).toBe("success");
      expect(ok.output).toContain("SYSTEM_NAME = ");

      expect(exec(result, "env get").output).toContain("用法: env get");
      expect(exec(result, "env get SYSTEM").output).toContain("相似变量");
      expect(exec(result, "env get NOPE_XYZ").output).toContain("未找到环境变量");
    });

    it("env set 布尔/整数/浮点/字符串各类解析", () => {
      const { result } = renderHook(() => useTerminal());

      expect(exec(result, "env set ENABLE_DEBUG true").output).toContain("ENABLE_DEBUG = true");
      expect(exec(result, "env get ENABLE_DEBUG").output).toContain("true");

      expect(exec(result, "env set ENABLE_PWA 1").output).toContain("ENABLE_PWA = true");

      expect(exec(result, "env set SESSION_TIMEOUT_MIN 45").output).toContain("SESSION_TIMEOUT_MIN = 45");
      expect(exec(result, "env get SESSION_TIMEOUT_MIN").output).toContain("45");

      expect(exec(result, "env set DEFAULT_AI_TEMPERATURE 0.85").output).toContain("DEFAULT_AI_TEMPERATURE = 0.85");
      expect(exec(result, "env get DEFAULT_AI_TEMPERATURE").output).toContain("0.85");

      expect(exec(result, 'env set SYSTEM_NAME "My Sys"').output).toContain('"My Sys"');
      expect(exec(result, "env get SYSTEM_NAME").output).toContain("My Sys");
    });

    it("env set 用法缺失 / 未知变量 / 无效数值", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "env set").status).toBe("error");
      expect(exec(result, "env set SYSTEM_NAME").output).toContain("用法: env set");
      expect(exec(result, "env set FOO_KEY bar").output).toContain("未知变量");
      expect(exec(result, "env set SESSION_TIMEOUT_MIN abc").output).toContain("无效数值");
    });

    it("env reset 需确认, --confirm 后清空持久化", () => {
      const { result } = renderHook(() => useTerminal());
      exec(result, "env set ENABLE_DEBUG true");
      expect(localStorage.getItem("yyc3_env_config")).toContain("ENABLE_DEBUG");

      const confirm = exec(result, "env reset");
      expect(confirm.status).toBe("info");
      expect(confirm.output).toContain("env reset --confirm");

      const done = exec(result, "env reset --confirm");
      expect(done.status).toBe("success");
      expect(done.output).toContain("已重置");
      expect(localStorage.getItem("yyc3_env_config")).toBeNull();
      // 重置后回到默认值
      expect(exec(result, "env get ENABLE_DEBUG").output).toContain("false");
    });

    it("env export 与未知子操作", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "env export").output).toContain("_type");
      expect(exec(result, "env frobnicate").output).toContain("未知 env 操作");
    });
  });

  // ----------------------------------------------------------
  //  goto 别名形态
  // ----------------------------------------------------------

  describe("goto 形态补测", () => {
    it("goto 无斜杠路径自动补 /", () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      const last = exec(result, "goto patrol");
      expect(onNavigate).toHaveBeenCalledWith("/patrol");
      expect(last.output).toContain("巡查模式");
    });

    it("open 无斜杠路径自动补 /", () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      exec(result, "open settings");
      expect(onNavigate).toHaveBeenCalledWith("/settings");
    });
  });

  // ----------------------------------------------------------
  //  ai Text-to-CLI 意图矩阵
  // ----------------------------------------------------------

  describe("ai Text-to-CLI 意图", () => {
    it("运维意图: 重启/巡检/模型列表/部署/报告", async () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "ai 重启所有节点").output).toContain("cpim node restart --all --force");
      expect(exec(result, "ai 执行一次巡检").output).toContain("cpim patrol run --full");
      expect(exec(result, "ai 查看模型列表").output).toContain("cpim model list");
      expect(exec(result, "ai 部署模型qwen").output).toContain("cpim model deploy qwen");
      expect(exec(result, "ai 部署新模型").output).toContain("cpim model deploy LLaMA-70B");
      expect(exec(result, "ai 生成性能报表").output).toContain("cpim report --type performance");
      await waitFollowUp(result);
    });

    it("系统意图: env/磁盘/cpu/网络/系统信息/帮助/兜底", async () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "ai 查看环境变量").output).toContain("env list");
      expect(exec(result, "ai 磁盘占用").output).toContain("df");
      expect(exec(result, "ai cpu占用高吗").output).toContain("htop");
      expect(exec(result, "ai ping网关").output).toContain("ping 192.168.3.1");
      expect(exec(result, "ai 看系统信息").output).toContain("neofetch");
      expect(exec(result, "ai 帮助").output).toContain("help");
      expect(exec(result, "ai 随便说点什么").output).toContain("cpim status");
      await waitFollowUp(result);
    });

    it("跳转意图: 监控/巡查/操作/设置/默认", async () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useTerminal({ onNavigate }));
      expect(exec(result, "ai 跳转到监控").output).toContain("goto /");
      // 注: 含"巡查"的提示词会先命中巡查意图分支, 跳转分支的巡查子项不可达
      expect(exec(result, "ai 打开操作中心").output).toContain("goto /operations");
      expect(exec(result, "ai 去设置页").output).toContain("goto /settings");
      expect(exec(result, "ai 跳转").output).toContain("goto /");
      await waitFollowUp(result);
      // follow-up 自动执行建议命令并触发导航
      expect(onNavigate).toHaveBeenCalledWith("/");
      expect(onNavigate).toHaveBeenCalledWith("/operations");
    });

    it("清屏意图: follow-up __CLEAR__ 不追加历史", async () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "ai 清空屏幕").output).toContain("clear");
      const before = result.current.history.length;
      await waitFollowUp(result);
      expect(result.current.history.length).toBe(before);
    });
  });

  // ----------------------------------------------------------
  //  Unix 命令补测
  // ----------------------------------------------------------

  describe("Unix 命令补测", () => {
    it("date / uptime / history / cd / exit / quit", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "date").output.length).toBeGreaterThan(0);
      expect(exec(result, "uptime").output).toContain("load average");
      expect(exec(result, "history").output).toContain("Command history");
      expect(exec(result, "cd logs").output).toBe("");
      expect(exec(result, "exit").output).toContain("Ctrl+");
      expect(exec(result, "quit").output).toContain("Ctrl+");
    });

    it("htop / top / fastfetch / ping 带主机", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "htop").output).toContain("llama-inference");
      expect(exec(result, "top").output).toContain("Tasks:");
      expect(exec(result, "fastfetch").output).toContain("Mac Studio");
      expect(exec(result, "ping nas.local").output).toContain("nas.local");
    });

    it("ls 子目录与未知目录", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "ls logs").output).toContain("node/");
      expect(exec(result, "ls logs/node").output).toContain("GPU-A100-01/");
      const err = exec(result, "ls nope");
      expect(err.status).toBe("error");
      expect(err.output).toContain("No such file or directory");
    });

    it("cat 四个配置文件 / 缺参数 / 未知文件", () => {
      const { result } = renderHook(() => useTerminal());
      expect(exec(result, "cat configs/patrol.json").output).toContain("auto_enabled");
      expect(exec(result, "cat configs/alerts.json").output).toContain("gpu_usage");
      expect(exec(result, "cat configs/templates.json").output).toContain("模型部署标准流程");
      expect(exec(result, "cat configs/env.json").output).toContain("_type");
      expect(exec(result, "cat").output).toContain("missing operand");
      expect(exec(result, "cat nofile.txt").output).toContain("No such file or directory");
    });
  });

  // ----------------------------------------------------------
  //  自动补全补测
  // ----------------------------------------------------------

  describe("自动补全补测", () => {
    it("完整命令名不再补全 (排除自身)", () => {
      const { result } = renderHook(() => useTerminal());
      expect(completionsOf(result, "ls")).toEqual([]);
      expect(completionsOf(result, "env list")).toEqual([]);
    });

    it("env 子命令与变量名补全", () => {
      const { result } = renderHook(() => useTerminal());
      // trim 会吞尾部空格, 单字母前缀逐一验证子命令
      expect(completionsOf(result, "env s")).toEqual(["set"]);
      expect(completionsOf(result, "env r")).toEqual(["reset"]);
      expect(completionsOf(result, "env e")).toEqual(["export"]);
      const keys = completionsOf(result, "env get SYSTEM");
      expect(keys).toContain("SYSTEM_NAME");
      expect(keys).toContain("SYSTEM_VERSION");
      expect(completionsOf(result, "env set DE").length).toBeGreaterThan(0);
    });

    it("cpim 三段式子命令补全", () => {
      const { result } = renderHook(() => useTerminal());
      // 注: prefix 被统一转小写, 大写候选项 (如 GPU-A100-01) 无法匹配, 用小写候选项验证
      expect(completionsOf(result, "cpim model de")).toContain("deploy");
      expect(completionsOf(result, "cpim model mi")).toEqual(["migrate"]);
      expect(completionsOf(result, "cpim node -")).toContain("--force");
      expect(completionsOf(result, "cpim patrol h")).toContain("history");
    });

    it("goto 与 cat 路径补全, 未知前缀无补全", () => {
      const { result } = renderHook(() => useTerminal());
      const routes = completionsOf(result, "goto /");
      expect(routes).toContain("/patrol");
      expect(routes).toContain("/terminal");
      expect(completionsOf(result, "cat configs/p")).toEqual(["configs/patrol.json"]);
      expect(completionsOf(result, "cat configs").length).toBeGreaterThan(3);
      expect(completionsOf(result, "zzz q")).toEqual([]);
    });

    it("applyCompletion 空输入时以补全词开头", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.applyCompletion("cpim");
      });
      expect(result.current.inputValue).toBe("cpim ");
    });
  });

  // ----------------------------------------------------------
  //  历史导航兜底
  // ----------------------------------------------------------

  describe("历史导航兜底", () => {
    it("无历史时 up 导航无操作", () => {
      const { result } = renderHook(() => useTerminal());
      act(() => {
        result.current.handleHistoryNav("up");
      });
      expect(result.current.inputValue).toBe("");
    });

    it("up 导航到达最旧命令后不再越界", () => {
      const { result } = renderHook(() => useTerminal());
      exec(result, "only-cmd");
      act(() => {
        result.current.handleHistoryNav("up");
      });
      expect(result.current.inputValue).toBe("only-cmd");
      act(() => {
        result.current.handleHistoryNav("up");
      });
      // 已是最旧, 保持不变
      expect(result.current.inputValue).toBe("only-cmd");
    });
  });
});
