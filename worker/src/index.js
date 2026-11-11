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
 *    bitrix: { webhook, assignedById, sourceId, statusId, tagField },
 *    custom: { url, token, method },
 *    notify: { email, mode: "fail" | "always", whatsapp },
 *    wa: { phoneId, to, template, lang } }   — уведомления в WhatsApp через Cloud API (токен — секрет WA_TOKEN)
 *
 * Каждая заявка получает тип (приём / check-up / KIDS / вакансия / акция): он попадает в заголовок лида,
 * в теги «Сайт» + тип (поле tagField в Битрикс24) и в комментарий. Стадия лида — statusId (по умолчанию NEW — «Новый лид»).
 * Если CRM не ответила (или заявки никуда не отправляются), копия уходит на e-mail из notify.email —
 * через Resend (секрет RESEND_API_KEY) либо, без ключа, через formsubmit.co.
 * WhatsApp: если заданы wa.phoneId, wa.to и секрет WA_TOKEN, каждая заявка сразу уходит сообщением администратору
 * (шаблон wa.template с 4 параметрами: тип, имя, телефон, детали; без шаблона — обычный текст, который WhatsApp
 * доставляет только в течение 24 часов после того, как получатель сам написал на номер клиники).
 */

/* ───────── тип заявки ───────── */
const TYPES = { visit: 'Приём', checkup: 'Check-up', kids: 'KIDS', vacancy: 'Вакансия', promo: 'Акция' };
function leadType(lead) {
  const t = String(lead.type || '').toLowerCase();
  if (TYPES[t]) return t;
  const s = `${lead.service || ''} ${lead.page || ''}`.toLowerCase();
  if (/ваканс|резюме|vacanc/.test(s)) return 'vacancy';
  if (/check-?up|чек-?ап|\/checkup/.test(s)) return 'checkup';
  if (/kids|детск|\/kids/.test(s)) return 'kids';
  if (/акци|\/promo/.test(s)) return 'promo';
  return 'visit';
}
const leadTags = (lead) => ['Сайт', TYPES[leadType(lead)]];
const leadComment = (lead) => [
  `Тип: ${TYPES[leadType(lead)]}`, `Теги: ${leadTags(lead).join(', ')}`, `Услуга: ${lead.service || '-'}`,
  lead.date ? `Дата: ${lead.date}` : '', lead.time ? `Время: ${lead.time}` : '', lead.slot && !lead.date ? `Желаемое время: ${lead.slot}` : '',
  lead.contact ? `Связь: ${lead.contact}` : '', lead.format ? `Формат: ${lead.format}` : '',
  lead.position ? `Должность: ${lead.position}` : '', lead.message ? `Сообщение: ${lead.message}` : '', lead.resumeName ? `Резюме: ${lead.resumeName} (во вложении письма)` : '',
  `Страница: ${lead.page || '-'}`, lead.referrer ? `Источник перехода: ${lead.referrer}` : '',
  lead.utm_source ? `UTM: ${lead.utm_source} / ${lead.utm_medium || '-'} / ${lead.utm_campaign || '-'}` : '',
  lead.gclid ? `gclid: ${lead.gclid}` : '', lead.yclid ? `yclid: ${lead.yclid}` : '', lead.fbclid ? `fbclid: ${lead.fbclid}` : '',
].filter(Boolean).join('\n');

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

const getSettings = async (env) => (await env.SETTINGS.get('integrations', 'json')) || { provider: 'none', bitrix: {}, custom: {}, notify: {}, wa: {} };

