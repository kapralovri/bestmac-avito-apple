#!/usr/bin/env python3
import json
import os
import re
import time
import random
import statistics
from pathlib import Path
from dataclasses import dataclass, asdict
import requests
from bs4 import BeautifulSoup

# Пути
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# Ускоренные задержки
PAGE_DELAY = (3.0, 6.0)
CONFIG_DELAY = (10.0, 20.0)

@dataclass
class PriceStat:
    model_name: str
    processor: str
    ram: int
    ssd: int
    median_price: int
    buyout_price: int
    samples_count: int
    updated_at: str

def get_market_low(prices: list[int]) -> int:
    """Твоя методика: Находим начало плотности в дешевом сегменте"""
    if not prices: return 0
    prices = sorted(prices)
    n = len(prices)
    if n < 5: return int(statistics.median(prices))
    
    # 1. Отсекаем подозрительно дешевые (нижние 10% - запчасти/скам)
    clean_prices = prices[int(n*0.1):]
    
    # 2. Берем цену на уровне 20% отфильтрованного списка (это и есть начало 'полки' цен)
    idx = int(len(clean_prices) * 0.2)
    return clean_prices[idx]

def parse_config(entry):
    url = entry['url']
    prices = []
    print(f"🔎 Анализ: {entry['model_name']} {entry['ram']}/{entry['ssd']}...")
    
    for page in range(1, 3): # 2 страницы достаточно для анализа рынка
        try:
            time.sleep(random.uniform(*PAGE_DELAY))
            resp = requests.get(url + f"&p={page}", timeout=20)
            if resp.status_code != 200: break
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            for item in items:
                p_tag = item.select_one('[itemprop="price"]')
                if p_tag:
                    p = int(p_tag['content'])
                    if 20000 < p < 800000: prices.append(p)
            if len(items) < 15: break
        except: break
    
    if len(prices) < 5: return None
    
    market_low = get_market_low(prices)
    # Твоя формула: точка плотности минус 12к
    buyout = int((market_low - 12000) // 1000 * 1000)
    
    return PriceStat(
        model_name=entry['model_name'], processor=entry['processor'],
        ram=entry['ram'], ssd=entry['ssd'],
        median_price=market_low, buyout_price=buyout,
        samples_count=len(prices), updated_at=time.ctime()
    )

def main():
    if not URLS_FILE.exists(): 
        print(f"❌ Файл не найден: {URLS_FILE}")
        return
    
    with open(URLS_FILE, 'r') as f: 
        entries = json.load(f)['entries']
    
    # ИСПРАВЛЕННАЯ ЛОГИКА БАТЧЕЙ
    batch_env = os.environ.get("BATCH", "1")
    
    if batch_env == "all":
        print("📦 Режим: Парсим ВСЕ конфигурации сразу")
        my_entries = entries
    else:
        try:
            b_idx = int(batch_env)
            t_batches = int(os.environ.get("TOTAL_BATCHES", 3))
            chunk = len(entries) // t_batches
            # Чтобы не было ошибок с индексами
            start = (b_idx - 1) * chunk
            end = b_idx * chunk if b_idx < t_batches else len(entries)
            my_entries = entries[start:end]
            print(f"📦 Режим: Батч {b_idx} из {t_batches} (записей: {len(my_entries)})")
        except ValueError:
            print(f"⚠️ Неверный формат BATCH ({batch_env}), парсим всё.")
            my_entries = entries

    new_stats = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_stats.append(asdict(res))
        time.sleep(random.uniform(*CONFIG_DELAY))
        
    # Сохранение (слияние)
    data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r') as f: data = json.load(f)
        except: pass
        
    current = { (s['model_name'], s['ram'], s['ssd']): s for s in data['stats'] }
    for s in new_stats:
        current[(s['model_name'], s['ram'], s['ssd'])] = s
        
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": time.ctime(), "stats": list(current.values())}, f, ensure_ascii=False, indent=2)
    print(f"✅ База обновлена. Всего в базе: {len(current)} конфигураций.")
