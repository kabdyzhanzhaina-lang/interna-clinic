// Собирает 301-редиректы со старых адресов Tilda в vercel.json (ключ "redirects"), остальные ключи файла не трогает.
// Запуск: npm run redirects — после правок src/data/redirects.json, services_extra.json, media.json, kids.json или redirects-core.js. Результат коммитится.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRedirectMap } from '../src/lib/redirects-core.js';

const J = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const map = buildRedirectMap({ base: J('redirects.json'), extra: J('services_extra.json'), media: J('media.json').items, kids: J('kids.json') });

// адрес назначения со слэшем (trailingSlash: true), якорь — после него
const dest = (to) => { const [path, hash] = to.split('#'); return (path.endsWith('/') ? path : path + '/') + (hash ? '#' + hash : ''); };
const esc = (p) => p.replace(/([()[\]{}:*+?.])/g, '\\$1');   // спецсимволы path-to-regexp в старых адресах
const redirects = [];
for (const [from, to] of map) {
  const d = dest(to);
  if (`/${from}/` === d.split('#')[0]) continue;
  redirects.push({ source: '/' + esc(from), destination: d, statusCode: 301 });
  if (!/\.[a-z0-9]+$/i.test(from)) redirects.push({ source: '/' + esc(from) + '/', destination: d, statusCode: 301 });
}
// www → без www (после привязки домена)
redirects.unshift({ source: '/:path*', has: [{ type: 'host', value: 'www.internaclinic.kz' }], destination: 'https://internaclinic.kz/:path*', statusCode: 301 });

const file = new URL('../vercel.json', import.meta.url);
const cfg = JSON.parse(readFileSync(file, 'utf8'));
cfg.redirects = redirects;
writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
console.log(`[vercel.json] редиректов: ${redirects.length} (старых адресов: ${map.size})`);
