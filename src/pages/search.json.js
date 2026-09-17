// Поисковый индекс сайта: врачи, услуги, check-up, цены, KIDS, статьи, разделы.
// Собирается на этапе сборки, читается скриптом поиска (site.js) по адресу /search.json.
import doctorsFile from '../data/doctors.json';
import services from '../data/services.json';
import extra from '../data/services_extra.json';
import checkups from '../data/checkups.json';
import prices from '../data/prices.json';
import kids from '../data/kids.json';
import mediaFile from '../data/media.json';
import newsFile from '../data/news.json';
import eventsFile from '../data/events.json';

export function GET() {
  const items = [];
  const add = (g, t, s, u, k = '') => { if (t) items.push({ g, t, s: s || '', u, k }); };

  for (const d of doctorsFile.items) add('Врачи', d.n, d.r, `/doctor/${d.id}`, [...(d.tags || []), d.cat, d.kidsRole || ''].join(' '));
  for (const [k, s] of Object.entries(services)) add('Услуги', s.t, [s.cat, s.price].filter(Boolean).join(' · '), `/service/${k}`, s.h1 || '');
  for (const [k, s] of Object.entries(extra)) add('Услуги', s.t, s.cat, `/uslugi/${k}`, s.h1 || '');
  for (const p of checkups.programs) add('Check-up', `Check-up «${p.title}»`, p.price, `/checkup#cu-${p.id}`, 'чекап обследование программа');
  for (const s of kids.services) add('Interna KIDS', s.t, 'детская клиника', `/kids/${s.id}`, 'детский ребёнок');
  for (const m of mediaFile.items) add('Медиацентр', m.t, m.tag || 'статья', `/article/${m.id}`);
  for (const [sec, rows] of Object.entries(prices)) for (const r of rows) add('Цены', r[0], [r[2], sec].filter(Boolean).join(' · '), `/prices?q=${encodeURIComponent(r[0])}`, r[1] || '');

  for (const n of newsFile.items) add('Новости', n.title, n.tag, `/news#${n.id}`, n.text);
  for (const e of eventsFile.items) add('События', e.title, e.when, `/news#${e.id}`, e.text);
  const pages = [
    ['Подготовка к исследованиям', 'памятки', '/prepare', 'колоноскопия эгдс узи натощак'],
    ['Вопросы и ответы', 'FAQ', '/faq', 'запись оплата седация'],
    ['Контакты и как добраться', 'адрес, парковка, карта', '/contacts', 'адрес телефон карта 2гис'],
    ['Акции и ОСМС', 'бесплатные услуги по страхованию', '/promo', 'скидка бесплатно осмс гобмп'],
    ['Отзывы пациентов', '13 отзывов', '/reviews', ''],
    ['О клинике и оборудование', 'Olympus EVIS X1, GE Logiq E10s, FibroScan', '/about', 'оборудование видео команда'],
    ['Документы: оферта и правила', 'юридическая информация', '/legal', 'оферта возврат реквизиты'],
    ['Заявка на check-up', 'подробная форма', '/checkup-request', 'чекап обследование'],
    ['Гид пациента', 'первый визит, стационар, ОСМС, документы', '/patient', 'как добраться парковка что взять справка выписка'],
    ['Новости и события', 'объявления, школы, акции', '/news', 'школа диабета'],
  ];
  for (const [t, s, u, k] of pages) add('Разделы', t, s, u, k);

  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
