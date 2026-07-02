#!/usr/bin/env python3
"""Офлайн-тесты автосинка базы из накопителя коллектора.

Запуск:  python3 scripts/price-sync/test_sync.py
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sync_from_collector import sync_stats, _key_to_row_skeleton  # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


NOW = datetime(2026, 7, 2, 12, 0)
TS = int(NOW.timestamp())
K_AIR = "('MacBook Air', 'M2', 'base', 13, 16, 512)"
K_M5 = "('MacBook Air', 'M5', 'base', 13, 16, 512)"


def row(median, updated="2026-07-01 10:00", override=False):
    r = {"model_name": "MacBook Air 13 M2", "family": "MacBook Air", "processor": "Apple M2",
         "ram": 16, "ssd": 512, "min_price": median - 10000, "max_price": median + 10000,
         "median_price": median, "buyout_price": int(median * 0.8), "samples_count": 20,
         "updated_at": updated}
    if override:
        r["manual_override"] = True
    return r


def entries(prices, msk=1, age_days=0):
    return [[p, TS - age_days * 86400, msk] for p in prices]


msk8 = entries([80000, 81000, 82000, 82000, 83000, 84000, 85000, 86000])   # модальная ~82-83к

print("[1] Иерархия доверия")
# свежая запись парсера → не трогаем
stats = [row(100000, updated="2026-07-01 10:00")]
u, i, _ = sync_stats(stats, {K_AIR: msk8}, now=NOW)
check("свежая база не тронута", u == 0 and stats[0]["median_price"] == 100000)

# протухшая → обновляем московской модальной
stats = [row(100000, updated="2026-06-20 10:00")]
u, i, ch = sync_stats(stats, {K_AIR: msk8}, now=NOW)
check("протухшая обновлена", u == 1 and 80000 <= stats[0]["median_price"] <= 86000)
check("выкуп пересчитан (×0.8, до тысячи)", stats[0]["buyout_price"] % 1000 == 0
      and abs(stats[0]["buyout_price"] - stats[0]["median_price"] * 0.8) < 1000)
check("updated_at освежён (синк защитит от повтора)", stats[0]["updated_at"].startswith("2026-07-02"))
check("помечена collector_synced", stats[0].get("collector_synced") is True)

# оверрайд → неприкосновенен даже протухший
stats = [row(50000, updated="2026-01-01 10:00", override=True)]
u, i, _ = sync_stats(stats, {K_AIR: msk8}, now=NOW)
check("оверрайд не тронут", u == 0 and stats[0]["median_price"] == 50000)

print("\n[2] Выборки и пороги")
# мало Москвы, мало России → пропуск
stats = [row(100000, updated="2026-06-01 10:00")]
u, i, _ = sync_stats(stats, {K_AIR: entries([80000] * 5, msk=1)}, now=NOW)
check("данных мало → пропуск", u == 0)

# Москвы мало, России достаточно (>=10) → всероссийская
raw = {K_AIR: entries([80000, 81000, 82000], msk=1) + entries([70000] * 8, msk=0)}
stats = [row(100000, updated="2026-06-01 10:00")]
u, i, ch = sync_stats(stats, {K_AIR: raw[K_AIR]}, now=NOW)
check("фолбэк на всероссийскую выборку", u == 1 and "рф n=11" in " ".join(ch))

# старые цены (>30 дней) выпадают
raw_old = {K_AIR: entries([80000] * 8, msk=1, age_days=40)}
stats = [row(100000, updated="2026-06-01 10:00")]
u, i, _ = sync_stats(stats, raw_old, now=NOW)
check("цены старше 30 дней не считаются", u == 0)

# легаси-числа (без ts/города) считаются свежими всероссийскими
stats = [row(100000, updated="2026-06-01 10:00")]
u, i, _ = sync_stats(stats, {K_AIR: [80000] * 12}, now=NOW)
check("легаси-формат работает как всероссийский", u == 1)

print("\n[3] Предохранитель отклонения")
stats = [row(200000, updated="2026-06-01 10:00")]           # 200к → 82к = −59%
u, i, ch = sync_stats(stats, {K_AIR: msk8}, now=NOW)
check("аномальное отклонение >40% → пропуск", u == 0 and any("отклонение" in c for c in ch))

print("\n[4] Вставка новых конфигов (Air M5)")
stats = []
u, i, ch = sync_stats(stats, {K_M5: entries([89000, 89490, 90000, 88990, 91000, 88000, 92000, 89900], msk=1)}, now=NOW)
check("новый конфиг вставлен (мск n=8)", i == 1 and len(stats) == 1)
check("имя синтезировано", stats[0]["model_name"] == "MacBook Air 13 M5")
check("процессор/ram/ssd", stats[0]["processor"] == "Apple M5" and stats[0]["ram"] == 16 and stats[0]["ssd"] == 512)

stats = []
u, i, _ = sync_stats(stats, {K_M5: entries([89000] * 7, msk=1)}, now=NOW)
check("для вставки порог строже (мск<8 → нет)", i == 0)

check("skeleton: round-trip через классификатор", _key_to_row_skeleton(K_M5) is not None)
check("skeleton: мусорный ключ → None", _key_to_row_skeleton("не ключ") is None)

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты синка прошли")
