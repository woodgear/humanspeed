# API Reference

完整的 Zhihu Feed Scraper API 文档。

## Base URL

```
http://localhost:3000
```

## API 版本

- **K8s Style API**: `/apis/zhihu.scraper.io/v1`
- **Legacy API**: `/api`

## 通用响应格式

### K8s 风格响应

所有 K8s 风格 API 返回包含以下字段：

```typescript
{
  kind: string;              // 资源类型，如 "FeedItem", "FeedItemList"
  apiVersion: string;        // API 版本，如 "zhihu.scraper.io/v1"
  metadata: {               // 资源元数据
    name?: string;          // 资源名称（唯一标识）
    creationTimestamp?: string;  // 创建时间
    labels?: Record<string, string>;  // 标签
    annotations?: Record<string, string>;  // 注解
    remainingItemCount?: number;  // 剩余项数（仅 List）
  };
  spec?: object;            // 资源规格（期望状态）
  status?: object;          // 资源状态（当前状态）
  items?: object[];         // 资源列表（仅 List 类型）
}
```

### 传统 API 响应

```typescript
{
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}
```

## Kubernetes 风格 API

### FeedItem Resources

#### List FeedItems

获取 FeedItem 列表，如果数据不足会自动触发抓取。

**请求**

```http
GET /apis/zhihu.scraper.io/v1/feeditems
```

**Query Parameters**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 20 | 返回的最大项数 |
| offset | number | 0 | 跳过的项数 |
| type | string | - | 过滤类型：answer, article, zvideo, pin |

**响应**

```json
{
  "kind": "FeedItemList",
  "apiVersion": "zhihu.scraper.io/v1",
  "metadata": {
    "remainingItemCount": 80
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
        "excerpt": "这是一个很有趣的问题，让我来分析一下...",
        "url": "https://www.zhihu.com/question/123/answer/456",
        "author": {
          "name": "张三",
          "url": "https://www.zhihu.com/people/zhangsan",
          "avatar": "https://pic.zhimg.com/v2/avatar.jpg"
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

**自动抓取行为**

当 `offset + limit` 超过现有数据量时，API 会自动触发抓取：

```
现有数据: 10 条
请求: offset=5, limit=20
需要: 25 条
动作: 自动抓取至少 15 条（实际会抓取 max(需要数量, 10)）
```

**示例**

```bash
# 获取前 10 条
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems?limit=10"

# 获取第 21-30 条
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems?limit=10&offset=20"

