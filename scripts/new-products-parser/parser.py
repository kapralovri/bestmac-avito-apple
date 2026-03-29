#!/usr/bin/env python3
"""
Parser for @BigSaleApple Telegram channel.
Structured per-category parsing: iPhone → model/storage/color, MacBook → chip/RAM/SSD/color, iMac.
"""

import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

CHANNEL = "BigSaleApple"
MARKUP = 5000
MIN_PRICE = 10_000

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_FILE = os.path.join(REPO_ROOT, "public", "data", "new-products.json")

# Detection patterns — more specific first
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


# ─── Price extraction ──────────────────────────────────────────────────────────

def extract_price(line: str):
    """
    Extract price from string. Format: -NN.NNN or — NN.NNN (Russian thousands).
    Returns int or None.
    """
    m = re.search(r'[-–—]\s*(\d{2,3}(?:[.,]\d{3})+)\b', line)
    if not m:
        return None
    raw = m.group(1).replace('.', '').replace(',', '')
    try:
        price = int(raw)
        return price if price >= MIN_PRICE else None
    except ValueError:
        return None


def extract_flags(line: str):
    return re.findall(r'[\U0001F1E0-\U0001F1FF]{2}', line)


# ─── iPhone parser ─────────────────────────────────────────────────────────────

# Matches: "17 Pro 256 Silver", "17 Pro Max 512 Black", "17 Air 128 Desert"
IPHONE_17_RE = re.compile(
    r'^17\s+(Pro Max|Pro|Air)\s+(\d+)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)',
    re.IGNORECASE,
)


def parse_iphone_line(line: str, expected_category: str):
    """Parse one iPhone 17 price line. Returns structured dict or None."""
    stripped = line.strip()

    m = IPHONE_17_RE.match(stripped)
    if not m:
        return None

    variant = m.group(1).strip()        # "Pro", "Pro Max", "Air"
    storage_gb = int(m.group(2))        # 128 / 256 / 512 / 1024
    color = m.group(3).strip().title()  # "Desert", "Black", "Sky Blue"

    # Route to correct category
    if 'pro' in variant.lower():
        category = 'iphone_17_pro'
        model = f"iPhone 17 {variant}"
    else:
        category = 'iphone_17'
        model = "iPhone 17 Air" if variant.lower() == 'air' else "iPhone 17"

    # Only keep if matches expected category
    if category != expected_category:
        return None

    price = extract_price(stripped)
    if not price:
        return None

    storage_str = f"{storage_gb}GB" if storage_gb < 900 else "1TB"
    flags = extract_flags(stripped)
    is_activated = bool(re.search(r'\bактив', stripped.lower()))

    return {
        'category': category,
        'category_display': CATEGORY_DISPLAY[category],
        'model': model,
        'storage': storage_str,
        'storage_gb': storage_gb,
        'color': color,
        'flags': flags,
        'is_activated': is_activated,
        'name': f"{model} {storage_str} {color}",
        'price': price + MARKUP,
        'source_price': price,
    }


# ─── MacBook parser ────────────────────────────────────────────────────────────

MACBOOK_LINE_RE = re.compile(r'^MacBook\s+(Air|Pro)', re.IGNORECASE)


