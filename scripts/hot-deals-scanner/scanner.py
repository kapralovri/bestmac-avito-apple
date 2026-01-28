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

# --- КОНФИГУРАЦИЯ ---
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL = os.environ.get('SCAN_URL')
PROXY_URL = os.environ.get('PROXY_URL')
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL')

def clean_url(url: str) -> str:
    return url.split('?')[0]

def extract_specs(text: str):
    text = text.lower().replace(' ', '')
    matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    ram = 8
    ssd = 256
    clean_matches = [m for m in matches if not (2018 <= int(m) <= 2026)]
    if len(clean_matches) >= 2:
        ram = int(clean_matches[0])
        ssd_val = int(clean_matches[1])
        ssd = ssd_val * 1024 if ssd_val <= 8 else ssd_val
    elif len(clean_matches) == 1:
        val = int(clean_matches[0])
        if val in [8, 16, 18, 24, 32, 36, 48, 64]: ram = val
        else: ssd = val
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
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
            except: pass

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                logger.info("🔄 Прокси тормозит. Запрос на смену IP...")
                requests.get(CHANGE_IP_URL, timeout=20, verify=False)
                time.sleep(15)
            except: pass

    def get_with_retry(self, url, timeout=40):
        """Метод для выполнения запроса с 3 попытками"""
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        for attempt in range(3):
            try:
                resp = requests.get(url, headers=headers, proxies=self.proxies, timeout=timeout, verify=False)
                if resp.status_code == 200:
                    return resp
                if resp.status_code == 429:
                    self.rotate_ip()
            except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
                logger.warning(f"⚠️ Попытка {attempt+1} провалена: {e}")
                self.rotate_ip()
                time.sleep(5)
        return None

    def deep_analyze(self, url: str):
        resp = self.get_with_retry(url, timeout=25)
        if not resp: return None, False
        soup = BeautifulSoup(resp.text, 'lxml')
        desc = soup.find('div', attrs={'data-marker': 'item-description'})
        text = desc.get_text().lower() if desc else ""
        cycles = None
        c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
        if c_match: cycles = int(c_match.group(1))
        urgent = any(word in text for word in ['срочно', 'торг', 'сегодня', 'переезд'])
        return cycles, urgent

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Запуск сканирования...")
        
        resp = self.get_with_retry(SCAN_URL, timeout=60)
        if not resp:
            logger.error("❌ Не удалось загрузить страницу после 3 попыток")
            return

        soup = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено объявлений: {len(items)}")
        
        new_ads_found = 0
        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url = clean_url(raw_url)
                if url in self.seen: continue
                
                raw_title = link_tag.get('title', '')
                title_low = raw_title.lower()
                price = int(item.select_one('[itemprop="price"]')['content'])
                ram, ssd = extract_specs(title_low)
                
                matched_stat = None
                for (m_name, m_ram, m_ssd), stat in self.prices.items():
                    keywords = re.findall(r'[a-z0-9]+', m_name)
                    if all(word in title_low for word in keywords) and m_ram == ram and m_ssd == ssd:
                        matched_stat = stat
                        break
                
                if matched_stat:
                    market_low = matched_stat['min_price']
                    if price <= market_low * 1.03: # Порог 3% от низа рынка
                        logger.info(f"🔥 Попадание: {raw_title} за {price}")
                        cycles, urgent = self.deep_analyze(raw_url)
                        
                        text = (
                            f"🎯 <b>Нашел вариант по НИЗУ рынка!</b>\n\n"
                            f"💻 {raw_title}\n"
                            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
                            f"💰 Цена сейчас: <b>{price:,} ₽</b>\n"
                            f"📉 Низ рынка: {market_low:,} ₽\n"
                            f"🤝 Твой выкуп: {matched_stat['buyout_price']:,} ₽\n"
                            f"⚡ Циклы: {cycles if cycles else 'не указано'}\n"
                            f"🔗 <a href='{url}'>Открыть на Avito</a>"
                        )
                        requests.post(TELEGRAM_NOTIFY_URL if 'TELEGRAM_NOTIFY_URL' in os.environ else TELEGRAM_URL, 
                                      json={"text": text, "parse_mode": "HTML"}, timeout=10)
                        self.seen.add(url)
                        new_ads_found += 1
                        time.sleep(random.uniform(2, 4))
            except: continue

        if new_ads_found > 0:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"updated_at": datetime.now().isoformat(), "seen_urls": list(self.seen)[-4000:]}, f)

if __name__ == "__main__":
    AvitoScanner().run()
