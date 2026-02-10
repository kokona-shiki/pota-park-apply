import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略
  { ignores: ['dist/**', 'node_modules/**', '*.config.js', 'coverage/**'] },

  // 基础推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则（速度快，适合日常开发）
  ...tseslint.configs.recommended,

  // ==================== React + TSX 文件配置 ====================
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat['jsx-runtime'], // React 17+ 自动 JSX
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules, // Vite Fast Refresh 规则

      // 常用实用规则（可自行调整严格程度）
      'react/prop-types': 'off', // TypeScript 已替代
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'react-refresh/only-export-components': 'warn',
      'react/jsx-key': 'off',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true, // 2025+ 推荐，提升性能
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // ==================== vite.config.ts（Node 环境）================
  {
    files: ['vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Prettier 必须放最后，关闭冲突规则
  prettierConfig
);
