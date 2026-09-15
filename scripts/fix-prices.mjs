/**
 * Перегруппировка прайса: все приёмы и консультации врачей — в раздел «Приёмы врачей»
 * (в каталоге Tilda они лежали в разделе комплексов). Идемпотентно. Запуск: node scripts/fix-prices.mjs
 */
import fs from 'node:fs';
const prices = JSON.parse(fs.readFileSync('src/data/prices.json', 'utf8'));
const isVisit = (t) => /^(при[её]м|консультация|первичн\S* при[её]м|повторн\S* при[её]м)\s/i.test(t) && !/\+/.test(t);   // \b не работает с кириллицей
let moved = 0;
for (const k of Object.keys(prices)) {
  if (k === 'Приёмы врачей') continue;
  const stay = [], go = [];
  for (const r of prices[k]) (isVisit(r[0]) ? go : stay).push(r);
  if (go.length) { prices['Приёмы врачей'] = [...(prices['Приёмы врачей'] || []), ...go]; prices[k] = stay; moved += go.length; }
  if (!prices[k].length) delete prices[k];
}
prices['Приёмы врачей'].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
const ORDER = ['Приёмы врачей', 'Комплексы «Приём + обследование»', 'Эндоскопия', 'УЗИ и УЗДГ', 'Функциональная диагностика', 'Анализы', 'Check-up', 'Стационар', 'Процедурный кабинет', 'Хирургия и проктология', 'Interna KIDS', 'ОСМС и бесплатные программы'];
const out = {}; for (const k of [...ORDER, ...Object.keys(prices)]) if (prices[k] && !out[k]) out[k] = prices[k];
fs.writeFileSync('src/data/prices.json', JSON.stringify(out, null, 2) + '\n');
console.log(`перенесено в «Приёмы врачей»: ${moved}; разделы: ${Object.entries(out).map(([k, v]) => k + ' ' + v.length).join(' | ')}`);
