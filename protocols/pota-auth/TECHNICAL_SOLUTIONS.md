# POTA 认证技术方案推荐

## 需求概述

1. 用户能够在我们的网站中通过一些流程拿到 POTA 的登录态
2. 能够静默刷新登录态（无需用户重新登录）

## 方案对比总览

| 方案                         | 用户体验   | 安全性     | 实现复杂度 | 可维护性   | 推荐度     |
| ---------------------------- | ---------- | ---------- | ---------- | ---------- | ---------- |
| 方案 1: iframe + 后端代理    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ |
| 方案 2: 新窗口 + postMessage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |
| 方案 3: 后端完全代理         | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| 方案 4: 混合方案             | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |

---

## 方案 1: iframe + 后端代理（推荐）

### 概述

使用隐藏的 iframe 完成认证流程，所有 token 存储在后端，前端通过 API 获取 token。

### 流程

```
用户点击"连接 POTA"
    ↓
前端请求后端生成授权 URL
    ↓
后端生成 PKCE 参数，返回授权 URL
    ↓
前端创建隐藏 iframe，加载授权 URL
    ↓
用户在 iframe 中完成登录（POTA 登录页面）
    ↓
iframe 重定向到 https://pota.app/?code=xxx
    ↓
前端监听 iframe URL 变化，提取 code
    ↓
前端发送 code 到后端
    ↓
后端用 code 交换 token，加密存储
    ↓
完成认证
    ↓
后续：前端通过后端 API 获取 token（后端自动刷新）
```

### 优点

- ✅ **安全性最高**：refresh_token 完全在后端，前端无法访问
- ✅ **用户体验好**：无需跳转，在当前页面完成
- ✅ **自动刷新**：后端自动处理 token 刷新，前端无感知
- ✅ **符合 OAuth2 最佳实践**：token 不暴露给前端

### 缺点

- ⚠️ **跨域限制**：需要处理 iframe 跨域访问（通过监听 URL 变化）
- ⚠️ **浏览器兼容性**：某些浏览器可能限制 iframe 跨域

### 实现要点

1. **前端**：

   - 创建隐藏 iframe
   - 监听 iframe 的 `load` 事件和 URL 变化
   - 提取授权码后发送到后端

2. **后端**：
   - 生成 PKCE 参数并临时存储
   - 接收授权码，交换 token
   - 加密存储 refresh_token
   - 提供 `/api/pota/token` 接口，自动处理刷新

### 适用场景

- ✅ 推荐用于生产环境
- ✅ 需要高安全性的场景
- ✅ 希望 token 完全由后端管理的场景

---

## 方案 2: 新窗口 + postMessage

### 概述

打开新窗口完成认证，通过 postMessage 在窗口间通信。

### 流程

```
用户点击"连接 POTA"
    ↓
前端请求后端生成授权 URL
    ↓
打开新窗口（popup），加载授权 URL
    ↓
用户在新窗口中完成登录
    ↓
新窗口重定向到 https://pota.app/?code=xxx
    ↓
POTA 页面通过 postMessage 发送 code 到父窗口
    ↓
父窗口接收 code，发送到后端
    ↓
后端用 code 交换 token，加密存储
    ↓
关闭新窗口，完成认证
```

### 优点

- ✅ **用户体验好**：新窗口不会影响当前页面
- ✅ **无跨域限制**：通过 postMessage 通信，不受同源策略限制
- ✅ **浏览器兼容性好**：所有现代浏览器都支持

### 缺点

- ⚠️ **需要 POTA 配合**：POTA 页面需要支持 postMessage（可能需要注入脚本）
- ⚠️ **可能被弹窗拦截**：某些浏览器可能阻止弹窗
- ⚠️ **需要用户交互**：必须用户点击才能打开新窗口

### 实现要点

1. **前端**：

   - 使用 `window.open()` 打开新窗口
   - 监听 `message` 事件接收授权码
   - 发送授权码到后端

2. **POTA 页面注入**（如果需要）：

   - 在 POTA 回调页面注入脚本
   - 提取 URL 中的 code，通过 postMessage 发送

3. **后端**：同方案 1

### 适用场景

- ✅ iframe 方案不可用时
- ✅ 需要更好的浏览器兼容性
- ⚠️ 需要 POTA 页面支持或能够注入脚本

---

## 方案 3: 后端完全代理（Puppeteer）

### 概述

后端使用 Puppeteer 自动化浏览器，模拟用户登录流程。

### 流程

```
用户点击"连接 POTA"
    ↓
前端显示表单，用户输入 POTA 账号密码
    ↓
前端发送账号密码到后端
    ↓
后端启动 Puppeteer，打开 POTA 登录页面
    ↓
后端自动填写表单并提交
    ↓
后端监听网络请求，提取 token
    ↓
后端加密存储 token
    ↓
完成认证
```

### 优点

- ✅ **最安全**：完全在后端处理，前端不接触任何敏感信息
- ✅ **无跨域问题**：后端直接访问 POTA
- ✅ **可控性强**：完全控制认证流程

### 缺点

- ⚠️ **需要用户提供密码**：用户需要信任我们存储密码（不推荐）
- ⚠️ **实现复杂**：需要处理 Puppeteer、网络监听等
- ⚠️ **资源消耗**：每个认证需要启动浏览器实例
- ⚠️ **维护成本高**：POTA 页面变化需要更新代码

### 实现要点

1. **后端**：

   - 使用 Puppeteer 启动无头浏览器
   - 访问 POTA 登录页面
   - 自动填写表单并提交
   - 监听网络请求，提取 token

2. **安全考虑**：
   - 不存储用户密码（或加密存储）
   - 使用后立即清除密码

