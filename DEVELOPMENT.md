# 开发指南

## 环境初始化

### 快速开始

#### 方式1: 一键启动（推荐）
```bash
# 完整环境检查 + 依赖安装 + 服务启动
./start.fish    # Fish Shell 用户
./start.sh      # Bash 用户
```

#### 方式2: 快速启动（环境已配置）
```bash
./quick-start.sh    # 快速启动，跳过环境检查
```

#### 方式3: 手动执行
```bash
# 克隆项目后运行
./setup.fish    # 或 ./setup.sh

# 或手动执行
nvm use
pnpm install
```

### 项目结构
```
pota-park-apply/
├── frontend/                 # React前端
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── pages/          # 页面组件
│   │   └── assets/         # 静态资源
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js后端
│   ├── index.js           # 主服务器文件
│   └── package.json
├── pnpm-workspace.yaml     # pnpm工作空间配置
├── .nvmrc                  # Node.js版本配置
└── package.json            # 根项目配置
```

## 开发命令

### 日常开发
```bash
# 启动开发服务器（前后端同时）
pnpm dev

# 仅启动前端
pnpm dev:frontend

# 仅启动后端
pnpm dev:backend
```

### 构建和测试
```bash
# 构建前端
pnpm build

# 代码检查
pnpm lint

# 清理依赖
pnpm clean

# 重新安装依赖
pnpm reinstall
```

## 依赖管理

### 添加新依赖

#### 前端依赖
```bash
# 安装生产依赖
pnpm --filter frontend add package-name

# 安装开发依赖
pnpm --filter frontend add -D package-name

# 在根目录安装（工具类）
pnpm add -w -D package-name
```

#### 后端依赖
```bash
cd backend
pnpm add package-name
pnpm add -D package-name
```

### 依赖更新
```bash
# 更新所有子项目依赖
pnpm -r update

# 更新特定依赖
pnpm --filter frontend update package-name
```

## 代码规范

### 前端
- 使用 TypeScript
- 遵循 ESLint 规则
- 组件使用 PascalCase 命名
- 文件名使用 PascalCase (组件) 或 camelCase (工具)

### 提交规范
建议使用 conventional commits:
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 环境变量

### 前端环境变量

项目采用 `.env.example` + `.env` 的管理模式：

1. **模板文件** (已提交到版本控制)
   - `.env.example` - 环境变量模板，作为配置说明

2. **实际配置** (被 gitignore)
   - `.env` - 实际的环境变量配置文件

配置步骤：
```bash
# 复制模板文件
cp .env.example .env

# 编辑实际配置
vim .env
```

**注意**：`.env.example` 保留在版本控制中是为了：
- 为新开发者提供配置参考
- 作为项目的配置文档
- 确保团队环境变量一致性

如果你只需要特定环境的变量，可以创建：
- `frontend/.env.local` (本地开发)

### 后端环境变量
创建 `backend/.env`:
```
NODE_ENV=development
PORT=3001
DATABASE_URL=mongodb://localhost:27017/pota-park
JWT_SECRET=your-secret-key
```

## 调试技巧

### 前端调试
- 浏览器开发者工具
- React Developer Tools
- Redux DevTools (如果使用状态管理)

### 后端调试
- VS Code 调试配置
- console.log 调试
- Postman 测试API

## 常见问题

### 依赖冲突
```bash
# 清理并重新安装
pnpm clean
pnpm install
```

### Node.js 版本问题
```bash
# 确保 Node.js 版本
node --version  # 应该是 v20.x.x

# 如果版本不对
nvm use
```

### pnpm 问题
```bash
# 更新 pnpm
pnpm add -g pnpm@latest

# 清理缓存
pnpm store prune
```

## 部署相关

### 生产构建
```bash
# 构建前端
pnpm build

# 前端构建产物在 frontend/dist/
```

### Docker 部署
可以添加 Dockerfile 进行容器化部署。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 遵循代码规范
4. 提交 Pull Request

## 有用的链接

- [pnpm 文档](https://pnpm.io/)
- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [Material-UI 文档](https://mui.com/)
- [Leaflet 文档](https://leafletjs.com/)