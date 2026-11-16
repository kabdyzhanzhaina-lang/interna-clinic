// Какие строки из данных сайта нужно перевести на казахский — те же правила, что в scripts/apply-kk.mjs.
// Используется админкой (раздел «Переводы») и для начального списка «не переводить» (src/i18n/kk-skip.json).

export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

// apply-kk переводит такие строки сам, без словаря: цены, стаж, время чтения, даты, ФИО
const AUTO = [
  /^от [\d\s]+ ₸$/, /^\d+ лет$/, /^\d+ мин (чтения|видео)$/, /^стаж \d+ (лет|года?)$/, /^\d{1,2} [а-я]+ \d{4}$/,
  /^[А-ЯЁӘІҢҒҮҰҚӨҺ][а-яёәіңғүұқөһ-]+( [А-ЯЁӘІҢҒҮҰҚӨҺ][а-яёәіңғүұқөһ-]+){0,2}$/,
];
// служебные поля: адреса, картинки, коды
const SKIP_KEYS = new Set(['id', 'img', 'icon', 'link', 'url', 'src', 'video', 'doc', 'memo', 'href', 'svc', 'whatsapp', 'map2gis', 'email', 'phone']);

export const needsKk = (t) => /[А-Яа-яЁё]/.test(t) && !/^(https?:|\/|#)/.test(t) && !AUTO.some((r) => r.test(t));

/** Все строки файла данных, которые видны на сайте: Map «строка → путь в файле» (первое вхождение) */
export function ruStrings(value, out = new Map(), path = '') {
  if (typeof value === 'string') { const t = norm(value); if (needsKk(t) && !out.has(t)) out.set(t, path); }
  else if (Array.isArray(value)) value.forEach((x, i) => ruStrings(x, out, `${path}/${i}`));
  else if (value && typeof value === 'object') {
    for (const [k, x] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue;
      if (/[А-Яа-яЁё]/.test(k) && !out.has(norm(k))) out.set(norm(k), path); // разделы прайса — ключи объекта
      ruStrings(x, out, `${path}/${k}`);
    }
  }
  return out;
}
