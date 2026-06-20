"""
Конфигурация продуктовых семейств Apple и валидных конфигураций.
Используется классификатором и билдером цен.
"""

# ─── Поисковые URL для каждого семейства ─────────────────────────────────────
# s=104 = сортировка по дате (новые сверху)
# Москва и МО

SCAN_FAMILIES = {
    "macbook_air": {
        "label": "MacBook Air",
        "url": "https://www.avito.ru/moskva_i_mo/noutbuki?q=macbook+air&s=104",
        "category": "noutbuki",
    },
    "macbook_pro": {
        "label": "MacBook Pro",
        "url": "https://www.avito.ru/moskva_i_mo/noutbuki?context=H4sIAAAAAAAA_wEmANn_YToxOntzOjE6InkiO3M6MTY6ImU2SWZYa3NOZmtHWFVUU28iO33P3cofJgAAAA&f=ASgCAQICAUDW8g70EMahxRWu3sQVyp~2Fb6xnhWq45cVxJmWFbbY7xHY2O8RptjvEZa66xHiuesR~u3tEPzu7RCMpMMV_LjrEdC4Ew&localPriority=0&q=macbook+pro&s=104",
        "category": "noutbuki",
    },
    "imac": {
        "label": "iMac",
        "url": "https://www.avito.ru/moskva_i_mo/nastolnye_kompyutery/monobloki-ASgBAgICAUS02xKOqY0D?cd=1&context=H4sIAAAAAAAA_wEmANn_YToxOntzOjE6InkiO3M6MTY6IlcwZ1dNU0RBSFZuTlZsV0siO30Cm7dZJgAAAA&localPriority=0&q=imac&s=104",
        "category": "nastolnye_kompyutery",
    },
    "mac_mini": {
        "label": "Mac mini",
        "url": "https://www.avito.ru/moskva_i_mo/nastolnye_kompyutery?q=mac+mini&s=104",
        "category": "nastolnye_kompyutery",
    },
    "mac_studio": {
        "label": "Mac Studio",
        "url": "https://www.avito.ru/moskva_i_mo/nastolnye_kompyutery?q=mac+studio&s=104",
        "category": "nastolnye_kompyutery",
    },
}

# ─── Минимальные годы выкупа ─────────────────────────────────────────────────
MIN_YEARS = {
    "MacBook Air": 2020,    # M1 = 2020
    "MacBook Pro": 2020,    # M1 = 2020
    "Mac mini": 2020,       # M1 = 2020
    "iMac": 2017,
    "Mac Studio": 2022,     # первый Mac Studio
}

# ─── Валидные значения RAM и SSD ─────────────────────────────────────────────
VALID_RAM = {8, 16, 18, 24, 32, 36, 48, 64, 96, 128, 192}
VALID_SSD = {256, 512, 1024, 2048, 4096, 8192}

# ─── Ценовой диапазон (отсеиваем мусор) ─────────────────────────────────────
MIN_PRICE = 15_000
MAX_PRICE = 900_000

# ─── Стоп-слова (мусорные объявления) ────────────────────────────────────────
JUNK_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'матриц', 'дефект', 'аккаунт',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход', 'не включается', 'трещин',
]

# ─── Ключевые слова срочности / торга ────────────────────────────────────────
URGENT_KEYWORDS = [
    'срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро',
    'дисконт', 'возможен торг', 'отдам за', 'снижу', 'договоримся',
]

# ─── Маркеры Москвы (для определения доставки) ──────────────────────────────
MOSCOW_MARKERS = ['москва', 'moscow', 'мск', 'московская обл', 'московская область']

# ─── Не выкупаем: MacBook на Intel (берём только Apple Silicon M1+) ──────────
# iMac на Intel 2017+ допустим — он отсекается только по году (MIN_YEARS["iMac"]).
EXCLUDE_INTEL_FAMILIES = {"MacBook Air", "MacBook Pro", "MacBook"}

