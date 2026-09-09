// POST /api/lead → лид в Битрикс24. Поля: name, phone, service, slot, agree.
export async function onRequestPost({ request, env }) {
  const data = await request.json().catch(() => ({}));
  if (!data.phone || !data.agree) return new Response(JSON.stringify({ ok: false, error: 'phone_or_consent' }), { status: 400 });
  const fields = {
    TITLE: `Сайт · ${data.service || 'Запись'} · ${data.phone}`,
    NAME: data.name || '',
    PHONE: [{ VALUE: data.phone, VALUE_TYPE: 'WORK' }],
    SOURCE_ID: 'WEB',
    COMMENTS: `Услуга: ${data.service || '-'}\nЖелаемое время: ${data.slot || '-'}\nСтраница: ${data.page || '-'}`
  };
  const r = await fetch(env.BITRIX_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  return new Response(JSON.stringify({ ok: r.ok }), { headers: { 'content-type': 'application/json' } });
}
