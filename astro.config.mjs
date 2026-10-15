import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://tumidanski.com',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
});
