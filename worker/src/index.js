/**
 * Interna Clinic — API сайта и админка «Интеграции».
 *
 *  POST /lead            заявка с сайта → CRM по настройкам (Битрикс24 / своя CRM / обе) + журнал
 *  GET  /slots           свободные окна для виджета записи (проксирует CRM, если настроено)
 *  GET  /health          проверка
 *  GET  /admin           админка интеграций (Basic-auth, пароль — секрет ADMIN_PASSWORD)
 *  POST /admin/save      сохранить настройки
 *  POST /admin/test      отправить тестовый лид
 *  GET  /admin/log       последние 50 заявок
 *
 * Настройки хранятся в KV под ключом "integrations":
 *  { provider: "bitrix" | "custom" | "both" | "none",
 *    bitrix: { webhook, categoryId, assignedById, sourceId },
 *    custom: { url, token, method },
 *    notify: { email, whatsapp } }
 */

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const cors = (req, env) => {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const ok = allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin : allowed[0] || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
};

const getSettings = async (env) => (await env.SETTINGS.get('integrations', 'json')) || { provider: 'none', bitrix: {}, custom: {}, notify: {} };

/* ───────── отправка в CRM ───────── */
async function toBitrix(lead, cfg) {
  if (!cfg.webhook) throw new Error('Не задан вебхук Битрикс24');
  const fields = {
    TITLE: `Сайт · ${lead.service || 'Запись'} · ${lead.phone}`,
    NAME: lead.name || '',
    PHONE: [{ VALUE: lead.phone, VALUE_TYPE: 'WORK' }],
    SOURCE_ID: cfg.sourceId || 'WEB',
    SOURCE_DESCRIPTION: lead.page || '',
    COMMENTS: `Услуга: ${lead.service || '-'}\nЖелаемое время: ${lead.slot || '-'}\nФормат: ${lead.format || '-'}\nСтраница: ${lead.page || '-'}`,
    UTM_SOURCE: lead.utm_source || '', UTM_MEDIUM: lead.utm_medium || '', UTM_CAMPAIGN: lead.utm_campaign || '',
  };
  if (cfg.assignedById) fields.ASSIGNED_BY_ID = cfg.assignedById;
  const url = cfg.webhook.replace(/\/+$/, '') + '/crm.lead.add.json';
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }) }).catch(() => { throw new Error('Битрикс24: адрес вебхука недоступен'); });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`Битрикс24: ${data.error_description || data.error || r.status}`);
  return { id: data.result };
}

async function toCustom(lead, cfg) {
  if (!cfg.url) throw new Error('Не задан адрес своей CRM');
  const r = await fetch(cfg.url, {
    method: cfg.method || 'POST',
    headers: { 'content-type': 'application/json', ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}) },
    body: JSON.stringify({ source: 'internaclinic.kz', ...lead }),
  }).catch(() => { throw new Error('Своя CRM: адрес недоступен'); });
  if (!r.ok) throw new Error(`Своя CRM: HTTP ${r.status}`);
  return await r.json().catch(() => ({ ok: true }));
}

async function dispatch(lead, settings) {
  const results = {};
  const targets = settings.provider === 'both' ? ['bitrix', 'custom'] : settings.provider === 'none' ? [] : [settings.provider];
  for (const t of targets) {
    try { results[t] = t === 'bitrix' ? await toBitrix(lead, settings.bitrix || {}) : await toCustom(lead, settings.custom || {}); }
    catch (e) { results[t] = { error: e.message }; }
  }
  return results;
}

async function log(env, entry) {
  const list = (await env.SETTINGS.get('leads', 'json')) || [];
  list.unshift(entry);
  await env.SETTINGS.put('leads', JSON.stringify(list.slice(0, 200)));
}

/* ───────── админка ───────── */
function authed(req, env) {
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  const [, pass] = atob(h.slice(6)).split(':');
  return !!env.ADMIN_PASSWORD && pass === env.ADMIN_PASSWORD;
}
const needAuth = () => new Response('Требуется вход', { status: 401, headers: { 'www-authenticate': 'Basic realm="Interna Admin"' } });

