#!/usr/bin/env python3
"""
Парсер цен Авито для bestmac.ru — v5 с curl_cffi
Главное улучшение: curl_cffi имитирует Chrome на уровне TLS → 429 почти исчезают.
Логика 429: быстрый backoff (15 сек) + смена IP → не тратим минуты на ожидание.
Расписание: 3 батча по ~28 конфигураций, запускаются ночью с интервалом 1-2 часа.
"""
import json
import os
import re
import time
import random
import statistics
import argparse
import logging
import urllib3
from pathlib import Path

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── curl_cffi — обход блокировок Авито ───────────────────────────────────────
try:
    from curl_cffi import requests as curl_requests
    CURL_AVAILABLE = True
except ImportError:
    CURL_AVAILABLE = False

try:
    import requests as std_requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ pip install curl_cffi requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

if CURL_AVAILABLE:
    logger.info("✅ curl_cffi — Chrome TLS имитация активна")
else:
    logger.warning("⚠️ curl_cffi не найден, используем requests")

# ─── Пути ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
URLS_FILE   = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# ─── Стоп-слова ───────────────────────────────────────────────────────────────
JUNK_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'матриц', 'дефект', 'аккаунт',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход', 'не включается', 'трещин',
]

# ─── Прокси ───────────────────────────────────────────────────────────────────
RAW_PROXY     = os.environ.get("PROXY_URL", "").strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get("CHANGE_IP_URL", "").strip().strip('"').strip("'")

def format_proxy(s):
    if not s: return None
    return s if s.startswith(('http://', 'https://', 'socks5://')) else f"http://{s}"

PROXY_URL = format_proxy(RAW_PROXY)

# Браузеры для ротации — разные fingerprints
CURL_BROWSERS = ["chrome110", "chrome107", "chrome104", "chrome101", "chrome99"]

# ─── RAM / SSD ─────────────────────────────────────────────────────────────────
RAM_VALUES = {8, 16, 18, 24, 36, 48, 64, 96, 128}
SSD_VALUES = {64, 128, 256, 512, 1024, 2048, 4096}

def extract_specs(text: str) -> tuple[int, int]:
    text = text.lower().replace(' ', '')
    ram, ssd = 8, 256
    for val_str, unit in re.findall(r'(\d+)(gb|гб|tb|тб)', text):
        val = int(val_str)
        if 2015 <= val <= 2030:
            continue
        if unit in ('tb', 'тб'):
            val *= 1024
        if val in RAM_VALUES:
            ram = val
        elif val in SSD_VALUES:
            ssd = val
    return ram, ssd


