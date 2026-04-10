"""
Универсальный классификатор Apple-продуктов из текста объявления Авито.

Вход:  title (+ опционально specs dict из deep_analyze)
Выход: AppleConfig dataclass с family, screen, chip_gen, chip_tier, ram, ssd

Примеры:
  "MacBook Air 13 M4 16/512"               → (MacBook Air, 13, M4, base, 16, 512)
  "Apple MacBook Pro 16 M4 Pro 48/512Gb"   → (MacBook Pro, 16, M4, Pro, 48, 512)
  "iMac 24 M4 16/256"                      → (iMac, 24, M4, base, 16, 256)
  "Mac Studio M4 Max 128/2TB"              → (Mac Studio, None, M4, Max, 128, 2048)
  "Mac mini M4 Pro 24/512"                 → (Mac mini, None, M4, Pro, 24, 512)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple, Dict
from .config import VALID_RAM, VALID_SSD


@dataclass
class AppleConfig:
    family: Optional[str]       # "MacBook Air", "MacBook Pro", "iMac", "Mac Studio", "Mac mini"
    screen: Optional[int]       # 13, 14, 15, 16, 24, 27, None
    chip_gen: Optional[str]     # "M1", "M2", "M3", "M4", "M5", "Intel"
    chip_tier: str              # "base", "Pro", "Max", "Ultra"
    ram: int                    # 8, 16, 18, 24, ...
    ssd: int                    # 256, 512, 1024, ...
    year: Optional[int] = None  # 2020, 2021, ..., 2026

    @property
    def db_key(self) -> str:
        """Каноничный ключ для группировки в базе цен."""
        if not self.family or not self.chip_gen:
            return ""
        tier = f" {self.chip_tier}" if self.chip_tier != "base" else ""
        screen = f" {self.screen}" if self.screen else ""
        year = f" ({self.year})" if self.year else ""
        return f"{self.family}{screen} {self.chip_gen}{tier}{year}"

    @property
    def model_name(self) -> str:
        """Имя модели в формате avito-prices.json, напр. 'MacBook Air 13 (2024, M3)'."""
        if not self.family or not self.chip_gen:
            return ""
        tier = f" {self.chip_tier}" if self.chip_tier != "base" else ""
        screen = f" {self.screen}" if self.screen else ""
        year_str = str(self.year) if self.year else "?"
        return f"{self.family}{screen} ({year_str}, {self.chip_gen}{tier})"

    @property
    def is_valid(self) -> bool:
        return bool(self.family and self.chip_gen and self.ram > 0 and self.ssd > 0)


# ─── Паттерны семейств (порядок важен — более специфичные сначала) ────────────
_FAMILY_PATTERNS = [
    (re.compile(r'mac\s*studio', re.I),                    'Mac Studio'),
    (re.compile(r'mac\s*mini', re.I),                      'Mac mini'),
    (re.compile(r'mac\s*pro\b(?!.*book)', re.I),           'Mac Pro'),
    (re.compile(r'imac|аймак', re.I),                      'iMac'),
    (re.compile(r'macbook\s*pro|mbp|макбук\s*про', re.I),  'MacBook Pro'),
    (re.compile(r'macbook\s*air|mba|макбук\s*эйр', re.I),  'MacBook Air'),
    (re.compile(r'macbook|макбук', re.I),                   'MacBook'),  # ambiguous
]

# ─── Паттерн чипа ────────────────────────────────────────────────────────────
_CHIP_PATTERN = re.compile(
    r'\b(m[1-9])\s*(pro|max|ultra)?\b',
    re.I,
)

# ─── Паттерн Intel ───────────────────────────────────────────────────────────
_INTEL_PATTERN = re.compile(
    r'\b(i[3579]|intel|core)\b',
    re.I,
)

# ─── Паттерн экрана ──────────────────────────────────────────────────────────
# Исключаем совпадения с RAM/SSD: "16/512", "16gb", "16 gb"
_SCREEN_PATTERN = re.compile(
    r'\b(13|14|15|16|24|27)(?!\s*/\s*\d)(?!\s*(?:gb|гб))["\s\-]?\s*(?:inch|дюйм|"|\'\')?',
    re.I,
)

# ─── Паттерн года ────────────────────────────────────────────────────────────
_YEAR_PATTERN = re.compile(r'\b(20[12]\d)\b')

# ─── Паттерн RAM/SSD из слешевой записи: "16/512", "24/1TB" ─────────────────
_SLASH_SPEC = re.compile(
    r'\b(\d{1,3})\s*/\s*(\d{1,4})\s*(gb|гб|tb|тб)?\b',
    re.I,
)

# ─── Паттерн отдельных значений: "16GB", "512GB", "1TB" ─────────────────────
_UNIT_SPEC = re.compile(
    r'(\d{1,4})\s*(gb|гб|tb|тб)\b',
    re.I,
)


def _normalize_storage(val: int, unit: Optional[str]) -> int:
    """Конвертирует TB в GB."""
    if unit and unit.lower() in ('tb', 'тб'):
        return val * 1024
    return val


def _extract_specs_from_text(text: str) -> tuple[int, int]:
    """
    Извлекает RAM и SSD из текста.
    Приоритет: слешевая запись (16/512) > отдельные значения (16GB ... 512GB).
    Возвращает (ram, ssd). Если не найдено, (0, 0).
    """
    text_clean = text.lower().replace('\xa0', ' ')

    # Попытка 1: слешевая запись "16/512GB", "24/1TB"
    slash_match = _SLASH_SPEC.search(text_clean)
    if slash_match:
        left = int(slash_match.group(1))
        right = int(slash_match.group(2))
        unit = slash_match.group(3)
        right = _normalize_storage(right, unit)

        if left in VALID_RAM and right in VALID_SSD:
            return left, right
        # Может быть наоборот? Маловероятно, но проверим
        if right in VALID_RAM and left in VALID_SSD:
            return right, left

    # Попытка 2: пробельная запись без единиц: "16 256", "24 512", "8 1024"
    space_match = re.search(r'\b(\d{1,3})\s+(\d{3,4})\b', text_clean)
    if space_match:
        left = int(space_match.group(1))
        right = int(space_match.group(2))
        if left in VALID_RAM and right in VALID_SSD:
            return left, right

    # Попытка 3: отдельные значения с единицами
    found_values = []
    for m in _UNIT_SPEC.finditer(text_clean):
        val = int(m.group(1))
        unit = m.group(2)
        val = _normalize_storage(val, unit)
        # Пропускаем годы
        if 2015 <= val <= 2030:
            continue
        found_values.append(val)

    ram, ssd = 0, 0
    for val in found_values:
        if val in VALID_RAM and ram == 0:
            ram = val
        elif val in VALID_SSD and ssd == 0:
            ssd = val

    return ram, ssd


def _infer_year(family: Optional[str], chip_gen: Optional[str], chip_tier: str, screen: Optional[int]) -> Optional[int]:
    """Определяет год по чипу и семейству (если не указан явно)."""
    if not chip_gen:
        return None

    chip = chip_gen.upper()
    tier = chip_tier.lower()

    # MacBook Air
    if family == 'MacBook Air':
        mapping = {
            'M1': 2020, 'M2': 2022, 'M3': 2024, 'M4': 2025, 'M5': 2025,
        }
        year = mapping.get(chip)
        # Air 15" начался с M2 2023
        if screen == 15 and chip == 'M2':
            return 2023
        return year

    # MacBook Pro
    if family == 'MacBook Pro':
        if chip == 'M1':
            if tier in ('pro', 'max'):
                return 2021
            return 2020
        if chip == 'M2':
            if tier in ('pro', 'max'):
                return 2023
            return 2022
        mapping = {'M3': 2023, 'M4': 2024, 'M5': 2025}
        return mapping.get(chip)

    # Mac mini
    if family == 'Mac mini':
        mapping = {'M1': 2020, 'M2': 2023, 'M4': 2024, 'M5': 2025}
        return mapping.get(chip)

    # iMac
    if family == 'iMac':
        if chip == 'Intel' or not chip.startswith('M'):
            return None  # Может быть 2017-2020
        mapping = {'M1': 2021, 'M3': 2023, 'M4': 2024, 'M5': 2025}
        return mapping.get(chip)

    # Mac Studio
    if family == 'Mac Studio':
        mapping = {'M1': 2022, 'M2': 2023, 'M4': 2024, 'M5': 2025}
        return mapping.get(chip)

    return None


def _infer_screen(family: Optional[str], chip_gen: Optional[str], chip_tier: str) -> Optional[int]:
    """Определяет диагональ экрана, если не указана явно."""
    if family == 'iMac':
        if chip_gen and chip_gen.upper().startswith('M'):
            return 24
        return 27  # Pre-M1 iMacs are 27" (or 21.5", but 27 more common for trade-in)

    # Для MacBook без указания экрана — не угадываем (может быть 13 или 15/16)
    return None


def classify(title: str, specs: Optional[dict] = None) -> AppleConfig:
    """
    Классифицирует Apple-продукт из текста объявления.

    Args:
        title: Заголовок объявления (h1 или title из превью)
        specs: Опциональные спецификации из deep_analyze
               {"ram": int, "ssd": int, "model": str, "diagonal": float}
    """
    text = title.strip()
    text_lower = text.lower()

    # ── Семейство ────────────────────────────────────────────────────────────
    family = None
    for pattern, name in _FAMILY_PATTERNS:
        if pattern.search(text_lower):
            family = name
            break

    # "MacBook" без Air/Pro — попробуем определить по экрану
    if family == 'MacBook':
        # 13" после 2020 = Air, 14"/16" = Pro
        screen_m = _SCREEN_PATTERN.search(text_lower)
        if screen_m:
            s = int(screen_m.group(1))
            if s in (14, 16):
                family = 'MacBook Pro'
            elif s in (13, 15):
                family = 'MacBook Air'

    # ── Чип ──────────────────────────────────────────────────────────────────
    chip_gen = None
    chip_tier = 'base'

    chip_match = _CHIP_PATTERN.search(text)
    if chip_match:
        chip_gen = chip_match.group(1).upper()   # "M4"
        tier_raw = chip_match.group(2)
        if tier_raw:
            chip_tier = tier_raw.capitalize()     # "Pro", "Max", "Ultra"
    elif _INTEL_PATTERN.search(text_lower):
        chip_gen = 'Intel'

    # ── Экран ────────────────────────────────────────────────────────────────
    # Mac mini и Mac Studio не имеют экрана
    screen = None
    if family not in ('Mac mini', 'Mac Studio', 'Mac Pro'):
        screen_match = _SCREEN_PATTERN.search(text)
        if screen_match:
            screen = int(screen_match.group(1))
        else:
            screen = _infer_screen(family, chip_gen, chip_tier)

    # ── Год ──────────────────────────────────────────────────────────────────
    year = None
    year_match = _YEAR_PATTERN.search(text)
    if year_match:
        year = int(year_match.group(1))
    else:
        year = _infer_year(family, chip_gen, chip_tier, screen)

    # ── RAM / SSD ────────────────────────────────────────────────────────────
    ram, ssd = _extract_specs_from_text(text)

    # Если specs из deep_analyze — приоритет
    if specs:
        if specs.get('ram') and specs['ram'] in VALID_RAM:
            ram = specs['ram']
        if specs.get('ssd') and specs['ssd'] in VALID_SSD:
            ssd = specs['ssd']

    return AppleConfig(
        family=family,
        screen=screen,
        chip_gen=chip_gen,
        chip_tier=chip_tier,
        ram=ram,
        ssd=ssd,
        year=year,
    )


def config_to_db_key(config: AppleConfig) -> Optional[Tuple[str, int, int]]:
    """
    Конвертирует AppleConfig в ключ для поиска в avito-prices.json.
    Возвращает (model_name_lower, ram, ssd) или None если невалидный.
    """
    if not config.is_valid:
        return None
    return (config.model_name.lower(), config.ram, config.ssd)
