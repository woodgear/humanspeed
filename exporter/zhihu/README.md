# Zhihu Feed Scraper

一个基于 Playwright 和 VNC 的知乎信息流爬取应用，支持扫码登录、自动抓取推荐内容，并通过 REST API 对外提供数据服务。

## 特性

- ✅ **扫码登录**: 安全的知乎扫码登录，支持会话持久化
- ✅ **自动抓取**: 智能滚动加载，自动抓取知乎推荐信息流
- ✅ **VNC 可视化**: 通过 VNC 或 NoVNC Web 界面实时查看浏览器状态
- ✅ **NoVNC 支持**: 无需安装客户端，浏览器直接访问
- ✅ **K8s 风格 API**: Kubernetes 资源风格的 REST API
- ✅ **CLI 工具**: zhihu-ctl 命令行工具，支持 YAML 输出
- ✅ **Docker 支持**: 开箱即用的 Docker 镜像
- ✅ **数据去重**: 基于内容 ID 的智能去重机制
- ✅ **可扩展存储**: 抽象存储接口设计，便于扩展持久化方案

## 技术栈

- **Node.js + TypeScript** - 现代化的 TypeScript 开发
- **Playwright** - 浏览器自动化（headed 模式）
- **Fastify** - 高性能 Web 框架
- **Xvfb + x11vnc** - 虚拟显示和 VNC 服务
- **NoVNC + websockify** - Web 端 VNC 访问
- **Winston** - 日志管理
- **Docker** - 容器化部署

## 快速开始

### 方式一：使用 Docker（推荐）

```bash
# 构建镜像
docker build -t zhihu-scraper .

# 运行容器
docker run -d \
  --name zhihu-scraper \
  -p 3000:3000 \
  -p 5900:5900 \
  -p 6080:6080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  zhihu-scraper

# 查看日志
docker logs -f zhihu-scraper
```

访问：
- API Server: http://localhost:3000
- NoVNC Web: http://localhost:6080/vnc.html?host=localhost&port=6080
- VNC Client: localhost:5900

### 方式二：本地开发

#### 1. 安装系统依赖

运行 VNC 环境设置脚本：

```bash
npm run setup:vnc
```

或手动安装（Arch Linux）：

```bash
sudo pacman -S xorg-server-xvfb x11vnc
```

### 2. 安装项目依赖

```bash
npm install
```

### 3. 安装 Playwright 浏览器

```bash
npm run install:browser
```

### 4. 配置环境变量

```bash
cp .env.example .env
```

根据需要修改 `.env` 文件中的配置。

### 5. 启动应用

开发模式（支持热重载）：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

#### 6. 查看浏览器界面

**方式 A：使用 NoVNC（推荐，无需安装）**

直接在浏览器中打开：
```
http://localhost:6080/vnc.html?host=localhost&port=6080
```

**方式 B：使用 VNC 客户端**

```bash
vncviewer localhost:5900
```

