import type { ReactEventHandler } from "react";

/**
 * yyc3-icons.ts
 * ==============
 * YYC³ 图标资源中心化配置 — 与 GitHub 仓库 100% 对齐
 *
 * 仓库: https://github.com/YYC-Cube/Cloudpivotintellimatrix
 * 路径: public/yyc3-icons/
 *
 * GitHub 仓库实际目录结构 (5 平台, 32 PNG):
 *   public/yyc3-icons/
 *   ├── Android/                     (6 files)
 *   │   ├── Play Store.png           512×512   160KB
 *   │   ├── hdpi.png                  72×72    6.7KB
 *   │   ├── mdpi.png                  48×48    3.5KB
 *   │   ├── xhdpi.png                 96×96    10KB
 *   │   ├── xxhdpi.png               144×144   20KB
 *   │   └── xxxhdpi.png              192×192   32KB
 *   ├── Web App/                     (5 files)
 *   │   ├── android-chrome-192.png   192×192   32KB
 *   │   ├── android-chrome-512.png   512×512  160KB
 *   │   ├── apple-touch-icon.png     180×180   29KB
 *   │   ├── favicon-16.png            16×16   698B
 *   │   └── favicon-32.png            32×32   1.8KB
 *   ├── iOS/                         (14 files)
 *   │   ├── App Store.png           1024×1024 475KB
 *   │   ├── iPad App.png              76×76   7.4KB
 *   │   ├── iPad Notification.png     20×20   1.0KB
 *   │   ├── iPad Pro App 2x.png     167×167   26KB
 *   │   ├── iPad Settings.png         29×29   1.7KB
 *   │   ├── iPad Spotlight.png        40×40   2.7KB
 *   │   ├── iPhone App 2x.png       120×120   15KB
 *   │   ├── iPhone App 3x.png       180×180   29KB
 *   │   ├── iPhone Notification 2x.png 40×40  2.7KB
 *   │   ├── iPhone Notification 3x.png 60×60  5.0KB
 *   │   ├── iPhone Settings 2x.png    58×58   4.7KB
 *   │   ├── iPhone Settings 3x.png    87×87   9.0KB
 *   │   ├── iPhone Spotlight 2x.png   80×80   8.0KB
 *   │   └── iPhone Spotlight 3x.png  120×120  15KB
 *   ├── macOS/                       (7 files)
 *   │   ├── 16.png                    16×16   696B
 *   │   ├── 32.png                    32×32   1.9KB
 *   │   ├── 64.png                    64×64   5.3KB
 *   │   ├── 128.png                  128×128   16KB
 *   │   ├── 256.png                  256×256   52KB
 *   │   ├── 512.png                  512×512  163KB
 *   │   └── 1024.png               1024×1024 475KB
 *   └── watchOS/                     (4 files)
 *       ├── App Store.png           1024×1024 475KB
 *       ├── Home Screen.png           80×80   8.0KB
 *       ├── Notification.png          48×48   3.5KB
 *       └── Short Look.png          172×172   27KB
 *
 * 注意:
 * - 项目内所有 React 组件统一使用 <YYC3LogoSvg /> 内联 SVG 渲染，零网络依赖
 * - 本文件仅供 useYYC3Head.ts (<head> 标签注入) 和测试文件使用
 * - 本地 PNG 资源需通过 download-icons.sh 从仓库拉取
 *
 * 使用方式:
 *   import { icons } from '../lib/yyc3-icons';
 *   <img src={icons.favicon32} alt="YYC³" />
 */

// ============================================================
//  GitHub Raw CDN 基础 URL (PNG 兜底)
// ============================================================

const GH_BASE =
  "https://raw.githubusercontent.com/YYC-Cube/Cloudpivotintellimatrix/main/public/yyc3-icons";

// ============================================================
//  本地路径基础 URL (public/ 目录下)
//  子路径部署: 自动拼接 Vite BASE_URL (VITE_BASE 构建/开发时注入)
//  根路径部署时 BASE_URL === '/', 结果与绝对路径一致
// ============================================================

const LOCAL_BASE = `${import.meta.env.BASE_URL || "/"}yyc3-icons`;

// ============================================================
//  路径解析器
// ============================================================

function localPath(subPath: string): string {
  return `${LOCAL_BASE}/${subPath}`;
}

