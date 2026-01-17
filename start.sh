#!/bin/bash

# POTA Park Apply 一键启动脚本（本地开发 / 无 Docker）
#
# 说明：
# - 本脚本用于开发阶段（不依赖 Docker）。
# - 仍保留 docker-compose.yml / Dockerfile 等文件用于部署。
#
# 启动内容：
# 1) 检查 Node.js / pnpm
# 2) 等待本地 PostgreSQL 就绪（需要 PostGIS 扩展）
# 3) 幂等初始化数据库
# 4) 启动 backend（:3101）
# 5) 启动 frontend（Vite dev server，:8080）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "🚀 POTA Park Apply 一键启动（本地开发 / 无 Docker）"
echo "================================================"

# 加载 .env（如果存在）
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

# 默认值（若 .env 未提供）
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_NAME:=pota_park}"
: "${DB_USER:=postgres}"
: "${PORT:=3101}"

# 检查 node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未找到 node，请先安装 Node.js（推荐 20.x 或更高）"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ 当前 Node.js 版本为 $(node -v)，前端 Vite 需要 Node.js >= 20"
  echo "   建议：使用 nvm/fnm/volta 升级到 20.x 后再运行本脚本"
  exit 1
fi

# 检查 pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ 未找到 pnpm，请先安装 pnpm（建议：corepack enable && corepack prepare pnpm@8.15.0 --activate）"
  exit 1
fi

echo "📦 安装依赖（如已安装会很快）..."
pnpm install

# 查找 pg_isready（PostgreSQL 客户端工具）
PG_ISREADY="$(command -v pg_isready || true)"
if [ -z "$PG_ISREADY" ]; then
  if command -v brew >/dev/null 2>&1; then
    BREW_PREFIX="$(brew --prefix)"
    for candidate in \
      "$BREW_PREFIX/opt/postgresql@17/bin/pg_isready" \
      "$BREW_PREFIX/opt/postgresql@16/bin/pg_isready" \
      "$BREW_PREFIX/opt/libpq/bin/pg_isready"
    do
      if [ -x "$candidate" ]; then
        PG_ISREADY="$candidate"
        break
      fi
    done
  fi
fi

if [ -z "$PG_ISREADY" ]; then
  echo "❌ 未找到 pg_isready（PostgreSQL 客户端工具）"
  echo "   解决方式："
  echo "   1) 安装 PostgreSQL 客户端工具：brew install postgresql@17（或 postgresql@16）或 brew install libpq"
  echo "   2) 将其加入 PATH，例如（fish）：fish_add_path /opt/homebrew/opt/postgresql@17/bin"
  exit 1
fi

echo "⏳ 等待本地数据库就绪..."
READY=0
for i in $(seq 1 60); do
  if "$PG_ISREADY" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

if [ "$READY" -ne 1 ]; then
  echo "❌ 数据库未就绪：pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
  echo "   请确认 PostgreSQL 已启动，且 .env 中 DB_* 配置正确"
  exit 1
fi

echo "🔍 运行类型检查..."
pnpm -C frontend run typecheck

echo "🔍 运行ESLint检查..."
pnpm -C frontend run lint || true

echo "📋 代码检查完成，继续启动服务..."

echo "🗄️  初始化数据库（幂等，可重复执行）..."
pnpm -C backend run init-db

echo "🧩 启动后端（PORT=${PORT}）..."
(pnpm -C backend run dev) &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "🧹 正在停止后端..."
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "🌐 启动前端（Vite dev server，端口 8080）..."
echo "📱 访问地址: http://localhost:8080"

echo "提示：如需部署，请使用 docker-compose.yml（部署阶段仍建议 Docker）。"

pnpm -C frontend run dev -- --port 8080
