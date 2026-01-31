import eslintJs from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginSecurity from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

export default [
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
    plugins: {
      import: pluginImport,
      security: pluginSecurity,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
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
];
