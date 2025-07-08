// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  {
    ignores: ['eslint.config.mjs', 'dist/**/*', 'node_modules/**/*'],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      ecmaVersion: 2023,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'prettier/prettier': 'error',
    },
  },
];