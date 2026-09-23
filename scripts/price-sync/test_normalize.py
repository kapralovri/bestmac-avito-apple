#!/usr/bin/env python3
"""Офлайн-тесты разовой нормализации базы цен (GST-77).

Запуск:  python3 scripts/price-sync/test_normalize.py
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))          # price-sync/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
from normalize_prices import normalize, migrate_overrides  # noqa: E402
from common.price_identity import build_catalog  # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


NOW = datetime(2026, 9, 23)
CAT = build_catalog({"tabs": {"MacBook": {"mode": "direct", "entries": [
    {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 8, "ssd": 256}]}}})


def r(name, proc, ram, ssd, med, n, upd, **kw):
    return {"model_name": name, "processor": proc, "ram": ram, "ssd": ssd, "median_price": med,
            "buyout_price": int(med * 0.8), "min_price": med, "max_price": med,
            "samples_count": n, "updated_at": upd, **kw}


BEFORE = [
    r("Mac Studio m1", "Apple M4 Max", 64, 1024, 399990, 3, "2026-09-10 21:21"),
    r("Mac Studio m4", "Apple M4 Max", 64, 1024, 620000, 7, "2026-09-16 19:25"),
    r("Mac Studio m1", "Apple M1 Ultra", 64, 1024, 279990, 3, "2026-07-14 20:06"),
    r("Mac mini M4 Pro", "Apple M4", 24, 512, 90000, 6, "2026-09-18 10:00", collector_synced=True),
    r("MacBook Air 13 (2020, M1)", "Apple M1", 8, 256, 45000, 13, "2026-09-19 05:10"),
    r("MacBook Air 13 M1", "Apple M1", 8, 256, 35000, 16, "2026-09-19 05:10"),
    r("MacBook Pro 14 (2023)", "", 0, 0, 93900, 141, "Thu Apr 23 16:02:18 2026"),
    r("mac mini m4", "Apple M4", 16, 256, 50000, 4, "2026-09-01 10:00", manual_override=True),
]
AFTER, REP = normalize(BEFORE, CAT, NOW)
by = {(s["model_name"], s["ram"], s["ssd"]): s for s in AFTER}

print("[1] Склейка и канонические имена")
check("строк стало меньше на склеенные", len(AFTER) == 6)
m4 = by.get(("Mac Studio M4 Max", 64, 1024))
check("M4 Max с двух вкладок — одна строка с реальным именем", m4 is not None)
check("победила свежая с выборкой (вкладка m4)", bool(m4) and m4["median_price"] == 620000)
m1u = by.get(("Mac Studio M1 Ultra", 64, 1024))
check("M1 Ultra отделён от M4 Max", bool(m1u) and m1u["processor"] == "Apple M1 Ultra")
mini = by.get(("Mac mini M4 Pro", 24, 512))
check("синк: уровень чипа вернулся в процессор", bool(mini) and mini["processor"] == "Apple M4 Pro")
check("флаг синка сохранён", bool(mini) and mini.get("collector_synced") is True)
air = by.get(("MacBook Air 13 (2020, M1)", 8, 256))
check("дубль Air M1 склеен под имя из каталога", air is not None and ("MacBook Air 13 M1", 8, 256) not in by)
check("из двух свежих победила большая выборка", bool(air) and air["samples_count"] == 16)
agg = by.get(("MacBook Pro 14 (2023)", 0, 0))
check("сводка 0/0 не тронута", agg == BEFORE[6])
ov = by.get(("Mac mini M4", 16, 256))
check("ручной оверрайд сохранил флаг", bool(ov) and ov.get("manual_override") is True)

print("\n[2] Адреса /ceny")
sc = REP["slug_changes"]
check("вкладка m4 переименована в M4 Max", sc["renamed"].get("mac-studio-m4") == "mac-studio-m4-max")
check("дубль Air M1 ведёт на канон", sc["renamed"].get("macbook-air-13-m1") == "macbook-air-13-2020-m1")
check("вкладка m1 распалась на несколько моделей", "mac-studio-m1" in sc["split"])
check("неизменные адреса в отчёт не попадают",
      "macbook-air-13-2020-m1" not in sc["renamed"] and "mac-mini-m4-pro" not in sc["renamed"])
check("отчёт знает о склейках", len(REP["merged"]) == 2)
check("устаревшая строка в отчёте, но не удалена",
      any(s["processor"] == "Apple M1 Ultra" for s in REP["stale"]) and m1u is not None)

print("\n[3] Ключи ручных оверрайдов")
new_ov, moved, ambiguous = migrate_overrides(
    {"__comment__": "x", "macbook air 13 m1|8|256": {"median": 1}, "mac mini m4|16|256": {"median": 2},
     "mac studio m1|64|1024": {"buyout": 3}},
    BEFORE, CAT)
check("ключ переехал на каноническое имя",
      new_ov.get("macbook air 13 (2020, m1)|8|256") == {"median": 1} and "macbook air 13 m1|8|256" not in new_ov)
check("совпадающий с каноном ключ остался", new_ov.get("mac mini m4|16|256") == {"median": 2})
check("служебный комментарий на месте", new_ov.get("__comment__") == "x")
check("переезд записан в отчёт", {"from": "macbook air 13 m1|8|256", "to": "macbook air 13 (2020, m1)|8|256"} in moved)
check("неоднозначный ключ не тронут", new_ov.get("mac studio m1|64|1024") == {"buyout": 3})
check("…и попал в отчёт", "mac studio m1|64|1024" in ambiguous)

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты нормализации прошли")
