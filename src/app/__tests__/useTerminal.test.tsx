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
