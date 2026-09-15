/**
 * Перенос со старого сайта: страница «О клинике» (текст + 6 видео) и биографии врачей со стажем.
 *   /about-us → src/data/about.json  { intro, blocks:[{title, lead, items:[{t,d}]}], videos:[...], reviewVideos:[...] }
 *   каталог врачей (part 616401882951) → doctors.json: about (структурированная биография), exp, bio, tags
 * Запуск: node scripts/migrate-about-doctors.mjs
 */
import fs from 'node:fs';
import { pageFragments, boilerplate, buildBody, textToBody } from './lib/tilda.mjs';

const SNAP = 'content/site-snapshot/';
const all = [...fs.readdirSync(SNAP + 'services').map((f) => SNAP + 'services/' + f), ...fs.readdirSync(SNAP + 'other').map((f) => SNAP + 'other/' + f), SNAP + 'p_about-us.html'];
const isBoiler = boilerplate(all, 5);
const yt = (id) => (fs.existsSync(`content/migrated/yt/${id}.json`) ? JSON.parse(fs.readFileSync(`content/migrated/yt/${id}.json`, 'utf8')) : { id, title: '', len: 0 });

/* ───────── 1. О клинике ───────── */
{
  const b = buildBody(pageFragments(SNAP + 'p_about-us.html'), { isBoiler });
  const intro = (b.find((x) => x[0] === 'p') || ['', ''])[1];
  const blocks = []; let cur = null, pendingH3 = null;
  for (const x of b) {
    if (x[0] === 'h') { cur = { title: x[1], lead: '', items: [] }; blocks.push(cur); pendingH3 = null; continue; }
    if (!cur) continue;
    if (x[0] === 'h3') { if (pendingH3) cur.items.push({ t: pendingH3, d: '' }); pendingH3 = x[1]; continue; }
    if (x[0] === 'p') { if (pendingH3) { cur.items.push({ t: pendingH3, d: x[1] }); pendingH3 = null; } else if (!cur.lead && cur.items.length === 0) cur.lead = x[1]; else cur.items.push({ t: '', d: x[1] }); }
  }
  if (pendingH3 && cur) cur.items.push({ t: pendingH3, d: '' });
  blocks[0].lead = '';                                 // первый абзац — intro, не дублируем
  // 6 роликов о клинике: рабочие названия на YouTube («функ русс») заменяем на понятные
  const TOUR = { AxxxhJkHvl8: 'Функциональная диагностика', InhNqqdNZjw: 'Дневной стационар', M_gZ6y1D8fc: 'Круглосуточный стационар', TsEFrUzfFe8: 'Наши врачи', _K1yI6FuUtw: 'Interna Food — питание в стационаре', eFeBpAEVSmU: 'Эндоскопическое отделение' };
  const tourIds = ['TsEFrUzfFe8', 'eFeBpAEVSmU', 'AxxxhJkHvl8', 'M-gZ6y1D8fc', 'InhNqqdNZjw', '_K1yI6FuUtw'];
  const videos = tourIds.map((id) => { const v = yt(id); return { id, title: TOUR[id.replace('-', '_')] || v.title, sec: v.len }; });
  const reviewVideos = ['rOcmzRrJccw', 'yU9d1GJMkN8', 'n0_nMfz8rDo', 'IiXQgr0JjYM', 'syOzMBu4Hb4', 'UhvEKIdbFpY'].map((id) => { const v = yt(id); return { id, title: v.title.replace(/\s*\((женщина|мужской)\)\s*$/i, ''), sec: v.len }; });
  fs.writeFileSync('src/data/about.json', JSON.stringify({ intro, blocks, videos, reviewVideos }, null, 1) + '\n');
  console.log(`about: intro ${intro.split(' ').length} слов, блоков ${blocks.length} (${blocks.map((x) => x.title + ' ×' + x.items.length).join(', ')}), видео ${videos.length} + видеоотзывов ${reviewVideos.length}`);
}

