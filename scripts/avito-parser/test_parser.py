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
check("без оверрайда median = расчёт market_analysis", st3["median_price"] == P.market_analysis(skew)[2])

# ─── GST-77: discovery и склейка базы ────────────────────────────────────────
from datetime import datetime as _dt

print("\n[GST-77] discovery — одна строка на реальную конфигурацию")
g_m1 = {("Mac Studio m1", "Apple M4 Max", 64, 1024): [("u1", 400000), ("u2", 410000)],
        ("Mac Studio m1", "Apple M1 Max", 32, 512): [("u9", 120000), ("u10", 125000)]}
g_m4 = {("Mac Studio m4", "Apple M4 Max", 64, 1024): [("u2", 410000), ("u3", 420000)]}
st = P.discovery_stats([g_m1, g_m4], "Mac Studio", catalog={}, min_samples=2)
m4 = [s for s in st if s["processor"] == "Apple M4 Max"]
check("M4 Max с двух вкладок — одна строка", len(m4) == 1)
check("имя по реальной модели, а не по вкладке", bool(m4) and m4[0]["model_name"] == "Mac Studio M4 Max")
check("объявление с двух вкладок посчитано один раз", bool(m4) and m4[0]["samples_count"] == 3)
check("M1 Max не смешан с M4 Max", any(s["model_name"] == "Mac Studio M1 Max" for s in st))
thin = P.discovery_stats([{("Mac Studio m2", "Apple M2 Max", 64, 1024): [("x", 1)]}],
                         "Mac Studio", catalog={}, min_samples=2)
check("мало объявлений — строки нет", thin == [])

print("\n[GST-77] база склеивается по правилу, а не «последний победил»")
older = {"model_name": "Mac Studio m1", "family": "Mac Studio", "processor": "Apple M4 Max",
         "ram": 64, "ssd": 1024, "median_price": 111, "samples_count": 40,
         "updated_at": "2026-03-01 10:00"}
fresher = {"model_name": "Mac Studio m4", "family": "Mac Studio", "processor": "Apple M4 Max",
           "ram": 64, "ssd": 1024, "median_price": 222, "samples_count": 7,
           "updated_at": "2026-09-20 10:00"}
db = P.build_db([fresher, older], now=_dt(2026, 9, 23))
check("две строки одной конфигурации → одна", len(db) == 1)
check("победила свежая по правилу, а не последняя в списке",
      list(db.values())[0]["median_price"] == 222)
agg = {"model_name": "MacBook Pro 14 (2023)", "processor": "", "ram": 0, "ssd": 0,
       "samples_count": 141}
check("сводка 0/0 сохраняется рядом", len(P.build_db([agg, fresher], now=_dt(2026, 9, 23))) == 2)
new = dict(fresher, median_price=333, model_name="Mac Studio M4 Max", updated_at="2026-09-23 09:00")
n, u = P.merge_into_db(db, [new])
check("новый прогон обновляет ту же конфигурацию",
      (n, u) == (0, 1) and list(db.values())[0]["median_price"] == 333)

print("\n[GST-77] лента объявлений: discovery-лоты не теряются")
run_stats = P.discovery_stats([g_m1], "Mac Studio", catalog={}, min_samples=2)
raw = [{"model_name": "Mac Studio m1", "processor": "Apple M4 Max", "ram": 64, "ssd": 1024,
        "price": 400000, "url": "u1", "title": "t"},
       {"model_name": "Mac Studio m4", "processor": "Apple M4 Max", "ram": 64, "ssd": 1024,
        "price": 400000, "url": "u1", "title": "t"},
       {"model_name": "Mac Studio m1", "processor": "Apple M2 Max", "ram": 32, "ssd": 512,
        "price": 1, "url": "u7", "title": "t"}]
feed = P.listing_feed(raw, run_stats, catalog={}, seen_at="2026-09-23 10:00")
check("лот конфигурации из статистики попал в ленту", [l["url"] for l in feed] == ["u1"])
check("имя в ленте — как у строки статистики",
      bool(feed) and feed[0]["model_name"] == "Mac Studio M4 Max" and feed[0]["processor"] == "Apple M4 Max")
check("метка прогона проставлена", bool(feed) and feed[0]["seen_at"] == "2026-09-23 10:00")

print("\n[GST-77] main() не перекрывает функции модуля локальными именами")
# main() локально не запустить (ходит на Avito), а локальная переменная с именем
# функции модуля роняет прогон уже после сбора цен: так было с run_listings.
import ast as _ast, inspect as _inspect
_mod_funcs = {n.name for n in _ast.parse(_inspect.getsource(P)).body if isinstance(n, _ast.FunctionDef)}
_main = next(n for n in _ast.parse(_inspect.getsource(P)).body
             if isinstance(n, _ast.FunctionDef) and n.name == "main")
_assigned = {t.id for n in _ast.walk(_main) if isinstance(n, (_ast.Assign, _ast.AugAssign, _ast.AnnAssign))
             for t in (n.targets if isinstance(n, _ast.Assign) else [n.target]) if isinstance(t, _ast.Name)}
_clash = sorted(_assigned & _mod_funcs)
check(f"нет перекрытых имён: {_clash}", not _clash)

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты парсера прошли")
