"""
Движок оценки выкупа для quote-бота (чистый, без сети — тестируется офлайн).

Источник базовой цены (что платим продавцу за грейд A):
  1) buyout.json — курируемые basePrice (приоритет; пока только MacBook), ИЛИ
  2) avito-prices.json — buyout_price по конфигу (все семейства, обновляется парсером).

Поправки к состоянию — порт src/config/buyout-adjustments.ts (один в один с сайтом),
чтобы оценка в боте совпадала с оценкой на витрине.

Меню (семейства/модели/RAM/SSD) строятся из avito-prices.json — это широкое покрытие.
"""

from __future__ import annotations

import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List

# ─── Поправки (= src/config/buyout-adjustments.ts) ───────────────────────────
CONDITION_MULT = {"A": 1.0, "B": 0.9, "C": 0.8}
CYCLE_THRESHOLDS = [200, 400, 600]
CYCLE_PENALTIES = [0, 2000, 5000, 9000]
DISPLAY_DEFECT_PCT = 0.15
BODY_DEFECT_PCT = 0.07
NO_CHARGER_PENALTY = 1500
NO_BOX_PENALTY = 500
ICLOUD_BLOCKED_ZERO = True
SPREAD_PCT = 0.05

FAMILIES = ["MacBook Air", "MacBook Pro", "iMac", "Mac mini", "Mac Studio", "Mac Pro"]

CONDITION_LABELS = {
    "A": "A — как новый (без следов)",
    "B": "B — лёгкие следы эксплуатации",
    "C": "C — заметный износ",
}


def _family_of(model_name: str) -> str:
    for f in FAMILIES:
        if model_name.startswith(f):
            return f
    return "Прочее"


@dataclass
class Catalog:
    # (model_name, ram, ssd) -> base price (грейд A)
    base: dict
    # для меню: model_name -> set of (ram, ssd)
    configs: dict
    families: dict   # family -> sorted [model_name]

    def models(self, family: str) -> List[str]:
        return self.families.get(family, [])

    def rams(self, model: str) -> List[int]:
        return sorted({ram for (ram, ssd) in self.configs.get(model, set())})

    def storages(self, model: str, ram: int) -> List[int]:
        return sorted({ssd for (r, ssd) in self.configs.get(model, set()) if r == ram})

    def base_price(self, model: str, ram: int, ssd: int) -> int:
        return int(self.base.get((model, int(ram), int(ssd)), 0))


def load_catalog(prices_path: str, buyout_path: Optional[str] = None) -> Catalog:
    base, configs, families = {}, {}, {}

    # 1) avito-prices.json — широкое покрытие + buyout_price
    p = Path(prices_path)
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        for s in data.get("stats", []):
            try:
                model = str(s["model_name"]); ram = int(s["ram"]); ssd = int(s["ssd"])
            except (KeyError, ValueError, TypeError):
                continue
            if ram <= 0 or ssd <= 0:
                continue
            bo = int(s.get("buyout_price") or 0)
            if bo <= 0:
                bo = int(int(s.get("median_price", 0)) * 0.80)
            if bo <= 0:
                continue
            base[(model, ram, ssd)] = bo
            configs.setdefault(model, set()).add((ram, ssd))

    # 2) buyout.json — курируемые цены в приоритете (перекрывают avito)
    if buyout_path and Path(buyout_path).exists():
        for r in json.loads(Path(buyout_path).read_text(encoding="utf-8")):
            try:
                model = str(r["model"]); ram = int(r["ram"]); ssd = int(r["storage"])
                price = int(r["basePrice"])
            except (KeyError, ValueError, TypeError):
                continue
            if price <= 0:
                continue
            base[(model, ram, ssd)] = price            # приоритет курируемой
            configs.setdefault(model, set()).add((ram, ssd))

    for model in configs:
        families.setdefault(_family_of(model), []).append(model)
    for f in families:
        families[f] = sorted(set(families[f]))

    return Catalog(base=base, configs=configs, families=families)


@dataclass
class Quote:
    base: int          # грейд A
    low: int           # нижняя граница предложения
    high: int          # верхняя граница предложения
    found: bool

    def vilka(self) -> str:
        if not self.found or self.base <= 0:
            return "цену уточнит оценщик"
        if self.low <= 0 and self.high <= 0:
            return "0 ₽ (см. условие)"
        return f"{self.low:,}–{self.high:,} ₽".replace(",", " ")


def estimate(catalog: Catalog, model: str, ram: int, ssd: int, *,
             condition: str = "A", cycles: int = 0,
             display_defect: bool = False, body_defect: bool = False,
             has_charger: bool = True, has_box: bool = True,
             icloud_blocked: bool = False) -> Quote:
    """Порт estimatePrice() из api/util/estimate.ts на каталог бота."""
    base = catalog.base_price(model, ram, ssd)
    if base <= 0:
        return Quote(0, 0, 0, found=False)

    if icloud_blocked and ICLOUD_BLOCKED_ZERO:
        return Quote(base, 0, 0, found=True)

    price = base * CONDITION_MULT.get(condition, 1.0)

    # штраф за циклы: первый порог, который cycles НЕ достиг
    idx = next((i for i, t in enumerate(CYCLE_THRESHOLDS) if cycles < t), -1)
    penalty = CYCLE_PENALTIES[-1] if idx == -1 else CYCLE_PENALTIES[idx]
    price -= penalty

    if display_defect:
        price -= base * DISPLAY_DEFECT_PCT
    if body_defect:
        price -= base * BODY_DEFECT_PCT
    if not has_charger:
        price -= NO_CHARGER_PENALTY
    if not has_box:
        price -= NO_BOX_PENALTY

    spread = price * SPREAD_PCT
    low = max(0, round(price - spread))
    high = max(0, round(price + spread))
    return Quote(base=base, low=low, high=high, found=True)
