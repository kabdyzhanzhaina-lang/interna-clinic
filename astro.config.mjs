import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { REDIRECT_PATHS } from './src/lib/redirects.js';

// SITE_URL / BASE_PATH задаются в CI (GitHub Pages: https://<user>.github.io + /interna-clinic).
// Локально и на своём домене — site по умолчанию, base = '/'.
const site = process.env.SITE_URL || 'https://internaclinic.kz';
const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '') || '/';

export default defineConfig({
  // sitemap без заглушек-редиректов и без служебных страниц
  integrations: [sitemap({ i18n: { defaultLocale: 'ru', locales: { ru: 'ru-KZ', kk: 'kk-KZ' } }, filter: (page) => !REDIRECT_PATHS.some((r) => page.replace(/\/$/, '').endsWith('/' + r)) && !/\/404|\/admin/.test(page) })],
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
