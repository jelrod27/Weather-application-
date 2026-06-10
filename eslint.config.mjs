import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
    {
        ignores: [
            'node_modules/**',
            '.next/**',
            'playwright-report/**',
            'test-results/**',
            '_archive/**',
            'scripts/**',
        ],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx,mjs}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': hooksPlugin,
            '@next/next': nextPlugin,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // Next.js rules
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,

            // React rules - relaxed for common patterns
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',

            // React hooks - use standard recommended, not strict experimental rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // Allow <img> for external images
            '@next/next/no-img-element': 'warn',

            // Prevent debug console.log statements in production code
            // Allow console.warn and console.error for legitimate logging
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
    // Enforce the documented "import type" convention (CODING.md) instead of
    // hand-policing it in review. Auto-fixable: eslint --fix converts value
    // imports of type-only symbols to import type.
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
        },
    },
    // Override for files where console.log is intentional
    {
        files: [
            'instrumentation*.ts',
            'sentry.*.config.ts',
            'lib/performance/**/*.ts',
            'tests/**/*.ts',
        ],
        rules: {
            'no-console': 'off',
        },
    },
];
