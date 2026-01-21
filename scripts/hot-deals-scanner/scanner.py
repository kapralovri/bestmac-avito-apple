#!/usr/bin/env python3
"""
Hot Deals Scanner - сканирует Авито каждые 15 минут на предмет горячих предложений
Парсит новые объявления и сравнивает с медианными ценами из базы
"""

import json
import os
import re
import time
import random
import requests
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Конфигурация
DEFAULT_SCAN_URL = "https://www.avito.ru/moskva_i_mo/noutbuki/apple/b_u-ASgBAgICAkTwvA2I0jSo5A302WY?cd=1&f=ASgBAQICAkTwvA2I0jSo5A302WYBQJ7kDdTIn7YVvLGeFajjlxXCmZYVsNjvEdTY7xGc2O8RsqPEEZKjxBGOza0QmM2tEKaaxhDWzK0Q&localPriority=1&q=macbook&s=104"
SCAN_URL = os.environ.get('SCAN_URL', DEFAULT_SCAN_URL)
HOT_DEAL_THRESHOLD = 0.90  # 10% ниже медианы
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_DEALS_FILE = Path("public/data/seen-hot-deals.json")
MAX_RETRIES = 5
REQUEST_TIMEOUT = (15, 75)  # (connect, read)


@dataclass
class HotDeal:
    """Горячее предложение"""
    url: str
    title: str
    price: int
    median_price: int
    discount_percent: float
    model: str
    found_at: str


def load_prices_database() -> dict:
    """Загружает базу медианных цен"""
    if not PRICES_FILE.exists():
        logger.warning("⚠️ База цен не найдена: %s", PRICES_FILE)
        return {}
    
    try:
        with open(PRICES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        prices = {}
        for stat in data.get('stats', []):
            model_name = stat.get('model_name', '')
            median = stat.get('median_price')
            
            if model_name and median and median > 0:
                # Сохраняем минимальную медиану для модели
                if model_name not in prices or median < prices[model_name]:
                    prices[model_name] = median
        
        logger.info("📊 Загружено %d моделей из базы цен", len(prices))
        if prices:
            examples = list(prices.items())[:3]
            logger.debug("Примеры: %s", examples)
        
        return prices
        
    except json.JSONDecodeError as e:
        logger.error("❌ Ошибка чтения JSON из %s: %s", PRICES_FILE, e)
        return {}
    except Exception as e:
        logger.error("❌ Неожиданная ошибка при загрузке цен: %s", e)
        return {}


def load_seen_deals() -> set:
    """Загружает уже отправленные сделки"""
    if not SEEN_DEALS_FILE.exists():
        return set()
    
    try:
        with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('seen_urls', []))
    except Exception as e:
        logger.warning("⚠️ Ошибка загрузки seen deals: %s", e)
        return set()


def save_seen_deals(seen_urls: set) -> None:
    """Сохраняет отправленные сделки"""
    try:
        # Создаём директорию если не существует
        SEEN_DEALS_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        # Храним только последние 1000 URL
        urls_list = list(seen_urls)[-1000:]
        
        with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'updated_at': datetime.now().isoformat(),
                'seen_urls': urls_list
            }, f, ensure_ascii=False, indent=2)
            
        logger.debug("✅ Сохранено %d seen URLs", len(urls_list))
        
    except Exception as e:
        logger.error("❌ Ошибка сохранения seen deals: %s", e)


def normalize_proxy_url(raw: str) -> str:
    """Нормализует URL прокси в правильный формат"""
    raw = (raw or "").strip().strip('"').strip("'")
    logger.debug("Исходный прокси URL: %s", raw)
    
    if not raw:
        logger.warning("Прокси URL пустой")
        return ""

    # Если уже есть схема
    if raw.startswith(("http://", "https://", "socks5://")):
        return raw
    
    # Формат: host:port:user:password
    parts = raw.split(":")
    if len(parts) == 4 and "@" not in raw:
        host, port, user, password = parts
        proxy_url = f"http://{user}:{password}@{host}:{port}"
        logger.debug("Прокси URL после нормализации: %s", proxy_url)
        return proxy_url
    
    # Формат: user:password@host:port
    if "@" in raw:
        proxy_url = f"http://{raw}"
        logger.debug("Прокси URL после нормализации: %s", proxy_url)
        return proxy_url
    
    # Формат по умолчанию: host:port
    proxy_url = f"http://{raw}"
    logger.debug("Прокси URL после нормализации: %s", proxy_url)
    return proxy_url


