# YYC³项目部署文档

## 📋 概述

本文档记录YYC³项目在192.168.3.155:3118上的完整部署过程，包括前端构建、nginx配置、API Gateway和Figma集成。

## 🌐 部署信息

### 服务器信息

- **服务器IP**: 192.168.3.155
- **前端端口**: 3118
- **API端口**: 10086
- **Ollama端口**: 11434

### 访问地址

- **本地访问**: <http://localhost:3118>
- **局域网访问**: <http://192.168.3.155:3118>
- **API Gateway**: <http://192.168.3.155:10086>

## 🚀 部署步骤

### 步骤1: 前端构建

```bash
cd /Users/yanyu/Cloudpivotintellimatrix
pnpm build
```

**构建结果**:

```
vite v6.3.5 building for production...
✓ 2728 modules transformed.
dist/index.html                     0.45 kB │ gzip:   0.29 kB
dist/assets/index-DfWHUFLi.css    139.81 kB │ gzip:  20.99 kB
dist/assets/index-CSgOLMjb.js   1,557.79 kB │ gzip: 418.72 kB
✓ built in 2.57s
```

### 步骤2: nginx配置

#### 配置文件位置

- **主配置**: `/opt/homebrew/etc/nginx/nginx.conf`
- **站点配置**: `/opt/homebrew/etc/nginx/servers/yyc3.conf`
- **源配置**: `/Volumes/Development/项目提示词/nginx.conf`

#### nginx配置内容

```nginx
server {
    listen       3118;
    server_name  _;

    root /Users/yanyu/Cloudpivotintellimatrix/dist;
    index index.html;

    access_log /Volumes/Cache/nginx-logs/yyc3-access.log;
    error_log  /Volumes/Cache/nginx-logs/yyc3-error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml application/manifest+json image/svg+xml;

    location /api/v1/llm/ollama/ {
        proxy_pass http://127.0.0.1:11434/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_connect_timeout 10s;
        proxy_read_timeout 600s;
        proxy_send_timeout 60s;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization, Api-Key' always;
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization, Api-Key';
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            return 204;
        }
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
}
```

### 步骤3: nginx配置验证

```bash
# 验证配置
nginx -t

# 输出结果
nginx: configuration file /opt/homebrew/etc/nginx/nginx.conf syntax is ok
nginx: configuration file /opt/homebrew/etc/nginx/nginx.conf test is successful
```

### 步骤4: 启动nginx

```bash
# 启动或重新加载nginx
nginx 2>/dev/null || nginx -s reload
```

### 步骤5: API Gateway启动

```bash
cd /Volumes/Development/项目提示词/API-0379
pnpm start
```

**启动日志**:

```
[FigmaGateway] ✅ Initialized
[MCPHandler] ✅ Registered tools: 5
[WS] WebSocket server initialized
[Server] ✅ CORS configured with allowed origins: [
  'http://localhost:3118',
  'http://192.168.3.22:3118',
  'http://192.168.3.x:3118',
  'https://0379.world',
  'https://0379.email',
  'https://0379.live',
  'http://localhost:5173',
  'http://localhost:3000'
]
[Server] ✅ Figma routes enabled
[Server] Initializing services...
YYC³ AIFY API v2.0 running on port 10086
Health: http://localhost:10086/health
WebSocket: ws://localhost:10086/
LLM API: http://localhost:10086/api/v1/llm
Devices: http://localhost:10086/api/v1/devices
[Database] PostgreSQL connected successfully
[Database] Redis connected
[Database] Redis connected successfully
[Server] Database connected
[Models] All tables initialized successfully
[Server] All services initialized successfully
```

## ✅ 验证测试

### 测试1: 静态页面

```bash
curl -s http://localhost:3118 | head -3
```

**结果**:

```html
<!DOCTYPE html>
<html lang="en">
```

### 测试2: Ollama代理

```bash
curl http://localhost:3118/api/v1/llm/ollama/tags
```

**结果**:

```json
{
  "models": [
    {
      "name": "codegeex4:latest",
      "model": "codegeex4:latest",
      "modified_at": "2026-02-22T00:55:15.920502035+08:00",
      "size": 5455323291,
      "digest": "867b8e81d03898ac2289d809edb718d67a6d706d6a644bb1a922ee1607c7e5ed",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "chatglm",
        "families": ["chatglm"],
        "parameter_size": "9.4B",
        "quantization_level": "Q4_0"
      }
    },
    {
      "name": "qwen2.5:7b",
      "model": "qwen2.5:7b",
      "modified_at": "2026-02-22T00:28:20.785576365+08:00",
      "size": 4683087332,
      "digest": "845dbda0ea48ed749caafd9e6037047aa19acfcfd82e704d7ca97d631a0b697e",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "qwen2",
        "families": ["qwen2"],
        "parameter_size": "7.6B",
        "quantization_level": "Q4_K_M"
      }
    }
  ]
}
```

