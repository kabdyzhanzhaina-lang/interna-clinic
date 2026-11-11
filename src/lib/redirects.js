// Карта старых адресов Tilda → новые страницы. Данные + логика из redirects-core.js.
// Используется для страниц-заглушек (src/pages/[...old].astro, на случай обхода CDN) и для фильтра sitemap;
// боевые 301 — в vercel.json (генерируется: npm run redirects).
import base from '../data/redirects.json';
import extra from '../data/services_extra.json';
import mediaFile from '../data/media.json';
import kids from '../data/kids.json';
import { buildRedirectMap } from './redirects-core.js';

export function redirectMap() { return buildRedirectMap({ base, extra, media: mediaFile.items, kids }); }
export const REDIRECT_PATHS = [...redirectMap().keys()];
