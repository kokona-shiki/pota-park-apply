#!/bin/bash

# POTA Park Apply 一键启动脚本
# 完成环境检查、依赖安装和项目启动

echo "🚀 POTA Park Apply 一键启动脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 步骤1: 检查系统环境
log_info "检查系统环境..."

# 检查 Node.js (使用 nvm)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    log_success "检测到 nvm"
    . "$NVM_DIR/nvm.sh"
    nvm use 20 2>/dev/null || {
        log_warning "Node.js 20 未安装，正在安装..."
        nvm install 20 && nvm use 20
    }
elif command -v nvm >/dev/null 2>&1; then
    nvm use 20 2>/dev/null || {
        log_warning "Node.js 20 未安装，正在安装..."
        nvm install 20 && nvm use 20
    }
elif command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ "$NODE_VERSION" < "20.0.0" ]]; then
        log_warning "Node.js 版本过低 ($NODE_VERSION)，建议使用 v20+"
    else
        log_success "Node.js 版本: $NODE_VERSION"
    fi
else
    log_error "未找到 Node.js，请先安装 Node.js 20+"
    exit 1
fi

# 检查 pnpm
if ! command_exists pnpm; then
    log_warning "pnpm 未安装，正在安装..."
    npm install -g pnpm
else
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm 版本: $PNPM_VERSION"
fi

# 步骤2: 安装依赖
log_info "检查并安装项目依赖..."

if [ -f "pnpm-lock.yaml" ]; then
    log_info "检测到 workspace 配置，安装所有依赖..."
    pnpm install
    log_success "依赖安装完成"
else
    log_error "未找到 pnpm-workspace.yaml 配置"
    exit 1
fi

# 步骤3: 检查环境变量
log_info "检查环境配置..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warning "未找到 .env 文件，正在创建..."
        cp .env.example .env
        log_success "已创建 .env 文件（使用默认配置）"
        log_info "如需修改配置，请编辑 .env 文件"
    else
        log_error "未找到 .env.example 文件"
        exit 1
    fi
else
    log_success "环境配置文件已存在"
fi

# 步骤4: 检查端口占用
log_info "检查端口占用情况..."

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

FRONTEND_PORT=5173
BACKEND_PORT=3001

if check_port $FRONTEND_PORT; then
    log_warning "前端端口 $FRONTEND_PORT 已被占用"
fi

if check_port $BACKEND_PORT; then
    log_warning "后端端口 $BACKEND_PORT 已被占用"
fi

# 步骤5: 启动服务
log_info "准备启动服务..."

# 启动后端（后台运行）
log_info "启动后端服务..."
cd backend
pnpm dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ps -p $BACKEND_PID > /dev/null; then
    log_success "后端服务已启动 (PID: $BACKEND_PID)"
else
    log_error "后端服务启动失败，请检查 backend.log"
    exit 1
fi

# 启动前端
log_info "启动前端服务..."
cd frontend
pnpm dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 3

# 检查前端是否启动成功
if ps -p $FRONTEND_PID > /dev/null; then
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"
else
    log_error "前端服务启动失败，请检查 frontend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 步骤6: 显示服务信息
echo ""
echo "🎉 服务启动成功！"
echo "=================="
echo -e "${GREEN}📱 前端应用:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${GREEN}🔧 后端API:${NC} http://localhost:$BACKEND_PORT"
echo -e "${GREEN}💚 健康检查:${NC} http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "📋 进程信息:"
echo "  前端 PID: $FRONTEND_PID"
echo "  后端 PID: $BACKEND_PID"
echo ""
echo "📝 日志文件:"
echo "  前端日志: frontend.log"
echo "  后端日志: backend.log"
echo ""
echo "🛑 停止服务:"
echo "  停止前端: kill $FRONTEND_PID"
echo "  停止后端: kill $BACKEND_PID"
echo "  停止全部: kill $FRONTEND_PID $BACKEND_PID"
echo ""

# 设置信号处理，确保退出时清理进程
cleanup() {
    log_info "正在停止服务..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    # 等待进程完全退出，最多等待3秒
    for i in {1..3}; do
        if ! ps -p $FRONTEND_PID $BACKEND_PID > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    # 强制清理仍在运行的进程
    kill -9 $FRONTEND_PID $BACKEND_PID 2>/dev/null
    log_success "服务已停止"
    echo ""
    echo "感谢使用 POTA Park Apply！🎯"
    exit 0
}

# 捕获 Ctrl+C 信号
trap cleanup SIGINT SIGTERM

# 等待用户输入退出
echo "按 Ctrl+C 或输入 'q' 退出..."
while true; do
    read -t 1 -n 1 input 2>/dev/null
    if [[ $input == "q" ]] || [[ $input == "Q" ]]; then
        cleanup
    fi
    # 检查进程是否还在运行
    if ! ps -p $FRONTEND_PID > /dev/null || ! ps -p $BACKEND_PID > /dev/null; then
        log_warning "检测到服务异常退出"
        cleanup
    fi
done

# 等待进程完全退出
sleep 1

log_success "服务已停止"
echo ""
echo "感谢使用 POTA Park Apply！🎯"