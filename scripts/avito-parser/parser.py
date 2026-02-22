#!/usr/bin/env python3
import json
import os
import re
import time
import random
import statistics
import argparse
import logging
import urllib3
from pathlib import Path
from dataclasses import dataclass, asdict

# Отключаем предупреждения об отсутствии SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Ошибка: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

# Пути к файлам
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# Ключевые слова для исключения мусора, ремонта и предложений "под заказ"
JUNK_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud', 
    'запчаст', 'экран', 'матриц', 'дефект', 'аккаунт', 'коробка', 'чехол',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход'
]

# Обработка прокси
RAW_PROXY = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL", "").strip().strip('"').strip("'")

def format_proxy(proxy_str):
    if not proxy_str: return None
    if proxy_str.startswith(('http://', 'https://', 'socks5://')): return proxy_str
    return f"http://{proxy_str}"

PROXY_URL = format_proxy(RAW_PROXY)

@dataclass
class PriceStat:
    model_name: str
    processor: str
    ram: int
    ssd: int
    min_price: int
    max_price: int
    median_price: int
    buyout_price: int
    samples_count: int
    updated_at: str

def get_market_analysis(prices: list[int]):
    """Методика 'Агрессивный низ': берем старт цен после фильтрации мусора"""
    if not prices: return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    
    # Отсекаем только верхние 10% (оверпрайс), низ берем с 0-й позиции
    end_idx = int(n * 0.9)
    clean_prices = prices[:end_idx] if n > 5 else prices
    
    if not clean_prices: clean_prices = prices
    
    market_low = clean_prices[0]
    median = int(statistics.median(clean_prices))
    # Верхняя граница для диапазона на сайте
    market_high = clean_prices[int(len(clean_prices)*0.85)] if len(clean_prices) > 5 else clean_prices[-1]
    
    return market_low, market_high, median

def parse_config(entry):
    url = entry['url']
    prices = []
    logger.info(f"🔎 Анализ: {entry['model_name']} {entry['ram']}/{entry['ssd']}...")
    
    proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    for page in range(1, 3):
        try:
            time.sleep(random.uniform(4, 7))
            resp = requests.get(f"{url.strip()}&p={page}", headers=headers, proxies=proxies, timeout=25, verify=False)
            
            if resp.status_code == 429:
                if CHANGE_IP_URL: requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                continue
            if resp.status_code != 200: break

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            for item in items:
                try:
                    # 1. Извлекаем заголовок
                    title = item.select_one('[data-marker="item-title"]').get('title', '').lower()
                    
                    # 2. Извлекаем сниппет описания (серый текст под заголовком)
                    snippet = ""
                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    if snippet_tag:
                        snippet = snippet_tag.get_text().lower()
                    
                    # Полный текст для проверки на STOP-слова
                    check_text = title + " " + snippet
                    
                    # ФИЛЬТР МУСОРА И РЕМОНТА
                    if any(word in check_text for word in JUNK_KEYWORDS):
                        continue
                        
                    p = int(item.select_one('[itemprop="price"]')['content'])
                    if 15000 < p < 900000: 
                        prices.append(p)
                except: continue
            if len(items) < 10: break
        except: break
    
    if len(prices) < 5: return None
    
    low, high, median = get_market_analysis(prices)
    # Выкуп: Низ рынка - 12 000 руб.
    buyout = int((low - 12000) // 1000 * 1000)
    
    return {
        "model_name": entry['model_name'], "processor": entry['processor'],
        "ram": entry['ram'], "ssd": entry['ssd'],
        "min_price": low, "max_price": high, "median_price": median,
        "buyout_price": buyout, "samples_count": len(prices), "updated_at": time.ctime()
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", default="all")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists(): return
    with open(URLS_FILE, 'r', encoding='utf-8') as f: all_entries = json.load(f)['entries']

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 Режим: ВСЕ конфигурации ({len(my_entries)} шт)")
    else:
        b_idx = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b_idx - 1) * chunk
        end = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]
        logger.info(f"📦 Батч {b_idx}/{args.total_batches} ({len(my_entries)} шт)")

    new_results = []
    failed_configs = []

    for entry in my_entries:
        res = parse_config(entry)
        if res:
            new_results.append(res)
        else:
            failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")
    
    # ЗАГРУЗКА СТАРОЙ БАЗЫ ДЛЯ МЕРЖА
    existing_data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f: existing_data = json.load(f)
        except: pass

    db = {(s['model_name'], s['ram'], s['ssd']): s for s in existing_data.get('stats', [])}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    # ФИНАЛЬНАЯ САНАЦИЯ (Гарантия полей для фронтенда)
    final_stats = []
    total_all_listings = 0
    repaired_count = 0

    for key, stat in db.items():
        try:
            median = int(stat.get('median_price', 0))
            if median < 5000: continue 

            # Принудительное восстановление полей, если их нет
            if 'min_price' not in stat or not stat['min_price']:
                stat['min_price'] = int(median * 0.85)
                repaired_count += 1
            if 'max_price' not in stat or not stat['max_price']:
                stat['max_price'] = int(median * 1.15)
            if 'buyout_price' not in stat or not stat['buyout_price']:
                stat['buyout_price'] = int((stat['min_price'] - 12000) // 1000 * 1000)
            
            # Гарантируем типы данных
            clean_item = {
                "model_name": str(stat['model_name']),
                "processor": str(stat.get('processor', 'Apple M-series')),
                "ram": int(stat['ram']),
                "ssd": int(stat['ssd']),
                "min_price": int(stat['min_price']),
                "max_price": int(stat['max_price']),
                "median_price": int(stat['median_price']),
                "buyout_price": int(stat['buyout_price']),
                "samples_count": int(stat.get('samples_count', 0)),
                "updated_at": str(stat.get('updated_at', time.ctime()))
            }
            total_all_listings += clean_item["samples_count"]
            final_stats.append(clean_item)
        except: continue

    # СОХРАНЕНИЕ
    output_data = {
        "generated_at": time.ctime(),
        "total_listings": total_all_listings,
        "stats": final_stats
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    # ИТОГОВЫЙ ОТЧЕТ В ЛОГИ
    print("\n" + "="*50)
    print("📊 ИТОГИ ОБНОВЛЕНИЯ БАЗЫ")
    print("="*50)
    print(f"✅ Обновлено успешно: {len(new_results)}")
    print(f"🛠 Отремонтировано старых записей: {repaired_count}")
    print(f"❌ Не удалось обновить: {len(failed_configs)}")
    print(f"📈 Всего объявлений в базе: {total_all_listings}")
    print("="*50)

if __name__ == "__main__":
    main()
