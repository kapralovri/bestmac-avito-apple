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

PRICES_FILE       = Path("public/data/avito-prices.json")
SEEN_FILE         = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL      = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL          = os.environ.get('SCAN_URL')
RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')

AVITO_CAPTCHA_ID = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT       = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

PRICE_THRESHOLD_FACTOR = 1.10

URGENT_KEYWORDS = [
    'срочно', 'торг', 'уступлю', 'переезд', 'сегодня',
    'быстро', 'дисконт', 'возможен торг', 'отдам за', 'нужны деньги'
]
BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'матриц', 'дефект', 'аккаунт',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит',
    'полосы', 'пятна', 'в разбор', 'на части', 'пароль', 'обход',
    'трещин', 'вмятин', 'царапин', 'не включ',
]

# Ключевые слова для фильтра по заголовку (строим из базы цен)
# air13m1, air13m2, pro14, pro16 и т.д.
MODEL_TITLE_PATTERNS = [
    (r'air\s*13.*(m1|2020)', 'MacBook Air 13 (2020, M1)'),
    (r'air\s*13.*(m2|2022)', 'MacBook Air 13 (2022, M2)'),
    (r'air\s*13.*(m3|2024)', 'MacBook Air 13 (2024, M3)'),
    (r'air\s*13.*(m4|2025)', 'MacBook Air 13 (2025, M4)'),
    (r'air\s*15.*(m2|2023)', 'MacBook Air 15 (2023, M2)'),
    (r'air\s*15.*(m3|2024)', 'MacBook Air 15 (2024, M3)'),
    (r'air\s*15.*(m4|2025)', 'MacBook Air 15 (2025, M4)'),
    (r'pro\s*13.*(m1|2020)', 'MacBook Pro 13 (2020, M1)'),
    (r'pro\s*13.*(m2|2022)', 'MacBook Pro 13 (2022, M2)'),
    (r'pro\s*14.*(m1|2021)', 'MacBook Pro 14 (2021)'),
    (r'pro\s*14.*(m2|m3|2023)', 'MacBook Pro 14 (2023)'),
    (r'pro\s*14.*(m4|2024)', 'MacBook Pro 14 (2024)'),
    (r'pro\s*16.*(m1|2021)', 'MacBook Pro 16 (2021)'),
    (r'pro\s*16.*(m2|m3|2023)', 'MacBook Pro 16 (2023)'),
    (r'pro\s*16.*(m4|2024)', 'MacBook Pro 16 (2024)'),
]

RAM_VALUES = {8, 16, 18, 24, 32, 36, 48, 64, 96, 128}


def clean_url(url: str) -> str:
    return url.split('?')[0]


def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


def guess_model_from_title(title: str):
    """Пробует определить model_name по заголовку объявления."""
    t = title.lower()
    for pattern, model_name in MODEL_TITLE_PATTERNS:
        if re.search(pattern, t):
            return model_name
    return None


def extract_specs_from_title(title: str):
    """Извлекает RAM/SSD из заголовка. Форматы: 16/512, 16gb, 16гб 512гб."""
    t = title.lower()

    # "16/512", "16 / 1024"
    m = re.search(r'\b(\d+)\s*/\s*(\d+)\b', t)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a in RAM_VALUES and b > a and b not in range(2018, 2030):
            return a, (b * 1024 if b <= 8 else b)

    # "16gb 512gb", "16гб 1тб"
    parts = re.findall(r'(\d+)\s*(?:gb|гб|tb|тб)', t)
    parts = [int(p) for p in parts if not (2018 <= int(p) <= 2029)]
    if len(parts) >= 2:
        ram, ssd_v = parts[0], parts[1]
        if ram in RAM_VALUES:
            return ram, (ssd_v * 1024 if ssd_v <= 8 else ssd_v)

    return None, None


