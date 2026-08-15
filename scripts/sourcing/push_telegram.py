#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GST-60 / GST-58 / GST-32 — Доставка первых живых сигналов «докупать» основателю в Telegram.

Python-двойник scripts/sourcing/push-telegram.mjs — на случай, когда на VPS есть
Python (на нём крутится bot.py), но НЕТ Node/npm. Использует ТОЛЬКО стандартную
библиотеку (urllib) — не нужны ни npm install, ни pip install, ни @supabase/supabase-js.

Читает read-model public.sourcing_signal_feed из Supabase (проект sxitdundeblljudxrvpa)
через публичный anon-ключ и шлёт топ сигналов в тот же бот @bestmac_hunter_bot.
Токен переиспользуется из .env (TELEGRAM_BOT_TOKEN / OWNER_CHAT_ID) — новых секретов нет.

Env (из .env в корне репозитория или из окружения; .env НЕ перетирает уже заданное):
  TELEGRAM_BOT_TOKEN           уже прописан для @bestmac_hunter_bot
  OWNER_CHAT_ID                уже прописан для @bestmac_hunter_bot
Опционально:
  SIGNAL_LIMIT   сколько топ-сигналов слать (по умолчанию 6)
  HOT_ONLY       '1' → только «горячие» (is_hot)
  DRY_RUN        '1' → печать сообщения в консоль, БЕЗ отправки в Telegram
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY — переопределяют дефолты

Запуск на VPS (из корня репозитория /opt/bestmac):
  HOT_ONLY=1 SIGNAL_LIMIT=6 python3 scripts/sourcing/push_telegram.py
  DRY_RUN=1 HOT_ONLY=1 python3 scripts/sourcing/push_telegram.py   # сначала посмотреть
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Публичные значения (НЕ секреты): URL проекта и anon-ключ. Роль anon имеет SELECT
# только на витрину public.sourcing_signal_feed (базовые таблицы закрыты RLS) — тот же
# класс ключа, что уходит в браузер. Держим в коде, чтобы убрать последний секрет из
# пути доставки: нужен лишь токен @bestmac_hunter_bot.
DEFAULT_SUPABASE_URL = "https://sxitdundeblljudxrvpa.supabase.co"
DEFAULT_SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aXRkdW5kZWJsbGp1ZHhydnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDc5NDMsImV4cCI6MjA3MTg4Mzk0M30."
    "fpLz-btlRmi4I6Hi5n4SGsHZX1F_FSn7tXSgI_yDmg4"
)


def load_dotenv():
    """Зеркалит scripts/sourcing/load-env.mjs и bot.py::_load_dotenv:
    заполняет ТОЛЬКО отсутствующие переменные, не перетирая уже заданные в окружении."""
    here = Path(__file__).resolve().parent
    repo_root = here.parent.parent  # scripts/sourcing -> корень репозитория
    candidates = [repo_root / ".env", Path.cwd() / ".env"]
    for env_path in candidates:
        if not env_path.exists():
            continue
        try:
            for raw in env_path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                if (val.startswith('"') and val.endswith('"')) or (
                    val.startswith("'") and val.endswith("'")
                ):
                    val = val[1:-1]
                if key and key not in os.environ:
                    os.environ[key] = val
        except OSError:
            # .env нечитаем — молча продолжаем на голом окружении
            pass


def die(msg):
    sys.stderr.write(f"✖ {msg}\n")
    sys.exit(1)


def rub(n):
    if n is None:
        return "—"
    # разделитель тысяч неразрывным пробелом, как toLocaleString('ru-RU')
    return f"{round(float(n)):,}".replace(",", " ") + " ₽"


def escape_html(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _supabase_conf():
    base_url = os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or DEFAULT_SUPABASE_ANON_KEY
    )
    return base_url, key


def _rest_get(view, params):
    base_url, key = _supabase_conf()
    url = f"{base_url}/rest/v1/{view}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8")) or []
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        die(f"Запрос к Supabase упал: {e.code} {body}")
    except Exception as e:  # noqa: BLE001
        die(f"Запрос к Supabase упал: {e}")


# GST-61: до 3 живых лотов на модель, сгруппированных по model_key
MAX_LOTS_PER_MODEL = 3


def fetch_signals(limit, hot_only):
    params = [
        (
            "select",
            "model_key,display_name,family,resale_median_rub,target_buy_price_rub,"
            "expected_spread_rub,sample_size,is_hot,confidence,is_recommended",
        ),
        ("is_recommended", "eq.true"),
        ("order", "is_hot.desc,expected_spread_rub.desc.nullslast"),
        ("limit", str(limit)),
    ]
    if hot_only:
        params.append(("is_hot", "eq.true"))
    return _rest_get("sourcing_signal_feed", params)


