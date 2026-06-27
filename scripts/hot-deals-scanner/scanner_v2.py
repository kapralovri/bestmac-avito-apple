#!/usr/bin/env python3
"""
Scanner v2 — детектор лотов НИЖЕ ЖИВОГО РЫНКА для перекупа.

Переделка (vs прежней версии):
- «Низ рынка» считается не по замороженному снимку базы (min из ~5 устаревших
  сэмплов), а по ЖИВОЙ выборке: грузим несколько страниц выдачи, строим
  распределение цен сопоставимых лотов прямо сейчас, сравниваем с медианой + P20.
  → больше нет «бот зовёт низом рынка лот, ниже которого висит десяток дешевле».
- Гейт состояния: полное описание объявления анализируется на дефекты, % АКБ,
  циклы. Жёсткий дефект → лот вообще не уходит в алерт. → больше нет «все
  присланные аппараты с проблемами».
- Скоринг перекупа: якорь — выкупная цена и запас маржи; чистое состояние
  поднимает, подозрительно дешёвое без подтверждения — топится.
- Сканер больше НЕ пишет одно-сэмпловые конфиги в базу цен (убрано загрязнение).
"""
import json
import os
import re
import sys
import time
import random
import logging
import statistics
import argparse
import html
import hashlib
import urllib3
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Добавляем scripts/ в path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.classifier import classify, config_to_db_key, processor_label
from common.condition import analyze_condition
from common.market import robust_stats, assess_deal, MarketStats
from common.negotiator import motivation_score, MotivationReport
from common.config import (
    SCAN_FAMILIES, JUNK_KEYWORDS, NEW_SEALED_KEYWORDS, URGENT_KEYWORDS, MOSCOW_MARKERS,
    MIN_PRICE, MAX_PRICE, PRICE_THRESHOLD_FACTOR, MIN_YEARS,
    SCAN_PAGES_PER_FAMILY, MIN_COMPS, MIN_MARGIN, SCAM_FLOOR, BUYOUT_FACTOR,
    BATTERY_HARD, BATTERY_SOFT, CYCLES_HARD, CYCLES_SOFT,
    STALE_PRICES_HOURS, STALE_ALERT_COOLDOWN_HOURS, EXCLUDE_INTEL_FAMILIES,
    STALE_LISTING_DAYS, STALE_MIN_DROP, STALE_SCAN_PAGES, STALE_MAX_LEADS, REGISTRY_MAX,
    RESELLER_REVIEWS, DELIVERY_MAX_PRICE,
)

try:
    from curl_cffi import requests as curl_requests
    CURL_AVAILABLE = True
except ImportError:
    CURL_AVAILABLE = False

try:
    import requests as std_requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: pip install curl_cffi requests beautifulsoup4 lxml")
    exit(1)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ScannerV2")

if CURL_AVAILABLE:
    logger.info("✅ curl_cffi доступен")

# ─── Конфигурация ─────────────────────────────────────────────────────────────
def _load_dotenv():
    """Минимальный загрузчик .env (рядом со скриптом или в рабочей папке).
    Без зависимостей. НЕ перетирает уже заданные переменные окружения."""
    bases = []
    try:
        bases.append(Path(__file__).resolve().parent)
    except NameError:
        pass
    bases.append(Path.cwd())
    for base in bases:
        envf = base / ".env"
        if not envf.exists():
            continue
        try:
            for line in envf.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass


_load_dotenv()


PRICES_FILE  = Path(os.environ.get('PRICES_FILE_PATH', 'public/data/avito-prices.json'))
SEEN_FILE    = Path(os.environ.get('SEEN_FILE_PATH', 'public/data/seen-hot-deals.json'))
HISTORY_FILE = Path(os.environ.get('PRICE_HISTORY_PATH', 'public/data/price-history.json'))
DIGEST_FILE  = Path(os.environ.get('DIGEST_FILE_PATH', 'public/data/pending-digest.json'))
HEALTH_FILE  = Path(os.environ.get('PARSER_HEALTH_PATH', 'public/data/parser-health.json'))
# Очередь лидов для бота переговоров (scripts/negotiation-bot/bot.py)
QUEUE_FILE   = Path(os.environ.get('NEGOTIATION_QUEUE_PATH', 'public/data/negotiation-queue.json'))
# Реестр объявлений (для охотника за залежавшимися): когда впервые увидели, история цены
REGISTRY_FILE = Path(os.environ.get('LISTING_REGISTRY_PATH', 'public/data/listing-registry.json'))

# Точечные алерты: в реальном времени шлём только score >= MIN_NOTIFY_SCORE,
# лоты 40..74 копим в дайджест (одно сообщение вечером — крон с флагом --digest).
MIN_NOTIFY_SCORE = int(os.environ.get('MIN_NOTIFY_SCORE', '50'))
DIGEST_MIN_SCORE = int(os.environ.get('DIGEST_MIN_SCORE', '40'))

TELEGRAM_URL  = os.environ.get('TELEGRAM_NOTIFY_URL')
RUCAPTCHA_API_KEY = os.environ.get('RUCAPTCHA_API_KEY', '')

# DeepSeek — для co-pilot (готовое сообщение продавцу). Тот же ключ, что у бэкенда.
DEEPSEEK_API_KEY  = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = os.environ.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').rstrip('/')
DEEPSEEK_MODEL    = os.environ.get('DEEPSEEK_MODEL', 'deepseek-v4-pro')

# Env-переменные для scan URL (опционально — если не заданы, берутся из config.py)
SCAN_URL = os.environ.get('SCAN_URL')  # legacy: одиночный URL

# Прокси
PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

AVITO_CAPTCHA_ID = '2d9c743cf7d63dbc9db578a608196bcd'
AVITO_VERIFY_URL = 'https://www.avito.ru/web/1/firewallCaptcha/verify'
USER_AGENT = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
              'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

CURL_BROWSERS = ["chrome110", "chrome107", "chrome104", "chrome101", "chrome100"]


def clean_url(url):
    return url.split('?')[0]


# ─── Контроль свежести базы цен (дохлый-выключатель парсера) ─────────────────
def parse_generated_at(s):
    """Парсит generated_at из avito-prices.json. None, если формат не распознан."""
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%a %b %d %H:%M:%S %Y"):
        try:
            return datetime.strptime(str(s).strip(), fmt)
        except (ValueError, TypeError):
            continue
    return None


def should_alert_stale(age_hours, last_alert_iso, now, threshold_hours, cooldown_hours):
    """Решает, слать ли алерт о застрявшем парсере (с учётом кулдауна)."""
    if age_hours is None or age_hours < threshold_hours:
        return False
    if last_alert_iso:
        try:
            last = datetime.fromisoformat(last_alert_iso)
            if (now - last).total_seconds() < cooldown_hours * 3600:
                return False
        except (ValueError, TypeError):
            pass
    return True