推荐的 VNC 客户端：
- [TigerVNC](https://tigervnc.org/)
- [RealVNC Viewer](https://www.realvnc.com/en/connect/download/viewer/)
- `vncviewer` (Linux)

## CLI 工具

项目提供了 `zhihu-ctl` 命令行工具，用于管理 feed items：

```bash
# 查看帮助
./zhihu-ctl help

# 列出 feed items（YAML 格式）
./zhihu-ctl get feeditems

# 限制数量
./zhihu-ctl get feeditems --limit 10

# 跳过前面的 items
./zhihu-ctl get feeditems --limit 10 --offset 20

# 宽格式输出（表格）
./zhihu-ctl get feeditems --output wide

# JSON 格式输出
./zhihu-ctl get feeditems --output json

# 结合 yq 使用
./zhihu-ctl get feeditems --limit 5 | yq '.[0].title'
```

输出示例（默认 YAML 格式）：
```yaml
- name: "1989287332084488127"
  title: "如何看待某某事件？"
  answer: "这是一个很有趣的问题..."
  author: "张三"
  votes: 1234
  comments: 56
```

## API 使用

### Kubernetes 风格 API

所有 API 遵循 Kubernetes 资源风格，返回格式包含 `kind`、`apiVersion`、`metadata`、`spec`、`status` 等字段。

#### 获取 FeedItem 列表

```bash
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems?limit=10&offset=0"
```

响应：
```json
{
  "kind": "FeedItemList",
  "apiVersion": "zhihu.scraper.io/v1",
  "metadata": {
    "remainingItemCount": 90
  },
  "items": [
    {
      "kind": "FeedItem",
      "apiVersion": "zhihu.scraper.io/v1",
      "metadata": {
        "name": "1989287332084488127",
        "creationTimestamp": "2025-12-31T04:12:34.567Z",
        "labels": {
          "zhihu.scraper.io/type": "answer",
          "zhihu.scraper.io/author": "zhang-san"
        },
        "annotations": {
          "zhihu.scraper.io/url": "https://www.zhihu.com/question/123/answer/456"
        }
      },
      "spec": {
        "title": "如何看待某某事件？",
        "excerpt": "这是一个很有趣的问题...",
        "url": "https://www.zhihu.com/question/123/answer/456",
        "author": {
          "name": "张三",
          "url": "https://www.zhihu.com/people/zhangsan",
          "avatar": "https://..."
        },
        "tags": ["科技", "互联网"]
      },
      "status": {
        "type": "answer",
        "stats": {
          "voteCount": 1234,
          "commentCount": 56
        }
      }
    }
  ]
}
```

**注意：** API 会自动触发抓取，如果现有数据不足以满足请求，会自动抓取更多数据。

#### 获取单个 FeedItem

```bash
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems/1989287332084488127"
```

### 传统 API（兼容）

### 认证相关

#### 生成登录二维码

```bash
curl -X POST http://localhost:3000/api/auth/qrcode
```

响应：

```json
{
  "success": true,
  "data": {
    "base64": "data:image/png;base64,...",
    "sessionId": "qr_1234567890_abc123",
    "expiresIn": 300
  },
  "timestamp": 1735545600000
}
```

#### 检查登录状态

```bash
curl "http://localhost:3000/api/auth/status?sessionId=qr_1234567890_abc123"
```

#### 验证当前登录

```bash
curl http://localhost:3000/api/auth/verify
```

#### 退出登录

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

### 信息流相关

#### 触发抓取

```bash
curl -X POST http://localhost:3000/api/feed/scrape \
  -H "Content-Type: application/json" \
  -d '{"maxItems": 50, "clearCache": false}'
```

响应：

```json
{
  "success": true,
  "data": {
    "itemsScraped": 50,
    "items": [...]
  },
  "timestamp": 1735545600000
}
```

#### 获取信息流

```bash
curl "http://localhost:3000/api/feed?limit=20&offset=0"
```

#### 获取单条信息

```bash
curl http://localhost:3000/api/feed/12345
```

#### 清空存储

```bash
curl -X DELETE http://localhost:3000/api/feed
```

### 系统状态

#### 健康检查

```bash
curl http://localhost:3000/api/status
```

响应：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "browser": true,
    "vnc": true,
    "session": true,
    "feedCount": 100,
    "uptime": 12345.67,
    "version": "1.0.0"
  }
}
```

#### VNC 连接信息

```bash
curl http://localhost:3000/api/vnc
```

#### 捕获浏览器截图

```bash
curl http://localhost:3000/api/debug/screenshot
```

## 项目结构

```
zhihu/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── config/                    # 配置管理
│   ├── browser/                   # 浏览器管理
│   │   ├── manager.ts            # Playwright 浏览器管理
│   │   ├── session.ts            # 会话持久化
│   │   └── vnc.ts                # VNC 服务
│   ├── scraper/                   # 爬虫核心
│   │   ├── auth.ts               # 扫码登录
│   │   ├── feed.ts               # 信息流抓取
│   │   └── parser.ts             # DOM 解析
│   ├── storage/                   # 数据存储
│   │   └── feed-store.ts         # 存储接口和实现
│   ├── api/                       # REST API
│   │   ├── server.ts             # HTTP 服务器
│   │   ├── routes/               # 路由
│   │   └── middleware/           # 中间件
│   ├── types/                     # TypeScript 类型
│   └── utils/                     # 工具函数
├── scripts/
│   └── setup-vnc.sh              # VNC 环境设置
├── data/                          # 数据目录（自动创建）
├── logs/                          # 日志目录（自动创建）
└── package.json
```

## 开发指南

### 扩展存储实现

当前使用内存存储，可以轻松扩展为持久化存储：

```typescript
// src/storage/feed-store.ts

