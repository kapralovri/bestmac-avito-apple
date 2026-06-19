# Развёртывание на VPS — пошагово

Поднимаем 3 автоматических процесса (после настройки крутятся сами, переживают ребут):

| Процесс | Что делает | Как запускается |
|---|---|---|
| `bestmac-bot.service` | двусторонний бот переговоров | всегда онлайн, авто-перезапуск |
| `bestmac-scanner.timer` | сканер «ниже рынка» | каждые 15 минут |
| `bestmac-digest.timer` | вечерний дайджест | раз в сутки (20:00 по времени сервера) |

---

## Что тебе нужно сделать (один раз)

### 1. Зайти на VPS и обновить код
```bash
ssh пользователь@твой-сервер
cd /путь/до/bestmac-avito-apple     # папка, где уже лежит проект
git pull
```

### 2. Создать файл секретов `.env` в корне репозитория
```bash
cp scripts/deploy/.env.example .env
nano .env
```
Заполни как минимум:
- `TELEGRAM_NOTIFY_URL` — как сейчас (уведомления о сделках);
- `TELEGRAM_BOT_TOKEN` — токен **того же** бота (у @BotFather → твой бот → «API Token»);
- `RUCAPTCHA_API_KEY`, `DEEPSEEK_API_KEY` — как сейчас.

Сохрани (Ctrl+O, Enter, Ctrl+X).

### 3. Запустить установщик
```bash
bash scripts/deploy/install.sh
```
Он сам определит пути, создаст systemd-сервисы, включит их и запустит.

### 4. Активировать бота
Напиши своему боту в Telegram **`/start`** — он запомнит твой chat_id и начнёт слать лиды на торг.

**Готово.** Дальше всё автоматически.

---

## Проверить, что работает
```bash
# Бот онлайн?
systemctl status bestmac-bot.service

# Живой лог бота / сканера
journalctl -u bestmac-bot.service -f
journalctl -u bestmac-scanner.service -f

# Когда следующие запуски таймеров
systemctl list-timers 'bestmac-*'
```

## После любого обновления кода
```bash
cd /путь/до/bestmac-avito-apple
git pull
sudo systemctl restart bestmac-bot.service     # сканер/дайджест подхватятся на следующем запуске
```
Можно просто заново выполнить `bash scripts/deploy/install.sh` — он идемпотентен.

---

## Важно: не запускать сканер дважды
Если раньше сканер крутился через свой цикл (`while true … scanner_v2.py`), cron или
старый `.replit` — **выключи его**, иначе будет два параллельных сканера:
```bash
# пример: если был свой сервис/цикл — останови и отключи его
# pkill -f scanner_v2.py   (разовый цикл)
# crontab -e               (убери старую строку про scanner)
```
systemd-таймер из этой инструкции — единственный источник запуска.

---

## Если на VPS НЕТ systemd / нет root (напр. shared-хостинг Beget)

Бот — фоном через `nohup`, сканер — через `cron`:
```bash
cd /путь/до/bestmac-avito-apple
# Бот (всегда онлайн):
nohup python3 scripts/negotiation-bot/bot.py >> bot.log 2>&1 &

# Сканер каждые 15 мин и дайджест в 20:00 — добавь в crontab -e:
*/15 * * * * cd /путь/до/bestmac-avito-apple && python3 scripts/hot-deals-scanner/scanner_v2.py >> scan.log 2>&1
0 20 * * *  cd /путь/до/bestmac-avito-apple && python3 scripts/hot-deals-scanner/scanner_v2.py --digest >> scan.log 2>&1
```
Минус: `nohup`-процесс не переживёт ребут сервера — после перезагрузки запусти бота снова.
systemd-вариант (основной выше) от этого избавлен.

---

## Частые вопросы
- **Нужен ли новый бот?** Нет. Тот же бот, что шлёт сделки, становится двусторонним по своему токену.
- **Нужны новые зависимости?** Нет. Бот использует `requests`, который уже стоит для сканера.
- **Где хранятся диалоги/очередь?** `public/data/negotiation-state.json` и `negotiation-queue.json` (локально, в git не попадают).
- **Лиды не приходят?** Сканер кладёт в очередь только лоты, прошедшие порог (score ≥ 75). Проверь лог сканера и что бот получил `/start`.
