// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// `base` matches the GitHub Pages path: procyon-creative.github.io/qa-instructions/.
export default defineConfig({
  site: 'https://procyon-creative.github.io',
  base: '/qa-instructions',
  vite: {
    plugins: [tailwindcss()],
  },
});
