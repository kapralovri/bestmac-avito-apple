#!/usr/bin/env python3
import json
import os
import re
import time
import random
import statistics
import argparse
import logging
from pathlib import Path
from dataclasses import dataclass, asdict
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Ошибка: Установите зависимости командой: pip install requests beautifulsoup4 lxml")
    exit(1)

# Настройка логов
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

# Пути
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# Конфигурация из окружения
PROXY_URL = os.environ.get("PROXY_URL")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL")

# Настройки задержек
PAGE_DELAY = (4.0, 8.0)
CONFIG_DELAY = (15.0, 25.0)

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

def rotate_ip():
    """Вызов API для смены IP мобильного прокси"""
    if CHANGE_IP_URL:
        try:
            logger.info("🔄 Запрос на смену IP...")
            requests.get(CHANGE_IP_URL, timeout=15, verify=False)
            time.sleep(15) # Ждем применения
        except Exception as e:
            logger.error(f"⚠️ Ошибка смены IP: {e}")

def get_market_low(prices: list[int]) -> int:
    """Алгоритм 'Нижней плотности': отсекаем 10% мусора и берем 20-й перцентиль"""
    if not prices: return 0
    prices = sorted(prices)
    n = len(prices)
    if n < 5: return int(statistics.median(prices))
    
    # Отсекаем нижние 10% (запчасти, скам)
    clean_prices = prices[int(n*0.1):]
    # Берем точку на уровне 20% (начало реальных предложений)
    idx = int(len(clean_prices) * 0.2)
    return clean_prices[idx]

def parse_config(entry):
    """Парсинг одной конфигурации (2 страницы)"""
    url = entry['url']
    prices = []
    logger.info(f"🔎 Анализ: {entry['model_name']} {entry['ram']}/{entry['ssd']}...")
    
    proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    for page in range(1, 3):
        try:
            time.sleep(random.uniform(*PAGE_DELAY))
            target_url = f"{url}&p={page}"
            resp = requests.get(target_url, headers=headers, proxies=proxies, timeout=25)
            
            if resp.status_code == 429:
                logger.warning("⚠️ Код 429! Пробуем сменить IP...")
                rotate_ip()
                continue

            if resp.status_code != 200: 
                logger.error(f"❌ Код {resp.status_code} для {target_url}")
                break

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            for item in items:
                p_tag = item.select_one('[itemprop="price"]')
                if p_tag:
                    try:
                        p = int(p_tag['content'])
                        if 20000 < p < 800000: prices.append(p)
                    except: continue
            
            if len(items) < 10: break # Страница полупустая
            
        except Exception as e:
            logger.error(f"⚠️ Ошибка на странице {page}: {e}")
            break
    
    if len(prices) < 5:
        logger.warning(f"📉 Недостаточно данных для {entry['model_name']} ({len(prices)} цен)")
        return None
    
    market_low = get_market_low(prices)
    # Формула: Низ рынка - 12 000 руб.
    buyout = int((market_low - 12000) // 1000 * 1000)
    
    return PriceStat(
        model_name=entry['model_name'],
        processor=entry['processor'],
        ram=entry['ram'],
        ssd=entry['ssd'],
        median_price=market_low,
        buyout_price=buyout,
        samples_count=len(prices),
        updated_at=time.ctime()
    )

def main():
    # Настройка аргументов
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", default="1")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists():
        logger.error(f"❌ Файл URL не найден: {URLS_FILE}")
        return

    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        all_entries = json.load(f)['entries']

    # Логика деления на батчи
    if args.batch == "all":
        logger.info("📦 Режим: Парсим ВСЕ конфигурации")
        my_entries = all_entries
    else:
        try:
            b_idx = int(args.batch)
            chunk = len(all_entries) // args.total_batches
            start = (b_idx - 1) * chunk
            end = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
            my_entries = all_entries[start:end]
            logger.info(f"📦 Режим: Батч {b_idx} из {args.total_batches} ({len(my_entries)} записей)")
        except:
            logger.error("❌ Неверный формат батча")
            return

    new_results = []
    for entry in my_entries:
        stat = parse_config(entry)
        if stat:
            new_results.append(asdict(stat))
        time.sleep(random.uniform(*CONFIG_DELAY))

    # Слияние с существующей базой
    existing_data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except: pass

    # Создаем словарь для быстрого обновления (по ключу модель+рам+ссд)
    db = {(s['model_name'], s['ram'], s['ssd']): s for s in existing_data['stats']}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    # Сохраняем результат
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        output = {
            "updated_at": time.ctime(),
            "stats": list(db.values())
        }
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✅ Готово. База содержит {len(db)} конфигураций.")

if __name__ == "__main__":
    main()
