module.exports = {
  root: true,
  ignorePatterns: ['archive/**', 'i18n/**', 'scripts/**/dist/**'],
  env: {
    es2022: true,
    browser: true,
    worker: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'jsx-a11y/anchor-is-valid': 'warn',
  },
  overrides: [
    {
      files: ['**/*.worker.{js,jsx,ts,tsx}'],
      env: {
        worker: true,
      },
      rules: {
        'no-restricted-globals': 'off',
      },
    },
    {
      files: ['src/**/*.gs', 'src/**/*.js'],
      env: {
        browser: false,
        worker: false,
        node: false,
      },
      globals: {
        Logger: 'readonly',
        UrlFetchApp: 'readonly',
        HtmlService: 'readonly',
        ScriptApp: 'readonly',
        PropertiesService: 'readonly',
        SpreadsheetApp: 'readonly',
        ContentService: 'readonly',
        Utilities: 'readonly',
        CacheService: 'readonly',
        console: 'readonly',
      },
      rules: {
        'no-undef': 'off',
      },
    },
    {
      files: [
        '*.config.js',
        '*.config.cjs',
        '*.config.mjs',
        '*.config.ts',
        '*.config.tsx',
        '*.config.jsx',
        'scripts/**/*.js',
        'scripts/**/*.ts'
      ],
      env: {
        node: true,
      },
    },
  ],
};
