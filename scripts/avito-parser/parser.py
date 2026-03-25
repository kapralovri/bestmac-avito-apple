#!/usr/bin/env python3
"""
Avito Price Parser
Playwright + RuCaptcha (GeeTest v4) — тот же подход что и в Scanner.
Обходит 84 конфигурации, собирает цены, строит avito-prices.json.
"""
import json
import os
import re
import time
import random
import statistics
import argparse
import logging
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install playwright beautifulsoup4 lxml 2captcha-python && playwright install chromium")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

# --- КОНФИГУРАЦИЯ ---
SCRIPT_DIR  = Path(__file__).parent
URLS_FILE   = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')
AVITO_CAPTCHA_ID  = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL  = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT        = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                     'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

JUNK_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'экран', 'матриц', 'дефект', 'аккаунт', 'коробка', 'чехол',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход',
    'трещин', 'вмятин', 'царапин', 'не включ',
]


# ─────────────────────────────────────────────
# КАПЧА (из Scanner — тот же подход)
# ─────────────────────────────────────────────

def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


def solve_captcha(page) -> bool:
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
            logger.error("[ШАГ 3] ❌ verified=False")
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

    # Финальная проверка после последней попытки
    if not is_captcha_page(page):
        logger.info("✅ Капча пройдена после финальной проверки")
        return True

    logger.error("❌ Капча не прошла после 3 попыток")
    return False


# ─────────────────────────────────────────────
# АНАЛИТИКА ЦЕН
# ─────────────────────────────────────────────

