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
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except ImportError:
    import requests as cffi_requests
    HAS_CURL_CFFI = False

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install curl_cffi requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

if HAS_CURL_CFFI:
    logger.info("✅ curl_cffi активен — TLS fingerprint Chrome")
else:
    logger.warning("⚠️  curl_cffi не найден — используется requests")

PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL = os.environ.get('SCAN_URL')
PROXY_URL = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

PRICE_THRESHOLD_FACTOR = 1.10

URGENT_KEYWORDS = ['срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро', 'дисконт', 'возможен торг', 'отдам за']

BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'экран', 'матриц', 'дефект', 'аккаунт', 'коробка', 'чехол',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход'
]

CHROME_IMPERSONATES = ["chrome110", "chrome107", "chrome104", "chrome101", "chrome99"]

def get_impersonate():
    return random.choice(CHROME_IMPERSONATES)

def clean_url(url):
    return url.split('?')[0]

def extract_specs(text):
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
        if val in [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]:
            ram = val
        else:
            ssd = val
    return ram, ssd


class AvitoScanner:
    def __init__(self):
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxies = {"http": p_str, "https": p_str} if p_str else None
        self.impersonate = get_impersonate()

        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
            logger.info(f"📊 База цен: {len(self.prices)} конфигураций")

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except:
                pass

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                cffi_requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                logger.info("🔄 IP сменён, ждём 12 сек...")
                time.sleep(12)
            except:
                pass
        self.impersonate = get_impersonate()

    def _do_request(self, url):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        if HAS_CURL_CFFI:
            return cffi_requests.get(url, headers=headers, proxies=self.proxies,
                                     timeout=30, verify=False, impersonate=self.impersonate)
        else:
            import requests as std_requests
            return std_requests.get(url, headers=headers, proxies=self.proxies, timeout=30, verify=False)

    def get_with_retry(self, url, max_retries=3):
        for attempt in range(max_retries):
            try:
                resp = self._do_request(url)
                if resp.status_code == 200:
                    return resp
                # 409 и 429 — бот-детект: ротация IP + fingerprint
                if resp.status_code in [409, 429]:
                    logger.warning(f"🚫 HTTP {resp.status_code} (попытка {attempt+1}/{max_retries}) — ротация IP...")
                    self.rotate_ip()
                    time.sleep(random.uniform(10, 20))
                    continue
                if resp.status_code in [403, 503]:
                    logger.warning(f"🚫 HTTP {resp.status_code} — новый fingerprint...")
                    self.impersonate = get_impersonate()
                    time.sleep(10)
                    continue
                logger.warning(f"⚠️  HTTP {resp.status_code}")
                return None
            except Exception as e:
                logger.warning(f"⚠️  Ошибка (попытка {attempt+1}): {e}")
                self.rotate_ip()
                time.sleep(5)
        return None

    def deep_analyze(self, url):
        resp = self.get_with_retry(url)
        if not resp:
            return None, False
        try:
            soup = BeautifulSoup(resp.text, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""
            cycles = None
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if c_match:
                cycles = int(c_match.group(1))
            is_urgent = any(word in text for word in URGENT_KEYWORDS)
            return cycles, is_urgent
        except:
            return None, False

    def notify(self, title, price, market_low, buyout, ram, ssd, url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL:
            return
        badges = []
        if is_urgent:
            badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low:
            badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 150:
            badges.append("🔋 <b>АКБ ИДЕАЛ</b>")
        status_line = " | ".join(badges) if badges else "🎯 <b>Подходящий вариант</b>"
        discount_pct = int((1 - price / market_low) * 100) if market_low > 0 else 0
        discount_str = f" (−{discount_pct}%)" if discount_pct > 0 else ""
        text = (
            f"{status_line}\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b>{discount_str}\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Выкуп: {buyout:,} ₽\n"
            f"⚡ Циклы: {cycles if cycles else 'не указано'}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        try:
            import requests as std_requests
            std_requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
            logger.info(f"✅ Отправлено: {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Сканирование...")
        resp = self.get_with_retry(SCAN_URL)
        if not resp:
            logger.error("❌ Не удалось загрузить SCAN_URL")
            return

        soup = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено {len(items)} объявлений")

        found_matches = 0
        newly_seen = []

        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url = clean_url(raw_url)

                if url in self.seen:
                    continue

                raw_title = link_tag.get('title', '')
                snippet_tag = item.select_one('[data-marker="item-description"]')
                snippet_text = snippet_tag.get_text().lower() if snippet_tag else ""
                full_preview_text = (raw_title + " " + snippet_text).lower()

                if any(word in full_preview_text for word in BAD_KEYWORDS):
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000:
                    continue

                is_avito_low = any(x in item.get_text().lower() for x in ["ниже рыночной", "цена ниже", "хорошая цена"])
                ram, ssd = extract_specs(full_preview_text)

                matched_stat = None
                for (m_name, m_ram, m_ssd), stat in self.prices.items():
                    keywords = re.findall(r'[a-z0-9]+', m_name)
                    if all(word in raw_title.lower() for word in keywords) and m_ram == ram and m_ssd == ssd:
                        matched_stat = stat
                        break

                if matched_stat:
                    market_low = matched_stat['min_price']
                    should_notify = False
                    if price <= int(market_low * PRICE_THRESHOLD_FACTOR):
                        should_notify = True
                    if is_avito_low:
                        should_notify = True

                    cycles, is_urgent = None, False
                    if not should_notify:
                        cycles, is_urgent = self.deep_analyze(raw_url)
                        if is_urgent:
                            should_notify = True
                    else:
                        cycles, is_urgent = self.deep_analyze(raw_url)

                    if should_notify:
                        self.notify(raw_title, price, market_low, matched_stat['buyout_price'],
                                    ram, ssd, url, cycles, is_urgent, is_avito_low)
                        found_matches += 1
                        time.sleep(random.uniform(2, 4))

                self.seen.add(url)
                newly_seen.append(url)

            except Exception as e:
                logger.debug(f"item error: {e}")
                continue

        if newly_seen:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "updated_at": datetime.now().isoformat(),
                    "seen_urls": list(self.seen)[-4500:]
                }, f)

        logger.info(f"🏁 Готово. Совпадений: {found_matches}")


if __name__ == "__main__":
    AvitoScanner().run()
