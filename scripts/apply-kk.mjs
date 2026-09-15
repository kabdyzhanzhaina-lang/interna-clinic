/**
 * Казахская версия после сборки: для dist/kk/**\/*.html
 *   1) внутренние ссылки получают префикс /kk (ассеты, /admin, /api — нет),
 *   2) текст переводится по словарю src/i18n/kk.json (точное совпадение текстового узла или атрибута),
 *   3) непереведённые строки складываются в .i18n-todo.json — по нему пополняется словарь.
 *
 * Запуск: node scripts/apply-kk.mjs   (в npm run build — до apply-base)
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize } from 'parse5';

const dict = JSON.parse(fs.readFileSync('src/i18n/kk.json', 'utf8'));
const ROOT = 'dist/kk';
if (!fs.existsSync(ROOT)) { console.log('[kk] dist/kk нет — пропускаем'); process.exit(0); }
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(ROOT).filter((f) => f.endsWith('.html'));

const ASSET = /^\/(kk\/|images\/|scripts\/|_astro\/|favicon|apple-touch|admin|api\/|sitemap|robots|#)/;
// на GitHub Pages Astro уже пишет ассеты с базовым префиксом (/interna-clinic/_astro/…) — их не трогаем
const BASE = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
const isBased = (v) => BASE && (v === BASE || v.startsWith(BASE + '/'));
const TEXT_ATTRS = new Set(['alt', 'placeholder', 'aria-label', 'title', 'data-words', 'data-title', 'data-text', 'data-svc', 'data-fmt', 'label']);
const SKIP = new Set(['script', 'style', 'noscript']);
const todo = new Map();

const tr = (raw, page) => {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t || !/[А-Яа-яЁё]/.test(t)) return raw;
  if (dict[t] != null) return raw.replace(t, dict[t]).replace(raw.trim(), dict[t]);
  // правила для чисел: цены «от 20 000 ₸», стаж «12 лет», «5 мин чтения», «практика с 2016»
  const rule = t.replace(/^от ([\d\s]+) ₸$/, '$1 ₸-ден').replace(/^(\d+) лет$/, '$1 жыл').replace(/^(\d+) мин чтения$/, '$1 мин оқу').replace(/^(\d+) мин видео$/, '$1 мин видео').replace(/^практика с (\d{4})$/, '$1 жылдан бері тәжірибе').replace(/^(\d+) исследований и консультаций$/, '$1 тексеру және консультация').replace(/^и ещё (\d+) — в полном составе ниже$/, 'және тағы $1 — толық құрамы төменде').replace(/^(\d+) позиций$/, '$1 позиция').replace(/^(\d+) вопросов$/, '$1 сұрақ').replace(/^(\d+) памяток$/, '$1 жадынама').replace(/^(\d+) услуг$/, '$1 қызмет').replace(/^(\d+) детских$/, '$1 балалар').replace(/^(\d+) отзывов$/, '$1 пікір').replace(/^(\d+) акция$/, '$1 акция').replace(/^(\d+) услуги по ОСМС$/, 'МӘМС бойынша $1 қызмет').replace(/^(\d+) специалистов$/, '$1 маман').replace(/^(\d+) позиций$/, '$1 позиция').replace(/^Стоимость: от ([\d\s]+) тг\.$/, 'Бағасы: $1 тг-ден').replace(/^\(Опыт - более (\d+) (лет|года?)\)$/, '(Тәжірибесі $1 жылдан астам)').replace(/\(Опыт - более (\d+) (лет|года?)\)/, '(тәжірибесі $1 жылдан астам)').replace(/Общий медицинский стаж: (\d+) (лет|года?)/, 'Жалпы медициналық тәжірибесі: $1 жыл');
  if (rule !== t) return raw.replace(t, rule);
  // «слово|слово» для typewriter
  if (t.includes('|') && t.split('|').every((w) => dict[w.trim()] != null)) return t.split('|').map((w) => dict[w.trim()]).join('|');
  if (t.length < 600) { const e = todo.get(t) || { n: 0, pages: new Set() }; e.n++; e.pages.add(page); todo.set(t, e); }
  return raw;
};

let translated = 0, links = 0;
for (const f of files) {
  const page = path.relative(ROOT, f).replace(/\/index\.html$/, '') || '/';
  const doc = parse(fs.readFileSync(f, 'utf8'));
  const w = (n) => {
    if (n.nodeName === '#text') { const v = tr(n.value, page); if (v !== n.value) translated++; n.value = v; return; }
    if (SKIP.has(n.nodeName)) { return; }
    if (n.nodeName === 'html') { const l = n.attrs.find((a) => a.name === 'lang'); if (l) l.value = 'kk'; }
    for (const a of n.attrs || []) {
      if ((a.name === 'href' || a.name === 'action') && a.value.startsWith('/') && !ASSET.test(a.value) && !isBased(a.value) && !n.attrs.some((x) => x.name === 'data-lang-switch')) { a.value = '/kk' + (a.value === '/' ? '/' : a.value); links++; }
      if (TEXT_ATTRS.has(a.name) || (a.name === 'content' && n.nodeName === 'meta' && n.attrs.some((x) => x.name === 'name' && x.value === 'description' || x.name === 'property' && /^og:(title|description)$/.test(x.value)))) { const v = tr(a.value, page); if (v !== a.value) translated++; a.value = v; }
    }
    (n.childNodes || []).forEach(w);
    if (n.content) w(n.content);
  };
  w(doc);
  fs.writeFileSync(f, serialize(doc));
}
const todoArr = [...todo.entries()].sort((a, b) => b[1].n - a[1].n).map(([t, e]) => ({ t, n: e.n, pages: [...e.pages].slice(0, 3) }));
fs.writeFileSync('.i18n-todo.json', JSON.stringify(todoArr, null, 1));
console.log(`[kk] страниц ${files.length}, переведено узлов ${translated}, ссылок с префиксом ${links}, без перевода: ${todoArr.length} строк (см. .i18n-todo.json)`);
