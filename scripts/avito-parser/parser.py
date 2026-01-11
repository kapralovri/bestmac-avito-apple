#!/usr/bin/env python3
"""
Парсер цен MacBook с Авито для BestMac.ru

Использует таблицу URL из avito-urls.json для парсинга конкретных конфигураций.
Каждая строка = модель + RAM + SSD + готовая ссылка на поиск Avito с фильтрами.

Формат модели: "MacBook Pro 14 (2021, M1 Pro)"

Использование:
  python parser.py [pages]  # pages = кол-во страниц (по умолчанию 2)

Требования:
  pip install requests beautifulsoup4 lxml
"""

import json
import os
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

# Настройки парсера для обхода rate limiting
# Задержка между запросами страниц (секунды)
PAGE_DELAY_MIN = 8.0
PAGE_DELAY_MAX = 15.0

# Задержка между конфигурациями (секунды) - важно для избежания 429!
CONFIG_DELAY_MIN = 30.0
CONFIG_DELAY_MAX = 60.0

# Количество страниц по умолчанию (2 достаточно для ~100 объявлений)
DEFAULT_PAGES = 2


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


# User-Agent для запросов (разные браузеры)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


AVITO_HOME_URL = "https://www.avito.ru/"

# Используем одну сессию на весь запуск (cookies + keep-alive)
SESSION = requests.Session()
SESSION.headers.update({
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Upgrade-Insecure-Requests": "1",
})


def warm_up_avito() -> bool:
    """Прогреть сессию: получить базовые cookies с главной.

    Если GitHub Actions IP заблокирован, часто 429 приходит уже тут.
    """
    try:
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": AVITO_HOME_URL,
        }
        resp = SESSION.get(AVITO_HOME_URL, headers=headers, timeout=30)
        if resp.status_code == 429:
            print("\n❌ Avito вернул 429 даже на главной странице — похоже, IP среды выполнения ограничен.")
            return False
        return True
    except requests.RequestException as e:
        print(f"\n⚠️ Не удалось прогреть сессию Avito: {e}")
        # Не блокируем запуск полностью из-за сетевой ошибки
        return True


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
    
    max_retries = 3
    base_retry_delay = 15  # базовая задержка при 429
    retry_delay_cap = 90   # верхний предел ожидания, чтобы не "висеть" десятки минут
    
    for attempt in range(max_retries):
        try:
            # Задержка перед запросом (важно!)
            delay = random.uniform(PAGE_DELAY_MIN, PAGE_DELAY_MAX)
            print(f"⏳ Ждём {delay:.1f}с...", end=" ", flush=True)
            time.sleep(delay)

            # Заголовки строим на каждый запрос/повтор (UA ротуем)
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Referer": AVITO_HOME_URL,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cache-Control": "no-cache",
                "Upgrade-Insecure-Requests": "1",
            }

            response = SESSION.get(page_url, headers=headers, timeout=30)
            
            # Если 429 (Too Many Requests), ждем и повторяем
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    retry_after = (response.headers.get("Retry-After") or "").strip()
                    if retry_after.isdigit():
                        wait_time = float(int(retry_after))
                    else:
                        wait_time = min(
                            retry_delay_cap,
                            base_retry_delay * (2 ** attempt) + random.uniform(5, 15),
                        )
                    print(f"\n    ⚠️ 429 ошибка, ждём {wait_time:.0f}с (попытка {attempt + 1}/{max_retries})...")
                    time.sleep(wait_time)
                    continue

                print(f"\n    ❌ 429 после {max_retries} попыток, пропускаем")
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
                wait_time = base_retry_delay * (attempt + 1)
                print(f"\n    ⏳ Ошибка сети, ждём {wait_time}с...")
                time.sleep(wait_time)
            else:
                print(f"\n    ❌ Ошибка: {e}")
    
    return prices


