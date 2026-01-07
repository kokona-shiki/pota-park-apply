#!/usr/bin/env fish

# POTA Park Apply 一键启动脚本（Docker Compose 版本 / Fish）

function die
    echo "❌ $argv"
    exit 1
end

echo "🚀 POTA Park Apply 一键启动（Docker / Fish）"
echo "========================================"

command -v docker >/dev/null 2>&1; or die "未找到 docker，请先安装 Docker（建议 Docker Desktop）"

docker info >/dev/null 2>&1; or die "Docker 未启动，请先启动 Docker"

docker compose version >/dev/null 2>&1; or die "未找到 docker compose，请升级 Docker（或安装 compose 插件）"

echo "📦 构建并启动容器..."
docker compose up -d --build

echo "⏳ 等待数据库就绪..."
set -l ready 0
for i in (seq 1 60)
    if docker compose exec -T db pg_isready -U postgres -d pota_park >/dev/null 2>&1
        set ready 1
        break
    end
    sleep 2
end

if test $ready -ne 1
    die "数据库未就绪，请检查：docker compose logs db"
end

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