# ─── Капча (из scanner v1 / parser.py) ───────────────────────────────────────

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
        logger.info("[ШАГ 1] ⏳ Отправляем в RuCaptcha (20-60 сек)...")
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

        logger.info(f"[ШАГ 3] 📤 POST → {AVITO_VERIFY_URL}")
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
        logger.info(f"[ШАГ 3] Ответ: {str(resp_data)[:200]}")

        if not resp_data.get('result', {}).get('verified', False):
            logger.error("[ШАГ 3] ❌ verified=False")
            return False
        logger.info("[ШАГ 3] ✅ Капча пройдена!")

        logger.info("[ШАГ 4] 🔄 Перезагружаем страницу...")
        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_timeout(3000)
        logger.info(f"[ШАГ 4] firewall-container: {is_captcha_page(page)}")
        return not is_captcha_page(page)

    except Exception as e:
        logger.error(f"❌ Ошибка капчи: {e}")
        return False


def navigate_with_captcha(page, url: str) -> bool:
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(random.randint(1500, 3000))
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


# ─── Парсинг времени публикации ──────────────────────────────────────────────
def parse_item_age(item):
    try:
        date_tag = (
            item.select_one('[data-marker="item-date"]') or
            item.select_one('p[class*="date"]') or
            item.select_one('[class*="dateInfo"]')
        )
        if not date_tag:
            return "?", 999

        raw = date_tag.get_text(strip=True).lower()

        if 'минут' in raw or 'мин' in raw:
            m = re.search(r'(\d+)', raw)
            mins = int(m.group(1)) if m else 30
            return f"{mins} мин", mins

        if 'час' in raw:
            m = re.search(r'(\d+)', raw)
            hrs = int(m.group(1)) if m else 2
            return f"{hrs} ч", hrs * 60

        if 'сегодня' in raw:
            m = re.search(r'(\d{1,2}):(\d{2})', raw)
            if m:
                h, mn = int(m.group(1)), int(m.group(2))
                now = datetime.now()
                pub = now.replace(hour=h, minute=mn, second=0)
                diff = max(0, int((now - pub).total_seconds() / 60))
                label = f"{diff} мин" if diff < 60 else f"{diff // 60} ч"
                return label, diff
            return "сегодня", 120

        if 'вчера' in raw:
            return "вчера", 60 * 24

        m = re.search(r'(\d+)\s*д', raw)
        if m:
            days = int(m.group(1))
            return f"{days} дн", days * 60 * 24

    except Exception:
        pass
    return "?", 999


# ─── Ключ живой выборки рынка ────────────────────────────────────────────────
def live_key(config):
    """Каноничный ключ для группировки сопоставимых лотов в живой выборке.
    Группируем по семейству+чипу+экрану+RAM+SSD — это и есть «такой же аппарат»."""
    return (
        config.family,
        config.chip_gen,
        config.chip_tier,
        config.screen,
        config.ram,
        config.ssd,
    )


# ─── Скоринг сделки (перекуп: якорь — выкуп + чистота состояния) ──────────────
def is_reseller(seller_reviews, seller_type):
    """Перекупщик: «Магазин» или частник с большим числом отзывов (торг бесполезен)."""
    if seller_type == "Магазин":
        return True
    return bool(seller_reviews is not None and seller_reviews >= RESELLER_REVIEWS)


def score_deal(price, stats, buyout, condition, is_private, is_moscow,
               minutes_ago, assess, reseller=False):
    """
    Оценивает лот против ЖИВОГО рынка. Состояние — полноправный фактор:
    чистый аппарат поднимается, проблемный/подозрительно дешёвый — падает.

    stats   — common.market.MarketStats (живая выборка)
    buyout  — целевая выкупная цена (курируемая или median*BUYOUT_FACTOR)
    condition — common.condition.ConditionReport
    assess  — common.market.DealAssessment (margin, is_suspicious)
    """
    score = 0

    # 1) Запас ниже медианы рынка — ядро сигнала «ниже рынка»
    m = assess.margin
    if   m >= 0.20: score += 32
    elif m >= 0.14: score += 24
    elif m >= 0.10: score += 16
    elif m >= 0.06: score += 9

    # 2) Привязка к выкупу — «куплю не дороже выкупа = заработаю»
    if buyout and buyout > 0:
        if   price <= buyout * 0.92: score += 34
        elif price <= buyout:        score += 22
        elif price <= buyout * 1.08: score += 8
        elif price >  buyout * 1.20: score -= 15

    # 3) Ниже 20-го перцентиля живого рынка — реально дёшево среди ТЕКУЩИХ
    if price <= stats.p20: score += 12

    # 4) Состояние — критично для перекупа (ok:+12/+18, suspect:-25)
    score += condition.score_delta

    # 5) Доверие к рынку: чем больше живых сопоставимых, тем надёжнее вывод
    if   stats.n >= 12: score += 8
    elif stats.n >= 6:  score += 4

    # 6) Продавец / гео / свежесть
    if is_private:           score += 8
    if is_moscow:            score += 6
    if minutes_ago <= 60:    score += 8
    elif minutes_ago <= 180: score += 4

    # 7) Антифрод: слишком дёшево БЕЗ подтверждённой чистоты = подмена цены/скам
    if assess.is_suspicious and not condition.positives:
        score -= 50

    # 8) Перекупщик: торг не работает, частник предпочтительнее
    if reseller:
        score -= 10

    return max(0, min(score, 100))


# ─── Co-pilot: готовое первое сообщение продавцу ─────────────────────────────
def _fmt_rub(n):
    return f"{int(n):,}".replace(",", " ")


def template_seller_message(title, target):
    """Детерминированный фолбэк, если DeepSeek недоступен."""
    short = (title or "устройство")[:60]
    return (
        f"Здравствуйте! Интересует ваш «{short}». "
        f"Готов купить за {_fmt_rub(target)} ₽, могу подъехать сегодня, оплата сразу наличными. "
        f"Ещё актуально?"
    )


def ai_seller_message(title, asking, target, location):
    """Просит DeepSeek написать короткое первое сообщение продавцу. None, если нет ключа/ошибка."""
    if not DEEPSEEK_API_KEY:
        return None
    prompt = (
        "Ты — вежливый частный покупатель техники Apple в Москве. Напиши КОРОТКОЕ (2-3 предложения) "
        "первое сообщение продавцу на Авито, чтобы начать диалог и быстро договориться о покупке.\n"
        f"Товар: {title}\n"
        f"Цена продавца: {asking} ₽\n"
        f"Моя целевая цена: {target} ₽\n"
        f"Локация: {location or 'Москва'}\n\n"
        "Требования: поздоровайся, прояви интерес к КОНКРЕТНОМУ товару, аккуратно предложи цену "
        f"{target} ₽ (если она ниже цены продавца — мягко, без давления и без слова «скидка»), "
        "подчеркни готовность купить сегодня и оплату сразу/наличными, предложи встречу или спроси "
        "актуальность. Только текст сообщения, без markdown, без подписи. По-русски, на «вы»."
    )
    try:
        r = std_requests.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "content-type": "application/json"},
            json={"model": DEEPSEEK_MODEL, "max_tokens": 300,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"DeepSeek co-pilot fail: {e}")
        return None


# ─── Определение локации ─────────────────────────────────────────────────────
def is_moscow(location):
    loc = location.lower()
    return any(m in loc for m in MOSCOW_MARKERS)


def extract_location(soup):
    """Извлекает город из страницы объявления."""
    for selector in [
        '[data-marker="item-address"]',
        '[class*="geo"]',
        '[class*="address"]',
        '[class*="location"]',
    ]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(strip=True)
    return ""


