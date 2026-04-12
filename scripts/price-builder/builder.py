#!/usr/bin/env python3
"""
Price Builder v3 — Model-level URLs.

Читает список моделей из public/data/models-config.json
(синхронизируется скриптом sync-google-sheet.py из вкладки «Модели» Google Sheets),
для каждой модели парсит URL поиска Авито (до --max-pages страниц),
классифицирует каждое объявление через common/classifier.py
и группирует цены по (classifier.model_name, ram, ssd).

Итог:
  - public/data/avito-prices.json — статистика цен (IQR, median, buyout)
  - public/data/avito-urls.json    — опции для фронтового дропдауна (model/processor/ram/ssd)
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
from pathlib import Path

# Добавляем scripts/ в path для импорта common
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.classifier import classify, AppleConfig
from common.config import (
    MIN_YEARS, JUNK_KEYWORDS,
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
SCRIPT_DIR    = Path(__file__).parent
MODELS_CONFIG = SCRIPT_DIR / "../../public/data/models-config.json"
PRICES_FILE   = SCRIPT_DIR / "../../public/data/avito-prices.json"
URLS_FILE     = SCRIPT_DIR / "../../public/data/avito-urls.json"

RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')
AVITO_CAPTCHA_ID  = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL  = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT        = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                     'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

MAX_PAGES_DEFAULT = 15
MIN_SAMPLES_DEFAULT = 3

# ── Маппинг «семейство из Sheets» → список допустимых classifier.family ──────
# (Позволяет Sheet сказать "MacBook" без уточнения Air/Pro.)
SHEET_FAMILY_SCOPE = {
    "MacBook":    {"MacBook Air", "MacBook Pro"},
    "MacBook Air": {"MacBook Air"},
    "MacBook Pro": {"MacBook Pro"},
    "iMac":        {"iMac"},
    "Mac mini":    {"Mac mini"},
    "Mac Studio":  {"Mac Studio"},
    "Mac Pro":     {"Mac Pro"},
}


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


# ─── IQR анализ цен ─────────────────────────────────────────────────────────

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


def processor_label(config: AppleConfig) -> str:
    """`Apple M3 Pro` / `Apple M1`."""
    if not config.chip_gen:
        return "Apple"
    base = f"Apple {config.chip_gen}"
    if config.chip_tier and config.chip_tier != 'base':
        return f"{base} {config.chip_tier}"
    return base


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

    # ── Deep analysis: открываем объявление и читаем «Технические характеристики» ──

    def deep_analyze(self, listing_url: str) -> dict:
        """
        Открывает страницу объявления и извлекает RAM и SSD из раздела
        «Технические характеристики» (data-marker="item-params").
        Возвращает {'ram': int, 'ssd': int, 'processor': str}.
        Нули означают «не найдено».
        """
        result = {'ram': 0, 'ssd': 0, 'processor': ''}
        try:
            detail_page = self.context.new_page()
            ok = navigate_with_captcha(detail_page, listing_url)
            if not ok:
                detail_page.close()
                return result

            soup = BeautifulSoup(detail_page.content(), 'lxml')
            detail_page.close()

            # Читаем «item-params» — список li с характеристиками
            params = soup.select('[data-marker="item-params"] li')

            for li in params:
                text = li.get_text(' ', strip=True)
                lower = text.lower()

                if result['ram'] == 0 and ('оперативн' in lower or 'ram' in lower):
                    m = re.search(r'(\d+)', text)
                    if m:
                        v = int(m.group(1))
                        from common.config import VALID_RAM
                        if v in VALID_RAM:
                            result['ram'] = v

                elif result['ssd'] == 0 and (
                    'накопител' in lower or 'ssd' in lower
                    or ('объ' in lower and ('гб' in lower or 'gb' in lower or 'тб' in lower or 'tb' in lower))
                ):
                    m = re.search(r'(\d+)\s*(тб|tb|гб|gb)', text, re.I)
                    if m:
                        val = int(m.group(1))
                        unit = m.group(2).lower()
                        if 'т' in unit or 't' in unit:
                            val *= 1024
                        from common.config import VALID_SSD
                        if val in VALID_SSD:
                            result['ssd'] = val

                elif not result['processor'] and 'процессор' in lower:
                    val = re.sub(r'(?i)процессор\s*[:\s]', '', text).strip()
                    if val:
                        result['processor'] = val

            # Фоллбэк: ищем по тексту страницы построчно
            if result['ram'] == 0 or result['ssd'] == 0:
                lines = [ln.strip() for ln in soup.get_text('\n').split('\n') if ln.strip()]
                from common.config import VALID_RAM, VALID_SSD
                for i, line in enumerate(lines):
                    low = line.lower()
                    next_line = lines[i + 1].strip() if i + 1 < len(lines) else ''

                    if result['ram'] == 0 and re.match(r'^оперативная память$', low):
                        m = re.search(r'(\d+)', next_line)
                        if m and int(m.group(1)) in VALID_RAM:
                            result['ram'] = int(m.group(1))

                    elif result['ssd'] == 0 and re.match(r'^(?:накопитель ssd|объ[её]м накопителя|ssd)$', low):
                        m = re.search(r'(\d+)\s*(тб|tb|гб|gb)?', next_line, re.I)
                        if m:
                            val = int(m.group(1))
                            unit = (m.group(2) or '').lower()
                            if 'т' in unit or 't' in unit:
                                val *= 1024
                            if val in VALID_SSD:
                                result['ssd'] = val

        except Exception as e:
            logger.debug(f"     deep_analyze error: {e}")

        return result

    def parse_entry(self, entry: dict, max_pages: int) -> dict:
        """
        Парсит одну запись из models-config (одна модель/год).

        model_name ФИКСИРОВАН из конфига — модели точно соответствуют листу Google Sheets.
        Классификатор используется только для определения Процессора / RAM / SSD.
        Если RAM или SSD не удалось извлечь из заголовка — открываем объявление
        и читаем «Технические характеристики».

        Возвращает {(model_name, processor, ram, ssd): {'prices': [...]}}.
        """
        sheet_family = entry.get('family', '').strip()
        sheet_label  = entry.get('model_name', '').strip()   # ← ФИКСИРОВАННЫЙ model_name
        url          = entry.get('url', '').strip()

        if not url:
            return {}

        # Допустимые семейства классификатора для этой строки Sheet
        allowed_families = SHEET_FAMILY_SCOPE.get(sheet_family, None)

        logger.info(f"\n{'='*60}")
        logger.info(f"📦 {sheet_label}  [{sheet_family}]")
        logger.info(f"{'='*60}")

        configs: dict[tuple, dict] = {}
        total_items = 0
        total_classified = 0
        total_deep = 0
        total_skipped_family = 0
        total_skipped_junk = 0
        total_skipped_no_specs = 0

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
                    title = title_tag.get('title', '') or title_tag.get_text(strip=True)

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet = snippet_tag.get_text().lower() if snippet_tag else ''

                    check_text = (title + ' ' + snippet).lower()

                    # ── Фильтр стоп-слов ─────────────────────────────────────
                    if any(w in check_text for w in JUNK_KEYWORDS):
                        total_skipped_junk += 1
                        continue

                    # ── Цена ─────────────────────────────────────────────────
                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    price = int(price_tag['content'])
                    if price < MIN_PRICE or price > MAX_PRICE:
                        continue

                    total_items += 1

                    # ── Классификация по заголовку ────────────────────────────
                    config = classify(title)

                    # Санити-чек: семейство должно совпадать с тем, что ожидаем
                    if allowed_families and config.family and config.family not in allowed_families:
                        total_skipped_family += 1
                        continue

                    # ── Deep analysis при отсутствии RAM или SSD ──────────────
                    if config.ram == 0 or config.ssd == 0:
                        link_tag = item.select_one('[data-marker="item-title"]')
                        listing_href = link_tag.get('href', '') if link_tag else ''
                        if listing_href:
                            listing_url = ('https://www.avito.ru' + listing_href).split('?')[0]
                            logger.debug(f"     🔍 Deep: {title[:50]}")
                            deep = self.deep_analyze(listing_url)
                            total_deep += 1
                            if config.ram == 0 and deep['ram']:
                                config.ram = deep['ram']
                            if config.ssd == 0 and deep['ssd']:
                                config.ssd = deep['ssd']
                            # Если чип не определён из заголовка — пробуем из спека
                            if not config.chip_gen and deep['processor']:
                                # Парсим чип из строки типа "Apple M4 Pro"
                                m = re.search(r'\b(m[1-9])\s*(pro|max|ultra)?\b',
                                              deep['processor'], re.I)
                                if m:
                                    config.chip_gen = m.group(1).upper()
                                    if m.group(2):
                                        config.chip_tier = m.group(2).capitalize()
                            time.sleep(random.uniform(1.5, 3.0))

                    # После deep — если всё ещё нет RAM или SSD → пропускаем
                    if config.ram == 0 or config.ssd == 0:
                        total_skipped_no_specs += 1
                        continue

                    # ── model_name ФИКСИРОВАН из конфига ─────────────────────
                    # Диагональ и год всегда соответствуют модели из листа.
                    # Только Процессор/RAM/SSD берутся из объявления.
                    model_name = sheet_label
                    proc = processor_label(config) if config.chip_gen else 'Apple'
                    key = (model_name, proc, config.ram, config.ssd)

                    if key not in configs:
                        configs[key] = {'prices': []}
                    configs[key]['prices'].append(price)
                    total_classified += 1

                except Exception as e:
                    logger.debug(f"   item error: {e}")
                    continue

            # Мало объявлений — следующая страница пустая
            if len(items) < 10:
                break

        logger.info(
            f"   📊 {total_items} объявл. | "
            f"{total_classified} классиф. | "
            f"{total_deep} deep | "
            f"{total_skipped_family} не та модель | "
            f"{total_skipped_junk} стоп-слова | "
            f"{total_skipped_no_specs} нет спеков"
        )
        logger.info(f"   🗂 Уникальных конфигов: {len(configs)}")

        return configs

    def close(self):
        self.context.close()
        self.browser.close()


# ─── Генерация avito-urls.json для фронта ───────────────────────────────────

def build_url_entries(final_stats: list[dict], sheet_entries: list[dict]) -> list[dict]:
    """
    Формирует avito-urls.json для фронтового дропдауна.
    Каждый stat → entry {model_name, processor, ram, ssd, url}.
    URL берётся из Sheet-записи с наиболее подходящим семейством.
    """
    # Индекс sheet_entries по семейству → URL (первый попавшийся)
    family_to_url: dict[str, str] = {}
    for e in sheet_entries:
        fam = e.get('family', '').strip()
        if fam and fam not in family_to_url:
            family_to_url[fam] = e.get('url', '')

    def find_url(model_name: str) -> str:
        # MacBook Air/Pro → ищем по конкретной, затем по общему MacBook
        if 'MacBook Air' in model_name:
            return (family_to_url.get('MacBook Air')
                    or family_to_url.get('MacBook', ''))
        if 'MacBook Pro' in model_name:
            return (family_to_url.get('MacBook Pro')
                    or family_to_url.get('MacBook', ''))
        if 'iMac' in model_name:
            return family_to_url.get('iMac', '')
        if 'Mac Studio' in model_name:
            return family_to_url.get('Mac Studio', '')
        if 'Mac mini' in model_name:
            return family_to_url.get('Mac mini', '')
        if 'Mac Pro' in model_name:
            return family_to_url.get('Mac Pro', '')
        return ''

    url_entries: list[dict] = []
    seen: set[tuple] = set()
    for stat in final_stats:
        key = (stat['model_name'], stat['processor'], stat['ram'], stat['ssd'])
        if key in seen:
            continue
        seen.add(key)
        url_entries.append({
            "model_name": stat['model_name'],
            "processor": stat['processor'],
            "ram": stat['ram'],
            "ssd": stat['ssd'],
            "url": find_url(stat['model_name']),
        })

    url_entries.sort(key=lambda x: (x['model_name'], x['processor'], x['ram'], x['ssd']))
    return url_entries


# ─── Main ───────────────────────────────────────────────────────────────────

def load_models_config() -> list[dict]:
    if not MODELS_CONFIG.exists():
        logger.error(f"❌ Не найден {MODELS_CONFIG}. Сначала запустите sync-google-sheet.py")
        sys.exit(1)
    with open(MODELS_CONFIG, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('entries', [])


def main():
    parser = argparse.ArgumentParser(description="Price Builder v3 (model-level URLs)")
    parser.add_argument("--max-pages", type=int, default=MAX_PAGES_DEFAULT,
                        help=f"Макс. страниц на модель (по умолчанию {MAX_PAGES_DEFAULT})")
    parser.add_argument("--min-samples", type=int, default=MIN_SAMPLES_DEFAULT,
                        help=f"Минимум цен для конфигурации (по умолчанию {MIN_SAMPLES_DEFAULT})")
    parser.add_argument("--clean", action='store_true',
                        help="Не мержить с существующей базой, пересоздать с нуля")
    parser.add_argument("--models", nargs='*', default=None,
                        help="Фильтр по model_name из Sheets (подстрока), по умолчанию — все")
    parser.add_argument("--family", default=None,
                        help="Фильтр по семейству из Sheets (MacBook, iMac, Mac mini, Mac Studio)")
    args = parser.parse_args()

    entries = load_models_config()
    logger.info(f"📋 Загружено моделей из models-config.json: {len(entries)}")

    # Фильтрация
    if args.family:
        entries = [e for e in entries if e.get('family', '').lower() == args.family.lower()]
        logger.info(f"   🔍 После фильтра по семейству '{args.family}': {len(entries)}")

    if args.models:
        needles = [m.lower() for m in args.models]
        entries = [
            e for e in entries
            if any(n in e.get('model_name', '').lower() for n in needles)
        ]
        logger.info(f"   🔍 После фильтра по models: {len(entries)}")

    if not entries:
        logger.error("❌ Нет моделей для парсинга")
        return

    logger.info(f"🎯 К парсингу: {len(entries)} моделей")

    # Парсим все модели
    all_configs: dict[tuple, dict] = {}

    with sync_playwright() as pw:
        builder = PriceBuilder(pw)
        builder.warmup()

        for idx, entry in enumerate(entries, 1):
            logger.info(f"\n[{idx}/{len(entries)}]")
            try:
                entry_configs = builder.parse_entry(entry, args.max_pages)
            except Exception as e:
                logger.error(f"   ❌ Ошибка парсинга {entry.get('model_name')}: {e}")
                continue

            for key, data in entry_configs.items():
                # key = (model_name, processor, ram, ssd)
                if key in all_configs:
                    all_configs[key]['prices'].extend(data['prices'])
                else:
                    all_configs[key] = {'prices': list(data['prices'])}

        builder.close()

    # Мержим с существующей базой (если не --clean)
    existing_data = {"stats": []}
    if not args.clean and PRICES_FILE.exists():
        try:
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            logger.info(f"📥 Существующих записей: {len(existing_data.get('stats', []))}")
        except Exception:
            pass

    # Ключ базы: (model_name, processor, ram, ssd)
    db: dict[tuple, dict] = {
        (s['model_name'], s.get('processor', ''), s['ram'], s['ssd']): s
        for s in existing_data.get('stats', [])
    }

    # Удаляем устаревшие модели (не в конфиге)
    valid_model_names = {e['model_name'] for e in entries}
    pruned_count = sum(1 for k in list(db) if k[0] not in valid_model_names)
    db = {k: v for k, v in db.items() if k[0] in valid_model_names}
    if pruned_count:
        logger.info(f"🗑 Удалено устаревших записей: {pruned_count}")

    new_count = 0
    updated_count = 0
    skipped_low_samples = 0

    for (model_name, processor, ram, ssd), data in all_configs.items():
        prices = data['prices']

        if len(prices) < args.min_samples:
            logger.info(f"   ⏭ {model_name} | {processor} {ram}/{ssd}: "
                        f"{len(prices)} цен (< {args.min_samples})")
            skipped_low_samples += 1
            continue

        low, high, median = get_market_analysis(prices)
        buyout = max(0, int((low - 12000) // 1000 * 1000))

        key = (model_name, processor, ram, ssd)
        is_new = key not in db

        db[key] = {
            "model_name": model_name,
            "processor": processor,
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
            logger.info(f"   🆕 {model_name} | {processor} {ram}/{ssd}: "
                        f"{len(prices)} цен, low={low:,}₽ med={median:,}₽ buyout={buyout:,}₽")
        else:
            updated_count += 1

    # Собираем финальный output
    final_stats = []
    total_all_listings = 0

    for _, stat in db.items():
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

    final_stats.sort(key=lambda x: (x['model_name'], x['ram'], x['ssd']))

    output_data = {
        "generated_at": time.ctime(),
        "total_listings": total_all_listings,
        "stats": final_stats,
    }

    PRICES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PRICES_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # Генерим avito-urls.json для фронта
    url_entries = build_url_entries(final_stats, entries)
    urls_data = {
        "description": "Опции дропдаунов для фронта. Автогенерируется билдером из результатов парсинга.",
        "updated_at": time.strftime("%Y-%m-%d"),
        "entries": url_entries,
    }
    with open(URLS_FILE, 'w', encoding='utf-8') as f:
        json.dump(urls_data, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("📊 PRICE BUILDER v3 — ИТОГИ")
    print("=" * 60)
    print(f"🆕 Новых конфигураций: {new_count}")
    print(f"🔄 Обновлено: {updated_count}")
    print(f"⏭ Пропущено (мало цен): {skipped_low_samples}")
    print(f"📈 Всего в базе: {len(final_stats)} конфигураций")
    print(f"📊 Всего объявлений: {total_all_listings}")
    print(f"💾 Записано: {PRICES_FILE}")
    print(f"💾 Записано: {URLS_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
