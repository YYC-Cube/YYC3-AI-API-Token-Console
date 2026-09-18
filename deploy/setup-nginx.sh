#!/bin/bash
# ============================================================
# YYC³ Dashboard — Nginx 一键部署脚本
# 针对 yanyu@yyc3-22 (Apple M4 Max) 的精确配置
# ============================================================

set -e

PROJECT_DIR="/Users/yanyu/Cloudpivotintellimatrix"
NGINX_CONF_DIR="/opt/homebrew/etc/nginx/servers"
LOG_DIR="/Volumes/Cache/nginx-logs"

echo ""
echo "  ╔════════════════════════════════════════════════════════╗"
echo "  ║  YYC³ CloudPivot — Nginx 部署脚本 (M4 Max)           ║"
echo "  ╚════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: 创建日志目录 ──
echo "  [1/6] 创建日志目录..."
mkdir -p "$LOG_DIR"
echo "        ✅ $LOG_DIR"

# ── Step 2: 创建 Nginx servers 目录 ──
echo "  [2/6] 创建 Nginx 配置目录..."
mkdir -p "$NGINX_CONF_DIR"
echo "        ✅ $NGINX_CONF_DIR"

# ── Step 3: 复制配置文件 ──
echo "  [3/6] 安装 Nginx 配置..."
cp "$PROJECT_DIR/deploy/nginx.conf" "$NGINX_CONF_DIR/yyc3.conf"
echo "        ✅ $NGINX_CONF_DIR/yyc3.conf"

# ── Step 4: 构建前端 ──
echo "  [4/6] 构建前端..."
cd "$PROJECT_DIR"
if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi
if [ ! -f "dist/index.html" ]; then
    echo "        ❌ 构建失败！dist/index.html 不存在"
    exit 1
fi
DIST_SIZE=$(du -sh dist | cut -f1)
echo "        ✅ dist/ ($DIST_SIZE)"

# ── Step 5: 测试 Nginx 配置 ──
echo "  [5/6] 验证 Nginx 配置..."
nginx -t
echo "        ✅ 配置语法正确"

# ── Step 6: 启动/重载 Nginx ──
echo "  [6/6] 启动 Nginx..."
# 检查 Nginx 是否已在运行
if pgrep -x nginx > /dev/null; then
    nginx -s reload
    echo "        ✅ Nginx 已重载"
else
    nginx
    echo "        ✅ Nginx 已启动"
fi

# ── 完成 ──
echo ""
echo "  ╔════════════════════════════════════════════════════════╗"
echo "  ║  ✅ 部署完成！                                        ║"
echo "  ╠════════════════════════════════════════════════════════╣"
echo "  ║                                                        ║"
echo "  ║  本机访问:  http://localhost:3118                      ║"
echo "  ║  局域网:    http://192.168.3.x:3118                    ║"
echo "  ║                                                        ║"
echo "  ║  Ollama 代理测试:                                      ║"
echo "  ║  curl http://localhost:3118/api/v1/llm/ollama/tags     ║"
echo "  ║                                                        ║"
echo "  ║  日志查看:                                              ║"
echo "  ║  tail -f /Volumes/Cache/nginx-logs/yyc3-access.log    ║"
echo "  ║                                                        ║"
echo "  ║  停止: nginx -s stop                                   ║"
echo "  ║  重载: nginx -s reload                                 ║"
echo "  ╚════════════════════════════════════════════════════════╝"
echo ""
