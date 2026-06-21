#!/usr/bin/env python3
"""Офлайн-тесты ядра монитора чатов (без Telethon/сети).
Запуск:  python3 scripts/tg-leads/test_monitor.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from monitor import detect_listing, extract_price, build_lead, live_key

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


print("\n[1] extract_price")
check("«85000 р» → 85000", extract_price("отдам за 85000 р") == 85000)
check("«85к» → 85000", extract_price("цена 85к, торг") == 85000)
check("«120 000 ₽» → 120000", extract_price("120 000 ₽") == 120000)
check("«цена 300000» → 300000", extract_price("Mac Studio, цена 300000") == 300000)
check("спека «16/512» без маркера → None", extract_price("MacBook Air 16/512") is None)


print("\n[2] detect_listing")
hit = detect_listing("Продаю MacBook Air M2 13 16/512, идеал, 85000 р")
check("продажа Air M2 → hit", hit is not None and hit[1] == 85000)
check("куплю → None", detect_listing("Куплю MacBook дорого, деньги сразу") is None)
check("продам iPhone → None (не Mac)", detect_listing("Продам iPhone 14 Pro 256, 60000р") is None)
check("минус дисплей → None (дефект)",
      detect_listing("Продаю MacBook Pro 14 M1 Pro 16/512 минус дисплей, 60000р") is None)
check("без цены/намерения → None", detect_listing("MacBook Air M2 16/512") is None)
check("Mac Studio отдам цена → hit",
      detect_listing("Отдам Mac Studio M2 Max 64/2TB, цена 300000") is not None)


print("\n[3] build_lead")
cfg, price, _ = detect_listing("Продаю MacBook Air M2 13 16/512, идеал, 85000 р")
idx = {live_key(cfg): {"median_price": 95000, "buyout_price": 76000}}
lead = build_lead(cfg, price, "https://t.me/khamovnikichat/123", "Хамовники", idx,
                  "Продаю MacBook Air M2 13 16/512", "2026-06-21T00:00:00")
check("walk_away = выкуп из базы (76000)", lead["walk_away"] == 76000)
check("target = min(цена,выкуп)*0.95", lead["target"] == int(min(85000, 76000) * 0.95))
check("source = tg", lead["source"] == "tg")
check("есть id и url", bool(lead["id"]) and lead["url"].startswith("https://t.me/"))
check("asking = цена поста", lead["asking"] == 85000)

# без записи в базе → выкуп от цены
lead2 = build_lead(cfg, price, "https://t.me/x/1", "", {}, "t", "2026-06-21T00:00:00")
check("нет в базе → walk_away от цены (price*0.85)", lead2["walk_away"] == int(85000 * 0.85))


print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails)); sys.exit(1)
print("✅ Все тесты монитора прошли")
