
import { defineConfig } from 'eslint/config';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default defineConfig({
  ignores: ['eslint.config.mjs'],
  plugins: {
    jest: jestPlugin,
    '@typescript-eslint': tseslint.plugin,
  },
  extends: [
    'plugin:jest/recommended',
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    'plugin:prettier/recommended',
  ],
  languageOptions: {
    sourceType: 'commonjs',
    parser: tseslint.parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    'jest/unbound-method': 'off',
  },
});
