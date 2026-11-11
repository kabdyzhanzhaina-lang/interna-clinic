// Разделы админки: какой файл, какие поля, как называть запись в списке и в истории правок.

export const CATS = { gastro: 'Гастроэнтерология', endo: 'Эндокринология', endoscopy: 'Эндоскопия', cardio: 'Кардиология', kids: 'Interna KIDS', other: 'Другие' };

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i' };
export const slugify = (s, max = 48) => String(s || '').toLowerCase().split('').map((c) => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
export const shortName = (n = '') => { const [f, i, o] = n.trim().split(/\s+/); return f ? `${f}${i ? ` ${i[0]}.` : ''}${o ? ` ${o[0]}.` : ''}` : ''; };

/**
 * Поле формы: key, label, type (text | textarea | select | tags | toggle | blocks | paras | lines | image | date),
 * hint, opt (необязательно), options (для select), max (счётчик символов), when(item) — показывать ли.
 */
export const COLLECTIONS = {
  doctors: {
    label: 'Врачи', one: 'врача', icon: 'stethoscope', file: 'src/data/doctors.json', idKey: 'id',
    title: (d) => d.n || 'Новый врач', sub: (d) => d.r,
    fields: [
      { key: 'n', label: 'ФИО' },
      { key: 'r', label: 'Должность', hint: 'Так подпись видна в карточке врача и в поиске' },
      { key: 'cat', label: 'Направление', type: 'select', options: Object.entries(CATS) },
      { key: 'exp', label: 'Стаж', hint: 'например «12 лет»' },
      { key: 'price', label: 'Цена приёма', opt: true },
      { key: 'tags', label: 'Чем занимается — теги', type: 'tags', opt: true },
      { key: 'kids', label: 'Принимает детей', type: 'toggle', hint: 'Врач появится в разделе Interna KIDS' },
      { key: 'kidsRole', label: 'Детская должность', opt: true, when: (d) => d.kids },
      { key: 'bio', label: 'Коротко о враче', type: 'textarea', max: 300, hint: '2–3 предложения для карточки в списке врачей' },
      { key: 'about', label: 'Биография', type: 'blocks', variant: 'doctor', hint: 'Образование, опыт, повышение квалификации' },
    ],
    blank: () => ({ id: '', n: '', r: '', cat: 'gastro', img: '', exp: '', tags: [], bio: '', price: '', about: [] }),
  },
  promos: {
    label: 'Акции', one: 'акцию', icon: 'sell', file: 'src/data/promos.json', idKey: 'id',
    title: (p) => p.t || 'Новая акция', sub: (p) => [p.p, p.off].filter(Boolean).join(' · '),
    fields: [
      { key: 't', label: 'Название' },
      { key: 'd', label: 'Описание', type: 'textarea' },
      { key: 'p', label: 'Цена', hint: 'например «330 000 ₸»' },
      { key: 'old', label: 'Старая цена', opt: true },
      { key: 'off', label: 'Скидка', opt: true, hint: 'например «−13%»' },
      { key: 'link', label: 'Ссылка на услугу', opt: true, hint: 'адрес страницы на сайте, например /uslugi/capsule' },
      { key: 'until', label: 'Действует до', type: 'date', opt: true, hint: 'после этой даты акция исчезает с сайта автоматически' },
      { key: 'hot', label: 'Выделить на сайте', type: 'toggle', keep: true },
    ],
    blank: () => ({ id: '', t: '', d: '', p: '', old: '', off: '', link: '', until: '', hot: false }),
  },
  news: {
    label: 'Новости', one: 'новость', icon: 'newspaper', file: 'src/data/news.json', idKey: 'id',
    title: (n) => n.title || 'Новая новость', sub: (n) => [fmtDay(n.date), n.tag].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Заголовок' },
      { key: 'date', label: 'Дата', type: 'date' },
      { key: 'tag', label: 'Рубрика', hint: 'Акция, ОСМС, Стационар, Врачи…' },
      { key: 'text', label: 'Текст', type: 'textarea' },
      { key: 'link', label: 'Ссылка «Подробнее»', opt: true },
    ],
    blank: () => ({ id: '', date: new Date().toISOString().slice(0, 10), tag: '', title: '', text: '', link: '' }),
  },
  events: {
    label: 'События', one: 'событие', icon: 'event', file: 'src/data/events.json', idKey: 'id',
    title: (e) => e.title || 'Новое событие', sub: (e) => [e.type, e.when].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Название' },
      { key: 'type', label: 'Тип', hint: 'Школа, Приём, Стационар, Медиа' },
      { key: 'when', label: 'Когда', hint: 'дата или периодичность' },
      { key: 'where', label: 'Где' },
      { key: 'text', label: 'Описание', type: 'textarea' },
      { key: 'cta', label: 'Текст кнопки' },
      { key: 'link', label: 'Ссылка', opt: true },
      { key: 'svc', label: 'Направление для формы записи', opt: true, hint: 'если задано — кнопка открывает форму записи' },
    ],
    blank: () => ({ id: '', type: '', title: '', when: '', where: '', text: '', cta: 'Записаться', link: '' }),
  },
  media: {
    label: 'Медиацентр', one: 'статью', icon: 'article', file: 'src/data/media.json', idKey: 'id',
    title: (a) => a.t || 'Новая статья', sub: (a) => [fmtDay(a.date), a.tag].filter(Boolean).join(' · '),
    blank: () => ({ id: '', t: '', img: '', by: 'Медиацентр Interna Clinic', date: new Date().toISOString().slice(0, 10), tag: 'СТАТЬЯ · ', min: '', body: [] }),
  },
  reviews: {
    label: 'Отзывы', one: 'отзыв', icon: 'reviews', file: 'src/data/reviews.json',
    title: (r) => r.name || 'Новый отзыв', sub: (r) => r.src,
    fields: [
      { key: 'name', label: 'Автор' },
      { key: 'src', label: 'Источник', hint: '2ГИС, Google, iDoctor' },
      { key: 'text', label: 'Текст отзыва', type: 'textarea' },
    ],
    blank: () => ({ name: '', src: '', text: '' }),
  },
  faq: {
    label: 'Вопросы и ответы', one: 'вопрос', icon: 'help', file: 'src/data/faq.json',
    title: (q) => q.q || 'Новый вопрос', sub: (q) => (q.a || [])[0],
    fields: [
      { key: 'q', label: 'Вопрос' },
      { key: 'a', label: 'Ответ', type: 'paras', hint: 'абзацы разделяйте пустой строкой' },
      { key: 'list', label: 'Список после ответа', type: 'lines', opt: true, hint: 'каждый пункт с новой строки' },
    ],
    blank: () => ({ q: '', a: [] }),
  },
  services: {
    label: 'Услуги', one: 'услугу', icon: 'medical_services', file: 'src/data/services.json', idKey: 'id', noAdd: true,
    title: (s) => s.t || 'Услуга', sub: (s) => [s.cat, s.price].filter(Boolean).join(' · '),
    // services.json — объект «адрес → услуга»; в админке показываем как список и собираем обратно при публикации
    toData: (map) => ({ items: Object.entries(map).map(([id, s]) => ({ id, ...s, prepH: s.prep?.h || '', prepSteps: s.prep?.steps || [], prepNote: s.prep?.note || '' })) }),
    fromData: (data) => Object.fromEntries(data.items.map(({ id, prepH, prepSteps, prepNote, ...s }) => { const prep = s.prep || (prepSteps.length ? { memo: '' } : null); return [id, { ...s, ...(prep ? { prep: { ...prep, h: prepH, steps: prepSteps, note: prepNote } } : {}) }]; })),
    fields: [
      { key: 't', label: 'Название', hint: 'в меню, карточках и заголовках' },
      { key: 'h1', label: 'Заголовок страницы (H1)' },
      { key: 'cat', label: 'Раздел', hint: 'Эндоскопия, Диагностика, Приём' },
      { key: 'price', label: 'Цена «от»', hint: 'например «82 000 ₸»' },
      { key: 'short', label: 'Коротко — для карточек', type: 'textarea', max: 160 },
      { key: 'sub', label: 'Подзаголовок на странице', type: 'textarea', max: 220 },
      { key: 'why', label: 'Зачем нужна услуга', type: 'textarea', hint: 'абзац на 3–5 предложений — раздел «Обзор»' },
      { key: 'checks', label: 'Показания', type: 'lines', hint: 'каждый пункт с новой строки' },
      { key: 'prepH', label: 'Подготовка — заголовок', opt: true, hint: 'например «Как подготовиться к колоноскопии»', when: (s) => !!s.prep || s.prepSteps?.length },
      { key: 'prepSteps', label: 'Подготовка — шаги', type: 'lines', opt: true, hint: 'до 6 коротких шагов, каждый с новой строки', when: (s) => !!s.prep || s.prepSteps?.length },
      { key: 'prepNote', label: 'Подготовка — важное', type: 'textarea', opt: true, hint: 'предупреждение в розовой карточке', when: (s) => !!s.prep || s.prepSteps?.length },
    ],
    blank: () => ({ id: '', t: '', h1: '', cat: '', price: '', short: '', sub: '', why: '', checks: [], prepH: '', prepSteps: [], prepNote: '' }),
  },
  vacancies: {
    label: 'Вакансии', one: 'вакансию', icon: 'work', file: 'src/data/vacancies.json', idKey: 'id',
    title: (v) => v.title || 'Новая вакансия', sub: (v) => [v.type, v.salary].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Должность' },
      { key: 'type', label: 'Занятость и график', hint: 'например «Полная занятость · 5/2»' },
      { key: 'salary', label: 'Зарплата', opt: true, hint: 'например «от 600 000 ₸»' },
      { key: 'text', label: 'Описание', type: 'textarea', max: 400, hint: 'обязанности и требования в 2–3 предложениях' },
    ],
    fileFields: [{ key: 'intro', label: 'Вводный текст на странице «Вакансии»', type: 'textarea' }],
    blank: () => ({ id: '', title: '', type: 'Полная занятость · 5/2', salary: '', text: '' }),
  },
  equipment: {
    label: 'Оборудование', one: 'аппарат', icon: 'biotech', file: 'src/data/equipment.json', idKey: 'id',
    title: (e) => e.name || 'Новый аппарат', sub: (e) => [e.kind, e.cat].filter(Boolean).join(' · '),
    fields: [
      { key: 'img', label: 'Фото', type: 'image', dir: 'equip', format: 'path', width: 1200 },
      { key: 'name', label: 'Название' },
      { key: 'kind', label: 'Тип', hint: 'например «Фиброскан»' },
      { key: 'cat', label: 'Направление' },
      { key: 'desc', label: 'Описание', type: 'textarea' },
    ],
    fileFields: [{ key: 'intro', label: 'Вводный текст на странице «О клинике»', type: 'paras' }],
    blank: () => ({ id: '', name: '', kind: '', cat: '', desc: '', img: '' }),
  },
};

