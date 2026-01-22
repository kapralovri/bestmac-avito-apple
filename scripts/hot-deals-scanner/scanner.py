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
    from curl_cffi import requests as cffi_requests
    HAS_CFFI = True
except ImportError:
    import requests as cffi_requests
    HAS_CFFI = False

from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AvitoScanner")

# --- КОНФИГУРАЦИЯ ---
SCAN_URL = os.environ.get('SCAN_URL')
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
PROXY_URL = os.environ.get('PROXY_URL')
PROXY_CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL')

HOT_DEAL_THRESHOLD = 0.94 
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_DEALS_FILE = Path("public/data/seen-hot-deals.json")

# Ключевые слова
URGENT_KEYWORDS = ['срочно', 'торг', 'сегодня', 'переезд', 'отдаю', 'дешево']
BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт']

@dataclass
class HotDeal:
    url: str
    title: str
    price: int
    median_price: int
    discount_percent: float
    model: str
    date: str
    battery_cycles: Optional[int] = None
    is_urgent: bool = False

class AvitoScanner:
    def __init__(self):
        self.session = cffi_requests.Session()
        self.prices_db = self._load_prices()
        self.seen_deals = self._load_seen()

    def _load_prices(self):
        if not PRICES_FILE.exists(): return {}
        try:
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {s['model_name']: s['median_price'] for s in data.get('stats', [])}
        except: return {}

    def _load_seen(self):
        if not SEEN_DEALS_FILE.exists(): return set()
        try:
            with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f).get('seen_urls', []))
        except: return set()

    def _save_seen(self):
        SEEN_DEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
        keep_urls = list(self.seen_deals)[-3000:]
        with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
            json.dump({'updated_at': datetime.now().isoformat(), 'seen_urls': keep_urls}, f)

    def _rotate_ip(self):
        if PROXY_CHANGE_IP_URL:
            try:
                import requests
                requests.get(PROXY_CHANGE_IP_URL, timeout=20, verify=False)
                time.sleep(15)
            except: pass

    def get_page(self, url: str):
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
        for _ in range(3):
            try:
                # Используем impersonate для обхода защиты
                resp = self.session.get(url, impersonate="chrome120", proxies=proxies, timeout=30)
                if resp.status_code == 200: return resp.text
                self._rotate_ip()
            except: self._rotate_ip()
        return None

    def analyze_description(self, url: str):
        """Заходит внутй объявления для поиска АКБ и Срочности"""
        html = self.get_page(url)
        if not html: return None, False
        
        soup = BeautifulSoup(html, 'lxml')
        desc = soup.find('div', attrs={'data-marker': 'item-description'})
        text = desc.get_text().lower() if desc else ""
        
        # Поиск циклов АКБ (ищем цифры рядом со словами цикл, cycle, акб)
        cycles = None
        cycles_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
        if cycles_match:
            cycles = int(cycles_match.group(1))
            
        # Проверка на срочность в описании
        is_urgent = any(word in text for word in URGENT_KEYWORDS)
        
        return cycles, is_urgent

    def extract_model(self, title: str):
        t = title.lower()
        if any(word in t for word in BAD_KEYWORDS): return None
        patterns = [
            (r'16.*m([1-4])\s*(max|pro)?', 'MacBook Pro 16'),
            (r'14.*m([1-4])\s*(max|pro)?', 'MacBook Pro 14'),
            (r'15.*m([2-3])', 'MacBook Air 15'),
            (r'13.*m([1-3])', 'MacBook Air 13'),
            (r'air.*m1', 'MacBook Air 13 (2020, M1)'),
        ]
        # Для простоты вернем упрощенную модель или полную из твоего списка
        for pattern, model in patterns:
            if re.search(pattern, t): return model
        return None

    def run(self):
        html = self.get_page(SCAN_URL)
        if not html: return
        
        soup = BeautifulSoup(html, 'lxml')
        blocks = soup.find_all('div', attrs={'data-marker': 'item'})
        
        for block in blocks:
            try:
                link_tag = block.find('a', attrs={'data-marker': 'item-title'})
                url = urljoin("https://www.avito.ru", link_tag.get('href', ''))
                if url in self.seen_deals: continue

                title = link_tag.get('title', '').strip()
                model = self.extract_model(title)
                if not model: continue

                price_tag = block.find('meta', attrs={'itemprop': 'price'})
                price = int(price_tag.get('content', 0)) if price_tag else 0
                
                # Проверяем медиану
                median = None
                # Ищем точное совпадение модели в БД цен
                for m_name, m_price in self.prices_db.items():
                    if m_name.lower() in title.lower():
                        median = m_price
                        model = m_name
                        break
                
                if median and price > (median * 0.4) and price <= (median * HOT_DEAL_THRESHOLD):
                    # ГОРЯЧО! Делаем детальный анализ
                    logger.info(f"🔎 Глубокий анализ: {title}")
                    cycles, is_urgent_desc = self.analyze_description(url)
                    
                    is_urgent_title = any(word in title.lower() for word in URGENT_KEYWORDS)
                    discount = round((1 - price / median) * 100, 1)
                    
                    deal = HotDeal(
                        url=url, title=title, price=price, median_price=median,
                        discount_percent=discount, model=model, date="Только что",
                        battery_cycles=cycles, is_urgent=(is_urgent_title or is_urgent_desc)
                    )
                    self.notify(deal)
                    self.seen_deals.add(url)
            except Exception as e:
                continue
        self._save_seen()

    def notify(self, d: HotDeal):
        if not TELEGRAM_URL: return
        
        # Формируем значки
        status_icons = ""
        if d.is_urgent: status_icons += "🚨 СРОЧНО! "
        if d.battery_cycles and d.battery_cycles < 100: status_icons += "🔋 АКБ ИДЕАЛ! "
        
        text = (
            f"{status_icons}\n"
            f"🔥 <b>{d.model}</b>\n"
            f"💰 Цена: <b>{d.price:,} ₽</b>\n"
            f"📉 Выгода: {d.discount_percent}% (Рынок: {d.median_price:,})\n"
            f"⚡ АКБ: {f'{d.battery_cycles} циклов' if d.battery_cycles else 'не указано'}\n"
            f"🔗 <a href='{d.url}'>Открыть на Avito</a>"
        )
        import requests
        requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"})

if __name__ == "__main__":
    AvitoScanner().run()
