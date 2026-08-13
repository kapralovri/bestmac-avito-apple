#!/usr/bin/env python3
"""Канарейка сбора цен (GST-9, P0-2).

Детектирует «тихий отказ» ценового пайплайна, когда изменение вёрстки Avito
или протухший ``captcha_id`` молча обнуляют сбор без исключения — прогон
завершается «успешно», но собирает 0 листингов, и цены на сайте замерзают
без единого алерта.

Проверяет три инварианта и шлёт алерт в Telegram при деградации:

  1. **Прогон реально собрал листинги** (``run_listings >= min_run``).
     Ключевой сигнал. ``parser.py`` МЕРЖИТ новые данные в существующую БД,
     поэтому ``total_listings`` по всей БД почти не падает, даже если ЭТОТ
     прогон собрал 0 (другие семейства остаются с прошлых прогонов).
     Нулевой сбор за прогон = сломанные селекторы/капча.

  2. **Общий объём БД выше порога** (``total_listings >= min_total``).
     Ловит обвал всей базы (например, битый/пустой JSON).

  3. **Свежесть базы** (``generated_at`` не старше ``max_age_hours``).
     Ловит застрявший пайплайн — парсер вообще не запускается.

Все пороги настраиваются через env, чтобы менять без деплоя кода.
Модуль не тянет зависимостей из парсера и покрыт офлайн-тестами
(``test_canary.py``), поэтому его можно гонять и как standalone-монитор.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

try:
    import requests  # noqa: F401 — опционален, нужен только для реальной отправки
except ImportError:  # pragma: no cover — в тестах/офлайне requests может отсутствовать
    requests = None


# ─── Пороги (env-настраиваемые) ──────────────────────────────────────────────
DEFAULT_MIN_TOTAL_LISTINGS = int(os.environ.get("CANARY_MIN_TOTAL_LISTINGS", "500"))
DEFAULT_MIN_RUN_LISTINGS   = int(os.environ.get("CANARY_MIN_RUN_LISTINGS", "1"))
DEFAULT_MAX_AGE_HOURS      = float(os.environ.get("CANARY_MAX_AGE_HOURS", "48"))


def parse_generated_at(s):
    """Парсит ``generated_at`` из avito-prices.json. ``None`` при нераспознанном формате.

    Форматы совпадают с теми, что пишет ``parser.py`` (``%Y-%m-%d %H:%M``) и
    legacy ``builder.py`` (``time.ctime``)."""
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%a %b %d %H:%M:%S %Y"):
        try:
            return datetime.strptime(str(s).strip(), fmt)
        except (ValueError, TypeError):
            continue
    return None


def evaluate_canary(
    *,
    prices,
    run_listings=None,
    now=None,
    min_total=DEFAULT_MIN_TOTAL_LISTINGS,
    min_run=DEFAULT_MIN_RUN_LISTINGS,
    max_age_hours=DEFAULT_MAX_AGE_HOURS,
):
    """Оценивает здоровье сбора. Возвращает список сообщений о деградации.

    Пустой список = всё в норме.

    Args:
        prices: разобранный ``avito-prices.json`` (dict) или ``None``, если файл
            отсутствует/не читается — это само по себе деградация.
        run_listings: сколько листингов собрал ТЕКУЩИЙ прогон парсера
            (``sum(samples_count)`` по свежесобранным конфигам). ``None`` —
            standalone-режим без прогона, проверка №1 пропускается.
        now: текущее время (для тестов); по умолчанию ``datetime.now()``.
        min_total / min_run / max_age_hours: пороги.
    """
    now = now or datetime.now()
    reasons: list[str] = []

    # 0. Файл цен отсутствует/битый — самая жёсткая деградация.
    if not isinstance(prices, dict):
        reasons.append("файл цен отсутствует или не является валидным JSON-объектом")
        return reasons

    # 1. Прогон собрал 0 листингов — сломаны селекторы/капча (главный сигнал).
    #    total_listings по БД это не поймает: merge сохраняет старые семейства.
    if run_listings is not None and run_listings < min_run:
        reasons.append(
            f"прогон собрал {run_listings} листингов (< {min_run}) — "
            f"вероятно сменилась вёрстка Avito или протух captcha_id"
        )

    # 2. Общий объём БД ниже порога.
    total = prices.get("total_listings")
    if not isinstance(total, (int, float)):
        reasons.append("total_listings отсутствует или не число")
    elif total < min_total:
        reasons.append(f"total_listings={int(total)} ниже порога {min_total}")

    # 3. Свежесть базы.
    generated_at = prices.get("generated_at")
    dt = parse_generated_at(generated_at)
    if dt is None:
        reasons.append(f"generated_at не распознан ('{generated_at}')")
    else:
        age_hours = max(0.0, (now - dt).total_seconds() / 3600)
        if age_hours >= max_age_hours:
            reasons.append(
                f"база цен устарела: {int(age_hours)} ч с последнего обновления "
                f"(порог {int(max_age_hours)} ч, generated_at={generated_at})"
            )

    return reasons


def format_alert(reasons, *, tab=None, source="parser.py"):
    """Форматирует HTML-тело Telegram-алерта по списку деградаций."""
    header = "🚨 <b>Канарейка сбора цен: деградация</b>"
    ctx = f"Источник: <code>{source}</code>"
    if tab:
        ctx += f" • вкладка: <b>{tab}</b>"
    lines = "\n".join(f"• {r}" for r in reasons)
    return (
        f"{header}\n{ctx}\n\n{lines}\n\n"
        "Цены на сайте могли замереть. Проверь селекторы Avito, captcha_id и логи парсера."
    )


def send_telegram(text, *, url=None, logger=None, attempts=3):
    """Шлёт алерт в Telegram. Возвращает True при успехе.

    URL берётся из ``TELEGRAM_NOTIFY_URL`` (тот же, что у сканера) — это полный
    endpoint ``.../sendMessage`` с вшитым токеном и chat_id в query, либо
    прокси-URL. Если URL/requests недоступны — печатает в stdout и возвращает
    False (не роняем парсер из-за отсутствия алерт-канала)."""
    import time as _time

    url = url or os.environ.get("TELEGRAM_NOTIFY_URL")

    def _log(level, msg):
        if logger is not None:
            getattr(logger, level)(msg)
        else:
            print(msg)

    if not url or requests is None:
        _log("warning", "TELEGRAM_NOTIFY_URL не задан или requests недоступен — алерт не отправлен:\n" + text)
        return False

    for attempt in range(1, attempts + 1):
        try:
            r = requests.post(url, json={"text": text, "parse_mode": "HTML"}, timeout=15)
            # Telegram отдаёт {"ok": true}; прокси может не отдавать JSON — считаем 2xx успехом.
            try:
                ok = r.json().get("ok", r.ok)
            except ValueError:
                ok = r.ok
            if ok:
                _log("info", "✅ Канарейка: алерт отправлен в Telegram")
                return True
            _log("warning", f"⚠️ Канарейка: Telegram ответил не-ok (попытка {attempt}): {r.text[:200]}")
        except Exception as e:  # noqa: BLE001 — сеть/таймаут не должны ронять парсер
            _log("warning", f"⚠️ Канарейка: ошибка отправки (попытка {attempt}): {e}")
        if attempt < attempts:
            _time.sleep(2 * attempt)
    return False


def run_canary(
    *,
    prices,
    run_listings=None,
    tab=None,
    source="parser.py",
    now=None,
    logger=None,
    telegram_url=None,
    min_total=DEFAULT_MIN_TOTAL_LISTINGS,
    min_run=DEFAULT_MIN_RUN_LISTINGS,
    max_age_hours=DEFAULT_MAX_AGE_HOURS,
):
    """Полный цикл: оценка → алерт при деградации. Возвращает список деградаций.

    Никогда не бросает исключений наружу по вине алерт-канала — вызывающий
    парсер не должен падать из-за Telegram."""
    reasons = evaluate_canary(
        prices=prices,
        run_listings=run_listings,
        now=now,
        min_total=min_total,
        min_run=min_run,
        max_age_hours=max_age_hours,
    )
    if not reasons:
        msg = "✅ Канарейка: сбор в норме" + (
            f" (прогон: {run_listings} листингов)" if run_listings is not None else ""
        )
        if logger is not None:
            logger.info(msg)
        else:
            print(msg)
        return reasons

    text = format_alert(reasons, tab=tab, source=source)
    if logger is not None:
        logger.error("🚨 Канарейка: деградация\n" + text)
    else:
        print("🚨 Канарейка: деградация\n" + text)
    send_telegram(text, url=telegram_url, logger=logger)
    return reasons


def _load_prices(path):
    p = Path(path)
    if not p.exists():
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main(argv=None):
    """Standalone-режим: `python -m common.canary [path/to/avito-prices.json]`.

    Без прогона парсера проверяет только объём и свежесть уже записанного файла.
    Полезно как независимый монитор (например, отдельный крон)."""
    import argparse

    ap = argparse.ArgumentParser(description="Канарейка сбора цен")
    ap.add_argument("prices_file", nargs="?",
                    default=os.environ.get("PRICES_FILE_PATH", "public/data/avito-prices.json"))
    ap.add_argument("--run-listings", type=int, default=None,
                    help="Сколько листингов собрал прогон (для интеграции)")
    args = ap.parse_args(argv)

    prices = _load_prices(args.prices_file)
    reasons = run_canary(prices=prices, run_listings=args.run_listings, source="canary CLI")
    return 1 if reasons else 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
