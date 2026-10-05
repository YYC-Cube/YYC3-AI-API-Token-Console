/**
 * CreateRuleModal.test.tsx
 * ==========================
 * 新建/编辑告警规则模态框测试
 *
 * 覆盖范围:
 * - open 开关渲染 / 标题 / 必填控件
 * - 提交校验 (名称 / 节点为空)
 * - 阈值增删与字段更新
 * - 聚合 / 去重开关与输入
 * - 升级策略: 增删 (上限 3) / 延迟 / 自动动作 / 通知渠道切换 (含兜底回退)
 * - 目标节点切换
 * - 编辑模式回填 + enabled 透传 + 不重置表单
 * - 遮罩/内容点击 / 取消按钮
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CreateRuleModal } from "../components/CreateRuleModal";
import { I18nContext } from "../hooks/useI18n";
import type { AlertRule } from "../types";
import zhCN from "../i18n/zh-CN";

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null) return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

const mockI18n = {
  locale: "zh-CN" as const,
  setLocale: vi.fn(),
  t: (key: string, vars?: Record<string, string | number>) => {
    let raw = getNestedValue(zhCN as Record<string, any>, key);
    if (vars) {
      raw = raw.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        vars[k] != null ? String(vars[k]) : `{${k}}`
      );
    }
    return raw;
  },
  locales: [],
};

const editRuleFixture: AlertRule = {
  id: "rule-9",
  name: "GPU 高温告警",
  enabled: false,
  severity: "critical",
  thresholds: [{ metric: "gpu", condition: "gte", value: 95, unit: "%", duration: 120 }],
  aggregation: { enabled: false, windowMinutes: 3, maxGroupSize: 5 },
  deduplication: { enabled: false, cooldownMinutes: 30 },
  escalation: [{ level: 1, delayMinutes: 5, notifyChannels: ["email"], autoAction: "auto_scale" }],
  targets: ["NAS-01"],
  createdAt: 1,
  lastTriggered: null,
  triggerCount: 0,
};

function renderRuleModal(props: Partial<React.ComponentProps<typeof CreateRuleModal>> = {}) {
  const defaultProps = { open: true, onClose: vi.fn(), onSubmit: vi.fn() };
  return render(
    <I18nContext.Provider value={mockI18n}>
      <CreateRuleModal {...defaultProps} {...props} />
    </I18nContext.Provider>
  );
}

describe("CreateRuleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("显示/隐藏", () => {
    it("open=false 时不渲染任何内容", () => {
      const { container } = renderRuleModal({ open: false });
      expect(container.innerHTML).toBe("");
    });

    it("应渲染标题与必填控件", () => {
      renderRuleModal();
      expect(screen.getByText("新建告警规则")).toBeInTheDocument();
      expect(screen.getByTestId("rule-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("add-threshold-btn")).toBeInTheDocument();
      expect(screen.getByTestId("agg-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("dedup-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("node-GPU-A100-01")).toBeInTheDocument();
      expect(screen.getByText("新建规则")).toBeInTheDocument();
    });
  });

  describe("提交校验", () => {
    it("名称为空时提交应显示必填错误且不调用 onSubmit", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(screen.getByText("请填写必填项")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("取消全部节点时提交应显示必填错误", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "新规则" } });
      fireEvent.click(screen.getByTestId("node-GPU-A100-01")); // 取消默认选中节点
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(screen.getByText("请填写必填项")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("创建模式提交", () => {
    it("完整提交应收到默认表单载荷并重置表单", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "  新规则  " } });
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload).toEqual({
        name: "新规则",
        enabled: true,
        severity: "warning",
        thresholds: [{ metric: "gpu", condition: "gt", value: 90, unit: "%", duration: 60 }],
        aggregation: { enabled: true, windowMinutes: 5, maxGroupSize: 10 },
        deduplication: { enabled: true, cooldownMinutes: 15 },
        escalation: [{ level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] }],
        targets: ["GPU-A100-01"],
      });
      // 创建模式提交后表单重置
      expect((screen.getByTestId("rule-name-input") as HTMLInputElement).value).toBe("");
    });

    it("切换严重级别应体现在载荷", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.click(screen.getByTestId("severity-critical"));
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].severity).toBe("critical");
    });
  });

  describe("阈值管理", () => {
    it("新增/删除阈值行", () => {
      renderRuleModal();
      expect(screen.getAllByTestId(/^threshold-metric-/)).toHaveLength(1);
      fireEvent.click(screen.getByTestId("add-threshold-btn"));
      expect(screen.getAllByTestId(/^threshold-metric-/)).toHaveLength(2);
      expect(screen.getByTestId("remove-threshold-0")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("remove-threshold-0"));
      expect(screen.getAllByTestId(/^threshold-metric-/)).toHaveLength(1);
    });

    it("阈值字段更新应体现在载荷", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.change(screen.getByTestId("threshold-metric-0"), { target: { value: "memory" } });
      fireEvent.change(screen.getByTestId("threshold-condition-0"), { target: { value: "lt" } });
      fireEvent.change(screen.getByTestId("threshold-value-0"), { target: { value: "50" } });
      fireEvent.change(screen.getByPlaceholderText("单位"), { target: { value: "GB" } });
      fireEvent.change(screen.getByTitle("持续时间(秒)"), { target: { value: "30" } });
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].thresholds).toEqual([
        { metric: "memory", condition: "lt", value: 50, unit: "GB", duration: 30 },
      ]);
    });
  });

  describe("聚合与去重", () => {
    it("关闭聚合开关应隐藏窗口/组输入", () => {
      renderRuleModal();
      expect(screen.getByTestId("agg-window-input")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("agg-toggle"));
      expect(screen.queryByTestId("agg-window-input")).not.toBeInTheDocument();
    });

    it("关闭去重开关应隐藏冷却输入", () => {
      renderRuleModal();
      fireEvent.click(screen.getByTestId("dedup-toggle"));
      expect(screen.queryByTestId("dedup-cooldown-input")).not.toBeInTheDocument();
    });

    it("聚合窗口/组数与去重冷却输入应体现在载荷", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.change(screen.getByTestId("agg-window-input"), { target: { value: "10" } });
      // maxGroup 输入框无 testid: 经窗口输入的包裹层定位其兄弟节点
      const maxGroupInput = screen
        .getByTestId("agg-window-input")!
        .closest("div")!
        .nextElementSibling!.querySelector("input")!;
      fireEvent.change(maxGroupInput, { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("dedup-cooldown-input"), { target: { value: "60" } });
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.aggregation).toEqual({ enabled: true, windowMinutes: 10, maxGroupSize: 20 });
      expect(payload.deduplication).toEqual({ enabled: true, cooldownMinutes: 60 });
    });
  });

  describe("升级策略", () => {
    it("新增升级策略至 3 级后新增按钮消失", () => {
      renderRuleModal();
      expect(screen.getAllByTestId(/^escalation-delay-/)).toHaveLength(1);
      fireEvent.click(screen.getByTestId("add-escalation-btn"));
      fireEvent.click(screen.getByTestId("add-escalation-btn"));
      expect(screen.getAllByTestId(/^escalation-delay-/)).toHaveLength(3);
      expect(screen.queryByTestId("add-escalation-btn")).not.toBeInTheDocument();
    });

    it("删除升级策略", () => {
      renderRuleModal();
      fireEvent.click(screen.getByTestId("add-escalation-btn"));
      expect(screen.getAllByTestId(/^escalation-delay-/)).toHaveLength(2);
      // 第二条升级策略所在行 (delay 输入 → grid → 行容器)
      const row = screen.getByTestId("escalation-delay-1").closest("div.grid")!.parentElement!;
      // 行内唯一无文字按钮即删除按钮 (渠道按钮均有文字)
      const deleteBtn = within(row)
        .getAllByRole("button")
        .find((btn) => btn.textContent === "")!;
      fireEvent.click(deleteBtn);
      expect(screen.getAllByTestId(/^escalation-delay-/)).toHaveLength(1);
    });

    it("延迟与自动动作输入应体现在载荷", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.change(screen.getByTestId("escalation-delay-0"), { target: { value: "7" } });
      fireEvent.change(screen.getByPlaceholderText("e.g. auto_scale"), {
        target: { value: "auto_restart" },
      });
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].escalation[0]).toEqual({
        level: 1,
        delayMinutes: 7,
        notifyChannels: ["dashboard"],
        autoAction: "auto_restart",
      });
    });

    it("切换通知渠道应增删 email", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.click(screen.getByTestId("channel-email-0"));
      fireEvent.click(screen.getByTestId("channel-webhook-0"));
      fireEvent.click(screen.getByTestId("channel-webhook-0")); // 再点一次移除
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].escalation[0].notifyChannels).toEqual([
        "dashboard",
        "email",
      ]);
    });

    it("移除唯一渠道时应兜底回退到 dashboard", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.click(screen.getByTestId("channel-dashboard-0")); // 移除唯一渠道
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].escalation[0].notifyChannels).toEqual(["dashboard"]);
    });
  });

  describe("目标节点", () => {
    it("切换节点应体现在载荷", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ onSubmit });
      fireEvent.change(screen.getByTestId("rule-name-input"), { target: { value: "R" } });
      fireEvent.click(screen.getByTestId("node-GPU-A100-01")); // 取消
      fireEvent.click(screen.getByTestId("node-NAS-01")); // 新增
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      expect(onSubmit.mock.calls[0][0].targets).toEqual(["NAS-01"]);
    });
  });

  describe("编辑模式", () => {
    it("应回填 editRule 字段并透传 enabled", () => {
      const onSubmit = vi.fn();
      renderRuleModal({ editRule: editRuleFixture, onSubmit });
      expect(screen.getByText("编辑告警规则")).toBeInTheDocument();
      expect(screen.getByText("保存修改")).toBeInTheDocument();
      expect((screen.getByTestId("rule-name-input") as HTMLInputElement).value).toBe(
        "GPU 高温告警"
      );
      expect((screen.getByTestId("threshold-value-0") as HTMLInputElement).value).toBe("95");
      expect(screen.getByTestId("node-NAS-01")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("submit-rule-btn"));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.name).toBe("GPU 高温告警");
      expect(payload.enabled).toBe(false);
      expect(payload.severity).toBe("critical");
      // 编辑模式提交后不重置表单
      expect((screen.getByTestId("rule-name-input") as HTMLInputElement).value).toBe(
        "GPU 高温告警"
      );
    });
  });

  describe("关闭行为", () => {
    it("点击遮罩应调用 onClose", () => {
      const onClose = vi.fn();
      renderRuleModal({ onClose });
      fireEvent.click(screen.getByTestId("create-rule-modal-overlay"));
      expect(onClose).toHaveBeenCalled();
    });

    it("点击弹窗内容不应关闭", () => {
      const onClose = vi.fn();
      renderRuleModal({ onClose });
      fireEvent.click(screen.getByTestId("create-rule-modal"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("点击取消按钮应调用 onClose", () => {
      const onClose = vi.fn();
      renderRuleModal({ onClose });
      fireEvent.click(screen.getByTestId("cancel-btn"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
