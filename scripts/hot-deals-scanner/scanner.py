#!/usr/bin/env python3
import json
import os
import re
import time
import random
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    from bs4 import BeautifulSoup
    import requests
except ImportError:
    print("pip install playwright beautifulsoup4 requests && playwright install chromium")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# --- КОНФИГУРАЦИЯ ---
PRICES_FILE       = Path("public/data/avito-prices.json")
SEEN_FILE         = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL      = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL          = os.environ.get('SCAN_URL')
RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')

# Постоянный captcha_id GeeTest v4 для Авито (не меняется)
AVITO_CAPTCHA_ID  = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL  = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

PRICE_THRESHOLD_FACTOR = 1.10

URGENT_KEYWORDS = ['срочно', 'торг', 'уступлю', 'переезд', 'сегодня',
                   'быстро', 'дисконт', 'возможен торг', 'отдам за']
BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'экран', 'матриц', 'дефект', 'аккаунт', 'коробка', 'чехол',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход'
]


def clean_url(url: str) -> str:
    return url.split('?')[0]


def extract_specs(text: str):
    text = text.lower().replace(' ', '')
    matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', text)
    ram, ssd = 8, 256
    clean = [m for m in matches if not (2018 <= int(m) <= 2026)]
    if len(clean) >= 2:
        ram = int(clean[0])
        ssd_val = int(clean[1])
        ssd = ssd_val * 1024 if ssd_val <= 8 else ssd_val
    elif len(clean) == 1:
        val = int(clean[0])
        if val in [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]:
            ram = val
        else:
            ssd = val
    return ram, ssd


def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


def solve_captcha(page) -> bool:
    """
    Решает GeeTest v4 капчу Авито (по примеру от поддержки RuCaptcha).

    Шаги:
    1. Отправляем captcha_id в RuCaptcha → получаем lot_number, pass_token, gen_time, captcha_output
    2. Берём куки srv_id, u, v из браузера
    3. POST на /web/1/firewallCaptcha/verify
    4. Перезагружаем страницу
    """
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️  RUCAPTCHA_API_KEY не задан — пропускаем")
        return False

    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        curr_url = page.url
        logger.info(f"[ШАГ 1] 🧩 GeeTest v4 | captcha_id: {AVITO_CAPTCHA_ID}")
        logger.info(f"[ШАГ 1] ⏳ Отправляем в RuCaptcha (20-60 сек)...")

        result = solver.geetest_v4(
            captcha_id=AVITO_CAPTCHA_ID,
            url=curr_url,
        )
        logger.info(f"[ШАГ 1] ✅ RuCaptcha ответила: {str(result)[:100]}")

        # result['code'] — JSON-строка с токенами
        code = result['code']
        if isinstance(code, str):
            code_data = json.loads(code)
        else:
            code_data = code

        lot_number    = code_data['lot_number']
        pass_token    = code_data['pass_token']
        gen_time      = code_data['gen_time']
        captcha_output = code_data['captcha_output']
        logger.info(f"[ШАГ 1] lot_number: {lot_number[:16]}...")

        # --- Шаг 2: Берём куки из браузера ---
        logger.info("[ШАГ 2] 🍪 Извлекаем куки из браузера...")
        all_cookies = page.context.cookies()
        cookie_map = {c['name']: c['value'] for c in all_cookies}

        # Только эти три куки нужны для verify (как в примере от поддержки)
        cookies = {}
        for key in ['srv_id', 'u', 'v']:
            if key in cookie_map:
                cookies[key] = cookie_map[key]
        logger.info(f"[ШАГ 2] Куки: {list(cookies.keys())}")

        # --- Шаг 3: POST на /web/1/firewallCaptcha/verify ---
        headers = {
            'accept': '*/*',
            'accept-language': 'en',
            'content-type': 'application/json',
            'origin': 'https://www.avito.ru',
            'priority': 'u=1, i',
            'referer': curr_url,
            'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': USER_AGENT,
            'x-cube': 'undefined',
        }
        json_data = {
            'captcha': '',
            'hCaptchaResponse': '',
            'captcha_id': AVITO_CAPTCHA_ID,
            'lot_number': lot_number,
            'pass_token': pass_token,
            'gen_time': gen_time,
            'captcha_output': captcha_output,
        }

        logger.info(f"[ШАГ 3] 📤 POST → {AVITO_VERIFY_URL}")
        resp = requests.post(AVITO_VERIFY_URL, cookies=cookies, headers=headers,
                             json=json_data, timeout=15)
        logger.info(f"[ШАГ 3] Ответ: HTTP {resp.status_code} | {resp.text[:300]}")

        verified = resp.json().get('result', {}).get('verified', False)
        if verified:
            logger.info("[ШАГ 3] ✅ Капча пройдена!")
        else:
            logger.error(f"[ШАГ 3] ❌ verified=False: {resp.text[:300]}")
            return False

        # --- Шаг 4: Перезагружаем страницу ---
        logger.info("[ШАГ 4] 🔄 Перезагружаем страницу...")
        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(2000)
        logger.info("[ШАГ 4] ✅ Страница перезагружена")
        return True

    except Exception as e:
        logger.error(f"❌ Ошибка решения капчи: {e}")
        return False


