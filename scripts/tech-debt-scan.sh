#!/bin/bash

# 技术债务测量主脚本
echo "🚀 运行项目技术债务测量..."
echo "=================================="

# 进入项目根目录
cd "$(dirname "$0")/.." || {
  echo "❌ 无法进入项目根目录"
  exit 1
}

# 运行前端 SonarQube 扫描
echo "\n📋 执行前端 SonarQube 扫描..."
echo "----------------------------------"
sh scripts/frontend-sonar.sh || {
  echo "⚠️  前端 SonarQube 扫描失败，继续运行后端检查"
}

# 运行后端 ESLint 代码质量检查
echo "\n📋 执行后端 ESLint 代码质量检查..."
echo "----------------------------------"
sh scripts/backend-eslint.sh || {
  echo "⚠️  后端 ESLint 代码质量检查失败"
}

# 生成总结报告
echo "\n📊 技术债务测量总结"
echo "=================================="
echo "✅ 技术债务测量扫描完成"
echo "\n📝 后续建议："
echo "1. 查看前端 SonarQube 扫描结果，修复发现的问题"
echo "2. 解决后端 ESLint 版本冲突问题，确保代码质量检查正常运行"
echo "3. 定期运行此脚本，监控项目技术债务变化"
echo "4. 考虑添加自动化测试，提高代码覆盖率"

# 显示运行时间
echo "\n⏱️  扫描完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="
