// Экраны админки: обзор, врачи, прайс, медиацентр и общие списки (акции, новости, события, отзывы, вопросы, оборудование).
import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RichText, wordCount } from './blocks.js';
import { CATS, COLLECTIONS, KK_SOURCES, fmtDay, issues, missingKk, plural, rawOf, shortName, slugify, stringsOf } from './collections.js';
import { can, changes, isAdmin, closeModal, dirtyKeys, get, imgSrc, isDirty, items, loadHistory, openModal, origItem, patchItem, rollback, setData, setItems, toast } from './store.js';
import { Empty, Field, Icon, ImagePick, PublishBtn, Toggle, Topbar, Unsaved, askPublish, askText, confirmDelete } from './ui.js';

const go = (h) => { location.hash = h; };
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const ADD_AT_END = ['doctors', 'faq', 'equipment', 'checkups'];
const keyOf = (k, it, i) => (COLLECTIONS[k].idKey ? it[COLLECTIONS[k].idKey] : String(i));

export function addItem(k, extra = {}) {
  const c = COLLECTIONS[k];
  const it = { ...c.blank(items(k)), ...extra };
  if (c.idKey) it[c.idKey] = 'new-' + Date.now().toString(36);
  const list = items(k);
  const next = ADD_AT_END.includes(k) || c.addAt === 'end' ? [...list, it] : [it, ...list];
  setItems(k, next);
  go(`#/${k}/${c.idKey ? it[c.idKey] : next.indexOf(it)}`);
}
function findIdx(k, param) {
  const c = COLLECTIONS[k], list = items(k);
  return c.idKey ? list.findIndex((x) => x[c.idKey] === param) : /^\d+$/.test(param) && +param < list.length ? +param : -1;
}
function removeItem(k, idx) { const list = items(k).slice(); list.splice(idx, 1); setItems(k, list); go(`#/${k}`); setTimeout(askPublish, 50); } // удаление сразу предлагаем опубликовать
function revertItem(k, idx) {
  const it = items(k)[idx], o = origItem(k, it) ?? (COLLECTIONS[k].idKey ? null : get().files[k].data.items[idx]);
  if (o) { const list = items(k).slice(); list[idx] = o; setItems(k, list); } else removeItem(k, idx);
}

const NotFound = ({ k }) => html`<div class="page"><div class="table"><${Empty} icon="search_off" title="Запись не найдена" text="Возможно, её удалили или уже опубликовали под новым адресом" action=${html`<a class="btn btn-line" href=${'#/' + k}>К списку</a>`} /></div></div>`;

/** Шапка раздела: Заголовок + «N на сайте» слева, действия справа */
// В списках показываем неопубликованные правки и кнопку публикации — иначе после удаления записи их негде опубликовать
const Head = ({ title, cnt, sub, noPub, children }) => html`<div class=${'head' + (sub ? ' end' : '')}>
  <div class=${'titles' + (sub ? ' v' : '')}><h1>${title}</h1>${cnt && html`<span class="cnt">${cnt}</span>`}${sub && html`<span class="sub">${sub}</span>`}</div>
  <div class="actions">${!noPub && changes().length ? html`<${Unsaved} /><${PublishBtn} />` : ''}${children}</div>
</div>`;
const Search = ({ value, onInput, placeholder, w }) => html`<label class="search" style=${w ? `width:min(${w}px, 100%)` : ''}><${Icon} n="search" /><input placeholder=${placeholder} value=${value} onInput=${onInput} /></label>`;

/* ── Обзор ── */
const ago = (iso) => {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5);
  return days === 0 ? `сегодня, ${t}` : days === 1 ? `вчера, ${t}` : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};
const histIcon = (m = '') => /прайс|цен/i.test(m) ? 'payments' : /новост/i.test(m) ? 'newspaper' : /врач|фото/i.test(m) ? 'stethoscope' : /акци/i.test(m) ? 'sell' : /стать|медиа/i.test(m) ? 'article' : /событ/i.test(m) ? 'event' : /отзыв/i.test(m) ? 'reviews' : /вопрос/i.test(m) ? 'help' : /оборуд/i.test(m) ? 'biotech' : 'edit_note';

