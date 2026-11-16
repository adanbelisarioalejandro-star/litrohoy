import { defineConfig } from 'astro/config';

// SITE_URL: dominio definitivo (ver PENDIENTE.md). Se usa en canonical, sitemap y datos estructurados.
export default defineConfig({
  site: process.env.SITE_URL || 'https://litrohoy.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
});
