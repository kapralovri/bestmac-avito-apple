#!/usr/bin/env python3
"""
Price Builder v2 — автоматическая классификация.

Вместо 84 индивидуальных URL парсит 5 широких поисков по семействам
(MacBook Air, MacBook Pro, iMac, Mac mini, Mac Studio),
автоматически классифицирует каждое объявление и строит базу цен.

Старый parser.py (scripts/avito-parser/parser.py) не удалён.
"""
import json
import os
import re
import sys
import time
import random
import statistics
import argparse
import logging
from datetime import datetime
from pathlib import Path

# Добавляем scripts/ в path для импорта common
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.classifier import classify, AppleConfig
from common.config import (
    SCAN_FAMILIES, MIN_YEARS, JUNK_KEYWORDS,
    MIN_PRICE, MAX_PRICE,
)

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install playwright beautifulsoup4 lxml 2captcha-python && playwright install chromium")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PriceBuilder")

# --- КОНФИГУРАЦИЯ ---
SCRIPT_DIR  = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')
AVITO_CAPTCHA_ID  = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL  = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT        = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                     'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

MAX_PAGES_PER_FAMILY = 15
MIN_SAMPLES = 5


# ─── Капча (из parser.py) ────────────────────────────────────────────────────

def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


def solve_captcha(page) -> bool:
    if not RUCAPTCHA_API_KEY:
        logger.warning("⚠️ RUCAPTCHA_API_KEY не задан")
        return False
    try:
        from twocaptcha import TwoCaptcha
        solver = TwoCaptcha(RUCAPTCHA_API_KEY, server='rucaptcha.com', defaultTimeout=120)

        logger.info(f"[ШАГ 1] 🧩 GeeTest v4 | captcha_id: {AVITO_CAPTCHA_ID}")
        result = solver.geetest_v4(captcha_id=AVITO_CAPTCHA_ID, url=page.url)
        logger.info(f"[ШАГ 1] ✅ RuCaptcha ответила")

        code = result['code']
        code_data = json.loads(code) if isinstance(code, str) else code

        js_payload = json.dumps({
            'captcha': '',
            'hCaptchaResponse': '',
            'captcha_id': AVITO_CAPTCHA_ID,
            'lot_number': code_data['lot_number'],
            'pass_token': code_data['pass_token'],
            'gen_time': code_data['gen_time'],
            'captcha_output': code_data['captcha_output'],
        })
        resp_data = page.evaluate(f"""async () => {{
            const resp = await fetch('{AVITO_VERIFY_URL}', {{
                method: 'POST',
                headers: {{
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'origin': 'https://www.avito.ru',
                    'referer': window.location.href,
                }},
                credentials: 'include',
                body: JSON.stringify({js_payload}),
            }});
            return await resp.json();
        }}""")

        if not resp_data.get('result', {}).get('verified', False):
            logger.error("❌ verified=False")
            return False
        logger.info("✅ Капча пройдена!")

        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(3000)
        return not is_captcha_page(page)

    except Exception as e:
        logger.error(f"❌ Ошибка капчи: {e}")
        return False


def navigate_with_captcha(page, url: str) -> bool:
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(random.randint(1500, 3000))
    except PWTimeout:
        logger.warning(f"⏱ Таймаут: {url[:60]}")
        return False
    except Exception as e:
        logger.warning(f"⚠️ Ошибка goto: {e}")
        return False

    for attempt in range(1, 4):
        if not is_captcha_page(page):
            return True
        logger.warning(f"🛡 Капча (попытка {attempt}/3)")
        if not solve_captcha(page):
            return False
        page.wait_for_timeout(3000)

    return not is_captcha_page(page)


# ─── IQR анализ цен (из parser.py) ──────────────────────────────────────────