def parse_entry(entry: dict, pages_count: int = DEFAULT_PAGES) -> Optional[PriceStat]:
    """Спарсить одну конфигурацию из таблицы"""
    model_name = entry.get("model_name", "")
    processor = entry.get("processor", "")
    ram = entry.get("ram", 0)
    ssd = entry.get("ssd", 0)
    url = entry.get("url", "")
    
    if not url:
        print(f"  ⚠️ Пропуск {model_name} - нет URL")
        return None
    
    print(f"\n{'='*60}")
    print(f"🔍 {model_name} | {processor} | {ram}GB RAM | {ssd}GB SSD")
    print(f"{'='*60}")
    
    all_prices = []
    
    # Парсим несколько страниц
    for page in range(1, pages_count + 1):
        print(f"  📄 Страница {page}/{pages_count}:", end=" ", flush=True)
        page_prices = parse_avito_page(url, page)
        print(f"✅ {len(page_prices)} цен")
        all_prices.extend(page_prices)
        
        # Если на странице мало объявлений, прекращаем
        if len(page_prices) < 10:
            print(f"  ℹ️ Мало объявлений на странице, прекращаем")
            break
    
    if len(all_prices) < 3:
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
    
    print(f"\n  📊 Результаты:")
    print(f"     • Собрано: {len(all_prices)} цен (после фильтрации: {len(filtered_prices)})")
    print(f"     • Диапазон: {min_price:,} - {max_price:,} ₽")
    print(f"     • Медиана: {median_price:,} ₽")
    print(f"     • Цена выкупа: {buyout_price:,} ₽")
    
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
    # Получаем количество страниц из аргументов или переменной окружения
    import sys
    pages_count = DEFAULT_PAGES
    
    # Из аргументов командной строки
    if len(sys.argv) > 1:
        try:
            pages_count = int(sys.argv[1])
        except ValueError:
            pass
    
    # Из переменной окружения (для GitHub Actions)
    env_pages = os.environ.get('PAGES')
    if env_pages:
        try:
            pages_count = int(env_pages)
        except ValueError:
            pass
    
    # Ограничиваем разумным диапазоном
    pages_count = max(1, min(pages_count, 5))
    
    print("=" * 70)
    print("🚀 Парсер цен MacBook с Авито (на основе таблицы URL)")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📄 Страниц для парсинга: {pages_count}")
    print(f"⏱️ Задержка между страницами: {PAGE_DELAY_MIN:.0f}-{PAGE_DELAY_MAX:.0f}с")
    print(f"⏱️ Задержка между конфигурациями: {CONFIG_DELAY_MIN:.0f}-{CONFIG_DELAY_MAX:.0f}с")
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
    estimated_time = len(entries) * (pages_count * (PAGE_DELAY_MIN + PAGE_DELAY_MAX) / 2 + (CONFIG_DELAY_MIN + CONFIG_DELAY_MAX) / 2)
    print(f"⏱️ Примерное время: {estimated_time / 60:.0f} минут")

    # Прогрев сессии (cookies). Если 429 приходит сразу — дальше в GitHub Actions обычно не имеет смысла ждать.
    if not warm_up_avito():
        raise SystemExit(2)

    # Парсим каждую конфигурацию
    stats = []
    total_listings = 0
    
    for i, entry in enumerate(entries, 1):
        print(f"\n\n{'#'*70}")
        print(f"# [{i}/{len(entries)}] Конфигурация")
        print(f"{'#'*70}")
        
        stat = parse_entry(entry, pages_count=pages_count)
        if stat:
            stats.append(asdict(stat))
            total_listings += stat.samples_count
        
        # Большая пауза между конфигурациями (кроме последней)
        if i < len(entries):
            delay = random.uniform(CONFIG_DELAY_MIN, CONFIG_DELAY_MAX)
            print(f"\n⏸️ Пауза {delay:.0f}с перед следующей конфигурацией...")
            time.sleep(delay)
    
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
    
    print("\n\n" + "=" * 70)
    print("✅ ГОТОВО!")
    print("=" * 70)
    print(f"   📊 Обработано конфигураций: {len(stats)}/{len(entries)}")
    print(f"   📈 Всего объявлений: {total_listings:,}")
    print(f"   🏷️ Уникальных моделей: {len(unique_models)}")
    print(f"   💾 Сохранено в: {OUTPUT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    main()
