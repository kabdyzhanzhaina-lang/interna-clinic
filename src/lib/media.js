// Объединяем 4 «богатые» статьи (с полным текстом) и 13 материалов, перенесённых со старого сайта.
import articles from '../data/articles.json';
import media from '../data/media.json';

const norm = (s) => s.toLowerCase().replace(/[^а-яa-z0-9]+/gi, ' ').trim().slice(0, 30);
const richKeys = articles.map((a) => norm(a.t));
// материалы старого сайта, у которых нет «богатого» двойника по началу заголовка
const rest = media.filter((m) => !richKeys.some((k) => norm(m.t).startsWith(k.slice(0, 18)) || k.startsWith(norm(m.t).slice(0, 18))));
export const ALL_MEDIA = [...articles, ...rest].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
