#!/usr/bin/env python3
"""
Двусторонний Telegram-бот переговоров (тот же бот, что шлёт сделки — теперь
принимает нажатия и пересланные ответы продавцов).

Петля:
  1) Сканер кладёт мотивированные лоты в очередь (negotiation-queue.json).
  2) Бот постит лот тебе с кнопкой «▶️ Веду торг».
  3) Жмёшь — бот (через common.negotiator) даёт открывающее сообщение продавцу.
  4) Ты отправляешь его продавцу (вручную) и жмёшь «✅ Отправил, жду ответ».
  5) Пересылаешь боту ответ продавца обычным текстом — бот даёт следующий ход.
  6) Когда сошлись в пределах потолка — «🤝 ГОТОВ К СДЕЛКЕ: X ₽» + контакты/логистика.

Использует Bot API напрямую (requests) и ТОТ ЖE токен бота — TELEGRAM_BOT_TOKEN.
Никаких новых зависимостей. Сетевой слой (TelegramTransport) тонкий и инъектируемый,
поэтому маршрутизация апдейтов тестируется офлайн.

Запуск:  TELEGRAM_BOT_TOKEN=123:abc python3 scripts/negotiation-bot/bot.py
"""

from __future__ import annotations

import os
import re
import sys
import json
import time
import logging
from pathlib import Path
from typing import Optional, Callable, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.negotiator import next_move, NegotiationMove
from common.classifier import classify
from common.subscriptions import (
    load_subscriptions, save_subscriptions, make_subscription, match_from_config,
)

# GST-60: «Найти сделки» прямо из бота. Переиспуем готовый сорсинг-дайджест
# (тот же, что уходит в рассылке). Импорт защищён — бот поднимается даже без модуля.
try:
    from sourcing.push_telegram import fetch_signals, fetch_listings, render_message
except Exception:  # noqa: BLE001
    fetch_signals = fetch_listings = render_message = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NegotiationBot")


def _load_dotenv():
    """Минимальный загрузчик .env (рядом со скриптом, в корне репо или в cwd).
    Без зависимостей. НЕ перетирает уже заданные переменные окружения."""
    here = Path(__file__).resolve()
    bases = [here.parent, here.parent.parent.parent, Path.cwd()]   # bot/ , repo root, cwd
    for base in bases:
        envf = base / ".env"
        if not envf.exists():
            continue
        try:
            for line in envf.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass


_load_dotenv()

BOT_TOKEN   = os.environ.get('TELEGRAM_BOT_TOKEN', '')
STATE_FILE  = Path(os.environ.get('NEGOTIATION_STATE_PATH', 'public/data/negotiation-state.json'))
QUEUE_FILE  = Path(os.environ.get('NEGOTIATION_QUEUE_PATH', 'public/data/negotiation-queue.json'))
WATCHLIST_FILE = Path(os.environ.get('WATCHLIST_PATH', 'public/data/watchlist.json'))
# Пульс домашнего коллектора (приёмник + обработчик пишут, кнопка «Статус» читает)
INTAKE_STATS_FILE = Path(os.environ.get('INTAKE_STATS_PATH', 'public/data/intake-stats.json'))
PROC_STATS_FILE = Path(os.environ.get('INTAKE_PROC_STATS_PATH', 'public/data/intake-proc-stats.json'))
# Ограничить бота одним владельцем (твоим chat_id). Пусто — учится на первом /start.
OWNER_CHAT_ID = os.environ.get('OWNER_CHAT_ID', '').strip()
# GST-72: «/модель» триггерит живой поиск на Avito через workflow_dispatch —
# бот сам не открывает браузер/не решает капчу, а просит уже проверенный
# GitHub Actions раннер (тот же, что гоняет ежедневный парсер) прогнать разовый
# запрос и прислать результат сюда же. Токен — тонкий PAT только с правом
# "Actions: write" на этот репозиторий, НЕ основной GITHUB_TOKEN экшна.
GH_DISPATCH_TOKEN = os.environ.get('GH_DISPATCH_TOKEN', '').strip()
GH_REPO = os.environ.get('GH_REPO', 'kapralovri/bestmac-avito-apple').strip()
GH_MODEL_SEARCH_WORKFLOW = os.environ.get('GH_MODEL_SEARCH_WORKFLOW', 'avito-model-search.yml').strip()
# Каталог точных моделей парсера (те же URL, что и в scripts/avito-parser/parser.py) —
# позволяет /модель отличить ТОЧНОЕ совпадение с уже сконфигурированной моделью
# (даём прямую ссылку на мониторинг через расширение) от свободного текста
# (уходит в разовый живой поиск, как раньше).
MODELS_CONFIG_FILE = Path(os.environ.get('MODELS_CONFIG_PATH', 'public/data/models-config.json'))
# GST-72: визард «/модель» без аргумента — семья → модель → конфиг кнопками,
# чтобы не ошибиться в написании. Тот же parser-config.json, что гоняет
# ежедневный парсер (public/data/parser-config.json, вкладки Google Sheet) —
# у каждого конфига (RAM/SSD для MacBook, чип для остальных) СВОЙ точно
# отфильтрованный Avito-URL, точнее общей модельной ссылки из models-config.json.
PARSER_CONFIG_FILE = Path(os.environ.get('PARSER_CONFIG_PATH', 'public/data/parser-config.json'))
MODEL_WIZARD_FAMILIES = ["MacBook", "iMac", "Mac mini", "Mac Studio"]


# ─── GST-75: меню команд Telegram ────────────────────────────────────────────
# Без setMyCommands по «/» виден только /start, и обо всём остальном нужно знать
# наизусть. Имена команд Telegram принимает ТОЛЬКО латиницей (a-z, 0-9, _), так
# что в меню уезжают английские алиасы — русские /сделки, /модель, /подписки
# продолжают работать в чате, но зарегистрировать их нельзя. Описания кириллицей
# можно, они и видны в списке.
BOT_COMMANDS: list[tuple[str, str]] = [
    ("deals",  "🔍 Какие Mac выгодно выкупать прямо сейчас"),
    ("model",  "🔎 Выбрать модель → ссылка на мониторинг"),
    ("subs",   "🔔 Мои подписки «модель + моя цена»"),
    ("status", "🩺 Жив ли домашний коллектор Avito"),
    ("review", "⭐ Сообщение клиенту с просьбой об отзыве"),
    ("cancel", "✖️ Отменить текущий ввод"),
    ("help",   "❓ Как всё это работает"),
    ("start",  "▶️ Запуск и подключение чата"),
]


