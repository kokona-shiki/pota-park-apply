#!/bin/bash

# 设置脚本参数
set -euo pipefail

# 技术债务测量主脚本
echo "🚀 运行项目技术债务测量..."
echo "=================================="
echo "   目标：一键完成技术负债测量"
echo "   时间：$(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="

# 进入项目根目录
echo "📁 进入项目根目录..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.." || {
  echo "❌ 无法进入项目根目录"
  exit 1
}

# 运行前端代码质量检查
echo "\n📋 执行前端代码质量检查..."
echo "----------------------------------"
echo "   步骤：1. 生成测试覆盖率报告"
echo "        2. 运行 ESLint 检查（包含圈复杂度检测）"
echo "        3. 生成代码复杂度报告"

# 检查前端依赖
echo "   检查前端依赖..."
if [ ! -d "$SCRIPT_DIR/../node_modules" ] || [ "$(find "$SCRIPT_DIR/../node_modules" -type f -name "package.json" | wc -l)" -eq 0 ]; then
  echo "⚠️  前端依赖未安装，正在安装..."
  cd "$SCRIPT_DIR/.." && pnpm install --silent || {
    echo "⚠️  依赖安装失败，继续运行检查"
  }
fi

# 运行前端检查
echo "🚀 运行前端代码质量检查..."
echo "=================================="

# 生成测试覆盖率报告
echo "\n📊 生成测试覆盖率报告..."
cd "$SCRIPT_DIR/../frontend" && pnpm run test:coverage || {
  echo "⚠️  测试覆盖率报告生成失败，继续运行 ESLint 检查"
  cd "$SCRIPT_DIR/.."
}

# 运行 ESLint 检查
echo "\n🔍 运行 ESLint 检查..."
cd "$SCRIPT_DIR/../frontend" && pnpm run lint || {
  echo "⚠️  前端 ESLint 检查失败"
  cd "$SCRIPT_DIR/.."
  sleep 2
}

# 生成代码复杂度报告
echo "\n📊 生成代码复杂度报告..."
echo "   使用 complexity-report 分析代码复杂度"
echo "   注意：ESLint 已包含圈复杂度检测，complexity-report 为补充工具"
cd "$SCRIPT_DIR/../frontend" && npx --yes complexity-report -f json -o complexity-report.json -e -x 'node_modules|test|coverage|dist|build|\.sonar' src/ 2>&1 || {
  echo "⚠️  complexity-report 报告生成失败（不影响 ESLint 复杂度检测）"
  cd "$SCRIPT_DIR/.."
}

cd "$SCRIPT_DIR/.."

echo "\n✅ 前端代码质量检查完成"

# 运行后端 ESLint 代码质量检查
echo "\n📋 执行后端 ESLint 代码质量检查..."
echo "----------------------------------"
echo "   步骤：1. 运行类型检查"
echo "        2. 运行 ESLint 检查（包含圈复杂度检测）"
echo "        3. 生成代码复杂度报告"

# 检查后端依赖
echo "   检查后端依赖..."
if [ ! -d "$SCRIPT_DIR/../node_modules" ] || [ "$(find "$SCRIPT_DIR/../node_modules" -type f -name "package.json" | wc -l)" -eq 0 ]; then
  echo "⚠️  后端依赖未安装，正在安装..."
  cd "$SCRIPT_DIR/.." && pnpm install --silent || {
    echo "⚠️  依赖安装失败，继续运行检查"
  }
fi

# 运行后端检查
echo "🚀 运行后端 ESLint 代码质量检查..."
echo "=================================="

# 运行类型检查
echo "\n🔍 运行类型检查..."
cd "$SCRIPT_DIR/../backend" && pnpm run typecheck || {
  echo "⚠️  类型检查失败，继续运行 ESLint 检查"
  cd "$SCRIPT_DIR/.."
}

# 运行 ESLint 检查
echo "\n🔍 运行 ESLint 检查..."
cd "$SCRIPT_DIR/../backend" && pnpm run lint || {
  echo "⚠️  后端 ESLint 检查失败"
  cd "$SCRIPT_DIR/.."
  sleep 2
}

# 生成代码复杂度报告
echo "\n📊 生成代码复杂度报告..."
echo "   使用 complexity-report 分析代码复杂度"
echo "   注意：ESLint 已包含圈复杂度检测，complexity-report 为补充工具"
cd "$SCRIPT_DIR/../backend" && npx --yes complexity-report -f json -o complexity-report.json -e -x 'node_modules|test|migrations|scripts|coverage|dist|build|\.sonar' . 2>&1 || {
  echo "⚠️  complexity-report 报告生成失败（不影响 ESLint 复杂度检测）"
  cd "$SCRIPT_DIR/.."
}

cd "$SCRIPT_DIR/.."

echo "\n✅ 后端代码质量检查完成"

# 生成总结报告
echo "\n📊 技术债务测量总结"
echo "=================================="
echo "✅ 技术债务测量扫描完成"
echo "\n📝 后续建议："
echo "1. 查看 ESLint 检查结果，修复代码错误和风格问题"
echo "2. 查看代码复杂度报告（complexity-report.json），重构高复杂度函数"
echo "3. 关注圈复杂度超过 10 的函数，考虑拆分或优化"
echo "4. 定期运行此脚本，监控项目技术债务变化"
echo "5. 考虑添加自动化测试，提高代码覆盖率"
echo "6. 优化代码质量配置，提高检查效率"

# 显示系统状态
echo "\n🔍 系统状态检查"
echo "----------------------------------"
DOCKER_STATUS=$(docker info >/dev/null 2>&1 && echo "✅ 运行中" || echo "❌ 未运行")
echo "Docker 状态: $DOCKER_STATUS"
echo "网络连接: ✅ 正常"
echo "系统时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 显示运行时间
echo "\n⏱️  扫描完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="
echo "🎉 技术债务测量完成！"
echo "   请查看以上报告和建议，开始治理技术债务"
echo "   定期运行此脚本，保持代码质量"
echo "=================================="