# ─── Порог цены для скоринга ─────────────────────────────────────────────────
PRICE_THRESHOLD_FACTOR = 1.20

# ─── Параметры детектора «ниже рынка» по ЖИВОЙ выборке (scanner v2) ───────────
import os as _os


def _envf(name, default):
    try:
        return float(_os.environ.get(name, default))
    except (TypeError, ValueError):
        return float(default)


def _envi(name, default):
    try:
        return int(_os.environ.get(name, default))
    except (TypeError, ValueError):
        return int(default)


# Сколько страниц выдачи грузить на семейство, чтобы собрать живой рынок.
# Чем больше — тем надёжнее медиана, но дольше скан и выше риск капчи.
SCAN_PAGES_PER_FAMILY = _envi("SCAN_PAGES_PER_FAMILY", 3)

# Минимум живых сопоставимых лотов, чтобы доверять медиане для алерта в реалтайме.
# При меньшем числе — максимум в дайджест (низкая уверенность).
MIN_COMPS = _envi("MIN_COMPS", 6)

# Запас маржи: насколько ниже медианы рынка должна быть цена, чтобы считаться сделкой.
# Для перекупа нужен зазор под перепродажу (по умолчанию 8%).
MIN_MARGIN = _envf("MIN_MARGIN", 0.08)

# Граница «слишком дёшево»: ниже scam_floor * median без чистого состояния —
# почти всегда скрытый дефект/подмена цены/скам. Не алертим как 🔥.
SCAM_FLOOR = _envf("SCAM_FLOOR", 0.55)

# Целевая выкупная цена = BUYOUT_FACTOR * живая медиана (если нет курируемой).
BUYOUT_FACTOR = _envf("BUYOUT_FACTOR", 0.80)

# Пороги состояния (передаются в condition.analyze_condition).
BATTERY_HARD = _envi("BATTERY_HARD", 80)   # < этого % здоровья АКБ → reject
BATTERY_SOFT = _envi("BATTERY_SOFT", 85)   # ниже → suspect
CYCLES_HARD = _envi("CYCLES_HARD", 1000)   # > → reject
CYCLES_SOFT = _envi("CYCLES_SOFT", 500)    # > → suspect

# ─── Дохлый-выключатель: контроль свежести базы цен ──────────────────────────
# Если avito-prices.json не обновлялся дольше STALE_PRICES_HOURS — бот шлёт
# предупреждение в Telegram (парсер встал). Кулдаун — чтобы не спамить (сканер
# крутится каждые 15 мин).
STALE_PRICES_HOURS = _envi("STALE_PRICES_HOURS", 36)
STALE_ALERT_COOLDOWN_HOURS = _envi("STALE_ALERT_COOLDOWN_HOURS", 12)

# ─── URL для Price Builder v2 ────────────────────────────────────────────────
# Каждый URL — отдельная категория с фильтрами Авито.
# Пользователь настраивает фильтры на Авито и вставляет URL сюда.
# s=104 = сортировка по дате.

BUILDER_URLS = [
    {
        "label": "MacBook (Air + Pro)",
        "url": "https://www.avito.ru/all/noutbuki/apple/b_u-ASgBAgICAkTwvA2I0jSo5A302WY?f=ASgBAQICAkTwvA2I0jSo5A302WYBQKDkDfQWgPPEFYLzxBXCocUVsqnFFarexBWm45cV9LnrEba46xGy3sQVxp~2FcCZlhXYuesRuLjrEb656xGQuOsR3MKmFaiS_hTowqYVppL~FKa56xHyuOsRzrfrEQ&q=macbook&s=104",
    },
    # Добавьте URL для настольных (iMac, Mac mini, Mac Studio) когда будут готовы:
    # {
    #     "label": "Настольные (iMac, Mac mini, Mac Studio)",
    #     "url": "https://www.avito.ru/all/nastolnye_kompyutery/apple/b_u-...&s=104",
    # },
]
