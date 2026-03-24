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
    url = page.url.lower()
    title = page.title().lower()
    body = page.content()
    return (
        'captcha' in url or 'robot' in url
        or 'капча' in title or 'проверка' in title
        or 'доступ ограничен' in body.lower()
        or 'geetest' in body.lower()
        or page.query_selector('.firewall-container, [class*="captcha"], [id*="captcha"]') is not None
    )


def solve_geetest(page, solver) -> bool:
    """
    Перехватывает gt+challenge из сетевых запросов GeeTest,
    решает через RuCaptcha, вставляет токены.
    """
    captured = {}

    def on_response(response):
        url = response.url
        # GeeTest инициализация — содержит gt и challenge
        if 'geetest.com/get' in url or 'geetest.com/gettype' in url or 'register' in url:
            try:
                body = response.json()
                if 'gt' in body:
                    captured['gt'] = body['gt']
                if 'challenge' in body:
                    captured['challenge'] = body['challenge']
            except:
                pass

    page.on('response', on_response)

    # Нажимаем "Продолжить" чтобы вызвать GeeTest инициализацию
    try:
        btn = page.query_selector('button:has-text("Продолжить"), a:has-text("Продолжить")')
        if btn:
            logger.info("🖱 Нажимаем 'Продолжить'...")
            btn.click()
            page.wait_for_timeout(3000)
    except:
        pass

    # Ищем gt в HTML если не поймали из сети
    if 'gt' not in captured:
        html = page.content()
        # data-sitekey на Авито = GeeTest gt
        sk = re.search(r'data-sitekey=["\']([a-f0-9\-]{30,})["\']', html)
        if sk:
            captured['gt'] = sk.group(1).replace('-', '')
            logger.info(f"🔍 gt из data-sitekey: {captured['gt'][:16]}...")
        # Прямой поиск в JS
        gt_m = re.search(r'"gt"\s*:\s*"([a-f0-9]{32})"', html)
        if gt_m:
            captured['gt'] = gt_m.group(1)

    if 'challenge' not in captured:
        html = page.content()
        ch_m = re.search(r'"challenge"\s*:\s*"([a-f0-9]{32,})"', html)
        if ch_m:
            captured['challenge'] = ch_m.group(1)

    if not captured.get('gt'):
        logger.error("❌ GeeTest: не удалось найти gt")
        return False

    if not captured.get('challenge'):
        # Пробуем получить challenge через GeeTest API
        try:
            gt = captured['gt']
            logger.info(f"🌐 Запрашиваем challenge у GeeTest API (gt={gt[:16]}...)")
            r = requests.get(
                f"https://api.geetest.com/get.php?gt={gt}&challenge=",
                timeout=10
            )
            data = r.json()
            if 'challenge' in data:
                captured['challenge'] = data['challenge']
        except Exception as e:
            logger.warning(f"⚠️  GeeTest API: {e}")

    if not captured.get('challenge'):
        logger.error("❌ GeeTest: не удалось найти challenge")
        return False

    gt = captured['gt']
    challenge = captured['challenge']
    logger.info(f"🧩 GeeTest v3 | gt: {gt[:16]}... | challenge: {challenge[:16]}...")
    logger.info("⏳ Отправляем в RuCaptcha (обычно 15-40 сек)...")

    try:
        result = solver.geetest(gt=gt, challenge=challenge, url=page.url)
        logger.info("✅ RuCaptcha решила GeeTest, вставляем токены...")

        gc = result.get('geetest_challenge', result.get('code', ''))
        gv = result.get('geetest_validate', '')
        gs = result.get('geetest_seccode', '')

        page.evaluate(f"""() => {{
            const s = (n, v) => {{
                let e = document.querySelector(`input[name="${{n}}"]`);
                if (!e) {{
                    e = document.createElement('input');
                    e.type = 'hidden'; e.name = n;
                    const f = document.querySelector('form');
                    if (f) f.appendChild(e);
                }}
                if (e) e.value = v;
            }};
            s('geetest_challenge', '{gc}');
            s('geetest_validate', '{gv}');
            s('geetest_seccode', '{gs}');
            const btn = document.querySelector('button[type="submit"], input[type="submit"], .submit-btn');
            if (btn) btn.click();
        }}""")
        page.wait_for_load_state('networkidle', timeout=15000)
        logger.info("✅ Токены вставлены, страница перезагружена")
        return True

    except Exception as e:
        logger.error(f"❌ Ошибка решения GeeTest: {e}")
        return False


def solve_captcha(page) -> bool:
    """Определяет тип капчи и решает через RuCaptcha."""
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️  Капча обнаружена, RUCAPTCHA_API_KEY не задан — пропускаем запуск")
        return False

    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        html = page.content()
        logger.info(f"🔍 Определяем тип капчи | URL: {page.url[:80]}")

        # GeeTest v4
        cid = re.search(r'"captcha_id"\s*:\s*"([a-f0-9]{32})"', html)
        if cid:
            logger.info(f"🧩 GeeTest v4 | captcha_id: {cid.group(1)[:16]}...")
            logger.info("⏳ Отправляем в RuCaptcha...")
            result = solver.geetest_v4(captcha_id=cid.group(1), url=page.url)
            logger.info("✅ GeeTest v4 решён")
            return True

        # GeeTest v3 или data-sitekey (Авито)
        is_geetest = (
            'geetest' in html.lower()
            or re.search(r'"gt"\s*:\s*"[a-f0-9]{32}"', html)
            or re.search(r'data-sitekey=["\'][a-f0-9\-]{30,}["\']', html)
        )
        if is_geetest:
            logger.info("🧩 Тип капчи: GeeTest v3 (основная капча Авито)")
            return solve_geetest(page, solver)

        # reCAPTCHA v2 (sitekey начинается с "6L")
        sk = re.search(r'data-sitekey=["\']([^"\']+)["\']', html)
        if sk and sk.group(1).startswith('6L'):
            sitekey = sk.group(1)
            logger.info(f"🔑 reCAPTCHA v2 | sitekey: {sitekey[:20]}...")
            logger.info("⏳ Отправляем в RuCaptcha (30-60 сек)...")
            result = solver.recaptcha(sitekey=sitekey, url=page.url)
            token = result['code']
            page.evaluate(f"""() => {{
                const el = document.getElementById('g-recaptcha-response');
                if (el) el.value = '{token}';
                const form = document.querySelector('form');
                if (form) form.submit();
            }}""")
            page.wait_for_load_state('networkidle', timeout=15000)
            logger.info("✅ reCAPTCHA v2 решена")
            return True

        logger.error(f"❌ Тип капчи не определён. Фрагмент HTML: {html[500:900]}")

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
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        """Загружает страницу, при капче пытается решить."""
        try:
            self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(random.uniform(1.5, 3.0))

            if is_captcha_page(self.page):
                logger.warning(f"🛡 Капча на {url[:60]}")
                solved = solve_captcha(self.page)
                if not solved:
                    return False
                if is_captcha_page(self.page):
                    logger.error("❌ После решения капча всё ещё показывается")
                    return False

            return True
        except PWTimeout:
            logger.warning(f"⏱ Таймаут загрузки: {url[:60]}")
            return False
        except Exception as e:
            logger.warning(f"⚠️  Ошибка навигации: {e}")
            return False

    def deep_analyze(self, url: str):
        """Открывает объявление в отдельной вкладке, ищет циклы и срочность."""
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
            logger.info(f"✅ Отправлено в Telegram: {price:,} ₽")
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
