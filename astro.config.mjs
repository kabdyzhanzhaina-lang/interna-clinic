import { defineConfig } from 'astro/config';

// SITE_URL / BASE_PATH задаются в CI (GitHub Pages: https://<user>.github.io + /interna-clinic).
// Локально и на своём домене — site по умолчанию, base = '/'.
const site = process.env.SITE_URL || 'https://internaclinic.kz';
const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '') || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'kk'],
    routing: { prefixDefaultLocale: false }
  },
  build: { format: 'directory' },
  vite: { server: { allowedHosts: true }, preview: { allowedHosts: true } }
});
