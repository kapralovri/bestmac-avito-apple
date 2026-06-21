#!/usr/bin/env python3
"""
Монитор Telegram-чатов: read-only поиск продавцов Mac в целевых чатах
(scripts/tg-leads/target-chats.txt) → лид в очередь бота-охотника
(negotiation-queue.json), который ты уже видишь с кнопкой «▶️ Веду торг».

Только ЧТЕНИЕ публичных чатов (низкий риск бана). Авто-рассылок нет: ты сам
пишешь продавцу, открыв ссылку на сообщение.

Ядро (detect_listing/build_lead/extract_price) — чистое, тестируется офлайн.
Telethon подключается только в режиме запуска (нужен user-аккаунт + сессия).

Запуск (после разовой авторизации, см. login.py):
  TG_API_ID=... TG_API_HASH=... python3 scripts/tg-leads/monitor.py
"""
from __future__ import annotations

import os
import re
import sys
import json
import time
import hashlib
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.classifier import classify
from common.condition import analyze_condition
from common.config import (
    JUNK_KEYWORDS, MIN_PRICE, MAX_PRICE, MIN_YEARS, EXCLUDE_INTEL_FAMILIES,
    BUYOUT_FACTOR, BATTERY_HARD, BATTERY_SOFT, CYCLES_HARD, CYCLES_SOFT,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TgMonitor")

QUEUE_FILE   = Path(os.environ.get('NEGOTIATION_QUEUE_PATH', 'public/data/negotiation-queue.json'))
PRICES_FILE  = Path(os.environ.get('PRICES_FILE_PATH', 'public/data/avito-prices.json'))
CHATS_FILE   = Path(os.environ.get('TG_CHATS_PATH', 'scripts/tg-leads/target-chats.txt'))
SESSION      = os.environ.get('TG_SESSION', 'bestmac')

# Намерение «продаю» / «куплю»
_SELL = ['прода', 'отда', 'продаю', 'продам', 'срочно прода']
_BUY  = ['куплю', 'ищу', 'в поиске', 'приму в дар', 'помогите найти', 'нужен macbook', 'нужен мак']


def live_key(c):
    return (c.family, c.chip_gen, c.chip_tier, c.screen, c.ram, c.ssd)


def extract_price(text: str):
    """Извлекает цену (только с денежным маркером — безопаснее, без ложных из 16/512)."""
    t = (text or '').lower().replace(' ', ' ').replace(' ', ' ')
    m = re.search(r'\b(\d{2,3})\s*к(?:\b|руб|р\b)', t)          # «85к»
    if m:
        v = int(m.group(1)) * 1000
        return v if MIN_PRICE <= v <= MAX_PRICE else None
    for m in re.finditer(r'(\d[\d \.]{2,}\d)\s*(?:р\b|₽|руб|т\.?р|тыс|rub)', t):
        v = _to_int(m.group(1))
        if v and MIN_PRICE <= v <= MAX_PRICE:
            return v
    m = re.search(r'цен[аы]\D{0,6}(\d[\d \.]{2,}\d)', t)        # «цена 85 000»
    if m:
        v = _to_int(m.group(1))
        if v and MIN_PRICE <= v <= MAX_PRICE:
            return v
    return None


def _to_int(s):
    try:
        return int(re.sub(r'[ .]', '', s))
    except (ValueError, TypeError):
        return None


def detect_listing(text: str):
    """Это пост «продаю Mac»? Возвращает (config, price, condition) или None."""
    low = (text or '').lower()
    if not any(s in low for s in _SELL):
        return None
    if any(b in low for b in _BUY) and not any(s in low for s in _SELL[:2]):
        return None
    if any(w in low for w in JUNK_KEYWORDS):
        return None
    cfg = classify(text)
    if not cfg.is_valid:
        return None
    if cfg.family in EXCLUDE_INTEL_FAMILIES and cfg.chip_gen == 'Intel':
        return None
    if cfg.year and cfg.year < MIN_YEARS.get(cfg.family, 2020):
        return None
    cond = analyze_condition(text, battery_hard=BATTERY_HARD, battery_soft=BATTERY_SOFT,
                             cycles_hard=CYCLES_HARD, cycles_soft=CYCLES_SOFT)
    if cond.is_reject:
        return None
    price = extract_price(text)
    if price is None:
        return None
    return cfg, price, cond


def load_prices_index(path=PRICES_FILE):
    """{live_key: stat} из avito-prices.json (для медианы/выкупа)."""
    idx = {}
    p = Path(path)
    if not p.exists():
        return idx
    try:
        for s in json.loads(p.read_text(encoding='utf-8')).get('stats', []):
            try:
                c = classify(f"{s['model_name']} {s.get('processor', '')}",
                             {'ram': int(s.get('ram', 0)), 'ssd': int(s.get('ssd', 0))})
                if c.is_valid:
                    idx[live_key(c)] = s
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"prices index: {e}")
    return idx


