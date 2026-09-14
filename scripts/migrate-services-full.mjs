/**
 * Полный перенос текстов страниц услуг со старого сайта (Tilda) → src/data/services_extra.json (поле body)
 *
 * Старые страницы — Zero-блоки (T396) с вложенным HTML: заголовки, абзацы, списки, ссылки на PDF.
 * Разбираем DOM через parse5 (зависимость Astro), идём по каждому блоку t-rec в порядке страницы,
 * выкидываем шапку/подвал/формы/каталог и «общие» тексты (встречаются на ≥ 4 страницах).
 *
 * Вход:  content/site-snapshot/services/<slug>.html
 * Выход: body = [['h', ...] | ['h3', ...] | ['p', ...] | ['ul', [...]] | ['ol', [...]] | ['file', label, url]]
 *
 * Запуск: node scripts/migrate-services-full.mjs
 */
import fs from 'node:fs';
import { parse } from 'parse5';

const DIR = 'content/site-snapshot/services';
const extraPath = 'src/data/services_extra.json';
const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));

// Новые услуги, которых не было в каталоге, но есть отдельные страницы на старом сайте
const NEW = {
  esg: { t: 'Эндоскопическая рукавная гастропластика', h1: 'Эндоскопическая рукавная гастропластика (ЭРГ)', cat: 'Эндоскопические процедуры', icon: 'medical_services' },
  baloon: { t: 'Баллонирование желудка', h1: 'Внутрижелудочный баллон', cat: 'Эндоскопические процедуры', icon: 'bubble_chart' },
};
for (const [slug, v] of Object.entries(NEW)) if (!extra[slug]) extra[slug] = { ...v, title: '', description: '', lead: '', paragraphs: [], words: 0, src: `https://internaclinic.kz/${slug}`, thin: true };

const attr = (n, name) => (n.attrs || []).find((a) => a.name === name)?.value || '';
const cls = (n) => attr(n, 'class');
const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const INLINE = new Set(['#text', 'strong', 'b', 'em', 'i', 'u', 'span', 'a', 'font', 'sup', 'sub', 'small', 'mark']);
const textOf = (n) => {
  if (n.nodeName === '#text') return n.value;
  if (n.nodeName === 'script' || n.nodeName === 'style' || n.nodeName === '#comment') return '';
  if (n.nodeName === 'br') return '\n';
  const inner = (n.childNodes || []).map(textOf).join('');
  return INLINE.has(n.nodeName) ? inner : '\n' + inner + '\n';   // блочный элемент — отдельная строка
};

// Блоки и элементы, которые точно не контент
const SKIP_CLS = /t280|t702|t-store|js-store|t-form|t-btn|tn-atom__button|t396__filter|t-popup|t-menu|t-share|t-sociallinks|t-feed|t706|t-submit|t-input|uc-footer|uc-header/;
const SKIP_TXT = /^(load more|подробнее|записаться|отправить|new|позвонить|поделиться ссылкой:?|все услуги →?|главная →?|смотреть все|скачать перечень|связаться|тг\.?|рассчитать|имт для (мужчин|женщин)( имт для (мужчин|женщин))?)$/i;
const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'li', 'ul', 'ol', 'div', 'section', 'article', 'blockquote', 'br', 'table', 'tr']);

