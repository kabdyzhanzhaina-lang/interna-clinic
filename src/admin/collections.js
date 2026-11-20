// Разделы админки: какой файл, какие поля, как называть запись в списке и в истории правок.
import { get } from './store.js';
import { ruStrings } from '../lib/i18n-strings.js';

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
    title: (p) => p.t || 'Новая акция', sub: (p) => [p.hidden && 'скрыта', p.p, p.off].filter(Boolean).join(' · '),
    fields: [
      { key: 't', label: 'Название' },
      { key: 'd', label: 'Описание', type: 'textarea' },
      { key: 'p', label: 'Цена', hint: 'например «330 000 ₸»' },
      { key: 'old', label: 'Старая цена', opt: true },
      { key: 'off', label: 'Скидка', opt: true, hint: 'например «−13%»' },
      { key: 'link', label: 'Ссылка на услугу', opt: true, hint: 'адрес страницы на сайте, например /uslugi/capsule' },
      { key: 'until', label: 'Действует до', type: 'date', opt: true, hint: 'после этой даты акция исчезает с сайта автоматически' },
      { key: 'hot', label: 'Выделить на сайте', type: 'toggle', keep: true },
      { key: 'hidden', label: 'Скрыть с сайта', type: 'toggle', hint: 'акция останется здесь, но на сайте пропадёт — удобно, чтобы поставить на паузу' },
    ],
    blank: () => ({ id: '', t: '', d: '', p: '', old: '', off: '', link: '', until: '', hot: false }),
  },
  news: {
    label: 'Новости', one: 'новость', icon: 'newspaper', file: 'src/data/news.json', idKey: 'id',
    title: (n) => n.title || 'Новая новость', sub: (n) => [fmtDay(n.date), n.tag].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Заголовок' },
      { key: 'date', label: 'Дата', type: 'date' },
      { key: 'tag', label: 'Рубрика', hint: 'Акция, Стационар, Врачи, Школы…' },
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
  checkups: {
    label: 'Чек-апы', one: 'программу', icon: 'checklist', file: 'src/data/checkups.json', idKey: 'id', addAt: 'end',
    title: (p) => p.title || 'Новая программа', sub: (p) => [p.price, `${checkCount(p)} ${plural(checkCount(p), 'пункт', 'пункта', 'пунктов')}`, p.hot && 'выделена', p.homeOn && 'на главной'].filter(Boolean).join(' · '),
    // checkups.json — { programs, directions }; карточка на главной (home) в форме разложена на отдельные поля
    toData: (raw) => ({ items: raw.programs.map(({ home, ...p }) => ({ ...p, homeOn: !!home, homeEb: home?.eb || '', homeHi: home?.hi || [] })), directions: raw.directions }),
    fromData: (data) => ({ programs: data.items.map(({ homeOn, homeEb, homeHi, groups, ...p }) => ({ ...p, ...(homeOn ? { home: { eb: homeEb || '', hi: homeHi || [] } } : {}), groups })), directions: data.directions }),
    extraKeys: [['directions', 'Профильные программы']],
    fields: [
      { key: 'title', label: 'Название', hint: 'вкладка на /checkup и вариант в форме заявки' },
      { key: 'price', label: 'Цена', hint: 'например «от 187 666 ₸» — амбулаторно' },
      { key: 'sub', label: 'Надпись над названием', opt: true, hint: 'например «Полное обследование»; пусто — «Самая востребованная»' },
      { key: 'desc', label: 'Описание на странице чек-апов', type: 'textarea', max: 200 },
      { key: 'brief', label: 'Коротко — в форме заявки', max: 70, hint: 'например «ЖКТ, печень, гастроскопия во сне · 1 день»' },
      { key: 'hot', label: 'Открыта по умолчанию', type: 'toggle', only: true, hint: 'вкладка, которая открыта первой на /checkup и выбрана в заявке; может быть только одна' },
      { key: 'homeOn', label: 'Показывать на главной', type: 'toggle', hint: 'на главной помещаются три программы — первые по порядку' },
      { key: 'homeEb', label: 'Главная — надпись над названием', when: (p) => p.homeOn, hint: 'например «Самая востребованная»' },
      { key: 'homeHi', label: 'Главная — 3 главных пункта', type: 'lines', when: (p) => p.homeOn, hint: 'каждый с новой строки' },
      { key: 'groups', label: 'Состав программы', type: 'groups', hint: 'отметьте, что входит в программу. Список пунктов общий для всех программ' },
    ],
    blank: (list) => ({ id: '', title: '', sub: '', price: '', who: ['f', 'm'], age: ['30', '45', '60'], pain: ['none'], desc: '', brief: '', homeOn: false, homeEb: '', homeHi: [],
      groups: (list[0]?.groups || []).map((g) => ({ title: g.title, items: g.items.map((i) => ({ n: i.n, in: false })) })) }),
  },
  services: {
    label: 'Услуги', one: 'услугу', icon: 'medical_services', file: 'src/data/services.json', idKey: 'id', noAdd: true,
    title: (s) => s.t || 'Услуга', sub: (s) => [s.cat, s.price].filter(Boolean).join(' · '),
    // services.json — объект «адрес → услуга»; в админке показываем как список и собираем обратно при публикации.
    // Подготовка (prep) и оборудование (equip) в форме разложены на отдельные поля
    toData: (map) => ({ items: Object.entries(map).map(([id, { equip, ...s }]) => ({ id, ...s, prepH: s.prep?.h || '', prepSteps: s.prep?.steps || [], prepNote: s.prep?.note || '',
      eqN: equip?.n || '', eqD: equip?.d || '', eqSpecs: equip?.specs || [], eqImg: equip?.img || '', _eq: Object.keys(equip || {}) })) }),
    fromData: (data) => Object.fromEntries(data.items.map(({ id, prepH, prepSteps, prepNote, eqN, eqD, eqSpecs, eqImg, _eq, ...s }) => {
      const prep = s.prep || (prepSteps?.length ? { memo: '' } : null);
      const out = { ...s, ...(prep ? { prep: { ...prep, h: prepH, steps: prepSteps || [], note: prepNote } } : {}) };
      // equip стоит в файле перед doc — сохраняем порядок ключей, чтобы файл не менялся без правок
      const eq = { n: eqN, d: eqD, specs: eqSpecs, img: eqImg };
      const keys = Object.keys(out), at = keys.indexOf('doc');
      const ordered = Object.fromEntries([...keys.slice(0, at < 0 ? keys.length : at).map((k) => [k, out[k]]), ['equip', Object.fromEntries((_eq?.length ? _eq : Object.keys(eq)).map((k) => [k, eq[k]]))], ...(at < 0 ? [] : keys.slice(at).map((k) => [k, out[k]]))]);
      return [id, ordered];
    })),
    fields: [
      { key: 'img', label: 'Фото на обложке страницы', type: 'image', dir: 'services', width: 1600 },
      { key: 't', label: 'Название', hint: 'в меню, карточках и заголовках' },
      { key: 'h1', label: 'Заголовок страницы (H1)' },
      { key: 'cat', label: 'Раздел', hint: 'Эндоскопия, Диагностика, Приём' },
      { key: 'price', label: 'Цена «от»', hint: 'например «82 000 ₸»' },
      { key: 'short', label: 'Коротко — для карточек', type: 'textarea', max: 160 },
      { key: 'sub', label: 'Подзаголовок на странице', type: 'textarea', max: 220 },
      { key: 'facts', label: 'Факты под обложкой', type: 'rows', cols: [{ label: 'Крупно' }, { label: 'Подпись' }], hint: '4 карточки: например «30–40 мин» — «длится исследование»' },
      { key: 'why', label: 'Зачем нужна услуга', type: 'textarea', hint: 'абзац на 3–5 предложений — раздел «Обзор»' },
      { key: 'checks', label: 'Показания', type: 'lines', hint: 'каждый пункт с новой строки' },
      { key: 'steps', label: 'Как проходит', type: 'rows', cols: [{ label: 'Шаг' }, { label: 'Сколько длится' }, { label: 'Описание', area: true }], hint: 'на сайте показываются 4 шага', add: 'Добавить шаг' },
      { key: 'eqN', label: 'Оборудование — название', hint: 'например «Olympus EVIS X1»' },
      { key: 'eqD', label: 'Оборудование — описание', type: 'textarea' },
      { key: 'eqSpecs', label: 'Оборудование — характеристики', type: 'rows', cols: [{ label: 'Параметр' }, { label: 'Значение' }] },
      { key: 'eqImg', label: 'Оборудование — фото', type: 'image', dir: 'equip', width: 1200 },
      { key: 'doc', label: 'Ведущий врач', type: 'select', options: () => [['', '— не выбран —'], ...docOptions()], hint: 'первый в блоке «Кто принимает»' },
      { key: 'prices', label: 'Цены на странице', type: 'rows', cols: [{ label: 'Услуга' }, { label: 'Уточнение' }, { label: 'Цена' }], hint: 'общий прайс клиники меняется в разделе «Прайс»', add: 'Добавить цену' },
      { key: 'faq', label: 'Вопросы и ответы', type: 'rows', cols: [{ label: 'Вопрос' }, { label: 'Ответ', area: true }], add: 'Добавить вопрос' },
      { key: 'related', label: 'Связанные услуги', type: 'checks', options: (it) => (get().data.services?.items || []).filter((x) => x.id !== it.id).map((x) => [x.id, x.t]), hint: 'на сайте видны первые три' },
      { key: 'prepH', label: 'Подготовка — заголовок', opt: true, hint: 'например «Как подготовиться к видеоколоноскопии»', when: (s) => !!s.prep || s.prepSteps?.length },
      { key: 'prepSteps', label: 'Подготовка — шаги', type: 'lines', opt: true, hint: 'до 6 коротких шагов, каждый с новой строки', when: (s) => !!s.prep || s.prepSteps?.length },
      { key: 'prepNote', label: 'Подготовка — важное', type: 'textarea', opt: true, hint: 'предупреждение в розовой карточке', when: (s) => !!s.prep || s.prepSteps?.length },
    ],
    blank: () => ({ id: '', t: '', h1: '', cat: '', price: '', short: '', sub: '', why: '', checks: [], prepH: '', prepSteps: [], prepNote: '' }),
  },
  extra: {
    label: 'Страницы услуг', one: 'страницу', icon: 'web', file: 'src/data/services_extra.json', idKey: 'id', addAt: 'end',
    title: (s) => s.t || 'Новая страница', sub: (s) => ['/uslugi/' + (String(s.id).startsWith('new-') ? '…' : s.id), s.cat].filter(Boolean).join(' · '),
    // services_extra.json — объект «адрес → страница» (страницы /uslugi/…, перенесённые со старого сайта)
    toData: (map) => ({ items: Object.entries(map).map(([id, s]) => ({ id, ...s })) }),
    fromData: (data) => Object.fromEntries(data.items.map(({ id, ...s }) => [id, s])),
    fields: [
      { key: 't', label: 'Название', hint: 'в меню «Услуги», на обложке и в поиске по сайту' },
      { key: 'h1', label: 'Заголовок раздела «Зачем»' },
      { key: 'cat', label: 'Раздел', hint: 'Приём врача, Эндоскопические процедуры, УЗИ, Функциональная диагностика…' },
      { key: 'lead', label: 'Вводный абзац', type: 'textarea', hint: 'первые два предложения — подзаголовок на обложке' },
      { key: 'body', label: 'Текст страницы', type: 'blocks', hint: 'списки под заголовками о симптомах и показаниях сайт сам покажет в блоке «Когда стоит записаться»' },
      { key: 'title', label: 'Заголовок для Google', opt: true, max: 70, hint: 'title страницы; пусто — «Заголовок — Interna Clinic»' },
      { key: 'description', label: 'Описание для Google', type: 'textarea', opt: true, max: 170, hint: 'пусто — возьмём вводный абзац' },
    ],
    blank: () => ({ id: '', t: '', h1: '', cat: 'Приём врача', icon: 'stethoscope', title: '', description: '', lead: '', paragraphs: [], body: [] }),
  },
  kids: {
    label: 'Interna KIDS', one: 'направление', icon: 'child_care', file: 'src/data/kids.json', idKey: 'id', addAt: 'end',
    title: (s) => s.t || 'Новое направление', sub: (s) => [s.price, '/kids/' + (String(s.id).startsWith('new-') ? '…' : s.id)].filter(Boolean).join(' · '),
    toData: ({ services, ...rest }) => ({ ...rest, items: services }),
    fromData: ({ items, ...rest }) => ({ ...rest, services: items }),
    fileFields: [
      { key: 'welcome', label: 'Приветствие на странице /kids', type: 'textarea' },
      { key: 'features', label: 'Почему Interna KIDS — карточки', type: 'list', sub: [{ key: 't', label: 'Заголовок' }, { key: 'd', label: 'Текст', type: 'textarea' }], add: 'Добавить карточку' },
    ],
    fields: [
      { key: 'icon', label: 'Иконка', type: 'image', dir: 'kids', format: 'path', width: 200, hint: 'квадратная, на прозрачном фоне' },
      { key: 't', label: 'Название', hint: 'например «Детский эндокринолог»' },
      { key: 'full', label: 'Заголовок страницы' },
      { key: 'price', label: 'Цена приёма', opt: true },
      { key: 'note', label: 'Примечание', type: 'textarea', opt: true, hint: 'например «онлайн-консультации не проводятся»' },
      { key: 'body', label: 'Текст страницы', type: 'blocks' },
    ],
    blank: () => ({ id: '', t: '', full: '', price: '', note: '', icon: '', body: [] }),
  },
  free: {
    label: 'Бесплатно и ОСМС', one: 'программу', icon: 'volunteer_activism', file: 'src/data/free.json', idKey: 'id', addAt: 'end',
    title: (s) => s.t || 'Новая программа', sub: (s) => s.lead,
    fileFields: [{ key: 'intro', label: 'Вводный текст на странице /promo', type: 'paras', hint: 'абзацы разделяйте пустой строкой' }],
    fields: [
      { key: 't', label: 'Название' },
      { key: 'lead', label: 'Коротко', type: 'textarea', max: 220 },
      { key: 'body', label: 'Подробно', type: 'blocks' },
      { key: 'link', label: 'Ссылка', opt: true, hint: 'например /service/fibroscan' },
    ],
    blank: () => ({ id: '', t: '', lead: '', body: [], link: '' }),
  },
  prepare: {
    label: 'Подготовка', one: 'памятку', icon: 'assignment', file: 'src/data/prepare.json', idKey: 'id', addAt: 'end',
    title: (s) => s.title || 'Новая памятка', sub: (s) => '#' + s.id,
    // prepare.json — { updated, sections, professor: { name, doc, lists } }; профессора раскладываем на поля страницы
    toData: ({ sections, professor, ...rest }) => ({ ...rest, items: sections, profName: professor.name, profDoc: professor.doc, profLists: professor.lists }),
    fromData: ({ items, profName, profDoc, profLists, ...rest }) => ({ ...rest, sections: items, professor: { name: profName, doc: profDoc, lists: profLists } }),
    fileFields: [
      { key: 'updated', label: 'Обновлено', hint: 'месяц в формате ГГГГ-ММ, например 2026-09' },
      { key: 'profName', label: 'Рекомендации профессора — ФИО' },
      { key: 'profDoc', label: 'Рекомендации профессора — врач для записи', type: 'select', options: () => docOptions() },
      { key: 'profLists', label: 'Рекомендации профессора — списки', type: 'list', sub: [{ key: 'title', label: 'Заголовок' }, { key: 'items', label: 'Пункты', type: 'lines', hint: 'каждый с новой строки' }], add: 'Добавить список' },
    ],
    fields: [
      { key: 'title', label: 'Заголовок', hint: 'например «Подготовка к видеоколоноскопии»' },
      { key: 'body', label: 'Текст памятки', type: 'blocks' },
    ],
    blank: () => ({ id: '', title: '', body: [] }),
  },
  legal: {
    label: 'Документы', one: 'документ', icon: 'gavel', file: 'src/data/legal.json', idKey: 'id', noAdd: true,
    title: (d) => d.title, sub: (d) => d.date || d.approved,
    // legal.json — { oferta, rules, requisites }: два документа показываем списком
    toData: ({ oferta, rules, requisites }) => ({ items: [{ id: 'oferta', ...oferta }, { id: 'rules', ...rules }], requisites }),
    fromData: ({ items, requisites }) => { const [o, r] = ['oferta', 'rules'].map((k) => (({ id, ...x }) => x)(items.find((x) => x.id === k))); return { oferta: o, rules: r, requisites }; },
    fileFields: [{ key: 'requisites', label: 'Реквизиты', type: 'lines', hint: 'каждая строка с новой строки' }],
    fields: [
      { key: 'title', label: 'Название' },
      { key: 'date', label: 'Дата', when: (d) => d.id === 'oferta', hint: 'например «17 октября 2022 года»' },
      { key: 'approved', label: 'Кем утверждены', when: (d) => d.id === 'rules' },
      { key: 'body', label: 'Текст', type: 'blocks' },
    ],
  },
  site: {
    label: 'Контакты', icon: 'contact_phone', file: 'src/data/site.json', single: true,
    toData: (raw) => ({ ...raw, items: [] }), fromData: ({ items, ...raw }) => raw,
    fileFields: [
      { key: 'phone', label: 'Телефон', hint: 'например «+7 705 926 2300» — ссылка для звонка соберётся сама' },
      { key: 'whatsapp', label: 'WhatsApp', hint: 'ссылка вида https://wa.me/77007110550' },
      { key: 'email', label: 'Почта' },
      { key: 'address', label: 'Адрес' },
      { key: 'map2gis', label: 'Ссылка на 2ГИС' },
      { key: 'hours', label: 'Часы работы', type: 'rows', cols: [{ label: 'Дни' }, { label: 'Время' }] },
      { key: 'hoursShort', label: 'Часы работы одной строкой', hint: 'для шапки и подвала' },
      { key: 'social', label: 'Соцсети', type: 'rows', cols: [{ label: 'Название' }, { label: 'Ссылка' }], blankRow: ['', '', 'public'], add: 'Добавить соцсеть' },
      { key: 'legalName', label: 'Юр. лицо' },
      { key: 'bin', label: 'БИН' },
      { key: 'license', label: 'Лицензия' },
    ],
  },
  access: {
    label: 'Доступ', icon: 'admin_panel_settings', file: 'src/data/admin-roles.json', single: true,
    // кто какие разделы правит: admins — всё, включая этот раздел; editors — только отмеченные; остальные с доступом к репозиторию — всё, кроме «Доступа»
    toData: (raw) => ({ admins: raw.admins || [], editors: Object.entries(raw.editors || {}).map(([login, sections]) => ({ login, sections })), items: [] }),
    fromData: (d) => ({ admins: d.admins, editors: Object.fromEntries(d.editors.filter((e) => e.login.trim()).map((e) => [e.login.trim(), e.sections || []])) }),
    fileFields: [
      { key: 'admins', label: 'Администраторы', type: 'lines', hint: 'GitHub-логины, по одному в строке. Видят все разделы и этот. Пока список пуст, раздел доступен всем' },
      { key: 'editors', label: 'Редакторы с ограниченным доступом', type: 'list', add: 'Добавить редактора', hint: 'видят и публикуют только отмеченные разделы; кого нет в списках — правят всё, кроме «Доступа». Это ограничение админки: полностью закрыть файлы можно только правами в GitHub', sub: [
        { key: 'login', label: 'GitHub-логин' },
        { key: 'sections', label: 'Разделы', type: 'checks', options: () => NAV.filter((n) => n.key && n.key !== 'access').map((n) => [n.key, n.label]) },
      ] },
    ],
  },
  kk: {
    label: 'Переводы', icon: 'translate', file: 'src/i18n/kk.json', single: true,
    // словарь «русская строка → казахская» для /kk/…; в админке — список строк без перевода (screens.js → Translations)
    toData: (raw) => ({ dict: raw, items: [] }), fromData: (d) => d.dict,
    count: (data) => missingKk(data).length || null,
    diff: (a, b) => {
      const A = a.dict, B = b.dict, n = (f) => Object.keys(f).length;
      const add = Object.keys(B).filter((k) => A[k] == null), ch = Object.keys(B).filter((k) => A[k] != null && A[k] !== B[k]), del = Object.keys(A).filter((k) => B[k] == null);
      return [[add, 'добавлен'], [ch, 'изменён'], [del, 'удалён']].filter(([l]) => l.length).map(([l, w]) => ({ what: `Казахский: ${w} перевод ${l.length > 1 ? `${l.length} строк` : `«${short(l[0])}»`}`, old: '', new: n(B) + ' в словаре' }));
    },
  },
  kkskip: {
    label: 'Не переводить', file: 'src/i18n/kk-skip.json', single: true,
    toData: (raw) => ({ list: raw, items: [] }), fromData: (d) => d.list,
    diff: (a, b) => { const A = new Set(a.list), B = new Set(b.list), add = b.list.filter((x) => !A.has(x)), del = a.list.filter((x) => !B.has(x));
      return [...add.map((t) => ({ what: `Казахский: не переводить «${short(t)}»`, old: '', new: '' })), ...del.map((t) => ({ what: `Казахский: снова переводить «${short(t)}»`, old: '', new: '' }))]; },
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

/* ── Казахский: строки из данных, которых нет ни в словаре, ни в списке «не переводить» ── */
export const KK_SOURCES = ['doctors', 'prices', 'checkups', 'promos', 'news', 'events', 'media', 'reviews', 'faq', 'vacancies', 'services', 'equipment', 'extra', 'kids', 'free', 'prepare', 'legal', 'site'];
export const rawOf = (k, d) => (COLLECTIONS[k]?.fromData && d ? COLLECTIONS[k].fromData(d) : d);
const strCache = new WeakMap(); // данные неизменяемые — пересчитываем только изменённый раздел
export const stringsOf = (k, d) => { if (!d) return new Map(); let m = strCache.get(d); if (!m) { m = ruStrings(rawOf(k, d)); strCache.set(d, m); } return m; };
export function missingKk(data) {
  const dict = data.kk?.dict || {}, skip = new Set(data.kkskip?.list || []), seen = new Set(), out = [];
  for (const k of KK_SOURCES) for (const [t, path] of stringsOf(k, data[k])) {
    if (dict[t] != null || skip.has(t) || seen.has(t)) continue;
    seen.add(t); out.push({ t, k, path });
  }
  return out;
}

const docOptions = () => (get().data.doctors?.items || []).filter((d) => !d.hidden).map((d) => [d.id, shortName(d.n)]);
export const checkCount = (p) => (p.groups || []).reduce((n, g) => n + g.items.filter((i) => i.in).length, 0);
export const PRICES_FILE = 'src/data/prices.json';
export const NAV = [['', 'Обзор', 'dashboard'], ['doctors'], ['prices', 'Прайс', 'payments'], ['checkups'], ['promos'], ['news'], ['events'], ['media'], ['services'], ['reviews'], ['faq'], ['vacancies'], ['equipment'],
  ['|', 'Страницы'], ['extra'], ['kids'], ['prepare'], ['legal'], ['site'], ['kk'], ['access']]
  .map(([k, l, i]) => (k === '|' ? { cap: l } : l ? { key: k, label: l, icon: i } : { key: k, label: COLLECTIONS[k].label, icon: COLLECTIONS[k].icon }));

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
const labelOf = (c, key) => [...(c.fields || []), ...(c.fileFields || [])].find((f) => f.key === key)?.label || { img: 'Фото', hidden: 'Показ на сайте', id: 'Адрес', t: 'Заголовок', body: 'Текст', tag: 'Рубрика', by: 'Автор', doc: 'Врач', date: 'Дата', min: 'Время чтения', video: 'Видео', url: 'Адрес на старом сайте' }[key] || key;
const nameOf = (key, c, item) => (key === 'doctors' ? shortName(c.title(item)) : `«${short(c.title(item))}»`);

export function diffCollection(key, before, after) {
  const c = COLLECTIONS[key], out = [];
  if (c.diff) return c.diff(before, after);
  for (const f of c.fileFields || []) if (!same(before[f.key], after[f.key])) {
    const text = typeof after[f.key] === 'string' && !['textarea', 'paras'].includes(f.type); // короткую строку показываем целиком: «было → стало»
    out.push({ what: `${c.label} · ${f.label}`, old: text || typeof before[f.key] === 'string' ? short(before[f.key]) : '', new: text ? short(after[f.key]) : 'изменено' });
  }
  for (const [f, label] of c.extraKeys || []) if (!same(before[f], after[f])) out.push({ what: `${c.label} · ${label}`, old: '', new: 'изменены' });
  const A = before.items || [], B = after.items || [];
  const k = (it, i) => (c.idKey ? it[c.idKey] : i);
  const prev = new Map(A.map((it, i) => [k(it, i), it]));
  const next = new Map(B.map((it, i) => [k(it, i), it]));
  B.forEach((it, i) => {
    const o = prev.get(k(it, i));
    if (!o) { out.push({ what: `${c.label}: добавлено ${nameOf(key, c, it)}`, old: '', new: '' }); return; }
    for (const f of new Set([...Object.keys(o), ...Object.keys(it)])) {
      if (same(o[f], it[f])) continue;
      const big = ['about', 'body', 'a', 'list', 'intro'].includes(f) || (Array.isArray(it[f] ?? o[f]) && !(it[f] ?? o[f]).every((x) => typeof x === 'string'));
      if (f === 'groups') { const n = (x) => checkCount({ groups: x }); out.push({ what: `${nameOf(key, c, it)} · состав`, old: `${n(o[f])} пунктов`, new: `${n(it[f])} пунктов` }); continue; }
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
  const kk = data.kk ? missingKk(data).length : 0;
  if (kk) out.push({ title: `${kk} ${plural(kk, 'строка', 'строки', 'строк')} без казахского перевода`, sub: 'Новые тексты на /kk/… пока показываются по-русски', href: '#/kk' });
  const noAnswer = (data.faq?.items || []).map((q, i) => [q, i]).filter(([q]) => !(q.a || []).length && !(q.list || []).length);
  if (noAnswer.length) out.push({ title: 'Вопрос без ответа', sub: `«${short(noAnswer[0][0].q)}»`, href: `#/faq/${noAnswer[0][1]}` });
  return out;
}

export const plural = (n, one, few, many) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };
