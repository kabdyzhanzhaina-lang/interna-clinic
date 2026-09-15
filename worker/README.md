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

## Вход в админку сайта (Decap CMS, `/admin/` на сайте)

Админка редактирует JSON-файлы в GitHub и коммитит их; воркер выступает OAuth-провайдером GitHub.

1. GitHub → Settings → Developer settings → OAuth Apps → New: Homepage — адрес сайта, **Authorization callback URL** — `https://<адрес воркера>/callback`.
2. Секреты воркера:
   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```
3. В `public/admin/config.yml` заменить `base_url` на адрес воркера. Пересобрать сайт.
4. Открыть `https://<сайт>/admin/`, войти через GitHub (аккаунт должен иметь права на репозиторий).

Что редактируется: врачи, прайс, акции, отзывы, вопросы-ответы, медиацентр, оборудование. Услуги и check-up — пока только через файлы в `src/data`.