# ─── HTTP-сессия с curl_cffi ──────────────────────────────────────────────────
class Session:
    """
    Обёртка над curl_cffi / requests.
    - Каждые N запросов меняет browser fingerprint (ротация TLS)
    - При 429: меняет IP + переинициализирует сессию с новым браузером
    - Короткий backoff вместо 60-секундного ожидания
    """
    def __init__(self):
        self.proxy_str    = PROXY_URL
        self._session     = None
        self._req_count   = 0          # счётчик запросов для ротации fingerprint
        self._rotate_every = 15        # менять fingerprint каждые 15 запросов
        self._last_ip_change = 0.0
        self._init_session()

    def _init_session(self):
        if CURL_AVAILABLE:
            browser = random.choice(CURL_BROWSERS)
            self._session = curl_requests.Session(impersonate=browser)
            if self.proxy_str:
                self._session.proxies = {
                    "http":  self.proxy_str,
                    "https": self.proxy_str,
                }
            logger.debug(f"   🔧 Сессия: {browser}")
        else:
            self._session = None

    def _change_ip(self) -> bool:
        if not CHANGE_IP_URL:
            return False
        now = time.time()
        if now - self._last_ip_change < 30:  # минимум 30 сек между сменами
            return False
        try:
            if CURL_AVAILABLE and self._session:
                self._session.get(CHANGE_IP_URL, timeout=8, verify=False)
            else:
                std_requests.get(CHANGE_IP_URL, timeout=8, verify=False)
            self._last_ip_change = time.time()
            time.sleep(5)  # даём IP примениться
            self._init_session()  # новый браузер после смены IP
            logger.info("   🔄 IP сменён, новый fingerprint")
            return True
        except Exception as e:
            logger.warning(f"   ⚠️ Смена IP: {e}")
            return False

    def get(self, url: str, retries: int = 3):
        self._req_count += 1

        # Ротация fingerprint каждые N запросов — профилактика блокировок
        if self._req_count % self._rotate_every == 0:
            self._init_session()

        headers = {
            "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
        }

        for attempt in range(retries):
            try:
                # Пауза перед запросом — рандомная, чтобы не выглядеть как бот
                time.sleep(random.uniform(3, 6))

                if CURL_AVAILABLE and self._session:
                    resp = self._session.get(
                        url, headers=headers,
                        timeout=20, verify=False, allow_redirects=True,
                    )
                else:
                    resp = std_requests.get(
                        url,
                        headers={
                            **headers,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                                          "Chrome/122.0.0.0 Safari/537.36",
                        },
                        proxies={"http": self.proxy_str, "https": self.proxy_str} if self.proxy_str else None,
                        timeout=20, verify=False,
                    )

                if resp.status_code == 200:
                    return resp

                if resp.status_code == 429:
                    logger.warning(f"   ⚠️ 429 (попытка {attempt+1}/{retries})")
                    # Быстрый backoff: 15 сек → смена IP → ещё попытка
                    # Вместо старых 60 сек — экономим время
                    time.sleep(15)
                    self._change_ip()
                    continue

                if resp.status_code in [403, 503]:
                    logger.warning(f"   ⚠️ HTTP {resp.status_code}, смена fingerprint")
                    self._init_session()
                    time.sleep(10)
                    continue

                logger.warning(f"   ⚠️ HTTP {resp.status_code}")
                return None

            except Exception as e:
                err = str(e)
                if 'proxy' in err.lower() or 'connect' in err.lower():
                    logger.warning(f"   ⚠️ Прокси ошибка (попытка {attempt+1}): таймаут")
                    self._change_ip()
                else:
                    logger.warning(f"   ⚠️ Ошибка (попытка {attempt+1}): {err[:80]}")
                if attempt < retries - 1:
                    time.sleep(8)

        return None


# ─── Расчёт рыночных цен ──────────────────────────────────────────────────────
def get_market_analysis(prices: list[int]) -> tuple[int, int, int]:
    if not prices:
        return 0, 0, 0
    prices  = sorted(prices)
    n       = len(prices)
    low_idx = max(0, int(n * 0.05))
    hi_idx  = int(n * 0.90)
    clean   = prices[low_idx:hi_idx] if n > 10 else prices
    if not clean:
        clean = prices
    market_low  = clean[int(len(clean) * 0.20)]  # 20-й перцентиль = реальный низ
    market_high = clean[int(len(clean) * 0.85)]
    median      = int(statistics.median(clean))
    return market_low, market_high, median


