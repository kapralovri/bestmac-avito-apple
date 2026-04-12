#!/usr/bin/env python3
"""
Синхронизация конфигураций из Google Sheets в avito-urls.json

Загружает данные из публичной Google таблицы и сохраняет в формате JSON
для использования парсером Авито.

Использование:
  python sync-google-sheet.py
"""

import json
import csv
import io
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError

# ID таблицы
SHEET_ID = "1hq9JqsWLyGVFVtzfWhZbwylSEkWLpSptWBirsh4zsy0"
SHEET_GID = "2097102067"

# URL для экспорта в CSV
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={SHEET_GID}"

# Путь к выходному файлу
SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "../public/data/avito-urls.json"


def fetch_sheet_data() -> list[dict]:
    """Загрузить данные из Google Sheets"""
    print(f"📥 Загрузка данных из Google Sheets...")
    print(f"   URL: {CSV_URL}")
    
    try:
        with urlopen(CSV_URL, timeout=30) as response:
            content = response.read().decode('utf-8')
    except URLError as e:
        print(f"❌ Ошибка загрузки: {e}")
        return []
    
    # Парсим CSV
    reader = csv.DictReader(io.StringIO(content))
    entries = []
    
    for row in reader:
        # Маппинг колонок из таблицы (схема: Семейство, Модель, URL для поиска, Цена выкупа)
        family = row.get('Семейство', '').strip()
        model_name = row.get('Модель', '').strip()
        url = row.get('URL для поиска', '').strip()
        buyout_str = row.get('Цена выкупа', '').strip()

        # Пропускаем пустые строки
        if not model_name or not url:
            continue

        try:
            buyout_price = int(buyout_str) if buyout_str else None
        except ValueError:
            buyout_price = None

        entries.append({
            "model_name": model_name,
            "family": family,
            "url": url,
            **({"buyout_price": buyout_price} if buyout_price is not None else {}),
        })
    
    # Дедупликация по model_name (оставляем первое вхождение)
    seen: set = set()
    deduped = []
    for e in entries:
        if e['model_name'] not in seen:
            seen.add(e['model_name'])
            deduped.append(e)
        else:
            print(f"⚠️ Дубликат пропущен: {e['model_name']}")
    return deduped


def save_config(entries: list[dict]):
    """Сохранить конфигурацию в JSON"""
    config = {
        "description": "Таблица ссылок для парсинга Авито. Синхронизируется из Google Sheets.",
        "updated_at": datetime.now().strftime("%Y-%m-%d"),
        "source": f"https://docs.google.com/spreadsheets/d/{SHEET_ID}",
        "entries": entries
    }
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Сохранено в: {OUTPUT_FILE}")


def main():
    print("=" * 60)
    print("🔄 Синхронизация конфигураций из Google Sheets")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    entries = fetch_sheet_data()
    
    if not entries:
        print("\n❌ Нет данных для сохранения!")
        return
    
    # Статистика
    unique_models = set(e["model_name"] for e in entries)
    unique_families = set(e.get("family", "—") for e in entries)
    print(f"\n✅ Загружено {len(entries)} моделей")
    print(f"   🏷️ Уникальных моделей: {len(unique_models)}")
    print(f"   📂 Семейства: {', '.join(sorted(unique_families))}")
    
    save_config(entries)
    
    print("\n" + "=" * 60)
    print("✅ Синхронизация завершена!")
    print("=" * 60)


if __name__ == "__main__":
    main()