def get_market_analysis(prices: list):
    if not prices:
        return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)

    # IQR-фильтр: убираем выбросы по межквартильному размаху
    if n >= 8:
        q1 = prices[n // 4]
        q3 = prices[3 * n // 4]
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        clean_prices = [p for p in prices if lower <= p <= upper]
        if len(clean_prices) < 3:
            clean_prices = prices  # фоллбэк если слишком агрессивно
    else:
        clean_prices = prices

    market_low = clean_prices[0]
    market_high = clean_prices[-1]
    median = int(statistics.median(clean_prices))
    return market_low, market_high, median


# ─────────────────────────────────────────────
# ПАРСЕР
# ─────────────────────────────────────────────

class AvitoParser:
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

    def warmup(self):
        """Прогрев: заходим на avito.ru, решаем капчу."""
        logger.info("🌐 Прогрев: avito.ru...")
        ok = navigate_with_captcha(self.page, "https://www.avito.ru")
        if ok:
            logger.info("✅ Прогрев пройден")
        else:
            logger.warning("⚠️  Прогрев не удался, продолжаем...")
        self.page.wait_for_timeout(random.randint(2000, 4000))

    def parse_config(self, entry: dict) -> dict | None:
        """
        Парсит одну конфигурацию (1-3 страницы поиска).
        Возвращает словарь со статистикой цен или None.
        """
        model = entry['model_name']
        ram   = entry['ram']
        ssd   = entry['ssd']
        url   = entry['url'].strip()

        logger.info(f"🔎 {model} {ram}/{ssd}...")

        prices = []

        for page_num in range(1, 4):
            page_url = f"{url}&p={page_num}"
            time.sleep(random.uniform(3, 6))

            ok = navigate_with_captcha(self.page, page_url)
            if not ok:
                logger.warning(f"   ⚠️  Не удалось загрузить стр. {page_num}")
                break

            soup = BeautifulSoup(self.page.content(), 'lxml')

            # Убираем блок "объявления есть в других городах" —
            # цены из регионов сильно искажают московскую статистику
            other_cities = soup.find(string=re.compile(r'объявлени\S* есть в других городах', re.I))
            if other_cities:
                # Удаляем всё после этого блока
                parent = other_cities.find_parent(['div', 'section', 'h2', 'h3', 'span'])
                if parent:
                    for sibling in list(parent.find_next_siblings()):
                        sibling.decompose()
                    parent.decompose()
                    logger.info(f"   🏙 Отсечены объявления из других городов")

            items = soup.select('[data-marker="item"]')
            logger.info(f"   📄 Стр. {page_num}: {len(items)} объявлений")

            for item in items:
                try:
                    title_tag = item.select_one('[data-marker="item-title"]')
                    title = (title_tag.get('title', '') if title_tag else '').lower()

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet = snippet_tag.get_text().lower() if snippet_tag else ''

                    check_text = title + ' ' + snippet
                    if any(w in check_text for w in JUNK_KEYWORDS):
                        continue

                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    p = int(price_tag['content'])
                    if 15000 < p < 900000:
                        prices.append(p)
                except Exception:
                    continue

            # Если мало объявлений — следующая страница пустая
            if len(items) < 10:
                break

        if len(prices) < 5:
            logger.warning(f"   ❌ Мало данных: {len(prices)} цен (нужно ≥5)")
            return None

        low, high, median = get_market_analysis(prices)
        buyout = int((low - 12000) // 1000 * 1000)

        logger.info(
            f"   ✅ {len(prices)} цен | low={low:,}₽ med={median:,}₽ "
            f"high={high:,}₽ buyout={buyout:,}₽"
        )

        return {
            "model_name": entry['model_name'],
            "processor": entry['processor'],
            "ram": entry['ram'],
            "ssd": entry['ssd'],
            "min_price": low,
            "max_price": high,
            "median_price": median,
            "buyout_price": buyout,
            "samples_count": len(prices),
            "updated_at": time.ctime(),
        }

    def close(self):
        self.context.close()
        self.browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", default="all")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists():
        logger.error(f"❌ Файл не найден: {URLS_FILE}")
        return

    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        all_entries = json.load(f)['entries']

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 Режим: ВСЕ конфигурации ({len(my_entries)} шт)")
    else:
        b_idx = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b_idx - 1) * chunk
        end = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]
        logger.info(f"📦 Батч {b_idx}/{args.total_batches} ({len(my_entries)} шт)")

    with sync_playwright() as pw:
        avito = AvitoParser(pw)
        avito.warmup()

        new_results = []
        failed_configs = []

        for i, entry in enumerate(my_entries, 1):
            logger.info(f"━━━ [{i}/{len(my_entries)}] ━━━")
            res = avito.parse_config(entry)
            if res:
                new_results.append(res)
            else:
                failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")

        avito.close()

    # Мержим с существующей базой
    existing_data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except Exception:
            pass

    db = {(s['model_name'], s['ram'], s['ssd']): s for s in existing_data.get('stats', [])}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    final_stats = []
    total_all_listings = 0
    repaired_count = 0

    for key, stat in db.items():
        try:
            median = int(stat.get('median_price', 0))
            if median < 5000:
                continue

            if not stat.get('min_price'):
                stat['min_price'] = int(median * 0.85)
                repaired_count += 1
            if not stat.get('max_price'):
                stat['max_price'] = int(median * 1.15)
            if not stat.get('buyout_price'):
                stat['buyout_price'] = int((stat['min_price'] - 12000) // 1000 * 1000)

            clean_item = {
                "model_name": str(stat['model_name']),
                "processor": str(stat.get('processor', 'Apple M-series')),
                "ram": int(stat['ram']),
                "ssd": int(stat['ssd']),
                "min_price": int(stat['min_price']),
                "max_price": int(stat['max_price']),
                "median_price": int(stat['median_price']),
                "buyout_price": int(stat['buyout_price']),
                "samples_count": int(stat.get('samples_count', 0)),
                "updated_at": str(stat.get('updated_at', time.ctime())),
            }
            total_all_listings += clean_item["samples_count"]
            final_stats.append(clean_item)
        except Exception:
            continue

    output_data = {
        "generated_at": time.ctime(),
        "total_listings": total_all_listings,
        "stats": final_stats,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print("📊 ИТОГИ ОБНОВЛЕНИЯ БАЗЫ")
    print("=" * 50)
    print(f"✅ Обновлено успешно: {len(new_results)}")
    print(f"🛠 Отремонтировано: {repaired_count}")
    print(f"❌ Не удалось: {len(failed_configs)}")
    if failed_configs:
        for c in failed_configs:
            print(f"   — {c}")
    print(f"📈 Всего объявлений: {total_all_listings}")
    print("=" * 50)


if __name__ == "__main__":
    main()
