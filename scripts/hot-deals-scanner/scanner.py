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

# Конфигурация
# URL можно переопределить через env переменную SCAN_URL
DEFAULT_SCAN_URL = "https://www.avito.ru/moskva_i_mo/noutbuki/apple/b_u-ASgBAgICAkTwvA2I0jSo5A302WY?cd=1&f=ASgBAQICAkTwvA2I0jSo5A302WYBQJ7kDdTIn7YVvLGeFajjlxXCmZYVsNjvEdTY7xGc2O8RsqPEEZKjxBGOza0QmM2tEKaaxhDWzK0Q&localPriority=1&q=macbook&s=104"
SCAN_URL = os.environ.get('SCAN_URL', DEFAULT_SCAN_URL)
HOT_DEAL_THRESHOLD = 0.90  # 10% ниже медианы
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_DEALS_FILE = Path("public/data/seen-hot-deals.json")


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
        print("⚠️ База цен не найдена")
        return {}
    
    with open(PRICES_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Создаём словарь для поиска: model_name -> list of {ram, ssd, median_price}
    # Также создаём упрощённый словарь model_name -> min median для сравнения
    prices = {}
    
    # Поле называется 'stats', не 'statistics'
    for stat in data.get('stats', []):
        model_name = stat.get('model_name', '')
        median = stat.get('median_price')  # Поле median_price, не median
        
        if model_name and median and median > 0:
            # Сохраняем минимальную медиану для модели (базовая конфигурация)
            if model_name not in prices or median < prices[model_name]:
                prices[model_name] = median
    
    print(f"📊 Загружено {len(prices)} моделей из базы цен")
    if prices:
        print(f"   Примеры: {list(prices.items())[:3]}")
    return prices


def load_seen_deals() -> set:
    """Загружает уже отправленные сделки"""
    if not SEEN_DEALS_FILE.exists():
        return set()
    
    try:
        with open(SEEN_DEALS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('seen_urls', []))
    except:
        return set()


def save_seen_deals(seen_urls: set):
    """Сохраняет отправленные сделки"""
    # Храним только последние 1000 URL
    urls_list = list(seen_urls)[-1000:]
    
    with open(SEEN_DEALS_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'updated_at': datetime.now().isoformat(),
            'seen_urls': urls_list
        }, f, ensure_ascii=False, indent=2)


def get_session() -> requests.Session:
    """Создаёт сессию с прокси"""
    session = requests.Session()
    
    proxy_url = os.environ.get('PROXY_URL', '')
    if proxy_url:
        proxies = {
            'http': f'http://{proxy_url}',
            'https': f'http://{proxy_url}'
        }
        session.proxies.update(proxies)
        print(f"🔒 Прокси настроен")
    
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    })
    
    return session


def change_ip():
    """Меняет IP через API прокси"""
    change_ip_url = os.environ.get('CHANGE_IP_URL', '')
    if change_ip_url:
        try:
            resp = requests.get(change_ip_url, timeout=10)
            print(f"🔄 IP сменён: {resp.status_code}")
            time.sleep(5)
        except Exception as e:
            print(f"⚠️ Ошибка смены IP: {e}")


