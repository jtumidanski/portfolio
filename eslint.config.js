import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', '.astro', 'node_modules']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
]);
