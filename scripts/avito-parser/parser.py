#!/usr/bin/env python3
import json
import os
import re
import time
import random
import statistics
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict

import requests
from bs4 import BeautifulSoup

# Пути
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# НАСТРОЙКИ ЗАДЕРЖЕК (Ускорил в 2 раза)
PAGE_DELAY = (5.0, 10.0)
CONFIG_DELAY = (15.0, 30.0)

@dataclass
class PriceStat:
    model_name: str
    processor: str
    ram: int
    ssd: int
    median_price: int # Это будет наш "Низ рынка"
    buyout_price: int
    samples_count: int
    updated_at: str

def get_market_low_price(prices: list[int]) -> int:
    """Алгоритм 'Нижней Плотности'"""
    if not prices: return 0
    prices = sorted(prices)
    n = len(prices)
    
    if n < 5: return int(statistics.median(prices))
    
    # 1. Отсекаем явный мусор (нижние 10%)
    valid_prices = prices[int(n*0.1):]
    
    # 2. Берем 25-й перцентиль (это и есть начало реальной плотности дешевых предложений)
    # Это то, что ты делаешь вручную, когда 'смотришь, где начинается плотность'
    idx = int(len(valid_prices) * 0.20)
    market_low = valid_prices[idx]
    
    return int(market_low)

def parse_config(entry: dict):
    model = entry['model_name']
    url = entry['url']
    print(f"🔎 Парсим: {model} {entry['ram']}/{entry['ssd']}")
    
    prices = []
    # Парсим только первые 2 страницы (самое актуальное)
    for page in range(1, 3):
        try:
            time.sleep(random.uniform(*PAGE_DELAY))
            resp = requests.get(url + f"&p={page}", timeout=20)
            if resp.status_code != 200: break
            
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            for item in items:
                p_text = item.select_one('[itemprop="price"]')
                if p_text:
                    p = int(re.sub(r'\D', '', p_text.get('content') or p_text.text))
                    if 20000 < p < 700000: prices.append(p)
            if len(items) < 10: break
        except: break
            
    if not prices: return None
    
    low_market = get_market_low_price(prices)
    # Твоя формула: Низ рынка - 12 000 руб (среднее от 10-15к)
    buyout = int((low_market - 12000) // 1000 * 1000)
    
    return PriceStat(
        model_name=model, processor=entry['processor'],
        ram=entry['ram'], ssd=entry['ssd'],
        median_price=low_market, buyout_price=buyout,
        samples_count=len(prices), updated_at=datetime.now().isoformat()
    )

def main():
    with open(URLS_FILE, 'r') as f: config = json.load(f)
    
    # Чтобы не парсить всё 4 часа, можно добавить фильтр батча через ENV
    batch_idx = int(os.environ.get("BATCH", 1))
    total_batches = int(os.environ.get("TOTAL_BATCHES", 1))
    
    entries = config['entries']
    chunk = len(entries) // total_batches
    current_entries = entries[(batch_idx-1)*chunk : batch_idx*chunk]
    
    stats = []
    for entry in current_entries:
        stat = parse_config(entry)
        if stat:
            stats.append(asdict(stat))
            time.sleep(random.uniform(*CONFIG_DELAY))
            
    # Сохраняем (мержим с существующими)
    old_data = {"stats": []}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, 'r') as f: old_data = json.load(f)
        
    # Обновляем старые записи новыми
    new_keys = {(s['model_name'], s['ram'], s['ssd']) for s in stats}
    final_stats = stats + [s for s in old_data['stats'] if (s['model_name'], s['ram'], s['ssd']) not in new_keys]
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": datetime.now().isoformat(), "stats": final_stats}, f, ensure_ascii=False, indent=2)
    print(f"✅ База обновлена. Конфигураций: {len(final_stats)}")

if __name__ == "__main__":
    main()
