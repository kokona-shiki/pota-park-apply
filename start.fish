#!/usr/bin/env fish

# POTA Park Apply 一键启动脚本 (Fish Shell 版本)
# 完成环境检查、依赖安装和项目启动

echo "🚀 POTA Park Apply 一键启动脚本"
echo "================================"

# 颜色定义
set -l red (set_color red)
set -l green (set_color green)
set -l yellow (set_color yellow)
set -l blue (set_color blue)
set -l normal (set_color normal)

# 日志函数
function log_info
    echo -e "$blue""ℹ️  $argv[1]""$normal"
end

function log_success
    echo -e "$green""✅ $argv[1]""$normal"
end

function log_warning
    echo -e "$yellow""⚠️  $argv[1]""$normal"
end

function log_error
    echo -e "$red""❌ $argv[1]""$normal"
end

# 检查命令是否存在
function command_exists
    command -v $argv[1] >/dev/null 2>&1
end

# 步骤1: 检查系统环境
log_info "检查系统环境..."

# 检查 Node.js (使用 nvm)
set -gx NVM_DIR "$HOME/.nvm"
if test -f "$NVM_DIR/nvm.sh"
    log_success "检测到 nvm"
    bass source ~/.nvm/nvm.sh
    if not nvm use 20 2>/dev/null
        log_warning "Node.js 20 未安装，正在安装..."
        nvm install 20
        nvm use 20
    end
else if command_exists nvm
    if not nvm use 20 2>/dev/null
        log_warning "Node.js 20 未安装，正在安装..."
        nvm install 20
        nvm use 20
    end
else if command_exists node
    set -l node_version (node --version | cut -d'v' -f2)
    if string match -q "v*" $node_version
        set node_version (string sub -s 2 $node_version)
    end
    if string match -q "*.*" $node_version
        set major_version (string split '.' $node_version)[1]
        if test $major_version -lt 20
            log_warning "Node.js 版本过低 ($node_version)，建议使用 v20+"
        else
            log_success "Node.js 版本: $node_version"
        end
    end
else
    log_error "未找到 Node.js，请先安装 Node.js 20+"
    exit 1
end

# 检查 pnpm
if not command_exists pnpm
    log_warning "pnpm 未安装，正在安装..."
    npm install -g pnpm
else
    set -l pnpm_version (pnpm --version)
    log_success "pnpm 版本: $pnpm_version"
end

# 步骤2: 安装依赖
log_info "检查并安装项目依赖..."

if test -f "pnpm-workspace.yaml"
    log_info "检测到 workspace 配置，安装所有依赖..."
    pnpm install
    log_success "依赖安装完成"
else
    log_error "未找到 pnpm-workspace.yaml 配置"
    exit 1
end

# 步骤3: 检查环境变量
log_info "检查环境配置..."

if not test -f ".env"
    if test -f ".env.example"
        log_warning "未找到 .env 文件，正在创建..."
        cp .env.example .env
        log_success "已创建 .env 文件（使用默认配置）"
        log_info "如需修改配置，请编辑 .env 文件"
    else
        log_error "未找到 .env.example 文件"
        exit 1
    end
else
    log_success "环境配置文件已存在"
end

# 步骤4: 检查端口占用
log_info "检查端口占用情况..."

function check_port
    set -l port $argv[1]
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    and return 0  # 端口被占用
    or return 1  # 端口空闲
end

set -l frontend_port 5173
set -l backend_port 3001

if check_port $frontend_port
    log_warning "前端端口 $frontend_port 已被占用"
end

if check_port $backend_port
    log_warning "后端端口 $backend_port 已被占用"
end

# 步骤5: 启动服务
log_info "准备启动服务..."

# 启动后端（后台运行）
log_info "启动后端服务..."
cd backend
pnpm dev > ../backend.log 2>&1 &
set -gx backend_pid $last_pid
cd ..

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ps -p $backend_pid > /dev/null
    log_success "后端服务已启动 (PID: $backend_pid)"
else
    log_error "后端服务启动失败，请检查 backend.log"
    exit 1
end

# 启动前端
log_info "启动前端服务..."
cd frontend
pnpm dev > ../frontend.log 2>&1 &
set -gx frontend_pid $last_pid
cd ..

# 等待前端启动
sleep 3

# 检查前端是否启动成功
if ps -p $frontend_pid > /dev/null
    log_success "前端服务已启动 (PID: $frontend_pid)"
else
    log_error "前端服务启动失败，请检查 frontend.log"
    kill $backend_pid 2>/dev/null
    exit 1
end

# 步骤6: 显示服务信息
echo ""
echo "🎉 服务启动成功！"
echo "=================="
echo -e "$green""📱 前端应用:""$normal"" http://localhost:$frontend_port"
echo -e "$green""🔧 后端API:""$normal"" http://localhost:$backend_port"
echo -e "$green""💚 健康检查:""$normal"" http://localhost:$backend_port/api/health"
echo ""
echo "📋 进程信息:"
echo "  前端 PID: $frontend_pid"
echo "  后端 PID: $backend_pid"
echo ""
echo "📝 日志文件:"
echo "  前端日志: frontend.log"
echo "  后端日志: backend.log"
echo ""
echo "🛑 停止服务:"
echo "  停止前端: kill $frontend_pid"
echo "  停止后端: kill $backend_pid"
echo "  停止全部: kill $frontend_pid $backend_pid"
echo ""

# 设置信号处理，确保退出时清理进程
function cleanup
    log_info "正在停止服务..."
    kill $frontend_pid $backend_pid 2>/dev/null
    # 等待进程完全退出，最多等待3秒
    for i in (seq 1 3)
        if not ps -p $frontend_pid $backend_pid > /dev/null 2>&1
            break
        end
        sleep 1
    end
    # 强制清理仍在运行的进程
    kill -9 $frontend_pid $backend_pid 2>/dev/null
    log_success "服务已停止"
    echo ""
    echo "感谢使用 POTA Park Apply！🎯"
    exit 0
end

# 捕获信号
function handle_signal --on-signal SIGINT --on-signal SIGTERM
    cleanup
end

# 等待用户输入退出
echo "按 Ctrl+C 或输入 'q' 退出..."
while true
    read -P "" -n 1 input -t 1 2>/dev/null
    or true  # 忽略超时错误
    if string match -qi "q" $input
        cleanup
    end
    # 检查进程是否还在运行
    if not ps -p $frontend_pid > /dev/null; or not ps -p $backend_pid > /dev/null
        log_warning "检测到服务异常退出"
        cleanup
    end
end

log_success "服务已停止"
echo ""
echo "感谢使用 POTA Park Apply！🎯"