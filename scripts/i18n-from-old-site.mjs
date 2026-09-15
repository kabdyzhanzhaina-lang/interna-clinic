/**
 * Казахские тексты со старого сайта → словарь src/i18n/kk.json (русский текст → казахский).
 * Выравнивание: FAQ по порядку вопросов, отзывы по автору, оферта по номерам пунктов,
 * (страницы с иной структурой блоков переводятся вручную).
 *
 * Запуск: node scripts/i18n-from-old-site.mjs   (идемпотентно, дописывает словарь)
 */
import fs from 'node:fs';
import { pageFragments, boilerplate, buildBody } from './lib/tilda.mjs';

const KAZ = 'content/site-snapshot/kaz/';
const dictPath = 'src/i18n/kk.json';
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
let added = 0;
const put = (ru, kk) => { ru = (ru || '').replace(/\s+/g, ' ').trim(); kk = (kk || '').replace(/\s+/g, ' ').trim(); if (!ru || !kk || ru === kk || dict[ru] || !/[әіңғүұқөһ]/i.test(kk)) return; dict[ru] = kk; added++; };
const isBoiler = boilerplate(fs.readdirSync(KAZ).map((f) => KAZ + f), 5);
const body = (f) => buildBody(pageFragments(f), { isBoiler });
const flat = (b) => b.flatMap((x) => (Array.isArray(x[1]) ? x[1].map((v) => [x[0] === 'ol' ? 'li' : 'li', v]) : [[x[0], x[1]]]));

/** Выравнивание двух списков блоков: одинаковый тип подряд → пара. Прерываемся при расхождении типов. */
function alignBlocks(ru, kk, label) {
  const a = flat(ru), b = flat(kk); let i = 0, j = 0, pairs = 0;
  while (i < a.length && j < b.length) {
    const ta = a[i][0] === 'h3' || a[i][0] === 'h' ? 'h' : a[i][0], tb = b[j][0] === 'h3' || b[j][0] === 'h' ? 'h' : b[j][0];
    if (ta === tb) { put(a[i][1], b[j][1]); pairs++; i++; j++; }
    else if (a.length - i > b.length - j) i++; else j++;   // пропускаем лишний блок у более длинной стороны
  }
  console.log(`  ${label}: ru ${a.length} / kk ${b.length} блоков → пар ${pairs}`);
}

/* FAQ — по порядку */
{
  const ru = JSON.parse(fs.readFileSync('src/data/faq.json', 'utf8')).items;
  const kk = body(KAZ + 'faq_kaz.html'); const qs = []; let cur = null;
  for (const x of kk) { if (x[0] === 'h3') { cur = { q: x[1], a: [] }; qs.push(cur); } else if ((x[0] === 'ul' || x[0] === 'p') && cur) cur.a.push(...(Array.isArray(x[1]) ? x[1] : [x[1]])); }
  ru.forEach((q, i) => { const k = qs[i]; if (!k) return; put(q.q, k.q); const ka = k.a; [...q.a, ...(q.list || [])].forEach((line, n) => put(line, ka[n])); });
  console.log(`  FAQ: ${qs.length} вопросов`);
}
/* Отзывы — по автору (казахская главная) */
{
  const ru = JSON.parse(fs.readFileSync('src/data/reviews.json', 'utf8')).items;
  const kk = body(KAZ + 'kaz.html'); const map = {}; let name = null;
  for (const x of kk) { if (x[0] === 'h3' || (x[0] === 'p' && /^[A-Za-z_.]+$/.test(x[1]))) name = x[1]; else if (x[0] === 'p' && name && !/^\(/.test(x[1]) && x[1].length > 30) { map[name] = x[1]; name = null; } }
  let n = 0; for (const r of ru) if (map[r.name]) { put(r.text, map[r.name].replace(/^[«"]|[»"]$/g, '')); n++; }
  console.log(`  отзывы: ${n}/${ru.length}`);
}
/* Оферта — по номерам пунктов (казахская часть той же страницы) */
{
  const legal = JSON.parse(fs.readFileSync('src/data/legal.json', 'utf8'));
  const all = body('content/site-snapshot/p_oferta.html');
  const kkPart = all.slice(0, all.findIndex((x) => /^Договор открытой/i.test(x[1])));
  const num = (t) => (t.match(/^(\d{1,2}(?:\.\d{1,2})*)\.?\s/) || [])[1];
  const kkByNum = {}; for (const x of kkPart) { const n = num(x[1]); if (n) kkByNum[n] = x[1]; }
  // казахские подпункты склеены в один абзац — режем по номерам
  for (const x of kkPart) for (const m of x[1].matchAll(/(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.\s([^]*?)(?=\s\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.\s|$)/g)) kkByNum[m[1]] = `${m[1]}. ${m[2].trim()}`;
  let n = 0; for (const x of legal.oferta.body) { const k = num(x[1]); if (k && kkByNum[k]) { put(x[1], kkByNum[k]); n++; } }
  put(legal.oferta.title, 'Ақылы медициналық қызмет көрсетуге ашық (жария) оферта шарты');
  console.log(`  оферта: пунктов ${n}/${legal.oferta.body.length}`);
}
/* Выравнивание страниц по последовательности блоков давало ложные пары — эти тексты переводятся вручную (см. src/i18n/kk.json) */
fs.writeFileSync(dictPath, JSON.stringify(dict, null, 1) + '\n');
console.log(`словарь: +${added}, всего ${Object.keys(dict).length}`);
