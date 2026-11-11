// Состояние админки: загруженные файлы, черновики правок, картинки к загрузке, публикация одним коммитом.
import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';
import { COLLECTIONS, PRICES_FILE, diffCollection, diffPrices, slugify } from './collections.js';

export const KEYS = ['doctors', 'prices', 'promos', 'news', 'events', 'media', 'reviews', 'faq', 'vacancies', 'services', 'equipment'];
export const fileOf = (k) => (k === 'prices' ? PRICES_FILE : COLLECTIONS[k].file);
const DRAFT_KEY = 'interna-admin-draft';

let S = { boot: true, user: null, files: {}, data: {}, images: {}, history: null, toasts: [], modal: null, savedAt: null, publishing: false };
const subs = new Set();
export const get = () => S;
export function set(patch) { S = { ...S, ...(typeof patch === 'function' ? patch(S) : patch) }; subs.forEach((f) => f()); }
export function useStore() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((x) => x + 1); subs.add(f); f(); return () => subs.delete(f); }, []);
  return S;
}

/* ── Уведомления и окна ── */
let tid = 0;
export function toast(t) {
  const id = ++tid;
  set((s) => ({ toasts: [...s.toasts.filter((x) => !t.replace || x.replace !== t.replace), { id, ...t }] }));
  if (!t.sticky) setTimeout(() => dismiss(id), t.kind === 'err' ? 9000 : 4500);
  return id;
}
export const dismiss = (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
export const openModal = (render) => set({ modal: render });
export const closeModal = () => set({ modal: null });

/* ── Загрузка ── */
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i); return (h >>> 0).toString(36) + s.length; };
const indentOf = (text) => ((text.split('\n')[1] || '').match(/^ */) || [''])[0].length || 1;
// файлы-словари (services.json) в админке хранятся как { items: [...] } — см. toData/fromData в коллекции
const parseFile = (k, text) => { const c = COLLECTIONS[k], raw = JSON.parse(text); return c?.toData ? c.toData(raw) : raw; };
export const serialize = (k, data) => { const f = S.files[k], c = COLLECTIONS[k]; return JSON.stringify(c?.fromData ? c.fromData(data) : data, null, f?.indent || 1) + (f?.nl === false ? '' : '\n'); };

export async function loadAll() {
  const texts = await Promise.all(KEYS.map((k) => api.read(fileOf(k))));
  const files = {}, data = {};
  KEYS.forEach((k, i) => {
    const text = texts[i];
    if (text == null) throw new Error('Нет файла ' + fileOf(k));
    files[k] = { text, data: parseFile(k, text), indent: indentOf(text), nl: text.endsWith('\n'), hash: hash(text) };
    data[k] = files[k].data;
  });
  // черновик из прошлого визита — только если файл с тех пор не менялся
  let images = {}, savedAt = null, stale = 0;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d) {
      for (const [k, v] of Object.entries(d.data || {})) { if (files[k] && d.base?.[k] === files[k].hash) data[k] = v; else stale++; }
      images = Object.fromEntries(Object.entries(d.images || {}).map(([p, b64]) => [p, { b64, url: `data:image/webp;base64,${b64}` }]));
      savedAt = d.savedAt || null;
    }
  } catch {}
  set({ files, data, images, savedAt });
  try { if (sessionStorage.getItem('interna-admin-published')) { sessionStorage.removeItem('interna-admin-published'); if (!S.toasts.length) toast({ kind: 'ok', title: 'Опубликовано', text: S.user?.local ? 'Файлы сохранены в проект' : 'Сайт обновится через 1–2 минуты', href: '/' }); } } catch {}
  if (stale) toast({ kind: 'err', title: 'Часть черновика устарела', text: 'Эти файлы уже изменили на сайте — правки к ним сброшены' });
  loadHistory();
}
export async function loadHistory() { try { set({ history: await api.history() }); } catch { set({ history: [] }); } }

/* ── Правки ── */
export const isDirty = (k) => S.files[k] && JSON.stringify(S.data[k]) !== JSON.stringify(S.files[k].data);
export const dirtyKeys = () => KEYS.filter(isDirty);
export function changes(keys = dirtyKeys()) {
  return keys.flatMap((k) => (k === 'prices' ? diffPrices(S.files[k].data, S.data[k]) : diffCollection(k, S.files[k].data, S.data[k])));
}

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const keys = dirtyKeys();
    const savedAt = keys.length || Object.keys(S.images).length ? new Date().toISOString() : null;
    const draft = { base: Object.fromEntries(keys.map((k) => [k, S.files[k].hash])), data: Object.fromEntries(keys.map((k) => [k, S.data[k]])), savedAt };
    try {
      if (!keys.length) localStorage.removeItem(DRAFT_KEY);
      else {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, images: Object.fromEntries(Object.entries(S.images).map(([p, v]) => [p, v.b64])) })); }
        catch { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } // фото не влезли — сохраняем только тексты
      }
    } catch {}
    set({ savedAt });
  }, 400);
}
export function setData(k, v) { set((s) => ({ data: { ...s.data, [k]: v } })); persist(); }
export const items = (k) => S.data[k]?.items || [];
export function setItems(k, list) { setData(k, { ...S.data[k], items: list }); }
export function patchItem(k, idx, patch) { const list = items(k).slice(); list[idx] = { ...list[idx], ...patch }; setItems(k, list); }
export function revertKey(k) { setData(k, S.files[k].data); }
export const origItem = (k, it) => { const c = COLLECTIONS[k]; return c?.idKey ? (S.files[k].data.items || []).find((x) => x[c.idKey] === it[c.idKey]) : null; };