def extract_specs_from_page(soup: BeautifulSoup):
    """
    Читает характеристики из страницы объявления Авито.
    Пробует несколько селекторов — структура меняется.
    """
    model_name, ram, ssd, cycles, is_urgent = None, None, None, None, False

    # ── Стратегия 1: data-marker="item-params" ──────────────────
    for li in soup.select('[data-marker="item-params"] li'):
        text = li.get_text(' ', strip=True)
        low  = text.lower()
        if 'модель' in low:
            val = re.sub(r'(?i)^модел[ьъ]\s*[:\-]?\s*', '', text).strip()
            if val: model_name = val
        elif 'оперативн' in low or ('память' in low and 'gb' in low):
            m = re.search(r'(\d+)', text)
            if m and int(m.group(1)) in RAM_VALUES: ram = int(m.group(1))
        elif 'накопител' in low or ('объем' in low and ('ssd' in low or 'gb' in low)):
            m = re.search(r'(\d+)', text)
            if m:
                v = int(m.group(1))
                ssd = v * 1024 if v <= 8 else v

    # ── Стратегия 2: произвольный список параметров ──────────────
    if not model_name or ram is None:
        for el in soup.select('.params-paramsList__item, [class*="param"], [class*="Param"]'):
            text = el.get_text(' ', strip=True)
            low  = text.lower()
            if 'модель' in low and not model_name:
                parts = text.split(':', 1)
                if len(parts) == 2: model_name = parts[1].strip()
            if ('оперативн' in low or 'ram' in low) and ram is None:
                m = re.search(r'(\d+)', text)
                if m and int(m.group(1)) in RAM_VALUES: ram = int(m.group(1))
            if ('накопител' in low or 'ssd' in low) and ssd is None:
                m = re.search(r'(\d+)', text)
                if m:
                    v = int(m.group(1))
                    ssd = v * 1024 if v <= 8 else v

    # ── Стратегия 3: h1 заголовок страницы ──────────────────────
    if ram is None or ssd is None:
        h1 = soup.find('h1')
        if h1:
            r, s = extract_specs_from_title(h1.get_text())
            if r and ram is None:  ram = r
            if s and ssd is None:  ssd = s

    # ── Описание: циклы и срочность ──────────────────────────────
    desc_el = soup.find('div', attrs={'data-marker': 'item-description'})
    desc    = desc_el.get_text().lower() if desc_el else ''

    m = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc)
    if m: cycles = int(m.group(1))

    is_urgent = any(w in desc for w in URGENT_KEYWORDS)

    return model_name, ram, ssd, cycles, is_urgent


# ─────────────────────────────────────────────
# КАПЧА
# ─────────────────────────────────────────────

def solve_captcha(page) -> bool:
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️  RUCAPTCHA_API_KEY не задан")
        return False
    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        logger.info(f"[ШАГ 1] ⏳ GeeTest v4 → RuCaptcha...")
        result   = solver.geetest_v4(captcha_id=AVITO_CAPTCHA_ID, url=page.url)
        code     = result['code']
        code_data = json.loads(code) if isinstance(code, str) else code

        js_payload = json.dumps({
            'captcha': '', 'hCaptchaResponse': '',
            'captcha_id':     AVITO_CAPTCHA_ID,
            'lot_number':     code_data['lot_number'],
            'pass_token':     code_data['pass_token'],
            'gen_time':       code_data['gen_time'],
            'captcha_output': code_data['captcha_output'],
        })

        resp = page.evaluate(f"""async () => {{
            const r = await fetch('{AVITO_VERIFY_URL}', {{
                method: 'POST',
                headers: {{'accept':'*/*','content-type':'application/json',
                           'origin':'https://www.avito.ru',
                           'referer': window.location.href, 'x-cube':'undefined'}},
                credentials: 'include',
                body: JSON.stringify({js_payload}),
            }});
            return await r.json();
        }}""")

        if not resp.get('result', {}).get('verified', False):
            logger.error(f"[ШАГ 3] ❌ verified=False")
            return False

        logger.info("[ШАГ 3] ✅ Капча пройдена! Перезагружаем...")
        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(2500)
        return True

    except Exception as e:
        logger.error(f"❌ Капча: {e}")
        return False


