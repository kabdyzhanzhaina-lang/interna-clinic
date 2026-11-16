// Общие элементы интерфейса: поля формы, верхняя панель, окна, уведомления.
import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RichText } from './blocks.js';
import { addImage, changes, closeModal, dismiss, get, imgSrc, openModal, publish, toast } from './store.js';
import { plural } from './collections.js';

export const Icon = ({ n, cls = '' }) => html`<span class=${'msr ' + cls} aria-hidden="true">${n}</span>`;

/** Текст, который редактируется как строка, а хранится иначе (абзацы, строки) — без потери пустой строки при наборе */
function useTextModel(value, toText, fromText, onChange) {
  const [txt, setTxt] = useState(() => toText(value));
  const own = useRef(JSON.stringify(value ?? null));
  useEffect(() => { const j = JSON.stringify(value ?? null); if (j !== own.current) { own.current = j; setTxt(toText(value)); } }, [value]);
  return [txt, (t) => { setTxt(t); const v = fromText(t); own.current = JSON.stringify(v ?? null); onChange(v); }];
}

const paras = { to: (v) => (v || []).join('\n\n'), from: (t) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) };
const lines = { to: (v) => (v || []).join('\n'), from: (t) => { const a = t.split('\n').map((x) => x.trim()).filter(Boolean); return a.length ? a : undefined; } };

function ModelArea({ value, onChange, model, rows = 6 }) {
  const [txt, setTxt] = useTextModel(value, model.to, model.from, onChange);
  return html`<textarea class="inp" rows=${rows} value=${txt} onInput=${(e) => setTxt(e.target.value)}></textarea>`;
}

export function Tags({ value = [], onChange }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim(); if (t && !value.includes(t)) onChange([...value, t]); setV(''); };
  return html`<div class="tags">
    ${value.filter(Boolean).map((t) => html`<span class="tag">${t}<button type="button" title="Убрать" onClick=${() => onChange(value.filter((x) => x !== t))}><${Icon} n="close" /></button></span>`)}
    <input class="tag-add" placeholder="+ добавить тег" value=${v} onInput=${(e) => setV(e.target.value)}
      onKeyDown=${(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur=${add} />
  </div>`;
}

export const Toggle = ({ checked, onChange, title, sub }) => html`<label class="toggle">
  <input type="checkbox" checked=${!!checked} onChange=${(e) => onChange(e.target.checked)} /><i></i>
  <div><b>${title}</b>${sub && html`<span>${sub}</span>`}</div>
</label>`;

export function ImagePick({ value, onChange, dir, base, round, maxW, format = 'key', hint }) {
  const inp = useRef();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    setBusy(true);
    try { const key = await addImage(f, dir, base(), maxW); onChange(format === 'path' ? `/images/${key}.webp` : key); }
    catch (err) { toast({ kind: 'err', title: 'Фото не загрузилось', text: err.message }); }
    setBusy(false);
  };
  const src = imgSrc(value);
  return html`<div class="photo">
    <div class=${'ph' + (round ? '' : ' sq')}>${src ? html`<img src=${src} alt="" />` : html`<${Icon} n="photo_camera" />`}</div>
    <div>
      <div class="acts">
        <button type="button" class="btn btn-line btn-sm" disabled=${busy} onClick=${() => inp.current.click()}><${Icon} n="photo_camera" />${busy ? 'Сжимаем…' : value ? 'Заменить фото' : 'Загрузить фото'}</button>
        ${value && html`<button type="button" class="text-btn" onClick=${() => onChange('')}>Удалить</button>`}
      </div>
      <div class="hint">${hint || 'JPG или PNG — сожмём в WebP сами'}</div>
      <input ref=${inp} class="file-hidden" type="file" accept="image/*" onChange=${pick} />
    </div>
  </div>`;
}

