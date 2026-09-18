/**
 * ThemeCustomizer.tsx
 * ====================
 * 主题自定义模块 · 完整颜色系统 / 排版 / 阴影 / 品牌 / 预设
 * 采用 OKLch + HEX 双模式颜色管理
 */

import React, { useState, useCallback, useRef, useContext } from "react";
import {
  Palette, Upload, RotateCcw, Check, ChevronDown, Search,
  Type, BoxSelect, Sun, Moon, Eye, Image, Save,
  X, Circle,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { YYC3Logo } from "./YYC3Logo";
import { ColorSwatch } from "./theme/ColorSwatch";
import { hexToOklch, formatOklch, oklchToHex } from "./theme/color-utils";
import {
  THEME_PRESETS, DEFAULT_COLORS, DEFAULT_TYPOGRAPHY, DEFAULT_SHADOW, DEFAULT_BRANDING,
  type ThemeColors, type ThemeTypography, type ThemeShadow, type BrandingConfig, type ThemePreset,
} from "./theme/theme-presets";
import { ViewContext } from "../lib/view-context";

// ── Section Accordion ───────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[rgba(0,180,255,0.08)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-[rgba(0,20,40,0.3)] hover:bg-[rgba(0,20,40,0.5)] transition-all text-left"
      >
        <Icon className="w-4 h-4 text-[#00d4ff] shrink-0" style={{ opacity: 0.7 }} />
        <span className="flex-1 text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-[rgba(0,212,255,0.3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 bg-[rgba(0,10,20,0.2)]">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Color pair row ──────────────────────────────────
function ColorPairRow({ label1, value1, onChange1, label2, value2, onChange2 }: {
  label1: string; value1: string; onChange1: (v: string) => void;
  label2?: string; value2?: string; onChange2?: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ColorSwatch label={label1} value={value1} onChange={onChange1} />
      {label2 && value2 && onChange2 ? (
        <ColorSwatch label={label2} value={value2} onChange={onChange2} />
      ) : <div />}
    </div>
  );
}

export function ThemeCustomizer() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  // ── State ──
  const [colors, setColors] = useState<ThemeColors>({ ...DEFAULT_COLORS });
  const [typography, setTypography] = useState<ThemeTypography>({ ...DEFAULT_TYPOGRAPHY });
  const [shadow, setShadow] = useState<ThemeShadow>({ ...DEFAULT_SHADOW });
  const [branding, setBranding] = useState<BrandingConfig>({ ...DEFAULT_BRANDING });
  const [radius, setRadius] = useState(0.5);
  const [activePreset, setActivePreset] = useState("base");
  const [searchQuery, setSearchQuery] = useState("");
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [lightness, setLightness] = useState(50); // theme lightness control
  const [bgPreview, setBgPreview] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  // ── Color updater ──
  const setColor = useCallback((key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Apply preset ──
  const applyPreset = useCallback((preset: ThemePreset) => {
    setColors({ ...preset.colors });
    setActivePreset(preset.id);
    setPresetDropdownOpen(false);
  }, []);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setColors({ ...DEFAULT_COLORS });
    setTypography({ ...DEFAULT_TYPOGRAPHY });
    setShadow({ ...DEFAULT_SHADOW });
    setBranding({ ...DEFAULT_BRANDING });
    setRadius(0.5);
    setActivePreset("base");
    setLightness(50);
    setBgPreview("");
  }, []);

  // ── Background upload ──
  const handleBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setBgPreview(url);
      setBranding((prev) => ({ ...prev, backgroundUrl: url }));
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Lightness-based theme adjustment ──
  const adjustedPrimary = (() => {
    const oklch = hexToOklch(colors.primary);
    const newL = Math.max(0.05, Math.min(0.95, lightness / 100));
    return oklchToHex(newL, oklch.C, oklch.h);
  })();

  // ── Shadow CSS preview ──
  const shadowCss = `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;

  // ── Filter presets ──
  const filteredPresets = THEME_PRESETS.filter(
    (p) => p.name.includes(searchQuery) || p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentPresetName = THEME_PRESETS.find((p) => p.id === activePreset)?.name ?? "自定义";

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-3 md:px-6 py-4 md:py-6 space-y-5">
      {/* ════ Header ════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-[#00d4ff]" />
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              主题自定义
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
              OKLch + HEX 颜色系统 · 预设 / 自定义主题
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(0,180,255,0.15)] bg-[rgba(0,20,40,0.3)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:border-[rgba(0,180,255,0.3)] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <Save className="w-3.5 h-3.5" />
            保存主题
          </button>
        </div>
      </div>

      {/* ════ Top dropdowns ════ */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Preset dropdown */}
        <div className="relative flex-1 min-w-[200px]" ref={presetDropdownRef}>
          <button
            onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(0,180,255,0.15)] bg-[rgba(0,20,40,0.4)] hover:border-[rgba(0,180,255,0.3)] transition-all"
          >
            <Search className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
            <span className="flex-1 text-left text-[#c0dcf0] truncate" style={{ fontSize: "0.78rem" }}>
              {presetDropdownOpen ? "" : `预设系统: ${currentPresetName}`}
            </span>
            {presetDropdownOpen && (
              <input
                autoFocus
                className="absolute inset-0 pl-10 pr-8 bg-transparent text-[#e0f0ff] outline-none"
                style={{ fontSize: "0.78rem" }}
                placeholder="🔍 搜索设计系统..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] transition-transform ${presetDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {presetDropdownOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-[rgba(0,180,255,0.2)] bg-[rgba(8,18,38,0.97)] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-h-[240px] overflow-y-auto">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[rgba(0,212,255,0.06)] transition-all text-left ${
                    activePreset === preset.id ? "bg-[rgba(0,212,255,0.08)]" : ""
                  }`}
                >
                  {/* Mini color chips */}
                  <div className="flex gap-0.5 shrink-0">
                    {[preset.colors.primary, preset.colors.accent, preset.colors.background, preset.colors.destructive].map((c, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-sm border border-[rgba(255,255,255,0.08)]" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.75rem" }}>{preset.name}</p>
                    <p className="text-[rgba(0,212,255,0.25)] truncate" style={{ fontSize: "0.58rem" }}>{preset.nameEn}</p>
                  </div>
                  {activePreset === preset.id && (
                    <Check className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                  )}
                </button>
              ))}
              {filteredPresets.length === 0 && (
                <div className="py-4 text-center text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.72rem" }}>
                  无匹配预设
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ Main Layout: Left settings + Right preview ════ */}
      <div className={`flex gap-5 ${isMobile ? "flex-col" : ""}`}>
        {/* ── Left: Settings Panel ── */}
        <div className={`space-y-3 ${isMobile ? "w-full" : "w-[420px] shrink-0"} overflow-y-auto`} style={{ maxHeight: isMobile ? "none" : "calc(100vh - 260px)" }}>

          {/* ══ 0. Branding ══ */}
          <Section title="品牌设置 · Logo / 系统信息 / 标语 / 背景" icon={Image} defaultOpen={true}>
            <div className="space-y-3">
              {/* Logo preview */}
              <div className="flex items-center gap-3">
                <YYC3Logo size="lg" glow showStatus={false} />
                <div className="flex-1 space-y-1.5">
                  <label className="block text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>系统名称</label>
                  <input
                    className="w-full bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.12)] rounded-lg px-3 py-1.5 text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors"
                    style={{ fontSize: "0.78rem" }}
                    value={branding.systemName}
                    onChange={(e) => setBranding((p) => ({ ...p, systemName: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.62rem" }}>标语 (Tagline)</label>
                <input
                  className="w-full bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.12)] rounded-lg px-3 py-1.5 text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors"
                  style={{ fontSize: "0.78rem" }}
                  value={branding.tagline}
                  onChange={(e) => setBranding((p) => ({ ...p, tagline: e.target.value }))}
                />
              </div>

              {/* Background upload */}
              <div>
                <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.62rem" }}>背景图片</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[rgba(0,180,255,0.2)] bg-[rgba(0,20,40,0.3)] text-[rgba(0,212,255,0.5)] hover:border-[#00d4ff] hover:text-[#00d4ff] transition-all"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    上传背景
                  </button>
                  {bgPreview && (
                    <button
                      onClick={() => { setBgPreview(""); setBranding((p) => ({ ...p, backgroundUrl: "" })); }}
                      className="text-[rgba(255,100,100,0.6)] hover:text-[#ff6666] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgUpload}
                    className="hidden"
                  />
                </div>
                {bgPreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[rgba(0,180,255,0.1)]" style={{ height: 80 }}>
                    <img src={bgPreview} alt="bg" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ══ 1. Colors ══ */}
          <Section title="1. 颜色 · 语义化变量" icon={Palette} defaultOpen={true}>
            <div className="space-y-2">
              <ColorPairRow label1="主色" value1={colors.primary} onChange1={(v) => setColor("primary", v)} label2="主前景色" value2={colors.primaryForeground} onChange2={(v) => setColor("primaryForeground", v)} />
              <ColorPairRow label1="次色" value1={colors.secondary} onChange1={(v) => setColor("secondary", v)} label2="次前景色" value2={colors.secondaryForeground} onChange2={(v) => setColor("secondaryForeground", v)} />
              <ColorPairRow label1="强调色" value1={colors.accent} onChange1={(v) => setColor("accent", v)} label2="强调色前景" value2={colors.accentForeground} onChange2={(v) => setColor("accentForeground", v)} />
              <ColorPairRow label1="背景色" value1={colors.background} onChange1={(v) => setColor("background", v)} label2="前景色" value2={colors.foreground} onChange2={(v) => setColor("foreground", v)} />
              <ColorPairRow label1="卡片" value1={colors.card} onChange1={(v) => setColor("card", v)} label2="卡片前景色" value2={colors.cardForeground} onChange2={(v) => setColor("cardForeground", v)} />
              <ColorPairRow label1="弹窗" value1={colors.popover} onChange1={(v) => setColor("popover", v)} label2="弹窗前景色" value2={colors.popoverForeground} onChange2={(v) => setColor("popoverForeground", v)} />
              <ColorPairRow label1="柔和色" value1={colors.muted} onChange1={(v) => setColor("muted", v)} label2="柔和前景色" value2={colors.mutedForeground} onChange2={(v) => setColor("mutedForeground", v)} />
              <ColorPairRow label1="破坏性" value1={colors.destructive} onChange1={(v) => setColor("destructive", v)} label2="破坏性前景色" value2={colors.destructiveForeground} onChange2={(v) => setColor("destructiveForeground", v)} />
              <ColorPairRow label1="边框" value1={colors.border} onChange1={(v) => setColor("border", v)} />
              <ColorSwatch label="输入" value={colors.input} onChange={(v) => setColor("input", v)} />
            </div>
          </Section>

          {/* ══ 2. Ring & Charts & Sidebar ══ */}
          <Section title="2. 环形区域 · 图表 / 侧边栏" icon={Circle}>
            <div className="space-y-2">
              <ColorSwatch label="环形 (Ring)" value={colors.ring} onChange={(v) => setColor("ring", v)} />

              <p className="text-[rgba(0,212,255,0.3)] pt-1" style={{ fontSize: "0.62rem" }}>图表颜色</p>
              <div className="grid grid-cols-2 gap-2">
                <ColorSwatch label="图表 1" value={colors.chart1} onChange={(v) => setColor("chart1", v)} />
                <ColorSwatch label="图表 2" value={colors.chart2} onChange={(v) => setColor("chart2", v)} />
                <ColorSwatch label="图表 3" value={colors.chart3} onChange={(v) => setColor("chart3", v)} />
                <ColorSwatch label="图表 4" value={colors.chart4} onChange={(v) => setColor("chart4", v)} />
                <ColorSwatch label="图表 5" value={colors.chart5} onChange={(v) => setColor("chart5", v)} />
                <ColorSwatch label="图表 6" value={colors.chart6} onChange={(v) => setColor("chart6", v)} />
              </div>

              <p className="text-[rgba(0,212,255,0.3)] pt-2" style={{ fontSize: "0.62rem" }}>侧边栏颜色</p>
              <div className="space-y-2">
                <ColorPairRow label1="侧边栏" value1={colors.sidebar} onChange1={(v) => setColor("sidebar", v)} label2="侧边栏前景色" value2={colors.sidebarForeground} onChange2={(v) => setColor("sidebarForeground", v)} />
                <ColorPairRow label1="侧边栏主色" value1={colors.sidebarPrimary} onChange1={(v) => setColor("sidebarPrimary", v)} label2="侧边栏主前景色" value2={colors.sidebarPrimaryForeground} onChange2={(v) => setColor("sidebarPrimaryForeground", v)} />
                <ColorPairRow label1="侧边栏强调色" value1={colors.sidebarAccent} onChange1={(v) => setColor("sidebarAccent", v)} label2="侧边栏强调色前景" value2={colors.sidebarAccentForeground} onChange2={(v) => setColor("sidebarAccentForeground", v)} />
                <ColorPairRow label1="侧边栏边框" value1={colors.sidebarBorder} onChange1={(v) => setColor("sidebarBorder", v)} label2="侧边栏环形元素" value2={colors.sidebarRing} onChange2={(v) => setColor("sidebarRing", v)} />
              </div>
            </div>
          </Section>

          {/* ══ 3. Typography ══ */}
          <Section title="3. 字体排版 · 字体家族" icon={Type}>
            <div className="space-y-3">
              {([
                { label: "无衬线字体 (Sans-Serif)", key: "sansSerif" as const, sample: "Rajdhani ABCdef 0123" },
                { label: "衬线字体 (Serif)", key: "serif" as const, sample: "Georgia ABCdef 0123" },
                { label: "等宽字体 (Monospace)", key: "mono" as const, sample: "JetBrains Mono 0x1F4" },
              ]).map(({ label, key, sample }) => (
                <div key={key}>
                  <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.62rem" }}>{label}</label>
                  <input
                    className="w-full bg-[rgba(0,20,40,0.5)] border border-[rgba(0,180,255,0.12)] rounded-lg px-3 py-1.5 text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors"
                    style={{ fontSize: "0.72rem", fontFamily: "monospace" }}
                    value={typography[key]}
                    onChange={(e) => setTypography((p) => ({ ...p, [key]: e.target.value }))}
                  />
                  <p
                    className="mt-1 text-[rgba(0,212,255,0.25)] truncate"
                    style={{ fontSize: "0.75rem", fontFamily: typography[key] }}
                  >
                    {sample}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ══ 4. Shadow & Radius ══ */}
          <Section title="4. 阴影 / 圆角 · 透明度" icon={BoxSelect}>
            <div className="space-y-3">
              {/* Radius */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>圆角 (Radius)</label>
                  <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem", fontFamily: "monospace" }}>{radius}rem</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className="w-full accent-[#00d4ff] h-1.5"
                />
              </div>

              {/* Shadow controls */}
              <div>
                <label className="block text-[rgba(0,212,255,0.4)] mb-2" style={{ fontSize: "0.62rem" }}>阴影 (Shadow)</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "X 偏移量", key: "offsetX" as const, min: -20, max: 20 },
                    { label: "Y 偏移量", key: "offsetY" as const, min: -20, max: 20 },
                    { label: "模糊半径", key: "blur" as const, min: 0, max: 50 },
                    { label: "传播距离", key: "spread" as const, min: -10, max: 20 },
                  ]).map(({ label, key, min, max }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.58rem" }}>{label}</span>
                        <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.55rem", fontFamily: "monospace" }}>{shadow[key]}px</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={shadow[key]}
                        onChange={(e) => setShadow((p) => ({ ...p, [key]: parseInt(e.target.value) }))}
                        className="w-full accent-[#00d4ff] h-1"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <ColorSwatch label="扩散颜色" value={shadow.color.substring(0, 7) || "#000000"} onChange={(v) => setShadow((p) => ({ ...p, color: v + "0d" }))} />
                </div>

                {/* Shadow preview */}
                <div className="mt-2 flex items-center justify-center py-4">
                  <div
                    className="w-24 h-14 rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,180,255,0.1)]"
                    style={{ boxShadow: shadowCss, borderRadius: `${radius}rem` }}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ══ 5. Theme Lightness ══ */}
          <Section title="5. 主题色 OKLch · 亮度调节" icon={Sun}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Moon className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={lightness}
                  onChange={(e) => setLightness(parseInt(e.target.value))}
                  className="flex-1 accent-[#00d4ff] h-1.5"
                />
                <Sun className="w-3.5 h-3.5 text-[rgba(255,220,100,0.5)]" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md border border-[rgba(255,255,255,0.1)]" style={{ backgroundColor: adjustedPrimary }} />
                <div>
                  <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                    亮度: {lightness}% → {formatOklch(hexToOklch(adjustedPrimary))}
                  </p>
                  <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem", fontFamily: "monospace" }}>
                    {adjustedPrimary.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="flex-1 min-w-0">
          <GlassCard className="p-4 sticky top-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#00d4ff]" style={{ opacity: 0.6 }} />
                <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>实时预览</span>
              </div>
              <div className="flex items-center gap-1">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      activePreset === p.id
                        ? "border-[#00d4ff] scale-125 shadow-[0_0_6px_rgba(0,212,255,0.4)]"
                        : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)]"
                    }`}
                    style={{ backgroundColor: p.colors.primary }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview card */}
            <div
              className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]"
              style={{
                backgroundColor: colors.background,
                backgroundImage: bgPreview ? `url(${bgPreview})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Header bar */}
              <div
                className="px-4 py-3 flex items-center gap-3 border-b"
                style={{ backgroundColor: colors.sidebar, borderColor: colors.sidebarBorder }}
              >
                <YYC3Logo size="sm" glow={false} showStatus={false} />
                <div className="flex-1 min-w-0">
                  <p style={{ color: colors.sidebarForeground, fontSize: "0.78rem" }} className="truncate">
                    {branding.systemName}
                  </p>
                  <p style={{ color: colors.sidebarAccentForeground, fontSize: "0.55rem" }} className="truncate">
                    {branding.tagline}
                  </p>
                </div>
              </div>

              {/* Content area */}
              <div className="p-4 space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "节点", val: "12/13", color: colors.chart1 },
                    { label: "GPU", val: "87%", color: colors.chart2 },
                    { label: "延迟", val: "1.2s", color: colors.chart3 },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg px-3 py-2 border"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: `${radius}rem`,
                        boxShadow: shadowCss,
                      }}
                    >
                      <p style={{ color: colors.mutedForeground, fontSize: "0.55rem" }}>{s.label}</p>
                      <p style={{ color: s.color, fontSize: "0.9rem", fontFamily: typography.mono }}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground,
                      fontSize: "0.68rem",
                      borderRadius: `${radius}rem`,
                    }}
                  >
                    主要操作
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg border"
                    style={{
                      backgroundColor: colors.secondary,
                      color: colors.secondaryForeground,
                      borderColor: colors.border,
                      fontSize: "0.68rem",
                      borderRadius: `${radius}rem`,
                    }}
                  >
                    次要操作
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: colors.destructive,
                      color: colors.destructiveForeground,
                      fontSize: "0.68rem",
                      borderRadius: `${radius}rem`,
                    }}
                  >
                    破坏性
                  </button>
                </div>

                {/* Alert card */}
                <div
                  className="rounded-lg px-3 py-2 border-l-2"
                  style={{
                    backgroundColor: colors.muted,
                    borderLeftColor: colors.destructive,
                    borderRadius: `${radius}rem`,
                  }}
                >
                  <p style={{ color: colors.foreground, fontSize: "0.68rem" }}>⚠️ GPU-A100-03 推理延迟异常</p>
                  <p style={{ color: colors.mutedForeground, fontSize: "0.55rem" }}>2,450ms {">"} 2,000ms · 建议迁移模型</p>
                </div>

                {/* Chart color strip */}
                <div>
                  <p style={{ color: colors.mutedForeground, fontSize: "0.55rem", marginBottom: 4 }}>图表颜色</p>
                  <div className="flex gap-1">
                    {[colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5, colors.chart6].map((c, i) => (
                      <div key={i} className="flex-1 h-4 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                {/* Typography preview */}
                <div className="space-y-1">
                  <p style={{ color: colors.foreground, fontSize: "0.75rem", fontFamily: typography.sansSerif }}>
                    Sans-Serif: {typography.sansSerif.split(",")[0]}
                  </p>
                  <p style={{ color: colors.foreground, fontSize: "0.75rem", fontFamily: typography.serif }}>
                    Serif: {typography.serif.split(",")[0]}
                  </p>
                  <p style={{ color: colors.foreground, fontSize: "0.75rem", fontFamily: typography.mono }}>
                    Mono: {typography.mono.split(",")[0]}
                  </p>
                </div>

                {/* Input preview */}
                <div
                  className="rounded-lg px-3 py-1.5 border"
                  style={{
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    borderRadius: `${radius}rem`,
                  }}
                >
                  <p style={{ color: colors.mutedForeground, fontSize: "0.62rem" }}>搜索节点...</p>
                </div>
              </div>
            </div>

            {/* Preset palette */}
            <div className="mt-4">
              <p className="text-[rgba(0,212,255,0.3)] mb-2" style={{ fontSize: "0.62rem" }}>预设主题</p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl border p-2.5 transition-all text-left ${
                      activePreset === preset.id
                        ? "border-[rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.06)] shadow-[0_0_12px_rgba(0,212,255,0.1)]"
                        : "border-[rgba(0,180,255,0.08)] bg-[rgba(0,20,40,0.2)] hover:border-[rgba(0,180,255,0.2)]"
                    }`}
                  >
                    {/* Color chips */}
                    <div className="flex gap-0.5 mb-2">
                      {[preset.colors.primary, preset.colors.background, preset.colors.accent, preset.colors.destructive, preset.colors.chart2].map((c, i) => (
                        <div key={i} className="w-full h-3 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.68rem" }}>{preset.name}</p>
                    <p className="text-[rgba(0,212,255,0.2)] truncate" style={{ fontSize: "0.52rem" }}>{preset.nameEn}</p>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}