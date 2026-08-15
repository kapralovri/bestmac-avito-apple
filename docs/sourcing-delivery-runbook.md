# Раннбук доставки сорсинг-сигналов основателю (GST-58 → GST-32 / GST-49)

Движок готов и **15 живых сигналов уже в боевой БД** (Supabase `sxitdundeblljudxrvpa`).
Осталась одна вещь — секреты. Их держит основатель/CEO. Ниже — как ты сам добавишь их
и получишь первый сигнал. Секреты **никуда не коммитятся**, только в окружение.

Есть два канала. **Telegram — самый быстрый** (5 минут, без деплоя). Кабинет/API — второй слой.

---

## Канал A — Telegram (рекомендуется, ~5 минут, деплой не нужен)

### Что понадобится (4 секрета)

| Переменная | Где взять |
|---|---|
| `SUPABASE_URL` | `https://sxitdundeblljudxrvpa.supabase.co` (уже известно) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → проект `sxitdundeblljudxrvpa` → **Project Settings → API → `service_role` secret** |
| `TELEGRAM_BOT_TOKEN` | Открой [@BotFather](https://t.me/BotFather) → `/newbot` → назови бота → он вернёт токен вида `123456:ABC...` |
| `OWNER_CHAT_ID` | Напиши своему новому боту любое сообщение, потом открой [@userinfobot](https://t.me/userinfobot) → он покажет твой `Id` (число) |

> `service_role` даёт полный доступ к БД — **никому не пересылай, не коммить**. Он живёт только в env.

### Шаг 1. Сначала dry-run (проверка без отправки, нужны только 2 секрета Supabase)

```bash
cd bestmac-avito-apple
npm install   # если ещё не ставил зависимости

SUPABASE_URL="https://sxitdundeblljudxrvpa.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<твой service_role key>" \
DRY_RUN=1 npm run sourcing:push
```

Ожидаемо: в консоль печатается готовое сообщение с топ-6 сигналами. Ничего не отправляется.

### Шаг 2. Реальная отправка в Telegram (все 4 секрета)

```bash
SUPABASE_URL="https://sxitdundeblljudxrvpa.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key>" \
TELEGRAM_BOT_TOKEN="<токен от BotFather>" \
OWNER_CHAT_ID="<твой chat id>" \
npm run sourcing:push
```

Ожидаемо: `✅ Отправлено в Telegram: 6 сигнал(ов)` и сообщение в чате с ботом.

**Это и есть DoD GST-58: первый реальный сигнал «докупать» у основателя.**

Опции: `SIGNAL_LIMIT=10` (сколько сигналов), `HOT_ONLY=1` (только 🔥).

---

## Канал B — Живой API + деплой Vercel (GST-49, второй слой под кабинет GST-31)

Нужно, чтобы `GET /api/sourcing/signals` отвечал вживую и кабинет мог его читать.

### Шаг 1. Добавь env в Vercel

Vercel → проект → **Settings → Environment Variables** (Production + Preview):

| Ключ | Значение |
|---|---|
| `SUPABASE_URL` | `https://sxitdundeblljudxrvpa.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | тот же `service_role` из Supabase |

> Роут server-only (`runtime = nodejs`), ключ на клиент не попадает.

### Шаг 2. Смержи PR и задеплой

- PR: `main...feat/gst-58-sourcing-first-signal`
- После мержа Vercel задеплоит автоматически.

### Шаг 3. Проверь живой эндпоинт

```bash
curl -s "https://<твой-домен>/api/sourcing/signals" | jq '.count, .signals[0]'
```

Ожидаемо: `count > 0`, первый объект — MacBook Pro 16 (2024), `target_buy_price_rub: 177000`.
`?all=1` — весь фид (для кабинета), без параметра — только рекомендованные.

---

## Обновление сигналов (когда обновятся цены Avito)

```bash
# 1) пересобрать SQL из свежих данных парсера
npm run sourcing:build -- --sql > scripts/sourcing/seed.generated.sql
# 2) применить seed к БД (через Supabase SQL editor или psql), затем снова:
npm run sourcing:push
```

Движок идемпотентен по `model_key` (`on conflict do update`) и **никогда** не пишет
`resale_median_rub <= 0` (фикс F1 — не нарушает CHECK на боевом upsert).

---

## Если что-то пошло не так

| Симптом | Причина / фикс |
|---|---|
| `supabase_env_missing` от API | не заданы `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` в Vercel |
| `Запрос к Supabase упал` | неверный `service_role key` или проект недоступен |
| `Telegram API вернул ошибку 400 chat not found` | не тот `OWNER_CHAT_ID` или ты не написал боту первым |
| `Telegram API вернул 401` | неверный `TELEGRAM_BOT_TOKEN` |
| Сигналов 0 | все модели ниже порога маржи 15 000 ₽ — это валидный результат, не баг |