/** Поле по описанию из collections.js */
export function Field({ f, item, set }) {
  const v = item[f.key];
  const on = (x) => set({ [f.key]: x });
  const label = html`<label>${f.label}${f.opt && html`<em>необязательно</em>`}</label>`;
  let input;
  switch (f.type) {
    case 'textarea': input = f.max
      ? html`<div class="ta-wrap"><textarea class="inp" rows="3" value=${v || ''} onInput=${(e) => on(e.target.value)}></textarea><span class=${'counter' + ((v || '').length > f.max ? ' over' : '')}>${(v || '').length} / ${f.max}</span></div>`
      : html`<textarea class="inp" rows="4" value=${v || ''} onInput=${(e) => on(e.target.value)}></textarea>`; break;
    case 'select': input = html`<select class="inp" value=${v ?? ''} onChange=${(e) => on(e.target.value)}>${(typeof f.options === 'function' ? f.options(item) : f.options).map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select>`; break;
    case 'checks': input = html`<div class="checks">${f.options(item).map(([k, l]) => html`<label class="chk"><input type="checkbox" checked=${(v || []).includes(k)} onChange=${(e) => on(e.target.checked ? [...(v || []), k] : (v || []).filter((x) => x !== k))} /><span>${l}</span></label>`)}</div>`; break;
    case 'rows': input = html`<${Rows} f=${f} value=${v || []} onChange=${on} />`; break;
    case 'list': input = html`<${SubList} f=${f} value=${v || []} onChange=${on} />`; break;
    case 'tags': input = html`<${Tags} value=${v || []} onChange=${on} />`; break;
    case 'toggle': return html`<div class="f"><${Toggle} checked=${v} onChange=${(x) => on(x || (f.keep ? false : undefined))} title=${f.label} sub=${f.hint} /></div>`;
    case 'blocks': input = html`<${RichText} value=${v || []} onChange=${on} variant=${f.variant} />`; break;
    case 'paras': input = html`<${ModelArea} value=${v} onChange=${on} model=${paras} />`; break;
    case 'lines': input = html`<${ModelArea} value=${v} onChange=${on} model=${lines} rows="4" />`; break;
    case 'image': input = html`<${ImagePick} value=${v} onChange=${on} dir=${f.dir} format=${f.format} maxW=${f.width} base=${() => item.name || item.t || item.title || 'img'} />`; break;
    case 'groups': input = html`<${Groups} value=${v || []} onChange=${on} />`; break;
    case 'date': input = html`<input class="inp" type="date" value=${v || ''} onInput=${(e) => on(e.target.value)} />`; break;
    default: input = html`<input class="inp${!f.opt && !(v || '').trim() && f.key === 'r' ? ' amber' : ''}" value=${v || ''} onInput=${(e) => on(e.target.value)} />`;
  }
  return html`<div class="f">${f.noLabel ? '' : label}${input}${f.hint && f.type !== 'toggle' && !f.hintAbove && html`<div class="hint">${f.hint}</div>`}</div>`;
}

const move = (list, i, d) => { const j = i + d; if (j < 0 || j >= list.length) return list; const l = list.slice(); [l[i], l[j]] = [l[j], l[i]]; return l; };
const RowBtns = ({ list, i, onChange, what }) => html`<span class="rbtns">
  <button type="button" class="icon-btn" title="Выше" disabled=${i === 0} onClick=${() => onChange(move(list, i, -1))}><${Icon} n="keyboard_arrow_up" /></button>
  <button type="button" class="icon-btn" title="Ниже" disabled=${i === list.length - 1} onClick=${() => onChange(move(list, i, 1))}><${Icon} n="keyboard_arrow_down" /></button>
  <button type="button" class="icon-btn danger" title=${'Удалить ' + what} onClick=${() => onChange(list.filter((_, j) => j !== i))}><${Icon} n="delete" /></button></span>`;