/** Собираем плоский список фрагментов [{kind, text, href, fs}] из одного t-rec */
function fragments(rec) {
  const out = [];
  const push = (kind, text, meta = {}) => { const t = norm(text); if (t && /[А-Яа-яA-Za-z]/.test(t) && !SKIP_TXT.test(t)) out.push({ kind, text: t, ...meta }); };
  const walk = (n, ctx) => {
    if (n.nodeName === '#text' || n.nodeName === '#comment') return;
    const c = cls(n), tag = n.nodeName;
    if (SKIP_CLS.test(c) || tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'form') return;
    if (/^h[1-5]$/.test(tag)) return push(tag === 'h1' ? 'h1' : tag === 'h2' ? 'h' : 'h3', textOf(n));
    if (tag === 'li') return push(ctx.list || 'ul', textOf(n));
    if (tag === 'ul' || tag === 'ol') { (n.childNodes || []).forEach((k) => walk(k, { ...ctx, list: tag })); return; }
    if (tag === 'table') { // таблица → список строк «ячейка · ячейка»
      const rows = []; const collect = (m) => { if (m.nodeName === 'tr') rows.push(m); else (m.childNodes || []).forEach(collect); }; collect(n);
      for (const r of rows) { const cells = (r.childNodes || []).filter((c) => c.nodeName === 'td' || c.nodeName === 'th').map((c) => norm(textOf(c))).filter(Boolean); if (cells.length) push('ul', cells.join(' · ')); }
      return;
    }
    if (tag === 'a' && /\.pdf(\?|$)/i.test(attr(n, 'href'))) return push('file', textOf(n) || 'Скачать документ', { href: attr(n, 'href') });
    const kids = n.childNodes || [];
    const hasBlock = kids.some((k) => BLOCK.has(k.nodeName));
    // Листовой элемент с текстом: абзац или заголовок (по размеру шрифта Zero-блока)
    if (!hasBlock && ['p', 'div', 'span', 'strong', 'b', 'em', 'a', 'font'].includes(tag)) {
      const fsz = +(attr(n, 'data-field-fontsize-value') || attr(n.parentNode || {}, 'data-field-fontsize-value') || 0);
      const t = textOf(n);
      if (!norm(t)) return;
      const big = fsz >= 24 || /tn-atom/.test(c) && ctx.fontsize >= 24;
      return t.split(/\n\s*\n/).forEach((part) => push(big ? 'h' : 'p', part.replace(/\n/g, ' ')));
    }
    if (tag === 'p' && hasBlock) { // <p> с <br> внутри — делим на абзацы
      let buf = '';
      for (const k of kids) { if (k.nodeName === 'br') { const nx = kids[kids.indexOf(k) + 1]; if (nx && nx.nodeName === 'br') { push('p', buf); buf = ''; } else buf += ' '; } else if (BLOCK.has(k.nodeName)) { push('p', buf); buf = ''; walk(k, ctx); } else buf += textOf(k); }
      return push('p', buf);
    }
    const fsz = +attr(n, 'data-field-fontsize-value') || ctx.fontsize || 0;
    let buf = '';
    for (const k of kids) {
      if (k.nodeName === '#text' || !BLOCK.has(k.nodeName) && !['ul', 'ol'].includes(k.nodeName) && !(k.nodeName === 'a' && /\.pdf/i.test(attr(k, 'href'))) && !/^h[1-5]$/.test(k.nodeName)) {
        // инлайновый хвост внутри блока с блочными детьми
        if (k.nodeName === '#text' || ['strong', 'b', 'em', 'span', 'a', 'font', 'i', 'u'].includes(k.nodeName)) { buf += textOf(k); continue; }
      }
      if (k.nodeName === 'br') { const nx = kids[kids.indexOf(k) + 1]; if (nx && nx.nodeName === 'br') { push(fsz >= 24 ? 'h' : 'p', buf); buf = ''; } else buf += ' '; continue; }
      if (norm(buf)) { push(fsz >= 24 ? 'h' : 'p', buf); buf = ''; }
      walk(k, { ...ctx, fontsize: fsz });
    }
    if (norm(buf)) push(fsz >= 24 ? 'h' : 'p', buf);
  };
  walk(rec, { fontsize: 0 });
  return out;
}

function recs(doc) {
  const out = [];
  const walk = (n) => { if (n.nodeName !== '#text' && /(^| )t-rec( |$)/.test(cls(n)) && /^rec\d+/.test(attr(n, 'id'))) { out.push(n); return; } (n.childNodes || []).forEach(walk); };
  walk(doc); return out;
}

/* 1-й проход: фрагменты по страницам, частотность текста */
const pages = {}; const freq = new Map();
for (const slug of Object.keys(extra)) {
  const f = `${DIR}/${slug}.html`; if (!fs.existsSync(f)) { console.warn('нет снимка:', slug); continue; }
  const doc = parse(fs.readFileSync(f, 'utf8'));
  const frs = recs(doc).map(fragments);
  pages[slug] = frs;
  const seen = new Set(); for (const r of frs) for (const x of r) { const k = x.text.toLowerCase(); if (!seen.has(k)) { seen.add(k); freq.set(k, (freq.get(k) || 0) + 1); } }
}
const isBoiler = (t) => (freq.get(t.toLowerCase()) || 0) >= 4;

