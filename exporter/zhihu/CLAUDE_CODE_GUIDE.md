# Claude Code 开发指南

本文档记录了使用 Claude Code 开发本项目的工作流程、最佳实践和经验总结。

## 项目概览

这是一个知乎信息流爬虫项目，主要特性：
- Playwright 浏览器自动化
- VNC/NoVNC 可视化
- Kubernetes 风格 REST API
- 会话持久化
- Docker 容器化部署

## 开发历程

### 第一阶段：基础架构（已完成）

1. **项目初始化**
   - TypeScript + Node.js 环境搭建
   - 基础目录结构设计
   - 配置管理（dotenv）

2. **浏览器自动化**
   - Playwright 集成
   - VNC 服务（Xvfb + x11vnc）
   - Headed 模式浏览器管理

3. **登录认证**
   - 扫码登录实现
   - 会话持久化（Cookies + LocalStorage）
   - 登录状态验证

4. **数据抓取**
   - 信息流解析器
   - jsdom DOM 解析
   - 自动滚动加载
   - 数据去重

5. **REST API**
   - Fastify HTTP 服务器
   - 认证、抓取、查询接口
   - 错误处理中间件

### 第二阶段：API 重构（已完成）

1. **Kubernetes 风格 API**
   - 定义 K8s 资源类型（TypeMeta, ObjectMeta, FeedItemResource）
   - 实现转换层（k8s-converter）
   - 新增 `/apis/zhihu.scraper.io/v1/` 路由
   - 自动抓取机制

2. **CLI 工具**
   - 实现 `zhihu-ctl` bash 脚本
   - 支持 YAML/JSON/表格输出格式
   - Unix 风格设计（管道友好）

### 第三阶段：容器化（已完成）

1. **NoVNC 集成**
   - 安装 websockify 和 @novnc/novnc
   - 自动启动 websockify 代理
   - Web 端 VNC 访问

2. **Docker 支持**
   - 编写 Dockerfile
   - 多阶段构建优化
   - .dockerignore 配置

## Claude Code 工作流程

### 1. 任务规划

使用 `TodoWrite` 工具追踪任务：

```typescript
// 示例：添加新功能时的任务分解
TodoWrite({
  todos: [
    { content: "研究现有代码结构", status: "in_progress" },
    { content: "设计 API 接口", status: "pending" },
    { content: "实现核心功能", status: "pending" },
    { content: "编写测试", status: "pending" },
    { content: "更新文档", status: "pending" }
  ]
})
```

**最佳实践：**
- 将大任务拆分为小步骤（3-5 个子任务）
- 每完成一步立即更新状态
- 同一时间只有一个 `in_progress` 任务

### 2. 代码探索

**使用 Task + Explore Agent：**

```bash
# 错误方式：直接使用 Grep
Grep({ pattern: "client.*error" })

# 正确方式：使用 Explore Agent
Task({
  subagent_type: "Explore",
  prompt: "Where are client errors handled in the codebase?",
  thoroughness: "medium"
})
```

**何时使用 Explore Agent：**
- ✅ 理解代码库结构
- ✅ 查找功能实现位置
- ✅ 分析架构设计
- ❌ 查找具体文件（用 Glob）
- ❌ 查找特定函数定义（用 Grep）

### 3. 文件操作

**读取文件：**
```typescript
// 批量读取相关文件
Read({ file_path: "/path/to/file1.ts" })
Read({ file_path: "/path/to/file2.ts" })
Read({ file_path: "/path/to/file3.ts" })
```

**编辑文件：**
```typescript
// 使用 Edit 工具而非 Write
Edit({
  file_path: "/path/to/file.ts",
  old_string: "const port = 3000;",
  new_string: "const port = config.port;"
})
```

**创建文件：**
```typescript
// 仅在必要时创建新文件
Write({
  file_path: "/path/to/new-file.ts",
  content: "export const foo = 'bar';"
})
```

**最佳实践：**
- 优先编辑现有文件，避免创建新文件
- 编辑前必须先读取文件
- 使用精确的 `old_string` 匹配

### 4. 增量开发

**模式：读取 → 理解 → 修改 → 验证**

示例：添加 NoVNC 支持

```
1. Read: src/browser/vnc.ts
2. 理解：VNC 服务已启动 x11vnc
3. 修改：添加 websockify 进程管理
4. 验证：测试 NoVNC URL 是否可访问
```

### 5. Git 工作流

```bash
# 1. 检查状态
git status

# 2. 添加文件
git add -A

# 3. 提交（清晰的 commit message）
git commit -m "Add NoVNC support

- Install websockify and @novnc/novnc packages
- Update VNC service to auto-start websockify proxy
- Display NoVNC URL on startup"

# 4. 推送
git push
```

**Commit Message 格式：**
```
<简短标题>

<详细说明>
- 改动点 1
- 改动点 2
- 改动点 3
```