# 仅获取回答类型
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems?type=answer"
```

#### Get Single FeedItem

获取单个 FeedItem。

**请求**

```http
GET /apis/zhihu.scraper.io/v1/feeditems/:name
```

**Path Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | FeedItem 的唯一标识符 |

**响应**

```json
{
  "kind": "FeedItem",
  "apiVersion": "zhihu.scraper.io/v1",
  "metadata": {
    "name": "1989287332084488127",
    "creationTimestamp": "2025-12-31T04:12:34.567Z"
  },
  "spec": { ... },
  "status": { ... }
}
```

**错误响应**

```json
{
  "kind": "Status",
  "apiVersion": "zhihu.scraper.io/v1",
  "status": "Failure",
  "message": "FeedItem not found",
  "reason": "NotFound",
  "code": 404
}
```

**示例**

```bash
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems/1989287332084488127"
```

## 传统 API (Legacy)

### 认证接口

#### 生成登录二维码

生成知乎登录二维码。

**请求**

```http
POST /api/auth/qrcode
```

**响应**

```json
{
  "success": true,
  "data": {
    "base64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "sessionId": "qr_1735545600123_abc123",
    "expiresIn": 300
  },
  "timestamp": 1735545600000
}
```

**字段说明**

- `base64`: Base64 编码的二维码图片
- `sessionId`: 会话 ID，用于轮询登录状态
- `expiresIn`: 二维码有效期（秒）

**示例**

```bash
curl -X POST http://localhost:3000/api/auth/qrcode
```

#### 检查登录状态

轮询检查扫码登录状态。

**请求**

```http
GET /api/auth/status?sessionId=:sessionId
```

**Query Parameters**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 二维码会话 ID |

**响应**

```json
{
  "success": true,
  "data": {
    "status": "scanned",  // pending | scanned | confirmed | expired
    "sessionId": "qr_1735545600123_abc123"
  },
  "timestamp": 1735545600000
}
```

**状态说明**

- `pending`: 等待扫码
- `scanned`: 已扫码，等待确认
- `confirmed`: 已确认，登录成功
- `expired`: 二维码已过期

**示例**

```bash
curl "http://localhost:3000/api/auth/status?sessionId=qr_1735545600123_abc123"
```

#### 验证登录状态

验证当前是否已登录。

**请求**

```http
GET /api/auth/verify
```

**响应**

```json
{
  "success": true,
  "data": {
    "isLoggedIn": true,
    "username": "张三"
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl http://localhost:3000/api/auth/verify
```

#### 退出登录

退出当前登录状态。

**请求**

```http
POST /api/auth/logout
```

**响应**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

### 信息流接口

#### 触发抓取

手动触发信息流抓取。

**请求**

```http
POST /api/feed/scrape
Content-Type: application/json
```

**请求体**

```json
{
  "maxItems": 50,
  "clearCache": false
}
```

**Body Parameters**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| maxItems | number | 20 | 最大抓取数量 |
| clearCache | boolean | false | 是否清空现有数据 |

**响应**

```json
{
  "success": true,
  "data": {
    "itemsScraped": 50,
    "items": [ ... ]
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
# 抓取 50 条
curl -X POST http://localhost:3000/api/feed/scrape \
  -H "Content-Type: application/json" \
  -d '{"maxItems": 50}'

# 清空后重新抓取
curl -X POST http://localhost:3000/api/feed/scrape \
  -H "Content-Type: application/json" \
  -d '{"maxItems": 50, "clearCache": true}'
```

#### 获取信息流列表

获取已抓取的信息流数据。

**请求**

```http
GET /api/feed
```

**Query Parameters**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 20 | 返回数量 |
| offset | number | 0 | 偏移量 |
| type | string | - | 类型过滤 |

**响应**

```json
{
  "success": true,
  "data": {
    "total": 100,
    "items": [ ... ]
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl "http://localhost:3000/api/feed?limit=10&offset=0"
```

#### 获取单条信息

根据 ID 获取单条信息。

**请求**

```http
GET /api/feed/:id
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "1989287332084488127",
    "type": "answer",
    "title": "如何看待某某事件？",
    "excerpt": "...",
    "url": "...",
    "author": { ... },
    "stats": { ... },
    "tags": [ ... ],
    "createdAt": "2025-12-31T04:12:34.567Z"
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl "http://localhost:3000/api/feed/1989287332084488127"
```

#### 清空信息流

删除所有已存储的信息流数据。

**请求**

```http
DELETE /api/feed
```

**响应**

```json
{
  "success": true,
  "data": {
    "message": "All feed items deleted",
    "count": 100
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl -X DELETE http://localhost:3000/api/feed
```

### 系统接口

#### 健康检查

获取系统状态。

**请求**

```http
GET /api/status
```

**响应**

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
  },
  "timestamp": 1735545600000
}
```

**字段说明**

- `status`: 整体状态（ok/degraded/error）
- `browser`: 浏览器是否运行
- `vnc`: VNC 服务是否运行
- `session`: 是否有有效会话
- `feedCount`: 已存储的 feed 数量
- `uptime`: 运行时间（秒）
- `version`: 应用版本

**示例**

```bash
curl http://localhost:3000/api/status
```

#### VNC 连接信息

获取 VNC 连接信息。

**请求**

```http
GET /api/vnc
```

**响应**

```json
{
  "success": true,
  "data": {
    "host": "localhost",
    "port": 5900,
    "display": ":99",
    "novncUrl": "http://localhost:6080/vnc.html?host=localhost&port=6080"
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl http://localhost:3000/api/vnc
```

#### 浏览器截图

获取当前浏览器页面截图。

**请求**

```http
GET /api/debug/screenshot
```

**响应**

```json
{
  "success": true,
  "data": {
    "base64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "timestamp": "2025-12-31T04:12:34.567Z"
  },
  "timestamp": 1735545600000
}
```

**示例**

```bash
curl http://localhost:3000/api/debug/screenshot
```

## 错误响应

### K8s 风格错误

```json
{
  "kind": "Status",
  "apiVersion": "zhihu.scraper.io/v1",
  "status": "Failure",
  "message": "Resource not found",
  "reason": "NotFound",
  "code": 404
}
```

### 传统 API 错误

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found"
  },
  "timestamp": 1735545600000
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

## 速率限制

当前版本未实施速率限制，建议：

- 请求间隔至少 1 秒
- 避免并发请求超过 5 个
- 大量抓取时使用批处理

## 认证和授权

当前版本无需 API 认证。

**安全建议：**
- 仅在受信任网络中运行
- 使用反向代理（如 nginx）添加认证
- 生产环境部署时启用 HTTPS

## 示例：完整工作流

### 1. 启动应用并登录

```bash
# 启动应用
npm start

# 生成二维码
QR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/qrcode)
SESSION_ID=$(echo $QR_RESPONSE | jq -r '.data.sessionId')

# 显示二维码（在终端或保存为图片）
echo $QR_RESPONSE | jq -r '.data.base64'

# 轮询登录状态
while true; do
  STATUS=$(curl -s "http://localhost:3000/api/auth/status?sessionId=$SESSION_ID" | jq -r '.data.status')
  echo "Login status: $STATUS"
  
  if [ "$STATUS" = "confirmed" ]; then
    echo "Login successful!"
    break
  elif [ "$STATUS" = "expired" ]; then
    echo "QR code expired"
    exit 1
  fi
  
  sleep 2
done
```

### 2. 抓取和查询数据

```bash
# 抓取 50 条数据
curl -X POST http://localhost:3000/api/feed/scrape \
  -H "Content-Type: application/json" \
  -d '{"maxItems": 50}'

# 使用 K8s API 获取数据
curl "http://localhost:3000/apis/zhihu.scraper.io/v1/feeditems?limit=10" | jq '.items[0].spec.title'

# 使用 CLI 工具
./zhihu-ctl get feeditems --limit 10

# 使用 yq 处理 YAML 输出
./zhihu-ctl get feeditems --limit 5 | yq '.[].title'
```

### 3. 监控和调试

```bash
# 检查系统状态
curl http://localhost:3000/api/status | jq

# 获取 VNC 连接信息
curl http://localhost:3000/api/vnc | jq '.data.novncUrl'

# 浏览器截图
curl http://localhost:3000/api/debug/screenshot | jq -r '.data.base64' | base64 -d > screenshot.png
```

## 版本历史

- **v1.0.0** (2025-12-31)
  - 初始版本
  - K8s 风格 API
  - NoVNC 支持
  - Docker 容器化

---

最后更新：2025-12-31
