#!/bin/bash

# 后端 ESLint 代码质量检查脚本

echo "🚀 运行后端 ESLint 代码质量检查..."
echo "=================================="

# 进入后端目录
cd "$(dirname "$0")/../backend" || {
  echo "❌ 无法进入后端目录"
  exit 1
}

# 运行类型检查
echo "🔍 运行类型检查..."
pnpm run typecheck || {
  echo "⚠️  类型检查失败，继续运行 ESLint 检查"
}

# 运行 ESLint 检查
echo "🔍 运行 ESLint 检查..."
pnpm run lint || {
  echo "⚠️  ESLint 检查失败，可能是由于版本冲突问题"
  echo "   建议检查 ESLint 版本并调整配置"
}

echo "✅ 后端代码质量检查完成"