class AvitoScanner:
    def __init__(self, playwright):
        self.browser = playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox',
                  '--disable-blink-features=AutomationControlled']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1440, 'height': 900},
            user_agent=USER_AGENT,
            locale='ru-RU',
            timezone_id='Europe/Moscow',
            extra_http_headers={'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8'},
        )
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            window.chrome = { runtime: {} };
        """)
        self.page = self.context.new_page()

        # База цен
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
            logger.info(f"📊 База цен: {len(self.prices)} конфигураций")

        # История просмотренных
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except:
                pass

    def navigate(self, url: str) -> bool:
        try:
            self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(random.uniform(1.5, 3.0))

            if is_captcha_page(self.page):
                logger.warning(f"🛡 Капча на {url[:70]}")
                solved = solve_captcha(self.page)
                if not solved:
                    return False
                if is_captcha_page(self.page):
                    logger.error("❌ Капча осталась после решения")
                    return False

            return True
        except PWTimeout:
            logger.warning(f"⏱ Таймаут: {url[:60]}")
            return False
        except Exception as e:
            logger.warning(f"⚠️  Ошибка навигации: {e}")
            return False

    def deep_analyze(self, url: str):
        """Открывает объявление, ищет циклы АКБ и срочность."""
        try:
            tab = self.context.new_page()
            tab.goto(url, wait_until='domcontentloaded', timeout=25000)
            time.sleep(random.uniform(1.0, 2.0))
            if is_captcha_page(tab):
                solve_captcha(tab)
            content = tab.content()
            tab.close()

            soup = BeautifulSoup(content, 'lxml')
            desc = soup.find('div', attrs={'data-marker': 'item-description'})
            text = desc.get_text().lower() if desc else ""

            cycles = None
            m = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', text)
            if m:
                cycles = int(m.group(1))

            is_urgent = any(w in text for w in URGENT_KEYWORDS)
            return cycles, is_urgent
        except Exception as e:
            logger.debug(f"deep_analyze: {e}")
            return None, False

    def notify(self, title, price, market_low, buyout, ram, ssd, url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL:
            return
        badges = []
        if is_urgent:    badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low: badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 150: badges.append("🔋 <b>АКБ ИДЕАЛ</b>")
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
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
            logger.info(f"✅ Telegram: {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Запуск Playwright сканера...")

        if not self.navigate(SCAN_URL):
            logger.error("❌ Не удалось загрузить SCAN_URL")
            self.context.close()
            self.browser.close()
            return

        soup = BeautifulSoup(self.page.content(), 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено {len(items)} объявлений")

        found_matches = 0
        newly_seen = []

        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag:
                    continue
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url = clean_url(raw_url)

                if url in self.seen:
                    continue

                raw_title = link_tag.get('title', '')
                snippet_tag = item.select_one('[data-marker="item-description"]')
                snippet_text = snippet_tag.get_text().lower() if snippet_tag else ""
                full_text = (raw_title + " " + snippet_text).lower()

                if any(w in full_text for w in BAD_KEYWORDS):
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000:
                    continue

                is_avito_low = any(x in item.get_text().lower() for x in
                                   ["ниже рыночной", "цена ниже", "хорошая цена"])
                ram, ssd = extract_specs(full_text)

                matched_stat = None
                for (m_name, m_ram, m_ssd), stat in self.prices.items():
                    kw = re.findall(r'[a-z0-9]+', m_name)
                    if all(w in raw_title.lower() for w in kw) and m_ram == ram and m_ssd == ssd:
                        matched_stat = stat
                        break

                if matched_stat:
                    market_low = matched_stat['min_price']
                    should_notify = (
                        price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                        or is_avito_low
                    )
                    cycles, is_urgent = None, False
                    if not should_notify:
                        cycles, is_urgent = self.deep_analyze(raw_url)
                        if is_urgent:
                            should_notify = True
                    else:
                        cycles, is_urgent = self.deep_analyze(raw_url)

                    if should_notify:
                        self.notify(raw_title, price, market_low,
                                    matched_stat['buyout_price'],
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

        self.context.close()
        self.browser.close()
        logger.info(f"🏁 Готово. Совпадений: {found_matches}")


def main():
    with sync_playwright() as pw:
        AvitoScanner(pw).run()


if __name__ == "__main__":
    main()
