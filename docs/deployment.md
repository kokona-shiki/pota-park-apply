# POTA Park Apply 部署文档

## 部署前置条件

### 软件要求

- Docker 20.10+
- Docker Compose V2

### 服务器要求

- 内存: 最低 2GB，推荐 4GB
- 磁盘: 最低 10GB 可用空间（数据库和备份需要额外空间）
- 网络: 能够访问互联网（拉取镜像）

## 快速部署

### 1. 克隆代码

```bash
git clone <repository-url>
cd pota-park-apply
```

### 2. 配置环境变量

```bash
cp .env.example .env
vim .env
```

**必须修改的配置项：**

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DB_PASSWORD` | 数据库密码 | `your-strong-password` |
| `JWT_SECRET` | JWT 密钥 | `your-32-char-secret-key` |
| `INIT_ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `INIT_ADMIN_CALLSIGN` | 管理员呼号 | `BH1ABC` |
| `INIT_ADMIN_PASSWORD` | 管理员密码 | `YourStrongPassword123` |

### 3. 执行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. 验证部署

访问 `http://<服务器IP>:<FRONTEND_PORT>` 验证部署是否成功。

## 数据目录结构

所有数据存放在 `DATA_DIR` 指定的目录中（默认 `./data`）：

```
data/
├── db/              # 数据库数据
├── backups/         # 数据库备份文件
│   └── pota_park_YYYYMMDD_HHMMSS.sql.gz
└── logs/            # 日志文件
    ├── backend/     # 后端日志
    │   └── app.log
    ├── frontend/    # Nginx 日志
    │   ├── access.log
    │   └── error.log
    └── backup/      # 备份日志
        └── backup.log
```

## 配置说明

### 必需配置项

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_PASSWORD` | PostgreSQL 密码 | 无（必须设置） |
| `JWT_SECRET` | JWT 签名密钥 | 无（必须设置） |

### 可选配置项

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FRONTEND_PORT` | 前端对外端口 | 8080 |
| `DATA_DIR` | 数据存储目录 | ./data |
| `DB_NAME` | 数据库名称 | pota_park |
| `DB_USER` | 数据库用户名 | postgres |
| `BACKUP_RETENTION_DAYS` | 备份保留天数 | 7 |
| `BACKUP_HOUR` | 备份时间（小时） | 2 |
| `BACKUP_MINUTE` | 备份时间（分钟） | 0 |

### 邮件服务配置

如需邮件功能，配置以下变量：

| 变量名 | 说明 |
|--------|------|
| `SMTP_HOST` | SMTP 服务器地址 |
| `SMTP_PORT` | SMTP 端口 |
| `SMTP_USER` | SMTP 用户名 |
| `SMTP_PASS` | SMTP 密码 |

## 运维命令

### 查看服务状态

```bash
docker compose ps
```

### 查看日志

**查看 Docker 容器日志：**

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

**查看日志文件：**

```bash
tail -f ${DATA_DIR}/logs/backend/app.log
tail -f ${DATA_DIR}/logs/frontend/access.log
tail -f ${DATA_DIR}/logs/backup/backup.log
```

### 重启服务

```bash
docker compose restart
docker compose restart backend
```

### 停止服务

```bash
docker compose down
```

### 数据库备份

```bash
tail -f ${DATA_DIR}/logs/backup/backup.log
docker exec pota-park-backup /backup.sh
ls -lh ${DATA_DIR}/backups/
```

### 数据库恢复

```bash
./scripts/restore.sh
```

### 更新部署

```bash
git pull
./deploy.sh
```

## 常见问题

### 端口冲突

如果 `FRONTEND_PORT` 端口被占用，修改 `.env` 文件中的端口配置：

```env
FRONTEND_PORT=8080
```

### 数据库连接失败

1. 检查数据库容器是否正常运行：`docker compose ps`
2. 查看数据库日志：`docker compose logs db`
3. 确认 `DB_PASSWORD` 配置正确

### 权限问题

确保脚本有执行权限：

```bash
chmod +x deploy.sh scripts/*.sh
```

### 备份失败

1. 检查备份容器状态：`docker compose ps backup`
2. 查看备份日志：`tail -f ${DATA_DIR}/logs/backup/backup.log`
3. 确认 `backups` 目录权限正确

### 日志文件过大

定期清理或轮转日志文件：

```bash
tail -n 1000 ${DATA_DIR}/logs/backend/app.log > ${DATA_DIR}/logs/backend/app.log.tmp
mv ${DATA_DIR}/logs/backend/app.log.tmp ${DATA_DIR}/logs/backend/app.log
```

## 安全建议

1. **修改默认密码**：生产环境必须修改 `DB_PASSWORD` 和 `JWT_SECRET`
2. **强密码策略**：`JWT_SECRET` 建议使用 32 位以上随机字符串
3. **定期备份**：定期检查备份文件可用性
4. **更新镜像**：定期更新 Docker 基础镜像
5. **防火墙配置**：配置服务器防火墙，只开放必要端口
6. **数据目录权限**：确保 `DATA_DIR` 目录权限正确，防止未授权访问