/* ───────── отправка в CRM ───────── */
async function toBitrix(lead, cfg) {
  if (!cfg.webhook) throw new Error('Не задан вебхук Битрикс24');
  const tags = leadTags(lead);
  const fields = {
    TITLE: `Сайт · ${TYPES[leadType(lead)]} · ${lead.service || 'Запись'} · ${lead.phone}`,
    NAME: lead.name || '',
    PHONE: [{ VALUE: lead.phone, VALUE_TYPE: 'WORK' }],
    STATUS_ID: cfg.statusId || 'NEW',               // стадия «Новый лид» (код из CRM → Настройки → Стадии лидов)
    SOURCE_ID: cfg.sourceId || 'WEB',
    SOURCE_DESCRIPTION: `Сайт internaclinic.kz · ${lead.page || ''}`.trim(),
    COMMENTS: leadComment(lead),
    UTM_SOURCE: lead.utm_source || '', UTM_MEDIUM: lead.utm_medium || '', UTM_CAMPAIGN: lead.utm_campaign || '',
  };
  if (cfg.assignedById) fields.ASSIGNED_BY_ID = cfg.assignedById;
  if (cfg.tagField) fields[cfg.tagField] = tags.join(', ');   // пользовательское поле «Теги» (UF_CRM_…), создаётся в CRM один раз
  const url = cfg.webhook.replace(/\/+$/, '') + '/crm.lead.add.json';
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }) }).catch(() => { throw new Error('Битрикс24: адрес вебхука недоступен'); });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`Битрикс24: ${data.error_description || data.error || r.status}`);
  return { id: data.result, tags };
}

/* ───────── запасной канал: письмо ───────── */
async function toEmail(lead, settings, env, results) {
  const to = settings.notify?.email; if (!to) throw new Error('Не задан e-mail');
  const failed = Object.entries(results).filter(([, r]) => r.error).map(([k, r]) => `${k}: ${r.error}`);
  const subject = `${failed.length ? '⚠️ CRM не ответила · ' : ''}Заявка с сайта · ${TYPES[leadType(lead)]} · ${lead.service || 'Запись'} · ${lead.phone}`;
  const text = `${lead.name ? 'Имя: ' + lead.name + '\n' : ''}Телефон: ${lead.phone}\n${leadComment(lead)}${failed.length ? '\n\nОшибки доставки в CRM:\n' + failed.join('\n') : ''}`;
  if (env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Сайт Interna Clinic <site@internaclinic.kz>', to: [to], subject, text, ...(lead.resume ? { attachments: [{ filename: lead.resumeName || 'resume', content: lead.resume }] } : {}) }) });
    if (!r.ok) throw new Error(`Resend: HTTP ${r.status}`);
    return { via: 'resend' };
  }
  // без ключа — formsubmit.co (адрес нужно один раз подтвердить по письму-активации)
  const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ _subject: subject, _template: 'box', ...Object.fromEntries(text.split('\n').map((l) => l.split(/:\s(.+)/)).filter((x) => x[1]).map(([k, v]) => [k, v])) }) }).catch(() => { throw new Error('formsubmit недоступен'); });
  if (!r.ok) throw new Error(`formsubmit: HTTP ${r.status}`);
  return { via: 'formsubmit' };
}

/* ───────── уведомление в WhatsApp (Meta Cloud API) ─────────
 * Шаблон (категория Utility, язык wa.lang, по умолчанию ru) с четырьмя параметрами тела:
 *   {{1}} тип заявки · {{2}} имя · {{3}} телефон · {{4}} детали (услуга, дата, связь, страница)
 * В параметрах шаблона WhatsApp запрещает переводы строк и табуляции — детали склеиваются через « · ». */