def navigate_with_captcha(page, url: str) -> bool:
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(random.randint(1200, 2500))
    except Exception as e:
        logger.warning(f"⚠️  goto {url[:50]}: {e}")
        return False

    for attempt in range(1, 4):
        if not is_captcha_page(page):
            return True
        logger.warning(f"🛡 Капча (попытка {attempt}/3)")
        if not solve_captcha(page):
            return False
        page.wait_for_timeout(2000)

    logger.error("❌ Капча не прошла после 3 попыток")
    return False


# ─────────────────────────────────────────────
# СКАНЕР
# ─────────────────────────────────────────────

class AvitoScanner:
    def __init__(self, playwright):
        self.browser = playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox',
                  '--disable-blink-features=AutomationControlled']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1440, 'height': 900},
            user_agent=USER_AGENT, locale='ru-RU',
            timezone_id='Europe/Moscow',
            extra_http_headers={'Accept-Language': 'ru-RU,ru;q=0.9'},
        )
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'plugins',   {get: () => [1,2,3]});
            window.chrome = {runtime: {}};
        """)
        self.page = self.context.new_page()

        # База цен
        self.prices = {}
        if PRICES_FILE.exists():
            data = json.load(open(PRICES_FILE, encoding='utf-8'))
            for s in data.get('stats', []):
                key = (self._norm(s['model_name']), int(s['ram']), int(s['ssd']))
                self.prices[key] = s
            logger.info(f"📊 База цен: {len(self.prices)} конфигураций")

        # История
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                data = json.load(open(SEEN_FILE, encoding='utf-8'))
                self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except: pass

    @staticmethod
    def _norm(s): return re.sub(r'\s+', ' ', str(s).lower().strip())

    def find_stat(self, model_name, ram, ssd):
        if not model_name or ram is None or ssd is None:
            return None
        norm = self._norm(model_name)
        # Точное совпадение
        if (norm, ram, ssd) in self.prices:
            return self.prices[(norm, ram, ssd)]
        # Частичное по model_name
        for (db_m, db_r, db_s), stat in self.prices.items():
            if db_r == ram and db_s == ssd and (norm in db_m or db_m in norm):
                return stat
        return None

    def open_listing(self, url: str):
        """Открывает объявление в новой вкладке, возвращает BeautifulSoup."""
        tab = self.context.new_page()
        try:
            ok = navigate_with_captcha(tab, url)
            if not ok:
                return None
            soup = BeautifulSoup(tab.content(), 'lxml')
            return soup
        except Exception as e:
            logger.debug(f"open_listing: {e}")
            return None
        finally:
            tab.close()

    def notify(self, title, price, market_low, buyout,
               ram, ssd, url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL: return
        badges = []
        if is_urgent:              badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low:           badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 200: badges.append(f"🔋 <b>АКБ: {cycles} цикл.</b>")
        status = " | ".join(badges) if badges else "🎯 <b>Подходящий вариант</b>"
        disc   = int((1 - price / market_low) * 100) if market_low else 0
        text   = (
            f"{status}\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b>{f' (−{disc}%)' if disc > 0 else ''}\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Выкуп: {buyout:,} ₽\n"
            f"⚡ Циклы: {cycles if cycles else '—'}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
            logger.info(f"✅ Telegram: {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан"); return

        logger.info("🎬 Запуск сканера...")
        navigate_with_captcha(self.page, "https://www.avito.ru")

        logger.info("🔍 Открываем SCAN_URL...")
        if not navigate_with_captcha(self.page, SCAN_URL):
            logger.error("❌ Не удалось загрузить SCAN_URL")
            self.context.close(); self.browser.close(); return

        soup  = BeautifulSoup(self.page.content(), 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено {len(items)} объявлений")

        found = 0
        newly_seen = []

        for idx, item in enumerate(items, 1):
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag: continue

                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url     = clean_url(raw_url)
                title   = link_tag.get('title', '')

                if url in self.seen: continue

                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000: continue

                snippet   = item.select_one('[data-marker="item-description"]')
                preview   = (title + ' ' + (snippet.get_text() if snippet else '')).lower()
                if any(w in preview for w in BAD_KEYWORDS):
                    self.seen.add(url); newly_seen.append(url); continue

                is_avito_low = any(x in item.get_text().lower()
                                   for x in ["ниже рыночной", "цена ниже", "хорошая цена"])

                # ── Шаг 1: пробуем определить модель и спеки из заголовка ──
                model_guess = guess_model_from_title(title)
                ram_guess, ssd_guess = extract_specs_from_title(title)

                logger.info(f"[{idx:02d}] {title[:55]} | {price:,}₽")
                logger.info(f"      title → модель: {model_guess} | RAM: {ram_guess} | SSD: {ssd_guess}")

                # Если из заголовка нашли всё — проверяем базу без открытия
                stat = None
                if model_guess and ram_guess and ssd_guess:
                    stat = self.find_stat(model_guess, ram_guess, ssd_guess)

                # ── Шаг 2: если не нашли — открываем объявление ──────────
                ram, ssd = ram_guess, ssd_guess
                model_name = model_guess
                cycles, is_urgent = None, False

                if stat is None:
                    logger.info("      → Открываем объявление для получения характеристик")
                    listing_soup = self.open_listing(raw_url)
                    if listing_soup is None:
                        self.seen.add(url); newly_seen.append(url); continue

                    model_name, ram, ssd, cycles, is_urgent = extract_specs_from_page(listing_soup)
                    logger.info(f"      listing → модель: {model_name} | RAM: {ram} | SSD: {ssd} | "
                                f"Циклы: {cycles} | Срочно: {is_urgent}")

                    # Повторный отсев по описанию объявления
                    desc_el  = listing_soup.find('div', attrs={'data-marker': 'item-description'})
                    desc_txt = desc_el.get_text().lower() if desc_el else ''
                    if any(w in desc_txt for w in BAD_KEYWORDS):
                        logger.info("      ❌ Отсев по описанию")
                        self.seen.add(url); newly_seen.append(url); continue

                    if is_urgent:
                        is_urgent = True

                    stat = self.find_stat(model_name, ram or 8, ssd or 256)

                else:
                    # Нашли из заголовка — за циклами/срочностью идём только если цена интересна
                    market_low = stat['min_price']
                    if price <= int(market_low * PRICE_THRESHOLD_FACTOR) or is_avito_low:
                        listing_soup = self.open_listing(raw_url)
                        if listing_soup:
                            _, _, _, cycles, is_urgent = extract_specs_from_page(listing_soup)

                if not stat:
                    logger.info(f"      ❌ Нет в базе: {model_name} {ram}/{ssd}")
                    self.seen.add(url); newly_seen.append(url); continue

                market_low    = stat['min_price']
                should_notify = (
                    price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                    or is_avito_low or is_urgent
                )
                logger.info(f"      💰 {price:,}₽ | рынок {market_low:,}₽ "
                            f"(порог {int(market_low * PRICE_THRESHOLD_FACTOR):,}₽) "
                            f"→ notify={should_notify}")

                if should_notify:
                    self.notify(title, price, market_low, stat['buyout_price'],
                                ram or 8, ssd or 256, url,
                                cycles, is_urgent, is_avito_low)
                    found += 1
                    time.sleep(random.uniform(2, 4))

                self.seen.add(url)
                newly_seen.append(url)
                time.sleep(random.uniform(0.8, 1.5))

            except Exception as e:
                logger.warning(f"      ⚠️  {e}")
                continue

        if newly_seen:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({"updated_at": datetime.now().isoformat(),
                           "seen_urls": list(self.seen)[-5000:]}, f)

        self.context.close()
        self.browser.close()
        logger.info(f"🏁 Готово. Уведомлений: {found}")


def main():
    with sync_playwright() as pw:
        AvitoScanner(pw).run()

if __name__ == "__main__":
    main()
