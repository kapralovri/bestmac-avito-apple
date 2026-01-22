#!/usr/bin/env python3
import json
import os
import re
import time
import random
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, List, Set, Dict
from pathlib import Path
from urllib.parse import urljoin

try:
    from curl_cffi import requests as cffi_requests
    HAS_CFFI = True
except ImportError:
    import requests as cffi_requests
    HAS_CFFI = False

from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AvitoScanner")

# --- КОНФИГУРАЦИЯ ---
SCAN_URL = os.environ.get('SCAN_URL')
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
PROXY_URL = os.environ.get('PROXY_URL')
PROXY_CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL') 

HOT_DEAL_THRESHOLD = 0.90
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_DEALS_FILE = Path("public/data/seen-hot-deals.json")

IMPERSONATE = "chrome120"
TIMEOUT = 30
MAX_RETRIES = 3

@dataclass
class HotDeal:
    url: str
    title: str
    price: int
    median_price: int
    discount_percent: float
    model: str
    found_at: str

class AvitoScanner:
    def __init__(self):
        self.session = cffi_requests.Session()
        self.prices_db = self._load_prices()
        self.seen_deals = self._load_seen()
        
    def _load_prices(self) -> Dict[str, int]:
        if not PRICES_FILE.exists():
            logger.warning(f"⚠️ База цен не найдена: {PRICES_FILE}")
            return {}
        try:
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            prices = {}
            for stat in data.get('stats', []):
                name = stat.get('model_name')
                median = stat.get('median_price')
                if name and median:
                    prices[name] = median
            logger.info(f"📊 Загружено {len(prices)} моделей цен")
            return prices
        except Exception as e:
            logger.error(f"❌ Ошибка чтения базы цен: {e}")
            return {}

    def _load_seen(self) -> Set[str]:
        if not SEEN_DEALS_FILE.exists():
            return set()
        try:
            with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
                content = json.load(f)
                return set(content.get('seen_urls', []))
        except Exception:
            return set()

    def _save_seen(self):
        try:
            SEEN_DEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            # Оставляем последние 2000 ссылок
            list_urls = list(self.seen_deals)
            keep_urls = list_urls[-2000:]
            with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    'updated_at': datetime.now().isoformat(), 
                    'seen_urls': keep_urls
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Ошибка сохранения истории: {e}")

    def _rotate_ip(self):
        if PROXY_CHANGE_IP_URL:
            try:
                logger.info("🔄 Вызов API смены IP...")
                import requests
                # Смена IP делается без прокси прямым запросом
                requests.get(PROXY_CHANGE_IP_URL, timeout=15)
                logger.info("⏳ Пауза 15 сек для смены IP...")
                time.sleep(15) 
            except Exception as e:
                logger.error(f"Ошибка при смене IP: {e}")
                time.sleep(10)
        else:
            logger.warning("⏳ Ссылка для смены IP не задана, просто ждем...")
            time.sleep(20)

    def get_page(self, url: str) -> Optional[str]:
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
        
        for attempt in range(MAX_RETRIES):
            try:
                if HAS_CFFI:
                    resp = self.session.get(
                        url, 
                        impersonate=IMPERSONATE, 
                        proxies=proxies, 
                        timeout=TIMEOUT,
                        allow_redirects=True
                    )
                else:
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'ru-RU,ru;q=0.9',
                    }
                    resp = self.session.get(url, headers=headers, proxies=proxies, timeout=TIMEOUT)

                if resp.status_code == 200:
                    if "firewall" in resp.text.lower() or "доступ ограничен" in resp.text.lower():
                        logger.warning("⚠️ Капча/Блок обнаружен. Меняем IP...")
                        self._rotate_ip()
                        continue
                    return resp.text
                
                elif resp.status_code in [403, 429]:
                    logger.warning(f"⚠️ Блокировка {resp.status_code}. Меняем IP...")
                    self._rotate_ip()
                    continue
                else:
                    logger.error(f"HTTP Error {resp.status_code}")
                    self._rotate_ip()
            
            except Exception as e:
                logger.error(f"Сетевая ошибка: {e}")
                self._rotate_ip()
        
        return None

    def parse_listings(self, html: str) -> List[dict]:
        soup = BeautifulSoup(html, 'lxml')
        items = []
        listing_blocks = soup.find_all('div', attrs={'data-marker': 'item'})
        
        for block in listing_blocks:
            try:
                link_tag = block.find('a', attrs={'data-marker': 'item-title'})
                if not link_tag: continue
                    
                title = link_tag.get('title', '').strip()
                url = urljoin("https://www.avito.ru", link_tag.get('href', ''))
                
                price_meta = block.find('meta', attrs={'itemprop': 'price'})
                if price_meta:
                    price = int(price_meta.get('content', 0))
                else:
                    price_tag = block.find('p', attrs={'data-marker': 'item-price'})
                    price_text = price_tag.get_text() if price_tag else "0"
                    price = int(re.sub(r'\D', '', price_text) or 0)

                if price < 5000: continue
                items.append({'url': url, 'title': title, 'price': price})
            except: continue
                
        logger.info(f"📦 Распарсено {len(items)} объявлений")
        return items

    def extract_model(self, title: str) -> Optional[str]:
        t = title.lower()
        patterns = [
            (r'macbook\s*pro\s*16.*m4\s*max', 'MacBook Pro 16 (2024, M4 Max)'),
            (r'macbook\s*pro\s*16.*m4\s*pro', 'MacBook Pro 16 (2024, M4 Pro)'),
            (r'macbook\s*pro\s*16.*m3\s*max', 'MacBook Pro 16 (2023, M3 Max)'),
            (r'macbook\s*pro\s*16.*m3\s*pro', 'MacBook Pro 16 (2023, M3 Pro)'),
            (r'macbook\s*pro\s*16.*m2\s*max', 'MacBook Pro 16 (2023, M2 Max)'),
            (r'macbook\s*pro\s*16.*m2\s*pro', 'MacBook Pro 16 (2023, M2 Pro)'),
            (r'macbook\s*pro\s*16.*m1\s*max', 'MacBook Pro 16 (2021, M1 Max)'),
            (r'macbook\s*pro\s*16.*m1\s*pro', 'MacBook Pro 16 (2021, M1 Pro)'),
            (r'macbook\s*pro\s*14.*m3\s*max', 'MacBook Pro 14 (2023, M3 Max)'),
            (r'macbook\s*pro\s*14.*m3\s*pro', 'MacBook Pro 14 (2023, M3 Pro)'),
            (r'macbook\s*pro\s*14.*m3', 'MacBook Pro 14 (2023, M3)'),
            (r'macbook\s*pro\s*14.*m2', 'MacBook Pro 14 (2023, M2)'),
            (r'macbook\s*pro\s*14.*m1', 'MacBook Pro 14 (2021, M1)'),
            (r'macbook\s*pro\s*13.*m2', 'MacBook Pro 13 (2022, M2)'),
            (r'macbook\s*pro\s*13.*m1', 'MacBook Pro 13 (2020, M1)'),
            (r'macbook\s*air\s*15.*m3', 'MacBook Air 15 (2024, M3)'),
            (r'macbook\s*air\s*15.*m2', 'MacBook Air 15 (2023, M2)'),
            (r'macbook\s*air\s*13.*m3', 'MacBook Air 13 (2024, M3)'),
            (r'macbook\s*air\s*13.*m2', 'MacBook Air 13 (2022, M2)'),
            (r'macbook\s*air.*m1', 'MacBook Air 13 (2020, M1)'),
        ]
        for pattern, model in patterns:
            if re.search(pattern, t): return model
        return None

    def find_deals(self, listings: List[dict]) -> List[HotDeal]:
        deals = []
        for item in listings:
            if item['url'] in self.seen_deals: continue
            model = self.extract_model(item['title'])
            if not model: continue
            median = self.prices_db.get(model)
            if not median: continue
            if item['price'] < (median * 0.4): continue
            
            if item['price'] <= (median * HOT_DEAL_THRESHOLD):
                discount = (1 - item['price'] / median) * 100
                deals.append(HotDeal(
                    url=item['url'], title=item['title'], price=item['price'],
                    median_price=median, discount_percent=round(discount, 1),
                    model=model, found_at=datetime.now().isoformat()
                ))
        return deals

    def send_notifications(self, deals: List[HotDeal]):
        """Отправка уведомлений в Telegram"""
        if not deals or not TELEGRAM_URL: 
            logger.warning("⚠️ Нет уведомлений для отправки или URL пуст")
            return

        import requests
        for deal in deals:
            try:
                # Экранируем спецсимволы, чтобы HTML не ломался
                safe_title = deal.title.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')
                
                text = (
                    f"🔥 <b>HOT DEAL: {deal.model}</b>\n"
                    f"💰 Цена: <b>{deal.price:,} ₽</b>\n"
                    f"📉 Медиана: {deal.median_price:,} ₽ (Выгода {deal.discount_percent}%)\n"
                    f"🔗 <a href='{deal.url}'>Открыть объявление</a>"
                )
                
                payload = {
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": False
                }
                
                resp = requests.post(TELEGRAM_URL, json=payload, timeout=15)
                
                if resp.status_code != 200:
                    logger.error(f"❌ Telegram Error {resp.status_code}: {resp.text}")
                else:
                    logger.info(f"✅ Доставлено: {deal.model}")
                
            except Exception as e:
                logger.error(f"❌ Ошибка отправки: {e}")

    def run(self):
        if not self.prices_db:
            logger.error("❌ База цен пуста. Скрипт остановлен.")
            return

        logger.info("🎬 Запуск сканирования...")
        html = self.get_page(SCAN_URL)
        if html:
            listings = self.parse_listings(html)
            hot_deals = self.find_deals(listings)
            
            if hot_deals:
                logger.info(f"🔥 Найдено новых сделок: {len(hot_deals)}")
                self.send_notifications(hot_deals)
                for d in hot_deals:
                    self.seen_deals.add(d.url)
                self._save_seen()
            else:
                logger.info("🤷 Ничего интересного не найдено")
        else:
            logger.error("❌ Не удалось получить данные с Avito")

if __name__ == "__main__":
    AvitoScanner().run()
