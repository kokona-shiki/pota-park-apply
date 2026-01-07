#!/bin/bash

# POTA Park Apply 一键启动脚本（Docker Compose 版本）
# - 基于 docker compose 启动：frontend + backend + postgis
# - backend/db 不向宿主机暴露端口，仅通过 http://localhost:8080 访问

set -euo pipefail

echo "🚀 POTA Park Apply 一键启动（Docker）"
echo "================================"

# 检查 docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未找到 docker，请先安装 Docker（建议 Docker Desktop）"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker 未启动，请先启动 Docker"
  exit 1
fi

# 检查 docker compose
if ! docker compose version >/dev/null 2>&1; then
  echo "❌ 未找到 docker compose，请升级 Docker（或安装 compose 插件）"
  exit 1
fi

echo "📦 构建并启动容器..."
docker compose up -d --build

echo "⏳ 等待数据库就绪..."
# 注意：PostgreSQL 镜像在首次初始化（加载 PostGIS 等）期间会经历一次短暂的重启。
# 为避免在“第一次 ready”后立刻进入初始化脚本而撞上重启窗口，这里要求连续多次就绪。
READY=0
STREAK=0
for i in $(seq 1 90); do
  if docker compose exec -T db pg_isready -U postgres -d pota_park >/dev/null 2>&1; then
    STREAK=$((STREAK + 1))
    if [ "$STREAK" -ge 5 ]; then
      READY=1
      break
    fi
  else
    STREAK=0
  fi
  sleep 2
done

if [ "$READY" -ne 1 ]; then
  echo "❌ 数据库未就绪，请检查：docker compose logs db"
  exit 1
fi

echo "🗄️  初始化数据库（幂等，可重复执行）..."
docker compose exec -T backend node scripts/initDatabase.js

echo ""
echo "✅ 启动完成"
echo "📱 访问地址: http://localhost:8080"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  停止并清理数据: docker compose down -v"
