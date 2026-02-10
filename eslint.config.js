import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// 前端配置
const frontendConfig = {
  files: ['frontend/**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'complexity': ['error', 10],
    'no-restricted-properties': [
      'error',
      {
        object: 'JSON',
        property: 'parse',
        message: '请使用 safeParseJsonWithSchema(...) 进行校验解析',
        selector: '!CallExpression[arguments.0.type="Literal"]:not(:matches(CallExpression[callee.property.name="safeParseJsonWithSchema"], CallExpression[callee.property.name="parseJsonWithSchema"], CallExpression[callee.property.name="safeParseJson"]))',
      },
    ],
  },
};

// 后端配置
const backendConfig = {
  files: ['backend/**/*.{ts,js}'],
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.node,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'complexity': ['error', 10],
  },
};

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'pnpm-lock.yaml',
      'frontend/.sonar/',
      'frontend/.sonar-temp/',
      'frontend/coverage/',
      'backend/coverage/',
    ],
  },
  frontendConfig,
  backendConfig,
  // 允许在 parseJson.ts 中使用 JSON.parse
  {
    files: ['frontend/src/utils/parseJson.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
]);