export function Overview() {
  const s = get();
  const h = new Date().getHours();
  const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const dirty = dirtyKeys();
  const nPrices = Object.values(s.data.prices).reduce((a, r) => a + r.length, 0);
  const nSecs = Object.keys(s.data.prices).length;
  const nDocs = items('doctors').filter((d) => !d.hidden).length;
  const nPromos = items('promos').length;
  const found = issues(s.data).filter((x) => can(x.href.split('/')[1]));
  const quick = [
    ['#/prices', 'payments', 'var(--ice50)', 'Изменить цену', `${nPrices} ${plural(nPrices, 'позиция', 'позиции', 'позиций')} в ${nSecs} ${plural(nSecs, 'разделе', 'разделах', 'разделах')}`],
    [() => addItem('news'), 'campaign', 'var(--peach)', 'Добавить новость', 'Объявления, ОСМС, график'],
    [() => addItem('promos'), 'sell', 'var(--mint)', 'Запустить акцию', `Сейчас идёт ${nPromos} ${plural(nPromos, 'акция', 'акции', 'акций')}`],
    [() => addItem('doctors'), 'person_add', 'var(--lav)', 'Добавить врача', `${nDocs} ${plural(nDocs, 'врач', 'врача', 'врачей')} на сайте`],
  ].filter((q, i) => can(['prices', 'news', 'promos', 'doctors'][i]));
  const doRollback = (c) => openModal(() => html`<div class="modal sm">
    <div class="mic blue"><${Icon} n="history" /></div>
    <h2>Откатить правку?</h2>
    <div class="sub">«${c.message.replace(/^Админка: /, '')}». Файлы этой правки вернутся к версии до неё — всё, что меняли в них позже, тоже откатится. Список изменений покажем перед публикацией.</div>
    <div class="acts"><button class="btn btn-line" onClick=${closeModal}>Отмена</button><button class="btn btn-primary" onClick=${async () => {
      closeModal();
      try { await rollback(c.sha); askPublish(); } catch (e) { toast({ kind: 'err', title: 'Не получилось откатить', text: e.message }); }
    }}>Подготовить откат</button></div>
  </div>`);
  const first = (s.user?.name || '').split(' ')[0];
  const last = s.history?.[0];

  return html`<div class="page ov">
    <${Head} title=${`${hello}${first && !s.user?.local ? `, ${first}` : ''}`} sub="Что меняем на сайте сегодня?" noPub>
      <a class="btn btn-line" href="/" target="_blank" rel="noopener"><${Icon} n="open_in_new" />internaclinic.kz</a>
    </${Head}>
    <div class=${'card statusbar' + (dirty.length ? ' dirty' : '')}>
      <span class="ic"><${Icon} n=${dirty.length ? 'edit_note' : 'check_circle'} /></span>
      <div>${dirty.length
        ? html`<b>Есть неопубликованные правки</b><span>Они сохранены в этом браузере, но на сайте ещё не видны. Проверьте и опубликуйте — сайт обновится через 1–2 минуты.</span>`
        : html`<b>Сайт в актуальном состоянии</b><span>${last ? `Последняя публикация — ${ago(last.date)}. ` : ''}Новые правки появляются на сайте через 1–2 минуты.</span>`}</div>
      ${dirty.length ? html`<button class="btn btn-primary" onClick=${askPublish}><${Icon} n="cloud_upload" />Опубликовать</button>` : html`<button class="link" onClick=${() => document.getElementById('history').scrollIntoView({ behavior: 'smooth' })}>История правок</button>`}
    </div>
    <div class="ov-block">
      <div class="seclbl">Быстрые действия</div>
      <div class="quick">${quick.map(([to, ic, bg, t, sub]) => html`<a href=${typeof to === 'string' ? to : '#/'} onClick=${typeof to === 'function' ? (e) => { e.preventDefault(); to(); } : undefined}>
        <div class="row"><span class="iw" style=${`background:${bg}`}><${Icon} n=${ic} /></span><${Icon} n="arrow_forward" cls="arr" /></div>
        <div class="t"><b>${t}</b><span>${sub}</span></div></a>`)}</div>
    </div>
    <div class="cols">
      <div class="card recent" id="history">
        <div class="rh"><h2>Последние правки</h2><button class="icon-btn" title="Обновить" onClick=${loadHistory}><${Icon} n="refresh" /></button></div>
        ${s.history == null ? html`<div class="change"><span class="small">Загружаем…</span></div>` : !s.history.length ? html`<div class="change"><span class="small">Правок пока не было</span></div>` : s.history.slice(0, 12).map((c) => html`<div class="change">
          <span class="iw"><${Icon} n=${histIcon(c.message)} /></span>
          <div class="t"><b title=${c.message}>${c.message.replace(/^Админка: /, '')}</b><span>${c.author} · ${ago(c.date)}</span></div>
          ${isAdmin() && html`<button onClick=${() => doRollback(c)}>Откатить</button>`}
        </div>`)}
      </div>
      <div class="card attn">
        <div class="ah"><h2>Проверьте</h2><span class=${'badge' + (found.length ? '' : ' ok')}>${found.length || '✓'}</span></div>
        ${found.length ? found.map((x) => html`<a class="issue" href=${x.href}><b>${x.title}</b><span>${x.sub}</span></a>`)
          : html`<div class="issue ok"><b>Всё заполнено</b><span>Нет врачей без должности и фото, статей без обложки и вопросов без ответа</span></div>`}
      </div>
    </div>
  </div>`;
}

/* ── Врачи ── */
const docStatus = (d) => (d.hidden ? ['off', 'Скрыт'] : !(d.r || '').trim() || !d.img ? ['warn', 'Заполнить'] : ['', 'Показан']);
const DOC_G = 'grid-template-columns:minmax(0,1fr) 180px 110px 120px 170px 24px';

export function Doctors() {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const all = items('doctors');
  const shown = all.filter((d) => !d.hidden).length;
  const ql = q.trim().toLowerCase();
  const list = all.filter((d) => (!cat || d.cat === cat) && (!ql || [d.n, d.r, ...(d.tags || [])].join(' ').toLowerCase().includes(ql)));
  return html`<div class="page">
    <${Head} title="Врачи" cnt=${`${shown} на сайте`}>
      <${Search} value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Поиск по ФИО или должности" />
      <button class="btn btn-primary" onClick=${() => addItem('doctors')}><${Icon} n="add" />Добавить врача</button>
    </${Head}>
    <div class="chips">
      <button class=${'chip' + (!cat ? ' on' : '')} onClick=${() => setCat('')}>Все<b>${all.length}</b></button>
      ${Object.entries(CATS).map(([k, l]) => html`<button class=${'chip' + (cat === k ? ' on' : '')} onClick=${() => setCat(k)}>${l}<b>${all.filter((d) => d.cat === k).length}</b></button>`)}
    </div>
    <div class="table docs">
      <div class="tr th" style=${DOC_G}><span>Врач</span><span>Направление</span><span>Стаж</span><span>Приём</span><span>На сайте</span><span></span></div>
      ${list.map((d) => { const [cls, st] = docStatus(d); const o = origItem('doctors', d); return html`<a class="tr" href=${'#/doctors/' + d.id} style=${DOC_G}>
        <span class="who">${d.img ? html`<img src=${imgSrc(d.img)} alt="" loading="lazy" />` : html`<span class="noimg"><${Icon} n="person" /></span>`}
          <div><b>${d.n || 'Новый врач'}${!same(o, d) && html`<i class="changed-mark" title="Есть неопубликованные правки"></i>`}</b>${(d.r || '').trim() ? html`<span>${d.r}</span>` : html`<span class="miss">Должность не указана</span>`}</div></span>
        <span><span class="pill">${CATS[d.cat] || d.cat}</span></span>
        <span class="cell">${d.exp || '—'}</span><span class="cell b">${d.price || '—'}</span>
        <span class=${'status ' + cls}><i></i>${st}</span>
        <span class="more"><${Icon} n="more_horiz" cls="def" /><${Icon} n="edit" cls="alt" /></span>
      </a>`; })}
      ${!list.length && html`<${Empty} icon="person_search" title="Никого не нашли" text="Попробуйте другое направление или запрос" />`}
    </div>
  </div>`;
}

