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
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE   = Path("public/data/seen-hot-deals.json")
TELEGRAM_URL      = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL          = os.environ.get('SCAN_URL')
RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')

PRICE_THRESHOLD_FACTOR = 1.10

URGENT_KEYWORDS = [
    'срочно', 'торг', 'уступлю', 'переезд', 'сегодня',
    'быстро', 'дисконт', 'возможен торг', 'отдам за'
]
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


def detect_captcha_type(page) -> dict:
    """Определяет тип капчи на странице. Возвращает dict с типом и параметрами."""
    html = page.content()

    # GeeTest v3 — основная капча Авито
    gt_match = re.search(r'"gt"\s*:\s*"([a-f0-9]{32})"', html)
    challenge_match = re.search(r'"challenge"\s*:\s*"([a-f0-9]{32,})"', html)
    if gt_match and challenge_match:
        api_server = None
        api_match = re.search(r'"api_server"\s*:\s*"([^"]+)"', html)
        if api_match:
            api_server = api_match.group(1)
        return {
            'type': 'geetest',
            'gt': gt_match.group(1),
            'challenge': challenge_match.group(1),
            'api_server': api_server,
        }

    # GeeTest v4
    captcha_id_match = re.search(r'"captcha_id"\s*:\s*"([a-f0-9]{32})"', html)
    if captcha_id_match:
        return {'type': 'geetest_v4', 'captcha_id': captcha_id_match.group(1)}

    # reCAPTCHA v2
    sitekey_match = re.search(r'data-sitekey=["\']([^"\']+)["\']', html)
    if sitekey_match:
        return {'type': 'recaptcha_v2', 'sitekey': sitekey_match.group(1)}

    # Обычная картинка
    if page.query_selector('img[src*="captcha"]'):
        return {'type': 'image'}

    return {'type': 'unknown'}


def solve_captcha_rucaptcha(page) -> bool:
    """Определяет тип капчи Авито и решает через RuCaptcha. Возвращает True если решено."""
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️  Капча обнаружена, но RUCAPTCHA_API_KEY не задан — пропускаем")
        return False

    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        captcha_info = detect_captcha_type(page)
        logger.info(f"🔍 Тип капчи: {captcha_info['type']} | URL: {page.url[:60]}")

        # --- GeeTest v3 (основная капча Авито) ---
        if captcha_info['type'] == 'geetest':
            gt = captcha_info['gt']
            challenge = captcha_info['challenge']
            api_server = captcha_info.get('api_server')
            logger.info(f"🧩 GeeTest v3 | gt: {gt[:16]}... | challenge: {challenge[:16]}...")
            logger.info("⏳ Отправляем задачу в RuCaptcha (обычно 10-30 сек)...")

            kwargs = dict(gt=gt, challenge=challenge, url=page.url)
            if api_server:
                kwargs['apiServer'] = api_server

            result = solver.geetest(**kwargs)
            logger.info(f"✅ GeeTest решён, вставляем токены...")

            # Вставляем результат в поля формы
            page.evaluate(f"""() => {{
                const setInput = (name, val) => {{
                    let el = document.querySelector(`input[name="${{name}}"]`);
                    if (!el) {{ el = document.createElement('input'); el.type='hidden'; el.name=name; document.forms[0] && document.forms[0].appendChild(el); }}
                    if (el) el.value = val;
                }};
                setInput('geetest_challenge', '{result["geetest_challenge"]}');
                setInput('geetest_validate', '{result["geetest_validate"]}');
                setInput('geetest_seccode', '{result["geetest_seccode"]}');
                const btn = document.querySelector('button[type="submit"], input[type="submit"], .submit');
                if (btn) btn.click();
            }}""")
            page.wait_for_load_state('networkidle', timeout=15000)
            logger.info("✅ GeeTest токены вставлены, страница обновлена")
            return True

        # --- GeeTest v4 ---
        elif captcha_info['type'] == 'geetest_v4':
            captcha_id = captcha_info['captcha_id']
            logger.info(f"🧩 GeeTest v4 | captcha_id: {captcha_id[:16]}...")
            logger.info("⏳ Отправляем задачу в RuCaptcha (обычно 10-30 сек)...")
            result = solver.geetest_v4(captcha_id=captcha_id, url=page.url)
            logger.info("✅ GeeTest v4 решён")
            page.evaluate(f"""() => {{
                const s = (n, v) => {{ const e = document.querySelector(`input[name="${{n}}"]`); if(e) e.value=v; }};
                s('captcha_id', '{result["captcha_id"]}');
                s('lot_number', '{result["lot_number"]}');
                s('pass_token', '{result["pass_token"]}');
                s('gen_time', '{result["gen_time"]}');
                s('captcha_output', '{result["captcha_output"]}');
                const btn = document.querySelector('button[type="submit"], .submit');
                if (btn) btn.click();
            }}""")
            page.wait_for_load_state('networkidle', timeout=15000)
            return True

        # --- reCAPTCHA v2 ---
        elif captcha_info['type'] == 'recaptcha_v2':
            sitekey = captcha_info['sitekey']
            logger.info(f"🔑 reCAPTCHA v2 | sitekey: {sitekey[:20]}...")
            logger.info("⏳ Отправляем задачу в RuCaptcha (обычно 30-60 сек)...")
            result = solver.recaptcha(sitekey=sitekey, url=page.url)
            token = result['code']
            page.evaluate(f"""() => {{
                document.getElementById('g-recaptcha-response').value = '{token}';
                const form = document.querySelector('form');
                if (form) form.submit();
            }}""")
            page.wait_for_load_state('networkidle', timeout=15000)
            logger.info("✅ reCAPTCHA решена")
            return True

        # --- Image captcha ---
        elif captcha_info['type'] == 'image':
            logger.info("🖼 Image captcha — решаем через RuCaptcha...")
            img_el = page.query_selector('img[src*="captcha"]')
            import base64
            img_b64 = base64.b64encode(img_el.screenshot()).decode()
            result = solver.normal(img_b64)
            token = result['code']
            inp = page.query_selector('input[name*="captcha"], input[type="text"]')
            if inp:
                inp.fill(token)
                btn = page.query_selector('button[type="submit"], input[type="submit"]')
                if btn:
                    btn.click()
                    page.wait_for_load_state('networkidle', timeout=10000)
                    logger.info("✅ Image captcha решена")
                    return True

        else:
            logger.error(f"❌ Неизвестный тип капчи. HTML фрагмент: {page.content()[:500]}")

    except Exception as e:
        logger.error(f"❌ Ошибка решения капчи: {e}")

    return False


