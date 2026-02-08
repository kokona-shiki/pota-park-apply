#!/bin/bash

# 前端 SonarQube 扫描脚本

echo "🚀 运行前端 SonarQube 扫描..."
echo "=================================="

# 进入前端目录
cd "$(dirname "$0")/../frontend" || {
  echo "❌ 无法进入前端目录"
  exit 1
}

# 运行测试覆盖率报告
echo "📊 生成测试覆盖率报告..."
pnpm run test:coverage || {
  echo "⚠️  测试覆盖率报告生成失败，继续运行 SonarQube 扫描"
}

# 运行 SonarQube 扫描
echo "🔍 运行 SonarQube 扫描..."
pnpm run sonar || {
  echo "❌ SonarQube 扫描失败"
  exit 1
}

echo "✅ 前端 SonarQube 扫描完成"
