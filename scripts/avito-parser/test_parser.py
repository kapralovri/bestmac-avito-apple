#!/usr/bin/env python3
"""Офлайн-тесты ценовой логики парсера: модальная медиана + ручные оверрайды.

Запуск:  python3 scripts/avito-parser/test_parser.py
"""
import sys
import statistics
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import parser as P  # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


print("[1] modal_center — центр плотного кластера")
skew = sorted([44000, 45000, 46000, 47000, 48000, 48000, 49000, 50000, 50000, 51000]
              + [60000, 62000, 64000, 66000, 68000, 70000, 72000, 74000, 76000, 78000])
check("на скошенном модальная НИЖЕ обычной медианы",
      P.modal_center(skew) < int(statistics.median(skew)))
check("модальная попадает в кластер 44–52к", 44000 <= P.modal_center(skew) <= 52000)
tight = [50000, 50000, 51000, 51000, 52000, 52000, 53000, 53000]
check("на плотном модальная ≈ медиана", abs(P.modal_center(tight) - int(statistics.median(tight))) <= 2000)
check("n<4 → обычная медиана", P.modal_center([40000, 60000, 90000]) == 60000)
check("пусто → 0", P.modal_center([]) == 0)

print("\n[2] build_stat — ручные оверрайды")
P.PRICE_OVERRIDES = {"mac mini m4|16|256": {"median": 50000}}
st = P.build_stat("mac mini m4", "Apple M4", 16, 256, "Mac mini",
                  [40000, 55000, 60000, 75000, 90000, 100000, 42000, 47000])
check("оверрайд медианы применился", st["median_price"] == 50000)
check("выкуп пересчитан от оверрайда (×0.8)", st["buyout_price"] == 40000)

P.PRICE_OVERRIDES = {"mac mini m4|16|256": {"median": 50000, "buyout": 37000}}
st2 = P.build_stat("mac mini m4", "Apple M4", 16, 256, "Mac mini", [40000, 55000, 60000])
check("оверрайд выкупа применился", st2["buyout_price"] == 37000)

P.PRICE_OVERRIDES = {}
st3 = P.build_stat("mac mini m4", "Apple M4", 16, 256, "Mac mini", skew)
check("без оверрайда median = модальная", st3["median_price"] == P.modal_center(skew))

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты парсера прошли")
