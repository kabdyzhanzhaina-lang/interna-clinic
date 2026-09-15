/**
 * Перенос со старого сайта: FAQ, оборудование (с фото), отзывы.
 *   /faq      → src/data/faq.json        [{ q, a: [...] }]
 *   /equip    → src/data/equipment.json  [{ id, name, type, desc, img }] + public/images/equip/<id>.jpg
 *   /feedback → src/data/reviews.json    [{ name, src, text }]
 *
 * Запуск: node scripts/migrate-extras.mjs
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pageFragments, boilerplate, buildBody } from './lib/tilda.mjs';

const SNAP = 'content/site-snapshot/';
const all = [...fs.readdirSync(SNAP + 'services').map((f) => SNAP + 'services/' + f), ...fs.readdirSync(SNAP + 'other').map((f) => SNAP + 'other/' + f), SNAP + 'p_faq.html', SNAP + 'p_equip.html'];
const isBoiler = boilerplate(all, 5);
const body = (f) => buildBody(pageFragments(f), { isBoiler });
const dec = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* ───────── 1. FAQ: вопрос — абзац, ответ — список ───────── */
{
  const b = body(SNAP + 'p_faq.html');
  const faq = []; let cur = null;
  for (const x of b) {
    if (x[0] === 'h') continue;
    if (x[0] === 'p') { if (/^Это лишь некоторые/i.test(x[1])) break; cur = { q: x[1], a: [] }; faq.push(cur); continue; }
    if ((x[0] === 'ul' || x[0] === 'ol') && cur) {
      // «Какие обследования необходимы до приёма» — список «Врач — обследования», остальное — абзацы
      if (x[1].length > 2 && x[1].every((t) => /\s[-–—]\s/.test(t))) cur.list = x[1]; else cur.a.push(...x[1]);
    }
  }
  fs.writeFileSync('src/data/faq.json', JSON.stringify(faq, null, 1) + '\n');
  console.log(`faq: ${faq.length} вопросов`);
}

/* ───────── 2. Оборудование: карточки T509 + фото ───────── */
{
  const html = fs.readFileSync(SNAP + 'p_equip.html', 'utf8').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
  const i = html.indexOf('<div id="rec670231498"'); const j = html.indexOf('<div id="rec', i + 50); const seg = html.slice(i, j);
  // вводный текст — блок T468 над карточками
  const ii = html.indexOf('<div id="rec661202098"'); const iseg = html.slice(ii, html.indexOf('<div id="rec', ii + 50));
  const intro = [...iseg.matchAll(/<div class="[^"]*t-descr[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => dec(m[1])).filter((t) => t.length > 40);
  const cards = [...seg.matchAll(/<div class="t509__textwrapper[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="t-card__descr[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
  const imgs = [...new Set([...seg.matchAll(/(?:data-original|src)=['"](https:\/\/static\.tildacdn\.(?:com|pro)\/[^'"]+\.(?:jpg|jpeg|png|webp))['"]/g)].map((m) => m[1]))];
  fs.mkdirSync('public/images/equip', { recursive: true });
  const TYPE = (name) => (/fibroscan/i.test(name) ? 'Гепатология' : /logiq|versana/i.test(name) ? 'УЗИ' : /evis/i.test(name) ? 'Эндоскопия' : /inbody|sudoscan/i.test(name) ? 'Функциональная диагностика' : 'Диагностика');
  const equipment = cards.map((m, k) => {
    const full = dec(m[1]); const name = full.replace(/\s*\(.*?\)\s*$/, ''); const kind = (full.match(/\((.*?)\)\s*$/) || [])[1] || '';
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const src = imgs[k]; const out = `public/images/equip/${id}.jpg`;
    if (src && !fs.existsSync(out)) {
      try {
        const tmp = `/tmp/equip-${id}.${src.split('.').pop()}`;
        execSync(`curl -sL -A "Mozilla/5.0" -o "${tmp}" "${src}"`);
        execSync(`sips -s format jpeg -s formatOptions 82 -Z 1400 "${tmp}" --out "${out}" >/dev/null 2>&1`);
      } catch (e) { console.warn('фото не скачалось:', name, e.message); }
    }
    return { id, name, kind, cat: TYPE(name), desc: dec(m[2]), img: fs.existsSync(out) ? `/images/equip/${id}.jpg` : '' };
  });
  fs.writeFileSync('src/data/equipment.json', JSON.stringify({ intro, items: equipment }, null, 1) + '\n');
  console.log(`equipment: ${equipment.length} аппаратов — ${equipment.map((e) => e.name + (e.img ? ' 📷' : ' (без фото)')).join(', ')}`);
}

/* ───────── 3. Отзывы: имя → (источник) → «текст» ───────── */
{
  const b = body(SNAP + 'other/feedback.html');
  const end = b.findIndex((x) => /^Оставьте ваш отзыв/i.test(x[1]));
  const part = b.slice(0, end > 0 ? end : undefined).filter((x) => x[0] !== 'ul' && !/^Отзывы с других ресурсов$/i.test(x[1]));
  const reviews = []; let cur = null;
  for (const x of part) {
    const t = x[1];
    if (/^\(.*\)$/.test(t)) { if (cur) cur.src = t.replace(/^\(|\)$/g, '').replace(/2Gis/i, '2ГИС').replace(/Богенбай батыра, 248/, 'Богенбай батыра 248'); continue; }
    if (/^[«"“]/.test(t)) { if (cur) cur.text = t.replace(/^[«"“]|[»"”]$/g, '').trim(); continue; }
    cur = { name: t, src: '', text: '' }; reviews.push(cur);
  }
  const clean = reviews.filter((r) => r.text && r.text.length > 20);
  fs.writeFileSync('src/data/reviews.json', JSON.stringify(clean, null, 1) + '\n');
  console.log(`reviews: ${clean.length} отзывов — ${clean.map((r) => r.name + ' (' + r.src + ')').join('; ')}`);
}