def change_ip() -> None:
    """Меняет IP (задержка для ротации прокси)"""
    logger.info("🔄 Смена IP...")
    time.sleep(random.uniform(5, 8))
    logger.info("✅ IP изменён")


def warm_up_avito(session: requests.Session, max_attempts: int = 3) -> bool:
    """Прогревает сессию: получает cookies с главной страницы.
    
    Это снижает шанс 302/капчи на первом же запросе к выдаче.
    
    Args:
        session: Сессия requests
        max_attempts: Максимальное количество попыток
        
    Returns:
        True если прогрев успешен, False при неудаче
    """
    for attempt in range(max_attempts):
        try:
            logger.debug("Прогрев сессии (попытка %d/%d)", attempt + 1, max_attempts)
            
            resp = session.get(
                'https://www.avito.ru/',
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True
            )
            
            if resp.status_code in (200, 204):
                logger.info("✅ Прогрев сессии успешен")
                return True
                
            if resp.status_code in (403, 429):
                logger.warning("⚠️ Блокировка %d при прогреве, попытка %d/%d", 
                             resp.status_code, attempt + 1, max_attempts)
                change_ip()
                continue
                
            logger.warning("⚠️ Неожиданный статус при прогреве: %d", resp.status_code)
            return False
            
        except requests.RequestException as e:
            logger.error("❌ Ошибка при прогреве сессии: %s", e)
            if attempt < max_attempts - 1:
                time.sleep(random.uniform(3, 6))
                continue
            return False
    
    logger.error("❌ Не удалось прогреть сессию за %d попыток", max_attempts)
    return False


def get_session() -> requests.Session:
    """Создаёт сессию с прокси и headers"""
    session = requests.Session()
    
    # Настройка прокси
    proxy_url_raw = os.environ.get('PROXY_URL', 'ez2TAT:Hap1cUu8Kax6@mproxy.site:15984')
    proxy_url = normalize_proxy_url(proxy_url_raw)
    
    if proxy_url:
        session.proxies = {"http": proxy_url, "https": proxy_url}
        logger.info("🌐 Используется прокси: %s", proxy_url.split('@')[1] if '@' in proxy_url else proxy_url)
    else:
        logger.warning("⚠️ Прокси не настроен")
    
    # Устанавливаем реалистичные headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    })
    
    # Прогреваем сессию
    warm_up_avito(session)
    
    return session


def looks_like_block(html_text: str) -> bool:
    """Проверяет, похож ли HTML на страницу блокировки/капчи"""
    if not html_text:
        return False
    
    text_lower = html_text.lower()
    block_keywords = [
        "captcha",
        "не робот",
        "подтвердите",
        "доступ ограничен",
        "blocked",
        "security check",
        "проверка безопасности"
    ]
    
    return any(keyword in text_lower for keyword in block_keywords)


