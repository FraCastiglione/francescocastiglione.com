import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://francescocastiglione.com',
  integrations: [sitemap()],
  output: 'static',
  trailingSlash: 'always',
});
