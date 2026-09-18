#!/usr/bin/env bash
# ============================================================
# download-icons.sh
# ============================================================
# 从 GitHub 仓库拉取 YYC³ 品牌图标到 public/yyc3-badge-icons/
#
# 仓库: https://github.com/YYC-Cube/Cloudpivotintellimatrix
# 路径: public/yyc3-badge-icons/ (5 平台, 32 PNG)
#
# 用法:
#   chmod +x scripts/download-icons.sh
#   ./scripts/download-icons.sh
#
# 依赖: curl (macOS 自带)
# ============================================================

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────
GH_RAW="https://raw.githubusercontent.com/YYC-Cube/Cloudpivotintellimatrix/main/public/yyc3-badge-icons"
LOCAL_DIR="public/yyc3-badge-icons"

# 颜色
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  YYC³ Badge Icons — 远程仓库完整拉取            ║${NC}"
echo -e "${CYAN}║  5 平台 · 32 PNG 文件                           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── 创建目录结构 ──────────────────────────────────────────────
echo -e "${YELLOW}[1/3] 创建目录结构...${NC}"
mkdir -p "${LOCAL_DIR}/Android"
mkdir -p "${LOCAL_DIR}/Web App"
mkdir -p "${LOCAL_DIR}/iOS"
mkdir -p "${LOCAL_DIR}/macOS"
mkdir -p "${LOCAL_DIR}/watchOS"
echo -e "${GREEN}  ✓ 5 个平台目录已创建${NC}"
echo ""

# ── 下载函数 ──────────────────────────────────────────────────
download() {
  local subpath="$1"
  local local_file="${LOCAL_DIR}/${subpath}"
  # URL 编码空格
  local encoded_path
  encoded_path=$(echo "$subpath" | sed 's/ /%20/g')
  local url="${GH_RAW}/${encoded_path}"

  if [ -f "$local_file" ]; then
    echo -e "  ${GREEN}✓${NC} 已存在: ${subpath}"
    return 0
  fi

  if curl -fsSL -o "$local_file" "$url" 2>/dev/null; then
    local size
    size=$(wc -c < "$local_file" | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} 下载完成: ${subpath} (${size} bytes)"
  else
    echo -e "  ${YELLOW}✗${NC} 下载失败: ${subpath}"
    return 1
  fi
}

# ── 执行下载 (32 files) ──────────────────────────────────────
echo -e "${YELLOW}[2/3] 下载 Android/ (6 files)...${NC}"
download "Android/mdpi.png"
download "Android/hdpi.png"
download "Android/xhdpi.png"
download "Android/xxhdpi.png"
download "Android/xxxhdpi.png"
download "Android/Play Store.png"
echo ""

echo -e "${YELLOW}[2/3] 下载 Web App/ (5 files)...${NC}"
download "Web App/favicon-16.png"
download "Web App/favicon-32.png"
download "Web App/android-chrome-192.png"
download "Web App/android-chrome-512.png"
download "Web App/apple-touch-icon.png"
echo ""

echo -e "${YELLOW}[2/3] 下载 iOS/ (14 files)...${NC}"
download "iOS/App Store.png"
download "iOS/iPad App.png"
download "iOS/iPad Notification.png"
download "iOS/iPad Pro App 2x.png"
download "iOS/iPad Settings.png"
download "iOS/iPad Spotlight.png"
download "iOS/iPhone App 2x.png"
download "iOS/iPhone App 3x.png"
download "iOS/iPhone Notification 2x.png"
download "iOS/iPhone Notification 3x.png"
download "iOS/iPhone Settings 2x.png"
download "iOS/iPhone Settings 3x.png"
download "iOS/iPhone Spotlight 2x.png"
download "iOS/iPhone Spotlight 3x.png"
echo ""

echo -e "${YELLOW}[2/3] 下载 macOS/ (7 files)...${NC}"
download "macOS/16.png"
download "macOS/32.png"
download "macOS/64.png"
download "macOS/128.png"
download "macOS/256.png"
download "macOS/512.png"
download "macOS/1024.png"
echo ""

echo -e "${YELLOW}[2/3] 下载 watchOS/ (4 files)...${NC}"
download "watchOS/App Store.png"
download "watchOS/Home Screen.png"
download "watchOS/Notification.png"
download "watchOS/Short Look.png"
echo ""

# ── 统计 ──────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3] 统计结果...${NC}"
total=$(find "${LOCAL_DIR}" -name "*.png" -type f | wc -l | tr -d ' ')
total_size=$(du -sh "${LOCAL_DIR}" 2>/dev/null | cut -f1)
echo -e "${GREEN}  总计: ${total}/32 PNG 文件, 占用 ${total_size}${NC}"
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ YYC³ 品牌图标拉取完成！${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo ""
echo "  文件结构:"
echo "  ${LOCAL_DIR}/"
echo "  ├── Android/     (6 files: mdpi ~ Play Store)"
echo "  ├── Web App/     (5 files: favicon, chrome, apple-touch)"
echo "  ├── iOS/         (14 files: App Store ~ Spotlight)"
echo "  ├── macOS/       (7 files: 16 ~ 1024)"
echo "  └── watchOS/     (4 files: App Store ~ Short Look)"
