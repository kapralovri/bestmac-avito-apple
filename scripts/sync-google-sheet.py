#!/usr/bin/env python3
"""
Синхронизация конфигураций парсера из Google Sheets.

Читает 4 вкладки (MacBook / iMac / Mac mini / Mac Studio) из таблицы
и сохраняет в public/data/parser-config.json в формате:

{
  "tabs": {
    "MacBook": {
      "gid": 0,
      "mode": "direct",       # все колонки заполнены, парсим конкретный конфиг
      "entries": [{model, processor, ram, ssd, url, buyout_price}, ...]
    },
    "iMac" / "Mac mini" / "Mac Studio": {
      "gid": ...,
      "mode": "discovery",    # пустые поля → парсер сам определяет конфиг из объявлений
      "entries": [{model, processor?, ram?, ssd?, url}, ...]
    }
  }
}
"""

import json
import csv
import io
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError

SHEET_ID = "1MTW8WUV096o6mHDB0ZqTyBHTw5SnLVW5FEgpG2o5NUc"

TABS = {
    "MacBook":    {"gid": 0,          "mode": "direct"},
    "iMac":       {"gid": 985623143,  "mode": "discovery"},
    "Mac mini":   {"gid": 1600731856, "mode": "discovery"},
    "Mac Studio": {"gid": 871012551,  "mode": "discovery"},
}

SCRIPT_DIR  = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "../public/data/parser-config.json"


def fetch_tab(gid: int) -> str:
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    with urlopen(url, timeout=30) as resp:
        return resp.read().decode("utf-8")


def parse_int(value: str) -> int:
    value = (value or "").strip()
    if not value:
        return 0
    try:
        return int(value)
    except ValueError:
        return 0


def load_tab(name: str, meta: dict) -> dict:
    print(f"\n📥 Вкладка '{name}' (gid={meta['gid']}, mode={meta['mode']})")
    try:
        content = fetch_tab(meta["gid"])
    except URLError as e:
        print(f"   ❌ {e}")
        return {**meta, "entries": []}

    reader = csv.DictReader(io.StringIO(content))
    entries: list[dict] = []
    seen: set = set()

    for row in reader:
        model = (row.get("Модель") or "").strip()
        url   = (row.get("URL для поиска") or "").strip()
        if not model or not url:
            continue

        processor = (row.get("Процессор") or "").strip()
        ram       = parse_int(row.get("RAM", ""))
        ssd       = parse_int(row.get("SSD", ""))
        buyout    = parse_int(row.get("Цена выкупа", ""))

        key = (model, processor, ram, ssd, url)
        if key in seen:
            print(f"   ⚠️ Дубликат: {model} {processor} {ram}/{ssd}")
            continue
        seen.add(key)

        entry = {"model": model, "url": url}
        if processor:
            entry["processor"] = processor
        if ram:
            entry["ram"] = ram
        if ssd:
            entry["ssd"] = ssd
        if buyout:
            entry["buyout_price"] = buyout

        entries.append(entry)

    print(f"   ✅ {len(entries)} строк")
    return {"gid": meta["gid"], "mode": meta["mode"], "entries": entries}


def main():
    print("=" * 60)
    print("🔄 Синхронизация конфигураций парсера")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    tabs_data = {name: load_tab(name, meta) for name, meta in TABS.items()}
    total_entries = sum(len(t["entries"]) for t in tabs_data.values())

    if total_entries == 0:
        print("\n❌ Нет данных для сохранения")
        return

    config = {
        "description": "Конфигурация парсера Avito (4 вкладки Google Sheets).",
        "updated_at":  datetime.now().strftime("%Y-%m-%d"),
        "source":      f"https://docs.google.com/spreadsheets/d/{SHEET_ID}",
        "tabs":        tabs_data,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"💾 Записано: {OUTPUT_FILE}")
    print(f"📊 Всего строк: {total_entries}")
    for name, t in tabs_data.items():
        print(f"   • {name}: {len(t['entries'])}")
    print("=" * 60)


if __name__ == "__main__":
    main()
