#!/usr/bin/env python3
""" 
Hot Deals Scanner v2 (Avito)
Использует curl_cffi для обхода TLS-блокировок и BeautifulSoup для надежного парсинга.
"""
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

# Сторонние библиотеки (нужно установить: pip install curl_cffi beautifulsoup4 lxml)
try:
    from curl_cffi import requests as cffi_requests
    HAS_CFFI = True
except ImportError:
    import requests as cffi_requests # Fallback, но не рекомендуется для Авито
    HAS_CFFI = False
    print("⚠️ ВНИМАНИЕ: curl_cffi не найден. Используется обычный requests. Возможны блокировки 403/429.")
    print("👉 Рекомендуется установить: pip install curl_cffi")

from bs4 import BeautifulSoup

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AvitoScanner")

# --- КОНФИГУРАЦИЯ ---
DEFAULT_SCAN_URL = "https://www.avito.ru/moskva_i_mo/noutbuki/apple/b_u-ASgBAgICAkTwvA2I0jSo5A302WY?cd=1&f=ASgBAQICAkTwvA2I0jSo5A302WYBQJ7kDdTIn7YVvLGeFajjlxXCmZYVsNjvEdTY7xGc2O8RsqPEEZKjxBGOza0QmM2tEKaaxhDWzK0Q&localPriority=1&q=macbook&s=104"
SCAN_URL = os.environ.get('SCAN_URL', DEFAULT_SCAN_URL)
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL') # URL вебхука или API
PROXY_URL = os.environ.get('PROXY_URL') # формат: http://user:pass@host:port
PROXY_CHANGE_IP_URL = os.environ.get('PROXY_CHANGE_IP_URL') # Ссылка для ротации IP

HOT_DEAL_THRESHOLD = 0.90  # Искать скидку 10% и более
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_DEALS_FILE = Path("public/data/seen-hot-deals.json")