def fetch_listings(model_keys):
    """GST-61: конкретные живые лоты (price<=target_buy, свежие) для показанных моделей.
    Возвращает {model_key: [лоты...]} — до MAX_LOTS_PER_MODEL на модель, по убыванию прибыли."""
    keys = [k for k in model_keys if k]
    if not keys:
        return {}
    # model_key — slug (a-z0-9-), спецсимволов нет → in.(...) без экранирования
    params = [
        (
            "select",
            "model_key,url,price_rub,unit_profit_rub,resale_median_rub,is_hot,profit_rank",
        ),
        ("model_key", "in.(" + ",".join(keys) + ")"),
        ("profit_rank", f"lte.{MAX_LOTS_PER_MODEL}"),
        ("order", "model_key,profit_rank"),
    ]
    rows = _rest_get("sourcing_listing_feed", params)
    by_model = {}
    for r in rows:
        by_model.setdefault(r["model_key"], []).append(r)
    return by_model


def render_message(signals, listings_by_model=None):
    listings_by_model = listings_by_model or {}
    if not signals:
        return (
            "\U0001F4C9 <b>Сорсинг</b>: выгодных моделей для выкупа под перепродажу "
            "сейчас нет (везде маржа ниже порога 15\u00a0000\u00a0₽)."
        )
    lines = [
        "\U0001F3AF <b>Какие Mac сейчас выгодно выкупать под перепродажу</b>",
        "",
        (
            "Эти модели на Avito в рознице продаются дороже, чем стоит их выкупить. "
            "Купив экземпляр по цене «выкупать ≤», после наших издержек мы "
            "зарабатываем указанную прибыль с устройства."
        ),
        "",
    ]
    any_lots = False
    for s in signals:
        name = escape_html(s.get("display_name") or s.get("model_key"))
        fire = " \U0001F525" if s.get("is_hot") else ""
        spread = s.get("expected_spread_rub")
        profit = f" · прибыль ~<b>{rub(spread)}</b>/шт" if spread is not None else ""
        lines.append(f"<b>{name}</b>{fire}{profit}")
        sample = s.get("sample_size") if s.get("sample_size") is not None else "—"
        lines.append(
            "  ▸ выкупать ≤ <b>"
            f"{rub(s.get('target_buy_price_rub'))}</b> · перепродажа ≈ "
            f"{rub(s.get('resale_median_rub'))} · так торгуется {sample} объявл."
        )
        # GST-61: конкретные живые лоты дешевле цены выкупа — прямые ссылки
        lots = listings_by_model.get(s.get("model_key")) or []
        if lots:
            any_lots = True
            for lot in lots[:MAX_LOTS_PER_MODEL]:
                url = escape_html(lot.get("url") or "")
                prof = lot.get("unit_profit_rub")
                prof_txt = f" · прибыль ~<b>{rub(prof)}</b>" if prof is not None else ""
                lines.append(
                    f'     • <a href="{url}">лот за {rub(lot.get("price_rub"))}</a>{prof_txt}'
                )
        else:
            lines.append("     • живых лотов дешевле цены выкупа сейчас нет")
    lines.append("")
    lines.append(
        "<b>Как читать:</b> «выкупать ≤» — максимум, что платим за устройство; "
        "«прибыль» — что остаётся после перепродажи и издержек (3\u00a0000\u00a0₽/шт); "
        "лоты — реальные объявления Avito, замеченные за последние 48\u00a0ч; "
        "\U0001F525 — самые ходовые и маржинальные."
    )
    if not any_lots:
        lines.append("")
        lines.append(
            "ℹ️ Свежих лотов дешевле цены выкупа сейчас нет — как появятся, "
            "они встанут прямыми ссылками под моделью."
        )
    return "\n".join(lines)


def send_telegram(text):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("OWNER_CHAT_ID")
    if not token or not chat_id:
        die("TELEGRAM_BOT_TOKEN и OWNER_CHAT_ID обязательны для отправки (или запусти с DRY_RUN=1).")
    payload = json.dumps(
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", "replace")
        die(f"Telegram API вернул ошибку: {e.code} {body_txt}")
        return
    except Exception as e:  # noqa: BLE001
        die(f"Telegram API недоступен: {e}")
        return
    if not body.get("ok"):
        die(f"Telegram API вернул ошибку: {json.dumps(body)}")
    return body


def main():
    load_dotenv()
    try:
        limit = int(os.environ.get("SIGNAL_LIMIT", ""))
        if limit <= 0:
            limit = 6
    except (TypeError, ValueError):
        limit = 6
    hot_only = os.environ.get("HOT_ONLY") == "1"
    is_dry_run = os.environ.get("DRY_RUN") == "1"

    signals = fetch_signals(limit, hot_only)
    # GST-61: под каждой моделью — до 3 конкретных живых лотов со ссылками
    listings_by_model = fetch_listings([s.get("model_key") for s in signals])
    message = render_message(signals, listings_by_model)

    if is_dry_run:
        print("--- DRY RUN (сообщение НЕ отправлено) ---\n")
        print(message)
        print(f"\n--- {len(signals)} сигнал(ов) ---")
        return

    send_telegram(message)
    chat_id = os.environ.get("OWNER_CHAT_ID")
    print(f"✅ Отправлено в Telegram: {len(signals)} сигнал(ов) → chat {chat_id}")


if __name__ == "__main__":
    main()
