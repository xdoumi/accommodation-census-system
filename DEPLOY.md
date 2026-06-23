# 部署指南

> 本项目是纯前端 SPA（数据存储在浏览器 IndexedDB），无需后端、无需数据库。任何静态文件托管方案均可部署。

---

## 一、生产构建

```bash
npm install
npm run build
```

构建产物在 `dist/`，结构：

```
dist/
├── index.html
├── geo/yunnan.json          # 云南地图 GeoJSON
└── assets/
    ├── index-*.js           # 业务主 bundle  (~45 KB gz)
    ├── vendor-vue-*.js      # Vue 全家桶     (~43 KB gz)
    ├── vendor-element-*.js  # Element Plus  (~340 KB gz, 一次缓存)
    ├── vendor-echarts-*.js  # 图表库        (~343 KB gz, 一次缓存)
    ├── vendor-excel-*.js    # Excel 导出    (~143 KB gz, 按需加载)
    └── ...
```

## 二、部署方案

### 方案 A：静态托管（最简单 · 推荐演示用）

#### 1. Vercel

```bash
npm i -g vercel
vercel --prod
```

直接将整个项目目录拖入 Vercel 网站也可，构建命令 `npm run build`，输出目录 `dist`。

#### 2. Netlify

```bash
# 拖拽 dist/ 到 https://app.netlify.com/drop
```

或通过 CLI：

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### 3. GitHub Pages

```bash
# 部署到 https://<user>.github.io/<repo>/
VITE_BASE_PATH=/your-repo-name/ npm run build

# 使用 gh-pages 包
npm i -D gh-pages
npx gh-pages -d dist
```

仓库 Settings → Pages 选择 `gh-pages` 分支即可。

#### 4. 阿里云 OSS / 腾讯云 COS

将 `dist/` 目录上传到 bucket，开启静态网站托管，把 404 重定向到 `index.html`（hash 路由实际不需要，但保险）。

### 方案 B：Nginx 自托管

```nginx
server {
    listen 80;
    server_name census.example.com;
    root /var/www/census-system;
    index index.html;

    # 主入口
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源长期缓存
    location ~* \.(js|css|woff2?|svg|png|jpe?g|gif|ico|json)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;
}
```

部署步骤：

```bash
npm run build
scp -r dist/* user@server:/var/www/census-system/
sudo nginx -t && sudo systemctl reload nginx
```

### 方案 C：Nginx 子路径部署

部署到 `https://example.com/census/`：

```bash
VITE_BASE_PATH=/census/ npm run build
```

```nginx
location /census/ {
    alias /var/www/census-system/;
    try_files $uri $uri/ /census/index.html;
}
```

### 方案 D：Docker

`Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf`：

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

构建并启动：

```bash
docker build -t census-system .
docker run -d -p 8080:80 --name census census-system
```

`docker-compose.yml`：

```yaml
version: '3'
services:
  census:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

## 三、AI 真实模式部署建议

⚠️ 真实模式下用户的 API Key 存储在**浏览器 localStorage**（Base64 编码，非加密）。

### 推荐生产做法：反向代理 AI API

避免 Key 暴露到浏览器 —— 让前端调你自己的代理，代理服务持有 Key：

```nginx
# 前端调 /api/ai/chat/completions，代理转发到 DeepSeek
location /api/ai/ {
    proxy_pass https://api.deepseek.com/v1/;
    proxy_set_header Authorization "Bearer sk-xxxx";   # 服务端持 Key
    proxy_set_header Host api.deepseek.com;
}
```

前端 AI 设置中：
- API 地址：`https://your-domain.com/api/ai`
- API Key：留空或任意字符（已由代理注入）

## 四、环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `VITE_BASE_PATH` | `./` | 部署子路径，如 `/census/` |

构建时通过命令行注入：

```bash
VITE_BASE_PATH=/census/ npm run build
```

或在 `.env.production` 文件中：

```
VITE_BASE_PATH=/census/
```

## 五、HTTPS 要求

以下功能**必须 HTTPS**（或 localhost）才能使用：

- 🎤 **语音输入**（Web Speech API）
- 📷 **照片识别**（getUserMedia）
- 🔐 **subtle.crypto**（密码哈希）

部署到生产环境强烈建议配置 SSL 证书（Let's Encrypt 免费）。

## 六、浏览器兼容

| 浏览器 | 最低版本 |
|--------|---------|
| Chrome / Edge | 90+ |
| Safari | 14+ |
| Firefox | 90+ |
| 微信内置 | iOS 14+ |

不支持 IE。

## 七、常见问题

### Q1: 部署后页面打开空白
检查浏览器 DevTools 控制台：
- 大概率是 `base` 路径错了 → 重新带 `VITE_BASE_PATH` 构建
- 资源 404 → 检查 Nginx alias / root 配置

### Q2: 刷新页面 404
hash 路由（带 `#/path`）不会有这个问题。如果改成 history 模式才会，那时需要 nginx `try_files` 兜底到 `index.html`。

### Q3: 数据清空了
所有数据在浏览器 IndexedDB。清浏览器缓存 / 隐私模式 / 不同浏览器都是不同的数据库。系统设计为**演示型零后端**，生产用建议接入真实后端。

### Q4: 移动端打不开
- 确认 URL：移动端入口为 `/#/m/home`
- 首次访问根路径，移动设备会自动跳转到 `/m/home`

### Q5: AI 真实模式总是失败
1. 打开 系统管理 → AI 设置 → 调用统计，看错误信息
2. 检查 baseURL 末尾不要带 `/chat/completions`，只到 `/v1`
3. 跨域：API 服务商需支持 CORS，或通过反向代理（推荐）