# Настройки запросов
IMPERSONATE = "chrome120" # Маскировка под Chrome 120
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
        """Загрузка базы цен"""
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
                    # Логика: берем минимальную медиану, если модель дублируется
                    if name not in prices or median < prices[name]:
                        prices[name] = median
            logger.info(f"📊 Загружено {len(prices)} моделей цен")
            return prices
        except Exception as e:
            logger.error(f"❌ Ошибка чтения базы цен: {e}")
            return {}

    def _load_seen(self) -> Set[str]:
        """Загрузка истории отправленных"""
        if not SEEN_DEALS_FILE.exists():
            return set()
        try:
            with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f).get('seen_urls', []))
        except Exception:
            return set()

    def _save_seen(self):
        """Сохранение истории"""
        try:
            SEEN_DEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            # Оставляем только последние 2000, чтобы файл не распухал
            keep_urls = list(self.seen_deals)[-2000:]
            with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
                json.dump({'updated_at': datetime.now().isoformat(), 'seen_urls': keep_urls}, f)
        except Exception as e:
            logger.error(f"Ошибка сохранения seen_deals: {e}")

    def _rotate_ip(self):
        """Логика смены IP"""
        if PROXY_CHANGE_IP_URL:
            try:
                logger.info("🔄 Вызов API смены IP...")
                cffi_requests.get(PROXY_CHANGE_IP_URL, timeout=10)
                time.sleep(10) # Ждем применения
            except Exception as e:
                logger.error(f"Ошибка смены IP: {e}")
        else:
            logger.info("⏳ Пауза для 'остывания' (нет API смены IP)...")
            time.sleep(random.uniform(20, 40))

    def get_page(self, url: str) -> Optional[str]:
        """Скачивание страницы с маскировкой"""
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
        
        for attempt in range(MAX_RETRIES):
            try:
                # Если используем curl_cffi
                if HAS_CFFI:
                    resp = self.session.get(
                        url, 
                        impersonate=IMPERSONATE, 
                        proxies=proxies, 
                        timeout=TIMEOUT,
                        allow_redirects=True
                    )
                else:
                    # Обычный requests (нужны заголовки)
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'ru-RU,ru;q=0.9',
                    }
                    resp = self.session.get(url, headers=headers, proxies=proxies, timeout=TIMEOUT)

                if resp.status_code == 200:
                    # Проверка на софт-бан (капчу в контенте)
                    if "firewall" in resp.text.lower() or "доступ ограничен" in resp.text.lower():
                        logger.warning("⚠️ Получена страница с капчей (Soft Block)")
                        self._rotate_ip()
                        continue
                    return resp.text
                
                elif resp.status_code in [403, 429]:
                    logger.warning(f"⚠️ Блокировка {resp.status_code}. Меняем IP...")
                    self._rotate_ip()
                    continue
                else:
                    logger.error(f"Ошибка HTTP {resp.status_code}")
            
            except Exception as e:
                logger.error(f"Ошибка сети: {e}")
                time.sleep(5)
        
        return None

    def parse_listings(self, html: str) -> List[dict]:
        """Парсинг через BeautifulSoup"""
        soup = BeautifulSoup(html, 'lxml')
        items = []
        
        # Авито использует атрибуты data-marker для элементов
        # data-marker="item" - само объявление
        listing_blocks = soup.find_all('div', attrs={'data-marker': 'item'})
        
        for block in listing_blocks:
            try:
                # Ссылка и название
                link_tag = block.find('a', attrs={'data-marker': 'item-title'})
                if not link_tag:
                    continue
                    
                title = link_tag.get('title', '').strip()
                href = link_tag.get('href', '')
                url = urljoin("https://www.avito.ru", href)
                
                # Цена
                price_meta = block.find('meta', attrs={'itemprop': 'price'})
                if price_meta:
                    price = int(price_meta.get('content', 0))
                else:
                    # Fallback поиск цены текстом
                    price_tag = block.find('p', attrs={'data-marker': 'item-price'})
                    if not price_tag:
                        # Иногда цена в другом блоке
                        price_tag = block.find('strong', class_=re.compile('styles-module-root'))
                    
                    price_text = price_tag.get_text() if price_tag else "0"
                    price = int(re.sub(r'\D', '', price_text) or 0)

                # Фильтр явного мусора
                if price < 10000: 
                    continue
                    
                items.append({
                    'url': url,
                    'title': title,
                    'price': price
                })
                
            except Exception as e:
                continue
                
        logger.info(f"📦 Распарсено {len(items)} объявлений")
        return items

    def extract_model(self, title: str) -> Optional[str]:
        """Определение модели из заголовка"""
        t = title.lower()
        
        # Словарь паттернов: (regex, model_name)
        # Порядок важен: от более длинных/специфичных к коротким
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
            if re.search(pattern, t):
                return model
        return None

    def find_deals(self, listings: List[dict]) -> List[HotDeal]:
        deals = []
        for item in listings:
            if item['url'] in self.seen_deals:
                continue
                
            model = self.extract_model(item['title'])
            if not model:
                continue
                
            median = self.prices_db.get(model)
            if not median:
                continue
                
            # Проверка цены
            # Если цена слишком низкая (например, < 40% от медианы), это часто скам или запчасти
            if item['price'] < (median * 0.4):
                continue
                
            threshold = median * HOT_DEAL_THRESHOLD
            
            if item['price'] <= threshold:
                discount = (1 - item['price'] / median) * 100
                deals.append(HotDeal(
                    url=item['url'],
                    title=item['title'],
                    price=item['price'],
                    median_price=median,
                    discount_percent=round(discount, 1),
                    model=model,
                    found_at=datetime.now().isoformat()
                ))
        return deals

    def send_notifications(self, deals: List[HotDeal]):
        if not deals:
            return

        logger.info(f"🚀 Отправка {len(deals)} уведомлений...")
        
        # Если URL телеграма не задан, просто выводим в консоль
        if not TELEGRAM_URL:
            for d in deals:
                print(f"🔔 [SIMULATION] {d.model} за {d.price} (Скидка {d.discount_percent}%) -> {d.url}")
            return

        for deal in deals:
            try:
                # Формируем красивое сообщение
                text = (
                    f"🔥 <b>HOT DEAL: {deal.model}</b>\n"
                    f"💰 Цена: <b>{deal.price:,} ₽</b>\n"
                    f"📉 Медиана: {deal.median_price:,} ₽ (Выгода {deal.discount_percent}%)\n"
                    f"🔗 <a href='{deal.url}'>{deal.title}</a>"
                )
                
                payload = {
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True
                }
                
                # Здесь можно использовать обычный requests, т.к. API Telegram не блочит
                cffi_requests.post(TELEGRAM_URL, json=payload, timeout=10)
                logger.info(f"✅ Отправлено: {deal.title[:30]}")
                
            except Exception as e:
                logger.error(f"Ошибка отправки телеграм: {e}")

    def run(self):
        logger.info("🎬 Запуск сканера...")
        if not self.prices_db:
            logger.error("❌ База цен пуста, сканирование невозможно.")
            return

        html = self.get_page(SCAN_URL)
        if html:
            listings = self.parse_listings(html)
            hot_deals = self.find_deals(listings)
            
            if hot_deals:
                logger.info(f"🔥 Найдено {len(hot_deals)} горячих предложений!")
                self.send_notifications(hot_deals)
                
                # Добавляем в просмотренные
                for d in hot_deals:
                    self.seen_deals.add(d.url)
                self._save_seen()
            else:
                logger.info("🤷 Горячих предложений не найдено")
        else:
            logger.error("❌ Не удалось получить страницу Avito")

if __name__ == "__main__":
    scanner = AvitoScanner()
    scanner.run()