class AvitoScannerV2:
    def __init__(self, playwright_instance):
        self.pw = playwright_instance
        self.browser = None
        self.context = None
        self.page = None

        # База цен — фолбэк рыночной медианы и выкупа, когда живых сопоставимых мало.
        # Индексируем по live_key через тот же классификатор: надёжнее точной сверки
        # строки model_name (в базе и у классификатора она форматируется по-разному).
        self.prices: dict = {}
        self.prices_by_livekey: dict = {}
        self.prices_generated_at = None
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.prices_generated_at = data.get('generated_at')
                for s in data.get('stats', []):
                    key = (
                        s['model_name'].lower(),
                        s.get('processor', 'Apple'),
                        int(s.get('ram', 0)),
                        int(s.get('ssd', 0)),
                    )
                    self.prices[key] = s
                    try:
                        c = classify(f"{s['model_name']} {s.get('processor', '')}",
                                     {'ram': int(s.get('ram', 0)), 'ssd': int(s.get('ssd', 0))})
                        if c.is_valid:
                            self.prices_by_livekey[live_key(c)] = s
                    except Exception:
                        pass
            logger.info(f"📊 База-фолбэк: {len(self.prices)} конфигов, "
                        f"{len(self.prices_by_livekey)} по live-ключу")
        else:
            logger.warning("⚠️ База цен не найдена — рынок только из живой выдачи")

        # История просмотренных
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except Exception:
                pass

        # История цен
        self.price_history = {}
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                    self.price_history = json.load(f)
            except Exception:
                pass

        # Реестр объявлений (для охотника за залежавшимися)
        self.registry = {}
        if REGISTRY_FILE.exists():
            try:
                with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
                    self.registry = json.load(f)
                logger.info(f"🗃 Реестр объявлений: {len(self.registry)}")
            except Exception:
                pass

    def _start_browser(self):
        """Запускает Playwright-браузер."""
        self.browser = self.pw.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox',
                  '--disable-blink-features=AutomationControlled'],
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

    def _warmup(self):
        """Прогрев: заходим на avito.ru, решаем капчу один раз."""
        logger.info("🌐 Прогрев: avito.ru...")
        ok = navigate_with_captcha(self.page, "https://www.avito.ru")
        if ok:
            logger.info("✅ Прогрев пройден")
        else:
            logger.warning("⚠️ Прогрев не удался, продолжаем...")
        self.page.wait_for_timeout(random.randint(2000, 4000))

    def _load_page(self, url):
        """Загружает страницу через Playwright с обходом капчи. Возвращает HTML или None."""
        ok = navigate_with_captcha(self.page, url)
        if not ok:
            return None
        return self.page.content()

    def _close(self):
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()

    def deep_analyze(self, url):
        """Заходит в объявление, собирает детали (включая полное описание для анализа состояния)."""
        result = {
            "cycles": None,
            "is_urgent": False,
            "specs": {},
            "price_reduced": False,
            "is_private": False,
            "seller_reviews": None,
            "seller_type": "?",
            "location": "",
            "desc_text": "",   # полный текст описания продавца (для анализа состояния)
        }
        html_content = self._load_page(url)
        if not html_content:
            return result

        try:
            soup = BeautifulSoup(html_content, 'lxml')

            # Описание
            desc_tag = soup.find('div', attrs={'data-marker': 'item-description'})
            desc_text = desc_tag.get_text(' ').lower() if desc_tag else ""
            result["desc_text"] = desc_text

            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
            if c_match:
                result["cycles"] = int(c_match.group(1))

            result["is_urgent"] = any(w in desc_text for w in URGENT_KEYWORDS)

            # Снижение цены
            page_text = soup.get_text().lower()
            result["price_reduced"] = any(x in page_text for x in [
                'снижена', 'цена снижена', 'снижал цену', 'понизил цену',
            ])

            # Характеристики
            specs = {}
            params_items = []
            for sel in [
                'li[class*="params-paramsList__item"]',
                '[data-marker="item-view/item-params"] li',
                'ul[class*="params"] li',
                'li[class*="param"]',
            ]:
                params_items = soup.select(sel)
                if params_items:
                    break

            for li in params_items:
                text = li.get_text(separator='|||').strip()
                if '|||' in text:
                    parts = [p.strip() for p in text.split('|||') if p.strip()]
                    if len(parts) >= 2:
                        specs[parts[0].lower()] = parts[-1]

            if specs:
                for key_ru, field in [
                    ('оперативная память, гб', 'ram'),
                    ('объем накопителей, гб', 'ssd'),
                    ('модель', 'model'),
                    ('диагональ, дюйм', 'diagonal'),
                ]:
                    raw = specs.get(key_ru, '')
                    if raw:
                        if field in ('ram', 'ssd'):
                            try: result["specs"][field] = int(float(raw))
                            except ValueError: pass
                        elif field == 'diagonal':
                            try: result["specs"][field] = float(raw)
                            except ValueError: pass
                        else:
                            result["specs"][field] = raw

            # Продавец
            seller_block = (
                soup.find('div', attrs={'data-marker': 'seller-info'}) or
                soup.find('div', attrs={'data-marker': 'contacts'}) or
                soup.find('[class*="seller-info"]')
            )
            if seller_block:
                seller_text = seller_block.get_text().lower()
                if any(x in seller_text for x in ['частное лицо', 'частный']):
                    result["is_private"] = True
                    result["seller_type"] = "Частное лицо"
                elif any(x in seller_text for x in ['магазин', 'компания']):
                    result["seller_type"] = "Магазин"

                rev_match = re.search(r'(\d+)\s*отзыв', seller_text)
                if rev_match:
                    result["seller_reviews"] = int(rev_match.group(1))

            # Локация
            result["location"] = extract_location(soup)

        except Exception as e:
            logger.error(f"   Ошибка deep_analyze: {e}")

        return result

    def match_to_db(self, config):
        """Ищет конфигурацию в базе цен (для фолбэка выкупной цены)."""
        key = config_to_db_key(config)
        if not key:
            return None
        return self.prices.get(key)

    def _save_seen(self):
        try:
            SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SEEN_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    "updated_at": datetime.now().isoformat(),
                    "seen_urls": list(self.seen)[-5000:],
                }, f)
        except Exception as e:
            logger.warning(f"⚠️ Не удалось сохранить seen: {e}")

    # ─── Telegram уведомления ─────────────────────────────────────────────────

    def notify(self, c):
        """Единое уведомление о лоте ниже ЖИВОГО рынка.

        Показывает живую медиану/P20 и число сопоставимых лотов (а не низ
        замороженного снимка), плюс резюме состояния из описания.
        """
        if not TELEGRAM_URL:
            return

        kind = c['kind']
        headers = {
            'fire':     "🔥 <b>НИЖЕ РЫНКА</b>",
            'delivery': "📦 <b>НИЖЕ РЫНКА | ДОСТАВКА</b>",
        }
        header = headers.get(kind, "🔥 <b>НИЖЕ РЫНКА</b>")

        price  = c['price']
        median = c['median']
        p20    = c['p20']
        n      = c['n_comps']
        buyout = c['buyout']
        cond   = c['condition']
        diag   = f" {c['diagonal']}\"" if c.get('diagonal') else ""
        disc   = round((1 - price / median) * 100) if median else 0

        seller = c.get('seller_type') or "?"
        if c.get('seller_reviews') is not None:
            seller = f"{seller}, {c['seller_reviews']} отз."
        if c.get('reseller'):
            seller += " ⚠️ перекуп — торг вряд ли"

        urgent = " 🚨 торг/срочно" if c.get('urgent') else ""

        text = (
            f"{header} [{c['score']}/100]{urgent}\n\n"
            f"💻 {c['title']}\n"
            f"⚙️ <b>{c['ram']}GB / {c['ssd']}GB{diag}</b>\n"
            f"💰 Цена: <b>{price:,} ₽</b> <b>(−{disc}% к медиане)</b>\n"
            f"📊 Рынок сейчас: медиана {median:,} ₽ • P20 {p20:,} ₽ (по {n} лотам)\n"
            f"🤝 Выкуп-цель: <b>{buyout:,} ₽</b>\n"
            f"🩺 Состояние: {cond.summary()}\n"
        )
        if kind == 'delivery' and c.get('location'):
            text += f"📍 {c['location']} (доставка)\n"
        elif c.get('location'):
            text += f"📍 {c['location']}\n"
        text += f"👤 {seller}\n"
        text += f"⏱ {c['age_str']}\n"
        text += f"🔗 <a href='{c['url']}'>Открыть на Avito</a>"
        text = text.replace(',', ' ')

        self._send_telegram(text, f"[{c['score']}] {c['title'][:40]}")

    def _send_telegram(self, text, log_msg):
        """Отправка с проверкой ответа Telegram и повторами (сеть/троттлинг)."""
        for attempt in range(1, 4):
            try:
                r = std_requests.post(
                    TELEGRAM_URL,
                    json={"text": text, "parse_mode": "HTML"},
                    timeout=15,
                )
                ok = True
                try:
                    ok = r.json().get("ok", True)
                except Exception:
                    ok = getattr(r, "ok", True)
                if ok:
                    logger.info(f"✅ {log_msg}")
                    return True
                logger.warning(f"⚠️ Telegram отклонил (попытка {attempt}): {str(r.text)[:160]}")
            except Exception as e:
                logger.warning(f"⚠️ Telegram сбой отправки (попытка {attempt}): {e}")
            time.sleep(2 * attempt)
        logger.error(f"❌ Telegram НЕ доставлено: {log_msg}")
        return False

    def _save_digest(self, items):
        """Копит лоты средней привлекательности (40..74) для вечернего дайджеста."""
        try:
            existing = []
            if DIGEST_FILE.exists():
                with open(DIGEST_FILE, encoding="utf-8") as f:
                    existing = json.load(f) or []
            seen_urls = {x.get("url") for x in existing}
            for c in items:
                if c["url"] in seen_urls:
                    continue
                existing.append({
                    "score": c["score"], "title": c["title"], "price": c["price"],
                    "median": c["median"], "p20": c["p20"], "buyout": c["buyout"],
                    "margin": round(c.get("margin", 0), 3),
                    "condition": c["condition"].summary(),
                    "url": c["url"], "location": c.get("location", ""),
                    "ts": datetime.now().isoformat(timespec="seconds"),
                })
                seen_urls.add(c["url"])
            DIGEST_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(DIGEST_FILE, "w", encoding="utf-8") as f:
                json.dump(existing[-200:], f, ensure_ascii=False)
            logger.info(f"🗂 В дайджест добавлено: {len(items)}")
        except Exception as e:
            logger.error(f"❌ Не удалось сохранить дайджест: {e}")

    def _send_copilot(self, c):
        """Co-pilot: готовое первое сообщение продавцу для горячего лота."""
        asking = int(c.get('price') or 0)
        buyout = int(c.get('buyout') or 0)
        # Целевая цена: если продавец просит дороже выкупной — целимся в выкупную,
        # иначе берём по цене продавца (лот уже выгодный).
        target = buyout if (buyout and asking > buyout) else (asking if asking > 0 else buyout)
        if target <= 0:
            return

        draft = ai_seller_message(c['title'], asking, target, c.get('location', '')) \
            or template_seller_message(c['title'], target)
        safe = html.escape(draft)

        text = (
            "✍️ <b>Сообщение продавцу</b> (нажми на текст, чтобы скопировать):\n"
            f"<pre>{safe}</pre>\n"
            f"💰 Твоя цель: <b>{_fmt_rub(target)} ₽</b> • у продавца: {_fmt_rub(asking)} ₽\n"
            f"🔗 <a href=\"{c['url']}\">Открыть объявление → «Написать»</a>"
        )
        self._send_telegram(text, f"✍️ Co-pilot: {c['title'][:40]}")

    def _enqueue_lead(self, c, motivation=None):
        """Кладёт лот в очередь бота переговоров с оценкой мотивации продавца.
        target — стартовый якорь, walk_away — потолок (выкуп-цель).
        motivation — готовый MotivationReport (для охотника за залежавшимися)."""
        try:
            url = c['url']
            lid = hashlib.sha1(url.encode('utf-8')).hexdigest()[:10]

            walk_away = int(c['buyout']) if c.get('buyout') else int(c['median'] * BUYOUT_FACTOR)
            anchor_base = min(int(c['price']), walk_away)
            target = max(1, int(anchor_base * 0.95))

            if motivation is not None:
                mot = motivation
            else:
                days_listed = int(c['minutes_ago'] / 1440) if c.get('minutes_ago') else None
                urgent_words = ["срочно/торг"] if c.get('urgent') else []
                mot = motivation_score(
                    days_listed=days_listed,
                    price_reduced=bool(c.get('urgent')),
                    urgent_words=urgent_words,
                    asking=c['price'], median=c['median'],
                )

            lead = {
                "id": lid,
                "title": c['title'],
                "asking": int(c['price']),
                "target": target,
                "walk_away": walk_away,
                "location": c.get('location', ''),
                "url": url,
                "source": c.get('source_kind', 'deal'),
                "motivation_score": mot.score,
                "motivation_label": mot.label,
                "motivation_signals": mot.signals,
                "history": [],
                "ts": datetime.now().isoformat(timespec="seconds"),
            }

            queue = []
            if QUEUE_FILE.exists():
                try:
                    with open(QUEUE_FILE, encoding="utf-8") as f:
                        queue = json.load(f) or []
                except Exception:
                    queue = []
            if any(x.get("id") == lid for x in queue):
                return
            queue.append(lead)
            QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(QUEUE_FILE, "w", encoding="utf-8") as f:
                json.dump(queue[-100:], f, ensure_ascii=False, indent=2)
            logger.info(f"🧲 В очередь торга: {c['title'][:40]} (мотивация {mot.score})")
        except Exception as e:
            logger.error(f"❌ Не удалось добавить лид в очередь: {e}")

    # ─── Реестр объявлений (охотник за залежавшимися) ─────────────────────────

    def _registry_touch(self, L):
        """Обновляет реестр: первая дата, история цены, сколько раз видели."""
        url, price = L['url'], L['price']
        now_iso = datetime.now().isoformat(timespec='seconds')
        disp_days = int(L.get('minutes_ago', 0) // 1440)
        e = self.registry.get(url)
        if not e:
            self.registry[url] = {
                'first_seen': now_iso, 'last_seen': now_iso,
                'first_price': price, 'last_price': price, 'min_price': price,
                'times_seen': 1, 'title': L['title'], 'max_age_days': disp_days,
            }
        else:
            e['last_seen'] = now_iso
            e['last_price'] = price
            e['min_price'] = min(int(e.get('min_price', price)), price)
            e['times_seen'] = int(e.get('times_seen', 1)) + 1
            e['max_age_days'] = max(int(e.get('max_age_days', 0)), disp_days)
            e['title'] = L['title']

    def _save_registry(self):
        try:
            items = sorted(self.registry.items(),
                           key=lambda kv: kv[1].get('last_seen', ''), reverse=True)[:REGISTRY_MAX]
            self.registry = dict(items)
            REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(REGISTRY_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.registry, f, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"⚠️ Реестр не сохранён: {e}")

    @staticmethod
    def _entry_days(e, now):
        d = int(e.get('max_age_days', 0))
        try:
            d = max(d, (now - datetime.fromisoformat(e['first_seen'])).days)
        except Exception:
            pass
        return d

    @staticmethod
    def _entry_drop(e):
        fp = int(e.get('first_price', 0) or 0)
        lp = int(e.get('last_price', fp) or fp)
        return max(0.0, (fp - lp) / fp) if fp > 0 else 0.0

    def run_stale_sweep(self):
        """Проход «охотника»: залежавшихся/снизивших цену продавцов → в очередь торга."""
        self._start_browser()
        self._warmup()
        now = datetime.now()
        logger.info(f"🕰 Охота за залежавшимися (>= {STALE_LISTING_DAYS} дн или снижение цены)...")

        # 1) Обход выдачи (глубже обычного) — обновляем реестр, ловим возраст из выдачи
        seen_now = {}
        for scan_info in self._get_scan_urls():
            label, base_url = scan_info['label'], scan_info['url']
            for page_num in range(1, STALE_SCAN_PAGES + 1):
                time.sleep(random.uniform(2, 5))
                page_html = self._load_page(self._page_url(base_url, page_num))
                page_listings, n_items = self._collect_listings(page_html) if page_html else ([], 0)
                if page_num == 1 and n_items == 0:
                    self._warmup()
                    time.sleep(random.uniform(2, 4))
                    page_html = self._load_page(self._page_url(base_url, page_num))
                    page_listings, n_items = self._collect_listings(page_html) if page_html else ([], 0)
                for L in page_listings:
                    if self._passes_prefilter(L) is not None:
                        self._registry_touch(L)
                        seen_now[L['url']] = L
                logger.info(f"   🕰 {label} стр.{page_num}: {n_items}")
                if n_items < 10:
                    break

        # 2) Кандидаты: возраст или снижение цены (в seen_now — приоритет, точно живые)
        cands = []
        for url, e in self.registry.items():
            days = self._entry_days(e, now)
            drop = self._entry_drop(e)
            if days >= STALE_LISTING_DAYS or drop >= STALE_MIN_DROP:
                cands.append((url, e, days, drop, url in seen_now))
        cands.sort(key=lambda x: (x[4], x[2] + x[3] * 50), reverse=True)

        existing = set()
        if QUEUE_FILE.exists():
            try:
                existing = {x.get('id') for x in (json.load(open(QUEUE_FILE, encoding='utf-8')) or [])}
            except Exception:
                pass

        enqueued = 0
        for url, e, days, drop, is_live in cands:
            if enqueued >= STALE_MAX_LEADS:
                break
            lid = hashlib.sha1(url.encode('utf-8')).hexdigest()[:10]
            if lid in existing:
                continue
            L = seen_now.get(url)
            time.sleep(random.uniform(1.5, 3.5))
            analysis = self.deep_analyze(url)
            # лот снят/недоступен → пустой разбор, пропускаем
            if not (analysis.get('desc_text') or analysis.get('specs') or analysis.get('location') or L):
                continue
            title = L['title'] if L else e.get('title', '')
            cfg = classify(title, analysis.get('specs'))
            if not cfg.is_valid:
                continue
            if cfg.family in EXCLUDE_INTEL_FAMILIES and cfg.chip_gen == 'Intel':
                continue
            min_year = MIN_YEARS.get(cfg.family, 2020)
            if cfg.year and cfg.year < min_year:
                continue
            cond = analyze_condition(' '.join([title, analysis.get('desc_text', '')]),
                                     battery_hard=BATTERY_HARD, battery_soft=BATTERY_SOFT,
                                     cycles_hard=CYCLES_HARD, cycles_soft=CYCLES_SOFT)
            if cond.is_reject:
                continue
            if is_reseller(analysis.get('seller_reviews'), analysis.get('seller_type')):
                continue   # перекуп — торг бесполезен
            market, _ = self._market_for(cfg, [])
            if not market:
                continue
            asking = int(e.get('last_price') or (L['price'] if L else 0))
            loc = analysis.get('location', '')
            if loc and not is_moscow(loc) and asking > DELIVERY_MAX_PRICE:
                continue   # регион дороже лимита Авито Доставки — не выкупить
            stat_db = self._db_stat(cfg)
            buyout = (int(stat_db['buyout_price']) if stat_db and stat_db.get('buyout_price')
                      else int(market.median * BUYOUT_FACTOR))
            # нужна комната для торга вниз и не абсурдно переоценено
            if asking <= 0 or asking <= buyout or asking > market.median * 1.20:
                continue
            mot = motivation_score(days_listed=days, price_reduced=drop >= 0.03,
                                   num_reductions=(1 if drop > 0 else 0),
                                   reposted=int(e.get('times_seen', 1)) >= 5,
                                   asking=asking, median=market.median)
            self._enqueue_lead({
                'url': url, 'title': title, 'price': asking,
                'median': market.median, 'buyout': buyout,
                'location': analysis.get('location', ''), 'source_kind': 'stale',
            }, motivation=mot)
            existing.add(lid)
            enqueued += 1
            logger.info(f"   🧲 Залежавшийся: {title[:40]} | {asking}₽ | "
                        f"{days}дн drop {drop*100:.0f}% | мот {mot.score}")

        self._save_registry()
        self._close()
        if TELEGRAM_URL and enqueued:
            self._send_telegram(
                f"🕰 <b>Залежавшиеся продавцы</b>: {enqueued} новых лидов на торг.\n"
                f"Открой бота — лоты с кнопкой «▶️ Веду торг».",
                f"🕰 stale leads: {enqueued}")
        logger.info(f"🏁 Охота завершена. Новых лидов: {enqueued}")

    # ─── Сбор объявлений со страницы выдачи ───────────────────────────────────

    def _collect_listings(self, html_content):
        """Парсит карточки на странице выдачи в список словарей."""
        soup = BeautifulSoup(html_content, 'lxml')
        items = soup.select('[data-marker="item"]')
        out = []
        for item in items:
            try:
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag or not link_tag.get('href'):
                    continue
                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url_clean = clean_url(raw_url)
                raw_title = link_tag.get('title', '') or link_tag.get_text(strip=True)

                price_tag = item.select_one('[itemprop="price"]')
                if not price_tag or not price_tag.get('content'):
                    continue
                try:
                    price = int(price_tag['content'])
                except (ValueError, TypeError):
                    continue

                snippet_tag = item.select_one('[data-marker="item-description"]')
                snippet = snippet_tag.get_text(' ').lower() if snippet_tag else ""
                age_str, minutes_ago = parse_item_age(item)

                out.append({
                    'raw_url': raw_url,
                    'url': url_clean,
                    'title': raw_title,
                    'snippet': snippet,
                    'price': price,
                    'age_str': age_str,
                    'minutes_ago': minutes_ago,
                    'item_text': item.get_text(' ').lower(),
                })
            except Exception:
                continue
        return out, len(items)

    # ─── Основной цикл ───────────────────────────────────────────────────────

    def _get_scan_urls(self):
        """Возвращает список URL для сканирования."""
        if SCAN_URL:
            return [{"label": "SCAN_URL", "url": SCAN_URL}]
        return [
            {"label": fam['label'], "url": fam['url']}
            for fam in SCAN_FAMILIES.values()
        ]

    def _page_url(self, base_url, page_num):
        if page_num <= 1:
            return base_url
        sep = '&' if '?' in base_url else '?'
        return f"{base_url}{sep}p={page_num}"

    def _check_prices_freshness(self):
        """Дохлый-выключатель: если база цен застряла — предупреждаем в Telegram.
        Кулдаун защищает от спама (сканер запускается каждые 15 мин)."""
        if not TELEGRAM_URL:
            return
        now = datetime.now()

        parsed = parse_generated_at(self.prices_generated_at) if PRICES_FILE.exists() else None
        if PRICES_FILE.exists() and parsed is None:
            return  # формат generated_at не распознан — не паникуем зря

        age_hours = None if parsed is None else max(0.0, (now - parsed).total_seconds() / 3600)

        # Свежо — выходим
        if age_hours is not None and age_hours < STALE_PRICES_HOURS:
            return

        # Кулдаун
        last_alert = None
        if HEALTH_FILE.exists():
            try:
                with open(HEALTH_FILE, encoding='utf-8') as f:
                    last_alert = json.load(f).get('last_stale_alert')
            except Exception:
                pass

        age_for_check = age_hours if age_hours is not None else float('inf')
        if not should_alert_stale(age_for_check, last_alert, now,
                                  STALE_PRICES_HOURS, STALE_ALERT_COOLDOWN_HOURS):
            return

        if age_hours is None:
            body = "база цен не найдена — парсер ни разу не создал файл"
            age_label = "∞"
        else:
            body = (f"база цен не обновлялась <b>{int(age_hours)} ч</b> "
                    f"(с {self.prices_generated_at} UTC)")
            age_label = f"{int(age_hours)}ч"

        text = (
            "⚠️ <b>Парсер цен встал</b>\n"
            f"{body}.\n"
            "Проверь GitHub Actions → «Avito Price Parser v2» (логи запусков, секреты, лимит минут).\n"
            "ℹ️ Детектор «ниже рынка» работает (живой рынок), но выкуп-цель считается "
            "от живой медианы вместо курируемой."
        )
        self._send_telegram(text, f"⚠️ parser stale {age_label}")

        try:
            HEALTH_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(HEALTH_FILE, 'w', encoding='utf-8') as f:
                json.dump({"last_stale_alert": now.isoformat(timespec='seconds')}, f)
        except Exception as e:
            logger.warning(f"⚠️ Не удалось записать parser-health: {e}")

    def _passes_prefilter(self, listing):
        """Дешёвый фильтр: цена в диапазоне, не мусор, валидный конфиг, год ок.
        Возвращает config или None."""
        full_preview = (listing['title'] + ' ' + listing['snippet']).lower()
        if any(w in full_preview for w in JUNK_KEYWORDS):
            return None
        # Новые/запечатанные — не б/у: искажают медиану рынка → вон из базы и кандидатов
        if any(w in full_preview for w in NEW_SEALED_KEYWORDS):
            return None
        if not (MIN_PRICE <= listing['price'] <= MAX_PRICE):
            return None
        cfg = classify(listing['title'])
        if not cfg.is_valid:
            return None
        # Перекуп: MacBook на Intel не берём (только Apple Silicon)
        if cfg.family in EXCLUDE_INTEL_FAMILIES and cfg.chip_gen == 'Intel':
            return None
        min_year = MIN_YEARS.get(cfg.family, 2020)
        if cfg.year and cfg.year < min_year:
            return None
        return cfg

    def _db_stat(self, cfg):
        """Запись базы по live_key (надёжный матч), иначе по точной строке (фолбэк)."""
        return self.prices_by_livekey.get(live_key(cfg)) or self.match_to_db(cfg)

    def _market_for(self, cfg, comps):
        """Эталон рынка = МОСКВА (база цен), т.к. перепродажа в Москве. Поиск идёт по
        всей России, но цену лота сравниваем с московской медианой из базы.
        Живая всероссийская выборка — только фолбэк для конфигов, которых нет в базе."""
        db = self._db_stat(cfg)
        if db and db.get('median_price'):
            med = int(db['median_price'])
            lo = int(db.get('min_price') or med * 0.85)
            hi = int(db.get('max_price') or med * 1.15)
            p20 = int(lo + (med - lo) * 0.4)
            return MarketStats(n=int(db.get('samples_count', 0)) or 1,
                               median=med, p20=p20, p10=lo, low=lo, high=hi), 'db'
        live = robust_stats(comps)   # всероссийская — фолбэк (конфиг не в базе)
        if live and live.n >= MIN_COMPS:
            return live, 'live'
        if live and live.n >= 3:
            return live, 'live-thin'
        return None, None

    def run(self):
        # Дохлый-выключатель: проверяем свежесть базы цен ДО скана
        # (не требует браузера; алерт уйдёт, даже если потом скан упадёт)
        self._check_prices_freshness()

        self._start_browser()
        self._warmup()

        scan_urls = self._get_scan_urls()
        logger.info(f"🎬 Запуск сканера v2 ({len(scan_urls)} семейств, "
                    f"{SCAN_PAGES_PER_FAMILY} стр/семейство, живой рынок)...")

        total_notifications = 0

        for scan_info in scan_urls:
            label = scan_info['label']
            base_url = scan_info['url']
            logger.info(f"\n{'─'*40}")
            logger.info(f"🔍 {label}: {base_url[:60]}...")

            # ── 1) Грузим N страниц выдачи, собираем все объявления ──────────
            listings = []
            for page_num in range(1, SCAN_PAGES_PER_FAMILY + 1):
                time.sleep(random.uniform(2, 5))
                page_html = self._load_page(self._page_url(base_url, page_num))
                page_listings, n_items = self._collect_listings(page_html) if page_html else ([], 0)

                # Пустая 1-я страница = мягкий бан Авито (троттлинг) → пере-прогрев
                # (заново решаем капчу, сбрасываем сессию) и одна повторная попытка.
                if page_num == 1 and n_items == 0:
                    logger.warning(f"   ⚠️ {label}: 0 объявл. — похоже на троттлинг, пере-прогрев и повтор")
                    self._warmup()
                    time.sleep(random.uniform(2, 4))
                    page_html = self._load_page(self._page_url(base_url, page_num))
                    page_listings, n_items = self._collect_listings(page_html) if page_html else ([], 0)

                if n_items == 0 and not page_listings:
                    logger.error(f"❌ {label}: стр. {page_num} пуста даже после повтора")
                    break
                listings.extend(page_listings)
                logger.info(f"   📄 стр.{page_num}: {n_items} объявл.")
                if n_items < 10:
                    break

            if not listings:
                continue

            # ── 2) Строим ЖИВОЙ рынок: цены сопоставимых лотов прямо сейчас ──
            buckets = {}              # live_key -> [prices]
            cfg_cache = {}            # url -> config
            for L in listings:
                cfg = self._passes_prefilter(L)
                cfg_cache[L['url']] = cfg
                if cfg is not None:
                    buckets.setdefault(live_key(cfg), []).append(L['price'])
                    self._registry_touch(L)   # копим историю для охотника за залежавшимися
            logger.info(f"   📊 {label}: {len(listings)} лотов → {len(buckets)} живых конфигов")

            # ── 3) Детектим сделки против живого рынка ──────────────────────
            candidates = []
            for L in listings:
                try:
                    url_clean = L['url']
                    if url_clean in self.seen:
                        continue

                    cfg = cfg_cache.get(url_clean)
                    if cfg is None:
                        # не прошёл префильтр (мусор / не та цена / невалидный конфиг)
                        self.seen.add(url_clean)
                        continue

                    price = L['price']
                    comps = list(buckets.get(live_key(cfg), []))
                    if price in comps:
                        comps.remove(price)   # не сравниваем лот сам с собой
                    market, source = self._market_for(cfg, comps)
                    if not market:
                        # ни живого рынка, ни базы — судить не можем, пропускаем тихо
                        continue

                    assess = assess_deal(price, market, min_margin=MIN_MARGIN, scam_floor=SCAM_FLOOR)

                    # Углублённый анализ только если есть запас ниже рынка
                    if assess.margin < MIN_MARGIN:
                        self.seen.add(url_clean)
                        continue

                    # Помечаем seen до сетевого вызова (защита от повторов при сбое)
                    self.seen.add(url_clean)
                    self._save_seen()

                    time.sleep(random.uniform(2, 5))
                    analysis = self.deep_analyze(L['raw_url'])

                    # Уточняем конфиг спеками из карточки и пересчитываем рынок
                    if analysis['specs']:
                        cfg2 = classify(L['title'], analysis['specs'])
                        if cfg2.is_valid:
                            comps2 = list(buckets.get(live_key(cfg2), []))
                            if price in comps2:
                                comps2.remove(price)
                            market2, source2 = self._market_for(cfg2, comps2)
                            if market2:
                                cfg, market, source = cfg2, market2, source2
                                assess = assess_deal(price, market,
                                                     min_margin=MIN_MARGIN, scam_floor=SCAM_FLOOR)

                    if assess.margin < MIN_MARGIN:
                        continue

                    # ── Гейт состояния по ПОЛНОМУ описанию ──────────────────
                    cond_text = ' '.join([L['title'], L['snippet'], analysis.get('desc_text', '')])
                    condition = analyze_condition(
                        cond_text,
                        battery_hard=BATTERY_HARD, battery_soft=BATTERY_SOFT,
                        cycles_hard=CYCLES_HARD, cycles_soft=CYCLES_SOFT,
                    )
                    if condition.cycles is None and analysis.get('cycles'):
                        condition.cycles = analysis['cycles']

                    if condition.is_reject:
                        logger.info(f"   ⛔ {L['title'][:45]} | {price:,}₽ | {condition.summary()}")
                        continue

                    location = analysis['location']
                    moscow = (not location) or is_moscow(location)

                    # Региональный лот дороже лимита Авито Доставки выкупить нельзя
                    if not moscow and price > DELIVERY_MAX_PRICE:
                        continue

                    # Выкуп: курируемый из базы, иначе от медианы рынка
                    stat_db = self._db_stat(cfg)
                    if stat_db and stat_db.get('buyout_price'):
                        buyout = int(stat_db['buyout_price'])
                    else:
                        buyout = int(market.median * BUYOUT_FACTOR)

                    full_preview = (L['title'] + ' ' + L['snippet']).lower()
                    urgent = (analysis['is_urgent'] or analysis['price_reduced']
                              or any(w in full_preview for w in URGENT_KEYWORDS))
                    reseller = is_reseller(analysis['seller_reviews'], analysis['seller_type'])

                    score = score_deal(price, market, buyout, condition,
                                       analysis['is_private'], moscow,
                                       L['minutes_ago'], assess, reseller=reseller)

                    candidates.append({
                        'kind': 'fire' if moscow else 'delivery',
                        'score': score,
                        'title': L['title'],
                        'price': price,
                        'median': market.median,
                        'p20': market.p20,
                        'n_comps': market.n,
                        'source': source,
                        'low_conf': source == 'live-thin',
                        'margin': assess.margin,
                        'buyout': buyout,
                        'ram': cfg.ram,
                        'ssd': cfg.ssd,
                        'diagonal': analysis['specs'].get('diagonal'),
                        'url': url_clean,
                        'age_str': L['age_str'],
                        'minutes_ago': L['minutes_ago'],
                        'location': location,
                        'seller_type': analysis['seller_type'],
                        'seller_reviews': analysis['seller_reviews'],
                        'is_private': analysis['is_private'],
                        'reseller': reseller,
                        'condition': condition,
                        'urgent': urgent,
                        'suspicious': assess.is_suspicious,
                    })
                    logger.info(f"   ✅ [{score}] {L['title'][:45]} | {price:,}₽ | "
                                f"−{assess.margin*100:.0f}% к медиане ({source}) | {condition.verdict}")

                except Exception as e:
                    logger.error(f"Ошибка: {e}")
                    continue

            # ── 4) Рассылка ─────────────────────────────────────────────────
            candidates.sort(key=lambda x: x['score'], reverse=True)
            digest_items = []
            for c in candidates:
                # В realtime НЕ выпускаем:
                #  - подозрительно дёшево без подтверждённой чистоты (вероятен скам/дефект);
                #  - тонкая живая выборка без опоры на базу (низкая уверенность).
                block_realtime = (
                    (c['suspicious'] and not c['condition'].positives)
                    or c.get('low_conf')
                )
                if c['score'] >= MIN_NOTIFY_SCORE and not block_realtime:
                    self.notify(c)
                    self._send_copilot(c)
                    # Перекупщику торг бесполезен → в очередь переговоров не кладём
                    if not c.get('reseller'):
                        self._enqueue_lead(c)
                    total_notifications += 1
                elif c['score'] >= DIGEST_MIN_SCORE:
                    digest_items.append(c)

            if digest_items:
                self._save_digest(digest_items)

        # Финальное сохранение
        self._save_seen()
        self._save_registry()

        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.price_history, f, ensure_ascii=False)

        self._close()

        logger.info(f"\n🏁 Готово. Уведомлений: {total_notifications}")


