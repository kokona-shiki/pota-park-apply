# POTA 公园申请系统 - 后端 API

基于 Node.js + Express + PostgreSQL 构建的 POTA 公园申请系统后端服务。

## 🚀 快速开始

### 环境要求
- Node.js 20+
- PostgreSQL 12+ (需要 PostGIS 扩展)
- pnpm 8.15.0+

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息
```

### 数据库准备
1. 创建数据库
```sql
CREATE DATABASE pota_park;
```

2. 启用 PostGIS 扩展
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 初始化数据库
```bash
pnpm init-db
```

### 启动服务
```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start
```

服务将在 http://localhost:3001 启动

## 📚 API 文档

### 🔐 认证相关

#### 用户注册
```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "callsign": "BG0FFH",
  "password": "password123"
}
```

#### 用户登录
```http
POST /api/login
Content-Type: application/json

{
  "identifier": "user@example.com", // 邮箱或呼号
  "password": "password123"
}
```

#### 获取用户信息
```http
GET /api/user-info
Authorization: Bearer <token>
```

#### 获取用户权限
```http
GET /api/user-permissions
Authorization: Bearer <token>
```

### 👥 用户管理

#### 获取用户列表
```http
GET /api/users?role=user&isActive=true
Authorization: Bearer <token>
```

#### 修改用户信息
```http
PUT /api/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "field": "email",
  "value": "new@example.com",
  "reason": "更换邮箱地址"
}
```

#### 修改用户角色
```http
PUT /api/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "park_reviewer"
}
```

### 📝 呼号管理

#### 申请呼号变更
```http
POST /api/callsign-change-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "newCallsign": "BG0NEW",
  "reason": "呼号升级"
}
```

#### 获取呼号变更申请列表
```http
GET /api/callsign-change-requests?status=pending
Authorization: Bearer <token>
```

#### 审核呼号变更
```http
PUT /api/callsign-change-requests/:requestId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "reviewNotes": "审核通过"
}
```

### 🏞️ 公园申请

#### 提交公园申请
```http
POST /api/park-applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "dx_entity": "K-1234",
  "park_name": "广东中山国家森林公园",
  "park_type": "国家森林公园",
  "province_iso_code": "CN-GD",
  "latitude": 22.5211,
  "longitude": 113.3823,
  "website": "https://example.com",
  "description": "公园描述",
  "access_methods": [
    { "zh": "汽车", "en": "Vehicle" },
    { "zh": "步行", "en": "Foot" }
  ],
  "activation_methods": [
    { "zh": "步行", "en": "Foot" },
    { "zh": "车载", "en": "Mobile" }
  ],
  "confirmed_authenticity": true
}
```

#### 获取公园申请列表
```http
GET /api/park-applications?status=pending&province=CN-GD
Authorization: Bearer <token>
```

#### 获取公园申请详情
```http
GET /api/park-applications/:id
Authorization: Bearer <token>
```

#### 审核公园申请
```http
PUT /api/park-applications/:id/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "reviewNotes": "审核通过",
  "rejectionReason": null
}
```

#### 重新审核申请
```http
PUT /api/park-applications/:id/re-review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "rejected",
  "reviewNotes": "重新审核拒绝"
}
```

#### 录入 POTA 系统
```http
PUT /api/park-applications/:id/sync-pota
Authorization: Bearer <token>
Content-Type: application/json

{
  "potaNotes": "已成功录入 POTA 系统"
}
```

### 📍 基础数据

#### 获取省份列表
```http
GET /api/provinces
```

## 🔐 权限系统

### 用户角色
- `system_admin` - 系统管理员
- `pota_representative` - POTA 地图代表
- `park_reviewer` - 公园申请审核员
- `user` - 普通用户
- `banned` - 禁止用户

### 权限列表
- `create_user` - 创建用户
- `modify_user_info` - 修改用户信息
- `modify_user_role` - 修改用户角色
- `delete_user` - 删除用户
- `approve_callsign_change` - 批准呼号变更
- `view_all_users` - 查看所有用户
- `submit_application` - 发起申请
- `view_application_list` - 查看申请列表
- `view_application_detail` - 查看申请详情
- `review_application` - 审核申请
- `remind_review` - 提醒审核
- `sync_to_pota` - 将公园数据录入到POTA系统

### 权限分配
| 角色 | 权限 |
|------|------|
| 系统管理员 | 所有权限 |
| POTA 地图代表 | 除用户管理外的所有权限 |
| 公园申请审核员 | 公园申请相关权限 |
| 普通用户 | 基础权限（提交申请、查看等） |
| 禁止用户 | 无权限 |

## 🗄️ 数据库设计

### 主要表结构
- `users` - 用户表
- `permissions` - 权限表
- `role_permissions` - 角色权限表
- `provinces` - 省份表 (ISO-3166 格式)
- `park_applications` - 公园申请表
- `application_audit_logs` - 申请审核记录表
- `callsign_change_requests` - 呼号变更申请表
- `user_info_changes` - 用户信息修改记录表
- `review_reminders` - 审核提醒表

### 地理信息
- 使用 WGS84 坐标系 (SRID:4326)
- 支持 PostGIS 地理空间查询
- 支持附近搜索、区域查询

### 数据格式
- 访问方法/激活方法：JSONB 格式存储中英文对照
- 地理位置：PostGIS GEOMETRY 类型 + 独立的经纬度字段
- 审核记录：完整的状态变化追踪

## 🛠️ 开发

### 项目结构
```
backend/
├── config/
│   ├── database.js          # 数据库连接配置
│   └── initDatabase.js      # 数据库初始化
├── services/
│   ├── userService.js       # 用户相关服务
│   └── parkApplicationService.js # 公园申请服务
├── utils/
│   └── auth.js             # 认证工具
├── scripts/
│   └── initDatabase.js     # 数据库初始化脚本
├── index.js                # 主服务器文件
├── package.json
└── README.md
```

### 添加新功能
1. 在相应的 `services/` 文件中添加业务逻辑
2. 在 `index.js` 中添加 API 路由
3. 根据需要添加权限检查

### 数据库迁移
如需修改数据库结构：
1. 更新 `config/initDatabase.js` 中的表结构
2. 手动执行 SQL 迁移脚本
3. 或重新运行 `pnpm init-db`（注意：会清空数据）

## 🚀 部署

### 环境变量配置
生产环境需要配置以下关键变量：
- `NODE_ENV=production`
- `JWT_SECRET` - 强密钥
- `DB_*` - 生产数据库配置
- `CORS_ORIGIN` - 前端域名

### 数据库要求
- PostgreSQL 12+
- 启用 PostGIS 扩展
- 足够的存储空间
- 定期备份策略

### 安全建议
- 使用强密码和 JWT 密钥
- 启用 HTTPS
- 配置防火墙
- 定期更新依赖
- 监控异常访问