# Отзывы на Яндекс Картах — главный разрыв с конкурентами по выкупу (у лидеров
# ниши их тысячи). После сделки владелец берёт готовый текст и пересылает клиенту.
REVIEW_URL = "https://yandex.ru/maps/org/215912324656/reviews/?add-review=true"
REVIEW_MESSAGE = (
    "Спасибо, что выбрали BestMac! Если всё прошло хорошо, оставьте, пожалуйста, "
    "короткий отзыв на Яндекс Картах — это займёт минуту и очень нам поможет:\n"
    f"{REVIEW_URL}"
)


def _is_cancel(text: str) -> bool:
    """Отмена ввода: русская команда и латинский алиас для меню Telegram."""
    return text.startswith("/отмена") or text.startswith("/cancel")


def _fmt(n) -> str:
    return f"{int(n):,}".replace(",", " ")


def _ago(seconds) -> str:
    if seconds is None:
        return "—"
    s = int(seconds)
    if s < 0:
        s = 0
    if s < 60:
        return f"{s} сек назад"
    if s < 3600:
        return f"{s // 60} мин назад"
    if s < 86400:
        return f"{s // 3600} ч назад"
    return f"{s // 86400} дн назад"


# ─── GST-73: выключатель мертвеца для домашнего коллектора ───────────────────
# Сбор вставал на несколько часов, и узнать об этом можно было только вручную
# открыв /status. Сторож внутри расширения тут не помощник: он умирает вместе
# с Chrome — уснул Mac, закрылся браузер, отвалился Wi-Fi, и сторожить уже
# некому. Достоверно заметить тишину может только сервер, который ждёт карточки.
COLLECTOR_SILENT_MIN = int(os.environ.get('COLLECTOR_SILENT_MIN', '25'))
COLLECTOR_COOLDOWN_MIN = int(os.environ.get('COLLECTOR_COOLDOWN_MIN', '180'))
COLLECTOR_QUIET_FROM = int(os.environ.get('COLLECTOR_QUIET_FROM', '23'))
COLLECTOR_QUIET_TO = int(os.environ.get('COLLECTOR_QUIET_TO', '9'))


def in_quiet_hours(hour, start=COLLECTOR_QUIET_FROM, end=COLLECTOR_QUIET_TO) -> bool:
    """Ночное окно, когда домашний Mac штатно спит и тишина — не авария.
    Окно перешагивает полночь (23→9). Равные границы выключают тихие часы."""
    if start == end:
        return False
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end


def collector_deadman(now, last_at, state, *, silent_min=None, cooldown_min=None,
                      hour=None) -> tuple[Optional[str], dict]:
    """Чистая функция: что сказать владельцу про молчащий коллектор.

    Возвращает (текст | None, патч состояния). Тишина дольше silent_min минут —
    алерт; повтор не чаще cooldown_min; возвращение к жизни подтверждаем, иначе
    непонятно, починилось ли. Ночью не будим, а лот, который придёт в это время,
    всё равно долетит обычным алертом.
    """
    silent_min = COLLECTOR_SILENT_MIN if silent_min is None else silent_min
    cooldown_min = COLLECTOR_COOLDOWN_MIN if cooldown_min is None else cooldown_min
    hour = time.localtime(now).tm_hour if hour is None else hour

    was_down = bool(state.get("collector_down"))

    # Коллектор ни разу не присылал карточек — нечего и хоронить: скорее всего
    # расширение просто ещё не настроили.
    if not last_at:
        return None, {}

    silent_for = now - last_at
    if silent_for <= silent_min * 60:
        if was_down:
            return (f"🟢 <b>Коллектор снова на связи</b> — карточки пошли "
                    f"({_ago(silent_for)} последняя).",
                    {"collector_down": False, "collector_alert_at": now})
        return None, {}

    if in_quiet_hours(hour):
        return None, {}

    last_alert = state.get("collector_alert_at") or 0
    if was_down and now - last_alert < cooldown_min * 60:
        return None, {}

    return (f"🔴 <b>Коллектор молчит {_ago(silent_for)}</b>\n\n"
            "Расширение не присылает карточки — сбор стоит, новые лоты проходят мимо.\n"
            "Проверь: открыт ли Chrome, не уснул ли Mac, не просит ли Avito капчу "
            "(в попапе расширения видно пульс каждой вкладки).",
            {"collector_down": True, "collector_alert_at": now})


def collector_status_text(now=None, intake_stats=None, proc_stats=None) -> str:
    """Текст для кнопки «🩺 Статус коллектора»: жив ли домашний сборщик (приёмник)
    и что делает обработчик. Читает файлы-пульс, которые пишут intake-сервер и --intake."""
    now = now or time.time()
    rx = _load_json(intake_stats or INTAKE_STATS_FILE, {}) or {}
    pr = _load_json(proc_stats or PROC_STATS_FILE, {}) or {}

    last_at = rx.get("last_at")
    recent = rx.get("recent") if isinstance(rx.get("recent"), list) else []

    def window(sec):
        cut = now - sec
        total = 0
        for item in recent:
            try:
                ts, n = item[0], item[1]
            except (TypeError, IndexError):
                continue
            if ts >= cut:
                total += int(n)
        return total

    lines = ["🩺 <b>Статус коллектора</b>", ""]
    lines.append("📥 <b>Приёмник</b> (расширение → VPS):")
    if last_at:
        lines.append(f"  Последняя отправка: {_ago(now - last_at)}")
        lines.append(f"  Карточек: за 1ч — {window(3600)}, за 24ч — {window(86400)}")
    else:
        lines.append("  Данных ещё не было.")

    lines.append("")
    lines.append("🧠 <b>Обработка</b> (--intake):")
    lr = pr.get("last_run_at")
    if lr:
        lines.append(f"  Последний разбор: {_ago(now - lr)} — "
                     f"{pr.get('last_cards', 0)} карт, {pr.get('last_candidates', 0)} кандид., "
                     f"{pr.get('last_alerts', 0)} алертов")
        la = pr.get("last_alert_at")
        tail = f" (последний {_ago(now - la)})" if la else ""
        lines.append(f"  Алертов всего: {pr.get('alerts_total', 0)}{tail}")
    else:
        lines.append("  Ещё не обрабатывал карточки.")

    lines.append("")
    if not last_at:
        verdict = "🔴 расширение молчит — открой 4 вкладки и не давай Mac уснуть"
    elif now - last_at < 600:
        verdict = "🟢 коллектор активен"
    elif now - last_at < 3600:
        verdict = "🟡 нет отправок >10 мин — проверь вкладки"
    else:
        verdict = "🔴 нет отправок больше часа — расширение/Mac не работает"
    lines.append(f"Итог: {verdict}")
    return "\n".join(lines)


