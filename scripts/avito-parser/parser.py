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

# Пути
SCRIPT_DIR = Path(__file__).parent
URLS_FILE = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# --- ОБРАБОТКА ПРОКСИ (Твой формат login:pass@host:port) ---
RAW_PROXY = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL", "").strip().strip('"').strip("'")

def format_proxy(proxy_str):
    if not proxy_str: return None
    # Если протокол уже есть, оставляем как есть
    if proxy_str.startswith(('http://', 'https://', 'socks5://')):
        return proxy_str
    # Для твоего формата login:pass@host:port добавляем http://
    return f"http://{proxy_str}"

PROXY_URL = format_proxy(RAW_PROXY)
if PROXY_URL:
    # Выводим в лог часть прокси без пароля для проверки
    safe_log = PROXY_URL.split('@')[-1] if '@' in PROXY_URL else PROXY_URL
    logger.info(f"🌐 Прокси настроен: {safe_log}")

# Настройки задержек
PAGE_DELAY = (4.0, 7.0)
CONFIG_DELAY = (12.0, 20.0)

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
    if CHANGE_IP_URL:
        try:
            logger.info("🔄 Смена IP через API...")
            requests.get(CHANGE_IP_URL, timeout=15, verify=False)
            time.sleep(12) # Даем время на переключение
        except Exception as e:
            logger.error(f"⚠️ Ошибка смены IP: {e}")

def get_market_low(prices: list[int]) -> int:
    """Твоя методика: 20-й перцентиль после отсечения 10% мусора"""
    if not prices: return 0
    prices = sorted(prices)
    n = len(prices)
    if n < 5: return int(statistics.median(prices))
    clean_prices = prices[int(n*0.1):] 
    idx = int(len(clean_prices) * 0.2) 
    return clean_prices[idx]

def parse_config(entry):
    url = entry['url']
    prices = []
    logger.info(f"🔎 Анализ: {entry['model_name']} {entry['ram']}/{entry['ssd']}...")
    
    proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    for page in range(1, 3):
        try:
            time.sleep(random.uniform(*PAGE_DELAY))
            # Убеждаемся, что в ссылке нет лишних пробелов
            target_url = f"{url.strip()}&p={page}"
            resp = requests.get(target_url, headers=headers, proxies=proxies, timeout=25, verify=False)
            
            if resp.status_code == 429:
                logger.warning("⚠️ Ловушка 429! Ротируем IP...")
                rotate_ip()
                continue

            if resp.status_code != 200: 
                logger.error(f"❌ Код {resp.status_code} для {entry['model_name']}")
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
            if len(items) < 10: break
        except Exception as e:
            logger.error(f"⚠️ Ошибка сети на странице {page}: {e}")
            break
    
    if len(prices) < 5: return None
    
    market_low = get_market_low(prices)
    # Формула: точка плотности минус 12к
    buyout = int((market_low - 12000) // 1000 * 1000)
    
    return PriceStat(
        model_name=entry['model_name'], processor=entry['processor'],
        ram=entry['ram'], ssd=entry['ssd'],
        median_price=market_low, buyout_price=buyout,
        samples_count=len(prices), updated_at=time.ctime()
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", default="1")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists():
        logger.error(f"❌ Файл не найден: {URLS_FILE}")
        return

    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        all_entries = json.load(f)['entries']

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 Режим: ВСЕ конфигурации ({len(my_entries)} шт)")
    else:
        try:
            b_idx = int(batch_env)
            chunk = len(all_entries) // args.total_batches
            start = (b_idx - 1) * chunk
            end = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
            my_entries = all_entries[start:end]
            logger.info(f"📦 Батч {b_idx}/{args.total_batches} ({len(my_entries)} шт)")
        except:
            my_entries = all_entries
            logger.warning("⚠️ Неверный формат батча, берем всё")

    new_results = []
    for entry in my_entries:
        res = parse_config(entry)
        if res: new_results.append(asdict(res))
        time.sleep(random.uniform(*CONFIG_DELAY))

    # Загружаем старую базу для слияния
    data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f: data = json.load(f)
        except: pass

    # Мерж (новые данные заменяют старые)
    db = {(s['model_name'], s['ram'], s['ssd']): s for s in data['stats']}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"updated_at": time.ctime(), "stats": list(db.values())}, f, ensure_ascii=False, indent=2)
    logger.info(f"✅ Готово. Обновлено в этом запуске: {len(new_results)}. Всего в базе: {len(db)}")

if __name__ == "__main__":
    main()
