#!/usr/bin/env python3
"""Офлайн-тесты идентичности строк базы цен (GST-77).

Запуск:  python3 scripts/common/test_price_identity.py
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
from common.price_identity import (  # noqa: E402
    row_identity, canonical_processor, synth_name, build_catalog,
    canonicalize_row, pick_winner, age_days, model_to_slug,
)

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


def row(name, proc, ram, ssd, **kw):
    return {"model_name": name, "processor": proc, "ram": ram, "ssd": ssd, **kw}


print("[1] Правило идентичности")
check("имя и процессор согласны",
      row_identity(row("MacBook Pro 14 (2023)", "Apple M2 Pro", 16, 1024))
      == ("MacBook Pro", "M2", "Pro", 14, 16, 1024))
check("поколение из процессора — в имени подпись вкладки",
      row_identity(row("Mac Studio m1", "Apple M4 Max", 64, 1024))
      == ("Mac Studio", "M4", "Max", None, 64, 1024))
check("уровень из процессора",
      row_identity(row("Mac Studio m2", "Apple M2 Ultra", 64, 1024))
      == ("Mac Studio", "M2", "Ultra", None, 64, 1024))
check("уровень из имени — синк потерял Pro",
      row_identity(row("Mac mini M4 Pro", "Apple M4", 24, 512))
      == ("Mac mini", "M4", "Pro", None, 24, 512))
check("оба называют разный уровень — берём процессор",
      row_identity(row("Mac Studio M2 Max", "Apple M2 Ultra", 64, 1024))
      == ("Mac Studio", "M2", "Ultra", None, 64, 1024))

print("\n[2] Сводки и неполные строки")
check("сводка 0/0 — не конфигурация",
      row_identity(row("MacBook Pro 14 (2023)", "", 0, 0)) is None)
check("пустой процессор — идентичность из имени, строка не теряется",
      row_identity(row("MacBook Air 13 (2020, M1)", "", 8, 256))
      == ("MacBook Air", "M1", "base", 13, 8, 256))

print("\n[3] Каноническая запись")
check("процессор с уровнем", canonical_processor(("Mac mini", "M4", "Pro", None, 24, 512)) == "Apple M4 Pro")
check("процессор базового чипа", canonical_processor(("MacBook Air", "M1", "base", 13, 8, 256)) == "Apple M1")
check("Intel — без «Apple»", canonical_processor(("iMac", "Intel", "base", 27, 8, 512)) == "Intel")
check("имя десктопа", synth_name(("Mac Studio", "M4", "Max", None, 64, 1024)) == "Mac Studio M4 Max")
check("имя с диагональю", synth_name(("iMac", "M3", "base", 24, 8, 256)) == "iMac 24 M3")

cat = build_catalog({"tabs": {
    "MacBook": {"mode": "direct", "entries": [
        {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 8, "ssd": 256}]},
    "Mac Studio": {"mode": "discovery", "entries": [{"model": "Mac Studio m1", "processor": "m1"}]},
}})
check("каталог берёт direct-вкладки",
      cat.get(("MacBook Air", "M1", "base", 13, 8, 256)) == "MacBook Air 13 (2020, M1)")
check("подписи discovery-вкладок в каталог не попадают", "Mac Studio m1" not in cat.values())

r = canonicalize_row(row("Mac Studio m1", "Apple M4 Max", 64, 1024, median_price=399990), cat)
check("десктоп: имя по реальной модели", r["model_name"] == "Mac Studio M4 Max")
check("десктоп: процессор с уровнем", r["processor"] == "Apple M4 Max")
check("прочие поля не тронуты", r["median_price"] == 399990)
r = canonicalize_row(row("MacBook Air 13 M1", "Apple M1", 8, 256), cat)
check("MacBook из каталога → имя каталога", r["model_name"] == "MacBook Air 13 (2020, M1)")
# Без диагонали — отдельная конфигурация: так же классифицируются живые объявления
# «MacBook Air M1», и сканеру нужна строка под их ключ.
r = canonicalize_row(row("MacBook Air M1", "Apple M1", 8, 256), cat)
check("Air без диагонали не сливается с каталожной", r["model_name"] == "MacBook Air M1")
r = canonicalize_row(row("MacBook Pro 14 M5 Pro", "Apple M5", 16, 1024), cat)
check("MacBook вне каталога: имя сохраняется", r["model_name"] == "MacBook Pro 14 M5 Pro")
check("…а уровень в процессоре восстанавливается", r["processor"] == "Apple M5 Pro")
agg = row("MacBook Pro 14 (2023)", "", 0, 0, samples_count=141)
check("сводка 0/0 не меняется", canonicalize_row(agg, cat) == agg)

print("\n[4] Победитель при склейке")
now = datetime(2026, 9, 23)
fresh = row("x", "Apple M1", 8, 256, samples_count=6, updated_at="2026-09-20 10:00", median_price=1)
big_old = row("x", "Apple M1", 8, 256, samples_count=40, updated_at="2026-05-01 10:00", median_price=2)
thin = row("x", "Apple M1", 8, 256, samples_count=3, updated_at="2026-09-22 10:00", median_price=3)
ov = row("x", "Apple M1", 8, 256, samples_count=1, updated_at="2026-01-01 10:00",
         median_price=4, manual_override=True)
a1 = row("x", "Apple M1", 8, 256, samples_count=10, updated_at="2026-04-01 10:00", median_price=5)
a2 = row("x", "Apple M1", 8, 256, samples_count=10, updated_at="2026-04-10 10:00", median_price=6)
check("свежая с выборкой бьёт большую старую", pick_winner([big_old, fresh], now)["median_price"] == 1)
check("без свежей надёжной — больше выборка", pick_winner([thin, big_old], now)["median_price"] == 2)
check("ручной оверрайд главнее всего", pick_winner([fresh, big_old, ov], now)["median_price"] == 4)
check("при равной выборке — новее", pick_winner([a1, a2], now)["median_price"] == 6)
check("дата в формате парсера", age_days("Thu Apr 23 16:02:18 2026", now) == 152)
check("нераспознанная дата — не свежая", age_days("вчера", now) is None)

print("\n[5] Адрес страницы /ceny — как modelToSlug на сайте")
check("MacBook", model_to_slug("MacBook Air 13 (2020, M1)") == "macbook-air-13-2020-m1")
check("подпись вкладки", model_to_slug("Mac Studio m1") == "mac-studio-m1")
check("каноническое имя десктопа", model_to_slug("Mac Studio M4 Max") == "mac-studio-m4-max")
check("MacBook по году", model_to_slug("MacBook Pro 14 (2023)") == "macbook-pro-14-2023")

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты идентичности прошли")
