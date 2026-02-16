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

# Порог: 10% от низа рынка
PRICE_THRESHOLD_FACTOR = 1.10 

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
                stats = data.get('stats', [])
                for s in stats:
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
                logger.info(f"📊 База цен загружена: {len(self.prices)} конфигураций")
        else:
            logger.error("❌ Файл avito-prices.json не найден!")

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
                logger.info("🔄 Смена IP...")
                requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                time.sleep(15)
            except: pass

    def get_with_retry(self, url):
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        for attempt in range(3):
            try:
                resp = requests.get(url, headers=headers, proxies=self.proxies, timeout=30, verify=False)
                if resp.status_code == 200: return resp
                if resp.status_code in [403, 429]: self.rotate_ip()
            except:
                self.rotate_ip()
                time.sleep(5)
        return None

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Запуск сканирования...")
        
        resp = self.get_with_retry(SCAN_URL)
        if not resp:
            logger.error("❌ Не удалось получить SCAN_URL")
            return

        soup = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        
        total_found = len(items)
        model_matches = 0
        price_matches = 0
        new_ads_saved = 0

        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url = clean_url(raw_url)
                
                # Проверка на дубли
                if url in self.seen: continue

                # Проверка на бейдж "Ниже рыночной" (ищем текст во всем блоке)
                full_text = item.get_text().lower()
                is_avito_low = any(x in full_text for x in ["ниже рыночной", "цена ниже", "хорошая цена"])

                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000: continue

                raw_title = link_tag.get('title', '')
                ram, ssd = extract_specs(raw_title.lower())
                
                # Ищем модель в базе
                matched_stat = None
                for (m_name, m_ram, m_ssd), stat in self.prices.items():
                    keywords = re.findall(r'[a-z0-9]+', m_name)
                    if all(word in raw_title.lower() for word in keywords) and m_ram == ram and m_ssd == ssd:
                        matched_stat = stat
                        break
                
                if matched_stat:
                    model_matches += 1
                    market_low = matched_stat['min_price']
                    
                    # Логика уведомления
                    is_match = False
                    if price <= int(market_low * PRICE_THRESHOLD_FACTOR): is_match = True
                    if is_avito_low: is_match = True # Бейдж Авито — приоритет

                    if is_match:
                        price_matches += 1
                        logger.info(f"🔥 Попадание! {price} руб. (Badge: {is_avito_low})")
                        
                        # Сообщение в TG
                        badge_status = "📉 <b>Авито: Ниже рынка!</b>\n" if is_avito_low else ""
                        text = (
                            f"🎯 <b>Нашел вариант!</b>\n{badge_status}\n"
                            f"💻 {raw_title}\n"
                            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
                            f"💰 Цена: <b>{price:,} ₽</b>\n"
                            f"📉 Низ рынка: {market_low:,} ₽\n"
                            f"🤝 Твой выкуп: {matched_stat['buyout_price']:,} ₽\n"
                            f"🔗 <a href='{url}'>Открыть на Avito</a>"
                        )
                        requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10, proxies=None)
                        
                        self.seen.add(url)
                        new_ads_saved += 1
            except: continue

        # ИТОГОВЫЙ ОТЧЕТ В ЛОГИ
        logger.info(f"🏁 Итог: Проверено {total_found} объявлений.")
        logger.info(f"   - Совпало моделей: {model_matches}")
        logger.info(f"   - Подошло по цене: {price_matches}")

        if price_matches == 0:
            logger.info("🤷 Ничего интересного в этом запуске не найдено.")

        if new_ads_saved > 0:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"updated_at": datetime.now().isoformat(), "seen_urls": list(self.seen)[-4000:]}, f)

if __name__ == "__main__":
    AvitoScanner().run()
