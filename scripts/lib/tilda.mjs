/**
 * Общий разбор страниц Tilda (Zero-блоки T396 и обычные блоки) → структурированный body.
 * Используется скриптами переноса: услуги, подготовка, check-up, оферта.
 */
import fs from 'node:fs';
import { parse } from 'parse5';

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


/** Фрагменты по блокам страницы */
export function pageFragments(file) { return recs(parse(fs.readFileSync(file, 'utf8'))).map(fragments); }

/** Частотность текстов по набору файлов — что встречается на ≥ min страницах, считаем шапкой/подвалом */
export function boilerplate(files, min = 4) {
  const freq = new Map();
  for (const f of files) { const seen = new Set(); for (const r of pageFragments(f)) for (const x of r) { const k = x.text.toLowerCase(); if (!seen.has(k)) { seen.add(k); freq.set(k, (freq.get(k) || 0) + 1); } } }
  return (t) => (freq.get(t.toLowerCase()) || 0) >= min;
}

/** Сборка чистого body из фрагментов: заголовки, абзацы, списки, файлы */
export function buildBody(frs, { isBoiler = () => false, h1 = '' } = {}) {
  const body = []; let list = null;
  const flush = () => { if (list) { body.push([list.kind, list.items]); list = null; } };
  const H1 = norm(h1).toLowerCase();
  for (const r of frs) {
    const items = r.filter((x) => !isBoiler(x.text) && !/^https?:\/\//.test(x.text) && !/^\d{2}:\d{2}$/.test(x.text) && !/^(interna clinic|interna kids)$/i.test(x.text));
    const words = items.reduce((n, x) => n + x.text.split(' ').length, 0);
    if (words < 3) continue;
    for (const x of items) {
      if (x.kind === 'ul' || x.kind === 'ol') { if (!list || list.kind !== x.kind) { flush(); list = { kind: x.kind, items: [] }; } list.items.push(x.text.replace(/;$/, '')); continue; }
      flush();
      if (x.kind === 'h1') { if (x.text.toLowerCase() !== H1) body.push(['h', x.text]); continue; }
      if (x.kind === 'file') { body.push(['file', x.text, x.href.startsWith('http') ? x.href : `https://internaclinic.kz${x.href}`]); continue; }
      const w = x.text.split(' ').length;
      const caps = x.text === x.text.toUpperCase() && w <= 8 && /[А-ЯЁ]{4}/.test(x.text);
      const question = /\?$/.test(x.text) && w <= 10;
      const headingLike = x.kind === 'h' || caps || question || /^\d+-й этап$/i.test(x.text) || /^[А-ЯЁ]{3,}\s*\(/.test(x.text)
        || (x.text.length <= 80 && /^[А-ЯЁA-Z«"]/.test(x.text) && !/^\(/.test(x.text) && (/:$/.test(x.text) ? w <= 12 : (w <= 6 && !/[.!?…;,]$/.test(x.text))));
      if (/_{4,}/.test(x.text)) continue;
      body.push([headingLike ? (x.kind === 'h' || caps ? 'h' : 'h3') : 'p', caps ? x.text.charAt(0) + x.text.slice(1).toLowerCase() : x.text]);
    }
    flush();
  }
  flush();
  const seen = new Set();
  return body.map((b) => (b[0] === 'p' && /^от [\d.\s]+$/.test(b[1]) ? ['p', 'Стоимость: от ' + b[1].replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+$)/g, ' ') + ' тг.'] : b))
    .filter((b, i, arr) => !(i > 0 && arr[i - 1][0] === b[0] && JSON.stringify(arr[i - 1][1]) === JSON.stringify(b[1])))
    .filter((b) => { if (b[0] !== 'p' || b[1].length < 60) return true; if (seen.has(b[1])) return false; seen.add(b[1]); return true; });
}
export const words = (body) => body.reduce((n, b) => n + (Array.isArray(b[1]) ? b[1].join(' ') : String(b[1])).split(/\s+/).length, 0);
export { norm };

/** Текст карточки каталога Tilda (поле text: строки через <br>, <strong>Заголовок:</strong>, «•» списки) → body */
export function textToBody(html) {
  const dec = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const paras = dec(html).split(/(?:<br\s*\/?>\s*){2,}/i).map((p) => p.trim()).filter(Boolean);
  const body = [];
  for (const raw of paras) {
    const lines = raw.split(/<br\s*\/?>/i).map((l) => l.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!lines.length) continue;
    // после строки с двоеточием несколько строк через <br> — это перечень, даже если строки длинные
    const prev = body[body.length - 1];
    if (lines.length >= 3 && prev && prev[0] === 'p' && /:$/.test(prev[1])) { body.push(['ul', lines.map((l) => l.replace(/^[•\-–—]\s*/, ''))]); continue; }
    const onlyStrong = /^<strong>[^<]*<\/strong>\s*$/i.test(raw.trim());
    if (onlyStrong || (lines.length === 1 && /^[^.!?]{3,70}:$/.test(lines[0]))) { body.push(['h3', lines[0].replace(/:$/, '')]); continue; }
    const bullets = lines.filter((l) => /^[•\-–—]\s*/.test(l));
    if (bullets.length && bullets.length >= lines.length - 1) {
      const head = lines.find((l) => !/^[•\-–—]\s*/.test(l)); if (head) body.push([/:$/.test(head) ? 'h3' : 'p', head.replace(/:$/, '')]);
      body.push(['ul', bullets.map((l) => l.replace(/^[•\-–—]\s*/, ''))]); continue;
    }
    // строки одного абзаца без маркеров — если коротких много, это список (образование, курсы); первая строка с «:»/«?» — заголовок
    if (lines.length >= 3 && lines.slice(1).every((l) => l.length < 110)) {
      const [first, ...rest] = lines;
      if (/[:?]$/.test(first) || first.length > 110) { body.push([/\?$/.test(first) ? 'h3' : 'p', first]); body.push(['ul', rest]); } else body.push(['ul', lines]);
      continue;
    }
    const joined = lines.join(' ');
    // перечисление через «;» внутри одного абзаца — список
    const parts = joined.split(/;\s*/).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 3 && parts.every((x) => x.length < 160)) { body.push(['ul', parts.map((x) => x.replace(/\.$/, ''))]); continue; }
    if (joined.split(' ').length <= 9 && /\?$/.test(joined)) { body.push(['h3', joined]); continue; }   // короткий вопрос — подзаголовок
    body.push(['p', joined]);
  }
  return body;
}
