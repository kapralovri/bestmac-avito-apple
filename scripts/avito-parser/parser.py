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

JUNK_KEYWORDS = ['битый', 'разбит', 'экран', 'матриц', 'icloud', 'запчаст', 'дефект', 'не раб', 'аккаунт', 'mdm', 'коробка', 'чехол']

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
    if not prices: return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    start_idx = int(n * 0.05)
    end_idx = int(n * 0.9)
    clean_prices = prices[start_idx:end_idx] if n > 5 else prices
    market_low = clean_prices[0]
    median = int(statistics.median(clean_prices))
    market_high = clean_prices[int(len(clean_prices)*0.8)] if len(clean_prices) > 5 else clean_prices[-1]
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
    buyout = int((low - 12000) // 1000 * 1000)
    return PriceStat(
        model_name=entry['model_name'], processor=entry['processor'],
        ram=entry['ram'], ssd=entry['ssd'],
        min_price=low, max_price=high, median_price=median,
        buyout_price=buyout, samples_count=len(prices), updated_at=time.ctime()
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", default="1")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists(): return
    with open(URLS_FILE, 'r', encoding='utf-8') as f: all_entries = json.load(f)['entries']

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all": my_entries = all_entries
    else:
        b_idx = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b_idx - 1) * chunk
        end = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]

    new_results = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_results.append(asdict(res))
    
    # --- БЕЗОПАСНЫЙ МЕРЖ И РЕМОНТ ---
    data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f: data = json.load(f)
        except: pass

    # Сначала создаем словарь из новой базы, чтобы ничего не потерять
    db = {(s['model_name'], s['ram'], s['ssd']): s for s in data.get('stats', [])}
    
    # Обновляем базу свежими результатами
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    final_stats = []
    repaired_count = 0

    # Проходим по всем записям и ГАРАНТИРУЕМ наличие всех полей
    for key, stat in db.items():
        # Если каких-то полей нет, заполняем их на основе median_price
        median = stat.get('median_price', 0)
        
        # Если median вообще 0 или отсутствует, это критическая ошибка в записи, пропускаем её
        if median == 0: continue 

        if 'min_price' not in stat or not stat['min_price']:
            stat['min_price'] = int(median * 0.9)
            repaired_count += 1
        if 'max_price' not in stat or not stat['max_price']:
            stat['max_price'] = int(median * 1.1)
        if 'buyout_price' not in stat or not stat['buyout_price']:
            stat['buyout_price'] = int((stat['min_price'] - 12000) // 1000 * 1000)
        
        # Убеждаемся, что остальные поля на месте (для Buy страницы)
        if 'processor' not in stat: stat['processor'] = "Apple M-series"
        if 'updated_at' not in stat: stat['updated_at'] = time.ctime()
        
        final_stats.append(stat)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": time.ctime(), "stats": final_stats}, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✅ База очищена и обновлена. Отремонтировано: {repaired_count}. Всего записей: {len(final_stats)}")

if __name__ == "__main__":
    main()