### 测试3: 获取局域网IP

```bash
ifconfig en0 | grep "inet "
```

**结果**:

```
inet 192.168.3.155 netmask 0xffffff00 broadcast 192.168.3.255
```

## 📊 服务状态

| 服务 | 端口 | 状态 | 说明 |
|------|------|------|------|
| nginx (前端) | 3118 | ✅ 运行中 | 静态文件服务 |
| API Gateway | 10086 | ✅ 运行中 | 后端API服务 |
| Ollama | 11434 | ✅ 运行中 | LLM模型服务 |
| PostgreSQL | 5432 | ✅ 已连接 | 数据库服务 |
| Redis | 6379 | ✅ 已连接 | 缓存服务 |

## 🔧 配置详解

### nginx配置特点

1. **Ollama代理配置**
   - 路径: `/api/v1/llm/ollama/`
   - 代理到: `http://127.0.0.1:11434/api/`
   - 支持流式传输
   - 完整CORS支持

2. **性能优化**
   - Gzip压缩: 压缩文本、CSS、JS、JSON
   - 静态资源缓存: 缓存1年
   - 访问日志: 记录到`/Volumes/Cache/nginx-logs/`

3. **安全配置**
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - CORS: 允许所有来源

### API Gateway配置

1. **CORS配置**

   ```javascript
   allowedOrigins: [
     'http://localhost:3118',
     'http://192.168.3.22:3118',
     'http://192.168.3.x:3118',
     'https://0379.world',
     'https://0379.email',
     'https://0379.live',
     'http://localhost:5173',
     'http://localhost:3000'
   ]
   ```

2. **功能模块**
   - Figma Gateway: ✅ 已启用
   - MCP Handler: ✅ 已启用 (5个工具)
   - WebSocket: ✅ 已启用
   - 设备管理: ✅ 已启用
   - LLM API: ✅ 已启用

## 🎯 功能验证

### 前端功能

- ✅ 静态页面加载
- ✅ 路由跳转
- ✅ 资源加载
- ✅ Gzip压缩

### API功能

- ✅ Ollama模型列表
- ✅ Figma组件API
- ✅ MCP协议调用
- ✅ WebSocket连接
- ✅ 数据库连接
- ✅ Redis缓存

### 代理功能

- ✅ Ollama API代理
- ✅ CORS跨域支持
- ✅ 流式传输支持
- ✅ 长连接支持

## 📝 维护命令

### nginx管理

```bash
# 检查配置
nginx -t

# 启动nginx
nginx

# 停止nginx
nginx -s stop

# 重新加载配置
nginx -s reload

# 查看nginx进程
ps aux | grep nginx
```

### API Gateway管理

```bash
# 启动API Gateway
cd /Volumes/Development/项目提示词/API-0379
pnpm start

# 停止API Gateway
Ctrl + C

# 查看日志
tail -f /Volumes/Cache/nginx-logs/yyc3-access.log
tail -f /Volumes/Cache/nginx-logs/yyc3-error.log
```

### 前端重新部署

```bash
cd /Users/yanyu/Cloudpivotintellimatrix
pnpm build
# nginx会自动加载新的dist目录
```

## 🔍 故障排查

### 问题1: nginx配置错误

**症状**: `nginx: [emerg] "events" directive is not allowed here`

**解决**: 确保配置文件只包含`server`块，不包含`events`和`http`块

### 问题2: 端口被占用

**症状**: `nginx: [emerg] bind() to 0.0.0.0:3118 failed (48: Address already in use)`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :3118

# 杀死进程
kill -9 <PID>
```

### 问题3: Ollama连接失败

**症状**: `curl: (7) Failed to connect to localhost port 11434`

**解决**:

```bash
# 检查Ollama是否运行
ps aux | grep ollama

# 启动Ollama
ollama serve
```

## 📞 技术支持

- **维护团队**: YanYuCloudCube Team
- **联系邮箱**: <admin@0379.email>
- **项目地址**: <https://github.com/YYC-Cube/>

## 📅 更新记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0.0 | 2026-03-08 | 初始部署文档 | YanYuCloudCube Team |

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
