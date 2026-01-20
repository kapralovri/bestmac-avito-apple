#!/usr/bin/env python3
"""
Скрипт диагностики прокси для hot-deals-scanner.
Запуск: python test-proxy.py

Проверяет:
1. Подключение через прокси
2. Смену IP
3. Доступность Avito
"""

import os
import requests
import time

# Настройки из env
PROXY_URL = os.getenv("PROXY_URL", "")
CHANGE_IP_URL = os.getenv("CHANGE_IP_URL", "")

def get_session():
    """Создаёт сессию с прокси."""
    session = requests.Session()
    if PROXY_URL:
        session.proxies = {
            "http": f"http://{PROXY_URL}",
            "https": f"http://{PROXY_URL}"
        }
    return session

def test_ip_check(session, label=""):
    """Проверяет текущий IP через внешний сервис."""
    print(f"\n{'='*50}")
    print(f"🔍 Проверка IP {label}")
    print(f"{'='*50}")
    
    services = [
        ("httpbin.org", "https://httpbin.org/ip"),
        ("ipinfo.io", "https://ipinfo.io/json"),
        ("api.ipify.org", "https://api.ipify.org?format=json"),
    ]
    
    for name, url in services:
        try:
            resp = session.get(url, timeout=(10, 15))
            print(f"✅ {name}: {resp.status_code} - {resp.text.strip()[:100]}")
            return resp.json()
        except Exception as e:
            print(f"❌ {name}: {e}")
    
    return None

def test_change_ip():
    """Тестирует смену IP."""
    print(f"\n{'='*50}")
    print("🔄 Тест смены IP")
    print(f"{'='*50}")
    
    if not CHANGE_IP_URL:
        print("⚠️ CHANGE_IP_URL не настроен")
        return False
    
    try:
        resp = requests.get(CHANGE_IP_URL, timeout=15)
        print(f"📡 Ответ API смены IP: {resp.status_code}")
        print(f"   Тело: {resp.text[:200]}")
        
        if resp.status_code == 200:
            print("✅ Смена IP успешна")
            return True
        else:
            print("❌ Ошибка смены IP")
            return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def test_avito_access(session):
    """Проверяет доступность Avito."""
    print(f"\n{'='*50}")
    print("🏠 Тест доступа к Avito")
    print(f"{'='*50}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Connection": "close",
    }
    
    # Тест 1: Главная страница
    try:
        print("\n1️⃣ Главная страница (avito.ru)...")
        resp = session.get("https://www.avito.ru/", headers=headers, timeout=(10, 30))
        print(f"   Статус: {resp.status_code}")
        print(f"   Размер: {len(resp.text)} символов")
        
        # Проверка на блокировку
        blocked_signs = ["captcha", "blocked", "запрещен", "ограничен", "подозрительн"]
        content_lower = resp.text.lower()
        for sign in blocked_signs:
            if sign in content_lower:
                print(f"   ⚠️ Обнаружен признак блокировки: '{sign}'")
                break
        else:
            if resp.status_code == 200:
                print("   ✅ Доступ к главной OK")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
    
    # Тест 2: Поисковая выдача
    try:
        print("\n2️⃣ Поисковая выдача (ноутбуки Apple)...")
        search_url = "https://www.avito.ru/moskva/noutbuki/apple"
        resp = session.get(search_url, headers=headers, timeout=(10, 45))
        print(f"   Статус: {resp.status_code}")
        print(f"   Размер: {len(resp.text)} символов")
        
        if resp.status_code == 200:
            # Ищем признаки объявлений
            if "iva-item" in resp.text or "item-card" in resp.text or "data-marker" in resp.text:
                print("   ✅ Объявления найдены в HTML")
            else:
                print("   ⚠️ Объявления НЕ найдены (возможна капча/редирект)")
        elif resp.status_code == 302:
            print("   ⚠️ Редирект 302 - возможна капча")
        elif resp.status_code == 403:
            print("   ❌ Доступ запрещён (403)")
        elif resp.status_code == 429:
            print("   ❌ Rate limit (429)")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")

def main():
    print("="*60)
    print("🔧 ДИАГНОСТИКА ПРОКСИ ДЛЯ HOT-DEALS-SCANNER")
    print("="*60)
    
    # Проверка настроек
    print("\n📋 Настройки:")
    print(f"   PROXY_URL: {'✅ ' + PROXY_URL.split('@')[-1] if PROXY_URL else '❌ не задан'}")
    print(f"   CHANGE_IP_URL: {'✅ настроен' if CHANGE_IP_URL else '❌ не задан'}")
    
    if not PROXY_URL:
        print("\n❌ PROXY_URL не задан! Укажите переменную окружения.")
        print("   Пример: export PROXY_URL='user:pass@proxy.example.com:8080'")
        return
    
    # Создаём сессию
    session = get_session()
    
    # Тест 1: Проверка IP до смены
    ip_before = test_ip_check(session, "(до смены)")
    
    # Тест 2: Смена IP
    if CHANGE_IP_URL:
        if test_change_ip():
            print("\n⏳ Ждём 10 секунд после смены IP...")
            time.sleep(10)
            
            # Пересоздаём сессию после смены IP
            session.close()
            session = get_session()
            
            # Тест 3: Проверка IP после смены
            ip_after = test_ip_check(session, "(после смены)")
            
            if ip_before and ip_after:
                ip1 = ip_before.get("origin") or ip_before.get("ip")
                ip2 = ip_after.get("origin") or ip_after.get("ip")
                if ip1 != ip2:
                    print(f"\n✅ IP успешно сменился: {ip1} → {ip2}")
                else:
                    print(f"\n⚠️ IP не изменился: {ip1}")
    
    # Тест 4: Доступность Avito
    test_avito_access(session)
    
    # Итог
    print(f"\n{'='*60}")
    print("📊 ДИАГНОСТИКА ЗАВЕРШЕНА")
    print("="*60)
    print("""
Рекомендации:
- Если IP не меняется → проверьте CHANGE_IP_URL
- Если Avito возвращает 302/403 → IP в бане, смените прокси-провайдера
- Если таймауты → проблема с прокси-сервером или сетью
- Если капча → нужен более качественный (резидентный) прокси
""")
    
    session.close()

if __name__ == "__main__":
    main()
