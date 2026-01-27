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
from urllib.parse import urljoin, urlparse

# Отключаем ворнинги SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# --- КОНФИГУРАЦИЯ ---
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL = os.environ.get('SCAN_URL')
PROXY_URL = os.environ.get('PROXY_URL')
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL')

BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт']
URGENT_KEYWORDS = ['срочно', 'торг', 'сегодня', 'переезд', 'отдаю', 'дешево', 'быстро']

@dataclass
class HotDeal:
    url: str
    title: str
    price: int
    market_low: int
    buyout: int
    discount_percent: float
    model: str
    date: str
    ram: int
    ssd: int
    battery_cycles: Optional[int] = None
    is_urgent: bool = False

def clean_url(url: str) -> str:
    """Очищает URL от параметров (?slid, ?context и т.д.), оставляя только ID"""
    return url.split('?')[0]

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
        raw_p = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
        self.proxies = {"http": f"http://{raw_p}", "https": f"http://{raw_p}"} if raw_p else None
        
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    self.prices[(s['model_name'].lower(), s['ram'], s['ssd'])] = s

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Загружаем только чистые URL
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"Loaded {len(self.seen)} already seen ads")
            except: pass

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                time.sleep(12)
            except: pass

    def deep_analyze(self, url: str):
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
            resp = requests.get(url, headers=headers, proxies=self.proxies, timeout=15, verify=False)
            if resp.status_code != 200: return None, False
            soup = BeautifulSoup(resp.text, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""
            cycles = None
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if c_match: cycles = int(c_match.group(1))
            urgent = any(word in text for word in URGENT_KEYWORDS)
            return cycles, urgent
        except: return None, False

    def notify(self, d: HotDeal):
        if not TELEGRAM_URL: return
        status = "🚨 <b>СРОЧНО!</b> " if d.is_urgent else ""
        if d.battery_cycles and d.battery_cycles < 150: status += "🔋 <b>АКБ ИДЕАЛ!</b>"
        text = (
            f"🎯 <b>Нашел по НИЗУ рынка!</b>\n{status}\n\n"
            f"💻 {d.title}\n"
            f"⚙️ Конфиг: <b>{d.ram}GB / {d.ssd}GB</b>\n"
            f"💰 Цена: <b>{d.price:,} ₽</b>\n"
            f"📉 Низ рынка: {d.market_low:,} ₽\n"
            f"🤝 Твой выкуп: {d.buyout:,} ₽\n"
            f"⚡ Циклы: {d.battery_cycles if d.battery_cycles else 'не указано'}\n"
            f"🔗 <a href='{d.url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        except: pass

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Запуск сканирования...")
        
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        try:
            resp = requests.get(SCAN_URL, headers=headers, proxies=self.proxies, timeout=30, verify=False)
            if resp.status_code == 429:
                self.rotate_ip()
                resp = requests.get(SCAN_URL, headers=headers, proxies=self.proxies, timeout=30, verify=False)

            if resp.status_code != 200: return

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            new_ads_found = 0
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                    
                    # ГЛАВНОЕ ИСПРАВЛЕНИЕ: чистим URL перед проверкой
                    url = clean_url(raw_url)
                    
                    if url in self.seen:
                        continue
                    
                    raw_title = link_tag.get('title', '')
                    title_low = raw_title.lower()
                    if any(word in title_low for word in BAD_KEYWORDS):
                        continue

                    price = int(item.select_one('[itemprop="price"]')['content'])
                    ram, ssd = extract_specs(title_low)
                    
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        keywords = re.findall(r'[a-z0-9]+', m_name)
                        if all(word in title_low for word in keywords) and m_ram == ram and m_ssd == ssd:
                            market_low = stat['median_price']
                            if price <= market_low * 0.98:
                                cycles, urgent_desc = self.deep_analyze(raw_url)
                                deal = HotDeal(
                                    url=url, title=raw_title, price=price,
                                    market_low=market_low, buyout=stat['buyout_price'],
                                    discount_percent=round((1 - price/market_low)*100, 1),
                                    model=stat['model_name'], date="Только что",
                                    ram=ram, ssd=ssd, battery_cycles=cycles,
                                    is_urgent=(urgent_desc or any(word in title_low for word in URGENT_KEYWORDS))
                                )
                                self.notify(deal)
                                self.seen.add(url)
                                new_ads_found += 1
                                time.sleep(1)
                            break
                except: continue

            # Сохраняем историю (только если были новые)
            if new_ads_found > 0:
                SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                    json.dump({"updated_at": datetime.now().isoformat(), "seen_urls": list(self.seen)[-4000:]}, f)
                logger.info(f"Saved {new_ads_found} new ads to history.")

        except Exception as e:
            logger.error(f"💥 Ошибка: {e}")

if __name__ == "__main__":
    AvitoScanner().run()
