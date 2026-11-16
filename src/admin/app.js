// Админка сайта: вход, меню, маршруты по #/раздел/запись.
import { html } from 'htm/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { api, isLocal, login, logout } from './api.js';
import { COLLECTIONS, NAV } from './collections.js';
import { can, get, isDirty, loadAll, set, toast, useStore } from './store.js';
import { ArticleEdit, DirEdit, Translations, DoctorEdit, Doctors, ItemEdit, List, MediaList, Overview, Prices } from './screens.js';
import { Empty, Icon, Overlays } from './ui.js';

const useHash = () => {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => { setH(location.hash); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};

function Login({ error }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error || '');
  const go = async () => {
    setBusy(true); setErr('');
    try { await login(); await boot(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return html`<div class="login">
    <div class="login-l">
      <span class="logo-plate"><span class="brand"><span class="logo-mark"></span>Interna Clinic</span></span>
      <span class="sp"></span>
      <div class="eyebrow">Админка сайта</div>
      <h1>Врачи, цены, акции и статьи — меняются здесь, на сайте через пару минут</h1>
      <div class="login-pts">
        <div><${Icon} n="edit_note" /><span>Правите как в обычной форме — без кода</span></div>
        <div><${Icon} n="visibility" /><span>Перед публикацией видно, как будет на сайте</span></div>
        <div><${Icon} n="history" /><span>Каждая правка сохраняется в истории, её можно откатить</span></div>
      </div>
    </div>
    <div class="login-r"><div class="login-box">
      <div class="head"><h2>Вход</h2><div class="sub">Войдите через GitHub-аккаунт, которому студия открыла доступ к сайту.</div></div>
      <button class="btn btn-dark" disabled=${busy} onClick=${go}><${Icon} n="login" />${busy ? 'Ждём GitHub…' : 'Войти через GitHub'}</button>
      ${err && html`<div class="err">${err}</div>`}
      <div class="note"><${Icon} n="info" /><span>Нет доступа или кнопка не пускает? Напишите в студию — design@yume.business</span></div>
      <a class="back" href="/"><${Icon} n="arrow_back" />Вернуться на сайт</a>
    </div></div>
  </div>`;
}

const count = (key, data) => (COLLECTIONS[key]?.count ? COLLECTIONS[key].count(data) : key === '' || COLLECTIONS[key]?.single ? null : key === 'prices' ? Object.values(data.prices).reduce((a, r) => a + r.length, 0) : data[key]?.items?.length);

function Shell({ route }) {
  const s = get();
  const [sec, param] = route;
  // на телефоне меню прячется в выезжающую панель — закрываем её при переходе в раздел
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [sec, param]);
  const cur = NAV.find((n) => n.key === (sec || ''));
  let page;
  if (!can(sec)) page = html`<div class="page"><div class="table"><${Empty} icon="lock" title="Нет доступа к разделу" text="Этот раздел правит другой редактор. Если нужен доступ — попросите администратора добавить его в разделе «Доступ»" /></div></div>`;
  else if (!sec) page = html`<${Overview} />`;
  else if (sec === 'doctors') page = param ? html`<${DoctorEdit} param=${param} />` : html`<${Doctors} />`;
  else if (sec === 'prices') page = html`<${Prices} param=${param} />`;
  else if (sec === 'media') page = param ? html`<${ArticleEdit} param=${param} />` : html`<${MediaList} />`;
  else if (sec === 'kk') page = html`<${Translations} />`;
  else if (sec === 'checkups' && param?.startsWith('dir:')) page = html`<${DirEdit} id=${param.slice(4)} key=${param} />`;
  else if (COLLECTIONS[sec]) page = param ? html`<${ItemEdit} k=${sec} param=${param} key=${sec + param} />` : html`<${List} k=${sec} key=${sec} />`;
  else page = html`<${Overview} />`;
  const u = s.user;
  return html`<div class=${'shell' + (menu ? ' menu-open' : '')}>
    <div class="mbar"><span class="brand"><span class="logo-mark"></span>Interna Clinic</span><b>${cur?.label || ''}</b>
      <button class="icon-btn" title="Меню" onClick=${() => setMenu(!menu)}><${Icon} n=${menu ? 'close' : 'menu'} /></button></div>
    <div class="mscrim" onClick=${() => setMenu(false)}></div>
    <aside class="side">
      <div class="side-brand"><span class="brand"><span class="logo-mark"></span>Interna Clinic</span><span class="side-cap">АДМИНКА САЙТА</span></div>
      ${NAV.filter((n, i) => (n.cap ? NAV.slice(i + 1).some((x) => !x.cap && can(x.key)) : can(n.key))).map((n) => n.cap ? html`<span class="nav-cap">${n.cap}</span>` : html`<a class=${'nav' + ((sec || '') === n.key ? ' on' : '')} href=${'#/' + n.key}>
        <${Icon} n=${n.icon} /><span>${n.label}</span>${n.key && isDirty(n.key) ? html`<i class="dot" title="Есть неопубликованные правки"></i>` : ''}<b>${count(n.key, s.data) ?? ''}</b></a>`)}
      <div class="side-sp"></div>
      <a class="nav" href="/" target="_blank" rel="noopener"><${Icon} n="open_in_new" /><span>Открыть сайт</span></a>
      <div class="ucard"><span class="ava">${u.avatar ? html`<img src=${u.avatar} alt="" />` : (u.name || '?')[0].toUpperCase()}</span>
        <div><b>${u.name}</b><span>${u.local ? 'Файлы на этом компьютере' : 'Редактор'}</span></div>
        ${!u.local && html`<button class="icon-btn" title="Выйти" onClick=${logout}><${Icon} n="logout" /></button>`}</div>
    </aside>
    <main class="main">${page}</main>
  </div>`;
}

function App() {
  const s = useStore();
  const hash = useHash();
  const route = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let body;
  if (s.boot) body = html`<div class="boot">Загружаем…</div>`;
  else if (!s.user) body = html`<${Login} error=${s.error} />`;
  else if (!s.user.local && !s.user.canWrite) body = html`<div class="boot"><div class="login-box" style="text-align:center;justify-items:center">
    <div class="head"><h2>Нет доступа</h2><div class="sub">У аккаунта @${s.user.login} нет права менять сайт. Напишите в студию — design@yume.business — добавим.</div></div>
    <button class="btn btn-line" onClick=${logout}>Войти другим аккаунтом</button></div></div>`;
  else if (!s.files.doctors) body = html`<div class="boot">${s.error ? html`<span class="err">${s.error}</span>` : 'Загружаем данные сайта…'}</div>`;
  else body = html`<${Shell} route=${route} />`;
  return html`${body}<${Overlays} />`;
}

async function boot() {
  try {
    const user = await api.user();
    set({ user, boot: false, error: null });
    if (user && (user.local || user.canWrite)) await loadAll();
  } catch (e) {
    set({ boot: false, error: e.message });
    if (get().user) toast({ kind: 'err', title: 'Не удалось загрузить данные', text: e.message, sticky: true });
  }
}

// не потерять правки при закрытии вкладки — черновик и так в браузере, но предупредим
addEventListener('beforeunload', (e) => { if (get().publishing) { e.preventDefault(); e.returnValue = ''; } });
if (isLocal) document.title = 'Админка · локально';
render(html`<${App} />`, document.getElementById('app'));
boot();
