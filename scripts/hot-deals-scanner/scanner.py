#!/usr/bin/env python3
"""
Сканер горячих сделок Авито для bestmac.ru
Использует curl_cffi для обхода защиты Авито (имитирует Chrome на уровне TLS).
Запускается каждые 30 минут через GitHub Actions.
"""
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

# ── curl_cffi — главное оружие против блокировок Авито ───────────────────────
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
    logger.info("✅ curl_cffi доступен — используем Chrome-имитацию")
else:
    logger.warning("⚠️ curl_cffi не установлен, используем requests (возможны 429)")

# ─── Конфигурация ─────────────────────────────────────────────────────────────
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE   = Path("public/data/seen-hot-deals.json")

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


class AvitoScanner:
    def __init__(self):
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxy_str  = p_str
        self.std_proxies = {"http": p_str, "https": p_str} if p_str else None
        self._curl_session = None
        if CURL_AVAILABLE:
            self._init_curl_session()

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

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
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
        result = {"cycles": None, "is_urgent": False, "specs": {}}
        resp = self.get(url)
        if not resp:
            return result
        try:
            soup = BeautifulSoup(resp.text, 'lxml')

            desc_tag  = soup.find('div', attrs={'data-marker': 'item-description'})
            desc_text = desc_tag.get_text().lower() if desc_tag else ""

            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
            if c_match:
                result["cycles"] = int(c_match.group(1))

            result["is_urgent"] = any(w in desc_text for w in URGENT_KEYWORDS)

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

    def notify(self, title, price, market_low, buyout, ram, ssd, url,
               cycles, is_urgent, is_avito_low, diagonal=None):
        if not TELEGRAM_URL:
            logger.info("ℹ️ TELEGRAM_URL не задан")
            return

        badges = []
        if is_urgent:    badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low: badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles:
            label = "🔋 <b>АКБ ИДЕАЛ</b>" if cycles < 200 else "🔋"
            badges.append(f"{label} {cycles} цикл.")

        status_line  = " | ".join(badges) if badges else "🎯 <b>Выгодное предложение</b>"
        discount_pct = round((1 - price / market_low) * 100) if market_low else 0
        discount_str = f" (−{discount_pct}% от рынка)" if discount_pct > 0 else ""
        diag_str     = f" {diagonal}\"" if diagonal else ""

        text = (
            f"{status_line}\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB / {ssd}GB{diag_str}</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b>{discount_str}\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Выкуп: <b>{buyout:,} ₽</b>\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        ).replace(',', '\u202f')

        try:
            std_requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
            logger.info(f"✅ Отправлено: {title[:50]} | {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

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
            logger.warning("⚠️ Объявления не найдены — страница не загрузилась корректно")
            logger.debug(f"HTML preview: {resp.text[:500]}")
            return

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

                is_avito_low = any(
                    x in item.get_text().lower()
                    for x in ["ниже рыночной", "цена ниже", "хорошая цена"]
                )
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
                analysis  = self.deep_analyze(raw_url)
                cycles    = analysis["cycles"]
                is_urgent = analysis["is_urgent"] or is_urgent_preview
                specs     = analysis["specs"]

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
                if price_ok_final or is_avito_low or is_urgent:
                    self.notify(raw_title, price, market_low, buyout, final_ram, final_ssd,
                                url, cycles, is_urgent, is_avito_low, diagonal=diagonal)
                    found_matches += 1

                self.seen.add(url)

            except Exception as e:
                logger.error(f"Ошибка: {e}")
                continue

        SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SEEN_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "seen_urls":  list(self.seen)[-5000:],
            }, f)

        logger.info(f"🏁 Готово. Найдено: {found_matches}")


if __name__ == "__main__":
    AvitoScanner().run()