export const PRICES_FILE = 'src/data/prices.json';
export const NAV = [['', 'Обзор', 'dashboard'], ['doctors'], ['prices', 'Прайс', 'payments'], ['promos'], ['news'], ['events'], ['media'], ['services'], ['reviews'], ['faq'], ['vacancies'], ['equipment']]
  .map(([k, l, i]) => (l ? { key: k, label: l, icon: i } : { key: k, label: COLLECTIONS[k].label, icon: COLLECTIONS[k].icon }));

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function fmtDay(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso || ''; }

/* ── Что изменилось: строки для окна публикации и сообщения коммита ── */
const short = (v) => {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '—';
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (Array.isArray(v)) return v.every((x) => typeof x === 'string') ? v.join(', ') : 'текст';
  const s = String(v).replace(/\s+/g, ' ');
  return s.length > 60 ? s.slice(0, 58) + '…' : s;
};
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const labelOf = (c, key) => (c.fields || []).find((f) => f.key === key)?.label || { img: 'Фото', hidden: 'Показ на сайте', id: 'Адрес', t: 'Заголовок', body: 'Текст', tag: 'Рубрика', by: 'Автор', doc: 'Врач', date: 'Дата', min: 'Время чтения', video: 'Видео', url: 'Адрес на старом сайте' }[key] || key;
const nameOf = (key, c, item) => (key === 'doctors' ? shortName(c.title(item)) : `«${short(c.title(item))}»`);