def extract_model_from_title(title: str) -> Optional[str]:
    """Извлекает модель MacBook из заголовка"""
    title_lower = title.lower()
    
    # Паттерны для определения модели
    patterns = [
        # MacBook Pro с чипами M
        (r'macbook\s*pro\s*16.*m4\s*max', 'MacBook Pro 16 (2024, M4 Max)'),
        (r'macbook\s*pro\s*16.*m4\s*pro', 'MacBook Pro 16 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*16.*m4', 'MacBook Pro 16 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*14.*m4\s*max', 'MacBook Pro 14 (2024, M4 Max)'),
        (r'macbook\s*pro\s*14.*m4\s*pro', 'MacBook Pro 14 (2024, M4 Pro)'),
        (r'macbook\s*pro\s*14.*m4', 'MacBook Pro 14 (2024, M4)'),
        (r'macbook\s*pro\s*16.*m3\s*max', 'MacBook Pro 16 (2023, M3 Max)'),
        (r'macbook\s*pro\s*16.*m3\s*pro', 'MacBook Pro 16 (2023, M3 Pro)'),
        (r'macbook\s*pro\s*14.*m3\s*max', 'MacBook Pro 14 (2023, M3 Max)'),
        (r'macbook\s*pro\s*14.*m3\s*pro', 'MacBook Pro 14 (2023, M3 Pro)'),
        (r'macbook\s*pro\s*14.*m3', 'MacBook Pro 14 (2023, M3)'),
        (r'macbook\s*pro\s*16.*m2\s*max', 'MacBook Pro 16 (2023, M2 Max)'),
        (r'macbook\s*pro\s*16.*m2\s*pro', 'MacBook Pro 16 (2023, M2 Pro)'),
        (r'macbook\s*pro\s*14.*m2\s*max', 'MacBook Pro 14 (2023, M2 Max)'),
        (r'macbook\s*pro\s*14.*m2\s*pro', 'MacBook Pro 14 (2023, M2 Pro)'),
        (r'macbook\s*pro\s*16.*m1\s*max', 'MacBook Pro 16 (2021, M1 Max)'),
        (r'macbook\s*pro\s*16.*m1\s*pro', 'MacBook Pro 16 (2021, M1 Pro)'),
        (r'macbook\s*pro\s*14.*m1\s*max', 'MacBook Pro 14 (2021, M1 Max)'),
        (r'macbook\s*pro\s*14.*m1\s*pro', 'MacBook Pro 14 (2021, M1 Pro)'),
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
            return model
    
    return None


def parse_listings(session: requests.Session, max_retries: int = 3) -> list[dict]:
    """Парсит объявления со страницы Авито с retry-логикой"""
    listings = []
    
    for attempt in range(max_retries):
        try:
            print(f"🔍 Сканирую (попытка {attempt + 1}/{max_retries}): {SCAN_URL[:70]}...")
            
            # Добавляем рандомную задержку
            time.sleep(random.uniform(3, 7))
            
            # Увеличиваем таймаут и добавляем connect timeout
            response = session.get(SCAN_URL, timeout=(15, 45))
            
            if response.status_code == 429:
                print("⚠️ Rate limit (429)! Меняю IP...")
                change_ip()
                time.sleep(random.uniform(5, 10))
                continue
            
            if response.status_code == 403:
                print("⚠️ Доступ запрещён (403)! Меняю IP...")
                change_ip()
                time.sleep(random.uniform(5, 10))
                continue
            
            if response.status_code != 200:
                print(f"❌ Ошибка HTTP: {response.status_code}")
                if attempt < max_retries - 1:
                    change_ip()
                    time.sleep(random.uniform(5, 10))
                    continue
                return []
            
            html = response.text
            break  # Успешный запрос, выходим из цикла
            
        except requests.exceptions.Timeout as e:
            print(f"⏱️ Таймаут (попытка {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                print("🔄 Меняю IP и повторяю...")
                change_ip()
                time.sleep(random.uniform(10, 20))
                continue
            print("❌ Все попытки исчерпаны (таймаут)")
            return []
            
        except requests.exceptions.ConnectionError as e:
            print(f"🔌 Ошибка соединения (попытка {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                print("🔄 Меняю IP и повторяю...")
                change_ip()
                time.sleep(random.uniform(10, 20))
                continue
            print("❌ Все попытки исчерпаны (соединение)")
            return []
            
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {e}")
            return []
    else:
        # Цикл завершился без break — все попытки неудачны
        print("❌ Все попытки исчерпаны")
        return []
    
    # Парсим HTML
    try:
        # Ищем JSON данные в HTML
        # Авито хранит данные в __initialData__
        json_match = re.search(r'window\.__initialData__\s*=\s*"(.+?)";', html)
        if json_match:
            # Декодируем escaped JSON
            json_str = json_match.group(1)
            json_str = json_str.encode().decode('unicode_escape')
            data = json.loads(json_str)
            
            # Извлекаем items
            items = []
            if 'catalog' in str(data):
                # Рекурсивно ищем items
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
                        price_val = item.get('priceDetailed', {}).get('value') or item.get('price', 0)
                        
                        if isinstance(price_val, str):
                            price_val = int(re.sub(r'\D', '', price_val) or 0)
                        
                        url = f"https://www.avito.ru{item.get('urlPath', '')}" if item.get('urlPath') else f"https://www.avito.ru/moskva/noutbuki/{item_id}"
                        
                        if title and price_val and price_val > 10000:
                            listings.append({
                                'url': url,
                                'title': title,
                                'price': int(price_val)
                            })
                    except:
                        continue
        
        # Fallback: парсим HTML напрямую
        if not listings:
            # Ищем паттерны объявлений
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
                except:
                    continue
        
        print(f"📦 Найдено {len(listings)} объявлений")
        
    except Exception as e:
        print(f"❌ Ошибка парсинга HTML: {e}")
    
    return listings


def find_hot_deals(listings: list[dict], prices_db: dict, seen_urls: set) -> list[HotDeal]:
    """Находит горячие предложения"""
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
        median_price = None
        for db_model, db_median in prices_db.items():
            if model.lower() in db_model.lower() or db_model.lower() in model.lower():
                median_price = db_median
                break
        
        if not median_price:
            continue
        
        # Проверяем скидку (цена должна быть ниже порога от медианы)
        threshold_price = median_price * HOT_DEAL_THRESHOLD
        discount = 1 - (price / median_price)
        
        if price <= threshold_price:  # цена <= 90% от медианы (скидка >= 10%)
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
            print(f"🔥 HOT DEAL: {title[:50]}... — {price:,}₽ (медиана: {median_price:,}₽, скидка: {hot_deal.discount_percent}%)")
    
    return hot_deals


def send_telegram_notification(deals: list[HotDeal]):
    """Отправляет уведомления в Telegram"""
    notify_url = os.environ.get('TELEGRAM_NOTIFY_URL', '')
    
    if not notify_url:
        print("⚠️ TELEGRAM_NOTIFY_URL не настроен")
        return
    
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
                print(f"✅ Отправлено в Telegram: {deal.title[:40]}...")
            else:
                print(f"❌ Ошибка Telegram: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка отправки: {e}")


def main():
    """Главная функция сканера"""
    print("=" * 60)
    print(f"🔍 HOT DEALS SCANNER — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Загружаем данные
    prices_db = load_prices_database()
    if not prices_db:
        print("❌ Не удалось загрузить базу цен")
        return
    
    seen_urls = load_seen_deals()
    print(f"📝 Уже отправлено: {len(seen_urls)} сделок")
    
    # Создаём сессию
    session = get_session()
    
    # Парсим объявления
    listings = parse_listings(session)
    
    if not listings:
        print("⚠️ Объявления не найдены")
        return
    
    # Ищем горячие предложения
    hot_deals = find_hot_deals(listings, prices_db, seen_urls)
    
    if hot_deals:
        print(f"\n🔥 Найдено {len(hot_deals)} горячих предложений!")
        
        # Отправляем в Telegram
        send_telegram_notification(hot_deals)
        
        # Сохраняем как отправленные
        for deal in hot_deals:
            seen_urls.add(deal.url)
        save_seen_deals(seen_urls)
    else:
        print("😔 Горячих предложений не найдено")
    
    print("\n✅ Сканирование завершено")


if __name__ == '__main__':
    main()
