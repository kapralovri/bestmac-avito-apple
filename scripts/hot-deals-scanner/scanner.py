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

BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт']
URGENT_KEYWORDS = ['срочно', 'торг', 'сегодня', 'переезд', 'отдаю', 'дешево', 'быстро']

def clean_url(url: str) -> str:
    return url.split('?')[0]

def extract_specs(text: str):
    """
    Улучшенный парсер конфига. 
    Обычно на Авито пишут 'Модель RAM/SSD' или 'Модель RAM SSD'.
    """
    text = text.lower().replace(' ', '')
    # Ищем все числа, за которыми идет gb, гб, tb или тб
    matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    
    ram = 8
    ssd = 256
    
    # Исключаем из совпадений года (2020-2025)
    clean_matches = [m for m in matches if not (2018 <= int(m) <= 2026)]
    
    if len(clean_matches) >= 2:
        # Первое число - RAM, второе - SSD
        ram = int(clean_matches[0])
        ssd_val = int(clean_matches[1])
        # Если второе число маленькое (1, 2, 4, 8) - это Терабайты
        ssd = ssd_val * 1024 if ssd_val <= 8 else ssd_val
    elif len(clean_matches) == 1:
        # Если только одно число, пытаемся понять RAM это или SSD
        val = int(clean_matches[0])
        if val in [8, 16, 18, 24, 32, 36, 48, 64]:
            ram = val
        else:
            ssd = val
            
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
                    # Сохраняем статистику: ключ (модель_ловер, ram, ssd)
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
        
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
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

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Запуск сканирования...")
        
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        try:
            resp = requests.get(SCAN_URL, headers=headers, proxies=self.proxies, timeout=30, verify=False)
            if resp.status_code != 200: return
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                    url = clean_url(raw_url)
                    
                    if url in self.seen: continue
                    
                    raw_title = link_tag.get('title', '')
                    title_low = raw_title.lower()
                    if any(word in title_low for word in BAD_KEYWORDS): continue

                    price = int(item.select_one('[itemprop="price"]')['content'])
                    
                    # ПРАВИЛЬНОЕ ОПРЕДЕЛЕНИЕ КОНФИГА
                    ram, ssd = extract_specs(title_low)
                    
                    # ПОИСК В БАЗЕ
                    matched_stat = None
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        keywords = re.findall(r'[a-z0-9]+', m_name)
                        # Проверяем модель + СТРОГО RAM + СТРОГО SSD
                        if all(word in title_low for word in keywords) and m_ram == ram and m_ssd == ssd:
                            matched_stat = stat
                            break
                    
                    if matched_stat:
                        market_low = matched_stat['min_price'] # Используем min_price (Низ рынка)
                        if price <= market_low * 1.02: # Уведомляем, если цена около или ниже "Низа"
                            cycles, urgent_desc = self.deep_analyze(raw_url)
                            
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
                            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
                            self.seen.add(url)
                            time.sleep(2)
                except: continue

            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"updated_at": datetime.now().isoformat(), "seen_urls": list(self.seen)[-4000:]}, f)

        except Exception as e:
            logger.error(f"💥 Ошибка: {e}")

if __name__ == "__main__":
    AvitoScanner().run()
