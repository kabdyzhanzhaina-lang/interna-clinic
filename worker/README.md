# API сайта и админка «Интеграции»

Сайт статичный (GitHub Pages), поэтому всё, что связано с CRM, живёт в отдельном API — Cloudflare Worker (бесплатный тариф).
Сайт от конкретной CRM не зависит: куда уходят заявки, задаётся в админке `/admin`.

```
сайт (форма записи) ──POST /lead──▶ Worker ──▶ Битрикс24 (crm.lead.add)
                                         └──▶ Своя CRM клиники (POST JSON + Bearer)
                                         └──▶ Журнал заявок (KV) + админка
сайт (виджет слотов) ──GET /slots──▶ Worker ──▶ CRM (этап 2)
```

## Развёртывание (один раз, ~10 минут, нужен аккаунт Cloudflare — бесплатный)

```bash
cd worker
npx wrangler login                          # откроется браузер — войти в Cloudflare
npx wrangler kv namespace create SETTINGS   # вернёт id → вставить в wrangler.toml
npx wrangler secret put ADMIN_PASSWORD      # пароль админки
npx wrangler deploy                         # адрес вида https://interna-api.<account>.workers.dev
```

Потом в GitHub → Settings → Variables добавить `PUBLIC_API_URL=https://interna-api.<account>.workers.dev` — сайт начнёт слать заявки туда.
На своём домене: в Cloudflare привязать `api.internaclinic.kz` к воркеру.

## Админка `/admin`

Логин — любой, пароль — `ADMIN_PASSWORD`. Разделы:

- **Куда отправлять заявки**: никуда / Битрикс24 / своя CRM / обе.
- **Битрикс24**: входящий вебхук, ответственный, источник. Кнопка «Тестовая заявка» создаёт лид и показывает ответ Битрикса.
- **Своя CRM**: адрес приёма и токен. Формат тела запроса описан в форме.
- **Журнал**: последние заявки с результатом доставки — видно, если CRM не ответила.

## Контракт для своей CRM

`POST {url}` с заголовком `Authorization: Bearer <token>` и телом:

```json
{ "source": "internaclinic.kz", "name": "Имя", "phone": "+7705…", "service": "Колоноскопия",
  "slot": "14:30, сегодня", "format": "амбулаторно", "page": "/service/colonoscopy",
  "utm_source": "", "utm_medium": "", "utm_campaign": "" }
```

Ответ — любой 2xx. Для слотов записи (этап 2) CRM должна отдавать `GET /slots?doctor=&date=` → `[{ time, iso, doctorId }]`.
