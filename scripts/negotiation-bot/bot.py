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

    def _lead_card(self, lead) -> str:
        mot = lead.get("motivation_label", "")
        sig = lead.get("motivation_signals", [])
        sig_line = ("\n🧭 " + "; ".join(sig[:4])) if sig else ""
        src = lead.get("source")
        link_label = "Открыть в Telegram" if src == "tg" else "Открыть на Avito"
        header = {
            "stale": "🕰 <b>ЗАЛЕЖАВШИЙСЯ ПРОДАВЕЦ</b> (мотивирован на торг)",
            "tg": "📲 <b>ЛИД ИЗ TELEGRAM-ЧАТА</b>",
            "watch": "🔔 <b>ОТСЛЕЖИВАЕМЫЙ ЛОТ ВЕРНУЛСЯ</b>",
        }.get(src, "🧲 <b>Лид на торг</b>")
        return (
            f"{header} {mot}\n"
            f"💻 {lead['title']}\n"
            f"💰 Цена продавца: {_fmt(lead['asking'])} ₽\n"
            f"🎯 Твоя цель: {_fmt(lead['target'])} ₽ • 🧱 потолок: {_fmt(lead['walk_away'])} ₽"
            f"{sig_line}\n"
            f"🔗 <a href=\"{lead.get('url','')}\">{link_label}</a>"
        )

    # ── приём новых лидов из очереди ─────────────────────────────────────────
    def pull_new_leads(self) -> List[dict]:
        """Читает очередь, постит лиды, которых ещё не показывали. Возвращает действия."""
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
            actions.append({"type": "send", "chat_id": owner,
                            "text": self._lead_card(lead),
                            "buttons": [[("▶️ Веду торг", f"lead:{lid}:start")],
                                        [("⭐ Слежу", f"lead:{lid}:watch"),
                                         ("👎 Не интересно", f"lead:{lid}:skip")]]})
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
                return True, f"🔍 Ищу «{query}» на Avito — пришлю сюда результат через 1–2 минуты."
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
                             "🩺 /status — проверить домашний коллектор Avito.",
                     "buttons": [[("🔍 Найти сделки сейчас", "sourcing:now")],
                                 [("🩺 Статус коллектора", "status:refresh")]]}]

        if not self._is_owner(chat_id):
            return []   # игнорируем чужих

        if text.startswith("/status"):
            return [{"type": "send", "chat_id": chat_id,
                     "text": collector_status_text(),
                     "buttons": [[("🔄 Обновить", "status:refresh")]]}]

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
                             "🩺 /status — статус домашнего коллектора Avito."}]

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
                        actions.append({"type": "send", "chat_id": chat_id,
                                        "text": _wizard_monitor_text(model_name, configs[0])})
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
                    actions.append({"type": "send", "chat_id": chat_id,
                                    "text": _wizard_monitor_text(model_name, c)})
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

    def run_forever(self, poll_timeout=25):
        logger.info("🤖 Бот переговоров запущен (long-polling)")
        while True:
            self._exec(self.pull_new_leads())
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
