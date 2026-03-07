#!/usr/bin/env python3
"""
Тест v4: меняем IP и сразу проверяем Авито.
Повторяет до 5 раз пока не найдёт незаблокированный IP.
"""
import os, time, random
import urllib3
urllib3.disable_warnings()

RAW_PROXY     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

def fmt(s):
    if not s: return None
    return s if s.startswith(('http://', 'https://', 'socks5://')) else f"http://{s}"

PROXY = fmt(RAW_PROXY)
pdict = {"http": PROXY, "https": PROXY} if PROXY else None

from curl_cffi import requests as cr
import requests as std

AVITO_URL = "https://www.avito.ru/moskva/noutbuki?q=macbook&s=104"
HEADERS   = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9",
}

def current_ip():
    try:
        s = cr.Session(impersonate="chrome110")
        s.proxies = pdict
        return s.get("https://api.ipify.org?format=json", timeout=8, verify=False).json()['ip']
    except:
        return "?"

def change_ip():
    try:
        std.get(CHANGE_IP_URL, timeout=10, verify=False)
        time.sleep(8)  # ждём применения
        return True
    except Exception as e:
        print(f"   ❌ Смена IP не удалась: {e}")
        return False

def test_avito(browser="chrome110"):
    try:
        s = cr.Session(impersonate=browser)
        s.proxies = pdict
        r = s.get(AVITO_URL, headers=HEADERS, timeout=20, verify=False)
        return r.status_code
    except Exception as e:
        return f"ERR: {e}"

print("=" * 60)
print("🔄 ПОИСК НЕЗАБЛОКИРОВАННОГО IP")
print("=" * 60)

for attempt in range(1, 6):
    ip = current_ip()
    print(f"\nПопытка {attempt}/5 — IP: {ip}")

    # Пробуем разные браузеры для одного IP
    for browser in ["chrome110", "chrome107", "chrome104", "chrome99"]:
        time.sleep(random.uniform(2, 4))
        status = test_avito(browser)
        if status == 200:
            print(f"✅ РАБОТАЕТ! browser={browser}, IP={ip}")
            print(f"\nЗапиши этот IP в заметки — он не заблокирован.")
            print(f"CHANGE_IP_URL работает — используй его для ротации.")
            print("=" * 60)
            exit(0)
        else:
            print(f"   {browser}: {status}")

    if attempt < 5:
        print(f"   Меняем IP...")
        change_ip()
        time.sleep(3)

print("\n" + "=" * 60)
print("❌ Все 5 IP заблокированы Авито.")
print()
print("Это означает что mobileproxy.space выдаёт IP")
print("из диапазона который Авито знает и блокирует.")
print()
print("Варианты решения:")
print("1. Обратись в поддержку mobileproxy.space —")
print("   попроси IP из другого пула (не datacenter)")
print("2. Попробуй другого провайдера мобильных прокси:")
print("   — proxy6.net (российские мобильные)")  
print("   — froxy.com")
print("   — mobileproxy.ru")
print("3. Запускай парсер локально с домашнего интернета")
print("   (домашние IP Авито не блокирует)")
print("=" * 60)
