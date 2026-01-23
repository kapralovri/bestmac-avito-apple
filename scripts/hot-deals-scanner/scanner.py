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

# Отключаем ворнинги SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Install requirements: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# --- КОНФИГУРАЦИЯ ---
SCAN_URL = os.environ.get('SCAN_URL')
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")

URGENT_KEYWORDS = ['срочно', 'торг', 'сегодня', 'переезд', 'отдаю', 'дешево', 'быстро']
BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт']

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

def extract_specs(text: str):
    """Улучшенное определение RAM и SSD (защита от путаницы с годом)"""
    text = text.lower().replace(' ', '')
    
    # Ищем RAM
    ram = 8
    ram_match = re.search(r'\b(8|16|18|24|32|36|48|64|96|128)(?:gb|гб)\b', text)
    if ram_match:
        ram = int(ram_match.group(1))
    
    # Ищем SSD (игнорируем годы 2010-2025)
    ssd = 256
    ssd_matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    for val_str in ssd_matches:
        val = int(val_str)
        if 2010 <= val <= 2026: continue # Пропускаем года
        if val in [128, 256, 512, 1, 2, 4]: # Типичные объемы
            if val <= 8: # Это терабайты
                ssd = val * 1024
            else:
                ssd = val
            break
    return ram, ssd

class AvitoScanner:
    def __init__(self):
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    # Ключ: (Модель_ловер, RAM, SSD)
                    name = s['model_name'].lower()
                    self.prices[(name, s['ram'], s['ssd'])] = s
        
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    self.seen = set(json.load(f).get('seen_urls', []))
            except: pass

    def deep_analyze(self, url: str):
        """Заходит внутрь объявления для поиска циклов и срочности"""
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code != 200: return None, False
            
            soup = BeautifulSoup(resp.text, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""
            
            cycles = None
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if c_match: cycles = int(c_match.group(1))
            
            urgent = any(word in text for word in URGENT_KEYWORDS)
            return cycles, urgent
        except:
            return None, False

    def notify(self, d: HotDeal):
        if not TELEGRAM_URL: return
        
        status = ""
        if d.is_urgent: status += "🚨 <b>СРОЧНО</b> "
        if d.battery_cycles and d.battery_cycles < 150: status += "🔋 <b>АКБ ИДЕАЛ</b>"
        
        text = (
            f"🎯 <b>Нашел вариант по НИЗУ рынка!</b>\n{status}\n\n"
            f"💻 {d.title}\n"
            f"⚙️ Конфиг: <b>{d.ram}GB / {d.ssd}GB</b>\n"
            f"💰 Цена сейчас: <b>{d.price:,} ₽</b>\n"
            f"📉 Низ рынка: {d.market_low:,} ₽\n"
            f"🤝 Твой выкуп: {d.buyout:,} ₽\n"
            f"⚡ Циклы: {d.battery_cycles if d.battery_cycles else 'не указано'}\n"
            f"🕒 {d.date}\n\n"
            f"🔗 <a href='{d.url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        except: pass

    def run(self):
        if not SCAN_URL: return
        logger.info("🎬 Старт сканирования...")
        
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = requests.get(SCAN_URL, headers=headers, timeout=30)
            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            
            for item in items:
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    raw_title = link_tag.get('title', '')
                    title_low = raw_title.lower()
                    url = urljoin("https://www.avito.ru", link_tag['href'])
                    
                    if url in self.seen: continue
                    if any(word in title_low for word in BAD_KEYWORDS): continue

                    price = int(item.select_one('[itemprop="price"]')['content'])
                    ram, ssd = extract_specs(title_low)
                    
                    # СТРОГИЙ ПОИСК МОДЕЛИ
                    matched_stat = None
                    for (m_name, m_ram, m_ssd), stat in self.prices.items():
                        # Разбиваем имя из базы (напр. "macbook air 13 (2020, m1)") на слова
                        keywords = re.findall(r'[a-z0-9]+', m_name)
                        # Проверяем, что ВСЕ слова (2020, m1 и т.д.) есть в заголовке Авито
                        if all(word in title_low for word in keywords):
                            if m_ram == ram and m_ssd == ssd:
                                matched_stat = stat
                                break
                    
                    if matched_stat:
                        market_low = matched_stat['median_price']
                        # Если цена реально вкусная (ниже твоего порога плотности)
                        if price <= market_low * 0.98:
                            logger.info(f"🔥 Попадание! {raw_title} за {price}")
                            
                            cycles, urgent_desc = self.deep_analyze(url)
                            urgent_title = any(word in title_low for word in URGENT_KEYWORDS)
                            
                            date_tag = item.select_one('[data-marker="item-date"]')
                            date_str = date_tag.get_text().strip() if date_tag else "Только что"

                            deal = HotDeal(
                                url=url, title=raw_title, price=price,
                                market_low=market_low, buyout=matched_stat['buyout_price'],
                                discount_percent=round((1 - price/market_low)*100, 1),
                                model=matched_stat['model_name'], date=date_str,
                                ram=ram, ssd=ssd, battery_cycles=cycles,
                                is_urgent=(urgent_title or urgent_desc)
                            )
                            self.notify(deal)
                            self.seen.add(url)
                            time.sleep(random.uniform(2, 4)) # Пауза после глубокого анализа
                except Exception as e:
                    continue

            # Сохранение истории
            SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"seen_urls": list(self.seen)[-3000:]}, f)

        except Exception as e:
            logger.error(f"💥 Ошибка: {e}")

if __name__ == "__main__":
    AvitoScanner().run()
