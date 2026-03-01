# POTA Cookie 使用分析

## 发现

从抓包日志中发现，POTA 在认证流程中使用了 Cookie：

### 观察到的 Cookie

在 `pota-login-get.log` 中：

```
amplify-redirected-from-hosted-ui=true
amplify-signin-with-hostedUI=true
POTA_SETTINGS={...}
```

### API 调用方式

在 `create.log` 中，POTA API 调用使用的是：

```
Authorization: Bearer {id_token}
```

**关键观察**：

- ✅ API 调用使用 `Authorization` header（我们已知）
- ❓ Cookie 的作用尚不明确

## 需要确认的问题

### 1. POTA API 是否接受 Cookie 认证？

**可能的情况**：

- **情况 A**: 只接受 `Authorization` header（我们的方案不受影响）
- **情况 B**: 同时接受 Cookie 和 `Authorization` header（我们的方案不受影响）
- **情况 C**: 只接受 Cookie（**会影响我们的方案**）

### 2. Cookie 中存储的是什么？

**可能的内容**：

- Token（id_token 或 access_token）
- Session ID
- 仅用于前端状态管理（如 `POTA_SETTINGS`）

### 3. Cookie 的域名和路径？

**需要确认**：

- Domain: `.pota.app` 还是 `pota.app`？
- Path: `/` 还是特定路径？
- HttpOnly: 是否设置？
- Secure: 是否要求 HTTPS？
- SameSite: 什么策略？

## 对技术方案的影响分析

### 如果 POTA API 只接受 Authorization Header（最可能）

**影响**: ✅ **无影响**

**原因**：

- 我们的方案使用 `Authorization: Bearer {id_token}` 调用 API
- Cookie 只是 POTA 前端的状态管理，不影响 API 调用
- 后端代理时只需要在请求头中添加 Authorization

**实现**：

```javascript
// 后端代理 POTA API
const response = await axios.post('https://api.pota.app/admin/park/create', data, {
  headers: {
    Authorization: `Bearer ${idToken}`, // 使用我们存储的 token
    'Content-Type': 'application/json',
  },
});
```

### 如果 POTA API 同时接受 Cookie 和 Authorization Header

**影响**: ✅ **无影响**

**原因**：

- 我们使用 Authorization header，即使 Cookie 存在也不冲突
- 后端代理时不需要处理 Cookie

### 如果 POTA API 只接受 Cookie（不太可能）

**影响**: ⚠️ **需要调整方案**

**需要解决的问题**：

1. **Cookie 获取**：如何从 POTA 获取 Cookie？
2. **Cookie 传递**：后端代理时如何携带 Cookie？
3. **Cookie 刷新**：Cookie 过期时如何刷新？

**可能的解决方案**：

#### 方案 A: 通过 iframe 获取 Cookie

```javascript
// 前端：在 iframe 中完成认证后，Cookie 会自动设置
// 但跨域情况下，我们无法读取其他域的 Cookie
// 需要通过后端代理来传递 Cookie
```

#### 方案 B: 后端维护 Cookie Session

```javascript
// 后端：使用 axios 的 cookie jar 维护 Cookie
const axiosInstance = axios.create({
  withCredentials: true,
  jar: true, // 自动管理 Cookie
});

// 首次认证时，通过代理访问 POTA，Cookie 会自动保存
// 后续请求时，Cookie 会自动携带
```

#### 方案 C: 手动提取和传递 Cookie

```javascript
// 前端：通过 iframe 完成认证
// 后端：提供一个代理端点，转发请求并携带 Cookie
// 但跨域限制使得这个方案复杂
```

## 验证方法

### 测试 1: 只用 Authorization Header 调用 API

```bash
# 不使用 Cookie，只用 Authorization header
curl 'https://api.pota.app/admin/park/create' \
  -H 'Authorization: Bearer {id_token}' \
  -H 'Content-Type: application/json' \
  --data-raw '{"prefix":"CN",...}'
```

**预期**：

- ✅ 如果成功：说明只需要 Authorization header
- ❌ 如果失败（401）：可能需要 Cookie

### 测试 2: 只用 Cookie 调用 API

```bash
# 使用 Cookie，不使用 Authorization header
curl 'https://api.pota.app/admin/park/create' \
  -H 'Cookie: {从浏览器中提取的 Cookie}' \
  -H 'Content-Type: application/json' \
  --data-raw '{"prefix":"CN",...}'
```

**预期**：

- ✅ 如果成功：说明 Cookie 可以单独使用
- ❌ 如果失败（401）：说明需要 Authorization header

### 测试 3: 同时使用两者

```bash
# 同时使用 Cookie 和 Authorization header
curl 'https://api.pota.app/admin/park/create' \
  -H 'Authorization: Bearer {id_token}' \
  -H 'Cookie: {Cookie}' \
  -H 'Content-Type: application/json' \
  --data-raw '{"prefix":"CN",...}'
```

## 当前方案评估

### 基于现有证据的判断

**最可能的情况**：

- ✅ POTA API 使用 `Authorization: Bearer {token}` 进行认证
- ✅ Cookie 主要用于前端状态管理（如 `POTA_SETTINGS`）
- ✅ 我们的方案**不受影响**

**证据**：

1. 从 `create.log` 看，API 调用使用 Authorization header
2. Cookie 名称（`amplify-signin-with-hostedUI`）更像是前端状态标记
3. 标准的 OAuth2 流程通常使用 Authorization header

### 建议

1. **先按原方案实现**：

   - 使用 Authorization header 调用 API
   - 不处理 Cookie

2. **测试验证**：

   - 实现后测试 API 调用是否成功
   - 如果失败，再考虑 Cookie 方案

3. **如果确实需要 Cookie**：
   - 使用方案 B（后端维护 Cookie Session）
   - 通过 Puppeteer 或类似工具维护浏览器会话

## 技术方案调整建议

### 如果确认只需要 Authorization Header

**无需调整**，继续使用：

- ✅ iframe + 后端代理方案
- ✅ 后端存储 token，自动刷新
- ✅ 调用 API 时使用 Authorization header

### 如果确认需要 Cookie

**需要调整**为：

- ⚠️ 后端维护 Cookie Session
- ⚠️ 使用 axios cookie jar 或 Puppeteer
- ⚠️ 首次认证后，Cookie 自动保存
- ⚠️ 后续请求自动携带 Cookie

## 下一步行动

1. **验证 API 调用方式**：

   - 测试只用 Authorization header 是否可行
   - 如果可行，继续原方案
   - 如果不可行，调整方案

2. **检查 Cookie 内容**：

   - 在浏览器开发者工具中查看 POTA 的 Cookie
   - 确认是否有 token 相关的 Cookie
   - 确认 Cookie 的域名、路径、属性

3. **测试 Cookie 传递**：
   - 如果确实需要 Cookie，测试后端如何传递

---

## 更新记录

- 2025-01-10: 初始分析，基于抓包日志判断 Cookie 可能不影响方案
