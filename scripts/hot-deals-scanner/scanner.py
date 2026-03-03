#!/usr/bin/env python3
"""
Сканер горячих сделок Авито для bestmac.ru
Запускается каждые 30 минут, ищет выгодные объявления по одному широкому URL,
матчит с базой цен, отправляет уведомления в Telegram.

Ключевые улучшения:
- extract_specs определяет RAM/SSD по типичным значениям Apple, а не по позиции
- match_to_db использует характеристики из блока "Характеристики" на странице объявления
- Порог повышен до 1.20 (было 1.10)
- Срочность проверяется в превью ДО захода в объявление
- deep_analyze вызывается ровно один раз
- Убраны 'коробка' и 'чехол' из стоп-слов
"""
import json
import os
import re
import time
import random
import logging
import urllib3
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: pip install requests beautifulsoup4 lxml")
    exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Scanner")

# ─── Конфигурация ─────────────────────────────────────────────────────────────
PRICES_FILE = Path("public/data/avito-prices.json")
SEEN_FILE   = Path("public/data/seen-hot-deals.json")

TELEGRAM_URL  = os.environ.get('TELEGRAM_NOTIFY_URL')
SCAN_URL      = os.environ.get('SCAN_URL')
PROXY_URL     = os.environ.get('PROXY_URL', '').strip().strip('"').strip("'")
CHANGE_IP_URL = os.environ.get('CHANGE_IP_URL', '').strip().strip('"').strip("'")

# FIX: порог 1.20 вместо 1.10 — охватывает больше реальных сделок
PRICE_THRESHOLD_FACTOR = 1.20

# Срочность — ищем в превью БЕЗ захода в объявление
URGENT_KEYWORDS = [
    'срочно', 'торг', 'уступлю', 'переезд', 'сегодня', 'быстро',
    'дисконт', 'возможен торг', 'отдам за', 'снижу', 'договоримся',
]

# FIX: убраны 'коробка' и 'чехол' — они означают хорошее состояние
BAD_KEYWORDS = [
    'mdm', 'залочен', 'разбита', 'разбит', 'ремонт', 'не работает', 'icloud',
    'запчаст', 'матриц', 'дефект', 'аккаунт',
    'под заказ', 'срок доставки', 'предоплата', 'замена', 'меняли', 'менял',
    'восстановлен', 'реф', 'refurbished', 'залит', 'глючит', 'полосы', 'пятна',
    'в разбор', 'на части', 'пароль', 'обход', 'не включается', 'трещин',
]

# ─── Типичные значения Apple RAM и SSD ────────────────────────────────────────
RAM_VALUES = {8, 16, 18, 24, 36, 48, 64, 96, 128}
SSD_VALUES = {64, 128, 256, 512, 1024, 2048, 4096}


def clean_url(url: str) -> str:
    return url.split('?')[0]


