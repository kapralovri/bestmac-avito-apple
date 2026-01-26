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

# Ключевые слова для исключения мусорных цен (запчасти, битые)
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
    """Методика 'Живой рынок': убираем только явный шум снизу"""
    if not prices: return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    
    # 1. Отсекаем только самый низ (5%), где обычно лежат запчасти, которые не отфильтровались словами
    # 2. Отсекаем верхние 10% (неадекватный оверпрайс)
    start_idx = int(n * 0.05)
    end_idx = int(n * 0.9)
    clean_prices = prices[start_idx:end_idx]
    
    if not clean_prices: clean_prices = prices
    
    # market_low — теперь это реально ПЕРВАЯ цена живого устройства
    market_low = clean_prices[0]
    # median — центральное значение
    median = int(statistics.median(clean_prices))
    # market_high — граница адекватной цены
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
                    # ФИЛЬТР: если в заголовке есть 'битый', 'запчасти' и т.д. — игнорируем эту цену
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
    # Выкуп считаем от НИЗА РЫНКА минус 12-15% (или фиксированные 12к)
    # Давай сделаем 12 000, как ты просил ранее
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
    my_entries = all_entries if batch_env == "all" else all_entries[(int(batch_env)-1)*(len(all_entries)//args.total_batches) : int(batch_env)*(len(all_entries)//args.total_batches)]

    new_results = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_results.append(asdict(res))
    
    data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f: data = json.load(f)
        except: pass

    db = {(s['model_name'], s['ram'], s['ssd']): s for s in data['stats']}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": time.ctime(), "stats": list(db.values())}, f, ensure_ascii=False, indent=2)
    print(f"✅ База обновлена. Успешно: {len(new_results)}")

if __name__ == "__main__":
    main()
