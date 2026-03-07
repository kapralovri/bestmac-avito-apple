#!/usr/bin/env python3
"""
Тест v2: проверяет только через прокси.
"""
import os, time, random
import urllib3
urllib3.disable_warnings()

PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")
SCAN_URL      = os.environ.get('SCAN_URL', '')

def fmt_proxy(s):
    if not s: return None
    return s if s.startswith(('http://', 'https://', 'socks5://')) else f"http://{s}"

PROXY = fmt_proxy(PROXY_URL)
pdict = {"http": PROXY, "https": PROXY} if PROXY else None

print("=" * 60)
print("PROXY_URL задан:", "✅ да" if PROXY else "❌ НЕТ — без прокси ничего не работает")
print("=" * 60)

if not PROXY:
    print("\n❌ PROXY_URL не задан в секретах GitHub.")
    print("Авито блокирует IP GitHub Actions — прокси обязателен.")
    exit(1)

try:
    from curl_cffi import requests as cr
    def make_session(browser="chrome110"):
        s = cr.Session(impersonate=browser)
        s.proxies = pdict
        return s
    print("✅ curl_cffi доступен")
except ImportError:
    print("❌ curl_cffi не установлен")
    exit(1)

from bs4 import BeautifulSoup

# ── Тест 1: IP прокси ────────────────────────────────────────────────────────
print("\n── 1. Какой IP у прокси? ──")
try:
    s = make_session()
    r = s.get("https://api.ipify.org?format=json", timeout=8, verify=False)
    print(f"✅ IP прокси: {r.json()['ip']}")
except Exception as e:
    print(f"❌ Прокси недоступен: {e}")
    print("Проверь PROXY_URL в секретах — возможно неверный формат")
    exit(1)

# ── Тест 2: CHANGE_IP_URL ────────────────────────────────────────────────────
print("\n── 2. Смена IP ──")
if not CHANGE_IP_URL:
    print("⚠️  CHANGE_IP_URL не задан — смена IP отключена")
else:
    try:
        import requests as std
        r = std.get(CHANGE_IP_URL, timeout=8, verify=False)
        print(f"✅ CHANGE_IP ответил: HTTP {r.status_code}")
        if r.status_code == 200:
            time.sleep(4)
            s2 = make_session()
            r2 = s2.get("https://api.ipify.org?format=json", timeout=8, verify=False)
            print(f"   Новый IP: {r2.json()['ip']}")
    except Exception as e:
        print(f"❌ CHANGE_IP недоступен: {e}")
        print("   ⚠️  Убери CHANGE_IP_URL из секретов или исправь URL")

# ── Тест 3: Авито через прокси ───────────────────────────────────────────────
print("\n── 3. Авито через прокси (несколько браузеров) ──")
browsers = ["chrome110", "chrome107", "chrome104", "chrome99"]
working_browser = None

for browser in browsers:
    try:
        time.sleep(random.uniform(3, 5))
        s = make_session(browser)
        r = s.get(
            "https://www.avito.ru/moskva/noutbuki?q=macbook&s=104",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9",
            },
            timeout=20, verify=False,
        )
        if r.status_code == 200:
            soup  = BeautifulSoup(r.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            print(f"✅ {browser}: HTTP 200, объявлений: {len(items)}")
            if items:
                working_browser = browser
                break
        else:
            print(f"❌ {browser}: HTTP {r.status_code}")
    except Exception as e:
        print(f"❌ {browser}: {str(e)[:60]}")

# ── Тест 4: SCAN_URL через прокси ────────────────────────────────────────────
if SCAN_URL and working_browser:
    print(f"\n── 4. Твой SCAN_URL через прокси ({working_browser}) ──")
    try:
        time.sleep(random.uniform(3, 5))
        s = make_session(working_browser)
        r = s.get(SCAN_URL, headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9",
        }, timeout=20, verify=False)
        soup  = BeautifulSoup(r.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        print(f"HTTP {r.status_code}, объявлений: {len(items)}")
        if items:
            print("✅ SCAN_URL работает!")
        elif r.status_code == 200:
            print("⚠️  Страница загрузилась но объявлений нет — возможно устаревший context=")
    except Exception as e:
        print(f"❌ {e}")

# ── Итог ─────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
if working_browser:
    print(f"✅ Прокси работает! Используй браузер: {working_browser}")
    print("   Сканер и парсер должны работать с этим прокси.")
else:
    print("❌ Ни один браузер не прошёл через прокси.")
    print("   Авито блокирует IP этого прокси.")
    print("   Решения:")
    print("   1. Сменить прокси-провайдера (нужны мобильные/резидентные прокси)")
    print("   2. Запускать парсер локально с твоего домашнего IP")
print("=" * 60)
