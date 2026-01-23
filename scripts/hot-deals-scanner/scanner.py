#!/usr/bin/env python3
import json
import os
import re
import time
import logging
import urllib3
from pathlib import Path
from urllib.parse import urljoin

# Отключаем ворнинги
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Install requirements: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# Пути
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')

def extract_specs(text: str):
    """Определяет RAM и SSD из заголовка"""
    text = text.lower().replace(' ', '')
    # Поиск RAM
    ram = 8
    ram_m = re.search(r'(\d+)(?:gb|гб)', text)
    if ram_m:
        val = int(ram_m.group(1))
        if val in [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]: ram = val
    
    # Поиск SSD
    ssd = 256
    ssd_m = re.search(r'(\d+)(?:gb|гб|tb|тб)', text)
    if ssd_m:
        val = int(ssd_m.group(1))
        if 'tb' in text or 'тб' in text: ssd = val * 1024
        else: ssd = val
    return ram, ssd

class HotScanner:
    def __init__(self):
        self.prices = {}
        if PRICES_FILE.exists():
            try:
                with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for s in data.get('stats', []):
                        # Ключ для поиска: (Модель_ловер, RAM, SSD)
                        key = (s['model_name'].lower().split('(')[0].strip(), s['ram'], s['ssd'])
                        self.prices[key] = s
                logger.info(f"✅ База цен загружена: {len(self.prices)} конфигов")
            except Exception as e:
                logger.error(f"❌ Ошибка чтения файла цен: {e}")
        else:
            logger.warning("⚠️ Файл avito-prices.json не найден. Сначала запустите Parser!")

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    self.seen = set(json.load(f).get('seen_urls', []))
            except: pass

    def notify(self, title, price, market_low, buyout, ram, ssd, url):
        if not TELEGRAM_URL: return
        text = (
            f"🎯 <b>Нашел вариант по НИЗУ рынка!</b>\n\n"
            f"💻 {title}\n"
            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена сейчас: <b>{price:,} ₽</b>\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Твой выкуп: {buyout:,} ₽\n\n"
            f"🔗 <a href='{url}'>Открыть объявление</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        except: pass

    def run(self):
        scan_url = os.environ.get('SCAN_URL')
        if not scan_url: return
        
        logger.info("🎬 Запуск сканирования...")
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = requests.get(scan_url, headers=headers, timeout=30)
            if resp.status_code != 200: return
            
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    url = urljoin("https://www.avito.ru", link_tag['href'])
                    if url in self.seen: continue
                    
                    title = link_tag.get('title', '')
                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag: continue
                    price = int(price_tag['content'])
                    
                    # Извлекаем спеки
                    ram, ssd = extract_specs(title)
                    
                    # Ищем совпадение модели
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        if m_name in title.lower() and m_ram == ram and m_ssd == ssd:
                            # Проверяем на "Низ рынка"
                            market_low = stat['median_price']
                            if price <= market_low * 0.97: # Если цена на 3% и более ниже твоего "Низа"
                                self.notify(title, price, market_low, stat['buyout_price'], ram, ssd, url)
                                self.seen.add(url)
                            break
                except: continue
                
            # Сохраняем историю
            SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"seen_urls": list(self.seen)[-3000:]}, f)
                
        except Exception as e:
            logger.error(f"💥 Ошибка при сканировании: {e}")

if __name__ == "__main__":
    HotScanner().run()
