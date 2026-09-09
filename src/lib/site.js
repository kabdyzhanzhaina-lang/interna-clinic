// Общие настройки сайта и хелперы данных
export const SITE = {
  name: 'Interna Clinic',
  legalName: 'ТОО «Институт гастроэнтерологии, гепатологии и метаболизма»',
  bin: '090340007797',
  license: '№ 22 016 017 от 31.08.2022',
  phone: '+7 705 926 2300',
  phoneHref: 'tel:+77059262300',
  whatsapp: 'https://wa.me/77007110550',
  email: 'info@internaclinic.kz',
  address: 'Алматы, ул. Богенбай батыра, 248',
  hours: [['Пн — Пт', '08:00 – 22:00'], ['Суббота', '09:00 – 17:00'], ['Воскресенье', '09:00 – 17:00']],
  hoursShort: 'Пн–Пт 08:00–22:00 · Сб–Вс 09:00–17:00',
};

/** Ключ картинки из данных прототипа → путь в public/images */
export const img = (key) => (key === 'logo' ? '/images/logo.png' : `/images/${key}.jpg`);

export const SLOTS = [['14:30', 'сегодня'], ['16:00', 'сегодня'], ['09:15', 'завтра'], ['11:00', 'завтра'], ['13:45', 'завтра'], ['18:20', 'завтра']];

export const CATS = { all: 'Все', gastro: 'Гастроэнтерологи', endo: 'Эндокринологи', endoscopy: 'Эндоскописты', cardio: 'Кардиологи', kids: 'Детские', other: 'Другие специалисты' };

export const NAV = [
  ['/services', 'Услуги'], ['/doctors', 'Врачи'], ['/checkup', 'Check-up'], ['/prices', 'Цены'],
  ['/about', 'О клинике'], ['/media', 'Медиа'], ['/contacts', 'Контакты'],
];
