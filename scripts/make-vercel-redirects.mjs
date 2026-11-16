// Собирает 301-редиректы со старых адресов Tilda в vercel.json (ключ "redirects"), остальные ключи файла не трогает.
// Админка пересобирает редиректы сама при публикации. Вручную: npm run redirects — после правок src/data/redirects.json, services_extra.json, media.json, kids.json или redirects-core.js. Результат коммитится.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRedirectMap, vercelRedirects } from '../src/lib/redirects-core.js';

const J = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const map = buildRedirectMap({ base: J('redirects.json'), extra: J('services_extra.json'), media: J('media.json').items, kids: J('kids.json') });

const file = new URL('../vercel.json', import.meta.url);
const cfg = JSON.parse(readFileSync(file, 'utf8'));
const redirects = vercelRedirects(map);
cfg.redirects = redirects;
writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
console.log(`[vercel.json] редиректов: ${redirects.length} (старых адресов: ${map.size})`);
