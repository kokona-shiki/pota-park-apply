# POTA 认证流程文档

## 概述

POTA 使用 AWS Cognito 作为认证服务，采用 **OAuth2 授权码流程（PKCE）**。本文档详细记录了完整的认证流程和实现方案。

## 认证流程

### 1. 初始化授权请求

**端点**: `https://parksontheair.auth.us-east-2.amazoncognito.com/oauth2/authorize`

**请求参数**:

- `redirect_uri`: `https://pota.app/`
- `response_type`: `code` (授权码模式)
- `client_id`: `7hluqct0n2nckib7i7sd5753oa`
- `identity_provider`: `COGNITO`
- `scope`: (空)
- `state`: 随机生成的 CSRF 防护字符串
- `code_challenge`: SHA256(code_verifier) 的 base64url 编码
- `code_challenge_method`: `S256` (PKCE)

**响应**: 302 重定向到登录页面

**参考文件**: `pota-auth-redirect.log`

### 2. 登录页面

**端点**: `https://parksontheair.auth.us-east-2.amazoncognito.com/login`

**请求方式**: GET（带相同的查询参数）

**响应**: 返回 Cognito Hosted UI 登录表单页面

**参考文件**: `pota-login-redirected-page.log`

### 3. 提交登录表单

**端点**: `https://parksontheair.auth.us-east-2.amazoncognito.com/login`

**请求方式**: POST

**Content-Type**: `application/x-www-form-urlencoded`

**请求参数**:

- `_csrf`: CSRF token（从 Cookie 中获取）
- `username`: 用户邮箱
- `password`: 用户密码
- `cognitoAsfData`: Cognito 高级安全功能数据（JSON 编码的 base64）

**Cookie**:

- `XSRF-TOKEN`: CSRF token

**响应**: 302 重定向到回调地址（带授权码）

**参考文件**: `pota-login-post.log`

### 4. 授权码回调

**端点**: `https://pota.app/`

**请求方式**: GET

**查询参数**:

- `code`: 授权码（一次性使用，有效期短）
- `state`: 之前发送的 state 参数（用于验证）

**响应**: POTA 应用首页

**参考文件**: `pota-login-get.log`

### 5. Token 交换（关键步骤）

**端点**: `https://parksontheair.auth.us-east-2.amazoncognito.com/oauth2/token`

**请求方式**: POST

**Content-Type**: `application/x-www-form-urlencoded`

**请求参数**:

```
grant_type=authorization_code
&code={授权码}
&client_id=7hluqct0n2nckib7i7sd5753oa
&redirect_uri=https://pota.app/
&code_verifier={PKCE verifier}
```

**响应**:

```json
{
  "id_token": "eyJraWQ...", // JWT，用于 API 调用
  "access_token": "eyJraWQ...", // JWT，访问令牌
  "refresh_token": "eyJjdHki...", // JWE（加密），用于刷新
  "expires_in": 3600, // 过期时间（秒）
  "token_type": "Bearer"
}
```

**参考文件**: `pota-login-oauth2-post-token.log`

## Token 信息

### ID Token (JWT)

**用途**: 用于调用 POTA API（在 Authorization header 中使用）

**有效期**: 1 小时（3600 秒）

**Payload 示例**:

```json
{
  "sub": "f84c21c0-0995-4302-a9c2-d1f23eebd19a",
  "pota:email": "omyshokami@gmail.com",
  "pota:groups": "",
  "cognito:groups": ["Park Creator", "Park Manager CN", "Upload"],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_nA5Zj0klh",
  "cognito:username": "f84c21c0-0995-4302-a9c2-d1f23eebd19a",
  "aud": "7hluqct0n2nckib7i7sd5753oa",
  "token_use": "id",
  "auth_time": 1768018845,
  "pota:fullname": "LI DONGLIN",
  "pota:id": "45586",
  "pota:callsign": "BI1QJ",
  "exp": 1768022445,
  "iat": 1768018845,
  "email": "omyshokami@gmail.com"
}
```

