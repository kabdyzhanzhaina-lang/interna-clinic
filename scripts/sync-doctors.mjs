/**
 * Сверка врачей со старым сайтом: каталог /interna_team (storepart 616401882951) и детский /kids (371954388204).
 *   content/migrated/doctors-live.json, doctors-live-kids.json — выгрузка store.tildaapi.pro/api/getproductslist
 * Стаж, регалии, теги и короткое описание — только из профиля врача на старом сайте, без оценок и шаблонов.
 * Врачи, которых нет в doctors.json, добавляются с фото и биографией; скрытые врачи со старого сайта показываются.
 * Цена приёма — только из прайса клиники: строка с этим врачом, иначе общий приём по его специальности; иначе «по запросу».
 * Запуск: node scripts/sync-doctors.mjs
 */
import fs from 'node:fs';
import sharp from 'sharp';
import { bioToBody } from './lib/tilda.mjs';

const M = 'content/migrated/';
const adult = JSON.parse(fs.readFileSync(M + 'doctors-live.json', 'utf8')).products;
const kids = JSON.parse(fs.readFileSync(M + 'doctors-live-kids.json', 'utf8')).products;
const file = JSON.parse(fs.readFileSync('src/data/doctors.json', 'utf8'));
const docs = file.items;
const prices = JSON.parse(fs.readFileSync('src/data/prices.json', 'utf8'));