### 适用场景

- ⚠️ 不推荐用于生产环境
- ⚠️ 仅在无法使用 OAuth2 流程时的备选方案
- ⚠️ 需要用户明确同意提供密码

---

## 方案 4: 混合方案（推荐备选）

### 概述

首次认证使用 iframe/新窗口，后续刷新完全由后端处理。

### 流程

```
首次认证：
  使用方案1或方案2完成认证
  后端存储 refresh_token

后续使用：
  前端调用 /api/pota/token
  后端检查 token 是否过期
  如果过期，使用 refresh_token 自动刷新
  返回新的 id_token
```

### 优点

- ✅ **结合各方案优点**：首次认证用户体验好，后续自动刷新
- ✅ **安全性高**：refresh_token 完全在后端
- ✅ **维护简单**：刷新逻辑统一在后端

### 缺点

- ⚠️ **实现稍复杂**：需要实现两个流程

### 实现要点

1. **首次认证**：使用方案 1 或方案 2
2. **Token 管理**：完全由后端处理
3. **自动刷新**：后端定时检查并刷新 token

### 适用场景

- ✅ 推荐作为方案 1 的增强版本
- ✅ 需要长期维护的场景

---

## 推荐方案

### 🏆 首选：方案 1（iframe + 后端代理）

**理由**：

1. 安全性最高：token 完全在后端管理
2. 用户体验好：无需跳转
3. 符合 OAuth2 最佳实践
4. 实现相对简单

**实现优先级**：

1. 先实现方案 1
2. 如果遇到跨域问题，再考虑方案 2 作为备选

### 🥈 备选：方案 2（新窗口 + postMessage）

**理由**：

1. 浏览器兼容性更好
2. 无跨域限制
3. 用户体验好

**注意**：需要确认 POTA 页面是否支持 postMessage，或能否注入脚本

### ❌ 不推荐：方案 3（后端完全代理）

**理由**：

1. 需要用户提供密码，安全风险高
2. 实现复杂，维护成本高
3. 违反 OAuth2 设计原则

---

## 技术实现要点

### 共同实现点

1. **后端 PKCE 生成**：

   ```javascript
   const codeVerifier = crypto.randomBytes(32).toString('base64url');
   const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
   ```

2. **Token 存储**：

   - 使用加密存储 refresh_token
   - 关联 user_id
   - 记录过期时间

3. **自动刷新机制**：

   - 检查 token 过期时间（提前 5 分钟）
   - 使用 refresh_token 刷新
   - 更新存储的 token

4. **错误处理**：
   - 刷新失败时清除 token
   - 提示用户重新认证

### 方案 1 特殊实现点

1. **iframe URL 监听**：

   ```javascript
   // 通过轮询检查 iframe URL
   setInterval(() => {
     try {
       const url = iframe.contentWindow.location.href;
       // 提取 code
     } catch (e) {
       // 跨域错误，继续等待
     }
   }, 500);
   ```

2. **跨域处理**：
   - 使用 try-catch 捕获跨域错误
   - 通过轮询检查 URL 变化

### 方案 2 特殊实现点

1. **postMessage 通信**：

   ```javascript
   // 父窗口监听
   window.addEventListener('message', (event) => {
     if (event.origin !== 'https://pota.app') return;
     // 处理 code
   });
   ```

2. **POTA 页面注入**（如果需要）：
   - 在回调页面注入脚本
   - 提取 code 并发送

---

## 数据库设计

### 表结构

```sql
-- PKCE 参数临时存储
CREATE TABLE pota_pkce (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  code_verifier TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token 存储
CREATE TABLE pota_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  id_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 安全考虑

1. **Token 加密存储**：使用 AES-256-GCM 加密
2. **PKCE 参数临时存储**：认证完成后立即删除
3. **State 验证**：防止 CSRF 攻击
4. **HTTPS 强制**：所有请求使用 HTTPS
5. **Token 过期检查**：提前 5 分钟刷新
6. **错误处理**：刷新失败时清除 token

---

## 下一步行动

1. **选择方案**：推荐方案 1（iframe + 后端代理）
2. **实现后端**：
   - PKCE 生成服务
   - Token 交换服务
   - Token 刷新服务
   - 数据库表结构
3. **实现前端**：
   - iframe 认证组件
   - Token 获取服务
4. **测试**：
   - 完整认证流程
   - Token 刷新机制
   - 错误处理

---

## Cookie 使用说明

### 发现

从抓包日志中发现，POTA 在认证流程中使用了 Cookie：

- `amplify-redirected-from-hosted-ui=true`
- `amplify-signin-with-hostedUI=true`
- `POTA_SETTINGS={...}`

### 影响分析

**关键观察**：

- ✅ API 调用使用 `Authorization: Bearer {id_token}` header（从 `create.log` 确认）
- ❓ Cookie 的作用尚不明确（可能是前端状态管理）

**最可能的情况**：

- POTA API 使用 `Authorization` header 进行认证
- Cookie 主要用于前端状态管理
- **我们的方案不受影响**

**如果确实需要 Cookie**：

- 需要调整后端代理，维护 Cookie Session
- 使用 axios cookie jar 或 Puppeteer 管理 Cookie
- 实现复杂度会增加

**建议**：

1. 先按原方案实现（使用 Authorization header）
2. 测试 API 调用是否成功
3. 如果失败，再考虑 Cookie 方案

详细分析请参考：`COOKIE_ANALYSIS.md`

## 更新记录

- 2025-01-10: 添加 Cookie 使用说明和影响分析
- 2025-01-XX: 初始文档，提供 4 个技术方案对比
