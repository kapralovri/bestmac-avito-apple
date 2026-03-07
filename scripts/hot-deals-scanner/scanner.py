#!/usr/bin/env python3
"""
Сканер горячих сделок Авито для bestmac.ru
v3: время публикации, рейтинг продавца, скоринг, история цен, снижение цены.
"""
import json
import os
import re
import time
import random
import logging
import statistics
import urllib3
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

if CURL_AVAILABLE:
    logger.info("✅ curl_cffi — Chrome-имитация")
else:
    logger.warning("⚠️ curl_cffi не установлен")

# ─── Конфигурация ─────────────────────────────────────────────────────────────
PRICES_FILE  = Path("public/data/avito-prices.json")
SEEN_FILE    = Path("public/data/seen-hot-deals.json")
HISTORY_FILE = Path("public/data/price-history.json")  # #5 история цен

TELEGRAM_URL  = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL      = os.environ.get('SCAN_URL')
PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

PRICE_THRESHOLD_FACTOR = 1.20

URGENT_KEYWORDS = [
    'срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро',
    'дисконт', 'возможен торг', 'отдам за', 'снижу', 'договоримся',
]

BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'матриц', 'дефект', 'аккаунт',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход', 'не включается', 'трещин',
]

RAM_VALUES = {8, 16, 18, 24, 36, 48, 64, 96, 128}
SSD_VALUES = {64, 128, 256, 512, 1024, 2048, 4096}

CURL_BROWSERS = ["chrome110", "chrome107", "chrome104", "chrome101", "chrome100", "chrome99"]


def clean_url(url: str) -> str:
    return url.split('?')[0]


def extract_specs(text: str) -> tuple[int, int]:
    text = text.lower().replace(' ', '')
    ram, ssd = 8, 256
    for val_str, unit in re.findall(r'(\d+)(gb|гб|tb|тб)', text):
        val = int(val_str)
        if 2015 <= val <= 2030:
            continue
        if unit in ('tb', 'тб'):
            val *= 1024
        if val in RAM_VALUES:
            ram = val
        elif val in SSD_VALUES:
            ssd = val
    return ram, ssd


# ─── #2 Парсинг времени публикации ────────────────────────────────────────────
def parse_item_age(item) -> tuple[str, int]:
    """
    Возвращает (human_str, minutes_ago).
    human_str: "15 мин", "2 ч", "3 дня"
    minutes_ago: количество минут для скоринга
    """
    try:
        date_tag = item.select_one('[data-marker="item-date"]')
        if not date_tag:
            # Запасной вариант — ищем по классу
            date_tag = item.select_one('p[class*="date"]') or item.select_one('[class*="dateInfo"]')
        if not date_tag:
            return "?", 999

        raw = date_tag.get_text(strip=True).lower()

        # Форматы Авито: "15 минут назад", "2 часа назад", "вчера", "3 дня назад", "сегодня в 14:30"
        if 'минут' in raw or 'мин' in raw:
            m = re.search(r'(\d+)', raw)
            mins = int(m.group(1)) if m else 30
            return f"{mins} мин", mins

        if 'час' in raw:
            m = re.search(r'(\d+)', raw)
            hrs = int(m.group(1)) if m else 2
            return f"{hrs} ч", hrs * 60

        if 'сегодня' in raw:
            # "сегодня в 14:30" — считаем от текущего времени
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


# ─── #4 Скоринг объявления ────────────────────────────────────────────────────
def calc_score(
    price: int,
    market_low: int,
    is_urgent: bool,
    is_avito_low: bool,
    price_reduced: bool,
    cycles: int | None,
    is_private: bool,
    minutes_ago: int,
) -> int:
    """
    Балл от 0 до 100. Чем выше — тем горячее сделка.
    Используется для сортировки уведомлений и установки порога.
    """
    score = 0

    # Цена ниже рынка
    if market_low > 0:
        discount = (market_low - price) / market_low
        if discount >= 0.20:   score += 35
        elif discount >= 0.10: score += 25
        elif discount >= 0.05: score += 15
        elif discount >= 0:    score += 5

    # Срочность / снижение
    if price_reduced: score += 20   # #1 снижение цены — сильный сигнал
    if is_urgent:     score += 15
    if is_avito_low:  score += 10

    # АКБ
    if cycles is not None:
        if cycles < 100:   score += 15
        elif cycles < 200: score += 10
        elif cycles < 400: score += 5

    # Частное лицо
    if is_private: score += 10

    # Свежесть объявления
    if minutes_ago <= 30:    score += 10
    elif minutes_ago <= 120: score += 7
    elif minutes_ago <= 360: score += 3

    return min(score, 100)