# ─── Тонкий сетевой слой (инъектируется в тестах) ────────────────────────────
class TelegramTransport:
    def __init__(self, token: str):
        self.base = f"https://api.telegram.org/bot{token}"
        import requests as _r
        self._r = _r

    def get_updates(self, offset: int, timeout: int = 25):
        try:
            resp = self._r.get(f"{self.base}/getUpdates",
                               params={"offset": offset, "timeout": timeout},
                               timeout=timeout + 10)
            return resp.json().get("result", [])
        except Exception as e:
            logger.error(f"getUpdates: {e}")
            return []

    def set_my_commands(self, commands):
        """Регистрирует меню команд (список по «/» в Telegram).

        Вызывается один раз при старте: Telegram хранит список на своей стороне,
        так что повторять на каждый апдейт не нужно. Сбой не должен мешать боту
        работать — меню это удобство, а не условие работы.
        """
        try:
            r = self._r.post(f"{self.base}/setMyCommands",
                             json={"commands": [{"command": c, "description": d}
                                                for c, d in commands]},
                             timeout=15)
            ok = r.json().get("ok", False)
            logger.info(f"меню команд: {'обновлено' if ok else r.text[:160]}")
            return ok
        except Exception as e:   # noqa: BLE001 — сеть не должна ронять запуск
            logger.warning(f"setMyCommands: {e}")
            return False

    def send_message(self, chat_id, text, buttons=None):
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML",
                   "disable_web_page_preview": False}
        if buttons:
            payload["reply_markup"] = {"inline_keyboard": [
                [{"text": t, "callback_data": d} for (t, d) in row] for row in buttons
            ]}
        for attempt in range(1, 4):
            try:
                r = self._r.post(f"{self.base}/sendMessage", json=payload, timeout=15)
                try:
                    ok = r.json().get("ok", True)
                except Exception:
                    ok = getattr(r, "ok", True)
                if ok:
                    return True
                logger.warning(f"sendMessage отклонён (попытка {attempt}): {str(r.text)[:160]}")
            except Exception as e:
                logger.warning(f"sendMessage сбой (попытка {attempt}): {e}")
            time.sleep(2 * attempt)
        logger.error("sendMessage НЕ доставлено после 3 попыток")
        return False

    def answer_callback(self, callback_id, text=None):
        try:
            self._r.post(f"{self.base}/answerCallbackQuery",
                         json={"callback_query_id": callback_id, "text": text or ""}, timeout=10)
        except Exception as e:
            logger.error(f"answerCallbackQuery: {e}")


# ─── Хранилище состояния ─────────────────────────────────────────────────────
def _load_json(path: Path, default):
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def _normalize_model_query(s: str) -> str:
    """Приводит название модели к сравнимому виду: нижний регистр, без пунктуации,
    схлопнутые пробелы. "MacBook Air 13 (2020, M1)" и "macbook air 13 2020 m1" —
    после нормализации совпадают."""
    s = s.lower()
    s = re.sub(r"[(),/]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def find_configured_model(query: str):
    """GST-72: ищет ТОЧНОЕ совпадение свободного текста с уже сконфигурированной
    моделью парсера (models-config.json — та же точная модель+URL, что использует
    scripts/avito-parser/parser.py). Возвращает {family, model_name, url} при
    однозначном совпадении, иначе None (в т.ч. при неоднозначности — расплывчатый
    запрос вроде "macbook air" матчит десяток моделей, это не "точное" указание).
    """
    cfg = _load_json(MODELS_CONFIG_FILE, {})
    entries = cfg.get("entries") if isinstance(cfg, dict) else None
    if not entries:
        return None
    nq = _normalize_model_query(query)
    if not nq:
        return None

    exact, partial = [], []
    for e in entries:
        name = e.get("model_name") or ""
        nn = _normalize_model_query(name)
        if not nn:
            continue
        if nn == nq:
            exact.append(e)
        elif nq in nn or nn in nq:
            partial.append(e)

    if len(exact) == 1:
        return exact[0]
    if not exact and len(partial) == 1:
        return partial[0]
    return None  # 0 или неоднозначно — пусть решает свободный поиск


def _wizard_family_models(family: str) -> list[str]:
    """Уникальные имена моделей внутри семьи (вкладки), в порядке появления
    в parser-config.json — детерминированный порядок для индексов в callback_data."""
    cfg = _load_json(PARSER_CONFIG_FILE, {})
    tab = (cfg.get("tabs") or {}).get(family) or {}
    seen: list[str] = []
    for e in tab.get("entries", []):
        name = e.get("model")
        if name and name not in seen:
            seen.append(name)
    return seen


def _wizard_model_configs(family: str, model_name: str) -> list[dict]:
    """Все конфиги конкретной модели (RAM/SSD для MacBook, чип для остальных),
    каждый — {model, url, processor, ram?, ssd?, buyout_price?}. У КАЖДОГО
    конфига свой, более точно отфильтрованный Avito-URL, чем общая ссылка
    на модель из models-config.json."""
    cfg = _load_json(PARSER_CONFIG_FILE, {})
    tab = (cfg.get("tabs") or {}).get(family) or {}
    return [e for e in tab.get("entries", []) if e.get("model") == model_name]


def _wizard_config_label(c: dict) -> str:
    if "ram" in c and "ssd" in c:
        chip = (c.get("processor") or "").replace("Apple ", "")
        return f"{chip} {c['ram']}/{c['ssd']} ГБ".strip()
    return c.get("processor") or "вариант"


def _wizard_monitor_text(model_name: str, c: dict) -> str:
    label = _wizard_config_label(c)
    buyout = c.get("buyout_price")
    buyout_line = f"\n💰 Выкуп: ~{_fmt(buyout)} ₽" if buyout else ""
    return (f"📍 <b>{_esc(model_name)}</b> — {_esc(label)}\n"
            f'🔗 <a href="{c["url"]}">Открыть на Avito</a>{buyout_line}\n\n'
            "Откройте эту ссылку в браузере, где стоит расширение BestMac "
            "Collector — оно начнёт непрерывно мониторить все новые объявления "
            "по этой конфигурации.")


# ─── GST-73: подписки «эта конфигурация — до такой-то цены» ──────────────────
SUBSCRIPTIONS_FILE = Path(
    os.environ.get('SUBSCRIPTIONS_PATH', 'public/data/subscriptions.json'))

_PRICE_RE = re.compile(r'\d[\d\s  .,]*')
# Ниже этой суммы Mac не стоит: такое число почти наверняка приехало из фразы
# («MacBook Air 13»), а не является бюджетом. Лучше переспросить, чем завести
# подписку «до 13 ₽», которая молча не сработает никогда.
MIN_SUB_PRICE = 1000


def parse_price(text: str) -> Optional[int]:
    """«45 000», «45000₽», «45.000», «45к» → 45000. Мусор и слишком мелкое → None.

    Пробелы и точки в роли разделителя тысяч режем; «к»/«k» после числа —
    привычное сокращение, писать четыре нуля руками никто не хочет."""
    t = (text or "").strip().lower().replace(' ', ' ').replace(' ', ' ')
    m = _PRICE_RE.search(t)
    if not m:
        return None
    digits = re.sub(r'\D', '', m.group(0))
    if not digits:
        return None
    value = int(digits)
    tail = t[m.end():m.end() + 1]
    if tail in ('к', 'k'):
        value *= 1000
    return value if MIN_SUB_PRICE <= value < 100_000_000 else None


def monitor_url(base_url: str, max_price: Optional[int]) -> str:
    """URL выдачи Avito для вкладки мониторинга: потолок цены + новые сверху.

    GST-74: поиск делает домашний браузер с жилым IP, а не VPS — это нулевой
    расход капчи, в отличие от серверного скана. Бот только готовит ссылку.

    `pmax` сужает саму выдачу, чтобы расширение не гоняло на сервер заведомо
    дорогие лоты. `s=104` ставит новые первыми — расширение читает только
    первую страницу, и без этой сортировки свежие объявления до него не
    доедут. Если Avito когда-нибудь перестанет понимать pmax, ничего не
    сломается: серверная подписка всё равно перепроверяет цену перед отправкой.
    """
    if not base_url:
        return ""
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    parts = urlsplit(base_url)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
         if k not in ("s", "pmax")]
    if max_price:
        q.append(("pmax", str(int(max_price))))
    q.append(("s", "104"))
    return urlunsplit((parts.scheme, parts.netloc, parts.path,
                       urlencode(q), parts.fragment))


