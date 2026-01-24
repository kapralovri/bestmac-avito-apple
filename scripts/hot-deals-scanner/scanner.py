#!/usr/bin/env python3
import json
import os
import re
import time
import random
import logging
import urllib3
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Set, Dict
from pathlib import Path
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL = os.environ.get('SCAN_URL')

def extract_specs(text: str):
    text = text.lower().replace(' ', '')
    ram = 8
    ram_match = re.search(r'\b(8|16|18|24|32|36|48|64|96|128)(?:gb|гб)\b', text)
    if ram_match: ram = int(ram_match.group(1))
    
    ssd = 256
    ssd_matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    for val_str in ssd_matches:
        val = int(val_str)
        if 2010 <= val <= 2026: continue 
        if val in [128, 256, 512, 1, 2, 4]:
            ssd = val * 1024 if val <= 8 else val
            break
    return ram, ssd

class AvitoScanner:
    def __init__(self):
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                stats = data.get('stats', [])
                logger.info(f"📊 Загрузка базы цен: найдено {len(stats)} конфигураций")
                for s in stats:
                    name = s['model_name'].lower()
                    self.prices[(name, s['ram'], s['ssd'])] = s
        else:
            logger.error(f"❌ ФАЙЛ БАЗЫ ЦЕН НЕ НАЙДЕН: {PRICES_FILE}")

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    self.seen = set(json.load(f).get('seen_urls', []))
            except: pass

    def deep_analyze(self, url: str):
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
            resp = requests.get(url, headers=headers, timeout=15, verify=False)
            if resp.status_code != 200: return None, False
            soup = BeautifulSoup(resp.text, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""
            cycles = None
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if c_match: cycles = int(c_match.group(1))
            urgent = any(word in text for word in ['срочно', 'торг', 'сегодня', 'переезд'])
            return cycles, urgent
        except: return None, False

    def notify(self, title, price, market_low, buyout, ram, ssd, url, cycles, urgent):
        if not TELEGRAM_URL: return
        status = "🚨 <b>СРОЧНО!</b> " if urgent else ""
        if cycles and cycles < 150: status += "🔋 <b>АКБ ИДЕАЛ!</b>"
        
        text = (
            f"🎯 <b>Нашел по НИЗУ рынка!</b>\n{status}\n\n"
            f"💻 {title}\n"
            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b>\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Твой выкуп: {buyout:,} ₽\n"
            f"⚡ Циклы: {cycles if cycles else 'не указано'}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан!")
            return
        
        logger.info(f"🎬 Запуск сканирования страницы...")
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = requests.get(SCAN_URL, headers=headers, timeout=30, verify=False)
            
            if resp.status_code != 200:
                logger.error(f"❌ Ошибка загрузки страницы: {resp.status_code}")
                return

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            logger.info(f"🔎 Найдено объявлений на странице: {len(items)}")
            
            matches_count = 0
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    title = link_tag.get('title', '').lower()
                    url = urljoin("https://www.avito.ru", link_tag['href'])
                    
                    if url in self.seen: continue
                    
                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag: continue
                    price = int(price_tag['content'])
                    
                    ram, ssd = extract_specs(title)
                    
                    # Поиск совпадения
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        keywords = re.findall(r'[a-z0-9]+', m_name)
                        if all(word in title for word in keywords) and m_ram == ram and m_ssd == ssd:
                            market_low = stat['median_price']
                            # Если цена реально ниже низа рынка
                            if price <= market_low * 0.98:
                                logger.info(f"🔥 MATCH: {title} за {price} (Низ: {market_low})")
                                cycles, urgent_desc = self.deep_analyze(url)
                                self.notify(title, price, market_low, stat['buyout_price'], ram, ssd, url, cycles, urgent_desc)
                                self.seen.add(url)
                                matches_count += 1
                                time.sleep(2)
                            break
                except Exception as e: continue
            
            logger.info(f"🏁 Сканирование окончено. Новых совпадений: {matches_count}")
            
            # Сохраняем историю
            if matches_count > 0:
                SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                    json.dump({"seen_urls": list(self.seen)[-3000:]}, f)

        except Exception as e:
            logger.error(f"💥 Критическая ошибка: {e}")

if __name__ == "__main__":
    AvitoScanner().run()
