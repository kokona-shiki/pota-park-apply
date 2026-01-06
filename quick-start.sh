#!/bin/bash

# POTA Park Apply 快速启动脚本
# 假设环境已经配置好，直接启动服务

echo "⚡ POTA Park Apply 快速启动"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先运行 ./start.sh 进行完整设置"
    exit 1
fi

# 加载 Node.js 版本
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
    nvm use 20 2>/dev/null
fi

# 启动服务
echo "🚀 启动服务..."

# 启动后端
cd backend
pnpm dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 启动前端
cd frontend
pnpm dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3

# 检查启动状态
if ps -p $BACKEND_PID > /dev/null && ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ 服务启动成功！"
    echo "📱 前端: http://localhost:5173"
    echo "🔧 后端: http://localhost:3001"
    echo "🛑 停止: kill $FRONTEND_PID $BACKEND_PID"
else
    echo "❌ 服务启动失败，请检查日志"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
fi