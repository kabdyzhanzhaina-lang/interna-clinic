// Логика карты редиректов без импорта данных — её же использует scripts/make-vercel-redirects.mjs (Node) для vercel.json.
// Карта старых адресов Tilda → новые страницы. Используется для страниц-заглушек с редиректом и для фильтра sitemap.

const strip = (u) => u.replace(/^https?:\/\/[^/]+\//, '').replace(/\/+$/, '');

// Страницы, которые на новом сайте живут по тому же адресу — заглушка не нужна
const SAME = new Set(['media', 'contacts', 'prepare', 'faq', 'checkup', 'kids', 'about', 'doctors', 'prices', 'services', 'legal', 'promo', 'reviews']);

export function buildRedirectMap({ base, extra, media, kids }) {
  const m = new Map();
  const add = (from, to) => { const f = strip(from); if (f && !SAME.has(f) && f !== to.replace(/^\//, '')) m.set(f, to); };
  for (const [from, to] of base) add(from, to);
  for (const slug of Object.keys(extra)) add(slug, `/uslugi/${slug}`);
  for (const a of media) if (a.url) add(a.url, `/article/${a.id}`);
  for (const s of kids.services) if (s.src) add(s.src, `/kids/${s.id}`);
  // разделы старого сайта
  const MISC = {
    'about-us': '/about', team: '/doctors', interna_team: '/doctors', teamold: '/doctors', service: '/services', price: '/prices', calculated: '/prices',
    consult_dr: '/prices', endoscopy_menu: '/prices', ultra_menu: '/prices', function_dia: '/prices', species: '/prices',
    'women-checkup': '/checkup', 'gastro-checkup': '/checkup', 'cardio-checkup': '/checkup', 'endocrinology-checkup': '/checkup', packet: '/checkup',
    oferta: '/legal', rulse: '/legal', page133270433: '/legal', 'page133270433.html': '/legal', page50293545: '/uslugi/esg', 'page50293545.html': '/uslugi/esg',
    thesis: '/about', academy: '/about', contacts_old: '/contacts', taplink: '/contacts', tapacademy: '/about', feedback: '/reviews',
    cal_tera: '/contacts', cal_proc: '/contacts', cal_gastro: '/contacts', cal_cardio: '/contacts', cal_uro: '/contacts', cal_inf: '/contacts', endo_cal: '/contacts', cal_nevro: '/contacts', cal_ultra: '/contacts', fibro_cal: '/service/fibroscan', interna_cal_team: '/doctors',
  };
  for (const [f, t] of Object.entries(MISC)) add(f, t);
  return m;
}


/** Карта → список редиректов для vercel.json (общий для scripts/make-vercel-redirects.mjs и админки) */
export function vercelRedirects(map) {
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
  return redirects;
}