### Access Token (JWT)

**用途**: 用于访问 AWS Cognito 资源

**有效期**: 1 小时（3600 秒）

### Refresh Token (JWE)

**用途**: 用于刷新 access_token 和 id_token

**格式**: JWE (JSON Web Encryption)，使用 RSA-OAEP 和 AES256GCM 加密

**有效期**: 默认 30 天（可配置）

**注意**: Refresh token 是加密的，但可以直接用于刷新请求，无需解密

## Token 刷新流程

### 刷新请求

**端点**: `https://parksontheair.auth.us-east-2.amazoncognito.com/oauth2/token`

**请求方式**: POST

**Content-Type**: `application/x-www-form-urlencoded`

**请求参数**:

```
grant_type=refresh_token
&client_id=7hluqct0n2nckib7i7sd5753oa
&refresh_token={refresh_token}
```

**响应**: 与 token 交换响应格式相同

**注意**:

- 如果 Cognito 启用了 refresh token rotation，会返回新的 refresh_token
- 如果未启用，继续使用旧的 refresh_token

## 配置信息

### Cognito 配置

- **Domain**: `parksontheair.auth.us-east-2.amazoncognito.com`
- **Region**: `us-east-2`
- **User Pool ID**: `us-east-2_nA5Zj0klh`
- **App Client ID**: `7hluqct0n2nckib7i7sd5753oa`
- **Redirect URI**: `https://pota.app/`

### PKCE 配置

- **Code Challenge Method**: `S256` (SHA256)
- **Code Verifier**: 32 字节随机数，base64url 编码
- **Code Challenge**: SHA256(code_verifier) 的 base64url 编码

## 安全注意事项

1. **PKCE**: 使用 PKCE 流程防止授权码拦截攻击
2. **State 参数**: 用于 CSRF 防护，必须验证
3. **Token 存储**:
   - Refresh token 必须安全存储（加密）
   - 不要在前端暴露 refresh token
4. **Token 过期**:
   - ID token 和 Access token 有效期 1 小时
   - 建议提前 5 分钟刷新
5. **HTTPS**: 所有请求必须使用 HTTPS

## 实现建议

### 后端实现

1. **存储 PKCE 参数**: 临时存储 code_verifier 和 state（关联 user_id）
2. **加密存储 Token**: 使用加密方式存储 refresh_token 和 id_token
3. **自动刷新**: 在 token 快过期时（提前 5 分钟）自动刷新
4. **错误处理**: 刷新失败时清除存储的 token，要求重新认证

### 前端实现

1. **iframe 方案**: 使用隐藏 iframe 完成认证流程
2. **监听回调**: 通过监听 iframe URL 变化获取授权码
3. **自动获取 Token**: 通过后端 API 获取 token，后端自动处理刷新

## 流程图

```
用户点击登录
    ↓
生成 PKCE 参数 (code_verifier, code_challenge, state)
    ↓
重定向到 /oauth2/authorize (带 code_challenge)
    ↓
302 → /login (登录页面)
    ↓
用户输入用户名密码
    ↓
POST /login (提交表单)
    ↓
302 → https://pota.app/?code=xxx&state=xxx
    ↓
前端提取 code 和 state
    ↓
POST /oauth2/token (用 code 交换 token)
    ↓
获得 id_token, access_token, refresh_token
    ↓
存储 token (加密)
    ↓
使用 id_token 调用 POTA API
    ↓
Token 快过期时
    ↓
POST /oauth2/token (用 refresh_token 刷新)
    ↓
获得新的 id_token 和 access_token
```

## 参考文件

- `pota-auth-redirect.log` - 授权请求
- `pota-login-redirected-page.log` - 登录页面 GET
- `pota-login-post.log` - 登录表单提交
- `pota-login-get.log` - 授权码回调
- `pota-login-oauth2-post-token.log` - Token 交换（包含响应）

## 更新记录

- 2025-01-XX: 初始文档，记录完整认证流程
