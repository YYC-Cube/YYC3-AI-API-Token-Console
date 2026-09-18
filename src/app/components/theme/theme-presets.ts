/**
 * theme-presets.ts
 * =================
 * 预设主题配置
 */

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  colors: ThemeColors;
}

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export const DEFAULT_COLORS: ThemeColors = {
  primary: "#00d4ff",
  primaryForeground: "#060e1f",
  secondary: "#1a3a5c",
  secondaryForeground: "#80dfff",
  accent: "#0a2838",
  accentForeground: "#00d4ff",
  background: "#060e1f",
  foreground: "#e0f0ff",
  card: "#0a1e3c",
  cardForeground: "#e0f0ff",
  popover: "#0a1e3c",
  popoverForeground: "#e0f0ff",
  muted: "#0e2440",
  mutedForeground: "#6bb8d9",
  destructive: "#ff3366",
  destructiveForeground: "#ffffff",
  border: "#0f3050",
  input: "#0a1e3c",
  ring: "#00d4ff",
  chart1: "#00d4ff",
  chart2: "#00ff88",
  chart3: "#ff6600",
  chart4: "#aa55ff",
  chart5: "#ffdd00",
  chart6: "#ff44aa",
  sidebar: "#081428",
  sidebarForeground: "#e0f0ff",
  sidebarPrimary: "#00d4ff",
  sidebarPrimaryForeground: "#060e1f",
  sidebarAccent: "#0a2838",
  sidebarAccentForeground: "#80dfff",
  sidebarBorder: "#0f3050",
  sidebarRing: "#00d4ff",
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "base",
    name: "基础色调",
    nameEn: "Base Tone",
    colors: { ...DEFAULT_COLORS },
  },
  {
    id: "cosmic-night",
    name: "宇宙之夜",
    nameEn: "Cosmic Night",
    colors: {
      ...DEFAULT_COLORS,
      primary: "#7c5cfc",
      primaryForeground: "#0a0618",
      secondary: "#2a1a4c",
      secondaryForeground: "#b8a0ff",
      accent: "#1a1038",
      accentForeground: "#7c5cfc",
      background: "#080618",
      foreground: "#e8e0ff",
      card: "#100c28",
      cardForeground: "#e8e0ff",
      popover: "#100c28",
      popoverForeground: "#e8e0ff",
      muted: "#18103c",
      mutedForeground: "#9080cc",
      border: "#201848",
      ring: "#7c5cfc",
      chart1: "#7c5cfc",
      chart2: "#00e8a0",
      chart3: "#ff8844",
      chart4: "#ff55aa",
      chart5: "#44ccff",
      chart6: "#ffcc00",
      sidebar: "#0a0820",
      sidebarForeground: "#e8e0ff",
      sidebarPrimary: "#7c5cfc",
      sidebarPrimaryForeground: "#0a0618",
      sidebarAccent: "#1a1038",
      sidebarAccentForeground: "#b8a0ff",
      sidebarBorder: "#201848",
      sidebarRing: "#7c5cfc",
    },
  },
  {
    id: "soft-pop",
    name: "柔和流行",
    nameEn: "Soft Pop",
    colors: {
      ...DEFAULT_COLORS,
      primary: "#f472b6",
      primaryForeground: "#1a0610",
      secondary: "#3c1a2c",
      secondaryForeground: "#ffa0d0",
      accent: "#2a1020",
      accentForeground: "#f472b6",
      background: "#140a12",
      foreground: "#ffe8f4",
      card: "#1e1018",
      cardForeground: "#ffe8f4",
      popover: "#1e1018",
      popoverForeground: "#ffe8f4",
      muted: "#281420",
      mutedForeground: "#cc80a0",
      destructive: "#ff4444",
      border: "#3c1830",
      ring: "#f472b6",
      chart1: "#f472b6",
      chart2: "#a855f7",
      chart3: "#38bdf8",
      chart4: "#4ade80",
      chart5: "#facc15",
      chart6: "#fb923c",
      sidebar: "#120810",
      sidebarForeground: "#ffe8f4",
      sidebarPrimary: "#f472b6",
      sidebarPrimaryForeground: "#1a0610",
      sidebarAccent: "#2a1020",
      sidebarAccentForeground: "#ffa0d0",
      sidebarBorder: "#3c1830",
      sidebarRing: "#f472b6",
    },
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    nameEn: "Cyberpunk",
    colors: {
      ...DEFAULT_COLORS,
      primary: "#00ffaa",
      primaryForeground: "#001a0e",
      secondary: "#0a3020",
      secondaryForeground: "#66ffcc",
      accent: "#082818",
      accentForeground: "#00ffaa",
      background: "#050f0a",
      foreground: "#d0ffe8",
      card: "#0a1e14",
      cardForeground: "#d0ffe8",
      popover: "#0a1e14",
      popoverForeground: "#d0ffe8",
      muted: "#0e2818",
      mutedForeground: "#60cc90",
      destructive: "#ff2244",
      border: "#0f3820",
      ring: "#00ffaa",
      chart1: "#00ffaa",
      chart2: "#ff0066",
      chart3: "#ffcc00",
      chart4: "#00ccff",
      chart5: "#ff8800",
      chart6: "#cc44ff",
      sidebar: "#060e08",
      sidebarForeground: "#d0ffe8",
      sidebarPrimary: "#00ffaa",
      sidebarPrimaryForeground: "#001a0e",
      sidebarAccent: "#082818",
      sidebarAccentForeground: "#66ffcc",
      sidebarBorder: "#0f3820",
      sidebarRing: "#00ffaa",
    },
  },
  {
    id: "minimal",
    name: "现代极简",
    nameEn: "Modern Minimal",
    colors: {
      ...DEFAULT_COLORS,
      primary: "#f8f8f8",
      primaryForeground: "#0a0a0a",
      secondary: "#1e1e1e",
      secondaryForeground: "#c0c0c0",
      accent: "#181818",
      accentForeground: "#ffffff",
      background: "#0c0c0c",
      foreground: "#e8e8e8",
      card: "#141414",
      cardForeground: "#e8e8e8",
      popover: "#141414",
      popoverForeground: "#e8e8e8",
      muted: "#1a1a1a",
      mutedForeground: "#888888",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      border: "#262626",
      ring: "#d0d0d0",
      chart1: "#f8f8f8",
      chart2: "#a0a0a0",
      chart3: "#606060",
      chart4: "#d0d0d0",
      chart5: "#808080",
      chart6: "#c0c0c0",
      sidebar: "#0a0a0a",
      sidebarForeground: "#e8e8e8",
      sidebarPrimary: "#f8f8f8",
      sidebarPrimaryForeground: "#0a0a0a",
      sidebarAccent: "#181818",
      sidebarAccentForeground: "#c0c0c0",
      sidebarBorder: "#262626",
      sidebarRing: "#d0d0d0",
    },
  },
  {
    id: "future-tech",
    name: "未来科技",
    nameEn: "Future Tech",
    colors: {
      ...DEFAULT_COLORS,
      primary: "#38bdf8",
      primaryForeground: "#041828",
      secondary: "#0c2a48",
      secondaryForeground: "#7dd3fc",
      accent: "#082038",
      accentForeground: "#38bdf8",
      background: "#040c18",
      foreground: "#e0f2fe",
      card: "#0a1828",
      cardForeground: "#e0f2fe",
      popover: "#0a1828",
      popoverForeground: "#e0f2fe",
      muted: "#0e2038",
      mutedForeground: "#60a0cc",
      destructive: "#f43f5e",
      destructiveForeground: "#ffffff",
      border: "#0f2848",
      ring: "#38bdf8",
      chart1: "#38bdf8",
      chart2: "#34d399",
      chart3: "#fbbf24",
      chart4: "#a78bfa",
      chart5: "#f97316",
      chart6: "#ec4899",
      sidebar: "#060e1c",
      sidebarForeground: "#e0f2fe",
      sidebarPrimary: "#38bdf8",
      sidebarPrimaryForeground: "#041828",
      sidebarAccent: "#082038",
      sidebarAccentForeground: "#7dd3fc",
      sidebarBorder: "#0f2848",
      sidebarRing: "#38bdf8",
    },
  },
];

export interface ThemeTypography {
  sansSerif: string;
  serif: string;
  mono: string;
}

export const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  sansSerif: "Rajdhani, system-ui, sans-serif",
  serif: "Georgia, Cambria, serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export interface ThemeShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export const DEFAULT_SHADOW: ThemeShadow = {
  offsetX: 0,
  offsetY: 0,
  blur: 0,
  spread: 0,
  color: "#0000000d",
};

export interface BrandingConfig {
  systemName: string;
  tagline: string;
  backgroundUrl: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  systemName: "YYC³ CloudPivot Intelli-Matrix",
  tagline: "本地多端推理矩阵 · 数据看盘",
  backgroundUrl: "",
};