# ─── Парсинг одной конфигурации ───────────────────────────────────────────────
def parse_config(entry: dict, session: Session) -> dict | None:
    url    = entry['url'].strip()
    prices = []
    logger.info(f"🔎 {entry['model_name']} {entry['ram']}GB/{entry['ssd']}GB")

    for page in range(1, 4):
        resp = session.get(f"{url}&p={page}")
        if resp is None:
            logger.info(f"   Стр.{page}: пропускаем")
            continue

        try:
            soup  = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')

            if not items:
                logger.info(f"   Стр.{page}: пусто, стоп")
                break

            page_prices = []
            for item in items:
                try:
                    title_tag = item.select_one('[data-marker="item-title"]')
                    title     = title_tag.get('title', '').lower() if title_tag else ''
                    snippet   = ''
                    s_tag     = item.select_one('[data-marker="item-description"]')
                    if s_tag:
                        snippet = s_tag.get_text().lower()

                    if any(w in (title + ' ' + snippet) for w in JUNK_KEYWORDS):
                        continue

                    p_tag = item.select_one('[itemprop="price"]')
                    if not p_tag:
                        continue
                    p = int(p_tag['content'])
                    if 20000 < p < 900000:
                        page_prices.append(p)
                except Exception:
                    continue

            prices.extend(page_prices)
            logger.info(f"   Стр.{page}: +{len(page_prices)} цен (итого {len(prices)})")

            if len(items) < 15:
                break

        except Exception as e:
            logger.error(f"   Ошибка парсинга стр.{page}: {e}")
            continue

    if len(prices) < 5:
        logger.warning(f"   ⚠️ Мало данных ({len(prices)}), пропускаем")
        return None

    low, high, median = get_market_analysis(prices)
    buyout = int((low - 8000) // 1000 * 1000)

    return {
        "model_name":    entry['model_name'],
        "processor":     entry['processor'],
        "ram":           entry['ram'],
        "ssd":           entry['ssd'],
        "min_price":     low,
        "max_price":     high,
        "median_price":  median,
        "buyout_price":  buyout,
        "samples_count": len(prices),
        "updated_at":    time.strftime("%Y-%m-%d %H:%M"),
    }


# ─── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch",         default="all")
    ap.add_argument("--total-batches", type=int, default=3)
    args = ap.parse_args()

    if not URLS_FILE.exists():
        logger.error(f"❌ {URLS_FILE} не найден")
        return

    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        all_entries = json.load(f)['entries']

    # Меняем IP перед стартом — предыдущий мог быть заблокирован
    if CHANGE_IP_URL:
        logger.info("🔄 Смена IP перед стартом...")
        try:
            std_requests.get(CHANGE_IP_URL, timeout=10, verify=False)
            time.sleep(8)
            logger.info("✅ IP сменён")
        except Exception as e:
            logger.warning(f"⚠️ Смена IP не удалась: {e}")

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 ВСЕ: {len(my_entries)} конфигураций")
    else:
        b     = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b - 1) * chunk
        end   = b * chunk if b < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]
        logger.info(f"📦 Батч {b}/{args.total_batches}: {len(my_entries)} конфигураций")

    # Одна сессия на весь батч — экономит инициализацию
    session = Session()

    new_results    = []
    failed_configs = []

    for entry in my_entries:
        res = parse_config(entry, session)
        if res:
            new_results.append(res)
        else:
            failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")
        # Пауза между конфигурациями
        time.sleep(random.uniform(3, 7))

    # ── Мерж с базой ──────────────────────────────────────────────────────────
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

    final_stats    = []
    total_listings = 0
    repaired_count = 0

    for stat in db.values():
        try:
            median = int(stat.get('median_price', 0))
            if median < 5000:
                continue
            if not stat.get('min_price'):
                stat['min_price'] = int(median * 0.85); repaired_count += 1
            if not stat.get('max_price'):
                stat['max_price'] = int(median * 1.15)
            if not stat.get('buyout_price'):
                stat['buyout_price'] = int((stat['min_price'] - 8000) // 1000 * 1000)

            final_stats.append({
                "model_name":    str(stat['model_name']),
                "processor":     str(stat.get('processor', 'Apple M-series')),
                "ram":           int(stat['ram']),
                "ssd":           int(stat['ssd']),
                "min_price":     int(stat['min_price']),
                "max_price":     int(stat['max_price']),
                "median_price":  int(stat['median_price']),
                "buyout_price":  int(stat['buyout_price']),
                "samples_count": int(stat.get('samples_count', 0)),
                "updated_at":    str(stat.get('updated_at', '')),
            })
            total_listings += int(stat.get('samples_count', 0))
        except Exception:
            continue

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            "generated_at":   time.strftime("%Y-%m-%d %H:%M"),
            "total_listings": total_listings,
            "stats":          final_stats,
        }, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print("📊 ИТОГИ")
    print("=" * 50)
    print(f"✅ Обновлено:        {len(new_results)}")
    print(f"🛠  Отремонтировано: {repaired_count}")
    print(f"❌ Не удалось:       {len(failed_configs)}")
    if failed_configs:
        for fc in failed_configs[:10]:
            print(f"   - {fc}")
        if len(failed_configs) > 10:
            print(f"   ... и ещё {len(failed_configs) - 10}")
    print(f"📈 Объявлений:       {total_listings}")
    print(f"🔧 curl_cffi:        {'да' if CURL_AVAILABLE else 'нет (requests)'}")
    print("=" * 50)


if __name__ == "__main__":
    main()