const waParam = (v, n = 300) => String(v || '—').replace(/\s+/g, ' ').trim().slice(0, n) || '—';
const waPhone = (v) => String(v || '').replace(/\D/g, '').replace(/^8(\d{10})$/, '7$1');
async function toWhatsApp(lead, cfg, env, results) {
  if (!env.WA_TOKEN) throw new Error('Не задан секрет WA_TOKEN');
  if (!cfg.phoneId) throw new Error('Не задан Phone number ID');
  const to = String(cfg.to || '').split(/[,;]+/).map(waPhone).filter((x) => x.length >= 10);
  if (!to.length) throw new Error('Не задан номер получателя');
  const failed = Object.entries(results).filter(([, r]) => r.error).map(([k]) => k);
  const type = `${failed.length ? '⚠️ CRM не ответила · ' : ''}${TYPES[leadType(lead)]}`;
  const details = [lead.service ? `Услуга: ${lead.service}` : '', lead.date ? `Дата: ${lead.date}` : '', lead.time ? `Время: ${lead.time}` : '', lead.slot && !lead.date ? `Желаемое время: ${lead.slot}` : '',
    lead.contact ? `Связь: ${lead.contact}` : '', lead.format ? `Формат: ${lead.format}` : '', lead.position ? `Должность: ${lead.position}` : '', lead.message ? `Сообщение: ${lead.message}` : '', `Страница: ${lead.page || '-'}`].filter(Boolean).join(' · ');
  const body = cfg.template
    ? { type: 'template', template: { name: cfg.template, language: { code: cfg.lang || 'ru' }, components: [{ type: 'body', parameters: [waParam(type, 60), waParam(lead.name, 120), waParam(lead.phone, 30), waParam(details, 700)].map((text) => ({ type: 'text', text })) }] } }
    : { type: 'text', text: { body: `Новая заявка с сайта · ${type}\n${lead.name ? 'Имя: ' + lead.name + '\n' : ''}Телефон: ${lead.phone}\n${leadComment(lead)}` } };
  const api = `https://graph.facebook.com/${env.WA_API_VERSION || 'v23.0'}/${cfg.phoneId}/messages`;
  const sent = [];
  for (const num of to) {
    const r = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.WA_TOKEN}` }, body: JSON.stringify({ messaging_product: 'whatsapp', to: num, ...body }) })
      .catch(() => { throw new Error('WhatsApp: API недоступен'); });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`WhatsApp: ${d.error?.message || 'HTTP ' + r.status}${d.error?.error_data?.details ? ' — ' + d.error.error_data.details : ''}`);
    sent.push({ to: num, id: d.messages?.[0]?.id });
  }
  return { via: cfg.template ? 'template' : 'text', sent, id: sent[0]?.id };
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

const crmTargets = (settings) => (settings.provider === 'both' ? ['bitrix', 'custom'] : settings.provider === 'none' ? [] : [settings.provider]);
async function dispatch(lead, settings, env) {
  const results = {};
  const targets = crmTargets(settings);
  for (const t of targets) {
    try { results[t] = t === 'bitrix' ? await toBitrix(lead, settings.bitrix || {}) : await toCustom(lead, settings.custom || {}); }
    catch (e) { results[t] = { error: e.message }; }
  }
  // письмо: всегда (mode=always) или когда CRM не ответила / заявки никуда не идут
  const failed = Object.values(results).some((r) => r.error) || !targets.length;
  if (settings.notify?.email && (settings.notify.mode === 'always' || failed)) {
    try { results.email = await toEmail(lead, settings, env || {}, results); } catch (e) { results.email = { error: e.message }; }
  }
  // WhatsApp: на каждую заявку, если канал настроен (уведомление, не CRM — в очередь повторов не попадает)
  if (settings.wa?.phoneId && settings.wa?.to) {
    try { results.whatsapp = await toWhatsApp(lead, settings.wa, env || {}, results); } catch (e) { results.whatsapp = { error: e.message }; }
  }
  return results;
}

async function log(env, entry) {
  const list = (await env.SETTINGS.get('leads', 'json')) || [];
  list.unshift(entry);
  await env.SETTINGS.put('leads', JSON.stringify(list.slice(0, 200)));
}

/* ───────── очередь повторов: если CRM не ответила, заявка ждёт в KV и уходит повторно по расписанию (cron в wrangler.toml) ─────────
 * до 6 попыток с нарастающей паузой (15 мин → 24 ч); письмо-копия уже отправлена при первом сбое, поэтому заявка не теряется в любом случае */
const NOTIFY = ['email', 'whatsapp'];   // каналы-уведомления: не CRM, повторно не отправляются
const RETRY_MAX = 6, RETRY_STEP_MS = [15, 30, 60, 180, 720, 1440].map((m) => m * 60e3);
async function enqueue(env, id, lead, result) {
  const failed = Object.entries(result).filter(([k, r]) => !NOTIFY.includes(k) && r.error).map(([k]) => k);
  if (!failed.length) return;
  const q = (await env.SETTINGS.get('pending', 'json')) || [];
  q.push({ id, lead: { ...lead, resume: undefined }, targets: failed, attempts: 1, nextAt: Date.now() + RETRY_STEP_MS[0], lastError: Object.fromEntries(failed.map((k) => [k, result[k].error])) });
  await env.SETTINGS.put('pending', JSON.stringify(q.slice(-500)));
}
async function retryPending(env) {
  const q = (await env.SETTINGS.get('pending', 'json')) || [];
  if (!q.length) return { checked: 0 };
  const settings = await getSettings(env);
  const now = Date.now(), keep = [], leads = (await env.SETTINGS.get('leads', 'json')) || [];
  let done = 0;
  for (const item of q) {
    if (item.nextAt > now) { keep.push(item); continue; }
    const still = [];
    for (const tgt of item.targets) {
      if (!crmTargets(settings).includes(tgt)) continue; // интеграцию выключили — повторять некуда
      try {
        const r = tgt === 'bitrix' ? await toBitrix(item.lead, settings.bitrix || {}) : await toCustom(item.lead, settings.custom || {});
        const entry = leads.find((l) => l.id === item.id); if (entry) entry.result[tgt] = { ...r, retried: item.attempts };
        done++;
      } catch (e) { item.lastError[tgt] = e.message; still.push(tgt); }
    }
    if (still.length && item.attempts < RETRY_MAX) { keep.push({ ...item, targets: still, attempts: item.attempts + 1, nextAt: now + RETRY_STEP_MS[Math.min(item.attempts, RETRY_STEP_MS.length - 1)] }); }
    else if (still.length) { const entry = leads.find((l) => l.id === item.id); if (entry) entry.result.retry = { error: `${RETRY_MAX} попыток не удалось: ${Object.values(item.lastError).join('; ')}` }; }
  }
  await env.SETTINGS.put('pending', JSON.stringify(keep));
  await env.SETTINGS.put('leads', JSON.stringify(leads));
  return { checked: q.length, delivered: done, waiting: keep.length };
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
  const rows = leads.map((l) => `<tr><td>${new Date(l.at).toLocaleString('ru-RU')}</td><td>${l.lead.name || ''}</td><td>${l.lead.phone}</td><td>${TYPES[leadType(l.lead)]}</td><td>${l.lead.service || ''}</td><td>${[l.lead.date, l.lead.time].filter(Boolean).join(' ') || l.lead.slot || ''}</td><td>${Object.entries(l.result).map(([k, r]) => r.error ? `<span class="bad">${k}: ${r.error}</span>` : `<span class="ok">${k} ✓</span>`).join('<br>') || '—'}</td></tr>`).join('');
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
    <p class="hint">Тело запроса: { name, phone, service, type, date, time, contact, slot, format, page, utm_* , source: "internaclinic.kz" }</p>
  </div>
  <h2 style="margin-top:22px">Уведомления</h2>
  <div class="row"><div><label>E-mail для копии заявки</label><input name="notify.email" value="${v(s.notify?.email)}" placeholder="info@internaclinic.kz"></div><div><label>Когда слать письмо</label><select name="notify.mode"><option value="fail" ${s.notify?.mode !== 'always' ? 'selected' : ''}>Только если CRM не ответила</option><option value="always" ${s.notify?.mode === 'always' ? 'selected' : ''}>На каждую заявку</option></select></div></div>
  <p class="hint">Письмо уходит через Resend (секрет RESEND_API_KEY) или, без ключа, через formsubmit.co — адрес нужно один раз подтвердить по письму-активации.</p>
  <div class="row"><div><label>WhatsApp для кнопок на сайте</label><input name="notify.whatsapp" value="${v(s.notify?.whatsapp)}" placeholder="+77007110550"></div></div>
  <h2 style="margin-top:22px">Заявки в WhatsApp администратора (Cloud API)</h2>
  <div class="row"><div><label>Phone number ID (Meta → WhatsApp → API Setup)</label><input name="wa.phoneId" value="${v(s.wa?.phoneId)}" placeholder="123456789012345"></div><div><label>Кому слать — номера через запятую</label><input name="wa.to" value="${v(s.wa?.to)}" placeholder="77007110550, 77016210515"></div></div>
  <div class="row"><div><label>Имя шаблона (Utility, 4 параметра)</label><input name="wa.template" value="${v(s.wa?.template)}" placeholder="lead_site"></div><div><label>Язык шаблона</label><input name="wa.lang" value="${v(s.wa?.lang || 'ru')}" placeholder="ru"></div></div>
  <p class="hint">Токен — секрет <code>WA_TOKEN</code> (постоянный токен системного пользователя Meta). Сообщение уходит на каждую заявку сразу, независимо от CRM; если CRM не ответила, в сообщении будет пометка. Без шаблона отправляется обычный текст — WhatsApp доставит его только в течение 24 часов после того, как получатель сам написал на номер клиники.</p>
  <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn" type="submit">Сохранить</button><button class="btn line" type="button" id="test">Отправить тестовую заявку</button></div>
  <div id="msg"></div>
</form>
<div class="card"><h2>Последние заявки <span class="badge">${leads.length}</span></h2>
<div style="overflow:auto"><table><thead><tr><th>Когда</th><th>Имя</th><th>Телефон</th><th>Тип</th><th>Услуга</th><th>Время</th><th>Доставка</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="color:#7E9AAC">Пока нет заявок</td></tr>'}</tbody></table></div></div>
</div>
<script>
const f=document.getElementById('f'),p=document.getElementById('provider'),msg=document.getElementById('msg');
const show=()=>document.querySelectorAll('.prov').forEach(d=>d.classList.toggle('on',d.dataset.p.split(' ').includes(p.value)));p.onchange=show;show();
const collect=()=>{const o={provider:p.value,bitrix:{},custom:{},notify:{},wa:{}};for(const el of f.querySelectorAll('[name]')){const [a,b]=el.name.split('.');if(b)o[a][b]=el.value.trim();}return o;};
f.onsubmit=async e=>{e.preventDefault();msg.textContent='Сохраняю…';const r=await fetch('/admin/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(collect())});msg.textContent=r.ok?'✓ Сохранено':'Ошибка сохранения';};
document.getElementById('test').onclick=async()=>{msg.textContent='Отправляю тест…';const r=await fetch('/admin/test',{method:'POST'});const d=await r.json();msg.innerHTML=Object.entries(d.result||{}).map(([k,v])=>v.error?'<span class="bad">'+k+': '+v.error+'</span>':'<span class="ok">'+k+' ✓ id '+(v.id||'')+'</span>').join('<br>')||'Провайдер не выбран — заявка только в журнале';setTimeout(()=>location.reload(),1500);};
</script></body></html>`;
}