export function diffCollection(key, before, after) {
  const c = COLLECTIONS[key], out = [];
  for (const f of c.fileFields || []) if (!same(before[f.key], after[f.key])) out.push({ what: `${c.label} · ${f.label}`, old: short(before[f.key]), new: 'изменён' });
  const A = before.items || [], B = after.items || [];
  const k = (it, i) => (c.idKey ? it[c.idKey] : i);
  const prev = new Map(A.map((it, i) => [k(it, i), it]));
  const next = new Map(B.map((it, i) => [k(it, i), it]));
  B.forEach((it, i) => {
    const o = prev.get(k(it, i));
    if (!o) { out.push({ what: `${c.label}: добавлено ${nameOf(key, c, it)}`, old: '', new: '' }); return; }
    for (const f of new Set([...Object.keys(o), ...Object.keys(it)])) {
      if (same(o[f], it[f])) continue;
      const big = ['about', 'body', 'a', 'list', 'intro'].includes(f);
      out.push({ what: `${nameOf(key, c, it)} · ${labelOf(c, f)}`, old: big ? '' : short(o[f]), new: big ? 'изменён текст' : f === 'hidden' ? (it.hidden ? 'скрыт' : 'показан') : short(it[f]) });
    }
  });
  A.forEach((it, i) => { if (!next.has(k(it, i))) out.push({ what: `${c.label}: удалено ${nameOf(key, c, it)}`, old: '', new: '' }); });
  if (!out.length && !same(A.map(k), B.map(k))) out.push({ what: `${c.label}: изменён порядок`, old: '', new: '' });
  return out;
}