# ─── FIX: extract_specs по значению, а не по позиции ─────────────────────────
def extract_specs(text: str) -> tuple[int, int]:
    """
    Надёжно извлекает RAM и SSD из любого текста.
    Работает с форматами: "8/256", "8gb 512ssd", "16 гб / 1тб", "8GB RAM 256GB SSD"
    Определяет значение по принадлежности к типичным конфигурациям Apple.
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
        # Определяем по типичным значениям
        if val in RAM_VALUES:
            ram = val
        elif val in SSD_VALUES:
            ssd = val

    return ram, ssd


class AvitoScanner:
    def __init__(self):
        # Прокси
        p_str = PROXY_URL
        if p_str and not p_str.startswith('http'):
            p_str = f"http://{p_str}"
        self.proxies = {"http": p_str, "https": p_str} if p_str else None

        # Загрузка базы цен
        self.prices = {}
        if PRICES_FILE.exists():
            with open(PRICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for s in data.get('stats', []):
                    key = (s['model_name'].lower(), int(s['ram']), int(s['ssd']))
                    self.prices[key] = s
            logger.info(f"📊 База цен загружена: {len(self.prices)} конфигураций")
        else:
            logger.warning("⚠️ База цен не найдена!")

        # Загрузка истории просмотренных объявлений
        self.seen = set()
        if SEEN_FILE.exists():
            try:
                with open(SEEN_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.seen = set(clean_url(u) for u in data.get('seen_urls', []))
                logger.info(f"👁 История: {len(self.seen)} объявлений")
            except Exception:
                pass

    # ─── Вспомогательные методы ───────────────────────────────────────────────

    def rotate_ip(self):
        if CHANGE_IP_URL:
            try:
                requests.get(CHANGE_IP_URL, timeout=15, verify=False)
                time.sleep(12)
                logger.info("🔄 IP сменён")
            except Exception:
                pass

    def get_with_retry(self, url: str, retries: int = 3):
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "ru-RU,ru;q=0.9",
        }
        for attempt in range(retries):
            try:
                resp = requests.get(
                    url, headers=headers,
                    proxies=self.proxies,
                    timeout=30,
                    verify=False
                )
                if resp.status_code == 200:
                    return resp
                if resp.status_code in [403, 429]:
                    logger.warning(f"⚠️ HTTP {resp.status_code}, меняем IP (попытка {attempt+1})")
                    self.rotate_ip()
            except Exception as e:
                logger.error(f"   Ошибка запроса: {e}")
                self.rotate_ip()
                time.sleep(5)
        return None

    # ─── FIX: deep_analyze — заходим ОДИН РАЗ, берём всё сразу ──────────────
    def deep_analyze(self, url: str) -> dict:
        """
        Заходит в страницу объявления.
        Извлекает: циклы АКБ, срочность в описании, характеристики из блока.
        Авито показывает блок "Характеристики" прямо на странице объявления.

        Возвращает dict:
          - cycles: int | None
          - is_urgent: bool
          - specs: dict с полями model, ram, ssd, diagonal (если нашли)
        """
        result = {"cycles": None, "is_urgent": False, "specs": {}}

        resp = self.get_with_retry(url)
        if not resp:
            return result

        try:
            soup = BeautifulSoup(resp.text, 'lxml')

            # ── Описание: циклы и срочность ───────────────────────────────────
            desc_tag = soup.find('div', attrs={'data-marker': 'item-description'})
            desc_text = desc_tag.get_text().lower() if desc_tag else ""

            # Циклы АКБ
            c_match = re.search(r'(\d+)\s*(?:цикл|cycle|ц\.|cyc)', desc_text)
            if c_match:
                result["cycles"] = int(c_match.group(1))

            # Срочность в описании
            result["is_urgent"] = any(w in desc_text for w in URGENT_KEYWORDS)

            # ── Блок "Характеристики" на странице объявления ──────────────────
            # Авито рендерит характеристики в теге <li> внутри ul[class*="params"]
            # Формат: "Ключ: Значение"
            specs = {}
            params_items = soup.select('li[class*="params-paramsList__item"]')
            if not params_items:
                # Запасной вариант — ищем по data-marker
                params_items = soup.select('[data-marker="item-view/item-params"] li')

            for li in params_items:
                text = li.get_text(separator=':').strip()
                if ':' in text:
                    key, _, val = text.partition(':')
                    specs[key.strip().lower()] = val.strip()

            # Извлекаем нужные поля из характеристик
            # "Оперативная память, гб" → "8"
            # "Объем накопителей, гб"  → "256"
            # "Модель"                 → "MacBook Air 13 (2020, M1)"
            # "Диагональ, дюйм"        → "13.3"
            if specs:
                raw_ram = specs.get('оперативная память, гб', '')
                raw_ssd = specs.get('объем накопителей, гб', '')
                raw_model = specs.get('модель', '')
                raw_diag = specs.get('диагональ, дюйм', '')

                if raw_ram:
                    try: result["specs"]["ram"] = int(float(raw_ram))
                    except ValueError: pass
                if raw_ssd:
                    try: result["specs"]["ssd"] = int(float(raw_ssd))
                    except ValueError: pass
                if raw_model:
                    result["specs"]["model"] = raw_model
                if raw_diag:
                    try: result["specs"]["diagonal"] = float(raw_diag)
                    except ValueError: pass

        except Exception as e:
            logger.error(f"   Ошибка deep_analyze: {e}")

        return result

    # ─── FIX: матчинг с базой по реальным характеристикам ────────────────────
    def match_to_db(self, title: str, ram: int, ssd: int, specs: dict) -> dict | None:
        """
        Сопоставляет объявление с записью в базе цен.
        Приоритет: точные характеристики из блока → fallback на заголовок.

        specs — данные из deep_analyze (могут быть пустыми на этапе превью).
        """
        # Если deep_analyze уже дал нам точные RAM/SSD — используем их
        final_ram = specs.get('ram', ram)
        final_ssd = specs.get('ssd', ssd)
        title_lower = title.lower()

        best_match = None
        best_score = 0

        for (m_name, m_ram, m_ssd), stat in self.prices.items():
            # RAM и SSD должны совпадать точно
            if m_ram != final_ram or m_ssd != final_ssd:
                continue

            # Матчим модель по ключевым маркерам: тип (air/pro) + чип (m1/m2/m3/m4/...)
            # Диагональ НЕ требуем — в заголовках её часто нет
            model_markers = re.findall(
                r'(air|pro mini|mac mini|imac|m1 pro|m1 max|m2 pro|m2 max|m3 pro|m3 max|m4 pro|m4 max|m1|m2|m3|m4)',
                m_name.lower()
            )

            score = sum(1 for marker in model_markers if marker in title_lower)

            # Если в базе есть модель с 2 маркерами (напр. "air" + "m2"),
            # требуем оба совпадения. Если только 1 маркер — достаточно.
            required = len(model_markers)
            if required > 0 and score >= required:
                if score > best_score:
                    best_score = score
                    best_match = stat

        return best_match

    # ─── Telegram-уведомление ────────────────────────────────────────────────
    def notify(
        self, title, price, market_low, buyout,
        ram, ssd, url, cycles, is_urgent, is_avito_low,
        diagonal=None
    ):
        if not TELEGRAM_URL:
            return

        badges = []
        if is_urgent:    badges.append("🚨 <b>СРОЧНО / ТОРГ</b>")
        if is_avito_low: badges.append("📉 <b>НИЖЕ РЫНКА (АВИТО)</b>")
        if cycles and cycles < 200: badges.append(f"🔋 <b>АКБ: {cycles} цикл.</b>")
        elif cycles:                 badges.append(f"🔋 Циклов: {cycles}")

        status_line = " | ".join(badges) if badges else "🎯 <b>Выгодное предложение</b>"

        discount_pct = round((1 - price / market_low) * 100) if market_low else 0
        discount_str = f" (−{discount_pct}% от рынка)" if discount_pct > 0 else ""

        diag_str = f" {diagonal}\"" if diagonal else ""

        text = (
            f"{status_line}\n\n"
            f"💻 {title}\n"
            f"⚙️ Конфиг: <b>{ram}GB / {ssd}GB{diag_str}</b>\n"
            f"💰 Цена:   <b>{price:,} ₽</b>{discount_str}\n"
            f"📉 Низ рынка: {market_low:,} ₽\n"
            f"🤝 Твой выкуп: <b>{buyout:,} ₽</b>\n"
            f"🔗 <a href='{url}'>Открыть на Avito</a>"
        ).replace(',', ' ')  # русский формат тысяч

        try:
            requests.post(
                TELEGRAM_URL,
                json={"text": text, "parse_mode": "HTML"},
                timeout=10,
                proxies=None  # Telegram через прямое соединение
            )
            logger.info(f"✅ Уведомление отправлено: {price} руб. | {title[:50]}")
        except Exception as e:
            logger.error(f"❌ Ошибка Telegram: {e}")

    # ─── Основной цикл сканирования ───────────────────────────────────────────
    def run(self):
        if not SCAN_URL:
            logger.error("❌ SCAN_URL не задан")
            return

        logger.info("🎬 Запуск сканирования...")

        resp = self.get_with_retry(SCAN_URL)
        if not resp:
            logger.error("❌ Не удалось получить SCAN_URL")
            return

        soup  = BeautifulSoup(resp.text, 'lxml')
        items = soup.select('[data-marker="item"]')
        logger.info(f"🔎 Найдено объявлений: {len(items)}")

        found_matches  = 0
        seen_this_run  = set()

        for item in items:
            try:
                # ── Базовые данные из превью ──────────────────────────────────
                link_tag = item.select_one('[data-marker="item-title"]')
                if not link_tag:
                    continue

                raw_url = urljoin("https://www.avito.ru", link_tag['href'])
                url     = clean_url(raw_url)

                # Пропускаем дубли
                if url in self.seen or url in seen_this_run:
                    continue

                raw_title   = link_tag.get('title', '')
                snippet_tag = item.select_one('[data-marker="item-description"]')
                snippet     = snippet_tag.get_text().lower() if snippet_tag else ""

                full_preview = (raw_title + ' ' + snippet).lower()

                # ── Мгновенный отсев мусора ───────────────────────────────────
                if any(w in full_preview for w in BAD_KEYWORDS):
                    self.seen.add(url)
                    continue

                # ── Цена ──────────────────────────────────────────────────────
                price_tag = item.select_one('[itemprop="price"]')
                if not price_tag:
                    continue
                price = int(price_tag['content'])
                if price < 15000:
                    continue

                # ── Бейдж "ниже рыночной" от Авито ───────────────────────────
                is_avito_low = any(
                    x in item.get_text().lower()
                    for x in ["ниже рыночной", "цена ниже", "хорошая цена"]
                )

                # ── FIX: срочность проверяем в превью — без захода в объявление
                is_urgent_preview = any(w in full_preview for w in URGENT_KEYWORDS)

                # ── Быстрый матчинг по превью ─────────────────────────────────
                # Если deep_analyze ещё не вызывался, specs пустой
                preview_ram, preview_ssd = extract_specs(full_preview)
                preview_match = self.match_to_db(raw_title, preview_ram, preview_ssd, {})

                if not preview_match:
                    # Модель не в нашей базе — пропускаем
                    self.seen.add(url)
                    continue

                market_low = preview_match['min_price']
                buyout     = preview_match['buyout_price']

                # ── Решение: заходить в объявление? ──────────────────────────
                price_ok = price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                should_deep = price_ok or is_avito_low or is_urgent_preview

                if not should_deep:
                    # Цена высокая, нет срочности — не тратим запрос
                    self.seen.add(url)
                    continue

                # ── FIX: deep_analyze вызывается РОВНО ОДИН РАЗ ──────────────
                time.sleep(random.uniform(2, 4))
                analysis = self.deep_analyze(raw_url)

                cycles    = analysis["cycles"]
                is_urgent = analysis["is_urgent"] or is_urgent_preview
                specs     = analysis["specs"]

                # Уточняем матчинг с точными характеристиками из страницы
                final_match = self.match_to_db(raw_title, preview_ram, preview_ssd, specs)
                if not final_match:
                    self.seen.add(url)
                    continue

                market_low = final_match['min_price']
                buyout     = final_match['buyout_price']
                final_ram  = specs.get('ram', preview_ram)
                final_ssd  = specs.get('ssd', preview_ssd)
                diagonal   = specs.get('diagonal')

                # ── Финальное решение об отправке ─────────────────────────────
                price_ok_final = price <= int(market_low * PRICE_THRESHOLD_FACTOR)
                should_notify  = price_ok_final or is_avito_low or is_urgent

                if should_notify:
                    self.notify(
                        raw_title, price, market_low, buyout,
                        final_ram, final_ssd, url,
                        cycles, is_urgent, is_avito_low,
                        diagonal=diagonal
                    )
                    found_matches += 1

                # Помечаем как просмотренное в любом случае
                self.seen.add(url)
                seen_this_run.add(url)

            except Exception as e:
                logger.error(f"Ошибка обработки объявления: {e}")
                continue

        # ── Сохранение истории ────────────────────────────────────────────────
        SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SEEN_FILE, 'w', encoding='utf-8') as f:
            # Храним последние 5000 URL
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "seen_urls": list(self.seen)[-5000:]
            }, f)

        logger.info(f"🏁 Сканирование завершено. Найдено совпадений: {found_matches}")


if __name__ == "__main__":
    AvitoScanner().run()