/** Таблица строк-массивов: факты, цены, шаги, вопросы… cols — [{ label, area }]; лишние столбцы в данных не трогаем */
function Rows({ f, value, onChange }) {
  const setCell = (i, c, x) => onChange(value.map((r, j) => (j === i ? Object.assign(r.slice(), { [c]: x }) : r)));
  const blank = f.blankRow || f.cols.map(() => '');
  return html`<div class="rows">
    ${value.map((r, i) => html`<div class="rowc">
      <div class="rowf">${f.cols.map((c, ci) => html`<div class=${'cell' + (c.area ? ' wide' : '')}><span>${c.label}</span>${c.area
        ? html`<textarea class="inp" rows="2" value=${r[ci] ?? ''} onInput=${(e) => setCell(i, ci, e.target.value)}></textarea>`
        : html`<input class="inp" value=${r[ci] ?? ''} onInput=${(e) => setCell(i, ci, e.target.value)} />`}</div>`)}</div>
      <${RowBtns} list=${value} i=${i} onChange=${onChange} what="строку" />
    </div>`)}
    <button type="button" class="btn btn-line btn-sm" onClick=${() => onChange([...value, blank.slice()])}><${Icon} n="add" />${f.add || 'Добавить строку'}</button>
  </div>`;
}

/** Список объектов с вложенными полями (преимущества KIDS, списки профессора…) */
function SubList({ f, value, onChange }) {
  const blank = () => Object.fromEntries(f.sub.map((x) => [x.key, x.type === 'lines' ? [] : '']));
  return html`<div class="rows">
    ${value.map((it, i) => html`<div class="rowc sub">
      <div class="rowf">${f.sub.map((x) => html`<${Field} f=${x} item=${it} set=${(p) => onChange(value.map((y, j) => (j === i ? { ...y, ...p } : y)))} />`)}</div>
      <${RowBtns} list=${value} i=${i} onChange=${onChange} what="пункт" />
    </div>`)}
    <button type="button" class="btn btn-line btn-sm" onClick=${() => onChange([...value, blank()])}><${Icon} n="add" />${f.add || 'Добавить'}</button>
  </div>`;
}

/** Состав программы: группы с отметками «входит / не входит» */
function Groups({ value, onChange }) {
  const flip = (gi, ii) => onChange(value.map((g, a) => (a !== gi ? g : { ...g, items: g.items.map((x, b) => (b === ii ? { ...x, in: !x.in } : x)) })));
  const all = (gi, on) => onChange(value.map((g, a) => (a !== gi ? g : { ...g, items: g.items.map((x) => ({ ...x, in: on })) })));
  return html`<div class="groups">${value.map((g, gi) => { const n = g.items.filter((x) => x.in).length; return html`<div class="grp">
    <div class="grp-h"><b>${g.title}</b><span>${n} из ${g.items.length}</span><button type="button" class="link" onClick=${() => all(gi, n < g.items.length)}>${n < g.items.length ? 'Отметить все' : 'Снять все'}</button></div>
    ${g.items.map((x, ii) => html`<label class="chk"><input type="checkbox" checked=${!!x.in} onChange=${() => flip(gi, ii)} /><span>${x.n}</span></label>`)}
  </div>`; })}</div>`;
}

export function Unsaved() {
  const n = changes().length;
  return n ? html`<span class="unsaved"><i></i>${n} ${plural(n, 'несохранённое изменение', 'несохранённых изменения', 'несохранённых изменений')}</span>` : html`<span class="unsaved clean">Все изменения опубликованы</span>`;
}

export const PublishBtn = () => {
  const n = changes().length;
  return html`<button class="btn btn-primary" disabled=${!n || get().publishing} onClick=${askPublish}><${Icon} n="cloud_upload" />Опубликовать</button>`;
};

/** Верхняя панель редактора: ← Раздел / Запись · [статус] … [дети] · несохранённые · Отменить · Опубликовать */
export function Topbar({ crumbs, children, onCancel, cancelDisabled, status, right }) {
  const [[parent, back], [cur]] = crumbs;
  return html`<div class="topbar">
    <div class="crumbs"><a class="back-btn" href=${back} title=${parent}><${Icon} n="arrow_back" /></a><a href=${back}>${parent}</a><span class="sep">/</span><b title=${cur}>${cur}</b>${status}</div>
    <div class="actions">
      ${children}
      ${right ?? html`<${Unsaved} />`}
      ${onCancel && html`<button class="btn btn-line" disabled=${cancelDisabled} onClick=${onCancel}>Отменить</button>`}
      <${PublishBtn} />
    </div>
  </div>`;
}