def send_digest():
    """Отправляет накопленный дайджест (лоты 40..74) одним сообщением и очищает файл.
    Запускать кроном раз в день (напр. 20:00 МСК): python scanner_v2.py --digest"""
    if not DIGEST_FILE.exists():
        logger.info("Дайджест пуст")
        return
    try:
        with open(DIGEST_FILE, encoding="utf-8") as f:
            items = json.load(f) or []
    except Exception:
        items = []
    if not items:
        logger.info("Дайджест пуст")
        return

    items.sort(key=lambda x: x.get("score", 0), reverse=True)
    top = items[:int(os.environ.get('DIGEST_TOP', '5'))]
    lines = [f"👀 <b>Лоты на радаре за сутки</b> (всего {len(items)}, показаны лучшие {len(top)})\n"]
    for x in top:
        loc = f" • {x['location']}" if x.get("location") else ""
        cond = f" • {x['condition']}" if x.get("condition") else ""
        median = x.get("median", 0)
        block = (
            f"[{x['score']}] {x['title'][:60]}\n"
            f"   {x['price']:,} ₽ (медиана рынка {median:,} ₽){loc}{cond}\n"
            f"   <a href=\"{x['url']}\">Открыть на Avito</a>"
        ).replace(",", " ")
        lines.append(block)
    text = "\n".join(lines)

    try:
        std_requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=10)
        logger.info(f"✅ Дайджест отправлен ({len(top)} из {len(items)})")
        DIGEST_FILE.write_text("[]", encoding="utf-8")
    except Exception as e:
        logger.error(f"❌ Дайджест не отправлен: {e}")