class AvitoScanner:
    def __init__(self):
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxy_str   = p_str
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

        # #5 История цен по конфигурациям
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
        logger.info(f"🌐 curl_cffi: {browser}")

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                if CURL_AVAILABLE and self._curl_session:
                    self._curl_session.get(CHANGE_IP_URL, timeout=15, verify=False)
                else:
                    std_requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                time.sleep(12)
                logger.info("🔄 IP сменён")
                if CURL_AVAILABLE:
                    self._init_curl_session()
            except Exception:
                pass

    def get(self, url: str, retries: int = 3):
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
                    self.rotate_ip()
                    time.sleep(random.uniform(5, 10))
                else:
                    break
            except Exception as e:
                logger.error(f"   Ошибка запроса (попытка {attempt+1}): {e}")
                if attempt < retries - 1:
                    self.rotate_ip()
                    time.sleep(5)
        return None

    def deep_analyze(self, url: str) -> dict:
        """
        Заходит в объявление ОДИН РАЗ.
        Собирает: циклы АКБ, срочность, характеристики,
                  #1 снижение цены, #3 данные продавца.
        """
        result = {
            "cycles":        None,
            "is_urgent":     False,
            "specs":         {},
            "price_reduced": False,   # #1
            "is_private":    False,   # #3
            "seller_reviews": None,   # #3
            "seller_type":   "?",     # #3 "Частное лицо" / "Магазин"
        }
        resp = self.get(url)
        if not resp:
            return result

        try:
            soup = BeautifulSoup(resp.text, 'lxml')

            # ── Описание ──────────────────────────────────────────────────────
            desc_tag  = soup.find('div', attrs={'data-marker': 'item-description'})
            desc_text = desc_tag.get_text().lower() if desc_tag else ""

            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
            if c_match:
                result["cycles"] = int(c_match.group(1))

            result["is_urgent"] = any(w in desc_text for w in URGENT_KEYWORDS)

            # ── #1 Снижение цены ───────────────────────────────────────────────
            # Авито показывает бейдж снижения или текст в блоке цены
            page_text = soup.get_text().lower()
            result["price_reduced"] = any(x in page_text for x in [
                'снижена', 'снижена цена', 'цена снижена', 'price reduced',
                'скидка', 'снижал цену', 'понизил цену',
            ])

            # ── Характеристики ────────────────────────────────────────────────
            specs = {}
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
                    ('объем накопителей, гб',  'ssd'),
                    ('модель',                 'model'),
                    ('диагональ, дюйм',        'diagonal'),
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

            # ── #3 Данные продавца ────────────────────────────────────────────
            # Авито показывает блок продавца с типом и количеством отзывов
            seller_block = (
                soup.find('div', attrs={'data-marker': 'seller-info'}) or
                soup.find('div', attrs={'data-marker': 'contacts'}) or
                soup.find('[class*="seller-info"]')
            )
            if seller_block:
                seller_text = seller_block.get_text().lower()

                # Тип продавца
                if any(x in seller_text for x in ['частное лицо', 'частный']):
                    result["is_private"]  = True
                    result["seller_type"] = "Частное лицо"
                elif any(x in seller_text for x in ['магазин', 'компания', 'официальный']):
                    result["seller_type"] = "Магазин"

                # Количество отзывов
                rev_match = re.search(r'(\d+)\s*отзыв', seller_text)
                if rev_match:
                    result["seller_reviews"] = int(rev_match.group(1))

        except Exception as e:
            logger.error(f"   Ошибка deep_analyze: {e}")

        return result

    def match_to_db(self, title: str, ram: int, ssd: int, specs: dict) -> dict | None:
        final_ram   = specs.get('ram', ram)
        final_ssd   = specs.get('ssd', ssd)
        title_lower = title.lower()
        best_match  = None
        best_score  = 0

        for (m_name, m_ram, m_ssd), stat in self.prices.items():
            if m_ram != final_ram or m_ssd != final_ssd:
                continue
            markers = re.findall(
                r'(air|pro mini|mac mini|imac|m1 pro|m1 max|m2 pro|m2 max|m3 pro|m3 max|m4 pro|m4 max|m1|m2|m3|m4)',
                m_name
            )
            score = sum(1 for m in markers if m in title_lower)
            if len(markers) > 0 and score >= len(markers) and score > best_score:
                best_score = score
                best_match = stat

        return best_match

    # ─── #5 Обновление истории цен ────────────────────────────────────────────
    def update_price_history(self, model_name: str, ram: int, ssd: int, price: int):
        """Сохраняет цену найденного объявления в историю. Хранит последние 90 дней."""
        key   = f"{model_name}|{ram}|{ssd}"
        today = datetime.now().strftime("%Y-%m-%d")

        if key not in self.price_history:
            self.price_history[key] = []

        # Добавляем точку
        self.price_history[key].append({"date": today, "price": price})

        # Чистим старше 90 дней
        cutoff = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        self.price_history[key] = [
            p for p in self.price_history[key] if p["date"] >= cutoff
        ]

    def get_trend_str(self, model_name: str, ram: int, ssd: int) -> str:
        """Возвращает строку тренда цен за последние 30 дней."""
        key    = f"{model_name}|{ram}|{ssd}"
        points = self.price_history.get(key, [])
        if len(points) < 5:
            return ""

        # Сравниваем медиану последних 15 дней vs предыдущих 15
        cutoff_15 = (datetime.now() - timedelta(days=15)).strftime("%Y-%m-%d")
        cutoff_30 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        recent = [p["price"] for p in points if p["date"] >= cutoff_15]
        older  = [p["price"] for p in points if cutoff_30 <= p["date"] < cutoff_15]

        if len(recent) < 3 or len(older) < 3:
            return ""

        med_recent = statistics.median(recent)
        med_older  = statistics.median(older)
        diff_pct   = round((med_recent - med_older) / med_older * 100)

        if diff_pct <= -3:
            return f"📉 тренд −{abs(diff_pct)}% за 30д"
        elif diff_pct >= 3:
            return f"📈 тренд +{diff_pct}% за 30д"
        return ""

    # ─── Telegram уведомление ─────────────────────────────────────────────────
    def notify(
        self, title, price, market_low, buyout, ram, ssd, url,
        cycles, is_urgent, is_avito_low, price_reduced,
        seller_type, seller_reviews, diagonal,
        age_str, minutes_ago, score, trend_str,
    ):
        if not TELEGRAM_URL:
            return

        # ── Шапка: скор + бейджи ──────────────────────────────────────────────
        score_bar = "🔥" * min(5, score // 20) or "·"
        badges = [f"<b>Скор: {score}/100</b> {score_bar}"]

        if price_reduced: badges.append("🔻 <b>ЦЕНА СНИЖЕНА</b>")
        if is_urgent:     badges.append("🚨 <b>СРОЧНО/ТОРГ</b>")
        if is_avito_low:  badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles:
            label = "🔋 <b>АКБ ИДЕАЛ</b>" if cycles < 200 else "🔋"
            badges.append(f"{label} {cycles} цикл.")

        # ── Скидка ────────────────────────────────────────────────────────────
        discount_pct = round((1 - price / market_low) * 100) if market_low else 0
        discount_str = f" <b>(−{discount_pct}%)</b>" if discount_pct > 0 else ""

        # ── Продавец ──────────────────────────────────────────────────────────
        if seller_reviews is not None:
            seller_str = f"{seller_type}, {seller_reviews} отз."
        else:
            seller_str = seller_type

        # ── Диагональ ─────────────────────────────────────────────────────────
        diag_str = f" {diagonal}\"" if diagonal else ""

        text = (
            f"{chr(10).join(badges)}\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB\u202f/\u202f{ssd}GB{diag_str}</b>\n"
            f"💰 Цена: <b>{price:,}\u202f₽</b>{discount_str}\n"
            f"📉 Низ рынка: {market_low:,}\u202f₽\n"
            f"🤝 Выкуп: <b>{buyout:,}\u202f₽</b>\n"
            f"👤 {seller_str}\n"
            f"⏱ Опубликовано: <b>{age_str}</b>\n"
        )
        if trend_str:
            text += f"{trend_str}\n"
        text += f"🔗 <a href='{url}'>Открыть на Avito</a>"

        text = text.replace(',', '\u202f')

        try:
            std_requests.post(
                TELEGRAM_URL,
                json={"text": text, "parse_mode": "HTML"},
                timeout=10,
            )
            logger.info(f"✅ [{score}/100] {title[:45]} | {price:,} ₽ | {age_str}")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    # ─── Основной цикл ────────────────────────────────────────────────────────
    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Сканирование запущено...")
        time.sleep(random.uniform(1, 3))

        resp = self.get(SCAN_URL)
        if not resp:
            logger.error("❌ Не удалось загрузить SCAN_URL")
            return

        soup  = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Объявлений: {len(items)}")

        if not items:
            logger.warning("⚠️ Объявления не найдены")
            logger.debug(f"HTML preview: {resp.text[:500]}")
            return

        # Собираем кандидатов с их скорами для сортировки
        candidates = []
        found_matches = 0

        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag:
                    continue

                raw_url   = urljoin("https://www.avito.ru", link_tag['href'])
                url       = clean_url(raw_url)
                raw_title = link_tag.get('title', '')

                if url in self.seen:
                    continue

                snippet_tag  = item.select_one('[data-marker="item-description"]')
                snippet      = snippet_tag.get_text().lower() if snippet_tag else ""
                full_preview = (raw_title + ' ' + snippet).lower()

                if any(w in full_preview for w in BAD_KEYWORDS):
                    self.seen.add(url)
                    continue

                price_tag = item.select_one('[itemprop="price"]')
                if not price_tag:
                    continue
                price = int(price_tag['content'])
                if price < 15000:
                    continue

                # #2 Время публикации из превью
                age_str, minutes_ago = parse_item_age(item)

                is_avito_low      = any(x in item.get_text().lower()
                                        for x in ["ниже рыночной", "цена ниже", "хорошая цена"])
                is_urgent_preview = any(w in full_preview for w in URGENT_KEYWORDS)

                preview_ram, preview_ssd = extract_specs(full_preview)
                preview_match = self.match_to_db(raw_title, preview_ram, preview_ssd, {})

                if not preview_match:
                    self.seen.add(url)
                    continue

                market_low = preview_match['min_price']
                price_ok   = price <= int(market_low * PRICE_THRESHOLD_FACTOR)

                if not (price_ok or is_avito_low or is_urgent_preview):
                    self.seen.add(url)
                    continue

                # deep_analyze — ОДИН РАЗ
                time.sleep(random.uniform(2, 5))
                analysis      = self.deep_analyze(raw_url)
                cycles        = analysis["cycles"]
                is_urgent     = analysis["is_urgent"] or is_urgent_preview
                specs         = analysis["specs"]
                price_reduced = analysis["price_reduced"]   # #1
                is_private    = analysis["is_private"]       # #3
                seller_type   = analysis["seller_type"]      # #3
                seller_reviews = analysis["seller_reviews"]  # #3

                final_match = self.match_to_db(raw_title, preview_ram, preview_ssd, specs)
                if not final_match:
                    self.seen.add(url)
                    continue

                market_low = final_match['min_price']
                buyout     = final_match['buyout_price']
                final_ram  = specs.get('ram', preview_ram)
                final_ssd  = specs.get('ssd', preview_ssd)
                diagonal   = specs.get('diagonal')

                price_ok_final = price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                if not (price_ok_final or is_avito_low or is_urgent or price_reduced):
                    self.seen.add(url)
                    continue

                # #5 Обновляем историю цен
                self.update_price_history(final_match['model_name'], final_ram, final_ssd, price)
                trend_str = self.get_trend_str(final_match['model_name'], final_ram, final_ssd)

                # #4 Считаем скор
                score = calc_score(
                    price, market_low,
                    is_urgent, is_avito_low, price_reduced,
                    cycles, is_private, minutes_ago,
                )

                candidates.append({
                    "score":          score,
                    "title":          raw_title,
                    "price":          price,
                    "market_low":     market_low,
                    "buyout":         buyout,
                    "ram":            final_ram,
                    "ssd":            final_ssd,
                    "url":            url,
                    "cycles":         cycles,
                    "is_urgent":      is_urgent,
                    "is_avito_low":   is_avito_low,
                    "price_reduced":  price_reduced,
                    "seller_type":    seller_type,
                    "seller_reviews": seller_reviews,
                    "diagonal":       diagonal,
                    "age_str":        age_str,
                    "minutes_ago":    minutes_ago,
                    "trend_str":      trend_str,
                })

                self.seen.add(url)

            except Exception as e:
                logger.error(f"Ошибка: {e}")
                continue

        # #4 Сортируем по скору — самые горячие приходят первыми
        candidates.sort(key=lambda x: x["score"], reverse=True)

        for c in candidates:
            self.notify(**{k: c[k] for k in [
                'title', 'price', 'market_low', 'buyout', 'ram', 'ssd', 'url',
                'cycles', 'is_urgent', 'is_avito_low', 'price_reduced',
                'seller_type', 'seller_reviews', 'diagonal',
                'age_str', 'minutes_ago', 'score', 'trend_str',
            ]})
            found_matches += 1

        # Сохраняем историю просмотренных
        SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SEEN_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "seen_urls":  list(self.seen)[-5000:],
            }, f)

        # #5 Сохраняем историю цен
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.price_history, f, ensure_ascii=False)

        logger.info(f"🏁 Готово. Уведомлений: {found_matches}")


if __name__ == "__main__":
    AvitoScanner().run()
