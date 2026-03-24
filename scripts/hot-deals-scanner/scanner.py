#!/usr/bin/env python3
"""
Avito Hot Deals Scanner
Playwright + RuCaptcha (GeeTest v4) + Telegram
"""
import json
import os
import re
import time
import random
import logging
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
except ImportError:
    print("❌ pip install playwright && playwright install chromium")
    exit(1)

try:
    from twocaptcha import TwoCaptcha
except ImportError:
    print("❌ pip install 2captcha-python")
    exit(1)

try:
    import requests
except ImportError:
    print("❌ pip install requests")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# ─── КОНФИГУРАЦИЯ ───────────────────────────────────────────────────────────
PRICES_FILE    = Path("public/data/avito-prices.json")
SEEN_FILE      = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL   = os.environ.get('TELEGRAM_NOTIFY_URL', '')
SCAN_URL       = os.environ.get('SCAN_URL', '')
RUCAPTCHA_KEY  = os.environ.get('RUCAPTCHA_API_KEY', '')
PROXY_URL      = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")

AVITO_CAPTCHA_ID = "2d9c743cf7d63dbc9db578a608196bcd"
AVITO_VERIFY_URL = "https://www.avito.ru/web/1/firewallCaptcha/verify"

PRICE_THRESHOLD_FACTOR = 1.10

URGENT_KEYWORDS = ['срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро', 'дисконт', 'возможен торг', 'отдам за']

BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'экран', 'матриц', 'дефект', 'аккаунт', 'коробка', 'чехол',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход'
]

# ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ────────────────────────────────────────────────
def clean_url(url: str) -> str:
    return url.split('?')[0]

def extract_specs_from_title(title: str):
    """Пробуем вытащить RAM/SSD прямо из заголовка: '16/512', '8 GB / 256 GB' и т.д."""
    t = title.lower().replace(' ', '')
    # Формат: 16/512 или 8/256
    slash = re.search(r'(\d+)/(\d+)', t)
    if slash:
        a, b = int(slash.group(1)), int(slash.group(2))
        if a in [8, 16, 18, 24, 32, 36, 48, 64] and b in [256, 512, 1024, 2048]:
            return a, b
        if b in [8, 16, 18, 24, 32, 36, 48, 64] and a in [256, 512, 1024, 2048]:
            return b, a
    # Формат: 16gb, 512gb
    matches = re.findall(r'(\d+)(?:gb|гб|tb|тб)', t)
    clean = [m for m in matches if not (2018 <= int(m) <= 2026)]
    ram, ssd = 8, 256
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

def match_model_in_prices(prices: dict, title: str, ram: int, ssd: int):
    for (m_name, m_ram, m_ssd), stat in prices.items():
        keywords = re.findall(r'[a-z0-9]+', m_name)
        if all(w in title.lower() for w in keywords) and m_ram == ram and m_ssd == ssd:
            return stat
    return None

# ─── КАПЧА ──────────────────────────────────────────────────────────────────
def is_captcha_page(page) -> bool:
    try:
        return page.locator('#firewall-container').count() > 0
    except Exception:
        return False

