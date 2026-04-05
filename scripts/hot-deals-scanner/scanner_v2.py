#!/usr/bin/env python3
"""
Scanner v2 — автоклассификация + 3 типа уведомлений + multi-URL.

Изменения vs scanner.py (v1):
- Вместо match_to_db с маркерами → classifier.classify()
- 5 поисковых URL (Air, Pro, iMac, Mac mini, Mac Studio) вместо 1
- 3 типа Telegram-уведомлений: 🔥 выгодная цена, 📦 доставка, 🤝 торг
- Определение локации (Москва vs доставка)
- Старый scanner.py сохранён.
"""
import json
import os
import re
import sys
import time
import random
import logging
import statistics
import argparse
import urllib3
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Добавляем scripts/ в path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.classifier import classify, config_to_db_key
from common.config import (
    SCAN_FAMILIES, JUNK_KEYWORDS, URGENT_KEYWORDS, MOSCOW_MARKERS,
    MIN_PRICE, MAX_PRICE, PRICE_THRESHOLD_FACTOR, MIN_YEARS,
)

try:
    from curl_cffi import requests as curl_requests
    CURL_AVAILABLE = True
except ImportError:
    CURL_AVAILABLE = False

try:
    import requests as std_requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: pip install curl_cffi requests beautifulsoup4 lxml")
    exit(1)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ScannerV2")

if CURL_AVAILABLE:
    logger.info("✅ curl_cffi доступен")

# ─── Конфигурация ─────────────────────────────────────────────────────────────
PRICES_FILE  = Path("public/data/avito-prices.json")
SEEN_FILE    = Path("public/data/seen-hot-deals.json")
HISTORY_FILE = Path("public/data/price-history.json")

TELEGRAM_URL  = os.environ.get('TELEGRAM_NOTIFY_URL')
RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')

# Env-переменные для scan URL (опционально — если не заданы, берутся из config.py)
SCAN_URL = os.environ.get('SCAN_URL')  # legacy: одиночный URL

# Прокси
PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

AVITO_CAPTCHA_ID = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL = 'https://www.avito.ru/web/1/firewallCaptcha/verify'

CURL_BROWSERS = ["chrome110", "chrome107", "chrome104", "chrome101", "chrome100"]


def clean_url(url):
    return url.split('?')[0]


# ─── Парсинг времени публикации ──────────────────────────────────────────────
def parse_item_age(item):
    try:
        date_tag = (
            item.select_one('[data-marker="item-date"]') or
            item.select_one('p[class*="date"]') or
            item.select_one('[class*="dateInfo"]')
        )
        if not date_tag:
            return "?", 999

        raw = date_tag.get_text(strip=True).lower()

        if 'минут' in raw or 'мин' in raw:
            m = re.search(r'(\d+)', raw)
            mins = int(m.group(1)) if m else 30
            return f"{mins} мин", mins

        if 'час' in raw:
            m = re.search(r'(\d+)', raw)
            hrs = int(m.group(1)) if m else 2
            return f"{hrs} ч", hrs * 60

        if 'сегодня' in raw:
            m = re.search(r'(\d{1,2}):(\d{2})', raw)
            if m:
                h, mn = int(m.group(1)), int(m.group(2))
                now = datetime.now()
                pub = now.replace(hour=h, minute=mn, second=0)
                diff = max(0, int((now - pub).total_seconds() / 60))
                label = f"{diff} мин" if diff < 60 else f"{diff // 60} ч"
                return label, diff
            return "сегодня", 120

        if 'вчера' in raw:
            return "вчера", 60 * 24

        m = re.search(r'(\d+)\s*д', raw)
        if m:
            days = int(m.group(1))
            return f"{days} дн", days * 60 * 24

    except Exception:
        pass
    return "?", 999


# ─── Скоринг ─────────────────────────────────────────────────────────────────
def calc_score(price, market_low, is_urgent, is_avito_low, price_reduced,
               cycles, is_private, minutes_ago):
    score = 0

    if market_low > 0:
        discount = (market_low - price) / market_low
        if discount >= 0.20:   score += 35
        elif discount >= 0.10: score += 25
        elif discount >= 0.05: score += 15
        elif discount >= 0:    score += 5

    if price_reduced: score += 20
    if is_urgent:     score += 15
    if is_avito_low:  score += 10

    if cycles is not None:
        if cycles < 100:   score += 15
        elif cycles < 200: score += 10
        elif cycles < 400: score += 5

    if is_private: score += 10

    if minutes_ago <= 30:    score += 10
    elif minutes_ago <= 120: score += 7
    elif minutes_ago <= 360: score += 3

    return min(score, 100)


