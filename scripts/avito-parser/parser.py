#!/usr/bin/env python3
"""
Парсер цен MacBook с Авито для BestMac.ru
Собирает данные о ценах и агрегирует статистику по моделям.

Формат модели соответствует каталогу Авито:
  "MacBook Air 13 (2020, M1)"
  "MacBook Pro 14 (2023, M3 Pro)"

Использование:
  python parser.py --output ../public/data/avito-prices.json

Требования:
  pip install requests beautifulsoup4 lxml
"""

import argparse
import json
import re
import time
import random
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, asdict
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Установите зависимости: pip install requests beautifulsoup4 lxml")
    exit(1)


@dataclass
class AvitoListing:
    """Объявление с Авито"""
    title: str
    price: int
    url: str
    region: str
    published_date: Optional[str] = None


@dataclass
class ParsedMacbook:
    """Распознанная модель MacBook"""
    model_name: str  # "MacBook Air 13 (2020, M1)"
    screen_size: int  # 13, 14, 15, 16
    year: int
    cpu: str  # "M1", "M2", "M3 Pro", "M4 Max", etc.
    ram: Optional[int] = None  # GB
    ssd: Optional[int] = None  # GB


@dataclass
class PriceStats:
    """Статистика цен для модели"""
    model_name: str      # "MacBook Air 13 (2020, M1)" - формат каталога Авито
    ram: int
    ssd: int
    region: str
    median_price: int
    min_price: int
    max_price: int
    buyout_price: int
    samples_count: int
    updated_at: str


# Регионы для парсинга
REGIONS = {
    "moskva": "Москва",
    "moskovskaya_oblast": "Московская область",
    "sankt-peterburg": "Санкт-Петербург",
}

# Каталог моделей Авито - полный список для поиска
# Формат: (поисковый запрос, размер экрана, год, процессор или None для Pro без процессора)
AVITO_MODELS = [
    # MacBook Air 13"
    ("macbook air 13 m1 2020", 13, 2020, "M1"),
    ("macbook air 13 m2 2022", 13, 2022, "M2"),
    ("macbook air 13 m3 2024", 13, 2024, "M3"),
    ("macbook air 13 m4 2025", 13, 2025, "M4"),
    
    # MacBook Air 15"
    ("macbook air 15 m2 2023", 15, 2023, "M2"),
    ("macbook air 15 m3 2024", 15, 2024, "M3"),
    ("macbook air 15 m4 2025", 15, 2025, "M4"),
    
    # MacBook Pro 13"
    ("macbook pro 13 m1 2020", 13, 2020, "M1"),
    ("macbook pro 13 m2 2022", 13, 2022, "M2"),
    
    # MacBook Pro 14" - обобщенные запросы для всех процессоров
    ("macbook pro 14 2021", 14, 2021, None),
    ("macbook pro 14 2023", 14, 2023, None),
    ("macbook pro 14 2024", 14, 2024, None),
    ("macbook pro 14 2025", 14, 2025, None),
    
    # MacBook Pro 16" - обобщенные запросы для всех процессоров
    ("macbook pro 16 2021", 16, 2021, None),
    ("macbook pro 16 2023", 16, 2023, None),
    ("macbook pro 16 2024", 16, 2024, None),
]

# User-Agent для запросов
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]


def format_model_name(screen_size: int, year: int, cpu: Optional[str] = None, is_pro: bool = False) -> str:
    """Форматирует название модели в стиле каталога Авито"""
    model_type = "MacBook Pro" if is_pro else "MacBook Air"
    if cpu:
        return f"{model_type} {screen_size} ({year}, {cpu})"
    else:
        return f"{model_type} {screen_size} ({year})"


def parse_price(text: str) -> Optional[int]:
    """Извлечь цену из текста"""
    if not text:
        return None
    # Убираем все кроме цифр
    digits = re.sub(r'[^\d]', '', text)
    if digits:
        price = int(digits)
        # Фильтруем нереалистичные цены
        if 10000 <= price <= 500000:
            return price
    return None


def parse_ram(title: str) -> Optional[int]:
    """Извлечь RAM из заголовка"""
    title_lower = title.lower()
    ram_match = re.search(r'(\d{1,2})\s*(gb|гб)\s*(ram|озу|память)?', title_lower)
    if ram_match:
        ram = int(ram_match.group(1))
        if ram in [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]:
            return ram
    return None


def parse_ssd(title: str) -> Optional[int]:
    """Извлечь SSD из заголовка"""
    title_lower = title.lower()
    
    # Проверяем TB сначала (1tb, 2tb, 4tb, 8tb)
    tb_match = re.search(r'(\d)\s*(tb|тб)', title_lower)
    if tb_match:
        tb_value = int(tb_match.group(1))
        ssd_gb = tb_value * 1024
        if ssd_gb in [1024, 2048, 4096, 8192]:  # 1TB, 2TB, 4TB, 8TB
            return ssd_gb
    
    # Затем GB (256gb, 512gb)
    gb_match = re.search(r'(\d{3,4})\s*(gb|гб)\s*(ssd)?', title_lower)
    if gb_match:
        ssd = int(gb_match.group(1))
        if ssd in [256, 512]:  # только 256GB и 512GB
            return ssd
    
    return None