def parse_macbook_line(line: str):
    """Parse MacBook Air/Pro price line. Returns structured dict or None."""
    stripped = line.strip()

    m = MACBOOK_LINE_RE.match(stripped)
    if not m:
        return None

    series = m.group(1).capitalize()  # "Air" / "Pro"
    price = extract_price(stripped)
    if not price:
        return None

    # Screen size
    screen_m = re.search(r'\b(13|14|15|16)\b', stripped)
    screen = screen_m.group(1) if screen_m else None

    # Year
    year_m = re.search(r'\b(202\d)\b', stripped)
    year = year_m.group(1) if year_m else None

    # Chip: M4, M4 Pro, M4 Max, M3, M2 etc.
    chip_m = re.search(r'\b(M\d(?:\s+(?:Pro|Max|Ultra))?)\b', stripped, re.IGNORECASE)
    chip = chip_m.group(1).upper() if chip_m else None

    # RAM + SSD
    ram, ssd = None, None

    # Format: (10CPU/8GPU/16GB/256GB) or (8/8/16/256)
    bracket_m = re.search(
        r'\((?:\d+CPU/\d+GPU/)?(?:\d+/\d+/)?(\d+)(?:GB)?/(\d+)(GB|TB)\)',
        stripped, re.IGNORECASE
    )
    if bracket_m:
        ram = int(bracket_m.group(1))
        ssd_val = int(bracket_m.group(2))
        ssd = ssd_val * 1024 if bracket_m.group(3).upper() == 'TB' else ssd_val
    else:
        # Format: 16/256Gb or 24/512GB
        slash_m = re.search(r'\b(\d+)/(\d+)\s*(Gb|GB|TB)\b', stripped, re.IGNORECASE)
        if slash_m:
            ram = int(slash_m.group(1))
            ssd_val = int(slash_m.group(2))
            unit = slash_m.group(3).upper()
            ssd = ssd_val * 1024 if unit == 'TB' else ssd_val

    # Color: last English word(s) before price separator
    before_price = re.split(r'[-–—]\s*\d{2,3}[.,]\d{3}', stripped)[0]
    # Strip trailing flags and symbols
    before_price = re.sub(r'[\U0001F300-\U0001FFFF\u2600-\u27BF*\s]+$', '', before_price).strip()
    color_m = re.search(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$', before_price)
    color = color_m.group(1) if color_m else None

    flags = extract_flags(stripped)
    is_activated = bool(re.search(r'\bактив', stripped.lower()))

    # Build display name
    parts = [f"MacBook {series}"]
    if screen:
        parts.append(f'{screen}"')
    if chip:
        parts.append(chip)
    if ram:
        parts.append(f"{ram}GB")
    if ssd:
        parts.append(f"{ssd // 1024}TB" if ssd >= 1024 else f"{ssd}GB")
    if color:
        parts.append(color)

    category = f'macbook_{series.lower()}'

    return {
        'category': category,
        'category_display': CATEGORY_DISPLAY[category],
        'model': f'MacBook {series}' + (f' {screen}"' if screen else ''),
        'chip': chip,
        'ram': f'{ram}GB' if ram else None,
        'ram_gb': ram,
        'ssd': f'{ssd // 1024}TB' if (ssd and ssd >= 1024) else (f'{ssd}GB' if ssd else None),
        'ssd_gb': ssd,
        'color': color,
        'flags': flags,
        'is_activated': is_activated,
        'name': ' '.join(parts),
        'price': price + MARKUP,
        'source_price': price,
    }


# ─── iMac parser ───────────────────────────────────────────────────────────────

IMAC_LINE_RE = re.compile(r'^(?:\[?[A-Z0-9]{5,12}\]?\s+)?iMac', re.IGNORECASE)


def parse_imac_line(line: str):
    """Parse iMac price line. Returns structured dict or None."""
    stripped = line.strip()

    if not IMAC_LINE_RE.match(stripped):
        return None

    price = extract_price(stripped)
    if not price:
        return None

    # Strip article code for clean name
    clean = re.sub(r'^\[?[A-Z0-9]{5,12}\]?\s*', '', stripped)

    chip_m = re.search(r'\b(M\d(?:\s+(?:Pro|Max|Ultra))?)\b', clean, re.IGNORECASE)
    chip = chip_m.group(1).upper() if chip_m else None

    # Config: (8/8/16/256) → last two = RAM/SSD
    ram, ssd = None, None
    config_m = re.search(r'\((?:\d+/\d+/)?(\d+)/(\d+)\)', clean)
    if config_m:
        ram = int(config_m.group(1))
        ssd = int(config_m.group(2))

    before_price = re.split(r'[-–—]\s*\d{2,3}[.,]\d{3}', clean)[0]
    before_price = re.sub(r'[\U0001F300-\U0001FFFF\u2600-\u27BF*\s]+$', '', before_price).strip()
    color_m = re.search(r'\b([A-Z][a-z]+)\s*$', before_price)
    color = color_m.group(1) if color_m else None

    flags = extract_flags(stripped)
    is_activated = bool(re.search(r'\bактив', stripped.lower()))

    parts = ['iMac']
    if chip:
        parts.append(chip)
    if ram:
        parts.append(f'{ram}GB')
    if ssd:
        parts.append(f'{ssd}GB SSD')
    if color:
        parts.append(color)

    return {
        'category': 'imac',
        'category_display': 'iMac',
        'model': 'iMac' + (f' {chip}' if chip else ''),
        'chip': chip,
        'ram': f'{ram}GB' if ram else None,
        'ram_gb': ram,
        'ssd': f'{ssd}GB' if ssd else None,
        'ssd_gb': ssd,
        'color': color,
        'flags': flags,
        'is_activated': is_activated,
        'name': ' '.join(parts),
        'price': price + MARKUP,
        'source_price': price,
    }


# ─── Message parsing ───────────────────────────────────────────────────────────

def detect_category(text: str):
    preview = text[:400].lower()
    for cat, patterns in CATEGORY_DETECT:
        for pat in patterns:
            if re.search(pat, preview):
                return cat
    return None


def parse_message(message_div):
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

        if re.search(r'уценк', low):
            in_uzenka = True
            continue

        if in_uzenka:
            # Reset уценка if new section header found
            if re.search(r'\b(macbook|iphone|imac|ipad|airpod|magic)\b', low) and len(line) < 60:
                in_uzenka = False
            continue

        result = None
        if category in ('iphone_17_pro', 'iphone_17'):
            result = parse_iphone_line(line, category)
        elif category in ('macbook_air', 'macbook_pro'):
            result = parse_macbook_line(line)
            # Re-route to correct sub-category
            if result and result['category'] != category:
                result = None
        elif category == 'imac':
            result = parse_imac_line(line)

        if result:
            items.append(result)

    return category, items


# ─── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_channel_page(before_id=None):
    url = f"https://t.me/s/{CHANNEL}"
    if before_id:
        url += f"?before={before_id}"
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def get_message_id(msg):
    el = msg.find(attrs={'data-post': True})
    if el:
        m = re.search(r'/(\d+)$', el.get('data-post', ''))
        if m:
            return int(m.group(1))
    return None


# ─── Main ──────────────────────────────────────────────────────────────────────

def run():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching @{CHANNEL}...")

    found = {}
    before_id = None
    max_pages = 8

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

        oldest_id = None
        for msg in messages:
            mid = get_message_id(msg)
            if mid and (oldest_id is None or mid < oldest_id):
                oldest_id = mid

        for msg in reversed(messages):
            category, items = parse_message(msg)
            if category and category not in found and items:
                found[category] = items
                print(f"  ✓ {CATEGORY_DISPLAY[category]}: {len(items)} позиций")

        before_id = oldest_id
        if page_num < max_pages - 1:
            time.sleep(1.5)

    # Flatten in fixed category order
    all_items = []
    for cat in ['imac', 'macbook_air', 'macbook_pro', 'iphone_17', 'iphone_17_pro']:
        all_items.extend(found.get(cat, []))

    # Deduplicate by (name, source_price)
    seen: set = set()
    deduped = []
    for item in all_items:
        key = (item['name'], item['source_price'])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    removed = len(all_items) - len(deduped)
    if removed:
        print(f"  → Удалено дублей: {removed}")
    all_items = deduped

    output = {
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'categories_found': list(found.keys()),
        'items': all_items,
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nИтого: {len(all_items)} позиций → {OUTPUT_FILE}")
    for cat in ['imac', 'macbook_air', 'macbook_pro', 'iphone_17', 'iphone_17_pro']:
        if cat in found:
            print(f"  {CATEGORY_DISPLAY[cat]}: {len(found[cat])}")

    missing = TARGET_CATEGORIES - set(found.keys())
    if missing:
        print(f"  ! Не найдены: {', '.join(CATEGORY_DISPLAY[c] for c in missing)}")


if __name__ == '__main__':
    run()
