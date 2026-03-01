import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略
  { ignores: ['node_modules/**', 'dist/**', '*.config.js', 'migrations/**', 'scripts/**', 'test/**', 'prisma/**'] },

  // 基础推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // ==================== Node.js + TypeScript 文件配置 ====================
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
        allowDefaultProject: true,
      },
    },
    rules: {
      // 常用实用规则
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },

  // Prettier 必须放最后，关闭冲突规则
  prettierConfig
);