def solve_captcha(page) -> bool:
    if not RUCAPTCHA_KEY:
        logger.error("❌ RUCAPTCHA_API_KEY не задан")
        return False

    solver = TwoCaptcha(RUCAPTCHA_KEY, server='rucaptcha.com')

    logger.info(f"[ШАГ 1] 🧩 GeeTest v4 | captcha_id: {AVITO_CAPTCHA_ID}")
    logger.info("[ШАГ 1] ⏳ Отправляем в RuCaptcha (20-60 сек)...")

    try:
        result = solver.geetest_v4(
            captcha_id=AVITO_CAPTCHA_ID,
            url=page.url
        )
    except Exception as e:
        logger.error(f"[ШАГ 1] ❌ Ошибка RuCaptcha: {e}")
        return False

    logger.info(f"[ШАГ 1] ✅ RuCaptcha ответила: {str(result)[:120]}")

    try:
        code_data = json.loads(result['code'])
    except Exception as e:
        logger.error(f"[ШАГ 1] ❌ Не удалось разобрать code: {e} | raw: {result}")
        return False

    lot_number   = code_data.get('lot_number', '')
    pass_token   = code_data.get('pass_token', '')
    gen_time     = code_data.get('gen_time', '')
    captcha_output = code_data.get('captcha_output', '')

    logger.info(f"[ШАГ 1] lot_number: {lot_number[:16]}...")

    # ШАГ 2 — куки из браузера
    logger.info("[ШАГ 2] 🍪 Куки из браузера...")
    cookies = page.context.cookies()
    cookie_map = {c['name']: c['value'] for c in cookies}
    logger.info(f"[ШАГ 2] Доступные куки: {list(cookie_map.keys())}")

    # ШАГ 3 — POST через browser fetch (чтобы куки сохранились в браузере)
    payload = {
        "lot_number":     lot_number,
        "pass_token":     pass_token,
        "gen_time":       gen_time,
        "captcha_output": captcha_output,
        "captcha_id":     AVITO_CAPTCHA_ID,
    }
    js_payload = json.dumps(payload)

    logger.info(f"[ШАГ 3] 📤 POST через browser fetch → {AVITO_VERIFY_URL}")

    try:
        resp_data = page.evaluate(f"""async () => {{
            const r = await fetch('{AVITO_VERIFY_URL}', {{
                credentials: 'include',
                method: 'POST',
                headers: {{
                    'content-type': 'application/json',
                    'x-cube': 'undefined',
                    'accept': 'application/json, text/plain, */*',
                    'origin': 'https://www.avito.ru',
                    'referer': 'https://www.avito.ru/'
                }},
                body: JSON.stringify({js_payload}),
            }});
            return await r.json();
        }}""")
    except Exception as e:
        logger.error(f"[ШАГ 3] ❌ Ошибка fetch: {e}")
        return False

    logger.info(f"[ШАГ 3] Ответ: {str(resp_data)[:200]}")

    verified = False
    try:
        verified = resp_data.get('result', {}).get('verified', False)
    except Exception:
        pass

    if not verified:
        logger.warning(f"[ШАГ 3] ⚠️ verified=False, ответ: {resp_data}")
        return False

    # ШАГ 4 — перезагрузка страницы
    logger.info("[ШАГ 4] 🔄 Перезагружаем страницу...")
    try:
        page.reload(wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(2000)
    except Exception as e:
        logger.warning(f"[ШАГ 4] ⚠️ Ошибка reload: {e}")

    captcha_gone = not is_captcha_page(page)
    logger.info(f"[ШАГ 4] URL: {page.url} | Title: {page.title()} | firewall-container: {is_captcha_page(page)}")

    return captcha_gone

def navigate_with_captcha(page, url: str, max_attempts: int = 3) -> bool:
    """Переходит на URL, решает капчу до max_attempts раз."""
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=45000)
    except Exception as e:
        logger.warning(f"⚠️ goto {url}: {e}")
        return False

    page.wait_for_timeout(random.randint(1500, 3000))

    for attempt in range(1, max_attempts + 1):
        if not is_captcha_page(page):
            return True
        logger.warning(f"🛡 Капча на {url} (попытка {attempt}/{max_attempts})")
        if not solve_captcha(page):
            logger.error(f"❌ Не удалось решить капчу (попытка {attempt})")
            if attempt < max_attempts:
                page.wait_for_timeout(5000)
            continue
        page.wait_for_timeout(3000)

    if is_captcha_page(page):
        logger.error(f"❌ Капча не пройдена после {max_attempts} попыток: {url}")
        return False
    return True

