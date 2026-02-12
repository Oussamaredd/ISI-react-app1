import eslintJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import pluginImport from 'eslint-plugin-import';
import pluginSecurity from 'eslint-plugin-security';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRootDir = path.dirname(fileURLToPath(import.meta.url));

const forbiddenApiLayerImports = [
  '../app/**',
  '../../app/**',
  '../../../app/**',
  '../../../../app/**',
  '../infrastructure/**',
  '../../infrastructure/**',
  '../../../infrastructure/**',
  '../../../../infrastructure/**',
];

const forbiddenDirectDatabaseImports = [
  '../database/**',
  '../../database/**',
  '../../../database/**',
  '../../../../database/**',
];

const crossLayerRestrictedImports = {
  paths: [
    {
      name: 'ecotrack-app',
      message: 'The api layer must not import runtime modules from the app layer.',
    },
    {
      name: 'ecotrack-infrastructure',
      message: 'The api layer must not import runtime modules from the infrastructure layer.',
    },
  ],
  patterns: [
    {
      group: forbiddenApiLayerImports,
      message: 'The api layer must not import runtime code from app/infrastructure.',
    },
  ],
};

const controllerAndServiceRestrictedImports = {
  paths: [
    ...crossLayerRestrictedImports.paths,
    {
      name: 'drizzle-orm',
      message: 'Controllers/services must not import Drizzle directly. Use repositories.',
    },
    {
      name: 'ecotrack-database',
      message: 'Controllers/services must not import database package modules directly. Use repositories.',
    },
  ],
  patterns: [
    ...crossLayerRestrictedImports.patterns,
    {
      group: forbiddenDirectDatabaseImports,
      message: 'Controllers/services must not import database module providers directly. Use repositories.',
    },
  ],
};

const domainControllerAndServiceFiles = [
  'src/admin/**/*.controller.ts',
  'src/admin/**/*.service.ts',
  'src/auth/**/*.controller.ts',
  'src/auth/**/*.service.ts',
  'src/dashboard/**/*.controller.ts',
  'src/dashboard/**/*.service.ts',
  'src/hotels/**/*.controller.ts',
  'src/hotels/**/*.service.ts',
  'src/monitoring/**/*.controller.ts',
  'src/monitoring/**/*.service.ts',
  'src/tickets/**/*.controller.ts',
  'src/tickets/**/*.service.ts',
  'src/users/**/*.service.ts',
];

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: apiRootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: pluginImport,
      security: pluginSecurity,
    },
    rules: {
      ...eslintJs.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        crossLayerRestrictedImports,
      ],
      'import/order': [
        'warn',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: domainControllerAndServiceFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        controllerAndServiceRestrictedImports,
      ],
    },
  },
];
