// Хранилище админки: локально — файлы через dev-API (scripts/admin-dev-api.mjs), на сайте — GitHub API.
// Одна публикация = один коммит со всеми изменёнными файлами.

export const REPO = 'kabdyzhanzhaina-lang/interna-clinic';
export const BRANCH = 'main';
const GH = 'https://api.github.com';
const TOKEN_KEY = 'interna-admin-token';

export const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

export const utf8ToB64 = (s) => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(bin); };

/* ── Локально ── */
const local = {
  async user() { return { name: 'Локальная копия', login: 'local', local: true }; },
  async read(path, ref) {
    const r = await fetch(`/__admin/file?path=${encodeURIComponent(path)}${ref ? `&ref=${ref}` : ''}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Не удалось прочитать ' + path);
    return (await r.json()).content;
  },
  async commit(files) {
    const r = await fetch('/__admin/commit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Не удалось сохранить');
    return r.json();
  },
  async history() { const r = await fetch('/__admin/history'); return r.ok ? (await r.json()).items : []; },
  async commitFiles(sha) { const r = await fetch(`/__admin/commit-files?sha=${sha}`); return r.json(); },
};

/* ── GitHub ── */
const gh = async (path, opts = {}) => {
  const r = await fetch(GH + path, { ...opts, headers: { authorization: `Bearer ${store.get(TOKEN_KEY)}`, accept: 'application/vnd.github+json', ...(opts.body ? { 'content-type': 'application/json' } : {}), ...opts.headers } });
  if (r.status === 401) { store.set(TOKEN_KEY, null); location.reload(); }
  if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).message || `GitHub ${r.status}`); e.status = r.status; throw e; }
  return r;
};
const github = {
  async user() {
    if (!store.get(TOKEN_KEY)) return null;
    const u = await (await gh('/user')).json();
    const repo = await (await gh(`/repos/${REPO}`)).json();
    return { name: u.name || u.login, login: u.login, avatar: u.avatar_url, canWrite: !!repo.permissions?.push };
  },
  async read(path, ref = BRANCH) {
    try { return await (await gh(`/repos/${REPO}/contents/${path}?ref=${ref}`, { headers: { accept: 'application/vnd.github.raw+json' } })).text(); }
    catch (e) { if (e.status === 404) return null; throw e; }
  },
  async commit(files, message) {
    const ref = await (await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`)).json();
    const head = await (await gh(`/repos/${REPO}/git/commits/${ref.object.sha}`)).json();
    const tree = [];
    for (const f of files) {
      if (f.delete) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; } // sha: null — удалить файл
      const blob = await (await gh(`/repos/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: f.encoding === 'base64' ? f.content : utf8ToB64(f.content), encoding: 'base64' }) })).json();
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const t = await (await gh(`/repos/${REPO}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) })).json();
    const c = await (await gh(`/repos/${REPO}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [head.sha] }) })).json();
    await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return { ok: true, sha: c.sha };
  },
  async history() {
    const list = await (await gh(`/repos/${REPO}/commits?sha=${BRANCH}&path=src/data&per_page=30`)).json();
    return list.map((c) => ({ sha: c.sha, author: c.commit.author.name, date: c.commit.author.date, message: c.commit.message.split('\n')[0] }));
  },
  async commitFiles(sha) {
    const c = await (await gh(`/repos/${REPO}/commits/${sha}`)).json();
    return { files: c.files.map((f) => f.filename).filter((p) => p.startsWith('src/data/') || p.startsWith('src/i18n/')), parent: c.parents[0]?.sha || null };
  },
};

export const api = isLocal ? local : github;

/** Вход через GitHub: окно /api/auth → /api/callback присылает токен (протокол Decap: authorizing → authorization). */
export function login() {
  return new Promise((ok, fail) => {
    const w = window.open('/api/auth?scope=repo', 'interna-auth', 'width=640,height=720');
    if (!w) return fail(new Error('Браузер заблокировал окно входа — разрешите всплывающие окна'));
    const onMsg = (e) => {
      if (e.origin !== location.origin || typeof e.data !== 'string') return;
      if (e.data === 'authorizing:github') { w.postMessage('authorizing:github', location.origin); return; }
      const m = /^authorization:github:(success|error):(.*)$/s.exec(e.data);
      if (!m) return;
      window.removeEventListener('message', onMsg);
      const d = JSON.parse(m[2]);
      if (m[1] === 'success' && d.token) { store.set(TOKEN_KEY, d.token); ok(); } else fail(new Error(d.error || d.error_description || 'Вход не удался'));
    };
    window.addEventListener('message', onMsg);
  });
}
export const logout = () => { store.set(TOKEN_KEY, null); location.reload(); };