const fold = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[қәңұүіөһғ]/g, (c) => 'канууиохг'['қәңұүіөһғ'.indexOf(c)]);
const key = (s) => fold(s).replace(/[^а-яa-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
const plain = (h) => (h || '').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, ' | ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;|﻿/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const live = new Map();
for (const p of adult) live.set(key(p.title), { p, kids: false });
for (const p of kids) { const k = key(p.title); if (live.has(k)) live.get(k).kids = true; else live.set(k, { p, kids: true }); }

/** Факты из профиля: стаж, степень, звание, категория — только явные формулировки (именительный падеж, без «руководитель — профессор Х.») */
function facts(p) {
  const t = plain(p.text);
  const descr = plain(p.descr).replace(/[\s|]+$/, '').replace(/заведующая стационара/i, 'заведующая стационаром');
  const all = [...t.matchAll(/(?:стаж|опыт работы)[^.|\d]{0,40}?(более\s+)?(\d{1,2})\s*(лет|года?)/gi)];
  const m = all.find((x) => /специальност/i.test(x[0])) || all[0]; // «стаж по специальности 7 лет» важнее «общего стажа 15 лет»
  const exp = m ? `${m[1] ? 'более ' : ''}${m[2]} ${m[3].toLowerCase()}` : '';
  const assoc = /ассоциированн[а-я]* профессор/i.test(t);
  const prof = assoc || [...t.matchAll(/(?<![а-яё])профессор(?![а-яё])/gi)].some((x) => !/^\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ]\./.test(t.slice(x.index + 9))); // не «руководитель — профессор Дуйсенова А.»
  return {
    exp,
    descr,
    dmn: /доктор медицинских наук|д\.\s?м\.\s?н\./i.test(t),
    kmn: /кандидат медицинских наук|к\.\s?м\.\s?н\./i.test(t),
    prof, assoc,
    docent: /(?<![а-я])доцент(?![а-я])/i.test(t),
    top: /высшей категории/i.test(t),
  };
}

/** «Врач - гастроэнтеролог, гепатолог» → «Врач-гастроэнтеролог, гепатолог» (для описания) и «Гастроэнтеролог, гепатолог» (должность) */
const descrSentence = (d) => d.replace(/\s*[-–]\s*/g, '-').replace(/^врач[\s-]+(?!ультразвук)/i, 'Врач-').replace(/\.$/, '');
const roleOf = (d) => (/^врач ультразвук/i.test(d) ? d : cap(d.replace(/^врач[\s-–]+/i, '').replace(/\s+[-–]\s+/g, '-')));

function bioOf(f) {
  const parts = [descrSentence(f.descr) + '.'];
  const deg = [f.dmn ? 'доктор медицинских наук' : f.kmn ? 'кандидат медицинских наук' : '', f.assoc ? 'ассоциированный профессор' : f.prof ? 'профессор' : '', f.docent ? 'доцент' : ''].filter(Boolean);
  if (deg.length) parts.push(cap(deg.join(', ')) + '.');
  if (f.top) parts.push('Врач высшей категории.');
  if (f.exp) parts.push(`Стаж ${f.exp}.`);
  return parts.join(' ');
}

function tagsOf(f, isKids) {
  const t = [];
  if (/главный врач/i.test(f.descr)) t.push('главный врач');
  if (/заведующ/i.test(f.descr)) t.push('заведующая стационаром');
  if (f.dmn) t.push('д.м.н.'); else if (f.kmn) t.push('к.м.н.');
  if (f.prof) t.push(f.assoc ? 'ассоц. профессор' : 'профессор');
  if (f.docent) t.push('доцент');
  if (f.top) t.push('высшая категория');
  if (isKids) t.push('Interna KIDS');
  return t.slice(0, 4);
}

/** Общий приём по специальности из прайса: первая специальность в должности → строка «Прием …» без имени врача в названии */
const GENERIC = [[/^детский гастроэнтеролог/, 'Прием детского гастроэнтеролога'], [/^педиатр/, 'Прием педиатра'], [/^детский эндокринолог/, 'Прием детского эндокринолога'], [/^эндокринолог/, 'Прием взрослого эндокринолога'], [/^гастроэнтеролог/, 'Прием гастроэнтеролога'], [/^эндоскопист|^врач-эндоскопист/, 'Консультация эндоскописта'], [/^кардиолог/, 'Прием кардиолога'], [/^нефролог/, 'Прием нефролога'], [/^ревматолог/, 'Прием ревматолога'], [/^уролог/, 'Прием уролога'], [/^гинеколог/, 'Прием гинеколога'], [/^дерматолог/, 'Прием дерматолога'], [/^аллерголог/, 'Прием аллерголога/терапевта'], [/^невропатолог/, 'Прием невропатолога'], [/^гематолог/, 'Прием гематолога']];
function genericPrice(role) {
  const r = role.toLowerCase().split(/[,·]/)[0].trim();
  const g = GENERIC.find(([re]) => re.test(r));
  if (!g) return '';
  for (const rows of Object.values(prices)) for (const x of rows) if (x[0] === g[1] && /\d/.test(x[2])) return x[2];
  return '';
}

/** Строка прайса с этим врачом (кроме повторного приёма): полное ФИО в описании или «Фамилия И.» в названии */
function priceOf(n) {
  const [sur, name] = fold(n).split(' ');
  const ini = new RegExp(`(?<![а-я])${sur}\\s+${(name || '').slice(0, 1)}\\.`);
  for (const k of ['Приёмы врачей', 'Interna KIDS']) for (const r of prices[k] || []) {
    const s = fold(`${r[0]} ${r[1] || ''}`);
    if (!/повторн/.test(s) && (s.includes(`${sur} ${name}`) || ini.test(fold(r[0]))) && /\d/.test(r[2])) return r[2];
  }
  return '';
}

const slug = (url) => url.split('/').pop().replace(/^\d+-\d+-/, '');
let added = 0, shown = 0;
for (const [k, { p, kids: isKids }] of live) {
  const f = facts(p);
  let d = docs.find((x) => key(x.n) === k);
  if (!d) {
    const id = slug(p.url);
    const role = roleOf(f.descr);
    const src = (JSON.parse(p.gallery || '[]')[0] || {}).img;
    let img = '';
    if (src) {
      const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
      await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(`public/images/doctors/${id}.webp`);
      img = `doctors/${id}`;
    }
    d = { id, n: p.title.trim(), r: role, cat: /гастроэнтеролог/i.test(role) ? 'gastro' : 'other', img, exp: '', tags: [], bio: '', price: '', about: bioToBody(p.text, p.title) };
    if (isKids) Object.assign(d, { kids: true, kidsRole: role });
    docs.push(d);
    added++;
  }
  if (d.hidden) { delete d.hidden; shown++; }
  if (!d.r) d.r = roleOf(f.descr);
  const extra = [f.prof && !/профессор/i.test(d.r) ? (f.assoc ? 'ассоц. профессор' : 'профессор') : '', f.dmn && !/д\.м\.н/i.test(d.r) ? 'д.м.н.' : ''].filter(Boolean);
  if (extra.length) d.r = `${d.r.split(' · ')[0]} · ${[...extra, ...(d.r.split(' · ')[1] || '').split(', ').filter((x) => x && !extra.includes(x))].join(', ')}`;
  d.exp = f.exp;
  d.bio = bioOf(f);
  d.tags = tagsOf(f, d.kids);
  d.price = priceOf(d.n) || genericPrice(d.r); // только прайс клиники: цены старого сайта черновые (ТЗ, раздел «Цены»)
}
const gone = docs.filter((d) => !live.has(key(d.n)));
fs.writeFileSync('src/data/doctors.json', JSON.stringify(file, null, 1) + '\n');
console.log(`врачей на старом сайте ${live.size}, в doctors.json ${docs.length}: добавлено ${added}, снова показаны ${shown}, стаж указан у ${docs.filter((d) => d.exp).length}`);
if (gone.length) console.log('нет на старом сайте:', gone.map((d) => d.n).join(', '));