def build_lead(cfg, price, msg_url, location, idx, title, now_iso):
    """Лид в формате очереди бота-охотника (source=tg)."""
    stat = idx.get(live_key(cfg))
    median = int(stat['median_price']) if stat and stat.get('median_price') else 0
    if stat and stat.get('buyout_price'):
        buyout = int(stat['buyout_price'])
    elif median:
        buyout = int(median * BUYOUT_FACTOR)
    else:
        buyout = int(price * 0.85)
    target = max(1, int(min(price, buyout) * 0.95))
    lid = hashlib.sha1(msg_url.encode('utf-8')).hexdigest()[:10]
    return {
        "id": lid,
        "title": (title or f"{cfg.model_name} {cfg.ram}/{cfg.ssd}")[:80],
        "asking": int(price),
        "target": target,
        "walk_away": buyout,
        "location": location or "Telegram",
        "url": msg_url,
        "source": "tg",
        "motivation_score": 0,
        "motivation_label": "📲 из Telegram-чата",
        "motivation_signals": ["продаёт в чате-барахолке"],
        "history": [],
        "ts": now_iso,
    }


def enqueue(lead):
    queue = []
    if QUEUE_FILE.exists():
        try:
            queue = json.loads(QUEUE_FILE.read_text(encoding='utf-8')) or []
        except Exception:
            queue = []
    if any(x.get("id") == lead["id"] for x in queue):
        return False
    queue.append(lead)
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_FILE.write_text(json.dumps(queue[-200:], ensure_ascii=False, indent=2), encoding='utf-8')
    return True


def load_chats(path=CHATS_FILE):
    """@usernames из target-chats.txt (строки-комментарии и метод игнорируем)."""
    out = []
    p = Path(path)
    if not p.exists():
        return out
    for line in p.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line.startswith('@'):
            out.append(line.split()[0])
    return sorted(set(out))


def run():
    api_id = os.environ.get('TG_API_ID')
    api_hash = os.environ.get('TG_API_HASH')
    if not (api_id and api_hash):
        print("❌ TG_API_ID / TG_API_HASH не заданы (см. my.telegram.org)"); sys.exit(1)
    try:
        from telethon import TelegramClient, events
    except ImportError:
        print("❌ pip install telethon"); sys.exit(1)

    from datetime import datetime
    chats = load_chats()
    idx = load_prices_index()
    logger.info(f"🛰 Монитор: {len(chats)} чатов, индекс цен {len(idx)} конфигов")

    client = TelegramClient(SESSION, int(api_id), api_hash)

    @client.on(events.NewMessage(chats=chats))
    async def handler(event):
        try:
            text = event.message.message or ''
            hit = detect_listing(text)
            if not hit:
                return
            cfg, price, _cond = hit
            uname = getattr(event.chat, 'username', None)
            msg_url = f"https://t.me/{uname}/{event.id}" if uname else f"tg://msg?id={event.id}"
            lead = build_lead(cfg, price, msg_url, "Telegram", idx,
                              text[:80], datetime.now().isoformat(timespec='seconds'))
            if enqueue(lead):
                logger.info(f"🧲 TG-лид: {lead['title'][:40]} | {price}₽ | {msg_url}")
        except Exception as e:
            logger.error(f"handler: {e}")

    with client:
        logger.info("🛰 Монитор чатов запущен (read-only)")
        client.run_until_disconnected()


if __name__ == "__main__":
    run()
