/**
 * Перенос Interna KIDS и акций со старого сайта.
 *   каталог kids (part 439195441294) → src/data/kids.json: 17 детских услуг с полным текстом и иконками (public/images/kids/)
 *   каталог kids-врачи (part 371954388204) → флаг kids:true у врачей в doctors.json (+ недостающие врачи)
 *   /salesss (капсула со старой ценой), /free, /fibrofree, /procfree, «Бесплатная госпитализация» → promos.json + free.json
 * Запуск: node scripts/migrate-kids-promo.mjs
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pageFragments, boilerplate, buildBody, textToBody } from './lib/tilda.mjs';

const SNAP = 'content/site-snapshot/';
const raw = JSON.parse(fs.readFileSync('content/migrated/prices-raw.json', 'utf8')).products;
const inPart = (p, id) => { try { return JSON.parse(p.partuids || '[]').map(String).includes(id); } catch { return false; } };
const all = [...fs.readdirSync(SNAP + 'services').map((f) => SNAP + 'services/' + f), ...fs.readdirSync(SNAP + 'other').map((f) => SNAP + 'other/' + f), SNAP + 'p_kids.html'];
const isBoiler = boilerplate(all, 5);
const body = (f) => buildBody(pageFragments(f), { isBoiler });
const dl = (url, out) => { if (fs.existsSync(out)) return true; try { execSync(`curl -sL -A "Mozilla/5.0" -o "${out}" "${url}"`); return fs.statSync(out).size > 500; } catch { return false; } };
const gallery = (p) => { try { return (JSON.parse(p.gallery || '[]')[0] || {}).img || ''; } catch { return ''; } };
const slugOf = (p) => (p.url.match(/\d+-\d+-(.+)$/) || [])[1] || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const fmtPrice = (v) => (v ? `${Math.round(+v).toLocaleString('ru-RU').replace(/,/g, ' ')} ₸` : '');

/* ───────── 1. Детские услуги ───────── */
fs.mkdirSync('public/images/kids', { recursive: true });
const services = raw.filter((p) => inPart(p, '439195441294')).map((p) => {
  const id = slugOf(p).replace(/-v-interna-kids.*$/, '').replace(/-u-detei$/, '');
  let b = textToBody(p.text || '');
  let price = fmtPrice(p.price), note = '';
  b = b.filter((x) => {
    if (x[0] !== 'p') return true;
    const m = x[1].match(/^Стоимость[^0-9]*([\d\s]+)\s*тг/i); if (m && !price) { price = m[1].replace(/\s+/g, ' ').trim() + ' ₸'; return false; } if (m) return false;
    if (/онлайн-консультации не проводятся/i.test(x[1])) { note = x[1]; return false; }
    return true;
  });
  const icon = gallery(p); const ext = (icon.split('.').pop() || 'svg').split('?')[0];
  const out = `public/images/kids/${id}.${ext}`; const ok = icon && dl(icon, out);
  return { id, t: p.title.replace(/\s+в Interna Kids.*$/i, '').trim(), full: p.title, price, note, icon: ok ? `/images/kids/${id}.${ext}` : '', body: b, src: p.url };
});
// вводный текст и преимущества со страницы /kids
const kb = body(SNAP + 'p_kids.html');
const welcome = (kb.find((x) => x[0] === 'p' && /Добро пожаловать/i.test(x[1])) || [])[1] || '';
const fi = kb.findIndex((x) => /Особенности лечения/i.test(x[1])); const fe = kb.findIndex((x) => /Контактная информация/i.test(x[1]));
const feat = kb.slice(fi + 1, fe); const titles = feat.filter((x) => x[0] === 'h3').map((x) => x[1]); const texts = feat.filter((x) => x[0] === 'p').map((x) => x[1]);
const features = titles.map((t, i) => ({ t, d: texts[i] || '' }));
fs.writeFileSync('src/data/kids.json', JSON.stringify({ welcome, features, services }, null, 1) + '\n');
console.log(`kids: ${services.length} услуг (${services.filter((s) => s.icon).length} с иконками, ${services.filter((s) => s.price).length} с ценой), ${features.length} преимуществ`);

