#!/usr/bin/env python3
import json
import os
import re
import time
import random
import logging
import urllib3
from datetime import datetime
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
PROXY_URL = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

# УСЛОВИЯ
PRICE_THRESHOLD_FACTOR = 1.10 
URGENT_KEYWORDS = ['срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро', 'дисконт', 'возможен торг', 'отдам за']
BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт']

def clean_url(url: str) -> str:
    return url.split('?')[0]

def extract_specs(text: str):
    text = text.lower().replace(' ', '')
    matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    ram, ssd = 8, 256
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
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxies = {"http": p_str, "https": p_str} if p_str else None
        
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
                requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                time.sleep(12)
            except: pass

    def get_with_retry(self, url):
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        for attempt in range(2):
            try:
                resp = requests.get(url, headers=headers, proxies=self.proxies, timeout=25, verify=False)
                if resp.status_code == 200: return resp
                if resp.status_code in [403, 429]: self.rotate_ip()
            except: self.rotate_ip()
        return None

    def deep_analyze(self, url: str):
        """Заходит в объявление: ищет АКБ и Срочность одновременно"""
        resp = self.get_with_retry(url)
        if not resp: return None, False
        try:
            soup = BeautifulSoup(resp.text, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""
            
            # 1. Ищем циклы
            cycles = None
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if c_match: cycles = int(c_match.group(1))
            
            # 2. Ищем ключевые слова
            is_urgent = any(word in text for word in URGENT_KEYWORDS)
            
            return cycles, is_urgent
        except: return None, False

    def notify(self, title, price, market_low, buyout, ram, ssd, url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL: return
        
        badges = []
        if is_urgent: badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low: badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 150: badges.append("🔋 <b>АКБ ИДЕАЛ</b>")
        
        status_line = " | ".join(badges) if badges else "🎯 <b>Нашел подходящий вариант!</b>"
        
        text = (
            f"{status_line}\n\n"
            f"💻 {title}\n"
            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена сейчас: <b>{price:,} ₽</b>\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Твой выкуп: {buyout:,} ₽\n"
            f"⚡ Циклы: {cycles if cycles else 'не указано'}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10, proxies=None)
            logger.info(f"✅ Отправлено: {price} руб.")
        except: pass

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Запуск сканирования...")
        resp = self.get_with_retry(SCAN_URL)
        if not resp: return

        soup = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        
        found_matches = 0
        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url = clean_url(raw_url)
                if url in self.seen: continue

                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000: continue

                raw_title = link_tag.get('title', '')
                title_low = raw_title.lower()
                if any(word in title_low for word in BAD_KEYWORDS): continue

                ram, ssd = extract_specs(title_low)
                
                matched_stat = None
                for (m_name, m_ram, m_ssd), stat in self.prices.items():
                    keywords = re.findall(r'[a-z0-9]+', m_name)
                    if all(word in title_low for word in keywords) and m_ram == ram and m_ssd == ssd:
                        matched_stat = stat
                        break
                
                if matched_stat:
                    market_low = matched_stat['min_price']
                    badge_text = item.get_text().lower()
                    is_avito_low = "ниже рыночной" in badge_text or "цена ниже" in badge_text
                    
                    # Глубокий анализ
                    cycles, is_urgent = self.deep_analyze(raw_url)
                    
                    # УСЛОВИЯ ОТПРАВКИ: 
                    # 1. Цена низкая ИЛИ 2. Бейдж Авито ИЛИ 3. Ключевые слова
                    if price <= int(market_low * PRICE_THRESHOLD_FACTOR) or is_avito_low or is_urgent:
                        self.notify(raw_title, price, market_low, matched_stat['buyout_price'], ram, ssd, url, cycles, is_urgent, is_avito_low)
                        self.seen.add(url)
                        found_matches += 1
                        time.sleep(random.uniform(2, 4))
            except: continue

        if found_matches > 0:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"updated_at": datetime.now().isoformat(), "seen_urls": list(self.seen)[-4500:]}, f)

if __name__ == "__main__":
    AvitoScanner().run()
