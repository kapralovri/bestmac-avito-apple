#!/usr/bin/env python3
"""
Быстрый тест: проверяет несколько вариантов SCAN_URL
и находит тот который работает без 429.
Запусти локально: python test_scan_url.py
"""
import os, time, random
import urllib3
urllib3.disable_warnings()

PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

def fmt_proxy(s):
    if not s: return None
    return s if s.startswith(('http://', 'https://', 'socks5://')) else f"http://{s}"

PROXY  = fmt_proxy(PROXY_URL)
pdict  = {"http": PROXY, "https": PROXY} if PROXY else None

try:
    from curl_cffi import requests as cr
    def make_session():
        s = cr.Session(impersonate=random.choice(["chrome110","chrome107","chrome104"]))
        if PROXY: s.proxies = pdict
        return s
    CURL = True
    print("✅ curl_cffi доступен")
except ImportError:
    import requests as cr
    def make_session(): return cr.Session()
    CURL = False
    print("⚠️ curl_cffi не найден")

# Варианты URL — от простого к сложному
URLS = [
    ("Простой поиск",        "https://www.avito.ru/moskva/noutbuki?q=macbook&s=104"),
    ("С фильтром даты",      "https://www.avito.ru/moskva/noutbuki?q=macbook&s=104&f=ASgBAgICAkC4ja0Q"),
    ("Москва и МО",          "https://www.avito.ru/moskva_i_mo/noutbuki?q=macbook&s=104"),
    ("Твой текущий SCAN_URL", os.environ.get('SCAN_URL', '')),
]

print("\n" + "="*60)
print("🔍 ТЕСТ ВАРИАНТОВ SCAN_URL")
print("="*60)

from bs4 import BeautifulSoup

for name, url in URLS:
    if not url:
        print(f"\n⏭  {name}: не задан")
        continue

    print(f"\n── {name} ──")
    print(f"   {url[:70]}...")

    session = make_session()
    try:
        time.sleep(random.uniform(3, 6))
        resp = session.get(
            url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9",
            },
            timeout=20,
            verify=False,
        )
        print(f"   HTTP {resp.status_code}, {len(resp.text)} байт")

        if resp.status_code == 200:
            soup  = BeautifulSoup(resp.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            print(f"   ✅ Объявлений: {len(items)}")
            if not items:
                title = soup.find('title')
                print(f"   <title>: {title.text if title else '?'}")
        elif resp.status_code == 429:
            print("   ❌ 429 — заблокирован")
        else:
            print("   ❌ Ошибка")

    except Exception as e:
        print(f"   ❌ {str(e)[:100]}")

print("\n" + "="*60)
print("Используй URL который вернул ✅ Объявлений > 0")
print("="*60)