/* ───────── 2. Детские врачи ───────── */
const docs = JSON.parse(fs.readFileSync('src/data/doctors.json', 'utf8')).items;
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').split(/\s+/).slice(0, 2).join(' ');
const clean = (s) => { const t = s.replace(/&nbsp;/g, ' ').replace(/^Врач\s*-\s*/i, '').replace(/^Врач-/i, '').replace(/\s+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
let added = 0;
for (const p of raw.filter((x) => inPart(x, '371954388204'))) {
  let d = docs.find((x) => norm(x.n) === norm(p.title));
  if (!d) {
    const id = slugOf(p); const img = gallery(p); const out = `public/images/doctors/${id}.jpg`;
    if (img) { const tmp = `/tmp/${id}.${img.split('.').pop()}`; dl(img, tmp); try { execSync(`sips -s format jpeg -s formatOptions 82 -Z 900 "${tmp}" --out "${out}" >/dev/null 2>&1`); } catch {} }
    const bio = textToBody(p.text || '');
    d = { id, n: p.title, r: clean(p.descr), cat: 'other', img: fs.existsSync(out) ? `doctors/${id}` : '', exp: '', tags: [], bio: (bio.find((x) => x[0] === 'p' && x[1].length > 40) || ['', (bio.find((x) => x[0] === 'ul') || ['', []])[1].join(' · ')])[1], price: '' };
    docs.push(d); added++;
  }
  d.kids = true; d.kidsRole = clean(p.descr);
}
fs.writeFileSync('src/data/doctors.json', JSON.stringify({ items: docs }, null, 1) + '\n');
console.log(`врачи KIDS: ${docs.filter((d) => d.kids).length} отмечены, добавлено новых: ${added}`);

/* ───────── 3. Акции и бесплатные услуги по ОСМС ───────── */
const cap = raw.find((p) => inPart(p, '426683581141'));
const capBody = textToBody(cap.text || '');
const promos = [{ id: 'capsule', t: 'Видеокапсульная эндоскопия', d: (capBody.find((x) => x[0] === 'p') || ['', ''])[1].slice(0, 220), p: fmtPrice(cap.price), old: fmtPrice(String(cap.priceold).replace(',', '.')), off: `−${Math.round((1 - +cap.price / parseFloat(String(cap.priceold).replace(',', '.'))) * 100)}%`, link: '/uslugi/capsule', hot: true }];
fs.writeFileSync('src/data/promos.json', JSON.stringify({ items: promos }, null, 1) + '\n');
const fb = body(SNAP + 'other/free.html'); const intro = fb.filter((x) => x[0] === 'p').slice(0, 3).map((x) => x[1]);
const fibro = body(SNAP + 'other/fibrofree.html'); const fEnd = fibro.findIndex((x) => /^Записаться на диагностику/i.test(x[1]));
const fibroBody = fibro.slice(0, fEnd > 0 ? fEnd : undefined).filter((x) => !/^(Функциональная диагностика|Гепатолог Interna Clinic|Фиброскан Interna Clinic|ФиброСкан в Алматы|Эластография печени \/ фиброскан печени)/i.test(x[1]) && !/^(Гепатолог - это врач|Фиброскан - это медицинская процедура|В Interna Clinic мы стремимся)/i.test(x[1]));
const proc = body(SNAP + 'other/procfree.html').filter((x) => !/^Процедурный$/i.test(x[1]));
const hosp = raw.find((p) => inPart(p, '867024778181') && /госпитализац/i.test(p.title));
const free = { intro, items: [
  { id: 'fibroscan', t: 'Фиброскан печени по ОСМС', lead: 'Эластометрия печени бесплатно для застрахованных в системе ОСМС — по направлению врача.', body: fibroBody, link: '/service/fibroscan' },
  { id: 'proccab', t: 'Процедурный кабинет по ОСМС', lead: 'Бесплатные препараты и их введение в рамках ОСМС.', body: proc, link: '/uslugi/proccab' },
  { id: 'hospital', t: 'Бесплатная госпитализация по ГОБМП и ОСМС', lead: 'Стационарное лечение гастроэнтерологического профиля по государственной программе.', body: textToBody(hosp?.text || ''), link: '/uslugi/station' },
] };
fs.writeFileSync('src/data/free.json', JSON.stringify(free, null, 1) + '\n');
console.log(`акции: ${promos.length} (${promos[0].t} ${promos[0].p} вместо ${promos[0].old}, ${promos[0].off}); бесплатно по ОСМС: ${free.items.map((i) => i.t + ' [' + i.body.length + ' блоков]').join(', ')}`);
