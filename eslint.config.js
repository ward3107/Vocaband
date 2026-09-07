import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Allow 'any' with a comment (the codebase uses it sparingly for Supabase rows)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Don't flag unused vars that start with _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // TypeScript already resolves identifiers; the core no-undef rule only
      // yields false positives on .ts/.tsx (ambient globals, JSX, types), so
      // typescript-eslint recommends turning it off for TS files.
      'no-undef': 'off',
      // Empty catch blocks are deliberate throughout (ignore storage / parse
      // failures and fall back). Other empty blocks still error.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // eslint-plugin-react-hooks 7.x folded the new React-Compiler rule set
      // into `recommended` as ERRORS. This codebase predates those rules and
      // trips ~136 of them, so a straight adoption would make `npm run lint`
      // a wall of red. Surface the compiler rules as warnings for incremental
      // cleanup while rules-of-hooks + exhaustive-deps stay meaningful; flip
      // these back to 'error' once the backlog is worked down.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Core no-redeclare fires on TS function-overload signatures (e.g.
      // scrubPii's overload); TypeScript already catches real redeclares.
      'no-redeclare': 'off',
      // Control-char classes here are deliberate input sanitization
      // (strip \x00-\x1f from names / protocol / PII), not typos.
      'no-control-regex': 'warn',
      // Newer core rule; on labeled break/continue flows (crossword
      // placement, matching loops) it flags harmless redundant writes and
      // is easy to "fix" wrongly. Keep it visible as a warning.
      'no-useless-assignment': 'warn',
      // Advisory: suggests chaining `{ cause }` when rethrowing. Useful but
      // not worth blocking the build.
      'preserve-caught-error': 'warn',
    },
  },
  prettierConfig,
  {
    // Don't lint compiled output or deps
    ignores: ['dist/**', 'node_modules/**'],
  },
];