function cdnPath(subPath: string): string {
  // GitHub Raw CDN 中带空格的文件名需编码
  const encoded = subPath
    .split("/")
    .map((seg, i, arr) => (i === arr.length - 1 ? encodeURIComponent(seg) : seg))
    .join("/");
  return `${GH_BASE}/${encoded}`;
}

// ============================================================
//  完整图标路径集 — 与仓库 1:1 对齐 (32 文件)
// ============================================================

export const icons = {
  // ═══════════════════════════════════════════════════════════
  //  Android/ (6 files)
  // ═══════════════════════════════════════════════════════════
  androidMdpi: localPath("Android/mdpi.png"),           //  48×48
  androidHdpi: localPath("Android/hdpi.png"),           //  72×72
  androidXhdpi: localPath("Android/xhdpi.png"),          //  96×96
  androidXxhdpi: localPath("Android/xxhdpi.png"),         // 144×144
  androidXxxhdpi: localPath("Android/xxxhdpi.png"),        // 192×192
  androidPlayStore: localPath("Android/Play Store.png"),     // 512×512

  // ═══════════════════════════════════════════════════════════
  //  Web App/ (5 files) — favicon / PWA / apple-touch
  // ═══════════════════════════════════════════════════════════
  favicon16: localPath("Web App/favicon-16.png"),         //  16×16
  favicon32: localPath("Web App/favicon-32.png"),         //  32×32
  webAppChrome192: localPath("Web App/android-chrome-192.png"), // 192×192
  webAppChrome512: localPath("Web App/android-chrome-512.png"), // 512×512
  webAppAppleTouch: localPath("Web App/apple-touch-icon.png"),   // 180×180

  // ═══════════════════════════════════════════════════════════
  //  iOS/ (14 files)
  // ═══════════════════════════════════════════════════════════
  iosAppStore: localPath("iOS/App Store.png"),             // 1024×1024
  iosiPadApp: localPath("iOS/iPad App.png"),             //   76×76
  iosiPadNotification: localPath("iOS/iPad Notification.png"),    //   20×20
  iosiPadProApp2x: localPath("iOS/iPad Pro App 2x.png"),     //  167×167
  iosiPadSettings: localPath("iOS/iPad Settings.png"),        //   29×29
  iosiPadSpotlight: localPath("iOS/iPad Spotlight.png"),       //   40×40
  iosiPhoneApp2x: localPath("iOS/iPhone App 2x.png"),       //  120×120
  iosiPhoneApp3x: localPath("iOS/iPhone App 3x.png"),       //  180×180
  iosiPhoneNotification2x: localPath("iOS/iPhone Notification 2x.png"), // 40×40
  iosiPhoneNotification3x: localPath("iOS/iPhone Notification 3x.png"), // 60×60
  iosiPhoneSettings2x: localPath("iOS/iPhone Settings 2x.png"),  //   58×58
  iosiPhoneSettings3x: localPath("iOS/iPhone Settings 3x.png"),  //   87×87
  iosiPhoneSpotlight2x: localPath("iOS/iPhone Spotlight 2x.png"), //   80×80
  iosiPhoneSpotlight3x: localPath("iOS/iPhone Spotlight 3x.png"), //  120×120

  // ═══════════════════════════════════════════════════════════
  //  macOS/ (7 files)
  // ═══════════════════════════════════════════════════════════
  macOS16: localPath("macOS/16.png"),     //   16×16
  macOS32: localPath("macOS/32.png"),     //   32×32
  macOS64: localPath("macOS/64.png"),     //   64×64
  macOS128: localPath("macOS/128.png"),    //  128×128
  macOS256: localPath("macOS/256.png"),    //  256×256
  macOS512: localPath("macOS/512.png"),    //  512×512
  macOS1024: localPath("macOS/1024.png"),   // 1024×1024

  // ═══════════════════════════════════════════════════════════
  //  watchOS/ (4 files)
  // ═══════════════════════════════════════════════════════════
  watchOSAppStore: localPath("watchOS/App Store.png"),     // 1024×1024
  watchOSHome: localPath("watchOS/Home Screen.png"),   //   80×80
  watchOSNotification: localPath("watchOS/Notification.png"), //   48×48
  watchOSShortLook: localPath("watchOS/Short Look.png"),    //  172×172

  // ═══════════════════════════════════════════════════════════
  //  语义化别名 (向后兼容 + 语义化快捷引用)
  // ═══════════════════════════════════════════════════════════
  /** 通用 Logo (最大尺寸 PNG) */
  logo: localPath("Web App/android-chrome-512.png"),
  /** PWA 192x192 */
  pwa192: localPath("Web App/android-chrome-192.png"),
  /** PWA 512x512 */
  pwa512: localPath("Web App/android-chrome-512.png"),
  /** Apple Touch Icon */
  iosAppleTouch: localPath("Web App/apple-touch-icon.png"),
  /** iOS App Store 1024x1024 */
  ios1024: localPath("iOS/App Store.png"),
  /** Android Play Store 512x512 */
  playstore: localPath("Android/Play Store.png"),
  /** 通用小尺寸 Logo */
  logo72: localPath("Android/hdpi.png"),
  /** 通用中尺寸 Logo */
  logo192: localPath("Web App/android-chrome-192.png"),
  /** 通用大尺寸 Logo */
  logo512: localPath("Web App/android-chrome-512.png"),
} as const;