/* ── Картинки: сжатие в WebP, уникальное имя (картинки на сайте кешируются на год) ── */
export async function addImage(file, dir, base, maxW = 1200) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/webp', 0.84);
  if (!url.startsWith('data:image/webp')) throw new Error('Этот браузер не умеет сохранять WebP — откройте админку в Chrome');
  const key = `${dir}/${slugify(base, 40) || 'img'}-${Date.now().toString(36)}`;
  set((s) => ({ images: { ...s.images, [`public/images/${key}.webp`]: { b64: url.split(',')[1], url } } }));
  persist();
  return key;
}
/** Адрес картинки для показа: свежезагруженная — из памяти, иначе с сайта */
export function imgSrc(v) {
  if (!v) return '';
  const p = v.startsWith('/') ? `public${v}` : `public/images/${v}.webp`;
  return S.images[p]?.url || (v.startsWith('/') ? v : `/images/${v}.webp`);
}

/* ── Публикация ── */
function finalizeIds(k, data) {
  const c = COLLECTIONS[k];
  if (!c?.idKey || !data.items) return data;
  const taken = new Set(data.items.map((x) => x[c.idKey]));
  let changed = false;
  const list = data.items.map((it) => {
    if (!String(it[c.idKey]).startsWith('new-')) return it;
    let id = slugify(c.title(it)) || k, n = 2;
    while (taken.has(id)) id = `${slugify(c.title(it)) || k}-${n++}`;
    taken.add(id); changed = true;
    return { ...it, [c.idKey]: id };
  });
  return changed ? { ...data, items: list } : data;
}

export function commitMessage(list) {
  const one = (c) => c.what + (c.old && c.new ? `: ${c.old} → ${c.new}` : c.new && !c.old ? ` — ${c.new}` : '');
  const head = `Админка: ${one(list[0])}${list.length > 1 ? ` и ещё ${list.length - 1}` : ''}`;
  return list.length > 1 ? `${head}\n\n${list.map((c) => '- ' + one(c)).join('\n')}` : head;
}

export async function publish() {
  if (S.publishing) return;
  const keys = dirtyKeys();
  const all = JSON.stringify(keys.map((k) => S.data[k]));
  const imgs = Object.entries(S.images).filter(([p]) => all.includes(p.replace(/^public\/images\//, '').replace(/\.webp$/, '')));
  if (!keys.length && !imgs.length) return;
  const list = changes(keys);
  closeModal();
  set({ publishing: true });
  const tId = toast({ kind: 'busy', title: 'Публикуем…', text: 'Сохраняем правки', sticky: true, replace: 'pub' });
  try {
    // кто-то мог опубликовать раньше нас — не затираем чужие правки
    const now = await Promise.all(keys.map((k) => api.read(fileOf(k))));
    const conflict = keys.filter((k, i) => now[i] !== S.files[k].text);
    if (conflict.length) throw Object.assign(new Error(`Пока вы правили, файл «${conflict.map((k) => (COLLECTIONS[k]?.label || 'Прайс')).join('», «')}» изменили. Обновите страницу — ваш черновик пропадёт, если не скопировать текст`), { conflict: true });
    const data = Object.fromEntries(keys.map((k) => [k, finalizeIds(k, S.data[k])]));
    const files = [
      ...keys.map((k) => ({ path: fileOf(k), content: serialize(k, data[k]) })),
      ...imgs.map(([path, v]) => ({ path, content: v.b64, encoding: 'base64' })),
    ];
    // локально dev-сервер перезагрузит страницу после записи файлов — уведомление покажем после загрузки
    try { sessionStorage.setItem('interna-admin-published', '1'); localStorage.removeItem(DRAFT_KEY); } catch {}
    await api.commit(files, commitMessage(list.length ? list : [{ what: 'новые фото', old: '', new: '' }]));
    const nextFiles = { ...S.files };
    for (const k of keys) { const text = files.find((f) => f.path === fileOf(k)).content; nextFiles[k] = { ...nextFiles[k], text, data: data[k], hash: hash(text) }; }
    set((s) => ({ files: nextFiles, data: { ...s.data, ...data }, publishing: false }));
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    set({ savedAt: null });
    dismiss(tId);
    try { sessionStorage.removeItem('interna-admin-published'); } catch {}
    toast({ kind: 'ok', title: 'Опубликовано', text: S.user?.local ? 'Файлы сохранены в проект' : 'Сайт обновится через 1–2 минуты', href: '/' });
    loadHistory();
  } catch (e) {
    try { sessionStorage.removeItem('interna-admin-published'); } catch {}
    persist();
    set({ publishing: false });
    dismiss(tId);
    toast({ kind: 'err', title: 'Не удалось опубликовать', text: e.message, sticky: !!e.conflict, action: e.conflict ? null : { label: 'Повторить', fn: publish } });
  }
}

/** Откат: версии файлов до выбранной правки попадают в черновик — их видно в окне публикации */
export async function rollback(sha) {
  const { files, parent } = await api.commitFiles(sha);
  if (!parent) throw new Error('Это самая первая версия');
  const keys = KEYS.filter((k) => files.includes(fileOf(k)));
  if (!keys.length) throw new Error('В этой правке нет изменений текстов');
  const texts = await Promise.all(keys.map((k) => api.read(fileOf(k), parent)));
  const next = { ...S.data };
  keys.forEach((k, i) => { if (texts[i] != null) next[k] = parseFile(k, texts[i]); });
  set({ data: next });
  persist();
  return keys;
}
