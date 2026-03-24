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


def clean_url(url: str) -> str:
    return url.split('?')[0]


def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


# ─────────────────────────────────────────────
# КАПЧА
# ─────────────────────────────────────────────

def solve_captcha(page) -> bool:
    """GeeTest v4 по примеру от поддержки RuCaptcha."""
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️  RUCAPTCHA_API_KEY не задан")
        return False
    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        logger.info(f"[ШАГ 1] 🧩 GeeTest v4 | captcha_id: {AVITO_CAPTCHA_ID}")
        logger.info("[ШАГ 1] ⏳ Отправляем в RuCaptcha (20-60 сек)...")
        result = solver.geetest_v4(captcha_id=AVITO_CAPTCHA_ID, url=page.url)
        logger.info(f"[ШАГ 1] ✅ RuCaptcha ответила: {str(result)[:100]}")

        code = result['code']
        code_data = json.loads(code) if isinstance(code, str) else code
        lot_number     = code_data['lot_number']
        pass_token     = code_data['pass_token']
        gen_time       = code_data['gen_time']
        captcha_output = code_data['captcha_output']
        logger.info(f"[ШАГ 1] lot_number: {lot_number[:16]}...")

        logger.info("[ШАГ 2] 🍪 Куки из браузера...")
        cookie_map = {c['name']: c['value'] for c in page.context.cookies()}
        logger.info(f"[ШАГ 2] Доступные куки: {list(cookie_map.keys())}")

        js_payload = json.dumps({
            'captcha': '',
            'hCaptchaResponse': '',
            'captcha_id': AVITO_CAPTCHA_ID,
            'lot_number': lot_number,
            'pass_token': pass_token,
            'gen_time': gen_time,
            'captcha_output': captcha_output,
        })
        logger.info(f"[ШАГ 3] 📤 POST через browser fetch → {AVITO_VERIFY_URL}")
        resp_data = page.evaluate(f"""async () => {{
            const resp = await fetch('{AVITO_VERIFY_URL}', {{
                method: 'POST',
                headers: {{
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'origin': 'https://www.avito.ru',
                    'referer': window.location.href,
                    'x-cube': 'undefined',
                }},
                credentials: 'include',
                body: JSON.stringify({js_payload}),
            }});
            return await resp.json();
        }}""")
        logger.info(f"[ШАГ 3] Ответ: {str(resp_data)[:200]}")

        if not resp_data.get('result', {}).get('verified', False):
            logger.error(f"[ШАГ 3] ❌ verified=False")
            return False
        logger.info("[ШАГ 3] ✅ Капча пройдена!")

        logger.info("[ШАГ 4] 🔄 Перезагружаем страницу...")
        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(3000)
        logger.info(f"[ШАГ 4] URL: {page.url[:80]} | Title: {page.title()}")
        logger.info(f"[ШАГ 4] firewall-container: {is_captcha_page(page)}")
        return True

    except Exception as e:
        logger.error(f"❌ Ошибка решения капчи: {e}")
        return False


def navigate_with_captcha(page, url: str) -> bool:
    """Переходит на URL, при необходимости решает капчу до 3 раз."""
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(random.randint(1500, 3000))
    except PWTimeout:
        logger.warning(f"⏱ Таймаут: {url[:60]}")
        return False
    except Exception as e:
        logger.warning(f"⚠️  Ошибка goto: {e}")
        return False

    for attempt in range(1, 4):
        if not is_captcha_page(page):
            return True
        logger.warning(f"🛡 Капча (попытка {attempt}/3) на {url[:60]}")
        if not solve_captcha(page):
            return False
        page.wait_for_timeout(3000)

    logger.error("❌ Капча не прошла после 3 попыток")
    return False


# ─────────────────────────────────────────────
# ПАРСИНГ ХАРАКТЕРИСТИК
# ─────────────────────────────────────────────

