#!/usr/bin/env python3
"""
Автосинк базы цен (avito-prices.json) из накопителя коллектора (intake-raw-prices.json).

Зачем: CI-парсер троттлится и неделями не обновляет горячие конфиги, а домашний
коллектор видит живой поток без капчи. Скрипт переносит модальные медианы коллектора
в базу — сайт и quote-бот остаются свежими, даже когда парсер буксует.

Иерархия доверия (никогда не нарушается):
  1. Ручной оверрайд (manual_override / price-overrides.json) — неприкосновенен.
  2. Свежая запись парсера (моложе STALE_DAYS) — московский эталон, не трогаем.
  3. Протухшая запись → заменяем модальной коллектора (Москва-подвыборка приоритетнее).
  4. Конфига нет в базе (новинки вроде Air M5) → вставляем новую строку (строже порог).

Запуск:  python3 scripts/price-sync/sync_from_collector.py            # dry-run (показать план)
         python3 scripts/price-sync/sync_from_collector.py --apply    # применить к базе
"""
import os
import sys
import ast
import json
import time
import argparse
import statistics
from pathlib import Path
from datetime import datetime

SD = Path(__file__).resolve().parent
sys.path.insert(0, str(SD.parent))                        # scripts/  (common.*)
sys.path.insert(0, str(SD.parent / "hot-deals-scanner"))  # scanner_v2

from scanner_v2 import modal_center, live_key, db_entry_is_stale, _norm_raw_entry  # noqa: E402
from common.classifier import classify  # noqa: E402

PRICES_FILE = Path(os.environ.get('PRICES_FILE_PATH', SD / "../../public/data/avito-prices.json"))
RAW_FILE = Path(os.environ.get('INTAKE_RAW_PRICES_PATH', SD / "../../public/data/intake-raw-prices.json"))

MAX_AGE_DAYS = 30      # цены коллектора старше — не учитываем
MSK_MIN = 6            # минимум московских цен для московской модальной
ALL_MIN = 10           # иначе — минимум всероссийских
NEW_MSK_MIN = 8        # пороги для ВСТАВКИ нового конфига (строже)
NEW_ALL_MIN = 12
MAX_DEV = 0.40         # защитный предохранитель: не менять медиану более чем на ±40%


def _key_to_row_skeleton(key_str):
    """('MacBook Air','M5','base',13,16,512) → заготовка строки базы.
    None, если ключ не парсится или classify не даёт round-trip тот же live_key."""
    try:
        family, chip, tier, screen, ram, ssd = ast.literal_eval(key_str)
    except (ValueError, SyntaxError):
        return None
    chip_label = chip + ('' if tier == 'base' else f' {tier}')
    model_name = (f"{family} {screen} {chip_label}" if screen else f"{family} {chip_label}")
    c = classify(f"{model_name} Apple {chip_label}", {'ram': int(ram), 'ssd': int(ssd)})
    if not c.is_valid or str(live_key(c)) != key_str:
        return None   # синтез имени не сошёлся с классификатором — не рискуем
    return {
        "model_name": model_name, "family": family, "processor": f"Apple {chip}",
        "ram": int(ram), "ssd": int(ssd),
    }


def sync_stats(stats, raw_store, now=None,
               max_age_days=MAX_AGE_DAYS, msk_min=MSK_MIN, all_min=ALL_MIN,
               new_msk_min=NEW_MSK_MIN, new_all_min=NEW_ALL_MIN, max_dev=MAX_DEV):
    """Мутирует stats на месте. Возвращает (updated, inserted, changes: list[str])."""
    now = now or datetime.now()
    now_ts = int(now.timestamp())
    cutoff = now_ts - max_age_days * 86400
    stamp = now.strftime("%Y-%m-%d %H:%M")

    # индекс строк базы по live_key (дубликаты конфига — все в список)
    idx = {}
    for s in stats:
        try:
            c = classify(f"{s['model_name']} {s.get('processor', '')}",
                         {'ram': int(s.get('ram', 0)), 'ssd': int(s.get('ssd', 0))})
            if c.is_valid:
                idx.setdefault(str(live_key(c)), []).append(s)
        except Exception:
            continue

    updated, inserted, changes = 0, 0, []
    for key, entries in sorted(raw_store.items()):
        if not isinstance(entries, list):
            continue
        norm = [_norm_raw_entry(e, now_ts) for e in entries]
        fresh = [e for e in norm if e[1] >= cutoff]
        msk = [e[0] for e in fresh if e[2] == 1]
        allp = [e[0] for e in fresh]
        rows = idx.get(key)

        # выбор выборки: Москва приоритетнее (эталон перепродажи)
        need_msk, need_all = (msk_min, all_min) if rows else (new_msk_min, new_all_min)
        if len(msk) >= need_msk:
            prices, src = msk, f"мск n={len(msk)}"
        elif len(allp) >= need_all:
            prices, src = allp, f"рф n={len(allp)}"
        else:
            continue
        modal = modal_center(prices)
        if modal <= 0:
            continue
        buyout = max(0, int(modal * 0.80 // 1000 * 1000))

        if rows:
            for s in rows:
                if s.get('manual_override'):
                    changes.append(f"  = {key}: оверрайд — не трогаем")
                    continue
                if not db_entry_is_stale(s.get('updated_at'), now=now):
                    continue   # свежая запись парсера (Москва) главнее
                old = int(s.get('median_price') or 0)
                if old and abs(modal - old) / old > max_dev:
                    changes.append(f"  ! {key}: {old}→{modal} ({src}) — отклонение >{int(max_dev*100)}%, пропуск")
                    continue
                s['median_price'] = int(modal)
                s['buyout_price'] = buyout
                s['updated_at'] = stamp
                s['collector_synced'] = True
                updated += 1
                changes.append(f"  ✓ {key}: {old}→{modal} ({src}), выкуп {buyout}")
        else:
            skel = _key_to_row_skeleton(key)
            if not skel:
                continue
            row = {**skel,
                   "min_price": int(min(prices)), "max_price": int(max(prices)),
                   "median_price": int(modal), "buyout_price": buyout,
                   "samples_count": len(prices), "updated_at": stamp,
                   "collector_synced": True}
            stats.append(row)
            inserted += 1
            changes.append(f"  + {key}: НОВЫЙ конфиг, медиана {modal} ({src}), выкуп {buyout}")
    return updated, inserted, changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="записать изменения в базу (иначе dry-run)")
    args = ap.parse_args()

    if not RAW_FILE.exists():
        print("Накопитель пуст — синкать нечего.")
        return
    try:
        raw = json.loads(RAW_FILE.read_text(encoding='utf-8')) or {}
    except Exception as e:
        print(f"Не прочитать накопитель: {e}")
        sys.exit(1)
    data = json.load(open(PRICES_FILE, encoding='utf-8'))
    stats = data.get('stats', [])

    updated, inserted, changes = sync_stats(stats, raw)
    print(f"Синк из коллектора: обновлено {updated}, добавлено {inserted} "
          f"(конфигов в накопителе: {len(raw)})")
    for line in changes:
        print(line)
    if not args.apply:
        print("\n(dry-run: без --apply база не изменена)")
        return
    if updated or inserted:
        # порядок строк не трогаем (минимальный git-diff); парсер пересортирует сам
        with open(PRICES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ База обновлена")
    else:
        print("Изменений нет — база не тронута")


if __name__ == '__main__':
    main()
