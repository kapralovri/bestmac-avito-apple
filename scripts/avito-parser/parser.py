#!/usr/bin/env python3
"""
Парсер цен Авито для bestmac.ru
Собирает рыночные цены по 88 конфигурациям MacBook.
Запускается раз в сутки (например, через GitHub Actions).
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

# ─── Пути к файлам ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
URLS_FILE   = SCRIPT_DIR / "../../public/data/avito-urls.json"
OUTPUT_FILE = SCRIPT_DIR / "../../public/data/avito-prices.json"

# ─── Стоп-слова (только реальный мусор) ──────────────────────────────────────
# Убраны 'коробка' и 'чехол' — они часто означают ХОРОШЕЕ состояние
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

def format_proxy(proxy_str):
    if not proxy_str: return None
    if proxy_str.startswith(('http://', 'https://', 'socks5://')): return proxy_str
    return f"http://{proxy_str}"

PROXY_URL = format_proxy(RAW_PROXY)


# ─── Извлечение RAM и SSD по значению, а не по позиции ───────────────────────
# Надёжно работает с форматами: "8/256", "8gb 512ssd", "16 гб / 1тб" и т.д.
RAM_VALUES = {8, 16, 18, 24, 36, 48, 64, 96, 128}
SSD_VALUES = {64, 128, 256, 512, 1024, 2048, 4096}

def extract_specs(text: str) -> tuple[int, int]:
    """
    Извлекает RAM и SSD из произвольного текста объявления.
    Определяет по типичным значениям, а не по порядку в строке.
    """
    text = text.lower().replace(' ', '')
    ram, ssd = 8, 256  # дефолты

    all_matches = re.findall(r'(\d+)(gb|гб|tb|тб)', text)
    for val_str, unit in all_matches:
        val = int(val_str)
        # Игнорируем годы
        if 2015 <= val <= 2030:
            continue
        # Переводим терабайты в гигабайты
        if unit in ('tb', 'тб'):
            val *= 1024
        # Определяем что это — RAM или SSD — по типичным значениям Apple
        if val in RAM_VALUES:
            ram = val
        elif val in SSD_VALUES:
            ssd = val

    return ram, ssd


# ─── Расчёт рыночных цен ─────────────────────────────────────────────────────
def get_market_analysis(prices: list[int]) -> tuple[int, int, int]:
    """
    Методика: отсекаем верхние 10% (оверпрайс) и нижние 5% (выбросы снизу).
    low  = 10-й перцентиль (реальный низ рынка, без случайного мусора)
    high = 85-й перцентиль (верхняя граница для диапазона на сайте)
    median = медиана чистого диапазона
    """
    if not prices:
        return 0, 0, 0

    prices = sorted(prices)
    n = len(prices)

    # Убираем выбросы снизу (5%) и сверху (10%)
    low_idx  = max(0, int(n * 0.05))
    high_idx = int(n * 0.90)
    clean = prices[low_idx:high_idx] if n > 10 else prices

    if not clean:
        clean = prices

    market_low    = clean[int(len(clean) * 0.10)]  # 10-й перцентиль чистого массива
    market_high   = clean[int(len(clean) * 0.85)]
    median        = int(statistics.median(clean))

    return market_low, market_high, median


# ─── Парсинг одной конфигурации ───────────────────────────────────────────────
def parse_config(entry: dict, proxies: dict | None) -> dict | None:
    """
    Парсит объявления по URL конфигурации.
    Собирает цены, фильтрует мусор, возвращает статистику.
    """
    url    = entry['url']
    prices = []
    logger.info(f"🔎 {entry['model_name']} {entry['ram']}GB/{entry['ssd']}GB ...")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ru-RU,ru;q=0.9",
    }

    # FIX: парсим 5 страниц (было range(1,3) — только 2!)
    for page in range(1, 6):
        try:
            time.sleep(random.uniform(3, 6))
            resp = requests.get(
                f"{url.strip()}&p={page}",
                headers=headers,
                proxies=proxies,
                timeout=25,
                verify=False
            )

            if resp.status_code == 429:
                logger.warning("⚠️ Rate limit (429), меняем IP...")
                if CHANGE_IP_URL:
                    requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                    time.sleep(15)
                continue
            if resp.status_code != 200:
                logger.warning(f"⚠️ HTTP {resp.status_code} на странице {page}, прерываем")
                break

            soup  = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')

            if not items:
                logger.info(f"   Страница {page}: объявлений нет, стоп")
                break

            for item in items:
                try:
                    title_tag = item.select_one('[data-marker="item-title"]')
                    title     = title_tag.get('title', '').lower() if title_tag else ''

                    snippet_tag = item.select_one('[data-marker="item-description"]')
                    snippet     = snippet_tag.get_text().lower() if snippet_tag else ''

                    check_text = title + ' ' + snippet

                    # Фильтр мусора
                    if any(w in check_text for w in JUNK_KEYWORDS):
                        continue

                    price_tag = item.select_one('[itemprop="price"]')
                    if not price_tag:
                        continue
                    p = int(price_tag['content'])

                    # Разумный диапазон для MacBook б/у
                    if 20000 < p < 900000:
                        prices.append(p)

                except Exception:
                    continue

            logger.info(f"   Страница {page}: +{len(items)} объявлений, цен собрано: {len(prices)}")

            # Если меньше 10 объявлений — последняя страница
            if len(items) < 10:
                break

        except Exception as e:
            logger.error(f"   Ошибка на странице {page}: {e}")
            break

    if len(prices) < 5:
        logger.warning(f"   ⚠️ Мало данных ({len(prices)} цен), пропускаем")
        return None

    low, high, median = get_market_analysis(prices)

    # Цена выкупа = низ рынка минус 12 000 руб, округлённая до тысяч
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


# ─── Главная функция ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Парсер цен Авито для BestMac")
    parser.add_argument("--batch",        default="all", help="Номер батча (1/2/3) или 'all'")
    parser.add_argument("--total-batches", type=int, default=3)
    args = parser.parse_args()

    if not URLS_FILE.exists():
        logger.error(f"❌ Файл {URLS_FILE} не найден")
        return

    with open(URLS_FILE, 'r', encoding='utf-8') as f:
        all_entries = json.load(f)['entries']

    # Разбивка на батчи (для параллельного запуска в GitHub Actions)
    batch_env = os.environ.get("BATCH", args.batch)
    if batch_env == "all":
        my_entries = all_entries
        logger.info(f"📦 Режим: ВСЕ конфигурации ({len(my_entries)} шт)")
    else:
        b_idx = int(batch_env)
        chunk = len(all_entries) // args.total_batches
        start = (b_idx - 1) * chunk
        end   = b_idx * chunk if b_idx < args.total_batches else len(all_entries)
        my_entries = all_entries[start:end]
        logger.info(f"📦 Батч {b_idx}/{args.total_batches}: {len(my_entries)} конфигураций")

    proxies = {"http": PROXY_URL, "https": PROXY_URL} if PROXY_URL else None

    new_results    = []
    failed_configs = []

    for entry in my_entries:
        res = parse_config(entry, proxies)
        if res:
            new_results.append(res)
        else:
            failed_configs.append(f"{entry['model_name']} {entry['ram']}/{entry['ssd']}")

    # ── Мерж с существующей базой ─────────────────────────────────────────────
    existing_data = {"stats": []}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except Exception:
            pass

    # Ключ: (модель, ram, ssd)
    db = {(s['model_name'], s['ram'], s['ssd']): s for s in existing_data.get('stats', [])}
    for s in new_results:
        db[(s['model_name'], s['ram'], s['ssd'])] = s

    # ── Финальная санация данных ──────────────────────────────────────────────
    final_stats         = []
    total_all_listings  = 0
    repaired_count      = 0

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
            }
            total_all_listings += clean_item["samples_count"]
            final_stats.append(clean_item)

        except Exception:
            continue

    # ── Сохранение ────────────────────────────────────────────────────────────
    output_data = {
        "generated_at":   time.strftime("%Y-%m-%d %H:%M"),
        "total_listings": total_all_listings,
        "stats":          final_stats,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # ── Итоговый отчёт ────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("📊 ИТОГИ ОБНОВЛЕНИЯ БАЗЫ")
    print("=" * 50)
    print(f"✅ Обновлено успешно:              {len(new_results)}")
    print(f"🛠  Отремонтировано старых записей: {repaired_count}")
    print(f"❌ Не удалось обновить:             {len(failed_configs)}")
    if failed_configs:
        for fc in failed_configs:
            print(f"   - {fc}")
    print(f"📈 Всего объявлений в базе:         {total_all_listings}")
    print("=" * 50)


if __name__ == "__main__":
    main()