export function DoctorEdit({ param }) {
  const idx = findIdx('doctors', param);
  if (idx < 0) return html`<${NotFound} k="doctors" />`;
  const d = items('doctors')[idx];
  const o = origItem('doctors', d);
  const set = (p) => patchItem('doctors', idx, p);
  const f = Object.fromEntries(COLLECTIONS.doctors.fields.map((x) => [x.key, x]));
  const fld = (k, extra) => html`<${Field} f=${extra ? { ...f[k], ...extra } : f[k]} item=${d} set=${set} />`;
  const changed = (k) => o && !same(o[k], d[k]);
  return html`<div>
    <${Topbar} crumbs=${[['Врачи', '#/doctors'], [d.n || 'Новый врач']]} onCancel=${() => revertItem('doctors', idx)} cancelDisabled=${!!o && same(o, d)} />
    <div class="body">
      <div class="form">
        <div class="card"><div class="card-h"><h2>Основное</h2></div>
          <${ImagePick} round value=${d.img} onChange=${(v) => set({ img: v })} dir="doctors" base=${() => d.n || 'doctor'} maxW=${720} hint="JPG или PNG, вертикальное, от 800 px. Обрежем и сожмём сами." />
          ${fld('n')}${fld('r')}
          <div class="row3">${fld('cat')}${fld('exp')}${fld('price')}</div>
          ${fld('tags')}${fld('kids')}${d.kids && fld('kidsRole')}
        </div>
        <div class="card"><div class="card-h"><h2>Коротко о враче</h2><span class="sub">${f.bio.hint}</span></div>${fld('bio', { noLabel: true, hintAbove: true })}</div>
        <div class="card"><div class="card-h"><h2>Биография</h2><span class="sub">${f.about.hint}. Строки вида «2015–2020 Университет…» на сайте станут шкалой с годами</span></div>
          <${RichText} value=${d.about || []} onChange=${(v) => set({ about: v })} variant="doctor" placeholder="Образование, места работы, курсы…" />
        </div>
      </div>
      <div class="prev">
        <div class="plbl"><${Icon} n="visibility" />Так будет на сайте</div>
        <div class="dcard">
          <div class=${'img' + (changed('img') ? ' hl' : '')} style=${d.img ? `background-image:url('${imgSrc(d.img)}')` : ''}></div>
          <div class="info">
            <span class=${'eb' + (changed('cat') ? ' hl' : '')}>${CATS[d.cat] || 'Направление'}</span>
            <span class=${'nm' + (changed('n') ? ' hl' : '')}>${d.n || 'ФИО врача'}</span>
            <span class=${'role' + (changed('r') ? ' hl' : '')}>${d.r || '—'}</span>
            <div class="meta">${d.exp && html`<span class=${changed('exp') ? 'hl' : ''}>Стаж ${d.exp}</span>`}${d.price && html`<b class=${changed('price') ? 'hl' : ''}>Приём ${d.price}</b>`}</div>
          </div>
        </div>
        <div class="pnote">Подсвечено то, что изменилось</div>
        <div class="vis"><${Toggle} checked=${!d.hidden} onChange=${(v) => set({ hidden: v ? undefined : true })} title="Показывать на сайте" sub="Выключите, если врач в отпуске или уволился" /></div>
        ${o && html`<a class="link" style="font-size:13px;padding:0 4px" href=${'/doctor/' + d.id + '/'} target="_blank" rel="noopener">Страница на сайте ↗</a>`}
        <button class="danger-link" onClick=${() => confirmDelete({ title: 'Удалить врача с сайта?', text: `Страница «${d.n || 'Новый врач'}» перестанет открываться. Если врач в отпуске — лучше просто скрыть его.`, onHide: () => set({ hidden: true }), onDelete: () => removeItem('doctors', idx) })}><${Icon} n="delete" />Удалить врача</button>
      </div>
    </div>
  </div>`;
}