def _wizard_pick(fam_i: int, mdl_i: int, cfg_i: int):
    """Индексы из callback_data → (семья, имя модели, конфигурация).
    Бросает IndexError/ValueError, если каталог успел измениться — вызывающий
    код уже умеет отвечать на это «начните заново»."""
    family = MODEL_WIZARD_FAMILIES[int(fam_i)]
    model_name = _wizard_family_models(family)[int(mdl_i)]
    config = _wizard_model_configs(family, model_name)[int(cfg_i)]
    return family, model_name, config


def _subscription_from_config(chat_id, model_name: str, config: dict, max_price: int) -> dict:
    """Конфигурация каталога + цена владельца → запись подписки.

    Критерии берём через classify: это тот же разбор, которым сканер оценивает
    живые объявления, поэтому подписка и лот заведомо мыслят одинаково.
    """
    specs = {}
    if config.get('ram'):
        specs['ram'] = config['ram']
    if config.get('ssd'):
        specs['ssd'] = config['ssd']
    title = model_name
    chip = (config.get('processor') or '').strip()
    if chip and chip.lower() not in model_name.lower():
        title = f"{model_name} {chip}"
    cfg = classify(title, specs or None)
    return make_subscription(
        chat_id=chat_id, model=model_name, label=_wizard_config_label(config),
        match=match_from_config(cfg), max_price=max_price, url=config.get('url', ''))


def _wizard_monitor_action(chat_id, model_name: str, config: dict,
                           fam_i, mdl_i, cfg_i) -> dict:
    """Экран выбранной конфигурации: ссылка на мониторинг + кнопка подписки.

    Ссылка отвечает «где смотреть глазами», подписка — «позови меня сам, когда
    появится дешевле моей цены». Индексы каталога едут в callback_data, чтобы не
    хранить промежуточный выбор в состоянии бота.
    """
    return {"type": "send", "chat_id": chat_id,
            "text": _wizard_monitor_text(model_name, config),
            "buttons": [[("🔔 Следить за этой конфигурацией",
                          f"sub:new:{fam_i}:{mdl_i}:{cfg_i}")]]}


