// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

// https://astro.build/config
export default defineConfig({
  site: 'https://danielkocot.github.io',
  base: '/',
  trailingSlash: 'never',

  integrations: [
    mdx(),
    sitemap(),
    compress(),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  output: 'static',
  build: { format: 'directory'},
});