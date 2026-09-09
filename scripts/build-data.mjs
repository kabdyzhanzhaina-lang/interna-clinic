// content/migrated/* → src/data/services_extra.json (все страницы услуг старого сайта, кроме 6 «богатых»)
import { readFileSync, writeFileSync } from 'node:fs';
const mig = JSON.parse(readFileSync('content/migrated/services.json', 'utf8'));
const rich = JSON.parse(readFileSync('src/data/services.json', 'utf8'));
// slug старого сайта → slug «богатой» страницы нового
const RICH_MAP = { colonoscopy: 'colonoscopy', fgds: 'fgds', fibroscan: 'fibroscan', ultrasound: 'ultrasound', gastroenterolog: 'gastro', endocrinology: 'endo' };
const CAT = (slug, h1) => {
  const s = (slug + ' ' + h1).toLowerCase();
  if (/эндоскоп|колоно|эгдс|капсул|биопс|ph|гемостаз|полип/.test(s) || /capsule|biopsia|ph-metr|endoscopist/.test(slug)) return 'Эндоскопические процедуры';
  if (/узи|уздг|эхо|ultra|uzdg|sonogram/.test(s)) return 'УЗИ';
  if (/стационар|процедур|station|proccab|капельниц/.test(s)) return 'Стационар';
  if (/inbody|sudoscan|cardio_dia|мониторинг|диагностик/.test(s)) return 'Функциональная диагностика';
  if (/детск|child/.test(s)) return 'Interna KIDS';
  return 'Приём врача';
};
const ICON = { 'Эндоскопические процедуры': 'biotech', 'УЗИ': 'radiology', 'Стационар': 'local_hospital', 'Функциональная диагностика': 'monitor_heart', 'Interna KIDS': 'pediatrics', 'Приём врача': 'stethoscope' };
const out = {};
const redirects = [];
for (const s of mig) {
  if (s.redirectTo) { redirects.push([s.slug, RICH_MAP[s.redirectTo] ? `/service/${RICH_MAP[s.redirectTo]}` : `/uslugi/${s.redirectTo}`]); continue; }
  if (RICH_MAP[s.slug]) { redirects.push([s.slug, `/service/${RICH_MAP[s.slug]}`]); continue; }
  const h1 = s.h1 || s.title.split(/[|•·—-]/)[0].trim();
  const cat = CAT(s.slug, h1);
  // первые абзацы — лид, остальное — текст; убираем повторяющиеся служебные строки
  const paras = s.paragraphs.filter((p) => !/записаться|телефон|\+7 7|адрес|Богенбай/i.test(p) || p.length > 200);
  out[s.slug] = { t: h1.replace(/\s+в Алматы$/i, ''), h1, cat, icon: ICON[cat], title: s.title, description: s.description, lead: paras[0] || s.description, paragraphs: paras.slice(1), words: s.words, src: s.url, thin: s.words < 100 };
}
writeFileSync('src/data/services_extra.json', JSON.stringify(out, null, 2));
writeFileSync('src/data/redirects.json', JSON.stringify(redirects, null, 2));
const thin = Object.values(out).filter((o) => o.thin).length;
console.log(`services_extra: ${Object.keys(out).length} страниц (${thin} без текста), redirects: ${redirects.length}`);

/* ───────── ПРАЙС: content/migrated/prices-raw.json (Tilda store API) → src/data/prices.json ───────── */
try {
  const raw = JSON.parse(readFileSync('content/migrated/prices-raw.json', 'utf8'));
  const parts = Object.fromEntries((raw.parts || []).map((p) => [String(p.uid), p.title]));
  const fmt = (v) => { const n = Math.round(parseFloat(v)); return isNaN(n) || n <= 0 ? 'по запросу' : n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸'; };
  const clean = (t) => (t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  parts['321033818221'] = 'УЗИ'; parts['616401882951'] = 'Врачи';
  // группировка частей каталога в разделы прайса
  const GROUP = (titles) => {
    const t = titles.join(' | ');
    if (/Врачи|Новый чекап|Специалисты Kids/.test(t)) return null; // карточки врачей — не позиции прайса
    if (/Kids|Детск/i.test(t)) return 'Interna KIDS';
    if (/анализ/i.test(t)) return 'Анализы';
    if (/УЗДГ|УЗИ/.test(t)) return 'УЗИ и УЗДГ';
    if (/Эндоскоп|Биопсия/.test(t)) return 'Эндоскопия';
    if (/Функциональн|Кардиодиагностика|Inbody|Sudoscan/.test(t)) return 'Функциональная диагностика';
    if (/Стационар/.test(t)) return 'Стационар';
    if (/Процедурн/.test(t)) return 'Процедурный кабинет';
    if (/Хирург|Колопрокт/.test(t)) return 'Хирургия и проктология';
    if (/ОСМС/.test(t)) return 'ОСМС и бесплатные программы';
    if (/Гастро|Гепат|Эндокрин|Аллерг|Психо|Кардиолог|Дермат|Диетолог|Гематолог|Гинеколог|Инфекц|Невро|Нефро|Паразит|Терапевт|Уролог|Ревмат/.test(t)) return 'Приёмы врачей';
    if (/Check|Чек/.test(t)) return 'Check-up';
    return titles[0] || 'Комплексы «Приём + обследование»';
  };
  const prices = {}; const docPrice = {};
  for (const p of raw.products || []) {
    let ids = []; try { ids = JSON.parse(p.partuids || '[]').map(String); } catch { ids = []; }
    const titles = ids.map((i) => parts[i]).filter(Boolean).filter((c) => !/акци/i.test(c));
    if (ids.includes('616401882951') || titles.includes('Новый чекап') || titles.includes('Специалисты Kids')) { if (p.price) docPrice[clean(p.title)] = fmt(p.price); continue; }
    const cat = ids.length ? GROUP(titles) : 'Комплексы «Приём + обследование»';
    if (!cat) continue;
    const sub = clean(p.descr) || clean(p.text).slice(0, 80);
    (prices[cat] ||= []).push([clean(p.title), sub, fmt(p.price), p.priceold ? fmt(p.priceold) : '']);
  }
  const ORDER = ['Приёмы врачей', 'Комплексы «Приём + обследование»', 'Эндоскопия', 'УЗИ и УЗДГ', 'Функциональная диагностика', 'Анализы', 'Check-up', 'Стационар', 'Процедурный кабинет', 'Хирургия и проктология', 'Interna KIDS', 'ОСМС и бесплатные программы'];
  const ordered = {};
  for (const k of [...ORDER, ...Object.keys(prices)]) if (prices[k] && !ordered[k]) ordered[k] = prices[k].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
  writeFileSync('src/data/prices.json', JSON.stringify(ordered, null, 2));
  console.log(`prices: ${Object.values(ordered).reduce((a, v) => a + v.length, 0)} позиций в ${Object.keys(ordered).length} разделах: ${Object.keys(ordered).join(', ')}`);
  // цены приёмов врачей — в карточки врачей
  const docs = JSON.parse(readFileSync('src/data/doctors.json', 'utf8'));
  let upd = 0;
  for (const d of docs) { const k = Object.keys(docPrice).find((n) => n.toLowerCase().startsWith(d.n.toLowerCase().split(' ').slice(0, 2).join(' '))); if (k) { d.price = docPrice[k]; upd++; } }
  writeFileSync('src/data/doctors.json', JSON.stringify(docs, null, 2));
  console.log(`цены приёма проставлены ${upd} врачам из каталога`);
} catch (e) { console.log('prices: пропущено —', e.message); }