def _watchlist_add(lead):
    """Добавляет лот в вотчлист (бот пишет, scanner --watch читает). False, если уже есть."""
    from datetime import datetime
    url = lead.get("url")
    if not url:
        return False
    wl = _load_json(WATCHLIST_FILE, {}) or {}
    if url in wl:
        return False
    asking = int(lead.get("asking") or 0)
    wl[url] = {
        "url": url, "id": lead.get("id"), "title": lead.get("title", "")[:80],
        "watch_price": asking, "last_alert_price": asking,
        "target": lead.get("target"), "walk_away": lead.get("walk_away"),
        "location": lead.get("location", ""),
        "added_at": datetime.now().isoformat(timespec="seconds"), "alerted_2wk": False,
    }
    try:
        WATCHLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        WATCHLIST_FILE.write_text(json.dumps(wl, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        return False
    return True


def _watchlist_remove(url):
    if not url:
        return
    wl = _load_json(WATCHLIST_FILE, {}) or {}
    if url in wl:
        wl.pop(url, None)
        try:
            WATCHLIST_FILE.write_text(json.dumps(wl, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass


def _save_json(path: Path, data):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"save {path}: {e}")


# ─── Бот ─────────────────────────────────────────────────────────────────────
class NegotiationBot:
    """Чистая маршрутизация апдейтов. handle_update/pull_new_leads возвращают
    списки действий — их выполняет внешний цикл (или тест проверяет напрямую)."""

    def __init__(self, transport, state_path=STATE_FILE, queue_path=QUEUE_FILE,
                 owner_chat_id=None, llm_call: Optional[Callable] = None):
        self.tx = transport
        self.state_path = Path(state_path)
        self.queue_path = Path(queue_path)
        self.llm_call = llm_call
        self.state = _load_json(self.state_path, {
            "offset": 0, "owner_chat_id": owner_chat_id, "conversations": {},
            "active_lead": None, "posted_leads": [],
        })
        if owner_chat_id and not self.state.get("owner_chat_id"):
            self.state["owner_chat_id"] = owner_chat_id

    # ── helpers ──────────────────────────────────────────────────────────────
    def _save(self):
        _save_json(self.state_path, self.state)

    def _is_owner(self, chat_id) -> bool:
        owner = self.state.get("owner_chat_id")
        return owner is None or str(chat_id) == str(owner)

    def _conv_buttons(self, lead_id):
        return [[("✅ Отправил, жду ответ", f"conv:{lead_id}:sent")],
                [("✏️ Другой вариант", f"conv:{lead_id}:redraft"),
                 ("🛑 Стоп", f"conv:{lead_id}:stop")]]

    def _draft(self, lead, seller_reply=None) -> NegotiationMove:
        return next_move(
            title=lead["title"], asking=lead["asking"], target=lead["target"],
            walk_away=lead["walk_away"], location=lead.get("location", ""),
            history=lead.get("history", []), seller_reply=seller_reply,
            llm_call=self.llm_call,
        )

    # ── приём новых лидов из очереди ─────────────────────────────────────────
    def pull_new_leads(self) -> List[dict]:
        """Читает очередь, помечает лиды показанными. Возвращает действия.

        GST-72: карточка «Лид на торг» (+ кнопки Веду торг/Слежу/Не интересно)
        отключена по запросу — не приносила пользы. Очередь по-прежнему
        читается и трекается (conversations/posted_leads), чтобы не потерять
        данные и не сломать остальной негоциатор-флоу, если понадобится
        вернуть карточку позже — просто не шлём её в Telegram."""
        actions = []
        owner = self.state.get("owner_chat_id")
        if not owner:
            return actions   # пока не знаем кому слать — ждём /start
        queue = _load_json(self.queue_path, [])
        posted = set(self.state.get("posted_leads", []))
        changed = False
        for lead in queue:
            lid = lead.get("id")
            if not lid or lid in posted:
                continue
            # сохраняем лот в conversations, чтобы потом достать по id
            self.state["conversations"][lid] = {
                "lead": lead, "history": [], "stage": "queued",
                "active": False, "agreed_price": None,
            }
            posted.add(lid)
            changed = True
        if changed:
            self.state["posted_leads"] = list(posted)[-500:]
            self._save()
        return actions

    # ── обработка входящего апдейта ──────────────────────────────────────────
    def handle_update(self, update: dict) -> List[dict]:
        self.state["offset"] = max(self.state.get("offset", 0), update.get("update_id", 0) + 1)
        if "callback_query" in update:
            return self._handle_callback(update["callback_query"])
        if "message" in update:
            return self._handle_message(update["message"])
        return []

    # ── GST-60: сорсинг-поиск по кнопке/команде прямо из бота ────────────────
    def _sourcing_digest(self) -> str:
        """Запускает сорсинг-поиск по запросу владельца и возвращает готовый
        HTML-дайджест «какие Mac выгодно выкупать» — тот же, что уходит в рассылке.
        Любой сбой (Supabase недоступен, die() внутри модуля) НЕ роняет бота."""
        if render_message is None:
            return "⚠️ Модуль сорсинга недоступен в этой сборке бота."
        try:
            signals = fetch_signals(6, True) or []          # топ-6 «горячих»
            listings = fetch_listings([s.get("model_key") for s in signals])
            return render_message(signals, listings)
        except SystemExit as e:            # die() внутри модуля зовёт sys.exit
            return f"⚠️ Поиск не удался — данные сорсинга недоступны ({e})."
        except Exception as e:  # noqa: BLE001
            return f"⚠️ Поиск не удался: {e}"

    # ── GST-72: «/модель» — живой поиск по конкретной модели прямо сейчас ────
    def _trigger_model_search(self, query: str, chat_id) -> tuple[bool, str]:
        """Просит GitHub Actions прогнать разовый поиск на Avito по свободному
        запросу и прислать результат в этот же чат. Не открывает браузер и не
        решает капчу здесь — переиспользует уже проверенный раннер и логику
        parser.py (retry на капче, диагностика), а не дублирует их."""
        if not GH_DISPATCH_TOKEN:
            return False, ("⚠️ Не настроен GH_DISPATCH_TOKEN (PAT с правом Actions: write) — "
                            "живой поиск по модели недоступен.")
        try:
            import requests
            r = requests.post(
                f"https://api.github.com/repos/{GH_REPO}/actions/workflows/"
                f"{GH_MODEL_SEARCH_WORKFLOW}/dispatches",
                headers={
                    "Authorization": f"Bearer {GH_DISPATCH_TOKEN}",
                    "Accept": "application/vnd.github+json",
                },
                json={"ref": "main", "inputs": {"query": query, "chat_id": str(chat_id)}},
                timeout=15,
            )
            if r.status_code == 204:
                return True, f"🔍 Ищу «{query}» на Avito — пришлю сюда результат через 1–3 минуты."
            return False, f"⚠️ GitHub Actions отклонил запуск (HTTP {r.status_code}): {r.text[:200]}"
        except Exception as e:  # noqa: BLE001 — сеть/таймаут не должны ронять бота
            return False, f"⚠️ Не удалось запустить поиск: {e}"

    def _handle_message(self, msg: dict) -> List[dict]:
        chat_id = msg.get("chat", {}).get("id")
        text = (msg.get("text") or "").strip()
        if not chat_id:
            return []

        # /start — регистрируем владельца
        if text.startswith("/start"):
            if not self.state.get("owner_chat_id"):
                self.state["owner_chat_id"] = chat_id
            self._save()
            return [{"type": "send", "chat_id": chat_id,
                     "text": "✅ Бот переговоров подключён. Лоты на торг буду присылать сюда.\n"
                             "Жми «▶️ Веду торг», отправляй продавцу мой текст, "
                             "а его ответы — пересылай мне обычным сообщением.\n\n"
                             "🔍 /сделки — показать, какие Mac выгодно выкупать прямо сейчас.\n"
                             "🔎 /модель — выбрать модель кнопками и получить ссылку на мониторинг.\n"
                             "🔔 /подписки — следить за конфигурацией по вашей цене.\n"
                             "🩺 /status — проверить домашний коллектор Avito.",
                     "buttons": [[("🔍 Найти сделки сейчас", "sourcing:now")],
                                 [("🩺 Статус коллектора", "status:refresh")]]}]

        if not self._is_owner(chat_id):
            return []   # игнорируем чужих

        # GST-73: любая команда важнее незавершённого ввода цены подписки —
        # иначе «/модель» уходил бы в разбор цены и выйти из режима было бы
        # нечем. «/отмена» разбирается со своим состоянием сама, ниже.
        if text.startswith("/") and not _is_cancel(text) and self.state.get("pending_sub"):
            self.state.pop("pending_sub", None)
            self._save()

        if text.startswith("/review") or text.startswith("/otzyv") or text.startswith("/отзыв"):
            return [
                {"type": "send", "chat_id": chat_id,
                 "text": "Перешли клиенту сообщение ниже 👇"},
                {"type": "send", "chat_id": chat_id, "text": REVIEW_MESSAGE},
            ]

        if text.startswith("/status"):
            return [{"type": "send", "chat_id": chat_id,
                     "text": collector_status_text(),
                     "buttons": [[("🔄 Обновить", "status:refresh")]]}]

        # ── GST-73: подписки ─────────────────────────────────────────────────
        if _is_cancel(text):
            had = self.state.pop("pending_sub", None)
            self._save()
            return [{"type": "send", "chat_id": chat_id,
                     "text": "Отменил." if had else "Нечего отменять."}]

        if text.startswith("/подписки") or text.startswith("/subs"):
            return [{"type": "send", "chat_id": chat_id, **self._subscriptions_view()}]

        # Ждём цену для подписки — этот режим должен перехватывать текст РАНЬШЕ
        # ветки «ответ продавца», иначе число уедет в переговоры.
        pending = self.state.get("pending_sub")
        if pending:
            price = parse_price(text)
            if price is None:
                return [{"type": "send", "chat_id": chat_id,
                         "text": "Нужна цена числом — например <code>45000</code> или "
                                 "<code>45к</code>. Передумали — /отмена."}]
            try:
                _fam, model_name, config = _wizard_pick(pending["fam"], pending["mdl"],
                                                        pending["cfg"])
            except (IndexError, ValueError, KeyError):
                self.state.pop("pending_sub", None)
                self._save()
                return [{"type": "send", "chat_id": chat_id,
                         "text": "⚠️ Каталог обновился — начните заново: /модель"}]
            sub = _subscription_from_config(chat_id, model_name, config, price)
            subs = load_subscriptions(SUBSCRIPTIONS_FILE)
            subs[sub["id"]] = sub
            save_subscriptions(subs, SUBSCRIPTIONS_FILE)
            self.state.pop("pending_sub", None)
            self._save()
            link = monitor_url(config.get("url", ""), price)
            link_block = ""
            if link:
                link_block = (f'\n🔗 <a href="{link}">Открыть вкладку мониторинга</a>\n'
                              "Откройте её в браузере с расширением BestMac Collector "
                              "и оставьте висеть: выдача уже отфильтрована по вашей цене "
                              "и отсортирована по новизне, расширение подхватит каждое "
                              "новое объявление и пришлёт подходящие сюда.\n")
            return [{"type": "send", "chat_id": chat_id,
                     "text": (f"🔔 <b>Слежу за</b> {_esc(model_name)} — "
                              f"{_esc(sub['label'])}\n"
                              f"Предел: <b>{_fmt(price)} ₽</b>\n"
                              f"{link_block}\n"
                              "Пришлю сразу, как появится дешевле. Состояние проверю — "
                              "лоты с дефектами в описании не побеспокоят.\n"
                              "Все подписки: /подписки"),
                     "buttons": [[("🗑 Снять эту подписку", f"sub:del:{sub['id']}")]]}]

        if text.startswith("/сделки") or text.startswith("/deals") or text.startswith("/поиск"):
            return [{"type": "send", "chat_id": chat_id,
                     "text": self._sourcing_digest(),
                     "buttons": [[("🔄 Обновить поиск", "sourcing:now")]]}]

        if text.startswith("/модель") or text.startswith("/model"):
            query = text.split(maxsplit=1)[1].strip() if len(text.split(maxsplit=1)) > 1 else ""
            if not query:
                # GST-72: без аргумента — визард кнопками (семья → модель → конфиг),
                # чтобы не ошибиться в написании точного названия модели.
                buttons = [[(fam, f"mw:fam:{i}")] for i, fam in enumerate(MODEL_WIZARD_FAMILIES)]
                return [{"type": "send", "chat_id": chat_id,
                         "text": "Что ищем? Выберите семью, потом модель и конфигурацию:\n\n"
                                 "Или сразу текстом:\n"
                                 "<code>/модель MacBook Pro 14 M3 Pro 18/512</code>",
                         "buttons": buttons}]
            actions: List[dict] = []
            # GST-72: точное совпадение с уже сконфигурированной моделью (та же,
            # что и у ежедневного парсера) — сразу даём прямую ссылку на мониторинг.
            # Открытие этой ссылки в браузере с расширением BestMac Collector
            # включает непрерывный сбор новых объявлений (content.js уже matches
            # именно эти категории Avito — новый код в расширении не нужен).
            configured = find_configured_model(query)
            if configured:
                actions.append({"type": "send", "chat_id": chat_id,
                                 "text": (f"📍 <b>{_esc(configured['model_name'])}</b> — точная модель "
                                          "из конфигурации.\n"
                                          f'🔗 <a href="{configured["url"]}">Открыть на Avito</a>\n\n'
                                          "Откройте эту ссылку в браузере, где стоит расширение "
                                          "BestMac Collector — оно начнёт непрерывно мониторить все "
                                          "новые объявления по этой модели.")})
            ok, reply = self._trigger_model_search(query, chat_id)
            actions.append({"type": "send", "chat_id": chat_id, "text": reply})
            return actions

        if text.startswith("/help"):
            return [{"type": "send", "chat_id": chat_id,
                     "text": "Петля: ▶️ Веду торг → отправляешь мой текст продавцу → "
                             "«✅ Отправил» → пересылаешь мне ответ продавца → я даю следующий ход.\n"
                             "🔍 /сделки — какие Mac выгодно выкупать прямо сейчас.\n"
                             "🔎 /модель — выбрать модель кнопками и получить ссылку на мониторинг.\n"
                             "🔔 /подписки — следить за конфигурацией по вашей цене.\n"
                             "🩺 /status — статус домашнего коллектора Avito.\n"
                             "⭐ /отзыв — сообщение клиенту с просьбой об отзыве на Картах."}]

        # Обычный текст = ответ продавца для активного диалога
        active = self.state.get("active_lead")
        if not active or active not in self.state["conversations"]:
            return [{"type": "send", "chat_id": chat_id,
                     "text": "Нет активного диалога. Жми «▶️ Веду торг» на нужном лоте."}]
        return self._advance(active, seller_reply=text)

    def _handle_callback(self, cq: dict) -> List[dict]:
        data = cq.get("data", "")
        cq_id = cq.get("id")
        chat_id = cq.get("message", {}).get("chat", {}).get("id")
        actions: List[dict] = [{"type": "answer_callback", "id": cq_id}]

        if chat_id and not self._is_owner(chat_id):
            return actions

        if data == "status:refresh":
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": collector_status_text(),
                            "buttons": [[("🔄 Обновить", "status:refresh")]]})
            return actions

        if data == "sourcing:now":            # GST-60: кнопка «Найти сделки»
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": self._sourcing_digest(),
                            "buttons": [[("🔄 Обновить поиск", "sourcing:now")]]})
            return actions

        # ── GST-73: подписки «эта конфигурация — до такой-то цены» ───────────
        if data.startswith("sub:"):
            parts_sub = data.split(":")
            if parts_sub[1] == "new" and len(parts_sub) == 5:
                try:
                    _fam, model_name, config = _wizard_pick(*parts_sub[2:5])
                except (IndexError, ValueError):
                    actions.append({"type": "send", "chat_id": chat_id,
                                    "text": "⚠️ Каталог обновился — начните заново: /модель"})
                    return actions
                self.state["pending_sub"] = {"fam": parts_sub[2], "mdl": parts_sub[3],
                                             "cfg": parts_sub[4]}
                self._save()
                label = _wizard_config_label(config)
                actions.append({"type": "send", "chat_id": chat_id,
                                "text": (f"🔔 <b>{_esc(model_name)}</b> — {_esc(label)}\n\n"
                                         "Назовите вашу предельную цену — пришлю такой лот сразу, "
                                         "как появится дешевле.\n"
                                         "Ответьте числом: <code>45000</code> или <code>45к</code>.\n\n"
                                         "Передумали — /отмена.")})
                return actions

            if parts_sub[1] == "del" and len(parts_sub) == 3:
                subs = load_subscriptions(SUBSCRIPTIONS_FILE)
                victim = next((k for k, v in subs.items() if v.get("id") == parts_sub[2]), None)
                if victim is None:
                    actions.append({"type": "send", "chat_id": chat_id,
                                    "text": "Подписка уже снята."})
                    return actions
                gone = subs.pop(victim)
                save_subscriptions(subs, SUBSCRIPTIONS_FILE)
                actions.append({"type": "send", "chat_id": chat_id,
                                "text": f"🗑 Подписка снята: {_esc(gone.get('model') or '')} "
                                        f"— {_esc(gone.get('label') or '')}"})
                return actions
            return actions

        # ── GST-72: визард «/модель» — семья → модель → конфиг кнопками ──────
        if data.startswith("mw:"):
            try:
                parts_mw = data.split(":")
                if parts_mw[1] == "fam":
                    family = MODEL_WIZARD_FAMILIES[int(parts_mw[2])]
                    models = _wizard_family_models(family)
                    if not models:
                        actions.append({"type": "send", "chat_id": chat_id,
                                        "text": f"Нет моделей «{family}» в конфигурации."})
                        return actions
                    buttons = [[(name, f"mw:mdl:{parts_mw[2]}:{i}")] for i, name in enumerate(models)]
                    actions.append({"type": "send", "chat_id": chat_id,
                                    "text": f"«{family}» — выберите модель:", "buttons": buttons})
                    return actions

                if parts_mw[1] == "mdl":
                    family = MODEL_WIZARD_FAMILIES[int(parts_mw[2])]
                    models = _wizard_family_models(family)
                    model_name = models[int(parts_mw[3])]
                    configs = _wizard_model_configs(family, model_name)
                    if not configs:
                        actions.append({"type": "send", "chat_id": chat_id,
                                        "text": f"Нет конфигураций для «{model_name}»."})
                        return actions
                    if len(configs) == 1:
                        actions.append(_wizard_monitor_action(
                            chat_id, model_name, configs[0], parts_mw[2], parts_mw[3], 0))
                        return actions
                    buttons = [[(_wizard_config_label(c), f"mw:cfg:{parts_mw[2]}:{parts_mw[3]}:{i}")]
                               for i, c in enumerate(configs)]
                    actions.append({"type": "send", "chat_id": chat_id,
                                    "text": f"«{model_name}» — выберите конфигурацию:", "buttons": buttons})
                    return actions

                if parts_mw[1] == "cfg":
                    family = MODEL_WIZARD_FAMILIES[int(parts_mw[2])]
                    models = _wizard_family_models(family)
                    model_name = models[int(parts_mw[3])]
                    configs = _wizard_model_configs(family, model_name)
                    c = configs[int(parts_mw[4])]
                    actions.append(_wizard_monitor_action(
                        chat_id, model_name, c, parts_mw[2], parts_mw[3], parts_mw[4]))
                    return actions
            except (IndexError, ValueError):
                actions.append({"type": "send", "chat_id": chat_id,
                                "text": "⚠️ Список моделей обновился — начните заново: /модель"})
            return actions

        parts = data.split(":")
        if len(parts) != 3:
            return actions
        scope, lid, verb = parts
        conv = self.state["conversations"].get(lid)
        if not conv:
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": "Лид не найден (возможно, перезапуск). Дождись нового."})
            return actions

        if scope == "lead" and verb == "start":
            self.state["active_lead"] = lid
            conv["active"] = True
            mv = self._draft(conv["lead"])
            conv["stage"] = mv.stage
            conv["lead"].setdefault("history", []).append({"role": "buyer", "text": mv.message})
            self._save()
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": f"✍️ <b>Отправь продавцу:</b>\n<pre>{_esc(mv.message)}</pre>\n"
                                    f"🧠 {mv.rationale}",
                            "buttons": self._conv_buttons(lid)})
            return actions

        if scope == "lead" and verb == "skip":
            conv["stage"] = "skipped"
            _watchlist_remove(conv["lead"].get("url"))
            self._save()
            actions.append({"type": "send", "chat_id": chat_id, "text": "👎 Не интересно — больше не покажу."})
            return actions

        if scope == "lead" and verb == "watch":
            conv["stage"] = "watching"
            ok = _watchlist_add(conv["lead"])
            self._save()
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": ("⭐ Слежу за лотом. Верну его, если цена снизится "
                                     "или он провисит 2 недели непроданным.")
                                    if ok else "⭐ Уже в наблюдении."})
            return actions

        if scope == "conv" and verb == "sent":
            self.state["active_lead"] = lid
            self._save()
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": "👍 Жду. Перешли сюда ответ продавца обычным сообщением."})
            return actions

        if scope == "conv" and verb == "redraft":
            self.state["active_lead"] = lid
            last_seller = _last_seller(conv["lead"].get("history", []))
            mv = self._draft(conv["lead"], seller_reply=last_seller)
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": f"✍️ <b>Вариант:</b>\n<pre>{_esc(mv.message)}</pre>",
                            "buttons": self._conv_buttons(lid)})
            return actions

        if scope == "conv" and verb == "stop":
            conv["active"] = False
            conv["stage"] = "stopped"
            if self.state.get("active_lead") == lid:
                self.state["active_lead"] = None
            self._save()
            actions.append({"type": "send", "chat_id": chat_id, "text": "🛑 Диалог остановлен."})
            return actions

        return actions

    def _advance(self, lid, seller_reply) -> List[dict]:
        conv = self.state["conversations"][lid]
        lead = conv["lead"]
        owner = self.state.get("owner_chat_id")
        lead.setdefault("history", []).append({"role": "seller", "text": seller_reply})
        mv = self._draft(lead, seller_reply=seller_reply)
        conv["stage"] = mv.stage
        conv["agreed_price"] = mv.agreed_price
        lead["history"].append({"role": "buyer", "text": mv.message})
        actions = []

        if mv.deal_ready:
            conv["active"] = False
            self.state["active_lead"] = None
            actions.append({"type": "send", "chat_id": owner,
                            "text": (f"🤝 <b>ГОТОВ К СДЕЛКЕ: {_fmt(mv.agreed_price or lead['asking'])} ₽</b>\n"
                                     f"💻 {lead['title']}\n"
                                     f"📍 {lead.get('location','—')}\n"
                                     f"✍️ Финальное сообщение продавцу:\n<pre>{_esc(mv.message)}</pre>\n"
                                     f"🔗 <a href=\"{lead.get('url','')}\">Объявление</a>")})
        elif mv.stage in ("stalled", "rejected"):
            conv["active"] = False
            self.state["active_lead"] = None
            actions.append({"type": "send", "chat_id": owner,
                            "text": (f"🚪 Похоже, тупик ({mv.stage}). Мягкий выход:\n"
                                     f"<pre>{_esc(mv.message)}</pre>")})
        else:
            actions.append({"type": "send", "chat_id": owner,
                            "text": f"✍️ <b>Ответь продавцу:</b>\n<pre>{_esc(mv.message)}</pre>\n"
                                    f"🧠 {mv.rationale}",
                            "buttons": self._conv_buttons(lid)})
        self._save()
        return actions

    # ── исполнение действий через транспорт ──────────────────────────────────
    def _exec(self, actions: List[dict]):
        for a in actions:
            if a["type"] == "send":
                self.tx.send_message(a["chat_id"], a["text"], a.get("buttons"))
            elif a["type"] == "answer_callback":
                self.tx.answer_callback(a["id"], a.get("text"))

    def _subscriptions_view(self) -> dict:
        """Список активных подписок с кнопками снятия (тело действия «send»)."""
        subs = load_subscriptions(SUBSCRIPTIONS_FILE)
        if not subs:
            return {"text": ("Активных подписок нет.\n\n"
                             "Чтобы завести: /модель → выберите конфигурацию → "
                             "«🔔 Следить за этой конфигурацией» → назовите свою цену.")}
        lines, buttons = ["🔔 <b>Ваши подписки</b>", ""], []
        for s in subs.values():
            hits = int(s.get("hits") or 0)
            tail = f" • сработала {hits} раз" if hits else ""
            lines.append(f"• <b>{_esc(s.get('model') or '')}</b> — {_esc(s.get('label') or '')}"
                         f" до {_fmt(s.get('max_price') or 0)} ₽{tail}")
            buttons.append([(f"🗑 {s.get('label') or s.get('model') or 'снять'}",
                             f"sub:del:{s.get('id')}")])
        return {"text": "\n".join(lines), "buttons": buttons}

    def check_collector(self, now=None) -> List[dict]:
        """GST-73: молчит ли домашний коллектор. Зовётся каждый оборот петли —
        сама проверка дешёвая (чтение файла-пульса), а частота алертов
        ограничена кулдауном внутри collector_deadman."""
        now = now or time.time()
        chat_id = self.state.get("owner_chat_id")
        if not chat_id:
            return []
        rx = _load_json(INTAKE_STATS_FILE, {}) or {}
        text, patch = collector_deadman(now, rx.get("last_at"), self.state)
        if patch:
            self.state.update(patch)
        if not text:
            return []
        return [{"type": "send", "chat_id": chat_id, "text": text,
                 "buttons": [[("🩺 Статус коллектора", "status:refresh")]]}]

    def run_forever(self, poll_timeout=25):
        logger.info("🤖 Бот переговоров запущен (long-polling)")
        # Меню команд регистрируем при старте: список живёт на стороне Telegram.
        if hasattr(self.tx, "set_my_commands"):
            self.tx.set_my_commands(BOT_COMMANDS)
        while True:
            self._exec(self.pull_new_leads())
            self._exec(self.check_collector())
            updates = self.tx.get_updates(self.state.get("offset", 0), timeout=poll_timeout)
            for upd in updates:
                try:
                    self._exec(self.handle_update(upd))
                except Exception as e:
                    logger.error(f"handle_update: {e}")
            self._save()
            if not updates:
                time.sleep(1)


def _esc(s: str) -> str:
    import html
    return html.escape(s or "")


def _last_seller(history) -> Optional[str]:
    for h in reversed(history or []):
        if h.get("role") == "seller":
            return h.get("text")
    return None


if __name__ == "__main__":
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN не задан"); sys.exit(1)
    bot = NegotiationBot(TelegramTransport(BOT_TOKEN),
                         owner_chat_id=OWNER_CHAT_ID or None)
    bot.run_forever()
