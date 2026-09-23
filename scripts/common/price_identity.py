"""
Идентичность строк базы цен avito-prices.json (GST-77, docs/price-identity-GST-77.md).

Строка базы описывает конфигурацию, но поле model_name ненадёжно: парсер в режиме
discovery пишет туда подпись вкладки поиска («Mac Studio m1» при процессоре M4 Max),
а синк коллектора теряет уровень чипа в processor («Apple M4» у «Mac mini M4 Pro»).
Модуль даёт одну идентичность на строку и каноническую запись — ими пользуются
писатели (парсер, синк), читатели (сканер, синк) и разовая миграция.

Чистая логика: ни файлов, ни сети в сигнатурах.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Iterable, Optional, Tuple

from common.classifier import classify

# (family, chip_gen, chip_tier, screen, ram, ssd) — тот же кортеж, что live_key сканера.
Key = Tuple[Optional[str], Optional[str], str, Optional[int], int, int]

# Семейства, где парсер работает в режиме discovery и пишет в model_name подпись
# вкладки. Их имя всегда синтезируется из идентичности.
DISCOVERY_FAMILIES = frozenset({"Mac mini", "Mac Studio", "iMac"})

FRESH_DAYS = 30
MIN_SAMPLES = 5
_DATE_FORMATS = ("%Y-%m-%d %H:%M", "%a %b %d %H:%M:%S %Y")


def config_key(cfg) -> Key:
    """Ключ «такой же аппарат». Единственное определение: live_key сканера зовёт его."""
    return (cfg.family, cfg.chip_gen, cfg.chip_tier, cfg.screen, cfg.ram, cfg.ssd)


def row_identity(row: dict) -> Optional[Key]:
    """Конфигурация строки по правилу «самый конкретный непротиворечивый источник».

    Классификатор зовётся дважды: имя первым (a) и процессор первым (b). Поколение
    при конфликте берём из процессора (у строк парсера имя — подпись вкладки),
    уровень Pro/Max/Ultra — откуда он есть (у строк синка он живёт только в имени).
    Сводки с памятью или диском 0 — не конфигурации: у них идентичности нет.
    """
    ram, ssd = int(row.get("ram") or 0), int(row.get("ssd") or 0)
    if not ram or not ssd:
        return None
    name = row.get("model_name") or ""
    proc = row.get("processor") or ""
    specs = {"ram": ram, "ssd": ssd}
    a = classify(f"{name} {proc}", specs)
    b = classify(f"{proc} {name}", specs)
    if not a.is_valid and not b.is_valid:
        return None
    if not b.is_valid:
        return config_key(a)
    if not a.is_valid:
        return config_key(b)
    ka, kb = config_key(a), config_key(b)
    if ka == kb:
        return ka
    if a.chip_gen != b.chip_gen:
        return kb
    if a.chip_tier == "base":
        return kb
    if b.chip_tier == "base":
        return ka
    return kb


def chip_label(key: Key) -> str:
    gen, tier = key[1], key[2]
    return gen if tier == "base" else f"{gen} {tier}"


def canonical_processor(key: Key) -> str:
    """Процессор с уровнем чипа. Intel пишется как есть — «Apple Intel» не бывает."""
    return "Intel" if key[1] == "Intel" else f"Apple {chip_label(key)}"


def synth_name(key: Key) -> str:
    family, screen = key[0], key[3]
    return f"{family} {screen} {chip_label(key)}" if screen else f"{family} {chip_label(key)}"


def build_catalog(parser_config: dict) -> dict:
    """Идентичность → имя модели из таблицы парсера.

    Только вкладки в режиме direct: там model — настоящее название модели.
    У discovery-вкладок model — подпись поиска («mac mini m1»), каноном её делать нельзя.
    """
    catalog: dict = {}
    for tab in (parser_config.get("tabs") or {}).values():
        if tab.get("mode") != "direct":
            continue
        for e in tab.get("entries") or []:
            key = row_identity({"model_name": e.get("model"), "processor": e.get("processor"),
                                "ram": e.get("ram"), "ssd": e.get("ssd")})
            if key is not None:
                catalog.setdefault(key, e["model"])
    return catalog


def canonicalize_row(row: dict, catalog: dict) -> dict:
    """Копия строки с каноническим именем и процессором. Сводки возвращаются как есть.

    Имя: из каталога, если модель в нём есть; для discovery-семейств — синтезированное;
    иначе (MacBook вне каталога) — прежнее: имена MacBook по году не трогаем.
    """
    out = dict(row)
    key = row_identity(row)
    if key is None:
        return out
    out["processor"] = canonical_processor(key)
    if key in catalog:
        out["model_name"] = catalog[key]
    elif key[0] in DISCOVERY_FAMILIES:
        out["model_name"] = synth_name(key)
    return out


def age_days(updated_at, now: datetime) -> Optional[int]:
    for fmt in _DATE_FORMATS:
        try:
            return (now - datetime.strptime(str(updated_at), fmt)).days
        except ValueError:
            continue
    return None


def pick_winner(rows: Iterable[dict], now: datetime) -> dict:
    """Какую из строк одной идентичности оставить. Приоритет из спеки:
    ручной оверрайд → свежая с выборкой → больше выборка → новее."""
    def rank(r):
        age = age_days(r.get("updated_at"), now)
        n = int(r.get("samples_count") or 0)
        fresh = age is not None and age <= FRESH_DAYS and n >= MIN_SAMPLES
        return (bool(r.get("manual_override")), fresh, n, -(age if age is not None else 10 ** 6))
    return max(rows, key=rank)


def model_to_slug(name: str) -> str:
    """Порт modelToSlug из src/lib/model-slugs.ts: адрес страницы /ceny/<slug>."""
    s = re.sub(r"[(),]", "", str(name).lower())
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")
