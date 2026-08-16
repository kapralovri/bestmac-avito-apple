# Раннбук доставки сорсинг-сигналов основателю (GST-56 / GST-58)

Движок готов и **15 живых сигналов уже в боевой БД** (Supabase `sxitdundeblljudxrvpa`).
Доставка идёт в **уже работающий бот основателя `@bestmac_hunter_bot`** — новый бот
заводить НЕ нужно. Токен (`TELEGRAM_BOT_TOKEN`) и `OWNER_CHAT_ID` уже лежат в `.env`
на VPS (тот же файл, что читает `scripts/negotiation-bot/bot.py`). Node-скрипт
`push-telegram.mjs` теперь сам подхватывает этот `.env` — переиспользуем всё как есть.

Есть два канала. **Telegram — самый быстрый** (одна команда). Кабинет/API — второй слой.

---

## Канал A — Telegram через @bestmac_hunter_bot (рекомендуется)

### Что понадобится

**Ничего нового.** Токен бота и chat id уже прописаны в `.env` на VPS
(`@bestmac_hunter_bot`), а данные скрипт читает публичным anon-ключом (витрина
`sourcing_signal_feed` открыта только на чтение, базовые таблицы закрыты RLS —
ключ зашит в скрипт как безопасный дефолт).

| Переменная | Статус |
|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ уже в `.env` (@bestmac_hunter_bot) |
| `OWNER_CHAT_ID` | ✅ уже в `.env` (@bestmac_hunter_bot) |
| Supabase URL / ключ | ✅ публичные дефолты в скрипте, ничего добавлять не нужно |

> Хочешь читать под сервисной ролью — можно задать `SUPABASE_SERVICE_ROLE_KEY` в `.env`
> (переопределит anon). Это необязательно и по умолчанию не нужно.

### Шаг 1. Dry-run (проверка без отправки)

```bash
cd bestmac-avito-apple
npm install                 # если зависимости ещё не стоят
DRY_RUN=1 npm run sourcing:push
```

Ожидаемо: в консоль печатается готовое сообщение с топ-сигналами. Ничего не отправляется.

### Шаг 2. Реальная отправка в @bestmac_hunter_bot (одна команда)

```bash
npm run sourcing:push          # или: npm run sourcing:digest
```

Ожидаемо: `✅ Отправлено в Telegram: N сигнал(ов)` и сообщение в чате с ботом.

**Это и есть DoD GST-56/GST-58: первый реальный сигнал «докупать» у основателя,
в его же боте, без единого нового секрета.**

Опции: `SIGNAL_LIMIT=10` (сколько сигналов), `HOT_ONLY=1` (только 🔥).

### Шаг 3. Автоматизация — раз в сутки (уже в install.sh)

`scripts/deploy/install.sh` ставит таймер `bestmac-sourcing.timer` (09:30 по времени
сервера) рядом с существующими сканером и вечерним дайджестом. Дайджест сигналов
начнёт уходить в `@bestmac_hunter_bot` сам:

```bash
bash scripts/deploy/install.sh
systemctl list-timers 'bestmac-*'      # проверить расписание
systemctl start bestmac-sourcing.service   # разовый прогон прямо сейчас
```

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

## Живые лоты Avito в сигнале (GST-61) — делает «докупать» кликабельным

Сигнал выше — на уровне **моделей** (медианы). Чтобы под каждой моделью появились
**конкретные объявления со ссылками** (дешевле цены выкупа, с расчётной прибылью),
работает второй контур: `avito_listing` + витрина `sourcing_listing_feed`.

Поток данных (кто где запускается):

1. **VPS (Python-парсер).** `parser.py` при каждом прогоне пишет
   `public/data/avito-listings.json` — сырые лоты `{model_name, processor, ram, ssd,
   price, url, seen_at}` (только по конфигам, попавшим в статистику). Файл коммитится
   в репозиторий рядом с `avito-prices.json`.
2. **CTO/CI (Node).** `build-listings.mjs` берёт `avito-listings.json`, считает
   `model_key` тем же кодом, что и движок сигналов (общий `buildModelKeyMap` из
   `build-signals.mjs` — ключи лотов **никогда** не расходятся с ключами сигналов),
   и генерит upsert:

   ```bash
   npm run sourcing:listings -- --sql > scripts/sourcing/listings.generated.sql
   # применить к БД (Supabase SQL editor / psql). Идемпотентно по url (on conflict).
   npm run sourcing:listings -- --json      # предпросмотр совпадений без записи
   ```
3. **VPS (доставка).** `push_telegram.py` / `push-telegram.mjs` под каждой моделью
   показывают до **3** лотов: `• лот за 130 000 ₽ → <ссылка> · прибыль ~27 000 ₽`.
   Ничего дополнительно настраивать не нужно — тот же токен и тот же anon-ключ.

Гарантии витрины `sourcing_listing_feed`:
- только `is_recommended` модели, только лоты с `price ≤ target_buy_price_rub`;
- **свежесть 48 ч** (`seen_at >= now() - interval '48 hours'`) — ушедшие лоты сами
  выпадают, мёртвых ссылок в сигнале не будет;
- сортировка по `unit_profit_rub` (перепродажа − цена лота − издержки), топ-N на модель;
- базовая таблица `avito_listing` закрыта RLS + `revoke` (anon читает только витрину).

> Если свежих лотов дешевле цены выкупа нет — под моделью честно пишется «живых лотов
> дешевле цены выкупа сейчас нет», а сам сигнал по модели остаётся.

---

## Если что-то пошло не так

| Симптом | Причина / фикс |
|---|---|
| `supabase_env_missing` от API | не заданы `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` в Vercel |
| `Запрос к Supabase упал` | неверный `service_role key` или проект недоступен |
| `Telegram API вернул ошибку 400 chat not found` | не тот `OWNER_CHAT_ID` или ты не написал боту первым |
| `Telegram API вернул 401` | неверный `TELEGRAM_BOT_TOKEN` |
| Сигналов 0 | все модели ниже порога маржи 15 000 ₽ — это валидный результат, не баг |