export function askPublish() {
  const list = changes();
  if (!list.length) return;
  openModal(() => html`<div class="modal">
    <div class="mhead"><h2>Опубликовать ${list.length} ${plural(list.length, 'изменение', 'изменения', 'изменений')}?</h2>
    <div class="sub">${get().user?.local ? 'Файлы сохранятся в проект на этом компьютере.' : 'Сайт обновится через 1–2 минуты. Любую правку можно откатить в истории.'}</div></div>
    <div class="diff">${list.map((c) => html`<div><b>${c.what}</b>${(c.old || c.new) && html`<span class="d">${c.old && html`<s>${c.old}</s><${Icon} n="arrow_forward" />`}<ins>${c.new}</ins></span>`}</div>`)}</div>
    <div class="acts"><button class="btn btn-line" onClick=${closeModal}>Вернуться к правке</button><button class="btn btn-primary" onClick=${publish}><${Icon} n="cloud_upload" />Опубликовать</button></div>
  </div>`);
}

export function confirmDelete({ title, text, onDelete, onHide }) {
  openModal(() => html`<div class="modal sm">
    <div class="mic red"><${Icon} n="delete" /></div>
    <h2>${title}</h2>
    <div class="sub">${text}</div>
    <div class="acts">
      ${onHide ? html`<button class="btn btn-line" onClick=${() => { closeModal(); onHide(); }}><${Icon} n="visibility_off" />Скрыть</button>` : html`<button class="btn btn-line" onClick=${closeModal}>Отмена</button>`}
      <button class="btn btn-red" onClick=${() => { closeModal(); onDelete(); }}>Удалить</button>
    </div>
  </div>`);
}

export function askText({ title, label, value = '', ok = 'Готово', onOk }) {
  function Body() {
    const [v, setV] = useState(value);
    const done = () => { if (v.trim()) { closeModal(); onOk(v.trim()); } };
    return html`<div class="modal sm">
      <h2>${title}</h2>
      <div class="f"><label>${label}</label><input class="inp" autofocus value=${v} onInput=${(e) => setV(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && done()} /></div>
      <div class="acts"><button class="btn btn-line" onClick=${closeModal}>Отмена</button><button class="btn btn-primary" disabled=${!v.trim()} onClick=${done}>${ok}</button></div>
    </div>`;
  }
  openModal(() => html`<${Body} />`);
}

export function Overlays() {
  const s = get();
  return html`
    ${s.modal && html`<div class="modal-bg" onMouseDown=${(e) => e.target === e.currentTarget && closeModal()}>${s.modal()}</div>`}
    <div class="toasts" aria-live="polite">${s.toasts.map((t) => html`<div class=${'toast ' + (t.kind || '')}>
      <span class="iw"><${Icon} n=${t.kind === 'ok' ? 'check_circle' : t.kind === 'err' ? 'error' : t.kind === 'busy' ? 'progress_activity' : 'check'} cls=${t.kind === 'busy' ? 'spin' : ''} /></span>
      <div class="t"><b>${t.title}</b>${t.text && html`<span>${t.text}</span>`}${t.kind === 'busy' && html`<div class="bar"><i></i></div>`}</div>
      ${t.action && html`<button onClick=${() => { dismiss(t.id); t.action.fn(); }}>${t.action.label}</button>`}
      ${t.href && html`<a href=${t.href} target="_blank" rel="noopener">Открыть</a>`}
    </div>`)}</div>`;
}

export const Empty = ({ icon, title, text, action }) => html`<div class="empty"><span class="iw"><${Icon} n=${icon} /></span><h3>${title}</h3><p>${text}</p>${action}</div>`;
