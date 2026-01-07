#!/usr/bin/env fish

# POTA Park Apply 一键启动脚本（本地开发 / 无 Docker / Fish）

function die
    echo "❌ $argv"
    exit 1
end

set -l root_dir (cd (dirname (status --current-filename)) && pwd)
cd $root_dir

echo "🚀 POTA Park Apply 一键启动（本地开发 / 无 Docker / Fish）"
echo "===================================================="

# 加载 .env（如果存在）
if test -f "$root_dir/.env"
    # fish 不能直接 source bash 风格 .env；这里用简易方式读取 KEY=VALUE 行
    for line in (cat "$root_dir/.env")
        if string match -qr '^[A-Za-z_][A-Za-z0-9_]*=' -- $line
            set -l key (string split -m1 '=' $line)[1]
            set -l val (string split -m1 '=' $line)[2]
            set -gx $key $val
        end
    end
end

# 默认值
set -q DB_HOST; or set -gx DB_HOST localhost
set -q DB_PORT; or set -gx DB_PORT 5432
set -q DB_NAME; or set -gx DB_NAME pota_park
set -q DB_USER; or set -gx DB_USER postgres
set -q PORT; or set -gx PORT 3000

command -v node >/dev/null 2>&1; or die "未找到 node，请先安装 Node.js（推荐 20.x 或更高）"

set -l node_major (node -p 'process.versions.node.split(".")[0]')
if test $node_major -lt 20
    die "当前 Node.js 版本为 "(node -v)"，前端 Vite 需要 Node.js >= 20。建议用 nvm/fnm/volta 升级到 20.x"
end

command -v pnpm >/dev/null 2>&1; or die "未找到 pnpm，请先安装 pnpm（建议：corepack enable && corepack prepare pnpm@8.15.0 --activate）"

echo "📦 安装依赖（如已安装会很快）..."
pnpm install; or die "依赖安装失败"

set -l pg_isready_cmd (command -v pg_isready 2>/dev/null)
if test -z "$pg_isready_cmd"
    if command -v brew >/dev/null 2>&1
        set -l brew_prefix (brew --prefix)
        for c in "$brew_prefix/opt/postgresql@17/bin/pg_isready" "$brew_prefix/opt/postgresql@16/bin/pg_isready" "$brew_prefix/opt/libpq/bin/pg_isready"
            if test -x $c
                set pg_isready_cmd $c
                break
            end
        end
    end
end

test -n "$pg_isready_cmd"; or die "未找到 pg_isready（PostgreSQL 客户端工具）。可尝试：brew install postgresql@17（或 postgresql@16）或 brew install libpq；并将 /opt/homebrew/opt/postgresql@17/bin 加入 PATH（fish：fish_add_path /opt/homebrew/opt/postgresql@17/bin）"

echo "⏳ 等待本地数据库就绪..."
set -l ready 0
for i in (seq 1 60)
    if $pg_isready_cmd -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
        set ready 1
        break
    end
    sleep 2
end

if test $ready -ne 1
    die "数据库未就绪：pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME（请确认 PostgreSQL 已启动且 .env 的 DB_* 正确）"
end

echo "🗄️  初始化数据库（幂等，可重复执行）..."
pnpm -C backend run init-db; or die "数据库初始化失败"

echo "🧩 启动后端（PORT=$PORT）..."
pnpm -C backend run dev &
set -l backend_pid $last_pid

function cleanup --on-event fish_exit
    echo ""
    echo "🧹 正在停止后端..."
    kill $backend_pid >/dev/null 2>&1
end

echo "🌐 启动前端（Vite dev server，端口 8080）..."
echo "📱 访问地址: http://localhost:8080"
echo "提示：如需部署，请使用 docker-compose.yml（部署阶段仍建议 Docker）。"

pnpm -C frontend run dev -- --port 8080
