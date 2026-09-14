/**
 * Перенос со старого сайта трёх разделов «Пациентам»:
 *   /prepare  → src/data/prepare.json   (памятки по подготовке + перечень к профессору Нерсесову)
 *   /checkup + 4 страницы направлений → src/data/checkups.json (5 программ с составом и ценами + профильные программы)
 *   /oferta + /rulse → src/data/legal.json (договор оферты и правила возврата денег, русская версия)
 *
 * Запуск: node scripts/migrate-pages.mjs
 */
import fs from 'node:fs';
import { pageFragments, boilerplate, buildBody, words } from './lib/tilda.mjs';

const SNAP = 'content/site-snapshot/';
const all = [...fs.readdirSync(SNAP + 'services').map((f) => SNAP + 'services/' + f), ...fs.readdirSync(SNAP + 'other').map((f) => SNAP + 'other/' + f), SNAP + 'p_prepare.html', SNAP + 'p_checkup.html', SNAP + 'p_oferta.html'];
const isBoiler = boilerplate(all, 5);
const body = (f) => buildBody(pageFragments(f), { isBoiler });
const slug = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const RU = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const tr = (s) => slug(s).replace(/[а-я]/g, (c) => RU[c] ?? c);

/* ───────────── 1. Подготовка ───────────── */
{
  const b = body(SNAP + 'p_prepare.html');
  const cut = b.findIndex((x) => /Перечень к Профессору Нерсесову/i.test(x[1]));
  const main = b.slice(0, cut), prof = b.slice(cut + 1);
  // секции по подзаголовкам «Перед …»
  const NOM = { 'колоноскопией': 'Колоноскопия', 'видеокапсульной эндоскопией': 'Видеокапсульная эндоскопия', 'Гастроскопией (ЭГДС/ФГДС)': 'Гастроскопия (ЭГДС/ФГДС)', 'анестезией': 'Анестезия и седация' };
  const sections = []; let cur = null;
  for (const x of main) {
    if (x[0] === 'h' || (x[0] === 'h3' && /^Перед|^Двухэтап/i.test(x[1]) && !/^Двухэтап/i.test(x[1]))) {
      if (x[0] === 'h' || /^Перечень перед/i.test(x[1])) continue;                 // общие заголовки страницы
      let title = x[1].replace(/^Перед проведением /i, '').replace(/^Перед /i, '').replace(/^диагностики на аппарате /i, '');
      title = NOM[title] || title;
      cur = { id: tr(title), title, body: [] };
      sections.push(cur); continue;
    }
    if (!cur) { if (x[0] === 'p' && /нажми сюда/i.test(x[1])) continue; continue; }
    cur.body.push(x);
  }
  // Списки к профессору: «Обязательный базовый» + «дополнительно, если …»
  const lists = []; let pl = null;
  for (const x of prof) {
    if (x[0] === 'p' && /^(Обязательный|Дополнительно)/i.test(x[1])) { pl = { title: x[1].replace(/\s*\(Данный перечень.*?\)\s*/i, '').trim(), items: [] }; lists.push(pl); continue; }
    if (x[0] === 'p' && /^\(Данный перечень/i.test(x[1])) continue;
    if ((x[0] === 'ul' || x[0] === 'ol') && pl) pl.items.push(...x[1]);
  }
  const out = { updated: '2026-09', sections, professor: { name: 'Нерсесов Александр Витальевич', doc: 'nersesov', lists } };
  fs.writeFileSync('src/data/prepare.json', JSON.stringify(out, null, 1) + '\n');
  console.log(`prepare: ${sections.length} памяток (${sections.map((s) => s.title).join(' · ')}), ${lists.length} перечней к профессору, ${words(b)} слов`);
}

/* ───────────── 2. Check-up ───────────── */
{
  const html = fs.readFileSync(SNAP + 'p_checkup.html', 'utf8');
  const recs = [...html.matchAll(/<div id="(rec\d+)"[^>]*>/g)].map((m, i, arr) => html.slice(m.index, arr[i + 1] ? arr[i + 1].index : undefined));
  const dec = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const elems = (rec) => [...rec.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').matchAll(/<div class=["']t396__elem tn-elem[^"']*["']([^>]*)>([\s\S]*?)(?=<div class=["']t396__elem|$)/g)].map((m) => {
    const g = (k) => +((m[1].match(new RegExp(`data-field-${k}-value="(-?[\\d.]+)"`)) || [])[1] || 0);
    const type = (m[1].match(/data-elem-type=["'](\w+)["']/) || [])[1];
    const img = (m[2].match(/data-original=['"]([^'"]+)['"]/) || [])[1] || '';
    return { top: g('top'), left: g('left'), type, text: dec(m[2]), icon: img.split('/').pop() };
  }).sort((a, b) => a.top - b.top || a.left - b.left);
  // мобильные блоки: по одному на программу, галочка list_bullet_1.svg = входит, Vector.svg = не входит
  const progRecs = recs.filter((r) => (r.match(/data-elem-type=["']text["']/g) || []).length >= 45 && (r.match(/data-elem-type=["']image["']/g) || []).length >= 40);
  const programs = progRecs.map((r) => {
    const els = elems(r);
    const col = els.filter((e) => e.type === 'text' && e.left >= -470 && e.left <= -440 && !/₸/.test(e.text));   // колонка состава (заголовок и цена левее)
    const icons = els.filter((e) => e.type === 'image' && /list_bullet_1|Vector/.test(e.icon));
    const head = els.filter((e) => e.type === 'text' && e.left >= -720 && e.left < -600).sort((a, b) => a.top - b.top);
    const title = head[0]?.text || '', sub = head.find((e) => e.top > 30 && !/₸/.test(e.text))?.text || '', price = (els.find((e) => /₸/.test(e.text)) || {}).text || '';
    const groups = []; let g = null;
    for (const t of col) {
      // заголовок группы стоит на left −452 и не имеет своей иконки рядом; у двухстрочных названий иконка на ~100px ниже
      const isHeader = Math.abs(t.left + 452) < 2 && !icons.find((i) => i.top > t.top && i.top < t.top + 60);
      const ic = isHeader ? null : icons.find((i) => i.top > t.top && i.top < t.top + 120);
      if (!ic) { g = { title: t.text, items: [] }; groups.push(g); continue; }
      if (!g) { g = { title: '', items: [] }; groups.push(g); }
      g.items.push({ n: t.text, in: /list_bullet_1/.test(ic.icon) });
    }
    return { title, sub, price, groups };
  });
  // Профильные программы с 4 страниц направлений: состав без цен
  const DIR = [['gastro-checkup', 'Гастро check-up', 'gi'], ['women-checkup', 'Check-up женского здоровья', 'none'], ['cardio-checkup', 'Кардио check-up', 'heart'], ['endocrinology-checkup', 'Эндокринологический check-up', 'horm']];
  const directions = DIR.map(([s, name, pain]) => {
    const b = body(`${SNAP}other/${s}.html`);
    const intro = b.filter((x) => x[0] === 'p').slice(0, 3).map((x) => x[1]);
    const ind = b.find((x, i) => x[0] === 'ul' && b[i - 1] && /показан|рекоменд|кому/i.test(b[i - 1][1]));
    const start = b.findIndex((x) => /^Цены на/i.test(x[1]));
    const progs = []; let cur = null;
    for (const x of b.slice(start + 1)) { if (x[0] === 'h3') { cur = { name: x[1], items: [] }; progs.push(cur); } else if ((x[0] === 'ol' || x[0] === 'ul') && cur) cur.items.push(...x[1]); else if (x[0] === 'p' && cur && /^Примечание/i.test(x[1])) cur.note = x[1]; }
    return { id: s, name, pain, intro, indications: ind ? ind[1] : [], programs: progs.filter((p) => p.items.length) };
  });
  // сохраняем поля подбора (who/age/pain) для квиза
  const QUIZ = { 'Базовый': { who: ['f', 'm'], age: ['30', '45'], pain: ['none'] }, 'Гастрологический Стандарт': { who: ['f', 'm'], age: ['30', '45', '60'], pain: ['gi'] }, 'Гастрологический Расширенный': { who: ['f', 'm'], age: ['45', '60'], pain: ['gi'] }, 'Премиум Мужской': { who: ['m'], age: ['45', '60'], pain: ['none', 'heart', 'horm'] }, 'Премиум Женский': { who: ['f'], age: ['45', '60'], pain: ['none', 'heart', 'horm'] } };
  const out = { programs: programs.map((p) => ({ id: tr(p.title), ...p, ...(QUIZ[p.title] || { who: ['f', 'm'], age: ['30', '45', '60'], pain: ['none'] }) })), directions };
  fs.writeFileSync('src/data/checkups.json', JSON.stringify(out, null, 1) + '\n');
  console.log('checkups:', programs.map((p) => `${p.title} ${p.price} — ${p.groups.reduce((n, g) => n + g.items.filter((i) => i.in).length, 0)}/${p.groups.reduce((n, g) => n + g.items.length, 0)} позиций`).join(' | '));
  console.log('направления:', directions.map((d) => `${d.name}: ${d.programs.map((p) => p.name + ' (' + p.items.length + ')').join(', ')}`).join(' | '));
}

/* ───────────── 3. Оферта и правила возврата ───────────── */
{
  const splitClauses = (t) => t.split(/\s(?=\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.\s)/).map((s) => s.trim()).filter(Boolean);
  const doc = (b, startRe, stopRe) => {
    const i = b.findIndex((x) => startRe.test(x[1])); const rest = b.slice(i);
    const j = stopRe ? rest.findIndex((x, k) => k > 0 && stopRe.test(x[1])) : -1;
    const part = j > 0 ? rest.slice(0, j) : rest;
    const out = [];
    for (const x of part) {
      if (x[0] === 'p' && /^\d{1,2}\.\s[А-ЯЁ]/.test(x[1]) && x[1].length < 90) { out.push(['h3', x[1]]); continue; }   // «1. Общие положения»
      if (x[0] === 'p') { for (const c of splitClauses(x[1])) out.push(['p', c]); continue; }
      out.push(x);
    }
    return out;
  };
  const of = body(SNAP + 'p_oferta.html');
  const oferta = doc(of, /^Договор открытой \(публичной\) оферты$/i, /^Тоо "институт/i);
  const rq = of.slice(of.findIndex((x) => /^Тоо "институт/i.test(x[1])));
  const requisites = rq.filter((x) => x[0] !== 'ul').map((x) => x[1]).filter((t) => !/^Тоо|^Гепатологии/i.test(t));
  const ru = body(SNAP + 'other/rulse.html');
  const rules = doc(ru, /^«утверждены»$/i);
  const out = {
    oferta: { title: 'Договор открытой (публичной) оферты на оказание платных медицинских услуг', date: '17 октября 2022 года', body: oferta.slice(oferta.findIndex((x) => /^Настоящим ТОО/i.test(x[1]))) },
    rules: { title: 'Правила возврата денег за оказанные медицинские услуги', approved: 'Утверждены приказом Генерального директора № 17-П от 12.12.2024', body: rules.filter((x) => !/^(«утверждены»|Приказом Генерального директора|ТОО «Институт гастроэнтерологии,|гепатологии и метаболизма»|№17-П от 12\.12\.2024 года|Правила|возврата денег за оказанные медицинские услуги|г\. Алматы,|2024 год)$/i.test(x[1])) },
    requisites: ['ТОО «Институт гастроэнтерологии, гепатологии и метаболизма»', ...requisites],
  };
  fs.writeFileSync('src/data/legal.json', JSON.stringify(out, null, 1) + '\n');
  console.log(`legal: оферта ${words(out.oferta.body)} слов / ${out.oferta.body.length} блоков; правила ${words(out.rules.body)} слов / ${out.rules.body.length} блоков; реквизиты: ${out.requisites.join(' · ')}`);
}