// JSON 文件存储示例
export class JsonFileFeedStore implements IFeedStore {
  async save(items: FeedItem[]): Promise<void> {
    // 实现 JSON 文件存储
  }
  // ... 实现其他接口方法
}

// SQLite 数据库存储示例
export class SqliteFeedStore implements IFeedStore {
  async save(items: FeedItem[]): Promise<void> {
    // 实现 SQLite 存储
  }
  // ... 实现其他接口方法
}

// 切换存储实现
export const feedStore: IFeedStore = new JsonFileFeedStore();
```

### 自定义选择器

知乎的 HTML 结构可能会变化，需要更新选择器：

编辑 `src/scraper/parser.ts` 中的 `SELECTORS` 常量：

```typescript
const SELECTORS = {
  FEED_CONTAINER: '.Topstory-mainColumn',
  FEED_ITEM: '.ContentItem',
  // ... 更新其他选择器
};
```

编辑 `src/scraper/auth.ts` 中的登录相关选择器。

## 配置说明

主要环境变量（`.env`）：

```bash
# 服务器配置
PORT=3000

# VNC 配置
DISPLAY=:99
VNC_PORT=5900

# 浏览器配置
BROWSER_WIDTH=1920
BROWSER_HEIGHT=1080

# 爬虫配置
MAX_FEED_ITEMS=100          # 单次最大抓取数量
SCRAPE_TIMEOUT=30000        # 抓取超时（毫秒）
SCROLL_INTERVAL=2000        # 滚动间隔
SESSION_EXPIRE_DAYS=7       # 会话过期天数

# 反爬虫配置
MIN_REQUEST_DELAY=1000      # 最小请求延迟
MAX_REQUEST_DELAY=3000      # 最大请求延迟
```

## 注意事项

1. **反爬虫**: 已内置随机延迟和 User-Agent 设置，但仍需注意请求频率
2. **会话管理**: Cookie 默认 7 天过期，过期后需重新登录
3. **资源占用**: Headed 模式比 Headless 占用更多资源
4. **VNC 安全**: 默认无密码，生产环境建议配置密码或仅监听 localhost
5. **选择器更新**: 知乎页面结构变化时，需要更新 DOM 选择器

## 故障排除

### 浏览器无法启动

```bash
# 检查 Xvfb 是否运行
ps aux | grep Xvfb

# 手动启动 Xvfb
Xvfb :99 -screen 0 1920x1080x24 &
```

### VNC 无法连接

```bash
# 检查 x11vnc 是否运行
ps aux | grep x11vnc

# 检查端口占用
lsof -i :5900

# 手动启动 VNC
x11vnc -display :99 -forever -nopw -quiet &
```

### 登录失败

- 检查网络连接
- 查看 VNC 中浏览器状态
- 检查日志文件 `logs/error.log`
- 确认二维码是否过期（5 分钟有效期）

## 许可证

MIT

## 作者

Generated with Claude Code

# TODO
- 获取/倒入个人关注
- 获取指定用户发布的信息
- 根据某种自定义dsl
# NOT TODO