export function diffPrices(before, after) {
  const out = [];
  for (const [sec, rows] of Object.entries(after)) {
    const o = before[sec];
    if (!o) { out.push({ what: `Прайс: новый раздел «${sec}»`, old: '', new: `${rows.length} позиций` }); continue; }
    // одинаковые названия в разделе (например, «Приём гастроэнтеролога» у разных врачей) сопоставляем по порядку
    const om = new Map();
    for (const r of o) (om.get(r[0]) || om.set(r[0], []).get(r[0])).push(r);
    for (const r of rows) {
      const p = om.get(r[0])?.shift();
      if (!p) { out.push({ what: `Прайс · ${sec}: добавлено «${short(r[0])}»`, old: '', new: r[2] || '' }); continue; }
      if (p[2] !== r[2]) out.push({ what: `Прайс · ${sec}: «${short(r[0])}»`, old: p[2] || '—', new: r[2] || '—' });
      if ((p[3] || '') !== (r[3] || '')) out.push({ what: `Прайс · ${sec}: «${short(r[0])}» · старая цена`, old: p[3] || '—', new: r[3] || '—' });
      if ((p[1] || '') !== (r[1] || '')) out.push({ what: `Прайс · ${sec}: «${short(r[0])}» · описание`, old: '', new: 'изменено' });
    }
    for (const [name, left] of om) for (const _ of left) out.push({ what: `Прайс · ${sec}: удалено «${short(name)}»`, old: '', new: '' });
    if (!out.some((x) => x.what.includes(`· ${sec}:`)) && !same(o.map((r) => r[0]), rows.map((r) => r[0]))) out.push({ what: `Прайс · ${sec}: изменён порядок`, old: '', new: '' });
  }
  for (const sec of Object.keys(before)) if (!(sec in after)) out.push({ what: `Прайс: удалён раздел «${sec}»`, old: '', new: '' });
  if (!out.length && !same(Object.keys(before), Object.keys(after))) out.push({ what: 'Прайс: изменён порядок разделов', old: '', new: '' });
  return out;
}

/** Проверки для блока «Проверьте» на обзоре */
export function issues(data) {
  const out = [];
  const docs = data.doctors?.items || [];
  const noRole = docs.filter((d) => !d.hidden && !(d.r || '').trim());
  if (noRole.length) out.push({ title: `${noRole.length} ${plural(noRole.length, 'врач', 'врача', 'врачей')} без должности`, sub: noRole.map((d) => shortName(d.n)).join(', ') + ' — в карточке пустая подпись', href: `#/doctors/${noRole[0].id}` });
  const noPhoto = docs.filter((d) => !d.hidden && !d.img);
  if (noPhoto.length) out.push({ title: `${noPhoto.length} ${plural(noPhoto.length, 'врач', 'врача', 'врачей')} без фото`, sub: noPhoto.map((d) => shortName(d.n)).join(', '), href: `#/doctors/${noPhoto[0].id}` });
  const noCover = (data.media?.items || []).filter((a) => !a.img);
  if (noCover.length) out.push({ title: `${noCover.length} ${plural(noCover.length, 'статья', 'статьи', 'статей')} без обложки`, sub: noCover.map((a) => `«${short(a.t)}»`).join(', ') + ' — на карточке будет серый фон', href: `#/media/${noCover[0].id}` });
  const noAnswer = (data.faq?.items || []).map((q, i) => [q, i]).filter(([q]) => !(q.a || []).length && !(q.list || []).length);
  if (noAnswer.length) out.push({ title: 'Вопрос без ответа', sub: `«${short(noAnswer[0][0].q)}»`, href: `#/faq/${noAnswer[0][1]}` });
  return out;
}

export const plural = (n, one, few, many) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