## 技术决策记录

### 为什么使用 jsdom 而非 Cheerio？

- jsdom 提供完整的浏览器 DOM API
- 与 Playwright 获取的 HTML 无缝集成
- 支持标准 `querySelector` 和 `querySelectorAll`

### 为什么采用 Kubernetes 风格 API？

- 统一的资源模型（kind, apiVersion, metadata, spec, status）
- 便于未来扩展（版本控制、多资源类型）
- 与云原生生态对齐

### 为什么选择 Fastify 而非 Express？

- 更好的 TypeScript 支持
- 更高的性能
- 内置 JSON Schema 验证

### 为什么使用 NoVNC？

- 无需安装 VNC 客户端
- 浏览器直接访问，降低使用门槛
- 便于容器化部署和远程调试

## 常见问题和解决方案

### 问题 1：Browser Page Closed 错误

**现象：** 应用重启后出现 "Target page has been closed" 错误

**原因：** tsx watch 模式导致浏览器关闭但应用未完全重启

**解决：** 手动重启应用或修改文件触发完整重启

### 问题 2：Docker 构建网络超时

**现象：** `failed to do request: dial tcp timeout`

**原因：** Docker Hub 连接问题（可能是 IPv6 相关）

**解决方案：**
1. 配置 Docker 镜像源
2. 使用代理
3. 在网络环境好的机器上构建

### 问题 3：YAML 输出不合法

**现象：** `zhihu-ctl` 输出看起来像 YAML 但无法被 yq 解析

**解决：** 
- 确保所有字符串用引号包裹
- 使用一致的缩进
- 摘要行使用 YAML 注释 `#`

### 问题 4：Import 路径错误

**现象：** `Cannot find module '/path/to/index.js'`

**解决：** 
- TypeScript 中使用 `.js` 扩展名（编译后路径）
- 检查实际文件是否存在
- 从 `index.js` 改为具体文件名（如 `manager.js`）

## 最佳实践总结

### 代码质量

1. **类型安全**
   - 定义清晰的 TypeScript 接口
   - 避免使用 `any`
   - 使用 Zod 进行运行时验证

2. **错误处理**
   - 使用 try-catch 包裹异步操作
   - 记录详细的错误日志
   - 向用户返回有意义的错误信息

3. **日志记录**
   - 使用分级日志（debug, info, warn, error）
   - 记录关键操作和状态变化
   - 避免在循环中打印过多日志

### 架构设计

1. **关注点分离**
   - browser/ - 浏览器管理
   - scraper/ - 爬虫逻辑
   - storage/ - 数据存储
   - api/ - HTTP 接口

2. **接口抽象**
   - `IFeedStore` 存储接口
   - 便于切换实现（内存 → 文件 → 数据库）

3. **配置管理**
   - 集中式配置（config/index.ts）
   - 环境变量优先
   - 合理的默认值

### 用户体验

1. **清晰的日志输出**
   - 启动时显示所有访问 URL
   - 使用分隔符 `=`.repeat(60)
   - 分步骤展示启动过程

2. **Unix 哲学**
   - CLI 工具输出可管道化
   - 支持多种输出格式
   - 无不必要的颜色和装饰

3. **容器友好**
   - 日志输出到 stdout/stderr
   - 优雅关闭（SIGINT/SIGTERM）
   - Volume 挂载数据目录

## 未来改进方向

### 短期（1-2 周）

- [ ] 添加单元测试和集成测试
- [ ] 实现数据持久化（SQLite/PostgreSQL）
- [ ] 添加 Prometheus metrics
- [ ] 完善错误处理和重试机制

### 中期（1-2 月）

- [ ] 支持多用户会话
- [ ] 实现增量抓取和更新
- [ ] 添加内容过滤和分类
- [ ] WebSocket 实时推送

### 长期（3-6 月）

- [ ] 分布式爬虫架构
- [ ] 数据分析和可视化
- [ ] 机器学习内容推荐
- [ ] 多平台支持（微博、Twitter）

## 参考资源

- [Playwright 文档](https://playwright.dev/)
- [Fastify 文档](https://www.fastify.io/)
- [Kubernetes API Conventions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md)
- [NoVNC 项目](https://github.com/novnc/noVNC)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)

## 贡献

使用 Claude Code 开发时的建议：

1. **保持对话连续性**
   - 一个会话完成一个完整功能
   - 避免频繁切换上下文

2. **充分利用工具**
   - TodoWrite 追踪进度
   - Task Agent 探索代码
   - Git 频繁提交

3. **清晰的需求描述**
   - 说明想要什么功能
   - 提供示例输入输出
   - 指出约束条件

4. **及时反馈**
   - 发现问题立即指出
   - 说明期望的行为
   - 提供错误信息

---

最后更新：2025-12-31
维护者：Claude Code
