#!/usr/bin/env python3
"""
Парсер цен MacBook с Авито для BestMac.ru
Собирает данные о ценах и агрегирует статистику по моделям.

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
class MacModel:
    """Распознанная модель MacBook"""
    type: str  # "Air" | "Pro"
    year: Optional[int] = None
    cpu: Optional[str] = None  # "M1" | "M2" | "M3" | "M4" | "Intel"
    ram: Optional[int] = None  # GB
    ssd: Optional[int] = None  # GB
    screen: Optional[float] = None  # 13.3, 14, 15, 16


@dataclass
class PriceStats:
    """Статистика цен для модели"""
    model: str
    cpu: str
    year: int
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

# Модели для поиска
SEARCH_QUERIES = [
    "macbook air m1",
    "macbook air m2", 
    "macbook air m3",
    "macbook pro m1",
    "macbook pro m2",
    "macbook pro m3",
    "macbook pro m4",
    "macbook pro 14",
    "macbook pro 16",
]

# User-Agent для запросов
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]


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


def parse_model(title: str) -> Optional[MacModel]:
    """Распознать модель MacBook из заголовка"""
    title_lower = title.lower()
    
    # Определяем тип
    if 'air' in title_lower:
        mac_type = 'Air'
    elif 'pro' in title_lower:
        mac_type = 'Pro'
    else:
        return None
    
    model = MacModel(type=mac_type)
    
    # Определяем процессор
    cpu_patterns = [
        (r'm4\s*(pro|max)?', 'M4'),
        (r'm3\s*(pro|max)?', 'M3'),
        (r'm2\s*(pro|max)?', 'M2'),
        (r'm1\s*(pro|max)?', 'M1'),
        (r'intel|i[579]', 'Intel'),
    ]
    for pattern, cpu in cpu_patterns:
        if re.search(pattern, title_lower):
            model.cpu = cpu
            break
    
    # Год
    year_match = re.search(r'20(1[89]|2[0-5])', title)
    if year_match:
        model.year = int(year_match.group())
    
    # RAM
    ram_match = re.search(r'(\d{1,2})\s*(gb|гб)\s*(ram|озу|память)?', title_lower)
    if ram_match:
        ram = int(ram_match.group(1))
        if ram in [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]:
            model.ram = ram
    
    # SSD
    ssd_patterns = [
        (r'(\d{3,4})\s*(gb|гб)\s*(ssd)?', lambda m: int(m.group(1))),
        (r'(\d)\s*(tb|тб)', lambda m: int(m.group(1)) * 1024),
    ]
    for pattern, extractor in ssd_patterns:
        ssd_match = re.search(pattern, title_lower)
        if ssd_match:
            ssd = extractor(ssd_match)
            if ssd in [256, 512, 1024, 2048, 4096, 8192]:
                model.ssd = ssd
                break
    
    # Размер экрана
    screen_match = re.search(r'(13|14|15|16)["\']?[\s\-]?(дюйм)?', title_lower)
    if screen_match:
        model.screen = float(screen_match.group(1))
    
    return model


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
    }
    
    try:
        response = requests.get(base_url, params=params, headers=headers, timeout=10)
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


def aggregate_prices(listings: list[AvitoListing]) -> list[PriceStats]:
    """Агрегировать цены по моделям"""
    # Группируем по ключевым параметрам
    groups: dict[tuple, list[int]] = {}
    
    for listing in listings:
        model = parse_model(listing.title)
        if not model or not model.cpu:
            continue
        
        # Ключ группировки
        key = (
            f"MacBook {model.type}",
            model.cpu,
            model.year or 2023,  # дефолтный год
            model.ram or 8,  # дефолтный RAM
            model.ssd or 256,  # дефолтный SSD
            listing.region,
        )
        
        if key not in groups:
            groups[key] = []
        groups[key].append(listing.price)
    
    # Рассчитываем статистику
    stats = []
    for key, prices in groups.items():
        if len(prices) < 3:  # минимум 3 объявления
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
            model=key[0],
            cpu=key[1],
            year=key[2],
            ram=key[3],
            ssd=key[4],
            region=key[5],
            median_price=median,
            min_price=min(clean_prices),
            max_price=max(clean_prices),
            buyout_price=buyout,
            samples_count=len(prices),
            updated_at=datetime.now().isoformat(),
        ))
    
    return stats


def run_parser(output_path: str, max_pages: int = 3):
    """Запустить парсер"""
    print(f"Запуск парсера Авито...")
    print(f"Регионы: {list(REGIONS.values())}")
    print(f"Запросы: {SEARCH_QUERIES}")
    
    all_listings = []
    
    for region_key, region_name in REGIONS.items():
        print(f"\n📍 Регион: {region_name}")
        
        for query in SEARCH_QUERIES:
            print(f"  🔍 {query}...", end=" ")
            
            query_listings = []
            for page in range(1, max_pages + 1):
                listings = fetch_avito_page(query, region_key, page)
                query_listings.extend(listings)
                
                if not listings:
                    break
                
                # Пауза между запросами
                time.sleep(random.uniform(2, 5))
            
            print(f"найдено {len(query_listings)} объявлений")
            all_listings.extend(query_listings)
    
    print(f"\n📊 Всего объявлений: {len(all_listings)}")
    
    # Агрегируем
    stats = aggregate_prices(all_listings)
    print(f"📈 Агрегированных моделей: {len(stats)}")
    
    # Сохраняем
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    
    result = {
        "generated_at": datetime.now().isoformat(),
        "total_listings": len(all_listings),
        "stats": [asdict(s) for s in stats],
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
        default=3,
        help="Максимум страниц для каждого запроса"
    )
    
    args = parser.parse_args()
    run_parser(args.output, args.pages)