function adminHtml(s, leads) {
  const v = (x) => (x == null ? '' : String(x).replace(/"/g, '&quot;'));
  const sel = (val) => (s.provider === val ? 'selected' : '');
  const rows = leads.map((l) => `<tr><td>${new Date(l.at).toLocaleString('ru-RU')}</td><td>${l.lead.name || ''}</td><td>${l.lead.phone}</td><td>${l.lead.service || ''}</td><td>${l.lead.slot || ''}</td><td>${Object.entries(l.result).map(([k, r]) => r.error ? `<span class="bad">${k}: ${r.error}</span>` : `<span class="ok">${k} ✓</span>`).join('<br>') || '—'}</td></tr>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Интеграции — Interna Clinic</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap">
<style>
body{margin:0;background:#F3FAFE;font-family:Manrope,system-ui,sans-serif;color:#0F2E40}
.wrap{max-width:860px;margin:0 auto;padding:40px 24px}
h1{font-size:26px;margin:0 0 6px}.sub{color:#4A6B80;margin:0 0 28px;font-weight:500}
.card{background:#fff;border:1.5px solid #DBE9F1;border-radius:20px;padding:26px;margin-bottom:18px}
h2{font-size:15px;margin:0 0 16px;letter-spacing:.06em;text-transform:uppercase;color:#0A6DB4}
label{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7E9AAC;margin:14px 0 6px}
input,select{width:100%;padding:12px 14px;border:1.5px solid #DBE9F1;border-radius:12px;font:inherit;font-weight:600;color:#0F2E40}
input:focus,select:focus{outline:none;border-color:#009EE9;box-shadow:0 0 0 4px rgba(0,158,233,.14)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.btn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:999px;padding:13px 24px;font:inherit;font-weight:800;cursor:pointer;background:#009EE9;color:#fff}
.btn.line{background:#fff;color:#0A6DB4;border:1.5px solid #DBE9F1}
.hint{font-size:12.5px;color:#7E9AAC;font-weight:500;margin:6px 0 0}
.badge{display:inline-block;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:800;background:#DCF2FC;color:#0A6DB4}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:9px 8px;border-bottom:1px solid #DBE9F1;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7E9AAC}
.ok{color:#1F8A5B;font-weight:700}.bad{color:#B4342C;font-weight:700}
#msg{margin-top:14px;font-weight:700}
.prov{display:none}.prov.on{display:block}
</style></head><body><div class="wrap">
<h1>Интеграции</h1><p class="sub">Куда сайт отправляет заявки с формы записи. Сайт от CRM не зависит — меняйте здесь, код трогать не нужно.</p>
<form id="f" class="card">
  <h2>Куда отправлять заявки</h2>
  <select name="provider" id="provider">
    <option value="none" ${sel('none')}>Никуда (только журнал ниже)</option>
    <option value="bitrix" ${sel('bitrix')}>Битрикс24</option>
    <option value="custom" ${sel('custom')}>Своя CRM клиники</option>
    <option value="both" ${sel('both')}>И в Битрикс24, и в свою CRM</option>
  </select>
  <div class="prov" data-p="bitrix both">
    <h2 style="margin-top:22px">Битрикс24</h2>
    <label>Входящий вебхук (Разработчикам → Другое → Входящий вебхук, права crm)</label>
    <input name="bitrix.webhook" value="${v(s.bitrix?.webhook)}" placeholder="https://portal.bitrix24.kz/rest/1/xxxxxxxx">
    <div class="row"><div><label>ID ответственного</label><input name="bitrix.assignedById" value="${v(s.bitrix?.assignedById)}" placeholder="1"></div><div><label>Источник (SOURCE_ID)</label><input name="bitrix.sourceId" value="${v(s.bitrix?.sourceId || 'WEB')}"></div></div>
  </div>
  <div class="prov" data-p="custom both">
    <h2 style="margin-top:22px">Своя CRM</h2>
    <label>Адрес приёма заявок (POST JSON)</label>
    <input name="custom.url" value="${v(s.custom?.url)}" placeholder="https://crm.internaclinic.kz/api/leads">
    <label>Токен (Bearer)</label>
    <input name="custom.token" value="${v(s.custom?.token)}" placeholder="секретный ключ">
    <p class="hint">Тело запроса: { name, phone, service, slot, format, page, utm_* , source: "internaclinic.kz" }</p>
  </div>
  <h2 style="margin-top:22px">Уведомления</h2>
  <div class="row"><div><label>E-mail для копии заявки</label><input name="notify.email" value="${v(s.notify?.email)}" placeholder="info@internaclinic.kz"></div><div><label>WhatsApp для кнопок на сайте</label><input name="notify.whatsapp" value="${v(s.notify?.whatsapp)}" placeholder="77007110550"></div></div>
  <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn" type="submit">Сохранить</button><button class="btn line" type="button" id="test">Отправить тестовую заявку</button></div>
  <div id="msg"></div>
</form>
<div class="card"><h2>Последние заявки <span class="badge">${leads.length}</span></h2>
<div style="overflow:auto"><table><thead><tr><th>Когда</th><th>Имя</th><th>Телефон</th><th>Услуга</th><th>Время</th><th>Доставка</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="color:#7E9AAC">Пока нет заявок</td></tr>'}</tbody></table></div></div>
</div>
<script>
const f=document.getElementById('f'),p=document.getElementById('provider'),msg=document.getElementById('msg');
const show=()=>document.querySelectorAll('.prov').forEach(d=>d.classList.toggle('on',d.dataset.p.split(' ').includes(p.value)));p.onchange=show;show();
const collect=()=>{const o={provider:p.value,bitrix:{},custom:{},notify:{}};for(const el of f.querySelectorAll('[name]')){const [a,b]=el.name.split('.');if(b)o[a][b]=el.value.trim();}return o;};
f.onsubmit=async e=>{e.preventDefault();msg.textContent='Сохраняю…';const r=await fetch('/admin/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(collect())});msg.textContent=r.ok?'✓ Сохранено':'Ошибка сохранения';};
document.getElementById('test').onclick=async()=>{msg.textContent='Отправляю тест…';const r=await fetch('/admin/test',{method:'POST'});const d=await r.json();msg.innerHTML=Object.entries(d.result||{}).map(([k,v])=>v.error?'<span class="bad">'+k+': '+v.error+'</span>':'<span class="ok">'+k+' ✓ id '+(v.id||'')+'</span>').join('<br>')||'Провайдер не выбран — заявка только в журнале';setTimeout(()=>location.reload(),1500);};
</script></body></html>`;
}

/* ───────── роутер ───────── */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const C = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: C });

    if (path === '/health') return json({ ok: true, ts: Date.now() }, 200, C);

    if (path === '/lead' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const phone = String(body.phone || '').replace(/[^\d+]/g, '');
      if (phone.replace(/\D/g, '').length < 10) return json({ ok: false, error: 'phone' }, 400, C);
      if (!body.agree) return json({ ok: false, error: 'consent' }, 400, C);
      if (body.website) return json({ ok: true }, 200, C); // honeypot для ботов
      const lead = { name: String(body.name || '').slice(0, 120), phone, service: String(body.service || '').slice(0, 120), slot: String(body.slot || '').slice(0, 60), format: String(body.format || '').slice(0, 40), page: String(body.page || '').slice(0, 200), utm_source: body.utm_source || '', utm_medium: body.utm_medium || '', utm_campaign: body.utm_campaign || '', ip: req.headers.get('cf-connecting-ip') || '' };
      const settings = await getSettings(env);
      const result = await dispatch(lead, settings);
      await log(env, { at: Date.now(), lead, result });
      const delivered = Object.values(result).every((r) => !r.error);
      return json({ ok: delivered || settings.provider === 'none', result }, 200, C);
    }

    if (path === '/slots' && req.method === 'GET') {
      // Этап 2: здесь проксируем свободные окна из CRM. Пока — демо-слоты, сайт умеет их рисовать.
      const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
      const slots = [1, 3, 5, 25, 27, 30].map((h) => { const d = new Date(now.getTime() + h * 3600e3); return { time: `${pad(d.getHours())}:${pad(Math.round(d.getMinutes() / 15) * 15 % 60)}`, day: h < 24 ? 'сегодня' : 'завтра', iso: d.toISOString() }; });
      return json({ demo: true, slots }, 200, C);
    }

    if (path.startsWith('/admin')) {
      if (!authed(req, env)) return needAuth();
      if (path === '/admin' && req.method === 'GET') {
        const s = await getSettings(env); const leads = ((await env.SETTINGS.get('leads', 'json')) || []).slice(0, 50);
        return new Response(adminHtml(s, leads), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (path === '/admin/save' && req.method === 'POST') { const s = await req.json(); await env.SETTINGS.put('integrations', JSON.stringify(s)); return json({ ok: true }); }
      if (path === '/admin/test' && req.method === 'POST') {
        const settings = await getSettings(env);
        const lead = { name: 'Тест с сайта', phone: '+77000000000', service: 'Проверка интеграции', slot: 'сейчас', page: '/admin', format: '' };
        const result = await dispatch(lead, settings); await log(env, { at: Date.now(), lead, result, test: true });
        return json({ ok: true, result });
      }
      if (path === '/admin/log') return json((await env.SETTINGS.get('leads', 'json')) || []);
    }
    return json({ error: 'not found' }, 404, C);
  },
};
