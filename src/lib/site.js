// Общие настройки сайта и хелперы данных
import site from '../data/site.json';

// Контакты и реквизиты — в src/data/site.json (правятся в админке, раздел «Контакты»); ссылку для звонка собираем из номера
export const SITE = { ...site, phoneHref: 'tel:+' + site.phone.replace(/\D/g, '') };

/** Ключ картинки из данных прототипа → путь в public/images */
export const img = (key) => (key === 'logo' ? '/images/logo.png' : key === 'og' || key.startsWith('og/') ? `/images/${key}.jpg` : `/images/${key}.webp`);

export const SLOTS = [['14:30', 'сегодня'], ['16:00', 'сегодня'], ['09:15', 'завтра'], ['11:00', 'завтра'], ['13:45', 'завтра'], ['18:20', 'завтра']];

export const CATS = { all: 'Все', gastro: 'Гастроэнтерологи', endo: 'Эндокринологи', cardio: 'Кардиологи', endoscopy: 'Эндоскописты', uzi: 'Врачи УЗИ', kids: 'Детские', other: 'Другие специалисты' };

// пометки отделений у врача: «Interna Clinic» — принимает взрослых, «Interna KIDS» — детей; врач только с детской подписью («Педиатр», «Детский …») — только KIDS
export const units = (d) => {
  const kidsOnly = (d.r || '').split(/,|·/).every((p) => /^\s*(педиатр|детск)/i.test(p));
  return [...(kidsOnly ? [] : ['Interna Clinic']), ...(d.kids || d.cat === 'kids' ? ['Interna KIDS'] : [])];
};

export const NAV = [
  ['/services', 'Услуги'], ['/doctors', 'Врачи'], ['/checkup', 'Check-up'], ['/prices', 'Цены'],
  ['/patient', 'Пациенту'], ['/about', 'О клинике'], ['/media', 'Блог'],
];

/** Позиции прайса, которые клиника просит показывать первыми в своём разделе (остальные — по алфавиту) */
export const PRICE_FIRST = [/^Рентген лёгкие\/ ОГК/];
export const priceRank = (name) => { const i = PRICE_FIRST.findIndex((re) => re.test(name)); return i < 0 ? PRICE_FIRST.length : i; };

/** Акции: активны, пока не наступил день после даты `until` (YYYY-MM-DD); без даты — бессрочно */
const GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const activePromos = (items) => { const today = new Date().toISOString().slice(0, 10); return (items || []).filter((p) => !p.hidden && (!p.until || p.until >= today)); };
export const untilLabel = (p) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p?.until || ''); return m ? `До ${+m[3]} ${GEN[+m[2] - 1]}` : 'Акция'; };
