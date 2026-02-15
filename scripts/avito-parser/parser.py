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

JUNK_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud', 
    'запчаст', 'экран', 'матриц', 'дефект', 'вмятина',"треснул", 'помят',
    'под заказ', 'срок доставки', 'предоплата'
]

RAW_PROXY = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL", "").strip().strip('"').strip("'")

def format_proxy(proxy_str):
    if not proxy_str: return None
    if proxy_str.startswith(('http://', 'https://', 'socks5://')): return proxy_str
    return f"http://{proxy_str}"

PROXY_URL = format_proxy(RAW_PROXY)

def get_market_analysis(prices: list[int]):
    """Улучшенная методика: защита от аномально низких цен"""
    if not prices: return 0, 0, 0
    prices = sorted(prices)
    
    # 1. Сначала находим грубую медиану, чтобы понять масштаб цен
    raw_median = statistics.median(prices)
    
    # 2. ФИЛЬТР АНОМАЛИЙ: убираем всё, что дешевле 55% от медианы (это точно хлам)
    # и всё, что дороже 150% (оверпрайс)
    clean_prices = [p for p in prices if raw_median * 0.55 <= p <= raw_median * 1.5]
    
    if len(clean_prices) < 5: clean_prices = prices # Если данных мало, берем что есть
    
    # 3. Рассчитываем итоговые показатели
    market_low = clean_prices[0]
    median = int(statistics.median(clean_prices))
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
                if CHANGE_IP_URL: requests.get(CHANGE_IP_URL, timeout=10, verify=False)
                continue
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            for item in items:
                try:
                    title = item.select_one('[data-marker="item-title"]').get('title', '').lower()
                    if any(word in title for word in JUNK_KEYWORDS): continue
                    p = int(item.select_one('[itemprop="price"]')['content'])
                    if 15000 < p < 850000: prices.append(p)
                except: continue
            if len(items) < 10: break
        except: break
    
    if len(prices) < 5: return None
    
    low, high, median = get_market_analysis(prices)
    
    # --- НОВАЯ ЛОГИКА ВЫКУПА ---
    # Предлагаю: 70% от медианы минус 5000 руб (на логику и мелкий ремонт)
    # Либо твой вариант: Медиана - 25 000 руб (если хочешь фиксированную маржу)
    # Давай сделаем 70% от медианы - это самый безопасный стандарт выкупа.
    buyout = int((median * 0.70 - 2000) // 1000 * 1000)
    
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
    my_entries = all_entries if batch_env == "all" else all_entries[:10]

    new_results = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_results.append(res)
    
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
        
        # Гарантируем корректность всех полей
        stat['min_price'] = int(stat.get('min_price') or median * 0.8)
        stat['max_price'] = int(stat.get('max_price') or median * 1.2)
        # Если выкуп не был посчитан по новой формуле - пересчитываем
        stat['buyout_price'] = int(stat.get('buyout_price') or (median * 0.7 - 2000))
        
        total_listings += stat.get('samples_count', 0)
        final_stats.append(stat)

    output = {
        "generated_at": time.ctime(),
        "total_listings": total_listings,
        "stats": final_stats
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✅ База обновлена. Аномалии отсечены. Всего моделей: {len(final_stats)}")

if __name__ == "__main__":
    main()