/* ── Прайс ── */
export function Prices({ param }) {
  const s = get();
  const p = s.data.prices, o = s.files.prices.data;
  const secs = Object.keys(p);
  const si = Math.max(0, Math.min(+param || 0, secs.length - 1));
  const sec = secs[si];
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  useEffect(() => setEdit(null), [si]);
  const setRows = (name, rows) => setData('prices', { ...get().data.prices, [name]: rows });
  const setCell = (name, i, c, v) => { const rows = get().data.prices[name].slice(); rows[i] = rows[i].slice(); rows[i][c] = v; setRows(name, rows); };
  const origPrice = (name, row) => (o[name] || []).find((r) => r[0] === row[0])?.[2];
  const ql = q.trim().toLowerCase();
  const list = ql ? secs.flatMap((n) => p[n].map((r, i) => [n, i, r]).filter(([, , r]) => r.join(' ').toLowerCase().includes(ql))) : (p[sec] || []).map((r, i) => [sec, i, r]);
  const total = secs.reduce((a, n) => a + p[n].length, 0);

  const addRow = () => { setRows(sec, [...p[sec], ['', '', '', '']]); setQ(''); setEdit(`${sec}|${p[sec].length}`); };
  const delRow = (n, i) => { const rows = p[n].slice(); rows.splice(i, 1); setRows(n, rows); setEdit(null); };
  const drop = (i) => { if (drag == null || drag === i) return; const rows = p[sec].slice(); const [r] = rows.splice(drag, 1); rows.splice(i, 0, r); setRows(sec, rows); setDrag(null); setOver(null); };
  const renameSec = (name) => {
    name = name.trim();
    if (!name || name === sec) return;
    if (p[name]) return toast({ kind: 'err', title: 'Такой раздел уже есть' });
    setData('prices', Object.fromEntries(Object.entries(p).map(([k, v]) => [k === sec ? name : k, v])));
  };
  const addSec = () => askText({ title: 'Новый раздел прайса', label: 'Название раздела', ok: 'Создать', onOk: (name) => {
    if (p[name]) return toast({ kind: 'err', title: 'Такой раздел уже есть' });
    setData('prices', { ...p, [name]: [] }); go(`#/prices/${secs.length}`);
  } });
  const delSec = () => confirmDelete({ title: `Удалить раздел «${sec}»?`, text: p[sec].length ? `Вместе с ним пропадут ${p[sec].length} ${plural(p[sec].length, 'позиция', 'позиции', 'позиций')}.` : 'Раздел пустой.', onDelete: () => { const n = { ...p }; delete n[sec]; setData('prices', n); go('#/prices/0'); } });

  return html`<div class="page pr">
    <${Head} title="Прайс" cnt=${`${total} ${plural(total, 'позиция', 'позиции', 'позиций')}`}>
      <${Search} w=${320} value=${q} onInput=${(e) => { setQ(e.target.value); setEdit(null); }} placeholder="Найти услугу во всех разделах" />
      ${isDirty('prices') && (() => { const n = changes(['prices']).length; return html`<span class="unsaved" style="padding:0 4px"><i></i>${n} ${plural(n, 'изменение', 'изменения', 'изменений')}</span>`; })()}
      <button class="btn btn-primary" disabled=${!dirtyKeys().length} onClick=${askPublish}><${Icon} n="cloud_upload" />Опубликовать</button>
    </${Head}>
    <div class="pr-body">
      <div class="secs">
        <div class="lbl">РАЗДЕЛЫ</div>
        ${secs.map((n, i) => html`<button class=${i === si && !ql ? 'on' : ''} onClick=${() => { setQ(''); go('#/prices/' + i); }}><span>${n}</span>${!same(o[n], p[n]) && html`<i class="changed-mark"></i>`}<b>${p[n].length}</b></button>`)}
        <button class="add" onClick=${addSec}><${Icon} n="add" /><span>Новый раздел</span></button>
      </div>
      <div class="table">
        <div class="thead">
          ${ql ? html`<div><h2>Поиск: ${list.length} ${plural(list.length, 'позиция', 'позиции', 'позиций')}</h2><span class="sub">во всех разделах</span></div><span></span>`
            : html`<div><input key=${sec} class="sec-title" value=${sec} title="Нажмите, чтобы переименовать" onChange=${(e) => renameSec(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && e.target.blur()} />
              <span class="sub">${p[sec].length} ${plural(p[sec].length, 'позиция', 'позиции', 'позиций')} · порядок как на сайте, перетаскивайте за ⋮⋮</span></div>
              <div class="acts"><button class="icon-btn danger" title="Удалить раздел" onClick=${delSec}><${Icon} n="delete" /></button><button class="btn btn-line btn-sm" onClick=${addRow}><${Icon} n="add" />Добавить услугу</button></div>`}
        </div>
        <div class="tr th prow"><span></span><span>Услуга и описание</span><span>Цена</span><span>Старая цена</span><span></span></div>
        ${list.map(([n, i, r]) => {
          const key = `${n}|${i}`, was = origPrice(n, r);
          if (edit === key) return html`<div class="tr prow edit" key=${key}>
            <${Icon} n="drag_indicator" cls="handle" />
            <div class="nm">${ql && html`<span class="sec-l">${n}</span>`}
              <input class="inp" placeholder="Название услуги" value=${r[0]} autofocus onInput=${(e) => setCell(n, i, 0, e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && setEdit(null)} />
              <textarea class="inp" rows="2" placeholder="Описание или врач (необязательно)" value=${r[1]} onInput=${(e) => setCell(n, i, 1, e.target.value)}></textarea></div>
            <div><input class="inp" placeholder="5 000 ₸" value=${r[2]} onInput=${(e) => setCell(n, i, 2, e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && setEdit(null)} />${was != null && was !== r[2] && html`<div class="was">было ${was || '—'}</div>`}</div>
            <div><input class="inp plain" placeholder="—" value=${r[3]} onInput=${(e) => setCell(n, i, 3, e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && setEdit(null)} /></div>
            <div class="eacts"><button class="icon-btn" title="Готово" onClick=${() => setEdit(null)}><${Icon} n="check" /></button><button class="icon-btn danger" title="Удалить" onClick=${() => delRow(n, i)}><${Icon} n="delete" /></button></div>
          </div>`;
          return html`<div class=${'tr prow click' + (drag === i && !ql ? ' drag' : '') + (over === i && !ql ? ' over' : '')} key=${key}
            draggable=${!ql} onDragStart=${() => setDrag(i)} onDragEnd=${() => { setDrag(null); setOver(null); }}
            onDragOver=${(e) => { if (drag != null) { e.preventDefault(); setOver(i); } }} onDrop=${() => drop(i)} onClick=${() => setEdit(key)}>
            <${Icon} n="drag_indicator" cls="handle" />
            <div class="nm">${ql && html`<span class="sec-l">${n}</span>`}<b>${r[0] || html`<span style="color:var(--amber-ink)">Без названия</span>`}${was !== undefined && was !== r[2] && html`<i class="changed-mark"></i>`}</b>${r[1] && html`<span>${r[1]}</span>`}</div>
            <span class="pr">${r[2] || '—'}</span><span class="old">${r[3]}</span>
            <span class="more"><${Icon} n="more_horiz" /></span>
          </div>`;
        })}
        ${!list.length && (ql ? html`<${Empty} icon="search_off" title="Ничего не нашли" text="Проверьте написание или поищите по-другому" />`
          : html`<${Empty} icon="payments" title="В разделе пока пусто" text="Добавьте первую услугу — она сразу появится в черновике" action=${html`<button class="btn btn-primary" onClick=${addRow}><${Icon} n="add" />Добавить услугу</button>`} />`)}
      </div>
    </div>
  </div>`;
}

/* ── Медиацентр ── */
export function MediaList() {
  const [q, setQ] = useState('');
  const all = items('media');
  const ql = q.trim().toLowerCase();
  const list = all.filter((a) => !ql || [a.t, a.tag].join(' ').toLowerCase().includes(ql));
  const G = 'grid-template-columns:minmax(0,1fr) 240px 150px 24px';
  return html`<div class="page">
    <${Head} title="Медиацентр" cnt=${`${all.length} на сайте`}>
      <${Search} value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Найти статью" />
      <button class="btn btn-primary" onClick=${() => addItem('media')}><${Icon} n="add" />Новая статья</button>
    </${Head}>
    <div class="table">
      <div class="tr th" style=${G}><span>Материал</span><span>Рубрика</span><span>Дата</span><span></span></div>
      ${list.map((a) => html`<a class="tr" href=${'#/media/' + a.id} style=${G}>
        <span class="who">${a.img ? html`<img class="cover" src=${imgSrc(a.img)} alt="" loading="lazy" />` : html`<span class="cover"></span>`}<div><b>${a.t || 'Без заголовка'}${!same(origItem('media', a), a) && html`<i class="changed-mark"></i>`}</b><span>${a.by}</span></div></span>
        <span><span class="pill">${a.tag}</span></span><span class="cell">${fmtDay(a.date)}</span>
        <span class="more"><${Icon} n="more_horiz" cls="def" /><${Icon} n="edit" cls="alt" /></span>
      </a>`)}
      ${!list.length && html`<${Empty} icon="article" title="Ничего не нашли" text="Попробуйте другой запрос" />`}
    </div>
  </div>`;
}

const KINDS = ['СТАТЬЯ', 'ВИДЕО', 'ПОДКАСТ'];
const ytId = (v) => (/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/.exec(v) || [, v.trim()])[1];
const cap = (s = '') => s.charAt(0) + s.slice(1).toLowerCase();

function AutoTitle({ value, onInput }) {
  const ref = useRef();
  useEffect(() => { const t = ref.current; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }, [value]);
  return html`<textarea ref=${ref} rows="1" class="title-inp" placeholder="Заголовок статьи" value=${value} onInput=${onInput}></textarea>`;
}

export function ArticleEdit({ param }) {
  const idx = findIdx('media', param);
  if (idx < 0) return html`<${NotFound} k="media" />`;
  const s = get();
  const a = items('media')[idx];
  const o = origItem('media', a);
  const set = (p) => patchItem('media', idx, p);
  const [kind, ...rest] = (a.tag || '').split(' · ');
  const rubric = rest.join(' · ');
  const isText = kind === 'СТАТЬЯ';
  const setBody = (body) => set(isText ? { body, min: `${Math.max(1, Math.round(wordCount(body) / 180))} мин чтения` } : { body });
  const all = items('media');
  const rubrics = [...new Set(all.map((x) => x.tag.split(' · ').slice(1).join(' · ')).filter(Boolean))];
  const authors = [...new Set(all.map((x) => x.by).filter(Boolean))];
  const slug = String(a.id).startsWith('new-') ? slugify(a.t) : a.id;
  const lead = (a.body || []).find((b) => b[0] === 'p')?.[1] || '';
  const status = !o ? ['', 'Черновик'] : same(o, a) ? ['green', 'Опубликовано'] : ['amber', 'Есть правки'];
  const saved = s.savedAt && !same(o, a) ? `Сохранено в ${new Date(s.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : '';
  const setSlug = (v) => { const id = slugify(v, 80); if (!id || all.some((x, i) => i !== idx && x.id === id)) return; set({ id }); history.replaceState(null, '', '#/media/' + id); };

  const preview = () => openModal(() => html`<div class="modal lg aprev">
    ${a.img && html`<img src=${imgSrc(a.img)} alt="" />`}<div class="eyebrow">${a.tag}</div><h1>${a.t}</h1>
    <div class="small">${a.by} · ${fmtDay(a.date)} · ${a.min}</div>
    ${(a.body || []).map(([t, v]) => t === 'h' ? html`<h2>${v}</h2>` : t === 'h3' ? html`<h3>${v}</h3>` : t === 'q' ? html`<blockquote>${v}</blockquote>` : t === 'ul' ? html`<ul>${v.map((x) => html`<li>${x}</li>`)}</ul>` : t === 'ol' ? html`<ol>${v.map((x) => html`<li>${x}</li>`)}</ol>` : t === 'tc' ? html`<ul>${v.map(([x, y]) => html`<li><b>${x}</b> ${y}</li>`)}</ul>` : html`<p>${v}</p>`)}
    <div class="acts"><button class="btn btn-line" onClick=${closeModal}>Закрыть</button></div>
  </div>`);

  return html`<div>
    <${Topbar} crumbs=${[['Медиацентр', '#/media'], [a.t || 'Новая статья']]} onCancel=${() => revertItem('media', idx)} cancelDisabled=${!!o && same(o, a)}
      status=${html`<span class=${'spill ' + status[0]}><i></i>${status[1]}</span>`} right=${saved ? html`<span class="saved">${saved}</span>` : html`<${Unsaved} />`}>
      <button class="btn btn-line" onClick=${preview}><${Icon} n="visibility" />Предпросмотр</button>
    </${Topbar}>
    <div class="body art">
      <div class="sheet">
        <div class="cover" style=${a.img ? `background-image:url('${imgSrc(a.img)}')` : ''}>
          ${!a.img && html`<span class="nocover"><${Icon} n="image" /> Обложки пока нет</span>`}
          <${CoverBtn} has=${!!a.img} onChange=${(v) => set({ img: v })} base=${() => slug || 'article'} />
        </div>
        <div class="eyebrow">${[cap(kind), cap(rubric)].filter(Boolean).join(' · ')}</div>
        <${AutoTitle} value=${a.t} onInput=${(e) => set({ t: e.target.value.replace(/\n/g, ' ') })} />
        <${RichText} value=${a.body || []} onChange=${setBody} variant="article" placeholder="Пишите дальше или нажмите «/», чтобы вставить блок" hint="Ctrl + Alt + 1 / 2 / 3 — текст, заголовок, подзаголовок. Вставка из Word приходит без оформления — расставьте заголовки и списки на панели" />
      </div>
      <div class="settings">
        <div class="box"><h2>О статье</h2>
          <div class="f"><label>Тип</label><select class="inp" value=${kind} onChange=${(e) => set({ tag: [e.target.value, rubric].filter(Boolean).join(' · ') })}>${KINDS.map((k) => html`<option>${k}</option>`)}</select></div>
          <div class="f"><label>Рубрика</label><input class="inp" list="rubrics" value=${rubric} onInput=${(e) => set({ tag: [kind, e.target.value.toUpperCase()].filter(Boolean).join(' · ') })} /><datalist id="rubrics">${rubrics.map((r) => html`<option value=${r} />`)}</datalist></div>
          <div class="f"><label>Автор</label><input class="inp" list="authors" value=${a.by} onInput=${(e) => set({ by: e.target.value })} /><datalist id="authors">${authors.map((r) => html`<option value=${r} />`)}</datalist></div>
          <div class="f"><label>Врач в конце статьи</label><select class="inp" value=${a.doc || ''} onChange=${(e) => set({ doc: e.target.value || null })}>
            <option value="">— без врача —</option>${items('doctors').filter((d) => !d.hidden).map((d) => html`<option value=${d.id}>${shortName(d.n)}</option>`)}</select></div>
          <div class="f"><label>Дата</label><input class="inp" type="date" value=${a.date} onInput=${(e) => set({ date: e.target.value })} /></div>
          ${!isText && html`<div class="f"><label>Видео на YouTube</label><input class="inp" placeholder="ссылка на видео" value=${a.video || ''} onInput=${(e) => set({ video: ytId(e.target.value) })} /></div>`}
          ${isText ? html`<div class="rt"><${Icon} n="timer" />${a.min || '—'} — считается сам</div>`
            : html`<div class="f"><label>Длительность</label><input class="inp" placeholder="46 мин видео" value=${a.min} onInput=${(e) => set({ min: e.target.value })} /></div>`}
        </div>
        <div class="box"><h2>Как увидят в Google</h2>
          <div class="snippet"><span class="u">internaclinic.kz › article › ${slug || '…'}</span><span class="t">${(a.t || 'Заголовок статьи').slice(0, 60)}${(a.t || '').length > 60 ? '…' : ''}</span><span class="d">${lead.slice(0, 120) || 'Первый абзац статьи станет описанием в поиске.'}${lead.length > 120 ? '…' : ''}</span></div>
        </div>
        <div class="box"><h2>Адрес страницы</h2>
          <div class="f"><label>/article/</label><input class="inp" value=${slug} onChange=${(e) => setSlug(e.target.value)} /></div>
          <div class=${'hint' + (o ? ' warn' : '')}>${o ? 'Меняйте только до публикации — иначе старые ссылки перестанут работать' : 'Создаётся из заголовка, можно поправить'}</div>
        </div>
        <button class="danger-link" onClick=${() => confirmDelete({ title: 'Удалить статью?', text: `«${a.t || 'Без заголовка'}» пропадёт из медиацентра и поиска.`, onDelete: () => removeItem('media', idx) })}><${Icon} n="delete" />Удалить статью</button>
      </div>
    </div>
  </div>`;
}

function CoverBtn({ has, onChange, base }) {
  const inp = useRef();
  return html`<span style="display:contents"><button class="cbtn" onClick=${() => inp.current.querySelector('button').click()}><${Icon} n="image" />${has ? 'Заменить обложку' : 'Загрузить обложку'}</button>
    <span ref=${inp} style="display:none"><${ImagePick} value="" onChange=${onChange} dir="media" base=${base} maxW=${1200} /></span></span>`;
}

/* ── Общие списки ── */
export function List({ k }) {
  const c = COLLECTIONS[k];
  const s = get();
  const all = items(k);
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= all.length) return; const l = all.slice(); [l[i], l[j]] = [l[j], l[i]]; setItems(k, l); };
  const thumb = k === 'equipment';
  const G = 'grid-template-columns:24px minmax(0,1fr) 24px';
  // общие поля файла: короткие — одной карточкой над списком, длинные списки — под ним
  const fileField = (f) => html`<${Field} f=${f} item=${s.data[k]} set=${(p) => setData(k, { ...get().data[k], ...p })} />`;
  const isBig = (f) => f.type === 'list' || f.type === 'rows';
  const small = (c.fileFields || []).filter((f) => !isBig(f)), big = (c.fileFields || []).filter(isBig);
  return html`<div class="page">
    <${Head} title=${c.label} cnt=${c.single ? '' : `${all.length} на сайте`}>
      ${!c.noAdd && !c.single && html`<button class="btn btn-primary" onClick=${() => addItem(k)}><${Icon} n="add" />Добавить ${c.one}</button>`}
    </${Head}>
    ${small.length > 0 && html`<div class="card">${small.map((f) => fileField(f))}</div>`}
    ${c.single ? '' : all.length ? html`<div class="table">
      ${all.map((it, i) => html`<div class="tr" style=${G}>
        <span class="reorder"><button title="Выше" onClick=${() => move(i, -1)}><${Icon} n="keyboard_arrow_up" /></button><button title="Ниже" onClick=${() => move(i, 1)}><${Icon} n="keyboard_arrow_down" /></button></span>
        <a class="who" href=${`#/${k}/${keyOf(k, it, i)}`}>${thumb && (it.img ? html`<img class="cover" src=${imgSrc(it.img)} alt="" />` : html`<span class="cover"></span>`)}
          <div><b>${c.title(it)}${!same(c.idKey ? origItem(k, it) : s.files[k].data.items[i], it) && html`<i class="changed-mark"></i>`}</b><span>${c.sub(it) || ''}</span></div></a>
        <a class="more" href=${`#/${k}/${keyOf(k, it, i)}`}><${Icon} n="edit" /></a>
      </div>`)}
    </div>` : html`<div class="table"><${Empty} icon=${c.icon} title=${`${c.label}: пока пусто`} text="Когда добавите первую запись, она появится на сайте после публикации" action=${html`<button class="btn btn-primary" onClick=${() => addItem(k)}><${Icon} n="add" />Добавить ${c.one}</button>`} /></div>`}
    ${k === 'checkups' && html`<${DirTable} />`}
    ${big.map((f) => html`<div class="card" style=${c.single ? '' : 'margin-top:24px'}>${fileField(f)}</div>`)}
  </div>`;
}

export function ItemEdit({ k, param }) {
  const c = COLLECTIONS[k];
  const idx = findIdx(k, param);
  if (idx < 0) return html`<${NotFound} k=${k} />`;
  const it = items(k)[idx];
  const o = c.idKey ? origItem(k, it) : get().files[k].data.items[idx];
  // поле с only: true (например, «открыта по умолчанию») может быть включено только у одной записи
  const set = (p) => {
    const only = c.fields.find((f) => f.only && p[f.key]);
    if (!only) return patchItem(k, idx, p);
    setItems(k, items(k).map((x, i) => (i === idx ? { ...x, ...p } : x[only.key] ? (({ [only.key]: _, ...r }) => r)(x) : x)));
  };
  return html`<div>
    <${Topbar} crumbs=${[[c.label, '#/' + k], [c.title(it)]]} onCancel=${() => revertItem(k, idx)} cancelDisabled=${!!o && same(o, it)} />
    <div class="body one">
      <div class="form">
        <div class="card">${c.fields.filter((f) => !f.when || f.when(it)).map((f) => html`<${Field} f=${f} item=${it} set=${set} />`)}</div>
        ${!c.noAdd && html`<button class="danger-link" onClick=${() => confirmDelete({ title: `Удалить ${c.one}?`, text: `«${c.title(it)}» пропадёт с сайта после публикации.`, onDelete: () => removeItem(k, idx) })}><${Icon} n="delete" />Удалить ${c.one}</button>`}
      </div>
    </div>
  </div>`;
}

/* ── Чек-апы: профильные программы (аккордеон внизу /checkup) ── */
const dirs = () => get().data.checkups.directions || [];
const setDirs = (list) => setData('checkups', { ...get().data.checkups, directions: list });

function DirTable() {
  const o = get().files.checkups.data.directions || [];
  return html`<div class="card-h" style="margin:32px 0 12px"><h2>Профильные программы</h2><span class="sub">Раскрывающиеся блоки внизу страницы /checkup: гастро, кардио, гормоны…</span></div>
    <div class="table">${dirs().map((d) => html`<div class="tr" style="grid-template-columns:minmax(0,1fr) 24px">
      <a class="who" href=${'#/checkups/dir:' + d.id}><div><b>${d.name}${!same(o.find((x) => x.id === d.id), d) && html`<i class="changed-mark"></i>`}</b><span>${d.programs.map((p) => p.name).join(' · ')}</span></div></a>
      <a class="more" href=${'#/checkups/dir:' + d.id}><${Icon} n="edit" /></a>
    </div>`)}</div>`;
}

const LINES = { to: (v) => (v || []).join('\n'), from: (t) => t.split('\n').map((x) => x.trim()).filter(Boolean) };
const PARAS = { to: (v) => (v || []).join('\n\n'), from: (t) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) };
// textarea со списком: храним текст локально, чтобы пустая строка не пропадала при наборе
function ListArea({ value, onChange, model, rows = 5 }) {
  const [txt, setTxt] = useState(() => model.to(value));
  const own = useRef(JSON.stringify(value || []));
  useEffect(() => { const j = JSON.stringify(value || []); if (j !== own.current) { own.current = j; setTxt(model.to(value)); } }, [value]); // «Отменить» и откат
  return html`<textarea class="inp" rows=${rows} value=${txt} onInput=${(e) => { const v = model.from(e.target.value); own.current = JSON.stringify(v); setTxt(e.target.value); onChange(v); }}></textarea>`;
}

export function DirEdit({ id }) {
  const list = dirs();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return html`<${NotFound} k="checkups" />`;
  const d = list[idx];
  const o = (get().files.checkups.data.directions || []).find((x) => x.id === id);
  const set = (p) => setDirs(dirs().map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const setProg = (pi, p) => set({ programs: d.programs.map((x, i) => (i === pi ? { ...x, ...p } : x)) });
  return html`<div>
    <${Topbar} crumbs=${[['Чек-апы', '#/checkups'], [d.name]]} onCancel=${() => set(o)} cancelDisabled=${same(o, d)} />
    <div class="body one">
      <div class="form" key=${id}>
        <div class="card">
          <div class="f"><label>Название</label><input class="inp" value=${d.name} onInput=${(e) => set({ name: e.target.value })} /></div>
          <div class="f"><label>Вступление</label><${ListArea} value=${d.intro} onChange=${(v) => set({ intro: v })} model=${PARAS} rows="6" /><div class="hint">абзацы разделяйте пустой строкой</div></div>
          <div class="f"><label>Кому показано</label><${ListArea} value=${d.indications} onChange=${(v) => set({ indications: v })} model=${LINES} rows="6" /><div class="hint">каждый пункт с новой строки</div></div>
        </div>
        ${d.programs.map((p, pi) => html`<div class="card" key=${pi}>
          <div class="card-h"><h2>Программа ${pi + 1}</h2><span class="sub">${(p.items || []).length} пунктов</span>
            <button type="button" class="icon-btn danger" title="Удалить программу" onClick=${() => set({ programs: d.programs.filter((_, i) => i !== pi) })}><${Icon} n="delete" /></button></div>
          <div class="f"><label>Название</label><input class="inp" value=${p.name} onInput=${(e) => setProg(pi, { name: e.target.value })} /></div>
          <div class="f"><label>Что входит</label><${ListArea} value=${p.items} onChange=${(v) => setProg(pi, { items: v })} model=${LINES} rows="8" /><div class="hint">каждый пункт с новой строки</div></div>
          <div class="f"><label>Примечание<em>необязательно</em></label><input class="inp" value=${p.note || ''} onInput=${(e) => { const { note, ...r } = p; set({ programs: d.programs.map((x, i) => (i === pi ? (e.target.value ? { ...r, note: e.target.value } : r) : x)) }); }} /></div>
        </div>`)}
        <button class="btn btn-line" style="justify-self:start" onClick=${() => set({ programs: [...d.programs, { name: '', items: [] }] })}><${Icon} n="add" />Добавить программу</button>
      </div>
    </div>
  </div>`;
}

/* ── Переводы на казахский ── */
const label = (k) => (k === 'prices' ? 'Прайс' : COLLECTIONS[k]?.label || k);
// строка по пути «/items/3/t» в данных раздела — чтобы подсказать прежний перевод изменённого текста
const at = (v, path) => path.split('/').slice(1).reduce((x, p) => (x == null ? x : x[p]), v);

function KkArea({ value, onChange, placeholder }) {
  const ref = useRef();
  useEffect(() => { const t = ref.current; t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }, [value]);
  return html`<textarea ref=${ref} class="inp" rows="1" placeholder=${placeholder} value=${value} onInput=${(e) => onChange(e.target.value)}></textarea>`;
}

export function Translations() {
  const s = get();
  const dict = s.data.kk.dict, skip = s.data.kkskip.list;
  const [q, setQ] = useState('');
  // строки, которые показали в этот визит, не прячем сразу после перевода — иначе поле исчезнет посреди набора
  const shown = useRef(new Map());
  for (const m of missingKk(s.data)) if (!shown.current.has(m.t)) shown.current.set(m.t, m);
  const list = [...shown.current.values()];
  const left = list.filter((m) => dict[m.t] == null && !skip.includes(m.t)).length;
  const setKk = (t, v) => { const d = { ...get().data.kk.dict }; if (v.trim()) d[t] = v; else delete d[t]; setData('kk', { ...get().data.kk, dict: d }); };
  const setSkip = (t, on) => { const l = get().data.kkskip.list.filter((x) => x !== t); setData('kkskip', { ...get().data.kkskip, list: on ? [...l, t] : l }); };
  const hint = (m) => {
    const before = s.files[m.k] && rawOf(m.k, s.files[m.k].data);
    const old = before && at(before, m.path);
    return typeof old === 'string' && old !== m.t && dict[old.replace(/\s+/g, ' ').trim()];
  };
  const ql = q.trim().toLowerCase();
  const found = ql.length > 1 ? Object.keys(dict).filter((k) => k.toLowerCase().includes(ql) || String(dict[k]).toLowerCase().includes(ql)).slice(0, 40) : [];
  return html`<div class="page kk">
    <${Head} title="Переводы" cnt=${left ? `${left} без перевода` : 'всё переведено'} />
    <div class="card note-card"><${Icon} n="translate" /><span>Казахская версия сайта (/kk/…) собирается из этого словаря. Когда меняете текст в других разделах, новая строка появится здесь — переведите её или отметьте «Не переводить», если это имя, название или код.</span></div>
    ${list.length ? html`<div class="table">${list.map((m) => { const v = dict[m.t] ?? '', sk = skip.includes(m.t), h = !v && hint(m); return html`<div class=${'kkrow' + (sk ? ' off' : v ? ' done' : '')} key=${m.t}>
      <div class="ru"><span class="src">${label(m.k)}</span><p>${m.t}</p></div>
      <div class="kz">${sk ? html`<span class="small">Остаётся по-русски</span>` : html`<${KkArea} value=${v} onChange=${(x) => setKk(m.t, x)} placeholder="Перевод на казахский" />`}
        ${h && html`<button class="link" onClick=${() => setKk(m.t, h)}>Взять прежний перевод: «${h.length > 80 ? h.slice(0, 78) + '…' : h}»</button>`}
        <button class="text-btn" onClick=${() => setSkip(m.t, !sk)}>${sk ? 'Всё-таки перевести' : 'Не переводить'}</button></div>
    </div>`; })}</div>`
      : html`<div class="table"><${Empty} icon="translate" title="Всё переведено" text="Новые строки появятся здесь, когда поменяете тексты в других разделах" /></div>`}
    <div class="card-h" style="margin-top:16px"><h2>Найти перевод</h2><span class="sub">${Object.keys(dict).length} строк в словаре — поиск по русскому или казахскому тексту</span></div>
    <${Search} w=${420} value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Например, «колоноскопия»" />
    ${found.length > 0 && html`<div class="table">${found.map((t) => html`<div class="kkrow" key=${t}>
      <div class="ru"><p>${t}</p></div>
      <div class="kz"><${KkArea} value=${dict[t] ?? ''} onChange=${(x) => setKk(t, x)} placeholder="Пусто — строка останется по-русски" />${s.files.kk.data.dict[t] !== dict[t] && html`<button class="text-btn" onClick=${() => setKk(t, s.files.kk.data.dict[t] ?? '')}><${Icon} n="undo" />Вернуть</button>`}</div>
    </div>`)}</div>`}
    ${ql.length > 1 && !found.length && html`<div class="small" style="padding:0 4px">Ничего не нашли</div>`}
  </div>`;
}