// ============================================================
//  CDN 回退版 — 完整 32 文件映射
//  当本地 PNG 404 时使用 (GitHub Raw)
// ============================================================

export const iconsCDN = {
  // Android
  androidMdpi: cdnPath("Android/mdpi.png"),
  androidHdpi: cdnPath("Android/hdpi.png"),
  androidXhdpi: cdnPath("Android/xhdpi.png"),
  androidXxhdpi: cdnPath("Android/xxhdpi.png"),
  androidXxxhdpi: cdnPath("Android/xxxhdpi.png"),
  androidPlayStore: cdnPath("Android/Play Store.png"),

  // Web App
  favicon16: cdnPath("Web App/favicon-16.png"),
  favicon32: cdnPath("Web App/favicon-32.png"),
  webAppChrome192: cdnPath("Web App/android-chrome-192.png"),
  webAppChrome512: cdnPath("Web App/android-chrome-512.png"),
  webAppAppleTouch: cdnPath("Web App/apple-touch-icon.png"),

  // iOS
  iosAppStore: cdnPath("iOS/App Store.png"),
  iosiPadApp: cdnPath("iOS/iPad App.png"),
  iosiPadNotification: cdnPath("iOS/iPad Notification.png"),
  iosiPadProApp2x: cdnPath("iOS/iPad Pro App 2x.png"),
  iosiPadSettings: cdnPath("iOS/iPad Settings.png"),
  iosiPadSpotlight: cdnPath("iOS/iPad Spotlight.png"),
  iosiPhoneApp2x: cdnPath("iOS/iPhone App 2x.png"),
  iosiPhoneApp3x: cdnPath("iOS/iPhone App 3x.png"),
  iosiPhoneNotification2x: cdnPath("iOS/iPhone Notification 2x.png"),
  iosiPhoneNotification3x: cdnPath("iOS/iPhone Notification 3x.png"),
  iosiPhoneSettings2x: cdnPath("iOS/iPhone Settings 2x.png"),
  iosiPhoneSettings3x: cdnPath("iOS/iPhone Settings 3x.png"),
  iosiPhoneSpotlight2x: cdnPath("iOS/iPhone Spotlight 2x.png"),
  iosiPhoneSpotlight3x: cdnPath("iOS/iPhone Spotlight 3x.png"),

  // macOS
  macOS16: cdnPath("macOS/16.png"),
  macOS32: cdnPath("macOS/32.png"),
  macOS64: cdnPath("macOS/64.png"),
  macOS128: cdnPath("macOS/128.png"),
  macOS256: cdnPath("macOS/256.png"),
  macOS512: cdnPath("macOS/512.png"),
  macOS1024: cdnPath("macOS/1024.png"),

  // watchOS
  watchOSAppStore: cdnPath("watchOS/App Store.png"),
  watchOSHome: cdnPath("watchOS/Home Screen.png"),
  watchOSNotification: cdnPath("watchOS/Notification.png"),
  watchOSShortLook: cdnPath("watchOS/Short Look.png"),

  // 别名
  logo: cdnPath("Web App/android-chrome-512.png"),
  pwa192: cdnPath("Web App/android-chrome-192.png"),
  pwa512: cdnPath("Web App/android-chrome-512.png"),
  iosAppleTouch: cdnPath("Web App/apple-touch-icon.png"),
  ios1024: cdnPath("iOS/App Store.png"),
  playstore: cdnPath("Android/Play Store.png"),
  logo72: cdnPath("Android/hdpi.png"),
  logo192: cdnPath("Web App/android-chrome-192.png"),
  logo512: cdnPath("Web App/android-chrome-512.png"),
} as const;

