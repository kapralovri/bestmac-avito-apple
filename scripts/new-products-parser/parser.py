#!/usr/bin/env python3
"""
Parser for @BigSaleApple Telegram channel.
Fetches latest price posts for 5 categories, adds markup, saves to JSON.

Categories: iMac, MacBook Air, MacBook Pro, iPhone 17/Air, iPhone 17 Pro
"""

import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

CHANNEL = "BigSaleApple"
MARKUP = 5000       # ₽ added to each price
MIN_PRICE = 10000   # filter noise / header lines

# Path relative to repo root, works from any working directory
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_FILE = os.path.join(REPO_ROOT, "public", "data", "new-products.json")

# Detection order matters: more specific first
CATEGORY_DETECT = [
    ('iphone_17_pro', [r'iphone\s+17\s+pro']),
    ('iphone_17',     [r'iphone\s+17\s*/\s*air', r'iphone\s+17\b']),
    ('macbook_pro',   [r'macbook\s+pro']),
    ('macbook_air',   [r'macbook\s+air']),
    ('imac',          [r'\bimac\b']),
]

CATEGORY_DISPLAY = {
    'imac':          'iMac',
    'macbook_air':   'MacBook Air',
    'macbook_pro':   'MacBook Pro',
    'iphone_17':     'iPhone 17 / Air',
    'iphone_17_pro': 'iPhone 17 Pro',
}

TARGET_CATEGORIES = set(CATEGORY_DISPLAY.keys())


def fetch_channel_page(before_id=None):
    url = f"https://t.me/s/{CHANNEL}"
    if before_id:
        url += f"?before={before_id}"
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def detect_category(text):
    preview = text[:400].lower()
    for cat, patterns in CATEGORY_DETECT:
        for pat in patterns:
            if re.search(pat, preview):
                return cat
    return None


def parse_price_line(line):
    """
    Parse one text line. Returns dict or None.

    Supported price formats:
      MacBook Air 13 M4 16GB/512GB Sky Blue-108.500🇮🇳🇺🇸
      [MWUF3] iMac M4 (8/8/16/256) Blue🇷🇺 — 145.500
      16 Pro 128 Desert -77.700🇨🇳 актив
    Price separator: -, –, —
    Price value: Russian thousands format  NN.NNN or NNN.NNN
    """
    # Match price: dash/dash variant then NUMBER.NUMBER(NUMBER)
    price_match = re.search(r'[-–—]\s*(\d{2,3}(?:[.,]\d{3})+)\b', line)
    if not price_match:
        return None

    # Convert "84.000" → 84000, "145.500" → 145500
    price_raw = price_match.group(1).replace('.', '').replace(',', '')
    try:
        price = int(price_raw)
    except ValueError:
        return None

    if price < MIN_PRICE:
        return None

    # Flags: consecutive regional indicator pairs (country emoji)
    flags = re.findall(r'[\U0001F1E0-\U0001F1FF]{2}', line)

    # Activated badge
    is_activated = bool(re.search(r'\bактив', line.lower()))

    # Name: text before the price dash
    name_part = line[:price_match.start()].strip()

    # Strip leading article code: [MWUF3] or Z1H8000GS
    name_part = re.sub(r'^\[?[A-Z0-9]{5,12}\]?\s*', '', name_part)

    # Strip trailing flags and "актив" from name
    name_part = re.sub(r'[\U0001F1E0-\U0001F1FF\U0001F300-\U0001FFFF\U00002600-\U000027BF]+', '', name_part)
    name_part = re.sub(r'\bактив\b', '', name_part, flags=re.I)
    name_part = name_part.rstrip('*').strip()

    if not name_part or len(name_part) < 4:
        return None

    return {
        'name': name_part,
        'price': price + MARKUP,
        'source_price': price,
        'flags': flags,
        'is_activated': is_activated,
    }


def parse_message(message_div):
    """Parse a Telegram message div. Returns (category, [items])."""
    text_div = message_div.find('div', class_='tgme_widget_message_text')
    if not text_div:
        return None, []

    full_text = text_div.get_text(separator='\n')
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]

    category = detect_category(full_text)
    if not category:
        return None, []

    items = []
    in_uzenka = False

    for line in lines:
        low = line.lower()

        # Track уценка (discounted/opened box) section — skip it
        if re.search(r'уценк', low):
            in_uzenka = True
            continue

        # New section header resets уценка flag
        if in_uzenka:
            if re.search(r'\b(macbook|iphone|imac|ipad|airpod|magic)\b', low) and len(line) < 60:
                in_uzenka = False
            continue

        result = parse_price_line(line)
        if result:
            result['category'] = category
            result['category_display'] = CATEGORY_DISPLAY[category]
            items.append(result)

    return category, items


def get_message_id(msg):
    """Extract numeric message ID from data-post attribute."""
    el = msg.find(attrs={'data-post': True})
    if el:
        m = re.search(r'/(\d+)$', el.get('data-post', ''))
        if m:
            return int(m.group(1))
    return None


def run():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching @{CHANNEL}...")

    found = {}      # category → items
    before_id = None
    max_pages = 5

    for page_num in range(max_pages):
        if len(found) == len(TARGET_CATEGORIES):
            break

        try:
            html = fetch_channel_page(before_id)
        except Exception as e:
            print(f"  ! Fetch error (page {page_num + 1}): {e}")
            break

        soup = BeautifulSoup(html, 'html.parser')
        messages = soup.find_all('div', class_='tgme_widget_message_wrap')

        if not messages:
            print(f"  ! No messages on page {page_num + 1}")
            break

        # Oldest message ID for next pagination call
        oldest_id = None
        for msg in messages:
            mid = get_message_id(msg)
            if mid and (oldest_id is None or mid < oldest_id):
                oldest_id = mid

        # Process newest first (messages are oldest→newest in HTML)
        for msg in reversed(messages):
            category, items = parse_message(msg)
            if category and category not in found and items:
                found[category] = items
                print(f"  ✓ {CATEGORY_DISPLAY[category]}: {len(items)} позиций")

        before_id = oldest_id

        if page_num < max_pages - 1:
            time.sleep(1.5)

    # Flatten all items
    all_items = []
    for cat in ['imac', 'macbook_air', 'macbook_pro', 'iphone_17', 'iphone_17_pro']:
        all_items.extend(found.get(cat, []))

    output = {
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'categories_found': list(found.keys()),
        'items': all_items,
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nИтого: {len(all_items)} позиций → {OUTPUT_FILE}")
    for cat, items in found.items():
        print(f"  {CATEGORY_DISPLAY[cat]}: {len(items)}")

    missing = TARGET_CATEGORIES - set(found.keys())
    if missing:
        print(f"  ! Не найдены: {', '.join(CATEGORY_DISPLAY[c] for c in missing)}")


if __name__ == '__main__':
    run()