# ─── ПАРСИНГ ОБЪЯВЛЕНИЯ ─────────────────────────────────────────────────────
def parse_listing_page(page, url: str):
    """
    Открывает страницу объявления и извлекает:
    - model_name (из заголовка h1)
    - ram, ssd (из таблицы характеристик или заголовка)
    - cycles (циклы АКБ из описания)
    - is_urgent (срочность из описания)
    """
    ok = navigate_with_captcha(page, url)
    if not ok:
        return None, None, None, None, False

    page.wait_for_timeout(random.randint(1000, 2000))

    try:
        # Заголовок объявления
        h1 = page.locator('h1[itemprop="name"]').first
        title = h1.inner_text().strip() if h1.count() > 0 else ""
        if not title:
            title = page.title()

        logger.info(f"  📄 Заголовок: {title[:80]}")

        # ─── Характеристики: стратегия 1 — таблица params ───────────────
        ram, ssd = None, None
        params_block = page.locator('[data-marker="item-params"]').first
        if params_block.count() > 0:
            params_text = params_block.inner_text().lower()
            logger.info(f"  📋 Параметры (сырые): {params_text[:200]}")

            # RAM
            r = re.search(r'(?:оперативная память|ram)[:\s]*(\d+)\s*(?:gb|гб)', params_text)
            if r:
                ram = int(r.group(1))
            # SSD
            s = re.search(r'(?:накопитель|ssd|диск|storage)[:\s]*(\d+)\s*(?:gb|гб|tb|тб)', params_text)
            if s:
                val = int(s.group(1))
                ssd = val * 1024 if val <= 8 else val

        # ─── Стратегия 2 — item-view-characteristics ─────────────────────
        if ram is None or ssd is None:
            chars = page.locator('[class*="item-view-characteristics"]').first
            if chars.count() > 0:
                ct = chars.inner_text().lower()
                logger.info(f"  📋 Characteristics: {ct[:200]}")
                if ram is None:
                    r = re.search(r'(?:оперативная память|ram)[:\s]*(\d+)', ct)
                    if r:
                        ram = int(r.group(1))
                if ssd is None:
                    s = re.search(r'(?:накопитель|ssd|диск)[:\s]*(\d+)\s*(?:gb|гб|tb|тб)?', ct)
                    if s:
                        val = int(s.group(1))
                        ssd = val * 1024 if val <= 8 else val

        # ─── Стратегия 3 — из заголовка ──────────────────────────────────
        if ram is None or ssd is None:
            tr, ts = extract_specs_from_title(title)
            if ram is None:
                ram = tr
            if ssd is None:
                ssd = ts
            logger.info(f"  📋 Specs из заголовка: RAM={ram}, SSD={ssd}")

        logger.info(f"  ✅ Итог: RAM={ram}GB, SSD={ssd}GB")

        # ─── Описание: циклы и срочность ──────────────────────────────────
        desc = page.locator('[data-marker="item-description"]').first
        desc_text = desc.inner_text().lower() if desc.count() > 0 else ""

        cycles = None
        cm = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
        if cm:
            cycles = int(cm.group(1))

        is_urgent = any(w in desc_text for w in URGENT_KEYWORDS)

        return title, ram, ssd, cycles, is_urgent

    except Exception as e:
        logger.warning(f"  ⚠️ Ошибка парсинга {url}: {e}")
        return None, None, None, None, False

# ─── УВЕДОМЛЕНИЕ ────────────────────────────────────────────────────────────
def send_notify(title, price, market_low, buyout, ram, ssd, url, cycles, is_urgent, is_avito_low):
    if not TELEGRAM_URL:
        return

    badges = []
    if is_urgent:
        badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
    if is_avito_low:
        badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
    if cycles and cycles < 150:
        badges.append("🔋 <b>АКБ ИДЕАЛ</b>")

    status_line = " | ".join(badges) if badges else "🎯 <b>Нашел подходящий вариант!</b>"
    discount_pct = int((1 - price / market_low) * 100) if market_low > 0 else 0
    discount_str = f" (−{discount_pct}%)" if discount_pct > 0 else ""

    text = (
        f"{status_line}\n\n"
        f"💻 {title}\n"
        f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB</b>\n"
        f"💰 Цена: <b>{price:,} ₽</b>{discount_str}\n"
        f"📉 Низ рынка: {market_low:,} ₽\n"
        f"🤝 Выкуп: {buyout:,} ₽\n"
        f"⚡ Циклы: {cycles if cycles else 'не указано'}\n"
        f"🔗 <a href='{url}'>Открыть на Avito</a>"
    )
    try:
        requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        logger.info(f"✅ Уведомление отправлено: {price:,} ₽")
    except Exception as e:
        logger.error(f"❌ Ошибка Telegram: {e}")

