#!/usr/bin/env python3
"""
Парсер цен MacBook с Авито для BestMac.ru

Использует таблицу URL из avito-urls.json для парсинга конкретных конфигураций.
Каждая строка = модель + RAM + SSD + готовая ссылка на поиск Avito с фильтрами.

Формат модели: "MacBook Pro 14 (2021, M1 Pro)"

Использование:
  python parser.py

Требования:
  pip install requests beautifulsoup4 lxml
"""

import json
import re
import time
import random
import statistics
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Установите зависимости: pip install requests beautifulsoup4 lxml")
    exit(1)


# Пути к файлам
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"


@dataclass
class PriceStat:
    """Статистика цен для конкретной конфигурации"""
    model_name: str      # "MacBook Pro 14 (2021, M1 Pro)"
    processor: str       # "Apple M1", "Apple M1 Pro"
    ram: int             # GB
    ssd: int             # GB
    median_price: int
    min_price: int
    max_price: int
    buyout_price: int
    samples_count: int
    updated_at: str


# User-Agent для запросов
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def load_urls_config() -> dict:
    """Загрузить таблицу URL для парсинга"""
    if not URLS_FILE.exists():
        print(f"❌ Файл {URLS_FILE} не найден!")
        return {"entries": []}
    
    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_price(price_text: str) -> Optional[int]:
    """Извлечь цену из текста"""
    if not price_text:
        return None
    
    # Удаляем все кроме цифр
    digits = re.sub(r'[^\d]', '', price_text)
    if not digits:
        return None
    
    price = int(digits)
    
    # Фильтруем нереалистичные цены для MacBook
    if price < 20000 or price > 700000:
        return None
    
    return price


def parse_avito_page(url: str, page: int = 1) -> list[int]:
    """Спарсить одну страницу Avito и вернуть список цен"""
    prices = []
    
    # Добавляем номер страницы к URL
    page_url = url
    if page > 1:
        separator = '&' if '?' in url else '?'
        page_url = f"{url}{separator}p={page}"
    
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
    }
    
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            # Случайная задержка между запросами
            time.sleep(random.uniform(2.0, 4.0))
            
            response = requests.get(page_url, headers=headers, timeout=30)
            
            # Если 429 (Too Many Requests), ждем и повторяем
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (attempt + 2)
                    print(f"    ⏳ 429 ошибка, ждем {wait_time} сек...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"    ⚠️ 429 после {max_retries} попыток")
                    return prices
            
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Ищем карточки объявлений
            items = soup.select('[data-marker="item"]')
            
            if not items:
                # Альтернативный селектор
                items = soup.select('.iva-item-root')
            
            for item in items:
                try:
                    # Ищем цену в itemprop="price"
                    price_elem = item.select_one('[itemprop="price"]')
                    price = None
                    
                    if price_elem:
                        # Сначала пробуем content атрибут
                        price_content = price_elem.get('content')
                        if price_content:
                            try:
                                price = int(float(price_content))
                            except ValueError:
                                pass
                        
                        # Если не получилось, парсим текст
                        if not price:
                            price = extract_price(price_elem.get_text())
                    
                    # Альтернативные селекторы
                    if not price:
                        alt_price = item.select_one('[data-marker="item-price"]')
                        if alt_price:
                            price = extract_price(alt_price.get_text())
                    
                    if price:
                        prices.append(price)
                        
                except Exception:
                    continue
            
            # Успешно - выходим из цикла повторов
            break
            
        except requests.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (attempt + 1)
                print(f"    ⏳ Ошибка сети, ждем {wait_time} сек...")
                time.sleep(wait_time)
            else:
                print(f"    ⚠️ Ошибка: {e}")
    
    return prices


def parse_entry(entry: dict, pages_count: int = 3) -> Optional[PriceStat]:
    """Спарсить одну конфигурацию из таблицы"""
    model_name = entry.get("model_name", "")
    processor = entry.get("processor", "")
    ram = entry.get("ram", 0)
    ssd = entry.get("ssd", 0)
    url = entry.get("url", "")
    
    if not url:
        print(f"  ⚠️ Пропуск {model_name} - нет URL")
        return None
    
    print(f"\n🔍 {model_name} | {processor} | {ram}GB RAM | {ssd}GB SSD")
    
    all_prices = []
    
    # Парсим несколько страниц
    for page in range(1, pages_count + 1):
        print(f"    📄 Страница {page}...", end=" ", flush=True)
        page_prices = parse_avito_page(url, page)
        print(f"найдено {len(page_prices)} цен")
        all_prices.extend(page_prices)
        
        # Если на странице мало объявлений, прекращаем
        if len(page_prices) < 10:
            break
    
    if len(all_prices) < 2:
        print(f"  ❌ Недостаточно данных ({len(all_prices)} объявлений)")
        return None
    
    # Фильтруем выбросы по перцентилям (P10-P90)
    all_prices.sort()
    n = len(all_prices)
    
    if n >= 5:
        p10_idx = int(n * 0.10)
        p90_idx = int(n * 0.90)
        filtered_prices = all_prices[p10_idx:p90_idx + 1]
    else:
        filtered_prices = all_prices
    
    if not filtered_prices:
        filtered_prices = all_prices
    
    # Расчет статистики
    median_price = int(statistics.median(filtered_prices))
    min_price = min(filtered_prices)
    max_price = max(filtered_prices)
    buyout_price = int(median_price * 0.90)  # 90% от медианы
    
    print(f"  ✅ Собрано {len(all_prices)} цен | Медиана: {median_price:,} ₽ | Выкуп: {buyout_price:,} ₽")
    
    return PriceStat(
        model_name=model_name,
        processor=processor,
        ram=ram,
        ssd=ssd,
        median_price=median_price,
        min_price=min_price,
        max_price=max_price,
        buyout_price=buyout_price,
        samples_count=len(all_prices),
        updated_at=datetime.now().isoformat()
    )


def main():
    """Главная функция парсера"""
    print("=" * 70)
    print("🚀 Парсер цен MacBook с Авито (на основе таблицы URL)")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Загружаем таблицу URL
    config = load_urls_config()
    entries = config.get("entries", [])
    
    if not entries:
        print("\n❌ Нет записей для парсинга!")
        print(f"   Добавьте конфигурации в файл: {URLS_FILE}")
        
        # Создаем пустой результат
        result = {
            "generated_at": datetime.now().isoformat(),
            "total_listings": 0,
            "models": [],
            "stats": []
        }
        
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        return
    
    print(f"\n📋 Найдено {len(entries)} конфигураций для парсинга")
    
    # Парсим каждую конфигурацию
    stats = []
    total_listings = 0
    
    for i, entry in enumerate(entries, 1):
        print(f"\n[{i}/{len(entries)}]", end="")
        stat = parse_entry(entry, pages_count=3)
        if stat:
            stats.append(asdict(stat))
            total_listings += stat.samples_count
    
    # Формируем уникальные модели
    unique_models = sorted(set(s["model_name"] for s in stats))
    
    # Сохраняем результат
    result = {
        "generated_at": datetime.now().isoformat(),
        "total_listings": total_listings,
        "models": unique_models,
        "stats": stats
    }
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 70)
    print(f"✅ Готово!")
    print(f"   📊 Обработано конфигураций: {len(stats)}/{len(entries)}")
    print(f"   📈 Всего объявлений: {total_listings:,}")
    print(f"   🏷️ Уникальных моделей: {len(unique_models)}")
    print(f"   💾 Сохранено в: {OUTPUT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    main()