# ─── Определение локации ─────────────────────────────────────────────────────
def is_moscow(location):
    loc = location.lower()
    return any(m in loc for m in MOSCOW_MARKERS)


def extract_location(soup):
    """Извлекает город из страницы объявления."""
    for selector in [
        '[data-marker="item-address"]',
        '[class*="geo"]',
        '[class*="address"]',
        '[class*="location"]',
    ]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(strip=True)
    return ""


class AvitoScannerV2:
    def __init__(self):
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxy_str = p_str
        self.std_proxies = {"http": p_str, "https": p_str} if p_str else None
        self._curl_session = None
        if CURL_AVAILABLE:
            self._init_curl_session()

        # База цен
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    key = (s['model_name'].lower(), int(s['ram']), int(s['ssd']))
                    self.prices[key] = s
            logger.info(f"📊 База цен: {len(self.prices)} конфигураций")
        else:
            logger.warning("⚠️ База цен не найдена!")

        # История просмотренных
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except Exception:
                pass

        # История цен
        self.price_history = {}
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                    self.price_history = json.load(f)
            except Exception:
                pass

    def _init_curl_session(self):
        browser = random.choice(CURL_BROWSERS)
        self._curl_session = curl_requests.Session(impersonate=browser)
        if self.proxy_str:
            self._curl_session.proxies = {"http": self.proxy_str, "https": self.proxy_str}

    def get(self, url, retries=3):
        headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
        }
        for attempt in range(retries):
            try:
                if CURL_AVAILABLE and self._curl_session:
                    resp = self._curl_session.get(url, headers=headers, timeout=30,
                                                  verify=False, allow_redirects=True)
                else:
                    resp = std_requests.get(
                        url,
                        headers={**headers, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                        proxies=self.std_proxies, timeout=30, verify=False,
                    )
                if resp.status_code == 200:
                    return resp
                if resp.status_code in [403, 429]:
                    logger.warning(f"⚠️ HTTP {resp.status_code} (попытка {attempt+1}/{retries})")
                    time.sleep(random.uniform(15, 25))
                else:
                    break
            except Exception as e:
                logger.error(f"   Ошибка запроса (попытка {attempt+1}): {e}")
                if attempt < retries - 1:
                    time.sleep(15)
        return None

    def deep_analyze(self, url):
        """Заходит в объявление, собирает детали."""
        result = {
            "cycles": None,
            "is_urgent": False,
            "specs": {},
            "price_reduced": False,
            "is_private": False,
            "seller_reviews": None,
            "seller_type": "?",
            "location": "",
        }
        resp = self.get(url)
        if not resp:
            return result

        try:
            soup = BeautifulSoup(resp.text, 'lxml')

            # Описание
            desc_tag = soup.find('div', attrs={'data-marker': 'item-description'})
            desc_text = desc_tag.get_text().lower() if desc_tag else ""

            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
            if c_match:
                result["cycles"] = int(c_match.group(1))

            result["is_urgent"] = any(w in desc_text for w in URGENT_KEYWORDS)

            # Снижение цены
            page_text = soup.get_text().lower()
            result["price_reduced"] = any(x in page_text for x in [
                'снижена', 'цена снижена', 'скидка', 'снижал цену', 'понизил цену',
            ])

            # Характеристики
            specs = {}
            params_items = []
            for sel in [
                'li[class*="params-paramsList__item"]',
                '[data-marker="item-view/item-params"] li',
                'ul[class*="params"] li',
                'li[class*="param"]',
            ]:
                params_items = soup.select(sel)
                if params_items:
                    break

            for li in params_items:
                text = li.get_text(separator='|||').strip()
                if '|||' in text:
                    parts = [p.strip() for p in text.split('|||') if p.strip()]
                    if len(parts) >= 2:
                        specs[parts[0].lower()] = parts[-1]

            if specs:
                for key_ru, field in [
                    ('оперативная память, гб', 'ram'),
                    ('объем накопителей, гб', 'ssd'),
                    ('модель', 'model'),
                    ('диагональ, дюйм', 'diagonal'),
                ]:
                    raw = specs.get(key_ru, '')
                    if raw:
                        if field in ('ram', 'ssd'):
                            try: result["specs"][field] = int(float(raw))
                            except ValueError: pass
                        elif field == 'diagonal':
                            try: result["specs"][field] = float(raw)
                            except ValueError: pass
                        else:
                            result["specs"][field] = raw

            # Продавец
            seller_block = (
                soup.find('div', attrs={'data-marker': 'seller-info'}) or
                soup.find('div', attrs={'data-marker': 'contacts'}) or
                soup.find('[class*="seller-info"]')
            )
            if seller_block:
                seller_text = seller_block.get_text().lower()
                if any(x in seller_text for x in ['частное лицо', 'частный']):
                    result["is_private"] = True
                    result["seller_type"] = "Частное лицо"
                elif any(x in seller_text for x in ['магазин', 'компания']):
                    result["seller_type"] = "Магазин"

                rev_match = re.search(r'(\d+)\s*отзыв', seller_text)
                if rev_match:
                    result["seller_reviews"] = int(rev_match.group(1))

            # Локация
            result["location"] = extract_location(soup)

        except Exception as e:
            logger.error(f"   Ошибка deep_analyze: {e}")

        return result

    def match_to_db(self, config):
        """Ищет конфигурацию в базе цен через классификатор."""
        key = config_to_db_key(config)
        if not key:
            return None
        return self.prices.get(key)

    def _save_seen(self):
        try:
            SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "updated_at": datetime.now().isoformat(),
                    "seen_urls": list(self.seen)[-5000:],
                }, f)
        except Exception as e:
            logger.warning(f"⚠️ Не удалось сохранить seen: {e}")

    # ─── Telegram уведомления ─────────────────────────────────────────────────

    def notify_fire(self, title, price, market_low, median, buyout, ram, ssd,
                    url, cycles, age_str, score, location, seller_type,
                    seller_reviews, diagonal):
        """🔥 Выгодная цена"""
        if not TELEGRAM_URL:
            return
        discount_pct = round((1 - price / median) * 100) if median else 0
        diag = f" {diagonal}\"" if diagonal else ""
        loc_str = f"📍 {location}" if location else ""

        seller = seller_type
        if seller_reviews is not None:
            seller = f"{seller_type}, {seller_reviews} отз."

        text = (
            f"🔥 <b>ВЫГОДНАЯ ЦЕНА</b> [{score}/100]\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB\u202f/\u202f{ssd}GB{diag}</b>\n"
            f"💰 Цена: <b>{price:,}\u202f₽</b> <b>(−{discount_pct}%)</b>\n"
            f"📉 Низ рынка: {market_low:,}\u202f₽ | Медиана: {median:,}\u202f₽\n"
            f"🤝 Выкуп: <b>{buyout:,}\u202f₽</b>\n"
        )
        if cycles:
            text += f"🔋 Циклы: {cycles}\n"
        text += f"👤 {seller}\n"
        text += f"⏱ {age_str}\n"
        if loc_str:
            text += f"{loc_str}\n"
        text += f"🔗 <a href='{url}'>Открыть на Avito</a>"
        text = text.replace(',', '\u202f')

        self._send_telegram(text, f"🔥 [{score}] {title[:40]}")

    def notify_delivery(self, title, price, market_low, median, buyout, ram, ssd,
                        url, cycles, age_str, score, location, seller_type,
                        seller_reviews, diagonal):
        """📦 С доставкой — хорошая цена не из Москвы"""
        if not TELEGRAM_URL:
            return
        discount_pct = round((1 - price / median) * 100) if median else 0
        diag = f" {diagonal}\"" if diagonal else ""

        text = (
            f"📦 <b>ДОСТАВКА | ХОРОШАЯ ЦЕНА</b> [{score}/100]\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB\u202f/\u202f{ssd}GB{diag}</b>\n"
            f"💰 Цена: <b>{price:,}\u202f₽</b> <b>(−{discount_pct}%)</b>\n"
            f"📉 Низ рынка: {market_low:,}\u202f₽ | Медиана: {median:,}\u202f₽\n"
            f"🤝 Выкуп: <b>{buyout:,}\u202f₽</b>\n"
        )
        if cycles:
            text += f"🔋 Циклы: {cycles}\n"
        text += f"📍 {location} (доставка)\n"
        text += f"⏱ {age_str}\n"
        text += f"🔗 <a href='{url}'>Открыть на Avito</a>"
        text = text.replace(',', '\u202f')

        self._send_telegram(text, f"📦 [{score}] {title[:40]}")

    def notify_bargain(self, title, price, market_low, median, buyout, ram, ssd,
                       url, age_str, score, location, urgent_words):
        """🤝 Торг / срочная продажа"""
        if not TELEGRAM_URL:
            return
        diag = ""

        text = (
            f"🤝 <b>ТОРГ / СРОЧНАЯ ПРОДАЖА</b> [{score}/100]\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB\u202f/\u202f{ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,}\u202f₽</b>\n"
            f"📉 Низ рынка: {market_low:,}\u202f₽ | Медиана: {median:,}\u202f₽\n"
            f"🤝 Выкуп: <b>{buyout:,}\u202f₽</b>\n"
            f"🚨 Ключевые слова: {', '.join(urgent_words)}\n"
        )
        loc = f"📍 {location}" if location else ""
        if loc:
            text += f"{loc}\n"
        text += f"⏱ {age_str}\n"
        text += f"🔗 <a href='{url}'>Открыть на Avito</a>"
        text = text.replace(',', '\u202f')

        self._send_telegram(text, f"🤝 [{score}] {title[:40]}")

    def notify_not_in_db(self, title, price, ram, ssd, url, age_str, config):
        """⚠️ Объявление не найдено в базе цен"""
        if not TELEGRAM_URL:
            return
        model = config.model_name if config and config.is_valid else "?"

        text = (
            f"⚠️ <b>НЕТ В БАЗЕ</b>\n\n"
            f"💻 {title}\n"
            f"🏷 Модель: {model}\n"
            f"⚙️ <b>{ram}GB\u202f/\u202f{ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,}\u202f₽</b>\n"
            f"⏱ {age_str}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        text = text.replace(',', '\u202f')

        self._send_telegram(text, f"⚠️ Нет в базе: {title[:40]}")

    def _send_telegram(self, text, log_msg):
        try:
            std_requests.post(
                TELEGRAM_URL,
                json={"text": text, "parse_mode": "HTML"},
                timeout=10,
            )
            logger.info(f"✅ {log_msg}")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    # ─── Основной цикл ───────────────────────────────────────────────────────

    def _get_scan_urls(self):
        """Возвращает список URL для сканирования."""
        # Если задан SCAN_URL в env — используем его (совместимость с v1)
        if SCAN_URL:
            return [{"label": "SCAN_URL", "url": SCAN_URL}]

        # Иначе — 5 семейств из config
        return [
            {"label": fam['label'], "url": fam['url']}
            for fam in SCAN_FAMILIES.values()
        ]

    def run(self, use_playwright=False):
        scan_urls = self._get_scan_urls()
        logger.info(f"🎬 Запуск сканера v2 ({len(scan_urls)} URL)...")

        total_notifications = 0

        for scan_info in scan_urls:
            label = scan_info['label']
            url = scan_info['url']
            logger.info(f"\n{'─'*40}")
            logger.info(f"🔍 {label}: {url[:60]}...")

            time.sleep(random.uniform(1, 3))

            resp = None
            for attempt in range(3):
                resp = self.get(url)
                if resp:
                    break
                logger.warning(f"   Попытка {attempt+1}/3 не удалась")
                time.sleep(30)

            if not resp:
                logger.error(f"❌ Не удалось загрузить {label}")
                continue

            soup = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            logger.info(f"🔎 {label}: {len(items)} объявлений")

            if not items:
                continue

            candidates = []

            for idx, item in enumerate(items, 1):
                try:
                    link_tag = item.select_one('[data-marker="item-title"]')
                    if not link_tag:
                        continue

                    raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                    url_clean = clean_url(raw_url)
                    raw_title = link_tag.get('title', '')

                    if url_clean in self.seen:
                        continue

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet = snippet_tag.get_text().lower() if snippet_tag else ""
                    full_preview = (raw_title + ' ' + snippet).lower()

                    if any(w in full_preview for w in JUNK_KEYWORDS):
                        self.seen.add(url_clean)
                        continue

                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    price = int(price_tag['content'])
                    if price < MIN_PRICE or price > MAX_PRICE:
                        continue

                    age_str, minutes_ago = parse_item_age(item)

                    # Классификация из превью
                    config = classify(raw_title)

                    if not config.is_valid:
                        self.seen.add(url_clean)
                        continue

                    # Фильтр по году
                    min_year = MIN_YEARS.get(config.family, 2020)
                    if config.year and config.year < min_year:
                        self.seen.add(url_clean)
                        continue

                    is_avito_low = any(x in item.get_text().lower()
                                       for x in ["ниже рыночной", "цена ниже", "хорошая цена"])
                    is_urgent_preview = any(w in full_preview for w in URGENT_KEYWORDS)

                    # Ищем в базе
                    stat = self.match_to_db(config)

                    if not stat:
                        logger.warning(f"   ⚠️ Нет в базе: {raw_title[:50]} | {price:,}₽ | "
                                       f"{config.model_name} {config.ram}/{config.ssd}")
                        self.notify_not_in_db(raw_title, price, config.ram, config.ssd,
                                              url_clean, age_str, config)
                        self.seen.add(url_clean)
                        continue

                    market_low = stat['min_price']
                    price_ok = price <= int(market_low * PRICE_THRESHOLD_FACTOR)

                    if not (price_ok or is_avito_low or is_urgent_preview):
                        self.seen.add(url_clean)
                        continue

                    logger.info(f"   [{idx}] ✅ Кандидат: {raw_title[:50]} | {price:,}₽")

                    # Помечаем как seen
                    self.seen.add(url_clean)
                    self._save_seen()

                    # Deep analyze
                    time.sleep(random.uniform(2, 5))
                    analysis = self.deep_analyze(raw_url)

                    # Обогащаем config из deep specs
                    if analysis['specs']:
                        config_deep = classify(raw_title, analysis['specs'])
                        stat_deep = self.match_to_db(config_deep)
                        if stat_deep:
                            stat = stat_deep
                            config = config_deep

                    market_low = stat['min_price']
                    median = stat['median_price']
                    buyout = stat['buyout_price']
                    cycles = analysis['cycles']
                    is_urgent = analysis['is_urgent'] or is_urgent_preview
                    price_reduced = analysis['price_reduced']
                    is_private = analysis['is_private']
                    seller_type = analysis['seller_type']
                    seller_reviews = analysis['seller_reviews']
                    location = analysis['location']
                    diagonal = analysis['specs'].get('diagonal')

                    # Скор
                    score = calc_score(
                        price, market_low, is_urgent, is_avito_low,
                        price_reduced, cycles, is_private, minutes_ago,
                    )

                    # Определяем тип(ы) уведомления
                    notifications = []

                    # 🔥 Выгодная цена (Москва)
                    if price <= market_low * 1.10 and (not location or is_moscow(location)):
                        notifications.append('fire')

                    # 📦 Доставка (не Москва + хорошая цена)
                    if location and not is_moscow(location) and price <= median * 0.95:
                        notifications.append('delivery')

                    # 🤝 Торг (срочно + цена не сильно выше медианы)
                    urgent_words = [w for w in URGENT_KEYWORDS if w in full_preview]
                    if (is_urgent or price_reduced) and price <= median * 1.05:
                        notifications.append('bargain')

                    # Если нет специфического типа, но цена ок — 🔥
                    if not notifications and price_ok:
                        notifications.append('fire')

                    candidates.append({
                        'score': score,
                        'notifications': notifications,
                        'title': raw_title,
                        'price': price,
                        'market_low': market_low,
                        'median': median,
                        'buyout': buyout,
                        'ram': config.ram,
                        'ssd': config.ssd,
                        'url': url_clean,
                        'cycles': cycles,
                        'is_urgent': is_urgent,
                        'is_avito_low': is_avito_low,
                        'price_reduced': price_reduced,
                        'seller_type': seller_type,
                        'seller_reviews': seller_reviews,
                        'diagonal': diagonal,
                        'age_str': age_str,
                        'minutes_ago': minutes_ago,
                        'location': location,
                        'urgent_words': urgent_words,
                    })

                except Exception as e:
                    logger.error(f"Ошибка: {e}")
                    continue

            # Сортируем по скору
            candidates.sort(key=lambda x: x['score'], reverse=True)

            for c in candidates:
                for ntype in c['notifications']:
                    if ntype == 'fire':
                        self.notify_fire(
                            c['title'], c['price'], c['market_low'], c['median'],
                            c['buyout'], c['ram'], c['ssd'], c['url'], c['cycles'],
                            c['age_str'], c['score'], c['location'], c['seller_type'],
                            c['seller_reviews'], c['diagonal'],
                        )
                    elif ntype == 'delivery':
                        self.notify_delivery(
                            c['title'], c['price'], c['market_low'], c['median'],
                            c['buyout'], c['ram'], c['ssd'], c['url'], c['cycles'],
                            c['age_str'], c['score'], c['location'], c['seller_type'],
                            c['seller_reviews'], c['diagonal'],
                        )
                    elif ntype == 'bargain':
                        self.notify_bargain(
                            c['title'], c['price'], c['market_low'], c['median'],
                            c['buyout'], c['ram'], c['ssd'], c['url'],
                            c['age_str'], c['score'], c['location'], c['urgent_words'],
                        )
                    total_notifications += 1

        # Финальное сохранение
        self._save_seen()

        # История цен
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.price_history, f, ensure_ascii=False)

        logger.info(f"\n🏁 Готово. Уведомлений: {total_notifications}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Avito Scanner v2")
    parser.add_argument('--playwright', action='store_true',
                        help="Use Playwright instead of proxies")
    args = parser.parse_args()

    AvitoScannerV2().run(use_playwright=args.playwright)