def extract_model_from_title(title: str) -> Optional[str]:
    """Извлекает модель MacBook из заголовка"""
    title_lower = title.lower()
    
    # Паттерны для определения модели (от более специфичных к общим)
    patterns = [
        # MacBook Pro 16" с чипами M
        (r'macbook\s*pro\s*16.*m4\s*max', 'MacBook Pro 16 (2024, M4 Max)'),
        (r'macbook\s*pro\s*16.*m4\s*pro', 'MacBook Pro 16 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*16.*m4', 'MacBook Pro 16 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*16.*m3\s*max', 'MacBook Pro 16 (2023, M3 Max)'),
        (r'macbook\s*pro\s*16.*m3\s*pro', 'MacBook Pro 16 (2023, M3 Pro)'),
        (r'macbook\s*pro\s*16.*m2\s*max', 'MacBook Pro 16 (2023, M2 Max)'),
        (r'macbook\s*pro\s*16.*m2\s*pro', 'MacBook Pro 16 (2023, M2 Pro)'),
        (r'macbook\s*pro\s*16.*m1\s*max', 'MacBook Pro 16 (2021, M1 Max)'),
        (r'macbook\s*pro\s*16.*m1\s*pro', 'MacBook Pro 16 (2021, M1 Pro)'),
        
        # MacBook Pro 14" с чипами M
        (r'macbook\s*pro\s*14.*m4\s*max', 'MacBook Pro 14 (2024, M4 Max)'),
        (r'macbook\s*pro\s*14.*m4\s*pro', 'MacBook Pro 14 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*14.*m4', 'MacBook Pro 14 (2024, M4)'),
        (r'macbook\s*pro\s*14.*m3\s*max', 'MacBook Pro 14 (2023, M3 Max)'),
        (r'macbook\s*pro\s*14.*m3\s*pro', 'MacBook Pro 14 (2023, M3 Pro)'),
        (r'macbook\s*pro\s*14.*m3', 'MacBook Pro 14 (2023, M3)'),
        (r'macbook\s*pro\s*14.*m2\s*max', 'MacBook Pro 14 (2023, M2 Max)'),
        (r'macbook\s*pro\s*14.*m2\s*pro', 'MacBook Pro 14 (2023, M2 Pro)'),
        (r'macbook\s*pro\s*14.*m1\s*max', 'MacBook Pro 14 (2021, M1 Max)'),
        (r'macbook\s*pro\s*14.*m1\s*pro', 'MacBook Pro 14 (2021, M1 Pro)'),
        
        # MacBook Pro 13" с чипами M
        (r'macbook\s*pro\s*13.*m2', 'MacBook Pro 13 (2022, M2)'),
        (r'macbook\s*pro\s*13.*m1', 'MacBook Pro 13 (2020, M1)'),
        
        # MacBook Air с чипами M
        (r'macbook\s*air\s*15.*m4', 'MacBook Air 15 (2025, M4)'),
        (r'macbook\s*air\s*13.*m4', 'MacBook Air 13 (2025, M4)'),
        (r'macbook\s*air\s*15.*m3', 'MacBook Air 15 (2024, M3)'),
        (r'macbook\s*air\s*13.*m3', 'MacBook Air 13 (2024, M3)'),
        (r'macbook\s*air\s*15.*m2', 'MacBook Air 15 (2023, M2)'),
        (r'macbook\s*air\s*13.*m2', 'MacBook Air 13 (2022, M2)'),
        (r'macbook\s*air.*m1', 'MacBook Air 13 (2020, M1)'),
    ]
    
    for pattern, model in patterns:
        if re.search(pattern, title_lower):
            logger.debug("Найдена модель '%s' в заголовке: %s", model, title[:50])
            return model
    
    logger.debug("Модель не определена для: %s", title[:50])
    return None


