#!/usr/bin/env python3
"""
Avito Price Parser v2 — multi-tab parser.

Читает public/data/parser-config.json (4 вкладки) и парсит модели
в одном из двух режимов:

  • direct (MacBook):
      В таблице задан конкретный конфиг (model + processor + ram + ssd).
      Парсер собирает цены со страниц поиска и сохраняет одну запись
      с этими параметрами.

  • discovery (iMac / Mac mini / Mac Studio):
      В таблице только модель + URL. Парсер для каждого объявления
      пытается определить Процессор / RAM / SSD из заголовка, описания
      или раздела «Технические характеристики» внутри объявления.
      Группирует цены по уникальной конфигурации и сохраняет записи
      по каждой найденной комбинации.

Mac mini: фильтрует объявления с процессорами Intel — оставляет только M-серию.

Usage:
  python parser.py --tab MacBook
  python parser.py --tab iMac
  python parser.py --tab "Mac mini"
  python parser.py --tab "Mac Studio"
  python parser.py --tab all
"""
import argparse
import json
import logging
import os
import random
import re
import statistics
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Добавляем scripts/ в path для импорта common
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    from bs4 import BeautifulSoup
except ImportError:
    print("pip install playwright beautifulsoup4 lxml 2captcha-python && playwright install chromium")
    sys.exit(1)

from common.config import VALID_RAM, VALID_SSD, MIN_PRICE, MAX_PRICE, JUNK_KEYWORDS
from common.classifier import classify

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Parser")

# ─── Пути ────────────────────────────────────────────────────────────────────
SCRIPT_DIR       = Path(__file__).parent
CONFIG_FILE      = SCRIPT_DIR / "../../public/data/parser-config.json"
MODELS_CONFIG    = SCRIPT_DIR / "../../public/data/models-config.json"
PRICES_FILE      = SCRIPT_DIR / "../../public/data/avito-prices.json"
URLS_FILE        = SCRIPT_DIR / "../../public/data/avito-urls.json"
OVERRIDES_FILE   = SCRIPT_DIR / "../../public/data/price-overrides.json"


def _load_price_overrides() -> dict:
    """Ручные оверрайды медианы/выкупа по конфигам, которые ты знаешь лучше парсера.
    Ключ: 'model_name|ram|ssd' (в нижнем регистре). Значение: {"median": N, "buyout": N}.
    Применяются ПОВЕРХ авто-расчёта на каждом прогоне → переживают парсинг."""
    try:
        raw = json.load(open(OVERRIDES_FILE, encoding="utf-8")) if OVERRIDES_FILE.exists() else {}
    except Exception:
        raw = {}
    return {str(k).lower(): v for k, v in raw.items()} if isinstance(raw, dict) else {}


PRICE_OVERRIDES = _load_price_overrides()

# ─── Настройки парсинга ──────────────────────────────────────────────────────
RUCAPTCHA_API_KEY = os.environ.get("RUCAPTCHA_API_KEY", "")
AVITO_CAPTCHA_ID  = "2d9c743cf7d63dbc9db578a608196bcd"
AVITO_VERIFY_URL  = "https://www.avito.ru/web/1/firewallCaptcha/verify"
USER_AGENT        = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

MAX_PAGES_DEFAULT   = 5     # для discovery — больше выборка; для direct хватает 3
MIN_SAMPLES_DEFAULT = 3

# Mac mini: оставляем только M-серию, отбрасываем Intel
INTEL_PATTERN = re.compile(r"\b(intel|core\s*i[3579]|\bi[3579]\b)", re.I)


# ─── Капча (скопировано из price-builder v3) ────────────────────────────────

def is_captcha_page(page) -> bool:
    return page.query_selector('div.firewall-container') is not None


def solve_captcha(page, target_url: str = None) -> bool:
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

        nav_url = target_url or page.url
        page.wait_for_timeout(1500)
        page.goto(nav_url, wait_until='domcontentloaded', timeout=25000)
        page.wait_for_timeout(random.randint(2000, 4000))
        return not is_captcha_page(page)

    except Exception as e:
        logger.error(f"❌ Ошибка капчи: {e}")
        return False


def navigate(page, url: str) -> bool:
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
        if not solve_captcha(page, target_url=url):
            return False
        page.wait_for_timeout(2000)

    return not is_captcha_page(page)


# ─── Аналитика цен ───────────────────────────────────────────────────────────

