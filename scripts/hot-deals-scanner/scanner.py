#!/usr/bin/env python3
import json
import os
import re
import time
import logging
from dataclasses import dataclass
from typing import Optional, Dict
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

# Настройка логов
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Scanner")

PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')

def extract_specs(text: str):
    """Вытаскивает RAM и SSD из текста"""
    text = text.lower().replace(' ', '')
    ram = 8 # дефолт
    ssd = 256 # дефолт
    
    ram_match = re.search(r'(8gb|16gb|24gb|32gb|64gb|128gb|8гб|16гб|24гб|32гб|64гб)', text)
    if ram_match: ram = int(re.sub(r'\D', '', ram_match.group(1)))
    
    ssd_match = re.search(r'(256gb|512gb|1tb|2tb|1тб|2тб|512гб|256гб)', text)
    if ssd_match:
        val = ssd_match.group(1)
        if 'tb' in val or 'тб' in val: ssd = int(re.sub(r'\D', '', val)) * 1024
        else: ssd = int(re.sub(r'\D', '', val))
            
    return ram, ssd

class HotScanner:
    def __init__(self):
        with open(PRICES_FILE, 'r') as f:
            data = json.load(f)
            # Ключ: (Модель, RAM, SSD)
            self.prices = {(s['model_name'], s['ram'], s['ssd']): s for s in data['stats']}
        
        self.seen = set()
        if SEEN_FILE.exists():
            with open(SEEN_FILE, 'r') as f: self.seen = set(json.load(f).get('seen_urls', []))

    def scan(self):
        url = os.environ.get('SCAN_URL')
        resp = requests.get(url, timeout=20)
        soup = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        
        for item in items:
            link = item.select_one('[data-marker="item-title"]')
            url = urljoin("https://www.avito.ru", link['href'])
            if url in self.seen: continue
            
            title = link.get('title')
            price = int(item.select_one('[itemprop="price"]')['content'])
            
            # 1. Определяем модель
            model_found = None
            for m_name in {k[0] for k in self.prices.keys()}:
                if m_name.lower().split('(')[0].strip() in title.lower():
                    model_found = m_name
                    break
            
            if not model_found: continue
            
            # 2. Определяем RAM/SSD (из заголовка)
            ram, ssd = extract_specs(title)
            
            # 3. Ищем в базе именно эту конфигу
            key = (model_found, ram, ssd)
            stat = self.prices.get(key)
            
            if stat:
                market_low = stat['median_price']
                # Если цена ниже "Низа рынка" на 5% и более - это повод рассмотреть
                if price <= market_low * 0.95:
                    discount = round((1 - price/market_low)*100, 1)
                    self.notify(title, price, market_low, stat['buyout_price'], ram, ssd, url)
                    self.seen.add(url)

    def notify(self, title, price, market_low, buyout, ram, ssd, url):
        text = (
            f"🎯 <b>Нашел вариант по НИЗУ рынка!</b>\n\n"
            f"💻 {title}\n"
            f"⚙️ Конфиг: {ram}GB / {ssd}GB\n"
            f"💰 Цена сейчас: <b>{price:,} ₽</b>\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Твой выкуп: {buyout:,} ₽\n\n"
            f"🔗 <a href='{url}'>Открыть объявление</a>"
        )
        requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"})

if __name__ == "__main__":
    scanner = HotScanner()
    scanner.scan()
    # Сохранение виденных...
