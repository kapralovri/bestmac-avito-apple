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

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Ошибка: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# Твой новый список исключений
JUNK_KEYWORDS = [
    'под заказ', 'срок доставки', 'предоплата', 'доставка из европы', 'доставка из сша', 'доставка из дубая',
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud', 
    'запчаст', 'экран', 'матриц', 'вмятина','дефект','трещина'
]

RAW_PROXY = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL", "").strip().strip('"').strip("'")

def format_proxy(proxy_str):
    if not proxy_str: return None
    if proxy_str.startswith(('http://', 'https://', 'socks5://')): return proxy_str
    return f"http://{proxy_str}"

PROXY_URL = format_proxy(RAW_PROXY)

def get_market_analysis(prices: list[int]):
    """Методика 'Агрессивный минимум': берем самую первую цену после фильтра слов"""
    if not prices: return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    
    # 1. Снизу больше НЕ срезаем ничего (0%)
    # 2. Сверху срезаем 10% (оверпрайс)
    end_idx = int(n * 0.9)
    clean_prices = prices[:end_idx] if n > 5 else prices
    
    if not clean_prices: clean_prices = prices
    
    # market_low — теперь это САМАЯ низкая цена из найденных
    market_low = clean_prices[0]
    # median — центральное значение
    median = int(statistics.median(clean_prices))
    # market_high — граница адекватной цены
    market_high = clean_prices[-1]
    
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
                if CHANGE_IP_URL: requests.get(CHANGE_IP_URL, timeout=10, verify=False)
                continue
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            for item in items:
                try:
                    title = item.select_one('[data-marker="item-title"]').get('title', '').lower()
                    # СТРОГИЙ ФИЛЬТР ПО ТВОИМ СЛОВАМ
                    if any(word in title for word in JUNK_KEYWORDS):
                        continue
                        
                    p = int(item.select_one('[itemprop="price"]')['content'])
                    if 15000 < p < 850000: 
                        prices.append(p)
                except: continue
            if len(items) < 10: break
        except: break
    
    if len(prices) < 5: return None
    
    low, high, median = get_market_analysis(prices)
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
    args = parser.parse_args()

    if not URLS_FILE.exists(): return
    with open(URLS_FILE, 'r', encoding='utf-8') as f: all_entries = json.load(f)['entries']

    batch_env = os.environ.get("BATCH", args.batch)
    my_entries = all_entries if batch_env == "all" else all_entries[:10] # Упрощенная логика для теста

    new_results = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_results.append(res)
    
    # ЗАГРУЗКА И МЕРЖ С ГАРАНТИЕЙ ПОЛЕЙ ДЛЯ ФРОНТЕНДА
    db = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                for s in old_data.get('stats', []):
                    db[(s['model_name'], s['ram'], s['ssd'])] = s
        except: pass

    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    final_stats = []
    total_listings = 0
    for stat in db.values():
        median = int(stat.get('median_price', 0))
        if median < 5000: continue
        
        # Принудительная починка полей
        stat['min_price'] = int(stat.get('min_price') or median * 0.8)
        stat['max_price'] = int(stat.get('max_price') or median * 1.2)
        stat['buyout_price'] = int(stat.get('buyout_price') or (stat['min_price'] - 12000))
        
        total_listings += stat.get('samples_count', 0)
        final_stats.append(stat)

    # СОХРАНЕНИЕ В ФОРМАТЕ ДЛЯ САЙТА
    output = {
        "generated_at": time.ctime(),
        "total_listings": total_listings,
        "stats": final_stats
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✅ База обновлена. Самая низкая цена теперь без 5% буфера. Всего моделей: {len(final_stats)}")

if __name__ == "__main__":
    main()
