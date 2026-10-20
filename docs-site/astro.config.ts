import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// `base` matches the GitHub Pages path: procyon-creative.github.io/qa-instructions/.
export default defineConfig({
  site: 'https://procyon-creative.github.io',
  base: '/qa-instructions',
  vite: {
    // @tailwindcss/vite and Astro each install their own Vite, so the plugin
    // type does not match Astro's; the plugin itself works with either.
    plugins: [tailwindcss() as never],
  },
});
