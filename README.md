# POTA公园申请系统

这是一个用于POTA (Parks on the Air) 公园申请和管理的Web应用程序。系统允许用户申请添加新的POTA公园，管理员可以审核申请并管理公园信息。

## 功能特性

### 用户功能
- **用户注册/登录** - 支持呼号或邮箱登录
- **申请添加公园** - 包含地理位置、公园类型、访问方式等信息
- **地图交互** - 基于Leaflet的交互式地图，支持点击选择位置
- **我的上传** - 查看个人申请历史和状态
- **数据导出** - 支持CSV和KML格式导出个人数据

### 管理员功能
- **申请审核** - 查看、审核、处理用户提交的公园申请
- **申请管理** - 批准、拒绝、添加备注等操作
- **全局数据导出** - 导出所有申请数据
- **用户管理** - 系统管理员可管理用户权限

### 权限等级
- **普通用户** (user) - 可申请公园、查看个人上传
- **地图管理员** (admin) - 可审核申请、查看申请列表
- **系统管理员** (sysadmin) - 拥有所有权限

## 技术栈

### 前端
- **React 19** - 主框架
- **TypeScript** - 类型安全
- **Material-UI (MUI)** - UI组件库
- **React Router** - 路由管理
- **React Leaflet** - 地图组件
- **Axios** - HTTP客户端
- **Vite** - 构建工具

### 后端
- **Node.js** - 服务器环境
- **Express** - Web框架（待实现）

## 项目结构

```
pota-park-apply/
├── backend/                 # 后端代码
│   ├── index.js            # 主服务器文件（待开发）
│   └── pakage.json         # 后端依赖配置
├── frontend/               # 前端代码
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── components/     # 可复用组件
│   │   │   ├── SideBar.tsx # 侧边栏导航
│   │   │   └── TopBar.tsx  # 顶部导航栏
│   │   ├── pages/          # 页面组件
│   │   │   ├── Home.tsx           # 首页（公园列表）
│   │   │   ├── AddPark.tsx        # 添加公园申请
│   │   │   ├── ApplicationsList.tsx # 申请列表（管理员）
│   │   │   ├── MyUploads.tsx      # 我的上传记录
│   │   │   ├── ExportPage.tsx     # 数据导出
│   │   │   ├── Login.tsx          # 登录页面
│   │   │   ├── Register.tsx       # 注册页面
│   │   │   ├── UserInfo.tsx       # 用户信息
│   │   │   └── AdminPanel.tsx     # 管理面板
│   │   ├── assets/        # 静态资源
│   │   │   └── region.json # 中国省份编码
│   │   ├── App.tsx        # 主应用组件
│   │   └── main.tsx       # 应用入口
│   ├── package.json       # 前端依赖
│   └── vite.config.ts     # Vite配置
└── README.md              # 项目说明
```

## 快速开始

### 环境要求
- Node.js 20 (推荐使用 nvm 管理版本)
- pnpm 8.15.0+ (推荐使用 pnpm 管理依赖)

### 安装依赖

```bash
# 使用 nvm 加载指定 Node.js 版本
nvm use

# 安装 pnpm (如果尚未安装)
npm install -g pnpm

# 方法1: 使用工作空间一次性安装所有依赖
pnpm install

# 方法2: 分别安装各子项目依赖
cd frontend && pnpm install
cd ../backend && pnpm install
```

### 开发环境运行

#### 🚀 一键启动（推荐）
```bash
# 完整环境检查 + 依赖安装 + 服务启动
./start.fish    # Fish Shell 用户
./start.sh      # Bash 用户
```

#### ⚡ 快速启动
```bash
./quick-start.sh    # 环境已配置时使用
```

#### 🔧 传统方式
```bash
# 方法1: 使用工作空间脚本
pnpm dev  # 同时启动前后端

# 方法2: 分别启动
pnpm dev:frontend  # 启动前端
pnpm dev:backend   # 启动后端（在另一个终端）

# 或者传统方式
cd frontend && pnpm dev
cd ../backend && node index.js
```

### 构建生产版本

```bash
cd frontend
pnpm build
```

### 代码检查

```bash
cd frontend
pnpm lint
```

## API接口（规划中）

### 用户相关
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `GET /api/user-info` - 获取用户信息

### 公园申请
- `POST /api/apply-park` - 提交公园申请
- `GET /api/applications` - 获取申请列表（管理员）
- `PUT /api/applications/:id` - 更新申请状态

### 数据导出
- `GET /api/export/csv` - 导出CSV格式
- `GET /api/export/kml` - 导出KML格式

## 项目管理

本项目采用 **pnpm workspace** 进行 monorepo 管理：

### 工作空间结构
```bash
pota-park-apply/
├── frontend/          # 前端项目
├── backend/           # 后端项目
└── pnpm-workspace.yaml # 工作空间配置
```

### 工作空间命令
```bash
# 安装所有子项目依赖
pnpm install

# 在所有子项目中运行指定命令
pnpm -r build
pnpm -r clean

# 在指定子项目中运行命令
pnpm --filter frontend dev
pnpm --filter backend dev
```

## 版本管理

本项目使用以下工具确保开发环境一致性：

### Node.js 版本管理 (nvm)
项目包含 `.nvmrc` 文件，指定 Node.js 版本为 20：
```bash
# 自动加载项目推荐的 Node.js 版本
nvm use

# 如果需要安装特定版本
nvm install 20
nvm use 20
```

### 包管理 (pnpm)
推荐使用 pnpm 来管理依赖，具有以下优势：
- 更快的安装速度
- 更小的磁盘占用
- 更严格的依赖管理

```bash
# 安装依赖
pnpm install

# 运行脚本
pnpm dev
pnpm build
pnpm lint
```

## 配置说明

### 地图配置
- 使用OpenStreetMap作为地图瓦片服务
- 支持点击地图选择公园位置
- 集成POTA API进行公园搜索

### 省份数据
- 省份编码存储在 `frontend/src/assets/region.json`
- 支持中国所有省份、直辖市、特别行政区

## 开发注意事项

1. **当前状态** - 前端基本功能已完成，后端API需要开发
2. **临时数据** - 部分页面使用mock数据，需要对接真实后端
3. **权限控制** - 前端已实现权限控制逻辑，需要后端配合验证
4. **地图功能** - 地图搜索集成了POTA API和OpenStreetMap Nominatim
5. **依赖管理** - 使用pnpm workspace管理monorepo，确保依赖一致性
6. **版本控制** - 使用nvm固定Node.js版本为20，避免环境差异

## 测试

### 前端测试
- 运行开发服务器进行手动测试
- 检查各页面功能和权限控制

### 测试账号（临时）
系统当前使用模拟登录，可在 `App.tsx` 中修改用户信息测试不同权限：
- 普通用户：`user_group: 'user'`
- 管理员：`user_group: 'admin'`
- 系统管理员：`user_group: 'sysadmin'`

## 部署

### 开发环境部署
```bash
# 构建前端
pnpm build

# 启动生产环境服务器
pnpm dev:backend
```

### 生产环境部署
1. 构建前端：`pnpm build`
2. 部署前端文件到Web服务器
3. 配置后端API服务
4. 配置反向代理（如需要）

### Docker 部署（未来可添加）
```dockerfile
# 可添加 Dockerfile 和 docker-compose.yml
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用MIT许可证。

## 联系方式

如有问题或建议，请通过Issues联系。