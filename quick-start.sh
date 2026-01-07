#!/bin/bash

# POTA Park Apply 快速启动脚本（本地开发 / 无 Docker）
# - 仅启动前后端（假设依赖与数据库已就绪）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "⚡ POTA Park Apply 快速启动（本地开发 / 无 Docker）"

echo "提示：该脚本假设 PostgreSQL（含 PostGIS）已启动，且已执行过 ./start.sh 或手动初始化数据库。"

echo "🧩 启动后端..."
(pnpm -C backend run dev) &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "🌐 启动前端（端口 8080）..."
pnpm -C frontend run dev -- --port 8080