def modal_center(prices, window=None):
    """Центр самого ПЛОТНОГО ценового кластера (где предложений больше всего в
    коридоре шириной `window`). Для скошенных вправо распределений (хвост перекупов
    и комплектов «+SSD/клавиатура») даёт цифру у «горба», а не серединную медиану,
    задранную хвостом. По умолчанию окно = 12% от медианы (~5–10тр в нашем сегменте)."""
    prices = sorted(prices)
    n = len(prices)
    if n < 4:
        return int(statistics.median(prices)) if prices else 0
    if window is None:
        window = max(5000, int(statistics.median(prices) * 0.12))
    best_cnt, best_i = -1, 0
    for i in range(n):
        hi = prices[i] + window
        j = i
        while j < n and prices[j] <= hi:
            j += 1
        if (j - i) > best_cnt:
            best_cnt, best_i = j - i, i
    hi = prices[best_i] + window
    cluster = [p for p in prices if prices[best_i] <= p <= hi]
    return int(statistics.median(cluster))


def market_analysis(prices: list[int]) -> tuple[int, int, int]:
    if not prices:
        return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    if n >= 8:
        q1 = prices[n // 4]
        q3 = prices[3 * n // 4]
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        clean = [p for p in prices if lo <= p <= hi]
        if len(clean) < 3:
            clean = prices
    else:
        clean = prices
    # «Медиана» = центр плотного кластера (устойчива к перекуп-хвосту); применяется
    # при следующем прогоне парсера. Ручные оверрайды перекрывают её точечно.
    return clean[0], clean[-1], modal_center(clean)


# ─── Извлечение конфига из текста ────────────────────────────────────────────

def extract_ram_from_text(text: str) -> int:
    """Ищет RAM в произвольном тексте: '16/512', '16 ГБ', '16Gb' и т.п."""
    # Формат "16/512", "16 / 512"
    m = re.search(r"\b(\d+)\s*/\s*(\d+)", text)
    if m:
        v = int(m.group(1))
        if v in VALID_RAM:
            return v
    # Формат "16 ГБ ОЗУ" / "RAM 16" / "16 gb ram"
    for pat in (r"(\d+)\s*(?:гб|gb)\s*(?:озу|ram|оперативн)",
                r"(?:озу|ram|оперативн[а-я]*)[^\d]{0,10}(\d+)",
                r"\b(\d+)\s*(?:gb|гб)\b"):
        for m in re.finditer(pat, text, re.I):
            v = int(m.group(1))
            if v in VALID_RAM:
                return v
    return 0


def extract_ssd_from_text(text: str) -> int:
    """Ищет SSD/диск в тексте: '256', '512', '1 ТБ', '1tb', '16/512'."""
    m = re.search(r"\b\d+\s*/\s*(\d+)", text)
    if m:
        v = int(m.group(1))
        if v in VALID_SSD:
            return v
        if v * 1024 in VALID_SSD and v <= 8:    # "1/2/4/8" в ТБ
            return v * 1024
    for m in re.finditer(r"(\d+)\s*(тб|tb|гб|gb)", text, re.I):
        val  = int(m.group(1))
        unit = m.group(2).lower()
        if unit.startswith(("т", "t")):
            val *= 1024
        if val in VALID_SSD:
            return val
    return 0


def extract_chip_from_text(text: str) -> str:
    """Возвращает 'M1' / 'M2 Pro' / 'M3 Max' / 'M4 Ultra' и т.д."""
    m = re.search(r"\b(m[1-9])\s*(pro|max|ultra)?\b", text, re.I)
    if not m:
        return ""
    base = m.group(1).upper()
    tier = m.group(2)
    return f"Apple {base} {tier.capitalize()}" if tier else f"Apple {base}"


# ─── Парсер ──────────────────────────────────────────────────────────────────

class AvitoParser:
    def __init__(self, playwright):
        self.browser = playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox",
                  "--disable-blink-features=AutomationControlled"],
        )
        self.context = self.browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent=USER_AGENT,
            locale="ru-RU",
            timezone_id="Europe/Moscow",
            extra_http_headers={"Accept-Language": "ru-RU,ru;q=0.9"},
        )
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3] });
            window.chrome = { runtime: {} };
        """)
        self.page = self.context.new_page()

    def warmup(self):
        logger.info("🌐 Прогрев: avito.ru...")
        ok = navigate(self.page, "https://www.avito.ru")
        if ok:
            logger.info("✅ Прогрев пройден")
        else:
            logger.warning("⚠️ Прогрев не удался, продолжаем...")
        self.page.wait_for_timeout(random.randint(2000, 4000))

    # ── Открытие объявления и чтение «Технические характеристики» ──
    def deep_specs(self, listing_url: str) -> dict:
        result = {"ram": 0, "ssd": 0, "chip": ""}
        try:
            detail = self.context.new_page()
            ok = navigate(detail, listing_url)
            if not ok:
                detail.close()
                return result
            soup = BeautifulSoup(detail.content(), "lxml")
            detail.close()
            params = soup.select('[data-marker="item-params"] li')
            for li in params:
                text  = li.get_text(" ", strip=True)
                lower = text.lower()
                if result["ram"] == 0 and ("оперативн" in lower or "ram" in lower):
                    m = re.search(r"(\d+)", text)
                    if m and int(m.group(1)) in VALID_RAM:
                        result["ram"] = int(m.group(1))
                elif result["ssd"] == 0 and (
                    "накопител" in lower or "ssd" in lower or "объ" in lower
                ):
                    m = re.search(r"(\d+)\s*(тб|tb|гб|gb)?", text, re.I)
                    if m:
                        v = int(m.group(1))
                        u = (m.group(2) or "").lower()
                        if u.startswith(("т", "t")):
                            v *= 1024
                        if v in VALID_SSD:
                            result["ssd"] = v
                elif not result["chip"] and "процессор" in lower:
                    chip = extract_chip_from_text(text)
                    if chip:
                        result["chip"] = chip
            # Фоллбэк: по тексту страницы целиком
            if result["ram"] == 0 or result["ssd"] == 0:
                full = soup.get_text(" ", strip=True)
                if result["ram"] == 0:
                    result["ram"] = extract_ram_from_text(full)
                if result["ssd"] == 0:
                    result["ssd"] = extract_ssd_from_text(full)
        except Exception as e:
            logger.debug(f"deep_specs: {e}")
        return result

    # ── Сбор объявлений со страниц поиска ──
    def collect_listings(self, url: str, max_pages: int) -> list[dict]:
        """Возвращает список {title, snippet, price, listing_url}."""
        items_all: list[dict] = []
        for page_num in range(1, max_pages + 1):
            page_url = f"{url}&p={page_num}" if "?" in url else f"{url}?p={page_num}"
            time.sleep(random.uniform(4, 7))
            logger.info(f"   ➡️  GET стр. {page_num}: {page_url[:100]}")
            ok = navigate(self.page, page_url)
            if not ok:
                logger.warning(f"   ⚠️ navigate→False (стр. {page_num}), прерываем")
                break
            soup = BeautifulSoup(self.page.content(), "lxml")

            # Отсекаем «есть в других городах»
            other = soup.find(string=re.compile(r"объявлени\S* есть в других городах", re.I))
            if other:
                parent = other.find_parent(["div", "section", "h2", "h3", "span"])
                if parent:
                    for sib in list(parent.find_next_siblings()):
                        sib.decompose()
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
                    title = title_tag.get("title", "") or title_tag.get_text(strip=True)

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet = snippet_tag.get_text(" ", strip=True) if snippet_tag else ""

                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    price = int(price_tag["content"])
                    if price < MIN_PRICE or price > MAX_PRICE:
                        continue

                    href = title_tag.get("href", "")
                    listing_url = ("https://www.avito.ru" + href).split("?")[0] if href else ""

                    items_all.append({
                        "title": title,
                        "snippet": snippet,
                        "price": price,
                        "url": listing_url,
                    })
                except Exception:
                    continue

            if len(items) < 10:
                break
        return items_all

    # ── Direct mode: пакетный разбор одного URL для нескольких конфигов ──
    def parse_direct_batch(
        self, url: str, entries: list[dict], max_pages: int
    ) -> dict[tuple, list[int]]:
        """
        Загружает url один раз, классифицирует каждое объявление и распределяет
        цены по конфигам (ram, ssd) из entries. Возвращает {(model, proc, ram, ssd): prices}.
        """
        processor = entries[0].get("processor", "Apple")
        model     = entries[0]["model"]
        logger.info(f"\n[direct] {model} | {processor} | url: {url[:80]}")
        logger.info(f"  Конфиги из таблицы: " + ", ".join(
            f"{e.get('ram',0)}/{e.get('ssd',0)}" for e in entries
        ))

        listings = self.collect_listings(url, max_pages)
        logger.info(f"  📦 Собрано {len(listings)} объявлений всего")

        # Карта (ram, ssd) → entry для быстрого поиска
        entry_map: dict[tuple, dict] = {
            (e.get("ram", 0), e.get("ssd", 0)): e for e in entries if e.get("ram") and e.get("ssd")
        }

        groups: dict[tuple, list[int]] = {}
        skipped_junk = 0
        unmatched = 0

        for it in listings:
            text  = it["title"] + " " + it["snippet"]
            lower = text.lower()

            if any(w in lower for w in JUNK_KEYWORDS):
                skipped_junk += 1
                continue

            cfg = classify(text)
            key = (cfg.ram, cfg.ssd)
            if key not in entry_map:
                unmatched += 1
                continue

            entry = entry_map[key]
            full_key = (entry["model"], entry.get("processor", "Apple"), cfg.ram, cfg.ssd)
            groups.setdefault(full_key, []).append(it["price"])

        logger.info(f"  мусор={skipped_junk} не_в_таблице={unmatched}")
        for (m, p, r, s), prices in groups.items():
            logger.info(f"  ✅ {r}/{s}: {len(prices)} цен")
        if not groups:
            logger.warning(f"  ⚠️ Ни одного конфига не распознано из {len(listings)} объявлений")
        return groups

    # ── Discovery mode: разбор объявлений на конфиги ──
    def parse_discovery(
        self, entry: dict, family: str, max_pages: int, exclude_intel: bool
    ) -> dict:
        model       = entry["model"]
        url         = entry["url"]
        seed_chip   = entry.get("processor", "")  # из таблицы (e.g. "m1")
        seed_ram    = entry.get("ram", 0)
        seed_ssd    = entry.get("ssd", 0)

        logger.info(f"\n[discovery] {model} (seed: chip={seed_chip!r} ram={seed_ram} ssd={seed_ssd})")
        listings = self.collect_listings(url, max_pages)

        groups: dict[tuple, list[int]] = {}
        deep_count   = 0
        skipped_intel = 0
        skipped_junk = 0
        skipped_nospec = 0

        for it in listings:
            text  = (it["title"] + " " + it["snippet"])
            lower = text.lower()

            if any(w in lower for w in JUNK_KEYWORDS):
                skipped_junk += 1
                continue

            # Mac mini: только M-серия
            if exclude_intel and INTEL_PATTERN.search(lower):
                skipped_intel += 1
                continue

            # Извлекаем чип/ram/ssd из заголовка+описания
            chip = extract_chip_from_text(text) or (
                f"Apple {seed_chip.upper()}" if seed_chip else ""
            )
            ram = extract_ram_from_text(text) or seed_ram
            ssd = extract_ssd_from_text(text) or seed_ssd

            # Если чего-то не хватает — открываем объявление
            if (not chip or not ram or not ssd) and it["url"]:
                deep = self.deep_specs(it["url"])
                deep_count += 1
                if not chip and deep["chip"]:
                    chip = deep["chip"]
                if not ram and deep["ram"]:
                    ram = deep["ram"]
                if not ssd and deep["ssd"]:
                    ssd = deep["ssd"]
                time.sleep(random.uniform(0.8, 1.8))

            # Финальная проверка: должны быть все 3 параметра
            if not chip or not ram or not ssd:
                skipped_nospec += 1
                continue

            # Mac mini: повторно проверяем чип после deep
            if exclude_intel and not re.search(r"\bm[1-9]\b", chip, re.I):
                skipped_intel += 1
                continue

            key = (model, chip, ram, ssd)
            groups.setdefault(key, []).append(it["price"])

        logger.info(
            f"   📊 {len(listings)} объявл. | "
            f"deep={deep_count} | intel={skipped_intel} | junk={skipped_junk} | "
            f"no-specs={skipped_nospec} | конфигов={len(groups)}"
        )
        return groups

    def close(self):
        self.context.close()
        self.browser.close()


# ─── Загрузка конфига ────────────────────────────────────────────────────────

def load_config() -> dict:
    if not CONFIG_FILE.exists():
        logger.error(f"❌ Не найден {CONFIG_FILE}. Запусти sync-google-sheet.py")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_models_url_map() -> dict[str, str]:
    """Строит карту model_name.lower() → url из models-config.json (price-builder)."""
    if not MODELS_CONFIG.exists():
        return {}
    try:
        with open(MODELS_CONFIG, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {e["model_name"].lower(): e["url"] for e in data.get("entries", []) if e.get("url")}
    except Exception as e:
        logger.warning(f"⚠️ Не удалось загрузить models-config.json: {e}")
        return {}


# ─── Сборка статистики и запись в БД ─────────────────────────────────────────

def build_stat(
    model: str, processor: str, ram: int, ssd: int,
    family: str, prices: list[int], buyout_override: int = 0,
) -> dict:
    low, high, median = market_analysis(prices)
    # Ручной оверрайд медианы/выкупа (если задан для этого конфига)
    ov = PRICE_OVERRIDES.get(f"{str(model).lower()}|{int(ram)}|{int(ssd)}", {})
    if ov.get("median"):
        median = int(ov["median"])
    if ov.get("buyout"):
        buyout = int(ov["buyout"])
    else:
        buyout = buyout_override or max(0, int(median * 0.80 // 1000 * 1000))
    return {
        "model_name":   model,
        "family":       family,
        "processor":    processor,
        "ram":          int(ram),
        "ssd":          int(ssd),
        "min_price":    int(low),
        "max_price":    int(high),
        "median_price": int(median),
        "buyout_price": int(buyout),
        "samples_count": len(prices),
        "updated_at":   datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


def merge_into_db(
    db: dict[tuple, dict], new_stats: list[dict]
) -> tuple[int, int]:
    new_count = updated_count = 0
    for s in new_stats:
        key = (s["model_name"], s["processor"], s["ram"], s["ssd"])
        if key in db:
            updated_count += 1
        else:
            new_count += 1
        db[key] = s
    return new_count, updated_count


def build_url_entries(stats: list[dict], tabs_data: dict) -> list[dict]:
    """Опции дропдаунов для фронта. URL берём из таблицы по семейству."""
    family_url: dict[str, str] = {}
    for fam, t in tabs_data.items():
        for e in t["entries"]:
            family_url.setdefault(fam, e.get("url", ""))

    out = []
    seen = set()
    for s in stats:
        key = (s["model_name"], s["processor"], s["ram"], s["ssd"])
        if key in seen:
            continue
        seen.add(key)
        fam = s.get("family", "")
        out.append({
            "family":     fam,
            "model_name": s["model_name"],
            "processor":  s["processor"],
            "ram":        s["ram"],
            "ssd":        s["ssd"],
            "url":        family_url.get(fam, ""),
        })
    out.sort(key=lambda x: (x["family"], x["model_name"], x["processor"], x["ram"], x["ssd"]))
    return out


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tab", required=True,
                    help="MacBook | iMac | 'Mac mini' | 'Mac Studio' | all")
    ap.add_argument("--max-pages", type=int, default=MAX_PAGES_DEFAULT)
    ap.add_argument("--clean", action="store_true",
                    help="Не мержить с БД, очистить только обработанные семейства")
    ap.add_argument("--time-limit", type=int, default=0,
                    help="Лимит времени в минутах (0 = без лимита)")
    args = ap.parse_args()

    cfg = load_config()
    tabs_cfg = cfg["tabs"]

    if args.tab == "all":
        target_tabs = list(tabs_cfg.keys())
    elif args.tab in tabs_cfg:
        target_tabs = [args.tab]
    else:
        logger.error(f"❌ Вкладка '{args.tab}' не найдена. Доступно: {list(tabs_cfg.keys())}")
        sys.exit(1)

    deadline = None
    if args.time_limit > 0:
        deadline = datetime.now() + timedelta(minutes=args.time_limit)
        logger.info(f"⏱ Лимит {args.time_limit} мин (дедлайн {deadline.strftime('%H:%M:%S')})")

    # Загружаем существующую БД
    existing = {"stats": []}
    if PRICES_FILE.exists():
        try:
            with open(PRICES_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass
    db: dict[tuple, dict] = {
        (s["model_name"], s.get("processor", ""), s["ram"], s["ssd"]): s
        for s in existing.get("stats", [])
    }
    logger.info(f"📥 В БД сейчас: {len(db)} записей")

    # Карта model_name.lower() → url из models-config.json (price-builder)
    models_url_map = load_models_url_map()
    logger.info(f"🗺  models-config.json: {len(models_url_map)} моделей загружено")

    # Если --clean — удаляем записи обрабатываемых семейств
    if args.clean:
        before = len(db)
        db = {k: v for k, v in db.items() if v.get("family") not in target_tabs}
        logger.info(f"🧹 --clean: удалено {before - len(db)} записей семейств {target_tabs}")

    # Парсим
    new_stats: list[dict] = []
    with sync_playwright() as pw:
        ap_obj = AvitoParser(pw)
        ap_obj.warmup()

        for tab_name in target_tabs:
            tab = tabs_cfg[tab_name]
            mode = tab["mode"]
            entries = tab["entries"]
            exclude_intel = (tab_name == "Mac mini")

            logger.info(f"\n{'=' * 60}")
            logger.info(f"📦 Вкладка '{tab_name}' | mode={mode} | строк={len(entries)}")
            logger.info(f"{'=' * 60}")

            if mode == "direct":
                # Группируем записи по модели (model_name), используем URL из models-config.
                # Один запрос к Avito на модель → распределяем по (ram, ssd) через classifier.
                by_model: dict[str, list[dict]] = {}
                for e in entries:
                    by_model.setdefault(e["model"], []).append(e)

                for model_idx, (model_name, model_entries) in enumerate(by_model.items(), 1):
                    if deadline and datetime.now() >= deadline:
                        logger.warning(f"⏱ Время вышло")
                        break

                    # Используем URL из models-config.json если есть (надёжнее Avito filter URL)
                    url = models_url_map.get(model_name.lower()) or model_entries[0].get("url", "")
                    if not url:
                        logger.warning(f"⏭ Нет URL для '{model_name}', пропускаем")
                        continue

                    src = "models-config" if model_name.lower() in models_url_map else "таблица"
                    logger.info(f"\n[{tab_name} {model_idx}/{len(by_model)}] {model_name} (URL из {src})")

                    try:
                        groups = ap_obj.parse_direct_batch(url, model_entries, args.max_pages)
                        for (m, p, r, s), prices in groups.items():
                            if len(prices) < MIN_SAMPLES_DEFAULT:
                                logger.warning(f"   ⚠️ {r}/{s}: мало цен {len(prices)} < {MIN_SAMPLES_DEFAULT}")
                                continue
                            # buyout_price из таблицы для этого конфига (если задан)
                            entry_match = next(
                                (e for e in model_entries if e.get("ram") == r and e.get("ssd") == s),
                                {}
                            )
                            stat = build_stat(m, p, r, s, tab_name, prices,
                                              entry_match.get("buyout_price", 0))
                            new_stats.append(stat)
                    except Exception as e:
                        logger.error(f"   ❌ {model_name}: {e}")
                        continue

            else:
                for idx, entry in enumerate(entries, 1):
                    if deadline and datetime.now() >= deadline:
                        logger.warning(f"⏱ Время вышло, прерываюсь на {idx}/{len(entries)}")
                        break

                    logger.info(f"\n[{tab_name} {idx}/{len(entries)}] {entry['model']}")
                    try:
                        groups = ap_obj.parse_discovery(
                            entry, tab_name, args.max_pages, exclude_intel
                        )
                        for (m, p, r, s), prices in groups.items():
                            if len(prices) < MIN_SAMPLES_DEFAULT:
                                logger.info(f"   ⏭ {m} | {p} {r}/{s}: {len(prices)} цен < {MIN_SAMPLES_DEFAULT}")
                                continue
                            stat = build_stat(m, p, r, s, tab_name, prices)
                            new_stats.append(stat)
                    except Exception as e:
                        logger.error(f"   ❌ {entry['model']}: {e}")
                        continue

        ap_obj.close()

    # Мержим в БД
    new_count, updated_count = merge_into_db(db, new_stats)
    final_stats = sorted(db.values(),
                         key=lambda s: (s.get("family", ""), s["model_name"],
                                        s["processor"], s["ram"], s["ssd"]))
    total_listings = sum(s.get("samples_count", 0) for s in final_stats)

    # Пишем avito-prices.json
    PRICES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PRICES_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at":   datetime.now().strftime("%Y-%m-%d %H:%M"),
            "total_listings": total_listings,
            "stats":          final_stats,
        }, f, ensure_ascii=False, indent=2)

    # Пишем avito-urls.json (опции для фронта)
    url_entries = build_url_entries(final_stats, tabs_cfg)
    with open(URLS_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "description": "Опции дропдаунов фронта. Автогенерируется парсером.",
            "updated_at":  datetime.now().strftime("%Y-%m-%d"),
            "entries":     url_entries,
        }, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("📊 ИТОГИ")
    print("=" * 60)
    print(f"🆕 Новых конфигов:  {new_count}")
    print(f"🔄 Обновлено:       {updated_count}")
    print(f"📈 Всего в БД:      {len(final_stats)}")
    print(f"📊 Всего объявл.:   {total_listings}")
    print(f"💾 {PRICES_FILE}")
    print(f"💾 {URLS_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
