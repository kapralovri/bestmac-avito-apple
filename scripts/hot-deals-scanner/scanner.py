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
PROXY_URL = os.environ.get('PROXY_URL')
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL')

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
        # Очистка и форматирование прокси
        raw_p = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
        self.proxies = None
        if raw_p:
            p_str = raw_p if raw_p.startswith('http') else f"http://{raw_p}"
            self.proxies = {"http": p_str, "https": p_str}
            logger.info(f"🌐 Прокси загружен")

        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    name = s['model_name'].lower()
                    self.prices[(name, s['ram'], s['ssd'])] = s

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    self.seen = set(json.load(f).get('seen_urls', []))
            except: pass

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                logger.info("🔄 Ротация IP...")
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
        if not SCAN_URL: return
        logger.info(f"🎬 Старт сканирования...")
        
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        # ИСПРАВЛЕНО: Добавлен proxies=self.proxies
        try:
            resp = requests.get(SCAN_URL, headers=headers, proxies=self.proxies, timeout=30, verify=False)
            
            if resp.status_code == 429:
                logger.warning("⚠️ 429 ошибка. Пробуем сменить IP и повторить...")
                self.rotate_ip()
                resp = requests.get(SCAN_URL, headers=headers, proxies=self.proxies, timeout=30, verify=False)

            if resp.status_code != 200:
                logger.error(f"❌ Ошибка {resp.status_code}")
                return

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            logger.info(f"🔎 Найдено объявлений: {len(items)}")
            
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    raw_title = link_tag.get('title', '')
                    title_low = raw_title.lower()
                    url = urljoin("https://www.avito.ru", link_tag['href'])
                    
                    if url in self.seen: continue
                    price = int(item.select_one('[itemprop="price"]')['content'])
                    ram, ssd = extract_specs(title_low)
                    
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        keywords = re.findall(r'[a-z0-9]+', m_name)
                        if all(word in title_low for word in keywords) and m_ram == ram and m_ssd == ssd:
                            market_low = stat['median_price']
                            if price <= market_low * 0.98:
                                cycles, urgent_desc = self.deep_analyze(url)
                                self.notify(raw_title, price, market_low, stat['buyout_price'], ram, ssd, url, cycles, urgent_desc)
                                self.seen.add(url)
                                time.sleep(2)
                            break
                except: continue

            SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"seen_urls": list(self.seen)[-3000:]}, f)

        except Exception as e:
            logger.error(f"💥 Ошибка: {e}")

if __name__ == "__main__":
    AvitoScanner().run()