def get_market_analysis(prices):
    if not prices:
        return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)

    if n >= 8:
        q1 = prices[n // 4]
        q3 = prices[3 * n // 4]
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        clean_prices = [p for p in prices if lower <= p <= upper]
        if len(clean_prices) < 3:
            clean_prices = prices
    else:
        clean_prices = prices

    return clean_prices[0], clean_prices[-1], int(statistics.median(clean_prices))


# ─── Основной билдер ────────────────────────────────────────────────────────

class PriceBuilder:
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
        logger.info("🌐 Прогрев: avito.ru...")
        ok = navigate_with_captcha(self.page, "https://www.avito.ru")
        if ok:
            logger.info("✅ Прогрев пройден")
        else:
            logger.warning("⚠️ Прогрев не удался, продолжаем...")
        self.page.wait_for_timeout(random.randint(2000, 4000))

    def parse_family(self, family_key: str, family_config: dict, max_pages: int) -> dict:
        """
        Парсит одно семейство (MacBook Air, iMac и т.д.).
        Возвращает dict: {(model_name, ram, ssd): [price1, price2, ...]}
        """
        label = family_config['label']
        url = family_config['url']
        logger.info(f"\n{'='*50}")
        logger.info(f"📦 {label} — парсим до {max_pages} страниц")
        logger.info(f"{'='*50}")

        # {(model_name, ram, ssd): [prices]}
        configs = {}
        total_items = 0
        total_classified = 0
        total_skipped_junk = 0
        total_skipped_year = 0
        total_unclassified = 0

        for page_num in range(1, max_pages + 1):
            page_url = f"{url}&p={page_num}" if '?' in url else f"{url}?p={page_num}"
            time.sleep(random.uniform(3, 6))

            ok = navigate_with_captcha(self.page, page_url)
            if not ok:
                logger.warning(f"   ⚠️ Не удалось загрузить стр. {page_num}")
                break

            soup = BeautifulSoup(self.page.content(), 'lxml')

            # Отсекаем объявления из других городов
            other_cities = soup.find(string=re.compile(
                r'объявлени\S* есть в других городах', re.I
            ))
            if other_cities:
                parent = other_cities.find_parent(['div', 'section', 'h2', 'h3', 'span'])
                if parent:
                    for sibling in list(parent.find_next_siblings()):
                        sibling.decompose()
                    parent.decompose()

            items = soup.select('[data-marker="item"]')
            logger.info(f"   📄 Стр. {page_num}: {len(items)} объявлений")

            if not items:
                break

            for item in items:
                try:
                    title_tag = item.select_one('[data-marker="item-title"]')
                    if not title_tag:
                        continue
                    title = title_tag.get('title', '')

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet = snippet_tag.get_text().lower() if snippet_tag else ''

                    check_text = (title + ' ' + snippet).lower()

                    # Фильтр мусора
                    if any(w in check_text for w in JUNK_KEYWORDS):
                        total_skipped_junk += 1
                        continue

                    # Цена
                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    price = int(price_tag['content'])
                    if price < MIN_PRICE or price > MAX_PRICE:
                        continue

                    total_items += 1

                    # Классификация
                    config = classify(title)

                    if not config.is_valid:
                        total_unclassified += 1
                        continue

                    # Фильтр по году
                    min_year = MIN_YEARS.get(config.family, 2020)
                    if config.year and config.year < min_year:
                        total_skipped_year += 1
                        continue

                    # Группируем
                    key = (config.model_name, config.ram, config.ssd)
                    if key not in configs:
                        configs[key] = {
                            'prices': [],
                            'processor': f"Apple {config.chip_gen}" + (
                                f" {config.chip_tier}" if config.chip_tier != 'base' else ''
                            ),
                        }
                    configs[key]['prices'].append(price)
                    total_classified += 1

                except Exception:
                    continue

            # Если мало объявлений — следующая пуста
            if len(items) < 10:
                break

        logger.info(f"\n   📊 {label}: {total_items} объявлений, "
                    f"{total_classified} классифицировано, "
                    f"{total_skipped_junk} мусор, "
                    f"{total_skipped_year} старые, "
                    f"{total_unclassified} нераспознано")

        return configs

    def close(self):
        self.context.close()
        self.browser.close()


def main():
    parser = argparse.ArgumentParser(description="Price Builder v2")
    parser.add_argument("--families", nargs='*', default=None,
                        help="Семейства для парсинга (macbook_air, macbook_pro, imac, mac_mini, mac_studio). "
                             "По умолчанию — все.")
    parser.add_argument("--max-pages", type=int, default=MAX_PAGES_PER_FAMILY,
                        help=f"Макс. страниц на семейство (по умолчанию {MAX_PAGES_PER_FAMILY})")
    args = parser.parse_args()

    families_to_parse = args.families or list(SCAN_FAMILIES.keys())
    logger.info(f"🎯 Семейства: {', '.join(families_to_parse)}")

    # Собираем все конфиги из всех семейств
    all_configs = {}

    with sync_playwright() as pw:
        builder = PriceBuilder(pw)
        builder.warmup()

        for fam_key in families_to_parse:
            if fam_key not in SCAN_FAMILIES:
                logger.warning(f"⚠️ Неизвестное семейство: {fam_key}")
                continue

            fam_configs = builder.parse_family(fam_key, SCAN_FAMILIES[fam_key], args.max_pages)

            for key, data in fam_configs.items():
                if key in all_configs:
                    all_configs[key]['prices'].extend(data['prices'])
                else:
                    all_configs[key] = data

        builder.close()

    # Мержим с существующей базой
    existing_data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except Exception:
            pass

    db = {(s['model_name'], s['ram'], s['ssd']): s for s in existing_data.get('stats', [])}

    # Обновляем из новых данных
    new_count = 0
    updated_count = 0

    for (model_name, ram, ssd), data in all_configs.items():
        prices = data['prices']

        if len(prices) < MIN_SAMPLES:
            logger.info(f"   ⏭ {model_name} {ram}/{ssd}: {len(prices)} цен (мало, нужно ≥{MIN_SAMPLES})")
            continue

        low, high, median = get_market_analysis(prices)
        buyout = max(0, int((low - 12000) // 1000 * 1000))

        key = (model_name, ram, ssd)
        is_new = key not in db

        db[key] = {
            "model_name": model_name,
            "processor": data['processor'],
            "ram": ram,
            "ssd": ssd,
            "min_price": low,
            "max_price": high,
            "median_price": median,
            "buyout_price": buyout,
            "samples_count": len(prices),
            "updated_at": time.ctime(),
        }

        if is_new:
            new_count += 1
            logger.info(f"   🆕 {model_name} {ram}/{ssd}: {len(prices)} цен, "
                        f"low={low:,}₽ med={median:,}₽ buyout={buyout:,}₽")
        else:
            updated_count += 1

    # Собираем финальный output
    final_stats = []
    total_all_listings = 0

    for key, stat in db.items():
        try:
            median = int(stat.get('median_price', 0))
            if median < 5000:
                continue

            if not stat.get('min_price'):
                stat['min_price'] = int(median * 0.85)
            if not stat.get('max_price'):
                stat['max_price'] = int(median * 1.15)
            if not stat.get('buyout_price'):
                stat['buyout_price'] = max(0, int((stat['min_price'] - 12000) // 1000 * 1000))

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
    print("📊 PRICE BUILDER v2 — ИТОГИ")
    print("=" * 50)
    print(f"🆕 Новых конфигураций: {new_count}")
    print(f"🔄 Обновлено: {updated_count}")
    print(f"📈 Всего в базе: {len(final_stats)} конфигураций")
    print(f"📊 Всего объявлений: {total_all_listings}")
    print("=" * 50)


if __name__ == "__main__":
    main()
