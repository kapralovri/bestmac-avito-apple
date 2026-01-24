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
    clean_prices = prices[int(n*0.1):int(n*0.9)] if n > 10 else prices
    
    low_idx = int(len(clean_prices) * 0.2)
    market_low = clean_prices[low_idx]
    
    median = int(statistics.median(clean_prices))
    high_idx = int(len(clean_prices) * 0.8)
    market_high = clean_prices[high_idx]
    
    return market_low, market_high, median

def parse_config(entry):
    url = entry['url']
    prices = []
    logger.info(f"🔎 Анализ: {entry['model_name']} {entry['ram']}/{entry['ssd']}...")
    
    proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    for page in range(1, 3):
        try:
            time.sleep(random.uniform(3, 6))
            resp = requests.get(f"{url.strip()}&p={page}", headers=headers, proxies=proxies, timeout=25, verify=False)
            if resp.status_code == 429:
                if CHANGE_IP_URL: requests.get(CHANGE_IP_URL, timeout=10, verify=False)
                continue
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            for item in items:
                try:
                    p = int(item.select_one('[itemprop="price"]')['content'])
                    if 15000 < p < 800000: prices.append(p)
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
            new_results.append(asdict(res))
        else:
            failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")
    
    # Загружаем старые данные
    data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f: data = json.load(f)
        except: pass

    db = {(s['model_name'], s['ram'], s['ssd']): s for s in data['stats']}
    
    repaired_count = 0
    # 1. Авторемонт старых записей для фронтенда
    for key, stat in db.items():
        if 'min_price' not in stat or stat.get('min_price') == 0:
            median = stat.get('median_price', 0)
            stat['min_price'] = int(median * 0.9)
            stat['max_price'] = int(median * 1.1)
            if 'buyout_price' not in stat:
                stat['buyout_price'] = int((stat['min_price'] - 12000) // 1000 * 1000)
            repaired_count += 1

    # 2. Вливаем свежие данные
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    # Сохраняем
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": time.ctime(), "stats": list(db.values())}, f, ensure_ascii=False, indent=2)

    # --- ИТОГОВЫЙ ОТЧЕТ ---
    print("\n" + "="*50)
    print("📊 ИТОГИ ПАРСИНГА")
    print("="*50)
    print(f"✅ Обновлено успешно: {len(new_results)}")
    print(f"🛠 Отремонтировано старых записей: {repaired_count}")
    print(f"❌ Не удалось обновить (остались старые данные): {len(failed_configs)}")
    
    if failed_configs:
        print("\nСписок не обновленных конфигураций:")
        for cfg in failed_configs:
            print(f"  - {cfg}")
    
    print("="*50)
    logger.info("✅ Работа завершена.")

if __name__ == "__main__":
    main()