# ─── Дашборд здоровья (--health, крон раз в сутки) ───────────────────────────
def _read_recent_log(path, hours=24, max_lines=60000):
    p = Path(path)
    if not p.exists():
        return []
    try:
        lines = p.read_text(encoding='utf-8', errors='ignore').splitlines()[-max_lines:]
    except Exception:
        return []
    cutoff = datetime.now() - timedelta(hours=hours)
    out, keep = [], False
    for ln in lines:
        try:
            t = datetime.strptime(ln[:19], "%Y-%m-%d %H:%M:%S")
            keep = t >= cutoff
        except ValueError:
            pass  # строка-продолжение: наследует keep предыдущей
        if keep:
            out.append(ln)
    return out


def compute_health(lines):
    """Считает метрики из строк лога сканера за период. Чистая функция (тестируемо)."""
    h = {"runs": 0, "notif": 0, "cands": 0, "rejects": 0, "throttle": 0,
         "captcha": 0, "faildeliv": 0, "fam": {}}
    for l in lines:
        if "🏁 Готово" in l:
            h["runs"] += 1
        m = re.search(r"Уведомлений:\s*(\d+)", l)
        if m:
            h["notif"] += int(m.group(1))
        if "✅" in l and "к медиане" in l:
            h["cands"] += 1
        if "⛔" in l:
            h["rejects"] += 1
        if "троттлинг" in l:
            h["throttle"] += 1
        if "RuCaptcha ответила" in l:
            h["captcha"] += 1
        if "НЕ доставлено" in l:
            h["faildeliv"] += 1
        fm = re.search(r"📊 (MacBook Air|MacBook Pro|iMac|Mac mini|Mac Studio):", l)
        if fm:
            h["fam"][fm.group(1)] = h["fam"].get(fm.group(1), 0) + 1
    return h


