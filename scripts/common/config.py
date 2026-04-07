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
        "url": "https://www.avito.ru/moskva_i_mo/noutbuki?q=macbook+pro&s=104",
        "category": "noutbuki",
    },
    "imac": {
        "label": "iMac",
        "url": "https://www.avito.ru/moskva_i_mo/nastolnye_kompyutery?q=imac&s=104",
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

# ─── Порог цены для скоринга ─────────────────────────────────────────────────
PRICE_THRESHOLD_FACTOR = 1.20

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