/* ───────── роутер ───────── */
export default {
  async scheduled(_ev, env, ctx) { ctx.waitUntil(retryPending(env)); },
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const C = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: C });

    if (path === '/health') return json({ ok: true, ts: Date.now(), pending: ((await env.SETTINGS.get('pending', 'json')) || []).length }, 200, C);
    if (path === '/retry' && req.method === 'POST' && authed(req, env)) return json(await retryPending(env), 200, C);

    if (path === '/lead' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const phone = String(body.phone || '').replace(/[^\d+]/g, '');
      if (phone.replace(/\D/g, '').length < 10) return json({ ok: false, error: 'phone' }, 400, C);
      if (!body.agree) return json({ ok: false, error: 'consent' }, 400, C);
      if (body.website) return json({ ok: true }, 200, C); // honeypot для ботов
      const S = (v, n) => String(v || '').slice(0, n);
      const resume = body.resume && typeof body.resume.data === 'string' && body.resume.data.length < 7.2e6 ? body.resume : null; // ≤ 5 МБ файла в base64
      const lead = { name: S(body.name, 120), phone, service: S(body.service, 120), type: S(body.type, 20), date: S(body.date, 20), time: S(body.time, 40), contact: S(body.contact, 20), slot: S(body.slot, 60), format: S(body.format, 40),
        position: S(body.position, 120), message: S(body.message, 2000), resumeName: resume ? S(resume.name, 120).replace(/[^\w.\-а-яёА-ЯЁәғқңөұүһіӘҒҚҢӨҰҮҺІ ]/g, '_') : '', resume: resume ? resume.data : undefined,
        page: S(body.page, 200), referrer: S(body.referrer, 300), utm_source: S(body.utm_source, 100), utm_medium: S(body.utm_medium, 100), utm_campaign: S(body.utm_campaign, 100), gclid: S(body.gclid, 120), yclid: S(body.yclid, 120), fbclid: S(body.fbclid, 120), ip: req.headers.get('cf-connecting-ip') || '' };
      const settings = await getSettings(env);
      const result = await dispatch(lead, settings, env);
      const id = crypto.randomUUID();
      const stored = { ...lead, resume: undefined };
      await log(env, { id, at: Date.now(), lead: stored, result });
      await enqueue(env, id, stored, result);
      const delivered = Object.entries(result).filter(([k]) => !NOTIFY.includes(k)).every(([, r]) => !r.error) || !result.email?.error;
      return json({ ok: delivered || settings.provider === 'none', result }, 200, C);
    }

    if (path === '/slots' && req.method === 'GET') {
      // Этап 2: здесь проксируем свободные окна из CRM. Пока — демо-слоты, сайт умеет их рисовать.
      const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
      const slots = [1, 3, 5, 25, 27, 30].map((h) => { const d = new Date(now.getTime() + h * 3600e3); return { time: `${pad(d.getHours())}:${pad(Math.round(d.getMinutes() / 15) * 15 % 60)}`, day: h < 24 ? 'сегодня' : 'завтра', iso: d.toISOString() }; });
      return json({ demo: true, slots }, 200, C);
    }


    /* ── OAuth для Decap CMS (GitHub): /auth → GitHub → /callback → токен в окно админки ── */
    if (path === '/auth') {
      if (!env.GITHUB_CLIENT_ID) return json({ error: 'GITHUB_CLIENT_ID не задан' }, 500);
      const u = new URL('https://github.com/login/oauth/authorize');
      u.searchParams.set('client_id', env.GITHUB_CLIENT_ID); u.searchParams.set('scope', 'repo,user'); u.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(u.toString(), 302);
    }
    if (path === '/callback') {
      const code = url.searchParams.get('code');
      const r = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }) });
      const d = await r.json().catch(() => ({ error: 'bad_response' }));
      const msg = d.error ? `error:${JSON.stringify(d)}` : `success:${JSON.stringify({ token: d.access_token, provider: 'github' })}`;
      const html = `<!doctype html><meta charset="utf-8"><title>Вход…</title><p style="font:600 15px system-ui;padding:24px">Входим в админку…</p><script>
        (function(){ function send(e){ window.opener.postMessage('authorization:github:${msg.replace(/'/g, "\\'")}', e.origin); window.removeEventListener('message', send); window.close(); }
        window.addEventListener('message', send, false); window.opener.postMessage('authorizing:github', '*'); })();</script>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
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
        const lead = { name: 'Тест с сайта', phone: '+77000000000', service: 'Проверка интеграции', slot: 'сейчас', page: '/admin', format: '', type: 'visit', contact: 'WhatsApp' };
        const result = await dispatch(lead, settings, env); await log(env, { at: Date.now(), lead, result, test: true });
        return json({ ok: true, result });
      }
      if (path === '/admin/log') return json((await env.SETTINGS.get('leads', 'json')) || []);
    }
    return json({ error: 'not found' }, 404, C);
  },
};
