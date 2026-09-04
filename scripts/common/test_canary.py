#!/usr/bin/env python3
"""Офлайн-тесты канарейки сбора цен (GST-9).

Запуск:  python3 scripts/common/test_canary.py
Сеть не трогается — send_telegram здесь не вызывается.
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import canary  # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


NOW = datetime(2026, 8, 13, 12, 0, 0)
FRESH = (NOW - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
STALE = (NOW - timedelta(hours=50)).strftime("%Y-%m-%d %H:%M")


def healthy_prices(generated_at=FRESH, total=3000):
    return {"generated_at": generated_at, "total_listings": total, "stats": []}


print("[1] Здоровый прогон — нет деградаций")
r = canary.evaluate_canary(prices=healthy_prices(), run_listings=500, now=NOW)
check("норма → пустой список", r == [])

print("[2] Прогон собрал 0 листингов (сломаны селекторы/капча)")
r = canary.evaluate_canary(prices=healthy_prices(), run_listings=0, now=NOW)
check("run_listings=0 → одна деградация", len(r) == 1)
check("сообщение про вёрстку/капчу", "captcha_id" in r[0] or "вёрстка" in r[0])

print("[3] total_listings по всей БД остаётся высоким — 0 прогона всё равно ловится")
# Главный кейс: merge сохраняет старые семейства, total высокий, но прогон пустой.
r = canary.evaluate_canary(prices=healthy_prices(total=3180), run_listings=0, now=NOW)
check("высокий total НЕ маскирует нулевой прогон", any("прогон собрал 0" in x for x in r))

print("[4] total_listings ниже порога")
r = canary.evaluate_canary(prices=healthy_prices(total=100), run_listings=500, now=NOW, min_total=500)
check("total=100 < 500 → деградация", any("total_listings" in x for x in r))

print("[5] Устаревшая база (generated_at > 48ч)")
r = canary.evaluate_canary(prices=healthy_prices(generated_at=STALE), run_listings=500, now=NOW)
check("50ч > 48ч → деградация", any("устарела" in x for x in r))

print("[6] Свежая база на границе (< 48ч) — не алертим")
edge = (NOW - timedelta(hours=47, minutes=59)).strftime("%Y-%m-%d %H:%M")
r = canary.evaluate_canary(prices=healthy_prices(generated_at=edge), run_listings=500, now=NOW)
check("47:59 < 48ч → норма", r == [])

print("[7] Битый generated_at")
r = canary.evaluate_canary(prices=healthy_prices(generated_at="вчера"), run_listings=500, now=NOW)
check("нераспознанный формат → деградация", any("generated_at" in x for x in r))

print("[8] Файл цен отсутствует / не dict")
check("None → деградация", canary.evaluate_canary(prices=None, run_listings=500, now=NOW) != [])
check("список вместо dict → деградация", canary.evaluate_canary(prices=[], run_listings=500, now=NOW) != [])

print("[9] total_listings отсутствует")
r = canary.evaluate_canary(prices={"generated_at": FRESH, "stats": []}, run_listings=500, now=NOW)
check("нет total_listings → деградация", any("total_listings" in x for x in r))

print("[10] Standalone-режим (run_listings=None) — проверка №1 пропускается")
r = canary.evaluate_canary(prices=healthy_prices(), run_listings=None, now=NOW)
check("None run_listings → норма при здоровой базе", r == [])

print("[11] parse_generated_at форматы")
check("parser-формат", canary.parse_generated_at("2026-08-13 12:00") == datetime(2026, 8, 13, 12, 0))
check("с секундами", canary.parse_generated_at("2026-08-13 12:00:30") == datetime(2026, 8, 13, 12, 0, 30))
check("ctime (builder)", canary.parse_generated_at("Thu Apr 23 15:59:36 2026") is not None)
check("мусор → None", canary.parse_generated_at("завтра") is None)
check("пусто → None", canary.parse_generated_at(None) is None)

print("[12] format_alert собирает HTML-тело")
body = canary.format_alert(["reason A", "reason B"], tab="MacBook")
check("есть заголовок", "Канарейка сбора цен" in body)
check("есть обе причины", "reason A" in body and "reason B" in body)
check("есть вкладка", "MacBook" in body)

print("[12b] format_alert экранирует HTML-спецсимволы в причинах (regression, GST-72)")
# Реальный кейс: "прогон собрал 0 листингов (< 1)" ломал Telegram parse_mode=HTML
# ("can't parse entities: Unsupported start tag"), и алерт вообще не уходил.
reason = "прогон собрал 0 листингов (< 1) — сменилась вёрстка Avito или протух captcha_id"
body = canary.format_alert([reason], tab="MacBook & Co")
check("< экранирован", "(< 1)" not in body and "(&lt; 1)" in body)
check("& в названии вкладки экранирован", "&amp;" in body)
check("наши собственные теги остались литералами", "<b>" in body and "<code>" in body)

print("[12c] format_alert прикладывает context_note (GST-72: конкретная причина капчи)")
body = canary.format_alert(["прогон собрал 0 листингов (< 1)"], tab="MacBook",
                            context_note="ERROR_ZERO_BALANCE")
check("причина видна в тексте алерта", "ERROR_ZERO_BALANCE" in body)
check("без context_note поле не добавляется", "Вероятная причина" not in canary.format_alert(["x"]))

print("[13] Множественные деградации складываются")
r = canary.evaluate_canary(prices=healthy_prices(generated_at=STALE, total=10),
                           run_listings=0, now=NOW, min_total=500)
check("0-прогон + низкий total + stale → 3 деградации", len(r) == 3)


print()
if _fails:
    print(f"❌ ПРОВАЛЕНО: {len(_fails)}")
    for f in _fails:
        print(f"   - {f}")
    sys.exit(1)
print("✅ Все тесты канарейки прошли")
