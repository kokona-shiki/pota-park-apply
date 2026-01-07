#!/bin/bash

# 一键部署脚本（Docker Compose）
# - 构建并启动: db + backend + frontend(nginx)
# - 等待 db 健康检查通过
# - 运行一次 init-db（幂等）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未找到 docker，请先安装 Docker Desktop"
  exit 1
fi

echo "🚀 POTA Park Apply 一键部署（Docker Compose）"
echo "======================================="

# 启动服务（会自动读取项目根目录 .env，如果存在）
echo "🐳 启动服务（build + up -d）..."
$COMPOSE_CMD up -d --build

# 等待 db 健康
echo "⏳ 等待数据库健康检查通过..."
DB_ID="$($COMPOSE_CMD ps -q db)"
if [ -z "$DB_ID" ]; then
  echo "❌ 未找到 db 容器，请检查 docker-compose.yml"
  exit 1
fi

STATUS=""
for i in $(seq 1 60); do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' "$DB_ID" 2>/dev/null || true)"
  if [ "$STATUS" = "healthy" ]; then
    break
  fi
  sleep 2
done

if [ "$STATUS" != "healthy" ]; then
  echo "❌ 数据库未进入 healthy 状态（当前: ${STATUS:-unknown}）"
  echo "   你可以查看日志：$COMPOSE_CMD logs db | cat"
  exit 1
fi

# 初始化数据库（幂等）
echo "🗄️  初始化数据库（幂等）..."
$COMPOSE_CMD exec -T backend node scripts/initDatabase.js

echo "✅ 部署完成"
echo "🌐 前端访问: http://localhost:8080"
echo "提示：后端仅在容器内网可达（通过前端 nginx 的 /api 反代访问）。"
