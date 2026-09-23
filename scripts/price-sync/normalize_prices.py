#!/usr/bin/env python3
"""
Разовая нормализация базы цен (GST-77, docs/price-identity-GST-77.md).

Перераскладывает строки avito-prices.json по правильной идентичности, склеивает
дубли, ставит канонические имена и процессор с уровнем чипа, переводит ключи
ручных оверрайдов на новые имена. Сводки 0/0 не трогает.

Запуск:  python3 scripts/price-sync/normalize_prices.py                 # сухой прогон
         python3 scripts/price-sync/normalize_prices.py --report r.json # + отчёт в JSON
         python3 scripts/price-sync/normalize_prices.py --apply         # только после ревью отчёта!
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

SD = Path(__file__).resolve().parent
sys.path.insert(0, str(SD.parent))   # scripts/ (common.*)

from common.price_identity import (  # noqa: E402
    row_identity, canonicalize_row, build_catalog, pick_winner, model_to_slug,
    age_days, FRESH_DAYS,
)

DATA = SD / "../../public/data"
PRICES_FILE = Path(os.environ.get("PRICES_FILE_PATH", DATA / "avito-prices.json"))
CONFIG_FILE = Path(os.environ.get("PARSER_CONFIG_PATH", DATA / "parser-config.json"))
OVERRIDES_FILE = Path(os.environ.get("PRICE_OVERRIDES_PATH", DATA / "price-overrides.json"))

_BRIEF = ("model_name", "processor", "ram", "ssd", "median_price", "buyout_price",
          "samples_count", "updated_at")


def _brief(s):
    return {k: s.get(k) for k in _BRIEF}


def slug_changes(before, after, catalog):
    """Какие адреса /ceny исчезнут и куда вести.

    renamed — старая страница стала ровно одной новой; split — модель распалась
    на несколько (вкладка «Mac Studio m1» смешивала M1 Ultra и M4 Max): её ведём
    на индекс /ceny, а не на случайную из моделей.
    """
    after_slugs = {model_to_slug(s["model_name"]) for s in after}
    targets: dict = {}
    for s in before:
        old = model_to_slug(s["model_name"])
        if old in after_slugs:
            continue
        targets.setdefault(old, set()).add(model_to_slug(canonicalize_row(s, catalog)["model_name"]))
    out = {"renamed": {}, "split": []}
    for old, new in sorted(targets.items()):
        if len(new) == 1:
            out["renamed"][old] = next(iter(new))
        else:
            out["split"].append(old)
    return out


def normalize(stats, catalog, now):
    """→ (новые stats, отчёт). Чистая функция."""
    result, groups = [], {}
    for s in stats:
        key = row_identity(s)
        if key is None:
            result.append(dict(s))   # сводка 0/0 или неклассифицируемое — не трогаем
            continue
        groups.setdefault(key, []).append(s)

    renamed, merged = [], []
    for key, rows in groups.items():
        winner = rows[0] if len(rows) == 1 else pick_winner(rows, now)
        out = canonicalize_row(winner, catalog)
        result.append(out)
        if len(rows) > 1:
            merged.append({"key": str(key), "into": out["model_name"], "kept": _brief(winner),
                           "dropped": [_brief(r) for r in rows if r is not winner]})
        for r in rows:
            if (r.get("model_name"), r.get("processor")) != (out["model_name"], out["processor"]):
                renamed.append({"from": f"{r.get('model_name')} | {r.get('processor')}",
                                "to": f"{out['model_name']} | {out['processor']}"})
    # Устаревшие не удаляются (спека, п. 4) — только в отчёт; прячет их правило надёжной цены.
    stale = [_brief(s) for s in result if row_identity(s) is not None
             and (age_days(s.get("updated_at"), now) or 10 ** 6) > FRESH_DAYS]
    return result, {"renamed": renamed, "merged": merged, "stale": stale,
                    "slug_changes": slug_changes(stats, result, catalog)}


def migrate_overrides(overrides, before, catalog):
    """Ключ оверрайда «имя|ram|ssd» (имя в нижнем регистре, как в базе) → новое имя.

    Если под старым ключом лежат строки разных моделей (подпись вкладки общая),
    ключ не трогаем и сообщаем: переносить на случайную модель нельзя.
    """
    by_old: dict = {}
    for s in before:
        k = f"{str(s.get('model_name', '')).lower()}|{int(s.get('ram') or 0)}|{int(s.get('ssd') or 0)}"
        by_old.setdefault(k, []).append(s)
    out, moved, ambiguous = {}, [], []
    for k, v in overrides.items():
        rows = by_old.get(k)
        if k.startswith("__") or not rows:
            out[k] = v
            continue
        names = {canonicalize_row(s, catalog)["model_name"] for s in rows}
        if len(names) > 1:
            out[k] = v
            ambiguous.append(k)
            continue
        ram_ssd = k.split("|", 1)[1]
        nk = f"{names.pop().lower()}|{ram_ssd}"
        out[nk] = v
        if nk != k:
            moved.append({"from": k, "to": nk})
    return out, moved, ambiguous


def _write_json(path, data):
    tmp = path.parent / (path.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def _print_report(rep):
    print(f"Строк: {rep['rows']['before']} → {rep['rows']['after']}")
    print(f"Переименовано строк: {len(rep['renamed'])} | склеек: {len(rep['merged'])} | "
          f"старше {FRESH_DAYS} дней (не удаляются): {len(rep['stale'])}")
    print("\n— Склейки (что осталось ← что ушло):")
    for m in rep["merged"]:
        k = m["kept"]
        dropped = ", ".join(f"{d['model_name']} мед {d['median_price']} n {d['samples_count']}"
                            for d in m["dropped"])
        print(f"  {m['into']} {k['ram']}/{k['ssd']}: мед {k['median_price']} n {k['samples_count']}"
              f" ← {dropped}")
    sc = rep["slug_changes"]
    print(f"\n— Адреса /ceny: переименовано {len(sc['renamed'])}, распалось {len(sc['split'])}")
    for old, new in sc["renamed"].items():
        print(f"  /ceny/{old} → /ceny/{new}")
    for old in sc["split"]:
        print(f"  /ceny/{old} → /ceny (распалась на несколько моделей)")
    print(f"\n— Оверрайды: переехало {len(rep['overrides_moved'])}, "
          f"неоднозначных {len(rep['overrides_ambiguous'])}")
    for m in rep["overrides_moved"]:
        print(f"  {m['from']} → {m['to']}")
    for k in rep["overrides_ambiguous"]:
        print(f"  ⚠️ {k} — не тронут, нужен ручной разбор")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="записать в базу (только после ревью отчёта)")
    ap.add_argument("--report", default=None, help="сохранить отчёт в JSON")
    args = ap.parse_args()

    now = datetime.now()
    data = json.loads(PRICES_FILE.read_text(encoding="utf-8"))
    catalog = build_catalog(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
    before = data.get("stats", [])
    after, report = normalize(before, catalog, now)
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8")) if OVERRIDES_FILE.exists() else {}
    new_overrides, moved, ambiguous = migrate_overrides(overrides, before, catalog)
    report["overrides_moved"], report["overrides_ambiguous"] = moved, ambiguous
    report["rows"] = {"before": len(before), "after": len(after)}

    _print_report(report)
    if args.report:
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if not args.apply:
        print("\nСухой прогон: база не изменена. Запись — с --apply, после ревью отчёта.")
        return

    after.sort(key=lambda s: (s.get("family", ""), s["model_name"], s.get("processor", ""),
                              s["ram"], s["ssd"]))
    data["stats"] = after
    data["total_listings"] = sum(int(s.get("samples_count") or 0) for s in after)
    _write_json(PRICES_FILE, data)
    if moved:
        _write_json(OVERRIDES_FILE, new_overrides)
    print(f"\n✅ Записано: {PRICES_FILE}")


if __name__ == "__main__":
    main()
