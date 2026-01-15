# 后端部署指南

## 🚀 快速部署

### 1. 环境准备

#### 系统要求
- Node.js 20+
- PostgreSQL 12+ (需要 PostGIS 扩展)
- pnpm 8.15.0+

#### 安装依赖
```bash
cd backend
pnpm install
```

### 2. 数据库配置

#### 创建数据库
```sql
-- 登录 PostgreSQL
psql -U postgres

-- 创建数据库
CREATE DATABASE pota_park;
CREATE USER pota_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pota_park TO pota_user;
```

#### 启用扩展
```sql
\c pota_park
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 3. 环境变量配置

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 服务器配置
PORT=3001
NODE_ENV=production

# PostgreSQL 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pota_park
DB_USER=pota_user
DB_PASSWORD=your_password

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS 配置
CORS_ORIGIN=https://your-frontend-domain.com
```

### 4. 数据库初始化

```bash
pnpm init-db
```

### 5. 启动服务

#### 开发模式
```bash
pnpm dev
```

#### 生产模式
```bash
pnpm start
```

### 6. 测试接口

```bash
# 测试基础接口（不需要数据库）
pnpm test-backend

# 测试完整功能（需要数据库）
pnpm test-api
```

## 🐳 Docker 部署

### 创建 Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --prod

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["pnpm", "start"]
```

### 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: pota_park
      POSTGRES_USER: pota_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=pota_park
      - DB_USER=pota_user
      - DB_PASSWORD=your_password
      - JWT_SECRET=your-super-secret-jwt-key
    depends_on:
      - postgres
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
```

### Docker 部署命令
```bash
# 构建和启动
docker-compose up -d

# 初始化数据库
docker-compose exec backend pnpm init-db

# 查看日志
docker-compose logs -f backend
```

## 🔄 PM2 部署

### 安装 PM2
```bash
npm install -g pm2
```

### 创建 PM2 配置文件
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pota-backend',
    script: 'index.ts',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### PM2 部署命令
```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart pota-backend

# 停止应用
pm2 stop pota-backend
```

## 🔧 生产环境配置

### 1. 安全配置

#### 强制 HTTPS
```javascript
// 在 index.ts 中添加
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### 速率限制
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP最多100个请求
});

app.use('/api/', limiter);
```

### 2. 数据库优化

#### 连接池配置
```javascript
// 在 database.js 中调整
const pool = new Pool({
  max: 50, // 生产环境增加连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 定期备份
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U pota_user pota_park > backup_$DATE.sql
gzip backup_$DATE.sql
```

### 3. 日志配置

#### 使用 Winston
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 4. 监控和健康检查

#### 健康检查端点增强
```javascript
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: memoryUsage
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});
```

## 📊 监控和告警

### 1. 应用监控
- 使用 PM2 监控进程状态
- 设置自动重启机制
- 监控内存和CPU使用率

### 2. 数据库监控
- 监控连接数
- 监控查询性能
- 设置慢查询日志

### 3. 日志监控
- 集中化日志管理
- 错误告警机制
- 访问日志分析

## 🔄 持续部署

### GitHub Actions 配置
```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: cd backend && pnpm install
      
      - name: Run tests
        run: cd backend && pnpm test-api
      
      - name: Deploy to server
        run: |
          # 部署脚本
          scp -r backend/ user@server:/path/to/app/
          ssh user@server "cd /path/to/app/backend && pnpm install && pm2 restart pota-backend"
```

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接参数
   - 检查防火墙设置

2. **PostGIS 扩展未找到**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. **JWT Token 错误**
   - 检查密钥配置
   - 验证 Token 格式

4. **CORS 错误**
   - 配置正确的前端域名
   - 检查代理设置

### 日志查看
```bash
# PM2 日志
pm2 logs pota-backend

# Docker 日志
docker-compose logs backend

# 系统日志
tail -f /var/log/nginx/access.log
```