def is_captcha_page(page) -> bool:
    url = page.url.lower()
    title = page.title().lower()
    return (
        'captcha' in url
        or 'robot' in url
        or 'капча' in title
        or 'проверка' in title
        or page.query_selector('[class*="captcha"], [id*="captcha"], .firewall-container') is not None
    )


class AvitoScanner:
    def __init__(self, playwright):
        self.browser = playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
            ]
        )
        self.context = self.browser.new_context(
            viewport={'width': 1440, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='ru-RU',
            timezone_id='Europe/Moscow',
            extra_http_headers={
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
            }
        )
        # Скрываем признаки автоматизации
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            window.chrome = { runtime: {} };
        """)
        self.page = self.context.new_page()

        # Загружаем базу цен
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    self.prices[(s['model_name'].lower(), int(s['ram']), int(s['ssd']))] = s
            logger.info(f"📊 База цен: {len(self.prices)} конфигураций")

        # Загружаем историю просмотренных
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except:
                pass

    def navigate(self, url: str, wait='domcontentloaded') -> bool:
        """Переходит на страницу, обрабатывает капчу. Возвращает True если успешно."""
        try:
            self.page.goto(url, wait_until=wait, timeout=30000)
            time.sleep(random.uniform(1.5, 3.0))

            if is_captcha_page(self.page):
                logger.warning(f"🛡 Капча на {url}")
                solved = solve_captcha_rucaptcha(self.page)
                if not solved:
                    return False
                # После решения проверяем снова
                if is_captcha_page(self.page):
                    logger.error("❌ Капча не решена")
                    return False

            return True
        except PWTimeout:
            logger.warning(f"⏱ Таймаут загрузки {url}")
            return False
        except Exception as e:
            logger.warning(f"⚠️  Ошибка навигации: {e}")
            return False

    def deep_analyze(self, url: str):
        """Открывает объявление в новой вкладке, ищет циклы и срочность."""
        try:
            detail_page = self.context.new_page()
            detail_page.goto(url, wait_until='domcontentloaded', timeout=25000)
            time.sleep(random.uniform(1.0, 2.0))

            if is_captcha_page(detail_page):
                solve_captcha_rucaptcha(detail_page)

            content = detail_page.content()
            detail_page.close()

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
            logger.debug(f"deep_analyze error: {e}")
            return None, False

    def notify(self, title, price, market_low, buyout, ram, ssd, url, cycles, is_urgent, is_avito_low):
        if not TELEGRAM_URL:
            return
        badges = []
        if is_urgent:   badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
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
            logger.info(f"✅ Отправлено: {price:,} ₽")
        except Exception as e:
            logger.error(f"❌ Telegram: {e}")

    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Запуск Playwright сканера...")

        if not self.navigate(SCAN_URL):
            logger.error("❌ Не удалось загрузить SCAN_URL")
            return

        content = self.page.content()
        soup = BeautifulSoup(content, 'lxml')
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

                # Мгновенный отсев мусора
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
        scanner = AvitoScanner(pw)
        scanner.run()


if __name__ == "__main__":
    main()