/* 2-й проход: чистим и собираем body */
const summary = [];
for (const [slug, frs] of Object.entries(pages)) {
  const s = extra[slug];
  const body = []; let list = null;
  const flush = () => { if (list) { body.push([list.kind, list.items]); list = null; } };
  const h1 = norm(s.h1 || s.t).toLowerCase();
  for (const r of frs) {
    const items = r.filter((x) => !isBoiler(x.text) && !/^https?:\/\//.test(x.text) && !/^\d{2}:\d{2}$/.test(x.text) && !/^(interna clinic|interna kids)$/i.test(x.text));
    const words = items.reduce((n, x) => n + x.text.split(' ').length, 0);
    if (words < 3) continue;
    for (const x of items) {
      if (x.kind === 'ul' || x.kind === 'ol') { if (!list || list.kind !== x.kind) { flush(); list = { kind: x.kind, items: [] }; } list.items.push(x.text.replace(/;$/, '')); continue; }
      flush();
      if (x.kind === 'h1') { if (x.text.toLowerCase() !== h1) body.push(['h', x.text]); continue; }
      if (x.kind === 'file') { body.push(['file', x.text, x.href.startsWith('http') ? x.href : `https://internaclinic.kz${x.href}`]); continue; }
      // короткая строка без точки на конце, за которой идёт текст — заголовок
      const w = x.text.split(' ').length;
      const caps = x.text === x.text.toUpperCase() && w <= 8 && /[А-ЯЁ]{4}/.test(x.text);   // «ЧТО ВХОДИТ В СТОИМОСТЬ?» — заголовок капсом
      const headingLike = x.kind === 'h' || caps || /^\d+-й этап$/i.test(x.text) || /^[А-ЯЁ]{3,}\s*\(/.test(x.text)
        || (x.text.length <= 80 && /^[А-ЯЁA-Z«"]/.test(x.text) && !/^\(/.test(x.text) && (/:$/.test(x.text) ? w <= 12 : (w <= 6 && !/[.!?…;,]$/.test(x.text))));
      if (/_{4,}/.test(x.text)) continue;   // строки-прочерки из бланка
      body.push([headingLike ? (x.kind === 'h' || caps ? 'h' : 'h3') : 'p', caps ? x.text.charAt(0) + x.text.slice(1).toLowerCase() : x.text]);
    }
    flush();
  }
  flush();
  // Убираем дубли, «заголовок» в самом конце без текста, повтор названия страницы
  const seen = new Set();
  const clean = body.map((b) => (b[0] === 'p' && /^от [\d.\s]+$/.test(b[1]) ? ['p', 'Стоимость: от ' + b[1].replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+$)/g, ' ') + ' тг.'] : b))
    .filter((b, i, arr) => !(i > 0 && arr[i - 1][0] === b[0] && JSON.stringify(arr[i - 1][1]) === JSON.stringify(b[1])))
    .filter((b) => { if (b[0] !== 'p' || b[1].length < 60) return true; if (seen.has(b[1])) return false; seen.add(b[1]); return true; })
    .filter((b, i, arr) => !((b[0] === 'h' || b[0] === 'h3') && (i === arr.length - 1 || arr[i + 1][0] === 'h' || arr[i + 1][0] === 'h3') && arr[i + 1]?.[0] !== 'ul' && arr[i + 1]?.[0] !== 'ol' && i === arr.length - 1));
  const wc = clean.reduce((n, b) => n + (Array.isArray(b[1]) ? b[1].join(' ') : b[1]).split(' ').length, 0);
  s.body = clean; s.words = wc; s.thin = wc < 120;
  if (!s.lead) s.lead = (clean.find((b) => b[0] === 'p') || [])[1]?.slice(0, 220) || '';
  if (!s.title) s.title = `${s.h1} в Алматы — Interna Clinic`;
  if (!s.description) s.description = s.lead;
  summary.push([slug, wc, clean.filter((b) => b[0] === 'h' || b[0] === 'h3').length, clean.filter((b) => b[0] === 'ul' || b[0] === 'ol').length]);
}
fs.writeFileSync(extraPath, JSON.stringify(extra, null, 1) + '\n');
summary.sort((a, b) => a[1] - b[1]);
for (const [slug, wc, h, l] of summary) console.log(`${String(wc).padStart(5)} слов  ${String(h).padStart(2)} заг  ${String(l).padStart(2)} списков  ${slug}`);
console.log('итого страниц:', summary.length, '| тонких (<120 слов):', summary.filter((x) => x[1] < 120).length);
