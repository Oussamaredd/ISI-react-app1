import js from '@eslint/js'
import tsEslintPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const forbiddenAppLayerImports = [
  '../api/**',
  '../../api/**',
  '../../../api/**',
  '../../../../api/**',
  '../database/**',
  '../../database/**',
  '../../../database/**',
  '../../../../database/**',
  '../infrastructure/**',
  '../../infrastructure/**',
  '../../../infrastructure/**',
  '../../../../infrastructure/**',
]

export default [
  {
    ignores: [
      'dist/**',
      'src/components/admin/UserManagement.tsx',
      'src/components/admin/UserEditModal.tsx',
      'src/tests/errorHandling.test.tsx',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '#database',
              message: 'The app layer must not import database runtime modules.',
            },
            {
              name: 'react-app1-api',
              message: 'The app layer must not import runtime modules from the api layer.',
            },
            {
              name: 'react-app1-database',
              message: 'The app layer must not import runtime modules from the database layer.',
            },
            {
              name: 'react-app1-infrastructure',
              message: 'The app layer must not import runtime modules from the infrastructure layer.',
            },
          ],
          patterns: [
            {
              group: forbiddenAppLayerImports,
              message: 'The app layer must not import runtime code from api/database/infrastructure.',
            },
          ],
        },
      ],
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...(globals.vitest ?? {}),
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
