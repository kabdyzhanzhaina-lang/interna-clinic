// Медиацентр: 13 материалов старого сайта, перенесённых полностью (scripts/migrate-articles.mjs)
import media from '../data/media.json';

export const ALL_MEDIA = [...media].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** ISO-дата → «25 сентября 2025» */
export const fmtDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso || ''; };
/** Первый абзац для анонса */
export const excerpt = (a, n = 140) => { const p = a.body.find((b) => b[0] === 'p'); return p ? p[1].slice(0, n) : ''; };
