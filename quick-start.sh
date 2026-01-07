#!/bin/bash

# POTA Park Apply 快速启动脚本（Docker Compose 版本）
# - 假设已构建过镜像（如未构建也会自动拉起/构建）

set -euo pipefail

echo "⚡ POTA Park Apply 快速启动（Docker）"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未找到 docker，请先安装 Docker"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker 未启动，请先启动 Docker"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ 未找到 docker compose，请升级 Docker（或安装 compose 插件）"
  exit 1
fi

echo "🚀 启动容器..."
docker compose up -d

echo "📱 访问地址: http://localhost:8080"
echo "查看日志: docker compose logs -f"
