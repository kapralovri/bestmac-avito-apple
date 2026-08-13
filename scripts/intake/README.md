# Домашний коллектор Avito (расширение) → VPS-мозг

Реальный Chrome на домашнем IP (iMac) обходит троттлинг/капчу, которые мучают VPS.
Расширение собирает карточки и шлёт их на VPS, где работает наш существующий мозг
(классификатор/база/состояние/перекуп → Telegram + лиды боту).

```
iMac Chrome + расширение (домашний IP, поиск)
        │  POST карточки (https, токен в заголовке x-intake-token)
        ▼
bestmac.ru/api/intake  (Vercel, HTTPS-фронт, CORS сужён до avito.ru)
        │  форвард (https)
        ▼
Caddy :443 (intake.bestmac.ru, Let's Encrypt)
        │  reverse_proxy на localhost
        ▼
VPS intake-сервер 127.0.0.1:8787 → incoming-cards.json
        │  раз в 2 мин
        ▼
scanner_v2.py --intake → deep_analyze кандидатов → Telegram + бот
```

> **Безопасность контура (GST-10, P0-3):** весь путь под TLS; порт 8787 наружу НЕ
> открыт (server.py слушает 127.0.0.1, TLS терминирует Caddy на поддомене); токен
> ходит в заголовке `x-intake-token`, а не в теле; CORS сужён до origin страницы
> Avito. Подробности деплоя Caddy — в разделе «3.1» ниже.

## 1. Придумай токен
Один секрет (любая длинная строка), он должен совпадать в ТРЁХ местах: Vercel,
VPS `.env`, расширение. Например: `bm_intake_9f3k...` (свой).

## 2. Vercel (HTTPS-фронт)
В дашборде Vercel проекта → Settings → Environment Variables:
- `INTAKE_TOKEN` = твой токен
- `INTAKE_VPS_URL` = `https://intake.bestmac.ru/intake`  ← HTTPS через Caddy (см. 3.1)
- (опц.) `INTAKE_ALLOWED_ORIGINS` = `https://www.avito.ru,https://m.avito.ru` — allowlist
  CORS. По умолчанию уже эти домены; менять, только если origin расширения другой.
→ Redeploy. Появится `https://bestmac.ru/api/intake`.

## 3. VPS (intake-сервер + обработчик)
`bash scripts/deploy/install.sh` поднимает сервисы:
- `bestmac-intake.service` — приём, всегда онлайн, слушает **только 127.0.0.1** (за Caddy).
- `bestmac-intake-proc.timer` — `--intake` раз в 2 мин, обрабатывает накопленные карточки.

Перед этим впиши в `$REPO_DIR/.env`: `INTAKE_TOKEN=твой_токен`.
Порт 8787 наружу открывать **НЕ нужно** — доступ снаружи только через Caddy по TLS.

## 3.1. TLS-фронт (Caddy)
1. DNS: добавь A-запись `intake.bestmac.ru` → IP VPS (`84.54.28.114`). Апекс `bestmac.ru`
   остаётся на Vercel — поддомен на VPS не конфликтует.
2. Открой порты **443** и **80** (80 нужен ACME-челленджу Let's Encrypt).
3. `sudo bash scripts/intake/setup-tls.sh` — поставит Caddy, разложит `Caddyfile`
   (`scripts/intake/Caddyfile`), выпустит сертификат и включит reverse-proxy на `:8787`.
4. Проверка: `curl -s https://intake.bestmac.ru/ | head` →
   `{"ok": true, "service": "bestmac-intake"}`.

## 4. iMac (расширение)
1. Chrome → `chrome://extensions` → включи «Режим разработчика».
2. «Загрузить распакованное» → выбери папку `scripts/avito-extension`.
3. Кликни иконку расширения → впиши **endpoint** `https://bestmac.ru/api/intake` и
   **токен** (тот же) → «Сохранить».
4. Нажми **«▶️ Запустить мониторинг (4 вкладки)»** — откроются 4 вкладки Авито,
   каждая сама обновляется раз в ~75 сек и шлёт новые лоты.
5. Чтобы iMac не засыпал (экран гасить можно):
   `caffeinate -dimsu &`  или Системные настройки → Экономия энергии →
   «Не давать засыпать при выключенном дисплее».

## Проверка
- В попапе расширения растёт «Отправлено всего: N».
- На VPS: `cat /opt/bestmac/public/data/incoming-cards.json | head` (копятся карточки).
- Сделки приходят в Telegram как обычно (через наш мозг).

## Важно
- Отдельный аккаунт Авито на iMac (не основной).
- Токен — низкочувствительный «ключ от приёмника»; если светанулся, поменяй в 3 местах.
- Токен теперь ходит в заголовке `x-intake-token` поверх TLS (не в теле). После
  обновления расширения (v1.4.0) перезагрузи его в `chrome://extensions`.
- Порт 8787 наружу закрыт (server.py на 127.0.0.1); снаружи — только Caddy по HTTPS.