def parse_listings(session: requests.Session, max_retries: int = MAX_RETRIES) -> list[dict]:
    """Парсит объявления со страницы Авито с retry-логикой
    
    Args:
        session: Сессия requests
        max_retries: Максимальное количество попыток
        
    Returns:
        Список словарей с объявлениями
    """
    listings = []
    
    for attempt in range(max_retries):
        try:
            logger.info("🔍 Сканирую (попытка %d/%d): %s...", 
                       attempt + 1, max_retries, SCAN_URL[:70])
            
            # Добавляем рандомную задержку между попытками
            if attempt > 0:
                time.sleep(random.uniform(5, 10))
            else:
                time.sleep(random.uniform(3, 7))
            
            # Cache-busting для избежания кеша прокси
            separator = '&' if '?' in SCAN_URL else '?'
            scan_url = f"{SCAN_URL}{separator}_={int(time.time())}"

            response = session.get(scan_url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            
            # Обработка различных статусов
            if response.status_code == 429:
                logger.warning("⚠️ Rate limit (429)!")
                time.sleep(random.uniform(5, 10))
                change_ip()
                continue
            
            if response.status_code == 403:
                logger.warning("⚠️ Доступ запрещён (403)!")
                time.sleep(random.uniform(5, 10))
                session = get_session()
                continue

            # Редиректы часто означают антибот/капчу
            if response.status_code in (301, 302, 303, 307, 308):
                location = response.headers.get('Location', '')
                logger.warning("⚠️ Редирект %d -> %s...", response.status_code, location[:60])
                time.sleep(random.uniform(8, 15))
                session = get_session()
                continue
            
            if response.status_code != 200:
                logger.error("❌ Ошибка HTTP: %d", response.status_code)
                if attempt < max_retries - 1:
                    time.sleep(random.uniform(5, 10))
                    session = get_session()
                    continue
                return []
            
            html = response.text

            # Детект антибот страницы по содержимому
            if looks_like_block(html):
                logger.warning("⚠️ Похоже на антибот/капчу по содержимому")
                if attempt < max_retries - 1:
                    time.sleep(random.uniform(10, 20))
                    session = get_session()
                    continue
                return []

            # Успешный запрос
            break
            
        except requests.exceptions.Timeout as e:
            logger.error("⏱️ Таймаут (попытка %d): %s", attempt + 1, e)
            if attempt < max_retries - 1:
                logger.info("🔄 Повторная попытка...")
                time.sleep(random.uniform(10, 20))
                session = get_session()
                continue
            logger.error("❌ Все попытки исчерпаны (таймаут)")
            return []
            
        except requests.exceptions.ConnectionError as e:
            logger.error("🔌 Ошибка соединения (попытка %d): %s", attempt + 1, e)
            if attempt < max_retries - 1:
                logger.info("🔄 Повторная попытка...")
                time.sleep(random.uniform(10, 20))
                session = get_session()
                continue
            logger.error("❌ Все попытки исчерпаны (соединение)")
            return []
            
        except Exception as e:
            logger.exception("❌ Неожиданная ошибка: %s", e)
            return []
    else:
        # Цикл завершился без break
        logger.error("❌ Все попытки исчерпаны")
        return []
    
    # Парсим HTML
    try:
        listings = _parse_html(html)
        logger.info("📦 Найдено %d объявлений", len(listings))
        
    except Exception as e:
        logger.exception("❌ Ошибка парсинга HTML: %s", e)
    
    return listings


def _parse_html(html: str) -> list[dict]:
    """Внутренняя функция для парсинга HTML
    
    Args:
        html: HTML контент страницы
        
    Returns:
        Список словарей с объявлениями
    """
    listings = []
    
    # Метод 1: Ищем JSON данные в __initialData__
    json_match = re.search(r'window\.__initialData__\s*=\s*"(.+?)";', html)
    
    if json_match:
        try:
            # Декодируем escaped JSON
            json_str = json_match.group(1)
            json_str = json_str.encode().decode('unicode_escape')
            data = json.loads(json_str)
            
            # Рекурсивно ищем items в структуре данных
            def find_items(obj):
                if isinstance(obj, dict):
                    if 'items' in obj and isinstance(obj['items'], list):
                        return obj['items']
                    for v in obj.values():
                        result = find_items(v)
                        if result:
                            return result
                elif isinstance(obj, list):
                    for item in obj:
                        result = find_items(item)
                        if result:
                            return result
                return None
            
            items = find_items(data) or []
            
            for item in items:
                if isinstance(item, dict) and 'id' in item:
                    try:
                        item_id = item.get('id')
                        title = item.get('title', '')
                        
                        # Извлекаем цену
                        price_val = item.get('priceDetailed', {}).get('value') or item.get('price', 0)
                        if isinstance(price_val, str):
                            price_val = int(re.sub(r'\D', '', price_val) or 0)
                        
                        # Формируем URL
                        url_path = item.get('urlPath', '')
                        url = (f"https://www.avito.ru{url_path}" if url_path 
                              else f"https://www.avito.ru/moskva/noutbuki/{item_id}")
                        
                        # Фильтруем по минимальной цене
                        if title and price_val and price_val > 10000:
                            listings.append({
                                'url': url,
                                'title': title,
                                'price': int(price_val)
                            })
                            
                    except Exception as e:
                        logger.debug("Ошибка обработки item: %s", e)
                        continue
                        
            logger.debug("Найдено %d объявлений через __initialData__", len(listings))
            
        except Exception as e:
            logger.warning("Ошибка парсинга JSON: %s", e)
    
    # Метод 2 (Fallback): Парсим HTML напрямую
    if not listings:
        logger.debug("Используется fallback парсинг HTML")
        item_pattern = r'data-marker="item"[^>]*>.*?href="(/[^"]+)".*?title="([^"]+)".*?data-marker="item-price"[^>]*>([^<]+)'
        matches = re.findall(item_pattern, html, re.DOTALL)
        
        for url_path, title, price_text in matches:
            try:
                price = int(re.sub(r'\D', '', price_text) or 0)
                if price > 10000:
                    listings.append({
                        'url': f'https://www.avito.ru{url_path}',
                        'title': title.strip(),
                        'price': price
                    })
            except Exception as e:
                logger.debug("Ошибка обработки fallback item: %s", e)
                continue
        
        logger.debug("Найдено %d объявлений через fallback", len(listings))
    
    return listings


def find_hot_deals(listings: list[dict], prices_db: dict, seen_urls: set) -> list[HotDeal]:
    """Находит горячие предложения
    
    Args:
        listings: Список объявлений
        prices_db: База медианных цен
        seen_urls: Множество уже обработанных URL
        
    Returns:
        Список горячих предложений
    """
    hot_deals = []
    
    for listing in listings:
        url = listing['url']
        
        # Пропускаем уже отправленные
        if url in seen_urls:
            continue
        
        title = listing['title']
        price = listing['price']
        
        # Определяем модель
        model = extract_model_from_title(title)
        if not model:
            continue
        
        # Ищем медианную цену
        median_price = _find_median_price(model, prices_db)
        if not median_price:
            logger.debug("Медианная цена не найдена для модели: %s", model)
            continue
        
        # Проверяем скидку
        threshold_price = median_price * HOT_DEAL_THRESHOLD
        discount = 1 - (price / median_price)
        
        if price <= threshold_price:  # Скидка >= 10%
            hot_deal = HotDeal(
                url=url,
                title=title,
                price=price,
                median_price=median_price,
                discount_percent=round(discount * 100, 1),
                model=model,
                found_at=datetime.now().isoformat()
            )
            hot_deals.append(hot_deal)
            logger.info("🔥 HOT DEAL: %s... — %s₽ (медиана: %s₽, скидка: %.1f%%)",
                       title[:50], f"{price:,}", f"{median_price:,}", hot_deal.discount_percent)
    
    return hot_deals


def _find_median_price(model: str, prices_db: dict) -> Optional[int]:
    """Находит медианную цену для модели
    
    Args:
        model: Название модели
        prices_db: База медианных цен
        
    Returns:
        Медианная цена или None
    """
    model_lower = model.lower()
    
    for db_model, db_median in prices_db.items():
        db_model_lower = db_model.lower()
        if model_lower in db_model_lower or db_model_lower in model_lower:
            return db_median
    
    return None


def send_telegram_notification(deals: list[HotDeal]) -> None:
    """Отправляет уведомления в Telegram
    
    Args:
        deals: Список горячих предложений
    """
    notify_url = os.environ.get('TELEGRAM_NOTIFY_URL', '')
    
    if not notify_url:
        logger.warning("⚠️ TELEGRAM_NOTIFY_URL не настроен")
        return
    
    success_count = 0
    
    for deal in deals:
        try:
            payload = {
                'deals': [asdict(deal)]
            }
            
            response = requests.post(
                notify_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info("✅ Отправлено в Telegram: %s...", deal.title[:40])
                success_count += 1
            else:
                logger.error("❌ Ошибка Telegram (статус %d): %s", 
                           response.status_code, response.text[:100])
                
        except requests.Timeout:
            logger.error("❌ Таймаут при отправке в Telegram")
        except Exception as e:
            logger.exception("❌ Ошибка отправки в Telegram: %s", e)
    
    logger.info("📤 Отправлено уведомлений: %d/%d", success_count, len(deals))


def main():
    """Главная функция сканера"""
    logger.info("=" * 60)
    logger.info("🔍 HOT DEALS SCANNER — %s", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    logger.info("=" * 60)
    
    # Загружаем данные
    prices_db = load_prices_database()
    if not prices_db:
        logger.error("❌ Не удалось загрузить базу цен")
        return
    
    seen_urls = load_seen_deals()
    logger.info("📝 Уже отправлено: %d сделок", len(seen_urls))
    
    # Создаём сессию
    session = get_session()
    
    try:
        # Парсим объявления
        listings = parse_listings(session)
        
        if not listings:
            logger.warning("⚠️ Объявления не найдены")
            return
        
        # Ищем горячие предложения
        hot_deals = find_hot_deals(listings, prices_db, seen_urls)
        
        if hot_deals:
            logger.info("\n🔥 Найдено %d горячих предложений!", len(hot_deals))
            
            # Отправляем в Telegram
            send_telegram_notification(hot_deals)
            
            # Сохраняем как отправленные
            for deal in hot_deals:
                seen_urls.add(deal.url)
            save_seen_deals(seen_urls)
        else:
            logger.info("😔 Горячих предложений не найдено")
        
        logger.info("\n✅ Сканирование завершено")
        
    except KeyboardInterrupt:
        logger.info("\n⚠️ Прервано пользователем")
    except Exception as e:
        logger.exception("❌ Критическая ошибка: %s", e)
    finally:
        session