// ============================================================
//  Logo CDN 回退 onError handler
// ============================================================

/**
 * 获取带 CDN 回退的 onError handler
 * 使用方式:
 *   <img
 *     src={icons.logo}
 *     onError={handleIconError('logo')}
 *     alt="YYC³"
 *   />
 */
export function handleIconError(
  iconKey: keyof typeof iconsCDN
): ReactEventHandler<HTMLImageElement> {
  return (e) => {
    const img = e.currentTarget;
    const cdnSrc = iconsCDN[iconKey];
    // 避免无限循环
    if (img.src !== cdnSrc) {
      img.src = cdnSrc;
    }
  };
}

// ============================================================
//  PWA Manifest 图标数组 (manifest.json 动态生成用)
//  路径全部对齐仓库实际结构，纯 PNG
// ============================================================

export const pwaManifestIcons = [
  { src: "yyc3-icons/Web App/favicon-16.png", sizes: "16x16", type: "image/png" },
  { src: "yyc3-icons/Web App/favicon-32.png", sizes: "32x32", type: "image/png" },
  { src: "yyc3-icons/Web App/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  { src: "yyc3-icons/Web App/android-chrome-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
  { src: "yyc3-icons/Web App/android-chrome-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  { src: "yyc3-icons/macOS/64.png", sizes: "64x64", type: "image/png" },
  { src: "yyc3-icons/macOS/128.png", sizes: "128x128", type: "image/png" },
  { src: "yyc3-icons/macOS/256.png", sizes: "256x256", type: "image/png" },
  { src: "yyc3-icons/macOS/512.png", sizes: "512x512", type: "image/png" },
  { src: "yyc3-icons/Android/mdpi.png", sizes: "48x48", type: "image/png" },
  { src: "yyc3-icons/Android/hdpi.png", sizes: "72x72", type: "image/png" },
  { src: "yyc3-icons/Android/xhdpi.png", sizes: "96x96", type: "image/png" },
  { src: "yyc3-icons/Android/xxhdpi.png", sizes: "144x144", type: "image/png" },
  { src: "yyc3-icons/Android/xxxhdpi.png", sizes: "192x192", type: "image/png" },
];

// ============================================================
//  下载清单 — 用于 download-icons.sh 参考
//  完整列出仓库内 32 个 PNG 的相对路径
// ============================================================

export const REMOTE_FILE_MANIFEST = [
  // Android (6)
  "Android/mdpi.png",
  "Android/hdpi.png",
  "Android/xhdpi.png",
  "Android/xxhdpi.png",
  "Android/xxxhdpi.png",
  "Android/Play Store.png",
  // Web App (5)
  "Web App/favicon-16.png",
  "Web App/favicon-32.png",
  "Web App/android-chrome-192.png",
  "Web App/android-chrome-512.png",
  "Web App/apple-touch-icon.png",
  // iOS (14)
  "iOS/App Store.png",
  "iOS/iPad App.png",
  "iOS/iPad Notification.png",
  "iOS/iPad Pro App 2x.png",
  "iOS/iPad Settings.png",
  "iOS/iPad Spotlight.png",
  "iOS/iPhone App 2x.png",
  "iOS/iPhone App 3x.png",
  "iOS/iPhone Notification 2x.png",
  "iOS/iPhone Notification 3x.png",
  "iOS/iPhone Settings 2x.png",
  "iOS/iPhone Settings 3x.png",
  "iOS/iPhone Spotlight 2x.png",
  "iOS/iPhone Spotlight 3x.png",
  // macOS (7)
  "macOS/16.png",
  "macOS/32.png",
  "macOS/64.png",
  "macOS/128.png",
  "macOS/256.png",
  "macOS/512.png",
  "macOS/1024.png",
  // watchOS (4)
  "watchOS/App Store.png",
  "watchOS/Home Screen.png",
  "watchOS/Notification.png",
  "watchOS/Short Look.png",
] as const;