# ─── ОСНОВНОЙ КЛАСС ─────────────────────────────────────────────────────────
class AvitoScanner:
    def __init__(self):
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
            logger.info(f"📊 База цен загружена: {len(self.prices)} конфигураций")
        else:
            logger.warning("⚠️ avito-prices.json не найден — сравнение с рынком недоступно")

        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except Exception:
                pass

        self.page = None

    def _proxy_args(self):
        if not PROXY_URL:
            return {}
        p = PROXY_URL if PROXY_URL.startswith('http') else f"http://{PROXY_URL}"
        return {"proxy": {"server": p}}

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
                **self._proxy_args()
            )
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
                locale="ru-RU",
                timezone_id="Europe/Moscow",
            )
            self.page = context.new_page()

            # ─── ПРОГРЕВ: avito.ru ───────────────────────────────────────
            logger.info("🌐 Прогрев: avito.ru...")
            ok = navigate_with_captcha(self.page, "https://www.avito.ru")
            if ok:
                logger.info("✅ Прогрев avito.ru пройден")
                self.page.wait_for_timeout(random.randint(2000, 4000))
            else:
                logger.warning("⚠️ Прогрев не удался, продолжаем...")

            # ─── ОТКРЫВАЕМ SCAN_URL ──────────────────────────────────────
            logger.info(f"🎬 Открываем SCAN_URL: {SCAN_URL[:80]}...")
            ok = navigate_with_captcha(self.page, SCAN_URL)
            if not ok:
                logger.error("❌ Не удалось открыть SCAN_URL")
                browser.close()
                return

            # ─── СОБИРАЕМ ОБЪЯВЛЕНИЯ ─────────────────────────────────────
            items_data = self._collect_listings()
            logger.info(f"🔎 Найдено объявлений на странице: {len(items_data)}")

            found_matches = 0
            newly_seen = []

            for idx, item in enumerate(items_data, 1):
                url   = item['url']
                price = item['price']
                raw_title = item['title']
                is_avito_low = item['is_avito_low']

                if url in self.seen:
                    continue

                # Мгновенный отсев по заголовку
                if any(w in raw_title.lower() for w in BAD_KEYWORDS):
                    logger.info(f"  [#{idx}] ⛔ Пропускаем (плохие слова): {raw_title[:60]}")
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                if price < 15000:
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                logger.info(f"  [#{idx}] 🔍 {raw_title[:60]} | {price:,} ₽ | {url}")

                # ─── Открываем объявление ─────────────────────────────────
                time.sleep(random.uniform(2, 4))
                listing_title, ram, ssd, cycles, is_urgent = parse_listing_page(self.page, url)

                if listing_title is None:
                    logger.warning(f"  [#{idx}] ⚠️ Не удалось открыть объявление")
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                # Фильтр по BAD_KEYWORDS из полного текста
                full_text = (listing_title or raw_title).lower()
                if any(w in full_text for w in BAD_KEYWORDS):
                    logger.info(f"  [#{idx}] ⛔ Плохие слова в объявлении")
                    self.seen.add(url)
                    newly_seen.append(url)
                    continue

                # ─── Сравниваем с базой цен ───────────────────────────────
                matched = match_model_in_prices(self.prices, listing_title, ram, ssd)

                if matched:
                    market_low = matched['min_price']
                    should_notify = (
                        price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                        or is_avito_low
                        or is_urgent
                    )
                    logger.info(
                        f"  [#{idx}] 📊 Низ рынка: {market_low:,} ₽ | "
                        f"Наша цена: {price:,} ₽ | notify={should_notify}"
                    )
                    if should_notify:
                        send_notify(
                            listing_title, price, market_low, matched['buyout_price'],
                            ram, ssd, url, cycles, is_urgent, is_avito_low
                        )
                        found_matches += 1
                else:
                    logger.info(f"  [#{idx}] ℹ️ Модель не найдена в базе: {listing_title[:60]} RAM={ram} SSD={ssd}")

                self.seen.add(url)
                newly_seen.append(url)

                # Возвращаемся на страницу поиска
                navigate_with_captcha(self.page, SCAN_URL)

            # ─── Сохраняем историю ────────────────────────────────────────
            if newly_seen:
                with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                    json.dump({
                        "updated_at": datetime.now().isoformat(),
                        "seen_urls": list(self.seen)[-4500:]
                    }, f)

            logger.info(f"🏁 Завершено. Найдено совпадений: {found_matches}")
            browser.close()

    def _collect_listings(self) -> list:
        """Собирает все карточки с текущей страницы поиска."""
        result = []
        try:
            items = self.page.locator('[data-marker="item"]').all()
            for item in items:
                try:
                    link = item.locator('[data-marker="item-title"]').first
                    href = link.get_attribute('href') or ''
                    raw_url = f"https://www.avito.ru{href}" if href.startswith('/') else href
                    url = clean_url(raw_url)

                    title = link.get_attribute('title') or link.inner_text().strip()

                    price_el = item.locator('[itemprop="price"]').first
                    price_str = price_el.get_attribute('content') or '0'
                    price = int(price_str) if price_str.isdigit() else 0

                    item_text = item.inner_text().lower()
                    is_avito_low = any(x in item_text for x in ["ниже рыночной", "цена ниже", "хорошая цена"])

                    result.append({
                        'url': url,
                        'title': title,
                        'price': price,
                        'is_avito_low': is_avito_low,
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"⚠️ Ошибка сбора карточек: {e}")
        return result


if __name__ == "__main__":
    AvitoScanner().run()
