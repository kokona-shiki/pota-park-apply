**完美！** 你用的是 **Vite + React + TypeScript**，这是目前最主流的组合。我给你**专门针对 Vite 项目优化后的 ESLint 配置**。

Vite 项目有几个特点：
- 有 `vite.config.ts`（Node 环境）
- 通常有 `tsconfig.json` + `tsconfig.node.json`（或 `tsconfig.app.json`）
- 需要支持 `import.meta.env`、`React Fast Refresh` 等

### 1. 安装依赖（Vite 优化版）

```bash
npm install --save-dev \
  eslint \
  typescript-eslint \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh \
  eslint-config-prettier \
  prettier \
  globals
```

> `eslint-plugin-react-refresh` 是 Vite 官方推荐的，用于确保组件只导出组件（配合 Fast Refresh）。

### 2. ESLint 配置（推荐：eslint.config.js）

在项目根目录创建 **`eslint.config.js`**（Flat Config）：

```js
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
      ...reactRefresh.configs.vite.rules,   // Vite Fast Refresh 规则

      // 常用实用规则（可自行调整严格程度）
      'react/prop-types': 'off',                    // TypeScript 已替代
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'react-refresh/only-export-components': 'warn',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'], // 支持 Vite 多 tsconfig
        tsconfigRootDir: import.meta.dirname,
        projectService: true,   // 2025+ 推荐，提升性能
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
```

### 3. 如果你想要更严格的类型检查（大项目推荐）

把 TypeScript 部分改成：

```js
...tseslint.configs.recommendedTypeChecked,   // 或 .strictTypeChecked
```

同时保留上面的 `parserOptions.project` 配置即可。类型感知规则能抓出更多问题（如未处理的 Promise、类型安全等），但首次 lint 会稍慢。

### 4. Prettier 配置（不变）

**`.prettierrc.json`**：

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 5. package.json 脚本

```json
"scripts": {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

### 6. VS Code 配置（推荐）

`settings.json`：

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"]
}
```

### 7. 快速接入步骤

1. 安装依赖
2. 创建 `eslint.config.js`（复制上面代码）
3. 创建 `.prettierrc.json`
4. 运行 `npm run lint:fix` 自动修复现有代码
5. 重启 VS Code（确保 ESLint 扩展生效）

### 额外推荐（可选，但强烈建议）

- **路径别名支持**（@/*）：如果你在 `vite.config.ts` 和 `tsconfig.json` 配置了 alias，建议再加：
  ```bash
  npm install --save-dev eslint-plugin-import eslint-import-resolver-typescript
  ```
  然后告诉我，我给你加上 `import/order` 排序规则。

- **提交前自动 lint**：用 **Husky + lint-staged**（Vite 项目标配）。需要的话我立刻给你完整配置。

这个配置在 2026 年是 Vite + React + TS 项目中最常用、最稳定的方案之一。

你现在可以直接复制使用！  
有任何问题（比如想加 Airbnb 风格、import 排序、Husky 等），或者想切换成更严格的类型检查版本，随时告诉我～