#!/usr/bin/env python3
"""
Применяет public/data/price-overrides.json к текущему avito-prices.json БЕЗ полного
парсинга — мгновенный патч медианы/выкупа для моделей, которые ты задал вручную.

Парсер и так применяет оверрайды на каждом прогоне (build_stat), но это раз в сутки.
Этот скрипт обновляет цифры сразу (для сайта и сканера), пока парсер не отработал.
Идемпотентно. Запуск:  python3 scripts/avito-parser/apply_overrides.py
"""
import json
from pathlib import Path

SD = Path(__file__).parent
PRICES = SD / "../../public/data/avito-prices.json"
OVERRIDES = SD / "../../public/data/price-overrides.json"


def main():
    if not PRICES.exists():
        print("нет avito-prices.json")
        return
    try:
        ov_raw = json.load(open(OVERRIDES, encoding="utf-8")) if OVERRIDES.exists() else {}
    except Exception as e:
        print(f"оверрайды не прочитаны: {e}")
        return
    ov = {str(k).lower(): v for k, v in ov_raw.items() if isinstance(v, dict)}

    data = json.load(open(PRICES, encoding="utf-8"))
    changed = 0
    for s in data.get("stats", []):
        key = f"{str(s.get('model_name', '')).lower()}|{int(s.get('ram', 0))}|{int(s.get('ssd', 0))}"
        o = ov.get(key)
        if not o:
            continue
        if o.get("median"):
            s["median_price"] = int(o["median"])
        s["buyout_price"] = (int(o["buyout"]) if o.get("buyout")
                             else max(0, int(s["median_price"] * 0.80 // 1000 * 1000)))
        s["manual_override"] = True   # ручная цифра не «протухает» для сканера
        changed += 1
        print(f"  ✓ {key} → median {s['median_price']}, buyout {s['buyout_price']}")

    with open(PRICES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Применено оверрайдов: {changed}")


if __name__ == "__main__":
    main()