/** Биография из каталога: строки через <br>; ЗАГОЛОВКИ КАПСОМ или «Образование:» → h3, остальное → пункты списка */
const HEAD = /^(образование|опыт работы|место работы|публикации|курсы[^:]*|специализац[^:]*|достижения|членство[^:]*|стажировк[^:]*|сертификат[^:]*|научн[^:]*|повышение квалификации|квалификац[^:]*|конференции|награды|направления[^:]*|принимает[^:]*|языки)$/i;
function bioToBody(html, name) {
  const dec = (t) => t.replace(/&nbsp;|&#160;|\uFEFF/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = html.split(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/i).map(dec).filter(Boolean);
  const body = []; let list = null;
  const flush = () => { if (list) { body.push(list.length === 1 && list[0].length > 140 ? ['p', list[0]] : ['ul', list]); list = null; } };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  const n2 = name.toLowerCase().split(' ').slice(0, 2).join(' ');
  for (let l of lines) {
    l = l.replace(/^[•·\-–—]\s*/, '').trim(); if (!l) continue;
    if (l.toLowerCase().includes(n2) && l.length < 60) continue;                       // повтор имени
    if (/^(врач|детский|акушер)[\s\-–—а-яё,.]*$/i.test(l) && l.length < 60) continue;   // повтор должности
    const m = l.match(/^([^:]{3,32}):\s*(.+)$/);                                     // «Образование: текст»
    if (m && HEAD.test(m[1].trim())) { flush(); body.push(['h3', cap(m[1].trim())]); l = m[2]; }
    else if ((/:$/.test(l) && l.length < 50) || (l === l.toUpperCase() && /^[А-ЯЁ][А-ЯЁ\s\-]{3,}$/.test(l) && l.split(' ').length <= 3)) { flush(); body.push(['h3', cap(l.replace(/:$/, ''))]); continue; }
    if (/^(стаж|опыт работы)\s[^.]{0,40}(лет|года?)/i.test(l) && l.length < 60) { flush(); body.push(['p', l]); continue; }
    if (l === l.toUpperCase() && /[А-ЯЁ]{4}/.test(l)) l = cap(l);                      // регалии капсом — обычной строкой
    (list ??= []).push(l);
  }
  flush();
  return body;
}

/* ───────── 2. Врачи: биография, стаж, регалии ───────── */
{
  const docs = JSON.parse(fs.readFileSync('src/data/doctors.json', 'utf8')).items;
  const raw = JSON.parse(fs.readFileSync('content/migrated/prices-raw.json', 'utf8')).products;
  const prices = JSON.parse(fs.readFileSync('src/data/prices.json', 'utf8'));
  const inPart = (p, id) => { try { return JSON.parse(p.partuids || '[]').map(String).includes(id); } catch { return false; } };
  const cat = raw.filter((p) => inPart(p, '616401882951'));
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/қ/g, 'к').replace(/ә/g, 'а').replace(/ң/g, 'н').split(/\s+/).slice(0, 2).join(' ');
  // стаж из подписей прайса «(Опыт - более N лет)»
  const priceExp = new Map();
  for (const k in prices) for (const r of prices[k]) { const m = (r[1] || '').match(/^(.+?)\s*\(Опыт\s*-\s*более\s*(\d+)/i); if (m) priceExp.set(norm(m[1]), +m[2]); }
  const YEAR = new Date().getFullYear();
  let withAbout = 0, withExp = 0, est = 0;
  for (const d of docs) {
    const p = cat.find((c) => norm(c.title) === norm(d.n)) || raw.find((c) => norm(c.title) === norm(d.n));
    if (!p || !p.text) continue;
    const about = bioToBody(p.text, d.n);
    const plain = about.map((x) => (Array.isArray(x[1]) ? x[1].join(' ') : x[1])).join(' ');
    // стаж: явный → из прайса → оценка по году окончания интернатуры/вуза
    let exp = '';
    const m = plain.match(/(?:Стаж|Опыт(?: работы)?)[^0-9]{0,30}?(\d{1,2})\s*(?:лет|года?|\+)/i);
    if (m) exp = `${m[1]} лет`;
    else if (priceExp.has(norm(d.n))) exp = `${priceExp.get(norm(d.n))} лет`;
    else {
      const ranges = [...plain.matchAll(/(19|20)(\d{2})\s*(?:г\.?|гг\.?)?\s*[-–—]\s*(19|20)(\d{2})/g)].map((r) => +(r[3] + r[4])).filter((y) => y >= 1975 && y <= YEAR);
      const singles = [...plain.matchAll(/\b(19[7-9]\d|20[0-2]\d)\b/g)].map((r) => +r[1]);
      const cands = (ranges.length ? ranges : singles.map((y) => y + 6)).filter((y) => y <= YEAR);
      if (cands.length && !d.exp) { exp = `практика с ${Math.min(...cands)}`; est++; }
    }
    if (exp && !d.exp) withExp++;
    if (exp && (!d.exp || !/^практика/.test(exp))) d.exp = exp;
    d.about = about; withAbout++;
    const firstP = about.find((x) => x[0] === 'p' && x[1].length >= 60);
    const templated = !d.bio || /Приём ведётся по международным протоколам|Приём на русском и казахском|Автор статей медиацентра|в тот же визит/i.test(d.bio);
    if (templated) {
      const ul = about.find((x) => x[0] === 'ul');
      d.bio = firstP ? firstP[1] : `${d.r}${d.exp ? (/^практика/.test(d.exp) ? ', ' + d.exp + ' года' : ', стаж ' + d.exp) : ''}. ${ul ? ul[1][0].replace(/\.$/, '') + '.' : ''}`.trim();
    }
    const tags = new Set(d.tags || []);
    if (/доктор медицинских наук|д\.м\.н/i.test(plain)) tags.add('д.м.н.'); else if (/кандидат медицинских наук|к\.м\.н/i.test(plain)) tags.add('к.м.н.');
    if (/высшей категории/i.test(plain)) tags.add('высшая категория');
    if (/профессор/i.test(plain) && !/ассистент профессора/i.test(plain)) tags.add('профессор');
    d.tags = [...tags].slice(0, 4);
  }
  fs.writeFileSync('src/data/doctors.json', JSON.stringify({ items: docs }, null, 1) + '\n');
  console.log(`врачи: биографии у ${withAbout}/${docs.length}, стаж заполнен ещё у ${withExp} (оценка по году выпуска — ${est}); без стажа: ${docs.filter((d) => !d.exp).map((d) => d.n).join(', ') || 'нет'}`);
}