def parse_listing(soup: BeautifulSoup) -> dict:
    """
    Читает таблицу характеристик объявления Авито.
    Возвращает: model_name, ram, ssd, cycles, is_urgent
    """
    result = {'model_name': None, 'ram': None, 'ssd': None,
              'cycles': None, 'is_urgent': False}

    # Характеристики — список li с парами "название: значение"
    params = soup.select('[data-marker="item-params"] li')
    for li in params:
        text = li.get_text(' ', strip=True)
        lower = text.lower()

        if 'модель' in lower:
            # "Модель: MacBook Air 13 (2025, M4)"
            val = re.sub(r'(?i)модель\s*[:\s]', '', text).strip()
            if val:
                result['model_name'] = val

        elif 'оперативн' in lower:
            # "Оперативная память, ГБ: 16"
            m = re.search(r'(\d+)', text)
            if m:
                result['ram'] = int(m.group(1))

        elif 'накопител' in lower or ('объем' in lower and 'ssd' in lower.replace(' ','')):
            # "Объем накопителей, ГБ: 256"
            m = re.search(r'(\d+)', text)
            if m:
                val = int(m.group(1))
                result['ssd'] = val * 1024 if val <= 8 else val

    # Описание — циклы и срочность
    desc_el = soup.find('div', attrs={'data-marker': 'item-description'})
    desc_text = desc_el.get_text().lower() if desc_el else ''

    cyc = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
    if cyc:
        result['cycles'] = int(cyc.group(1))

    result['is_urgent'] = any(w in desc_text for w in URGENT_KEYWORDS)

    return result


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
            user_agent=USER_AGENT,
            locale='ru-RU',
            timezone_id='Europe/Moscow',
            extra_http_headers={'Accept-Language': 'ru-RU,ru;q=0.9'},
        )
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3] });
            window.chrome = { runtime: {} };
        """)
        self.page = self.context.new_page()

        # База цен: ключ — нормализованный model_name + ram + ssd
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for s in data.get('stats', []):
                key = (self._norm(s['model_name']), int(s['ram']), int(s['ssd']))
                self.prices[key] = s
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

    @staticmethod
    def _norm(s: str) -> str:
        """Нормализует строку для сравнения: lowercase, убирает лишние пробелы."""
        return re.sub(r'\s+', ' ', str(s).lower().strip())

    def find_stat(self, model_name: str, ram: int, ssd: int):
        """Ищет конфигурацию в базе цен по model_name + ram + ssd."""
        if not model_name:
            return None
        norm = self._norm(model_name)
        # Точное совпадение
        key = (norm, ram, ssd)
        if key in self.prices:
            return self.prices[key]
        # Частичное совпадение по model_name (если Авито пишет чуть иначе)
        for (db_model, db_ram, db_ssd), stat in self.prices.items():
            if db_ram == ram and db_ssd == ssd:
                if norm in db_model or db_model in norm:
                    return stat
        return None

    def notify(self, title, price, market_low, buyout, ram, ssd,
               url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL:
            return
        badges = []
        if is_urgent:    badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low: badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 200: badges.append(f"🔋 <b>АКБ: {cycles} цикл.</b>")
        status = " | ".join(badges) if badges else "🎯 <b>Подходящий вариант</b>"
        disc = int((1 - price / market_low) * 100) if market_low else 0
        disc_str = f" (−{disc}%)" if disc > 0 else ""
        text = (
            f"{status}\n\n"
            f"💻 {title}\n"
            f"⚙️ <b>{ram}GB / {ssd}GB</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b>{disc_str}\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Выкуп: {buyout:,} ₽\n"
            f"⚡ Циклы: {cycles if cycles else '—'}\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        )
        try:
            requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
            logger.info(f"✅ Telegram отправлен: {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Запуск сканера...")

        # Прогрев: сначала главная, потом SCAN_URL
        logger.info("🌐 Прогрев: avito.ru...")
        navigate_with_captcha(self.page, "https://www.avito.ru")

        logger.info("🔍 Открываем SCAN_URL...")
        if not navigate_with_captcha(self.page, SCAN_URL):
            logger.error("❌ Не удалось загрузить SCAN_URL")
            self.context.close(); self.browser.close(); return

        soup = BeautifulSoup(self.page.content(), 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено {len(items)} объявлений на странице")

        found = 0
        newly_seen = []

        for idx, item in enumerate(items, 1):
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag:
                    continue

                raw_url  = urljoin("https://www.avito.ru", link_tag['href'])
                url      = clean_url(raw_url)
                title    = link_tag.get('title', '')

                if url in self.seen:
                    continue

                # Цена
                price_tag = item.select_one('[itemprop="price"]')
                price = int(price_tag['content']) if price_tag else 0
                if price < 15000:
                    continue

                # Быстрый отсев по заголовку + сниппету
                snippet = item.select_one('[data-marker="item-description"]')
                preview = (title + ' ' + (snippet.get_text() if snippet else '')).lower()
                if any(w in preview for w in BAD_KEYWORDS):
                    self.seen.add(url); newly_seen.append(url)
                    continue

                is_avito_low = any(x in item.get_text().lower() for x in
                                   ["ниже рыночной", "цена ниже", "хорошая цена"])

                # ── Заходим в каждое объявление ──────────────────────────
                logger.info(f"[{idx}/{len(items)}] 📄 {title[:55]} | {price:,}₽")
                detail_page = self.context.new_page()
                listing_ok  = navigate_with_captcha(detail_page, raw_url)

                if not listing_ok:
                    detail_page.close()
                    self.seen.add(url); newly_seen.append(url)
                    continue

                listing_soup = BeautifulSoup(detail_page.content(), 'lxml')
                detail_page.close()

                info = parse_listing(listing_soup)
                model_name = info['model_name']
                ram        = info['ram']
                ssd        = info['ssd']
                cycles     = info['cycles']
                is_urgent  = info['is_urgent']

                logger.info(f"     Модель: {model_name} | RAM: {ram} | SSD: {ssd} | "
                            f"Циклы: {cycles} | Срочно: {is_urgent}")

                # Повторный фильтр по описанию объявления
                desc_el = listing_soup.find('div', attrs={'data-marker': 'item-description'})
                full_text = desc_el.get_text().lower() if desc_el else ''
                if any(w in full_text for w in BAD_KEYWORDS):
                    logger.info("     ❌ Отсев по описанию")
                    self.seen.add(url); newly_seen.append(url)
                    continue

                # Матчинг с базой цен
                stat = self.find_stat(model_name, ram or 8, ssd or 256)
                if not stat:
                    logger.info(f"     ❌ Нет в базе цен: {model_name} {ram}/{ssd}")
                    self.seen.add(url); newly_seen.append(url)
                    continue

                market_low = stat['min_price']
                should_notify = (
                    price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                    or is_avito_low
                    or is_urgent
                )

                logger.info(f"     💰 {price:,}₽ vs рынок {market_low:,}₽ "
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
                time.sleep(random.uniform(1, 2))

            except Exception as e:
                logger.warning(f"     ⚠️  Ошибка: {e}")
                continue

        # Сохраняем историю
        if newly_seen:
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "updated_at": datetime.now().isoformat(),
                    "seen_urls": list(self.seen)[-5000:]
                }, f)

        self.context.close()
        self.browser.close()
        logger.info(f"🏁 Готово. Уведомлений отправлено: {found}")


def main():
    with sync_playwright() as pw:
        AvitoScanner(pw).run()


if __name__ == "__main__":
    main()
