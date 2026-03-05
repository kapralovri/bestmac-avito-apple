#!/usr/bin/env python3
"""
Парсер цен Авито для bestmac.ru — v3
Ключевые изменения vs v2:
- Адаптивная пауза между запросами (не долбим сервер)
- 429 → ждём 60 сек, меняем IP только если 429 повторяется
- Смена IP с таймаутом не блокирует весь парсинг
- Парсим 3 страницы (компромисс скорость/данные)
- Пропускаем страницу при ошибке, не прерываем всю конфигурацию
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

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Ошибка: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Parser")

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
PROXIES   = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

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


# ─── Смена IP ─────────────────────────────────────────────────────────────────
_last_ip_change = 0
_MIN_IP_INTERVAL = 60  # не чаще раза в минуту

def try_change_ip() -> bool:
    """Меняет IP. Возвращает True если успешно. Не падает при ошибке."""
    global _last_ip_change
    if not CHANGE_IP_URL:
        return False
    now = time.time()
    if now - _last_ip_change < _MIN_IP_INTERVAL:
        logger.info("   ⏳ IP менялся недавно, пропускаем")
        return False
    try:
        r = requests.get(CHANGE_IP_URL, timeout=10, verify=False)
        _last_ip_change = time.time()
        logger.info(f"   🔄 IP сменён (HTTP {r.status_code})")
        time.sleep(8)  # ждём пока IP применится
        return True
    except Exception as e:
        logger.warning(f"   ⚠️ Смена IP не удалась: {e}")
        return False


# ─── Один GET-запрос с логикой 429 ────────────────────────────────────────────
def safe_get(url: str, max_retries: int = 2):
    """
    Делает GET запрос. При 429:
    - первый раз: ждёт 60 сек (soft backoff)
    - второй раз: меняет IP и ждёт ещё
    Возвращает Response или None.
    """
    for attempt in range(max_retries + 1):
        try:
            time.sleep(random.uniform(4, 8))  # базовая пауза между запросами
            resp = requests.get(url, headers=HEADERS, proxies=PROXIES,
                                timeout=20, verify=False)

            if resp.status_code == 200:
                return resp

            if resp.status_code == 429:
                if attempt == 0:
                    logger.warning(f"   ⚠️ 429, ждём 60 сек...")
                    time.sleep(60)
                elif attempt == 1:
                    logger.warning(f"   ⚠️ 429 снова, меняем IP...")
                    try_change_ip()
                    time.sleep(30)
                else:
                    logger.warning(f"   ⚠️ 429 x3, пропускаем страницу")
                    return None
                continue

            logger.warning(f"   ⚠️ HTTP {resp.status_code}")
            return None

        except requests.exceptions.Timeout:
            logger.warning(f"   ⚠️ Таймаут (попытка {attempt+1})")
            if attempt < max_retries:
                time.sleep(15)
            continue
        except Exception as e:
            logger.error(f"   ❌ Ошибка запроса: {e}")
            return None

    return None


# ─── Расчёт цен ───────────────────────────────────────────────────────────────
def get_market_analysis(prices: list[int]) -> tuple[int, int, int]:
    if not prices:
        return 0, 0, 0
    prices = sorted(prices)
    n = len(prices)
    # Отсекаем нижние 5% (случайный мусор) и верхние 10% (оверпрайс)
    low_idx  = max(0, int(n * 0.05))
    high_idx = int(n * 0.90)
    clean = prices[low_idx:high_idx] if n > 10 else prices
    if not clean:
        clean = prices
    market_low  = clean[int(len(clean) * 0.10)]
    market_high = clean[int(len(clean) * 0.85)]
    median      = int(statistics.median(clean))
    return market_low, market_high, median


# ─── Парсинг одной конфигурации ───────────────────────────────────────────────
def parse_config(entry: dict) -> dict | None:
    url    = entry['url'].strip()
    prices = []
    logger.info(f"🔎 {entry['model_name']} {entry['ram']}GB/{entry['ssd']}GB")

    # 3 страницы — компромисс между полнотой данных и нагрузкой на прокси
    # Если нужно больше данных — поднять до 4, но тогда увеличить паузы
    for page in range(1, 4):
        resp = safe_get(f"{url}&p={page}")
        if resp is None:
            logger.info(f"   Страница {page}: пропускаем")
            continue

        try:
            soup  = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')

            if not items:
                logger.info(f"   Страница {page}: пусто, стоп")
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
            logger.info(f"   Стр.{page}: +{len(page_prices)} цен (всего {len(prices)})")

            if len(items) < 10:
                break

        except Exception as e:
            logger.error(f"   Ошибка парсинга страницы {page}: {e}")
            continue

    if len(prices) < 5:
        logger.warning(f"   ⚠️ Мало данных ({len(prices)}), пропускаем")
        return None

    low, high, median = get_market_analysis(prices)
    buyout = int((low - 12000) // 1000 * 1000)

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

    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 ВСЕ: {len(my_entries)} конфигураций")
    else:
        b = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b - 1) * chunk
        end   = b * chunk if b < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]
        logger.info(f"📦 Батч {b}/{args.total_batches}: {len(my_entries)} шт")

    new_results    = []
    failed_configs = []

    for entry in my_entries:
        res = parse_config(entry)
        if res:
            new_results.append(res)
        else:
            failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")

    # Мерж с базой
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

    final_stats        = []
    total_listings     = 0
    repaired_count     = 0

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
                stat['buyout_price'] = int((stat['min_price'] - 12000) // 1000 * 1000)

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
    print(f"✅ Обновлено:              {len(new_results)}")
    print(f"🛠  Отремонтировано:        {repaired_count}")
    print(f"❌ Не удалось:             {len(failed_configs)}")
    if failed_configs:
        for fc in failed_configs[:10]:
            print(f"   - {fc}")
        if len(failed_configs) > 10:
            print(f"   ... и ещё {len(failed_configs)-10}")
    print(f"📈 Объявлений в базе:      {total_listings}")
    print("=" * 50)


if __name__ == "__main__":
    main()
