// OG-картинки 1200×630 по типам страниц: public/images/og/<type>.jpg. Запуск: node scripts/make-og.mjs
import fs from 'node:fs';
import sharp from 'sharp';
// Числа — из данных сайта, чтобы превью ссылок не устаревали после правок прайса и списка врачей
const read = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const prices = read('prices.json');
const nPrices = Object.values(prices).reduce((a, v) => a + v.length, 0);
const nDocs = read('doctors.json').items.filter((d) => !d.hidden).length;
const nKids = read('kids.json').services.length;
const pl = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many);
const TYPES = {
  home: ['Медицинский центр в Алматы', 'Институт гастроэнтерологии, гепатологии и метаболизма'],
  services: ['Услуги и направления', 'Эндоскопия, УЗИ, фиброскан, приёмы врачей и check-up'],
  doctors: ['Врачи Interna Clinic', `${nDocs} ${pl(nDocs, 'специалист', 'специалиста', 'специалистов')} · кандидаты и доктора наук, профессура`],
  checkup: ['Check-up программы', 'Полное обследование за 2–3 дня с итоговым резюме врача'],
  prices: ['Цены на услуги', `${nPrices} ${pl(nPrices, 'позиция', 'позиции', 'позиций')} прайса`],
  kids: ['Interna KIDS', `Детское отделение: ${nKids} ${pl(nKids, 'направление', 'направления', 'направлений')}, эндоскопия и фиброскан детям`],
  media: ['Медиацентр', 'Статьи, подкасты и видео о здоровье и медицине'],
  about: ['О клинике', 'Институт гастроэнтерологии, гепатологии и метаболизма'],
  contacts: ['Контакты', 'Алматы, ул. Богенбай батыра, 248 · +7 705 926 2300'],
  patient: ['Гид пациента', 'Первый визит, подготовка, стационар и документы'],
  news: ['Новости и события', 'Объявления клиники, школы для пациентов, акции'],
  prepare: ['Подготовка к исследованиям', 'Памятки к видеоколоноскопии, ЭГДС, УЗИ и анализам'],
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wrap = (s, n) => { const w = s.split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > n) { out.push(l.trim()); l = x; } else l += ' ' + x; } if (l.trim()) out.push(l.trim()); return out.slice(0, 2); };
for (const [k, [title, sub]] of Object.entries(TYPES)) {
  const tl = wrap(title, 24), sl = wrap(sub, 58);
  const fs1 = tl.some((x) => x.length > 18) ? 72 : 84;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A2E45"/><stop offset=".6" stop-color="#0A4E7E"/><stop offset="1" stop-color="#0A6DB4"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1060" cy="90" r="260" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>
  <circle cx="1120" cy="560" r="180" fill="rgba(143,198,242,.10)"/>
  <rect x="80" y="86" width="44" height="6" fill="#8FC6F2"/>
  <text x="80" y="140" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" fill="#8FC6F2" letter-spacing="4">INTERNA CLINIC · АЛМАТЫ</text>
  ${tl.map((line, i) => `<text x="80" y="${290 + i * (fs1 + 10)}" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="${fs1}" font-weight="600" fill="#FFFFFF">${esc(line)}</text>`).join('')}
  ${sl.map((line, i) => `<text x="80" y="${290 + tl.length * (fs1 + 10) + 20 + i * 40}" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="30" fill="#CFE2F6">${esc(line)}</text>`).join('')}
  <text x="80" y="570" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" fill="#FFFFFF">internaclinic.kz</text>
  <text x="1120" y="570" text-anchor="end" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="24" fill="#8FC6F2">+7 705 926 2300</text>
</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(`public/images/og/${k}.jpg`);
}
console.log('[og]', Object.keys(TYPES).length, 'картинок → public/images/og/');
