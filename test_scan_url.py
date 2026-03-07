#!/usr/bin/env python3
import os, time, random
import urllib3
urllib3.disable_warnings()

RAW_PROXY     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")
SCAN_URL      = os.environ.get('SCAN_URL', '')

# ── Нормализация формата прокси ───────────────────────────────────────────────
# Авито принимает: http://login:pass@host:port
def normalize_proxy(s):
    if not s: return None
    if s.startswith(('http://', 'https://', 'socks5://')):
        return s
    # login:pass@host:port → http://login:pass@host:port
    return f"http://{s}"

PROXY = normalize_proxy(RAW_PROXY)
pdict = {"http": PROXY, "https": PROXY} if PROXY else None

print("=" * 60)
print(f"RAW_PROXY:  {RAW_PROXY[:50] if RAW_PROXY else '❌ пусто'}")
print(f"NORMALIZED: {PROXY[:50] if PROXY else '❌ пусто'}")
print("=" * 60)

try:
    from curl_cffi import requests as cr
    print("✅ curl_cffi доступен")
except ImportError:
    print("❌ curl_cffi не установлен"); exit(1)

import requests as std_requests
from bs4 import BeautifulSoup

# ── Тест прокси через std requests (более совместимый) ────────────────────────
print("\n── 1. Прокси через requests (проверка подключения) ──")
try:
    r = std_requests.get(
        "https://api.ipify.org?format=json",
        proxies=pdict, timeout=10, verify=False
    )
    print(f"✅ requests: IP = {r.json()['ip']}")
    PROXY_WORKS_STD = True
except Exception as e:
    print(f"❌ requests: {e}")
    PROXY_WORKS_STD = False

# ── Тест прокси через curl_cffi ───────────────────────────────────────────────
print("\n── 2. Прокси через curl_cffi ──")
PROXY_WORKS_CURL = False
for browser in ["chrome110", "chrome107", "chrome99"]:
    try:
        s = cr.Session(impersonate=browser)
        s.proxies = pdict
        r = s.get("https://api.ipify.org?format=json", timeout=10, verify=False)
        print(f"✅ curl_cffi ({browser}): IP = {r.json()['ip']}")
        PROXY_WORKS_CURL = True
        WORKING_BROWSER = browser
        break
    except Exception as e:
        print(f"❌ curl_cffi ({browser}): {str(e)[:80]}")

# ── CHANGE_IP ─────────────────────────────────────────────────────────────────
print("\n── 3. CHANGE_IP_URL ──")
if not CHANGE_IP_URL:
    print("⚠️  не задан")
else:
    try:
        r = std_requests.get(CHANGE_IP_URL, timeout=10, verify=False)
        print(f"✅ HTTP {r.status_code}: {r.text[:60]}")
    except Exception as e:
        print(f"❌ {e}")

# ── Авито через прокси ────────────────────────────────────────────────────────
if PROXY_WORKS_CURL or PROXY_WORKS_STD:
    print("\n── 4. Авито через прокси ──")
    AVITO_URL = "https://www.avito.ru/moskva/noutbuki?q=macbook&s=104"
    time.sleep(3)

    # Сначала пробуем curl_cffi
    if PROXY_WORKS_CURL:
        try:
            s = cr.Session(impersonate=WORKING_BROWSER)
            s.proxies = pdict
            r = s.get(AVITO_URL, headers={
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9",
            }, timeout=20, verify=False)
            soup  = BeautifulSoup(r.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            print(f"curl_cffi: HTTP {r.status_code}, объявлений: {len(items)}")
            if items: print("✅ Авито работает через curl_cffi!")
            elif r.status_code == 429: print("❌ 429 — IP прокси заблокирован Авито")
        except Exception as e:
            print(f"❌ curl_cffi + Авито: {e}")

    # Fallback: requests
    if PROXY_WORKS_STD:
        time.sleep(3)
        try:
            r = std_requests.get(AVITO_URL, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept-Language": "ru-RU,ru;q=0.9",
            }, proxies=pdict, timeout=20, verify=False)
            soup  = BeautifulSoup(r.text, 'lxml')
            items = soup.select('[data-marker="item"]')
            print(f"requests:  HTTP {r.status_code}, объявлений: {len(items)}")
            if items: print("✅ Авито работает через requests!")
            elif r.status_code == 429: print("❌ 429 — IP прокси заблокирован Авито")
        except Exception as e:
            print(f"❌ requests + Авито: {e}")

print("\n" + "=" * 60)
print("ИТОГ:")
if not PROXY_WORKS_STD and not PROXY_WORKS_CURL:
    print("❌ Прокси вообще не подключается.")
    print("   Варианты проблемы:")
    print("   1. Неверный формат — должно быть: login:pass@host:port")
    print("   2. Прокси-сервер недоступен с GitHub Actions")
    print("   3. IP GitHub Actions заблокирован у прокси-провайдера")
    print("   4. Закончился баланс или истёк срок")
print("=" * 60)
