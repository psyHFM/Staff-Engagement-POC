// @ts-check
// ESLint 9 flat config (angular-eslint). Constitution: Angular Style Guide —
// kebab-case files, inject() DI, feature-based structure.
// TS configs are scoped to **/*.ts and template configs to **/*.html so the
// template parser never overrides the TypeScript parser on .ts files.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '.stryker-tmp/**', 'out-tsc/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended
    ]
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility
    ],
    rules: {
      // Enforce unique IDs in templates (accessibility requirement)
      'no-duplicate-id': 'error',
    },
  }
);