def fetch_avito_page(query: str, region: str, page: int = 1) -> list[AvitoListing]:
    """Получить страницу объявлений с Авито"""
    listings = []
    
    # Формируем URL
    base_url = f"https://www.avito.ru/{region}/noutbuki"
    params = {
        'q': query,
        'p': page,
    }
    
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
    }
    
    try:
        response = requests.get(base_url, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Ищем карточки объявлений
        items = soup.select('[data-marker="item"]')
        
        for item in items:
            try:
                # Заголовок
                title_elem = item.select_one('[itemprop="name"]')
                title = title_elem.get_text(strip=True) if title_elem else None
                
                # Цена
                price_elem = item.select_one('[itemprop="price"]')
                price = None
                if price_elem:
                    price_content = price_elem.get('content')
                    if price_content:
                        price = int(price_content)
                    else:
                        price = parse_price(price_elem.get_text())
                
                # Ссылка
                link_elem = item.select_one('a[itemprop="url"]')
                url = f"https://www.avito.ru{link_elem['href']}" if link_elem else None
                
                if title and price and url:
                    listings.append(AvitoListing(
                        title=title,
                        price=price,
                        url=url,
                        region=REGIONS.get(region, region),
                    ))
            except Exception as e:
                print(f"Ошибка парсинга карточки: {e}")
                continue
                
    except requests.RequestException as e:
        print(f"Ошибка запроса для {query} в {region}: {e}")
    
    return listings


def calculate_percentiles(prices: list[int], lower: float = 10, upper: float = 90) -> list[int]:
    """Отфильтровать выбросы по перцентилям"""
    if len(prices) < 5:
        return prices
    
    sorted_prices = sorted(prices)
    n = len(sorted_prices)
    lower_idx = int(n * lower / 100)
    upper_idx = int(n * upper / 100)
    
    return sorted_prices[lower_idx:upper_idx + 1]


def aggregate_prices(listings: list[AvitoListing], model_info: tuple) -> list[PriceStats]:
    """Агрегировать цены по RAM и SSD для конкретной модели"""
    query, screen_size, year, cpu = model_info
    is_pro = 'pro' in query.lower() and 'air' not in query.lower()
    # Для Pro без процессора передаем None, для Air - конкретный процессор
    model_name = format_model_name(screen_size, year, cpu, is_pro)
    
    # Группируем по RAM и SSD
    groups: dict[tuple, list[int]] = {}
    
    for listing in listings:
        ram = parse_ram(listing.title) or 8  # дефолт 8GB
        ssd = parse_ssd(listing.title) or 256  # дефолт 256GB
        
        key = (model_name, ram, ssd, listing.region)
        
        if key not in groups:
            groups[key] = []
        groups[key].append(listing.price)
    
    # Рассчитываем статистику
    stats = []
    for key, prices in groups.items():
        if len(prices) < 2:  # минимум 2 объявления
            continue
        
        # Очищаем выбросы
        clean_prices = calculate_percentiles(prices)
        if not clean_prices:
            continue
        
        # Медиана
        sorted_prices = sorted(clean_prices)
        n = len(sorted_prices)
        median = sorted_prices[n // 2] if n % 2 else (sorted_prices[n // 2 - 1] + sorted_prices[n // 2]) // 2
        
        # Цена выкупа (90% от медианы)
        buyout = int(median * 0.90)
        
        stats.append(PriceStats(
            model_name=key[0],
            ram=key[1],
            ssd=key[2],
            region=key[3],
            median_price=median,
            min_price=min(clean_prices),
            max_price=max(clean_prices),
            buyout_price=buyout,
            samples_count=len(prices),
            updated_at=datetime.now().isoformat(),
        ))
    
    return stats


def run_parser(output_path: str, max_pages: int = 2):
    """Запустить парсер"""
    print(f"🚀 Запуск парсера Авито...")
    print(f"📍 Регионы: {list(REGIONS.values())}")
    print(f"📱 Моделей в каталоге: {len(AVITO_MODELS)}")
    
    all_stats = []
    total_listings = 0
    
    for region_key, region_name in REGIONS.items():
        print(f"\n📍 Регион: {region_name}")
        
        for model_info in AVITO_MODELS:
            query = model_info[0]
            print(f"  🔍 {query}...", end=" ", flush=True)
            
            model_listings = []
            for page in range(1, max_pages + 1):
                listings = fetch_avito_page(query, region_key, page)
                model_listings.extend(listings)
                
                if not listings:
                    break
                
                # Пауза между запросами (3-7 сек чтобы не забанили)
                time.sleep(random.uniform(3, 7))
            
            if model_listings:
                stats = aggregate_prices(model_listings, model_info)
                all_stats.extend(stats)
                total_listings += len(model_listings)
                print(f"найдено {len(model_listings)} → {len(stats)} групп")
            else:
                print("0")
    
    print(f"\n📊 Всего объявлений: {total_listings}")
    print(f"📈 Агрегированных записей: {len(all_stats)}")
    
    # Сохраняем
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    
    result = {
        "generated_at": datetime.now().isoformat(),
        "total_listings": total_listings,
        "models": sorted(list(set(s.model_name for s in all_stats))),  # только модели с реальными данными из stats
        "stats": [asdict(s) for s in all_stats],
    }
    
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Сохранено в {output_path}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Парсер цен MacBook с Авито")
    parser.add_argument(
        "--output", 
        default="public/data/avito-prices.json",
        help="Путь для сохранения JSON"
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=2,
        help="Максимум страниц для каждого запроса"
    )
    
    args = parser.parse_args()
    run_parser(args.output, args.pages)
