#!/usr/bin/env python3
"""
Синхронизация списка моделей из Google Sheets в models-config.json

Загружает вкладку «Модели» (gid=2097102067) публичной Google таблицы
и сохраняет список моделей (family, model_name, url) для Parser v3.

Parser v3 сам определит Процессор/RAM/SSD через классификатор,
поэтому в таблице их указывать не нужно.

Использование:
  python sync-google-sheet.py
"""

import json
import csv
import io
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ID таблицы и вкладка «Модели»
SHEET_ID = "1hq9JqsWLyGVFVtzfWhZbwylSEkWLpSptWBirsh4zsy0"
SHEET_GID = "2097102067"

# URL для экспорта в CSV
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={SHEET_GID}"

# Путь к выходному файлу
SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "../public/data/models-config.json"


# Нормализация названий семейств (в таблице встречаются "Macbook", "imac", и т.д.)
FAMILY_NORMALIZATION = {
    "macbook": "MacBook",
    "imac": "iMac",
    "mac mini": "Mac mini",
    "mac studio": "Mac Studio",
    "mac pro": "Mac Pro",
}


def normalize_family(raw: str) -> str:
    """Приводит название семейства к каноничному виду."""
    key = raw.strip().lower()
    return FAMILY_NORMALIZATION.get(key, raw.strip())


def fetch_sheet_data() -> list[dict]:
    """Загрузить данные из Google Sheets (вкладка «Модели»)."""
    print("📥 Загрузка данных из Google Sheets (вкладка «Модели»)...")
    print(f"   URL: {CSV_URL}")

    try:
        req = Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as response:
            content = response.read().decode("utf-8")
    except (URLError, HTTPError) as e:
        print(f"❌ Ошибка загрузки: {e}")
        return []

    reader = csv.DictReader(io.StringIO(content))
    entries: list[dict] = []
    seen_keys: set[tuple[str, str]] = set()

    for row in reader:
        family_raw = (row.get("Семейство") or "").strip()
        model_name = (row.get("Модель") or "").strip()
        url = (row.get("URL для поиска") or "").strip()

        if not model_name or not url:
            continue

        family = normalize_family(family_raw) if family_raw else ""

        key = (family, model_name)
        if key in seen_keys:
            print(f"⚠️ Дубль модели, пропуск: {model_name}")
            continue
        seen_keys.add(key)

        entries.append(
            {
                "family": family,
                "model_name": model_name,
                "url": url,
            }
        )

    return entries


def save_config(entries: list[dict]) -> None:
    """Сохранить список моделей в JSON."""
    config = {
        "description": (
            "Список моделей для Parser v3. Синхронизируется из Google Sheets "
            "(вкладка «Модели»). Процессор/RAM/SSD определяются классификатором."
        ),
        "updated_at": datetime.now().strftime("%Y-%m-%d"),
        "source": f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?gid={SHEET_GID}",
        "entries": entries,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"💾 Сохранено в: {OUTPUT_FILE}")


def main() -> None:
    print("=" * 60)
    print("🔄 Синхронизация моделей из Google Sheets")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    entries = fetch_sheet_data()

    if not entries:
        print("\n❌ Нет данных для сохранения!")
        return

    # Статистика по семействам
    by_family: dict[str, int] = {}
    for e in entries:
        by_family[e["family"] or "?"] = by_family.get(e["family"] or "?", 0) + 1

    print(f"\n✅ Загружено {len(entries)} моделей")
    for family, count in sorted(by_family.items()):
        print(f"   🏷️ {family}: {count}")

    save_config(entries)

    print("\n" + "=" * 60)
    print("✅ Синхронизация завершена!")
    print("=" * 60)


if __name__ == "__main__":
    main()