def _rucaptcha_balance():
    if not RUCAPTCHA_API_KEY:
        return None
    try:
        r = std_requests.get("https://rucaptcha.com/res.php",
                             params={"key": RUCAPTCHA_API_KEY, "action": "getbalance"},
                             timeout=15)
        return float(r.text.strip().split("|")[-1])
    except Exception:
        return None


def send_health():
    """Шлёт суточную сводку здоровья сканера в Telegram."""
    scn_lines = _read_recent_log(os.environ.get('SCANNER_LOG_PATH', '/var/log/bestmac-scanner.log'))
    h = compute_health(scn_lines)
    # капчу решает и охотник за залежавшимися
    h["captcha"] += sum(1 for l in _read_recent_log(
        os.environ.get('STALE_LOG_PATH', '/var/log/bestmac-stale.log')) if "RuCaptcha ответила" in l)
    stale_leads = sum(int(m.group(1)) for l in _read_recent_log(
        os.environ.get('STALE_LOG_PATH', '/var/log/bestmac-stale.log'))
        for m in [re.search(r"Новых лидов:\s*(\d+)", l)] if m)

    def _len(path):
        try:
            with open(path, encoding='utf-8') as f:
                return len(json.load(f))
        except Exception:
            return 0

    # Лиды: показываем НЕ показанные ботом (pending), а не всю накопленную очередь
    try:
        with open(QUEUE_FILE, encoding='utf-8') as f:
            queue_list = json.load(f) or []
    except Exception:
        queue_list = []
    state_path = os.environ.get('NEGOTIATION_STATE_PATH', 'public/data/negotiation-state.json')
    try:
        with open(state_path, encoding='utf-8') as f:
            posted = set(json.load(f).get('posted_leads', []))
    except Exception:
        posted = set()
    leads_total = len(queue_list)
    leads_pending = sum(1 for x in queue_list if x.get('id') not in posted)
    reg = _len(REGISTRY_FILE)
    bal = _rucaptcha_balance()
    fams = ", ".join(f"{k.split()[-1]}:{v}" for k, v in sorted(h["fam"].items())) or "—"

    text = (
        "🩺 <b>Дашборд за 24 ч</b>\n"
        f"🔄 Прогонов сканера: <b>{h['runs']}</b>\n"
        f"🔥 Сделок отправлено: <b>{h['notif']}</b>"
        + (f" • ❌ не доставлено: {h['faildeliv']}" if h['faildeliv'] else "") + "\n"
        f"🎯 Кандидатов ниже рынка: {h['cands']} • ⛔ отсеяно по состоянию: {h['rejects']}\n"
        f"🕰 Лидов-залежавшихся за сутки: {stale_leads}\n"
        f"📊 Семейства с данными (прогонов): {fams}\n"
        f"🛡 Троттлинг (пере-прогревов): {h['throttle']}\n"
        f"🧩 Капча решена: {h['captcha']}"
        + (f" • баланс RuCaptcha: {bal:.0f} ₽" if bal is not None else "") + "\n"
        f"🧲 Лиды боту: {leads_pending} ждут ответа • {leads_total} всего за период • 🗃 реестр: {reg}"
    )
    if h['runs'] == 0:
        text += "\n\n⚠️ <b>0 прогонов за сутки — сканер мог встать!</b>"

    if not TELEGRAM_URL:
        print(text)
        return
    for attempt in range(1, 4):
        try:
            r = std_requests.post(TELEGRAM_URL, json={"text": text, "parse_mode": "HTML"}, timeout=15)
            if r.json().get("ok", True):
                logger.info("✅ Дашборд здоровья отправлен")
                return
        except Exception as e:
            logger.warning(f"⚠️ Дашборд (попытка {attempt}): {e}")
        time.sleep(2 * attempt)
    logger.error("❌ Дашборд здоровья не отправлен")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--digest", action="store_true",
                    help="Отправить дайджест лотов 40..74 и выйти (крон в 20:00 МСК)")
    ap.add_argument("--stale", action="store_true",
                    help="Охота за залежавшимися продавцами → очередь торга (крон раз в день)")
    ap.add_argument("--health", action="store_true",
                    help="Суточная сводка здоровья сканера в Telegram (крон раз в день)")
    cli_args = ap.parse_args()

    if cli_args.digest:
        send_digest()
    elif cli_args.health:
        send_health()
    elif cli_args.stale:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            AvitoScannerV2(pw).run_stale_sweep()
    else:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            AvitoScannerV2(pw).run()
