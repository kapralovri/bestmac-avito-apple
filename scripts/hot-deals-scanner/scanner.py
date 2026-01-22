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

# Пытаемся импортировать библиотеки
try:
    import requests
except ImportError:
    requests = None

try:
    from curl_cffi import requests as cffi_requests
    HAS_CFFI = True
except ImportError:
    cffi_requests = requests
    HAS_CFFI = False

from bs4 import BeautifulSoup

# Настройка логирования
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
URGENT_KEYWORDS = ['срочно', 'торг', 'сегодня', 'переезд', 'отдаю', 'дешево', 'быстро']
BAD_KEYWORDS = ['icloud', 'запчасти', 'битый', 'разбит', 'блокиров', 'экран', 'дефект', 'mdm', 'аккаунт', 'коробка', 'чехол']

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
        logger.info("🚀 Инициализация сканера...")
        self.session = cffi_requests.Session() if HAS_CFFI else requests.Session()
        self.prices_db = self._load_prices()
        self.seen_deals = self._load_seen()

    def _load_prices(self) -> Dict[str, int]:
        if not PRICES_FILE.exists():
            logger.warning(f"⚠️ Файл цен не найден: {PRICES_FILE}")
            return {}
        try:
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {s['model_name']: s['median_price'] for s in data.get('stats', [])}
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки цен: {e}")
            return {}

    def _load_seen(self) -> Set[str]:
        if not SEEN_DEALS_FILE.exists(): return set()
        try:
            with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f).get('seen_urls', []))
        except: return set()

    def _save_seen(self):
        try:
            SEEN_DEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
            keep_urls = list(self.seen_deals)[-3000:]
            with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
                json.dump({'updated_at': datetime.now().isoformat(), 'seen_urls': keep_urls}, f)
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения истории: {e}")

    def _rotate_ip(self):
        if PROXY_CHANGE_IP_URL and requests:
            try:
                logger.info("🔄 Запрос на смену IP...")
                requests.get(PROXY_CHANGE_IP_URL, timeout=20, verify=False)
                time.sleep(15)
            except Exception as e:
                logger.error(f"⚠️ Не удалось сменить IP: {e}")

    def get_page(self, url: str) -> Optional[str]:
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None
        for attempt in range(3):
            try:
                if HAS_CFFI:
                    resp = self.session.get(url, impersonate="chrome120", proxies=proxies, timeout=30)
                else:
                    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                    resp = self.session.get(url, headers=headers, proxies=proxies, timeout=30)
                
                if resp.status_code == 200 and "доступ ограничен" not in resp.text.lower():
                    return resp.text
                
                logger.warning(f"⚠️ Код {resp.status_code} или блок на попытке {attempt+1}")
                self._rotate_ip()
            except Exception as e:
                logger.error(f"⚠️ Ошибка запроса: {e}")
                self._rotate_ip()
        return None

    def analyze_details(self, url: str):
        """Парсинг страницы объявления для поиска циклов АКБ"""
        html = self.get_page(url)
        if not html: return None, False
        
        soup = BeautifulSoup(html, 'lxml')
        desc_block = soup.find('div', attrs={'data-marker': 'item-description'})
        text = desc_block.get_text().lower() if desc_block else ""
        
        # Поиск циклов
        cycles = None
        match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
        if match:
            try:
                cycles = int(match.group(1))
            except: pass
            
        urgent = any(word in text for word in URGENT_KEYWORDS)
        return cycles, urgent

    def extract_model(self, title: str) -> Optional[str]:
        t = title.lower()
        if any(word in t for word in BAD_KEYWORDS): return None
        
        # Сначала ищем точное совпадение из базы цен
        for model_name in self.prices_db.keys():
            # Очищаем название модели для поиска в заголовке
            clean_name = model_name.split('(')[0].strip().lower()
            if clean_name in t:
                return model_name
        return None

    def run(self):
        logger.info("🎬 Начало сканирования...")
        html = self.get_page(SCAN_URL)
        if not html:
            logger.error("❌ Не удалось получить главную страницу")
            return
        
        soup = BeautifulSoup(html, 'lxml')
        blocks = soup.find_all('div', attrs={'data-marker': 'item'})
        logger.info(f"📦 Найдено блоков на странице: {len(blocks)}")
        
        for block in blocks:
            try:
                link_tag = block.find('a', attrs={'data-marker': 'item-title'})
                if not link_tag: continue
                
                url = urljoin("https://www.avito.ru", link_tag.get('href', ''))
                if url in self.seen_deals: continue

                title = link_tag.get('title', '').strip()
                model = self.extract_model(title)
                
                if not model: continue
                
                price_tag = block.find('meta', attrs={'itemprop': 'price'})
                price = int(price_tag.get('content', 0)) if price_tag else 0
                
                median = self.prices_db.get(model)
                if median and price > (median * 0.3) and price <= (median * HOT_DEAL_THRESHOLD):
                    logger.info(f"🎯 Найдено интересное: {title} за {price}")
                    
                    # Глубокий анализ
                    cycles, urgent_desc = self.analyze_details(url)
                    urgent_title = any(word in title.lower() for word in URGENT_KEYWORDS)
                    
                    # Дата
                    date_tag = block.find('p', attrs={'data-marker': 'item-date'})
                    date_str = date_tag.get_text().strip() if date_tag else "Недавно"

                    deal = HotDeal(
                        url=url, title=title, price=price, median_price=median,
                        discount_percent=round((1 - price/median)*100, 1),
                        model=model, date=date_str, battery_cycles=cycles,
                        is_urgent=(urgent_title or urgent_desc)
                    )
                    
                    self.notify(deal)
                    self.seen_deals.add(url)
                    # Небольшая пауза чтобы не частить запросами вглубь
                    time.sleep(random.uniform(2, 5))
            except Exception as e:
                logger.error(f"⚠️ Ошибка при парсинге блока: {e}")
                continue
                
        self._save_seen()
        logger.info("🏁 Сканирование завершено")

    def notify(self, d: HotDeal):
        if not TELEGRAM_URL or not requests: return
        
        icons = ""
        if d.is_urgent: icons += "🚨 СРОЧНО! "
        if d.battery_cycles and d.battery_cycles < 150: icons += "🔋 АКБ ХОРОШИЙ! "
        
        text = (
            f"{icons}\n"
            f"🔥 <b>{d.model}</b>\n"
            f"💰 Цена: <b>{d.price:,} ₽</b>\n"
            f"📉 Выгода: {d.discount_percent}% (Рынок: {d.median_price:,})\n"
            f"⚡ АКБ: {f'{d.battery_cycles} циклов' if d.battery_cycles else 'не указано'}\n"
            f"🕒 Опубликовано: {d.date}\n"
            f"🔗 <a href='{d.url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        except Exception as e:
            logger.error(f"❌ Ошибка отправки в TG: {e}")

if __name__ == "__main__":
    try:
        scanner = AvitoScanner()
        scanner.run()
    except Exception as e:
        logger.error(f"💥 КРИТИЧЕСКАЯ ОШИБКА: {e}")
