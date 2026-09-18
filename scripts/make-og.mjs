// OG-картинки 1200×630 по типам страниц: public/images/og/<type>.jpg. Запуск: node scripts/make-og.mjs
import fs from 'node:fs';
import sharp from 'sharp';
const TYPES = {
  home: ['Медицинский центр в Алматы', 'Диагноз на первом приёме · гастроэнтерология, гепатология, эндокринология'],
  services: ['Услуги и направления', '39 направлений: приём врача и обследование в один визит'],
  doctors: ['Врачи Interna Clinic', '43 специалиста · кандидаты и доктора наук, профессура'],
  checkup: ['Check-up программы', 'Полное обследование за 1–2 дня с заключением врача'],
  prices: ['Цены на услуги', '234 позиции прайса · цены фиксированы'],
  kids: ['Interna KIDS', 'Детская клиника: 17 направлений, эндоскопия и фиброскан детям'],
  media: ['Медиацентр', 'Статьи, подкасты и видео о здоровье и медицине'],
  about: ['О клинике', 'Институт гастроэнтерологии, гепатологии и метаболизма'],
  contacts: ['Контакты', 'Алматы, ул. Богенбай батыра, 248 · +7 705 926 2300'],
  patient: ['Гид пациента', 'Первый визит, подготовка, стационар, ОСМС и документы'],
  news: ['Новости и события', 'Объявления клиники, школы для пациентов, акции'],
  prepare: ['Подготовка к исследованиям', 'Памятки к колоноскопии, ЭГДС, УЗИ и анализам'],
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
