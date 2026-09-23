# GST-77 · Идентичность строк базы цен — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** у каждой строки `avito-prices.json` — одна правильная идентичность конфигурации, одинаковая для всех писателей и читателей, а сама база — без дублей и вкладочных имён.

**Architecture:** новый чистый модуль `scripts/common/price_identity.py` задаёт идентичность строки (правило «самый конкретный непротиворечивый источник» из спеки), каноническое имя и выбор победителя при склейке. Писатели (парсер, синк) и читатели (сканер, синк) переходят на него. Разовая миграция `normalize_prices.py` приводит существующую базу к тому же виду; код и данные выкатываются одним мержем.

**Tech Stack:** Python 3.9+ (скрипты), Next.js 15 / TypeScript (редиректы сайта), офлайн-тесты в стиле проекта (`check()` + `python3 <файл>`).

**Spec:** [`docs/price-identity-GST-77.md`](price-identity-GST-77.md)

## Global Constraints

- Приоритет при склейке строк одной идентичности: ручной оверрайд → свежая (не старше 30 дней) с выборкой от 5 объявлений → самая большая выборка → самая новая.
- Сводки `0/0` (память или диск `0`) не трогаются: у них нет идентичности, их читает сайт (`src/lib/avito-prices.ts:184`).
- Имена MacBook по году («MacBook Pro 14 (2023)») не переименовываются. Строка MacBook меняет имя только на имя из таблицы парсера (вкладка `direct`) для той же идентичности.
- Миграция по умолчанию — сухой прогон; `--apply` только после ревью отчёта владельцем.
- Код и нормализованные данные выкатываются **одним** мержем.
- Локальный Python — 3.9: внутри выражений f-строк нельзя обратную косую черту и те же кавычки, что снаружи.
- Тесты — в стиле проекта: функция `check(name, cond)`, запуск `python3 <файл>`, код выхода 1 при провале.
- В рабочем дереве iCloud плодит копии с суффиксом « 2». Коммитить **только явно перечисленные пути**, никогда `git add -A`.
- Комментарии в коде — по-русски, объясняют «почему», с меткой `GST-77`.
- Коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Новый парсер на ненормализованной базе.** В файле уже лежат дубли одной идентичности; раньше словарь молча оставлял последнюю строку. Ожидание: склейка по правилу приоритета. Тест — Task 4, «победила свежая по правилу».
2. **Одно объявление на двух discovery-вкладках.** Mac Studio M4 Max виден и на вкладке «m1», и на «m4». Ожидание: считается один раз. Тест — Task 4.
3. **Строка с пустым процессором.** Ожидание: идентичность из имени, строка не теряется. Тест — Task 1.
4. **Неоднозначный ключ оверрайда.** Две старые строки с одним `имя|ram|ssd`, но разными чипами. Ожидание: ключ не трогается и попадает в отчёт, а не переезжает на случайную модель. Тест — Task 5.
5. **Intel.** Ожидание: процессор `Intel`, а не `Apple Intel`. Тест — Task 1.

---

### Task 1: Модуль идентичности

**Files:**
- Create: `scripts/common/price_identity.py`
- Test: `scripts/common/test_price_identity.py`

**Interfaces:**
- Consumes: `common.classifier.classify(title: str, specs: Optional[dict]) -> AppleConfig` (поля `family, screen, chip_gen, chip_tier, ram, ssd`, свойство `is_valid`).
- Produces:
  - `Key = Tuple[Optional[str], Optional[str], str, Optional[int], int, int]` — `(family, chip_gen, chip_tier, screen, ram, ssd)`, тот же кортеж, что `live_key` сканера;
  - `config_key(cfg) -> Key`;
  - `row_identity(row: dict) -> Optional[Key]`;
  - `chip_label(key) -> str`, `canonical_processor(key) -> str`, `synth_name(key) -> str`;
  - `build_catalog(parser_config: dict) -> dict` (Key → имя);
  - `canonicalize_row(row: dict, catalog: dict) -> dict`;
  - `age_days(updated_at, now: datetime) -> Optional[int]`;
  - `pick_winner(rows, now: datetime) -> dict`;
  - `model_to_slug(name: str) -> str`;
  - константы `DISCOVERY_FAMILIES`, `FRESH_DAYS = 30`, `MIN_SAMPLES = 5`.

- [ ] **Step 1: Написать падающий тест**

`scripts/common/test_price_identity.py`:

```python
#!/usr/bin/env python3
"""Офлайн-тесты идентичности строк базы цен (GST-77).

Запуск:  python3 scripts/common/test_price_identity.py
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
from common.price_identity import (  # noqa: E402
    row_identity, canonical_processor, synth_name, build_catalog,
    canonicalize_row, pick_winner, age_days, model_to_slug,
)

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


def row(name, proc, ram, ssd, **kw):
    return {"model_name": name, "processor": proc, "ram": ram, "ssd": ssd, **kw}


print("[1] Правило идентичности")
check("имя и процессор согласны",
      row_identity(row("MacBook Pro 14 (2023)", "Apple M2 Pro", 16, 1024))
      == ("MacBook Pro", "M2", "Pro", 14, 16, 1024))
check("поколение из процессора — в имени подпись вкладки",
      row_identity(row("Mac Studio m1", "Apple M4 Max", 64, 1024))
      == ("Mac Studio", "M4", "Max", None, 64, 1024))
check("уровень из процессора",
      row_identity(row("Mac Studio m2", "Apple M2 Ultra", 64, 1024))
      == ("Mac Studio", "M2", "Ultra", None, 64, 1024))
check("уровень из имени — синк потерял Pro",
      row_identity(row("Mac mini M4 Pro", "Apple M4", 24, 512))
      == ("Mac mini", "M4", "Pro", None, 24, 512))
check("оба называют разный уровень — берём процессор",
      row_identity(row("Mac Studio M2 Max", "Apple M2 Ultra", 64, 1024))
      == ("Mac Studio", "M2", "Ultra", None, 64, 1024))

print("\n[2] Сводки и неполные строки")
check("сводка 0/0 — не конфигурация",
      row_identity(row("MacBook Pro 14 (2023)", "", 0, 0)) is None)
check("пустой процессор — идентичность из имени, строка не теряется",
      row_identity(row("MacBook Air 13 (2020, M1)", "", 8, 256))
      == ("MacBook Air", "M1", "base", 13, 8, 256))

print("\n[3] Каноническая запись")
check("процессор с уровнем", canonical_processor(("Mac mini", "M4", "Pro", None, 24, 512)) == "Apple M4 Pro")
check("процессор базового чипа", canonical_processor(("MacBook Air", "M1", "base", 13, 8, 256)) == "Apple M1")
check("Intel — без «Apple»", canonical_processor(("iMac", "Intel", "base", 27, 8, 512)) == "Intel")
check("имя десктопа", synth_name(("Mac Studio", "M4", "Max", None, 64, 1024)) == "Mac Studio M4 Max")
check("имя с диагональю", synth_name(("iMac", "M3", "base", 24, 8, 256)) == "iMac 24 M3")

cat = build_catalog({"tabs": {
    "MacBook": {"mode": "direct", "entries": [
        {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 8, "ssd": 256}]},
    "Mac Studio": {"mode": "discovery", "entries": [{"model": "Mac Studio m1", "processor": "m1"}]},
}})
check("каталог берёт direct-вкладки",
      cat.get(("MacBook Air", "M1", "base", 13, 8, 256)) == "MacBook Air 13 (2020, M1)")
check("подписи discovery-вкладок в каталог не попадают", "Mac Studio m1" not in cat.values())

r = canonicalize_row(row("Mac Studio m1", "Apple M4 Max", 64, 1024, median_price=399990), cat)
check("десктоп: имя по реальной модели", r["model_name"] == "Mac Studio M4 Max")
check("десктоп: процессор с уровнем", r["processor"] == "Apple M4 Max")
check("прочие поля не тронуты", r["median_price"] == 399990)
r = canonicalize_row(row("MacBook Air 13 M1", "Apple M1", 8, 256), cat)
check("MacBook из каталога → имя каталога", r["model_name"] == "MacBook Air 13 (2020, M1)")
# Без диагонали — отдельная конфигурация: так же классифицируются живые объявления
# «MacBook Air M1», и сканеру нужна строка под их ключ.
r = canonicalize_row(row("MacBook Air M1", "Apple M1", 8, 256), cat)
check("Air без диагонали не сливается с каталожной", r["model_name"] == "MacBook Air M1")
r = canonicalize_row(row("MacBook Pro 14 M5 Pro", "Apple M5", 16, 1024), cat)
check("MacBook вне каталога: имя сохраняется", r["model_name"] == "MacBook Pro 14 M5 Pro")
check("…а уровень в процессоре восстанавливается", r["processor"] == "Apple M5 Pro")
agg = row("MacBook Pro 14 (2023)", "", 0, 0, samples_count=141)
check("сводка 0/0 не меняется", canonicalize_row(agg, cat) == agg)

print("\n[4] Победитель при склейке")
now = datetime(2026, 9, 23)
fresh = row("x", "Apple M1", 8, 256, samples_count=6, updated_at="2026-09-20 10:00", median_price=1)
big_old = row("x", "Apple M1", 8, 256, samples_count=40, updated_at="2026-05-01 10:00", median_price=2)
thin = row("x", "Apple M1", 8, 256, samples_count=3, updated_at="2026-09-22 10:00", median_price=3)
ov = row("x", "Apple M1", 8, 256, samples_count=1, updated_at="2026-01-01 10:00",
         median_price=4, manual_override=True)
a1 = row("x", "Apple M1", 8, 256, samples_count=10, updated_at="2026-04-01 10:00", median_price=5)
a2 = row("x", "Apple M1", 8, 256, samples_count=10, updated_at="2026-04-10 10:00", median_price=6)
check("свежая с выборкой бьёт большую старую", pick_winner([big_old, fresh], now)["median_price"] == 1)
check("без свежей надёжной — больше выборка", pick_winner([thin, big_old], now)["median_price"] == 2)
check("ручной оверрайд главнее всего", pick_winner([fresh, big_old, ov], now)["median_price"] == 4)
check("при равной выборке — новее", pick_winner([a1, a2], now)["median_price"] == 6)
check("дата в формате парсера", age_days("Thu Apr 23 16:02:18 2026", now) == 152)
check("нераспознанная дата — не свежая", age_days("вчера", now) is None)

print("\n[5] Адрес страницы /ceny — как modelToSlug на сайте")
check("MacBook", model_to_slug("MacBook Air 13 (2020, M1)") == "macbook-air-13-2020-m1")
check("подпись вкладки", model_to_slug("Mac Studio m1") == "mac-studio-m1")
check("каноническое имя десктопа", model_to_slug("Mac Studio M4 Max") == "mac-studio-m4-max")
check("MacBook по году", model_to_slug("MacBook Pro 14 (2023)") == "macbook-pro-14-2023")

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты идентичности прошли")
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 scripts/common/test_price_identity.py`
Expected: `ModuleNotFoundError: No module named 'common.price_identity'`

- [ ] **Step 3: Реализация**

`scripts/common/price_identity.py`:

```python
"""
Идентичность строк базы цен avito-prices.json (GST-77, docs/price-identity-GST-77.md).

Строка базы описывает конфигурацию, но поле model_name ненадёжно: парсер в режиме
discovery пишет туда подпись вкладки поиска («Mac Studio m1» при процессоре M4 Max),
а синк коллектора теряет уровень чипа в processor («Apple M4» у «Mac mini M4 Pro»).
Модуль даёт одну идентичность на строку и каноническую запись — ими пользуются
писатели (парсер, синк), читатели (сканер, синк) и разовая миграция.

Чистая логика: ни файлов, ни сети в сигнатурах.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Iterable, Optional, Tuple

from common.classifier import classify

# (family, chip_gen, chip_tier, screen, ram, ssd) — тот же кортеж, что live_key сканера.
Key = Tuple[Optional[str], Optional[str], str, Optional[int], int, int]

# Семейства, где парсер работает в режиме discovery и пишет в model_name подпись
# вкладки. Их имя всегда синтезируется из идентичности.
DISCOVERY_FAMILIES = frozenset({"Mac mini", "Mac Studio", "iMac"})

FRESH_DAYS = 30
MIN_SAMPLES = 5
_DATE_FORMATS = ("%Y-%m-%d %H:%M", "%a %b %d %H:%M:%S %Y")


def config_key(cfg) -> Key:
    """Ключ «такой же аппарат». Единственное определение: live_key сканера зовёт его."""
    return (cfg.family, cfg.chip_gen, cfg.chip_tier, cfg.screen, cfg.ram, cfg.ssd)


def row_identity(row: dict) -> Optional[Key]:
    """Конфигурация строки по правилу «самый конкретный непротиворечивый источник».

    Классификатор зовётся дважды: имя первым (a) и процессор первым (b). Поколение
    при конфликте берём из процессора (у строк парсера имя — подпись вкладки),
    уровень Pro/Max/Ultra — откуда он есть (у строк синка он живёт только в имени).
    Сводки с памятью или диском 0 — не конфигурации: у них идентичности нет.
    """
    ram, ssd = int(row.get("ram") or 0), int(row.get("ssd") or 0)
    if not ram or not ssd:
        return None
    name = row.get("model_name") or ""
    proc = row.get("processor") or ""
    specs = {"ram": ram, "ssd": ssd}
    a = classify(f"{name} {proc}", specs)
    b = classify(f"{proc} {name}", specs)
    if not a.is_valid and not b.is_valid:
        return None
    if not b.is_valid:
        return config_key(a)
    if not a.is_valid:
        return config_key(b)
    ka, kb = config_key(a), config_key(b)
    if ka == kb:
        return ka
    if a.chip_gen != b.chip_gen:
        return kb
    if a.chip_tier == "base":
        return kb
    if b.chip_tier == "base":
        return ka
    return kb


def chip_label(key: Key) -> str:
    gen, tier = key[1], key[2]
    return gen if tier == "base" else f"{gen} {tier}"


def canonical_processor(key: Key) -> str:
    """Процессор с уровнем чипа. Intel пишется как есть — «Apple Intel» не бывает."""
    return "Intel" if key[1] == "Intel" else f"Apple {chip_label(key)}"


def synth_name(key: Key) -> str:
    family, screen = key[0], key[3]
    return f"{family} {screen} {chip_label(key)}" if screen else f"{family} {chip_label(key)}"


def build_catalog(parser_config: dict) -> dict:
    """Идентичность → имя модели из таблицы парсера.

    Только вкладки в режиме direct: там model — настоящее название модели.
    У discovery-вкладок model — подпись поиска («mac mini m1»), каноном её делать нельзя.
    """
    catalog: dict = {}
    for tab in (parser_config.get("tabs") or {}).values():
        if tab.get("mode") != "direct":
            continue
        for e in tab.get("entries") or []:
            key = row_identity({"model_name": e.get("model"), "processor": e.get("processor"),
                                "ram": e.get("ram"), "ssd": e.get("ssd")})
            if key is not None:
                catalog.setdefault(key, e["model"])
    return catalog


def canonicalize_row(row: dict, catalog: dict) -> dict:
    """Копия строки с каноническим именем и процессором. Сводки возвращаются как есть.

    Имя: из каталога, если модель в нём есть; для discovery-семейств — синтезированное;
    иначе (MacBook вне каталога) — прежнее: имена MacBook по году не трогаем.
    """
    out = dict(row)
    key = row_identity(row)
    if key is None:
        return out
    out["processor"] = canonical_processor(key)
    if key in catalog:
        out["model_name"] = catalog[key]
    elif key[0] in DISCOVERY_FAMILIES:
        out["model_name"] = synth_name(key)
    return out


def age_days(updated_at, now: datetime) -> Optional[int]:
    for fmt in _DATE_FORMATS:
        try:
            return (now - datetime.strptime(str(updated_at), fmt)).days
        except ValueError:
            continue
    return None


def pick_winner(rows: Iterable[dict], now: datetime) -> dict:
    """Какую из строк одной идентичности оставить. Приоритет из спеки:
    ручной оверрайд → свежая с выборкой → больше выборка → новее."""
    def rank(r):
        age = age_days(r.get("updated_at"), now)
        n = int(r.get("samples_count") or 0)
        fresh = age is not None and age <= FRESH_DAYS and n >= MIN_SAMPLES
        return (bool(r.get("manual_override")), fresh, n, -(age if age is not None else 10 ** 6))
    return max(rows, key=rank)


def model_to_slug(name: str) -> str:
    """Порт modelToSlug из src/lib/model-slugs.ts: адрес страницы /ceny/<slug>."""
    s = re.sub(r"[(),]", "", str(name).lower())
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `python3 scripts/common/test_price_identity.py`
Expected: `✅ Все тесты идентичности прошли`

- [ ] **Step 5: Коммит**

```bash
git add scripts/common/price_identity.py scripts/common/test_price_identity.py
git commit -m "feat(gst-77): модуль идентичности строк базы цен"
```

---

### Task 2: Синк коллектора — писатель и читатель

**Files:**
- Modify: `scripts/price-sync/sync_from_collector.py` — `_key_to_row_skeleton` и построение `idx` в `sync_stats`
- Test: `scripts/price-sync/test_sync.py`

**Interfaces:**
- Consumes: `row_identity`, `canonical_processor` из Task 1.
- Produces: `_key_to_row_skeleton(key_str)` возвращает `processor` с уровнем чипа; `sync_stats` находит строки по `row_identity`.

- [ ] **Step 1: Падающий тест**

В `scripts/price-sync/test_sync.py` перед финальным `print()` с итогом:

```python
# ─── GST-77: идентичность строк ──────────────────────────────────────────────
print("\n[6] GST-77: синк по идентичности строки")
sk = _key_to_row_skeleton("('Mac mini', 'M4', 'Pro', None, 24, 512)")
check("новая строка: процессор с уровнем чипа", bool(sk) and sk["processor"] == "Apple M4 Pro")

# Строка парсера под подписью вкладки: «Mac Studio m1» при процессоре M4 Max.
K_STUDIO = "('Mac Studio', 'M4', 'Max', None, 64, 1024)"
studio = {"model_name": "Mac Studio m1", "family": "Mac Studio", "processor": "Apple M4 Max",
          "ram": 64, "ssd": 1024, "min_price": 380000, "max_price": 420000,
          "median_price": 400000, "buyout_price": 320000, "samples_count": 7,
          "updated_at": "2026-05-01 10:00"}   # старше 30 дней — синк её обновит
stats = [dict(studio)]
u, i, _ = sync_stats(stats, {K_STUDIO: entries([390000 + k * 1000 for k in range(8)], msk=1)}, now=NOW)
check("строку под подписью вкладки синк находит по идентичности", u == 1 and i == 0)
check("и не плодит дубль", len(stats) == 1)
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 scripts/price-sync/test_sync.py`
Expected: провалены «процессор с уровнем чипа» (сейчас `Apple M4`) и «находит по идентичности» (сейчас вставляется новая строка: `i == 1`).

- [ ] **Step 3: Реализация**

В импортах `sync_from_collector.py` рядом с `from common.classifier import classify`:

```python
from common.price_identity import row_identity, canonical_processor  # noqa: E402
```

В `_key_to_row_skeleton` строку возврата заменить на:

```python
    return {
        # GST-77: процессор с уровнем чипа. Раньше писался f"Apple {chip}" — Pro/Max/Ultra
        # терялся, и строка «Mac mini M4 Pro» получала процессор «Apple M4».
        "model_name": model_name, "family": family,
        "processor": canonical_processor((family, chip, tier, screen, int(ram), int(ssd))),
        "ram": int(ram), "ssd": int(ssd),
    }
```

В `sync_stats` заменить блок построения индекса (цикл с `classify(f"{s['model_name']} {s.get('processor', '')}", …)` и `idx.setdefault(str(live_key(c)), …)`) на:

```python
    # индекс строк базы по идентичности (дубликаты конфига — все в список).
    # GST-77: правило price_identity, а не classify(имя + процессор): иначе строки
    # парсера под подписью вкладки («Mac Studio m1» при M4 Max) не находятся, и синк
    # вставляет рядом дубль.
    idx = {}
    for s in stats:
        try:
            key = row_identity(s)
        except Exception:
            continue
        if key is not None:
            idx.setdefault(str(key), []).append(s)
```

- [ ] **Step 4: Тесты проходят**

Run: `python3 scripts/price-sync/test_sync.py`
Expected: `✅ Все тесты синка прошли`

- [ ] **Step 5: Коммит**

```bash
git add scripts/price-sync/sync_from_collector.py scripts/price-sync/test_sync.py
git commit -m "fix(gst-77): синк пишет процессор с уровнем и ищет строки по идентичности"
```

---

### Task 3: Сканер — индекс цен

**Files:**
- Modify: `scripts/hot-deals-scanner/scanner_v2.py` — функция `live_key` и блок построения `prices_by_livekey` в `AvitoScannerV2.__init__`
- Test: `scripts/hot-deals-scanner/test_logic.py`

**Interfaces:**
- Consumes: `config_key`, `row_identity` из Task 1.
- Produces: `live_key(config)` == `config_key(config)` — определение одно; `prices_by_livekey` строится по `row_identity`.

- [ ] **Step 1: Падающий тест**

В `scripts/hot-deals-scanner/test_logic.py` перед блоком `# ─── Итог`:

```python
# ─── GST-77: индекс цен сканера по идентичности строки ───────────────────────
print("\n[22] GST-77: индекс цен по идентичности строки")
from common.price_identity import config_key
_cfgI = classify("MacBook Air 13 M2", {'ram': 16, 'ssd': 512})
check("live_key сканера совпадает с config_key", live_key(_cfgI) == config_key(_cfgI))
import scanner_v2 as _svI
_pfI = Path(_tmp.mkdtemp()) / "prices.json"
_pfI.write_text(_json.dumps({"generated_at": "2026-09-22 10:00", "stats": [
    {"model_name": "Mac Studio m1", "family": "Mac Studio", "processor": "Apple M4 Max",
     "ram": 64, "ssd": 1024, "median_price": 400000, "buyout_price": 320000,
     "min_price": 380000, "max_price": 420000, "samples_count": 7,
     "updated_at": "2026-09-20 10:00"}]}), encoding="utf-8")
_prevPF = _svI.PRICES_FILE
_svI.PRICES_FILE = _pfI
_sI = _svI.AvitoScannerV2(None)
_svI.PRICES_FILE = _prevPF
check("строка под подписью вкладки встаёт на свою конфигурацию",
      ('Mac Studio', 'M4', 'Max', None, 64, 1024) in _sI.prices_by_livekey)
check("и не выдаёт себя за M1",
      ('Mac Studio', 'M1', 'base', None, 64, 1024) not in _sI.prices_by_livekey)
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 scripts/hot-deals-scanner/test_logic.py 2>&1 | grep -E "❌|ПРОВАЛЕНО"`
Expected: провалены «live_key сканера совпадает с config_key» (`ImportError`) или оба пункта про Mac Studio.

- [ ] **Step 3: Реализация**

В импортах `scanner_v2.py` рядом с `from common.condition import analyze_condition`:

```python
from common.price_identity import config_key, row_identity
```

Тело `live_key`:

```python
def live_key(config):
    """Каноничный ключ для группировки сопоставимых лотов в живой выборке.
    Группируем по семейству+чипу+экрану+RAM+SSD — это и есть «такой же аппарат».
    GST-77: определение живёт в common.price_identity.config_key — тем же ключом
    идентифицируются строки базы цен, расхождения быть не должно."""
    return config_key(config)
```

В `AvitoScannerV2.__init__` заменить блок `try: c = classify(f"{s['model_name']} {s.get('processor', '')}", …) … self.prices_by_livekey[live_key(c)] = s … except Exception: pass` на:

```python
                    # GST-77: идентичность по правилу price_identity. Раньше имя шло
                    # первым, и строка «Mac Studio m1» с процессором M4 Max вставала
                    # на ключ M1: сканер брал цену M4 Max за рынок M1.
                    try:
                        ident = row_identity(s)
                        if ident is not None:
                            self.prices_by_livekey[ident] = s
                    except Exception:
                        pass
```

- [ ] **Step 4: Тесты проходят**

Run: `python3 scripts/hot-deals-scanner/test_logic.py 2>&1 | grep -E "❌|ПРОВАЛЕНО|Все тесты"`
Expected: `✅ Все тесты прошли`

- [ ] **Step 5: Коммит**

```bash
git add scripts/hot-deals-scanner/scanner_v2.py scripts/hot-deals-scanner/test_logic.py
git commit -m "fix(gst-77): сканер строит индекс цен по идентичности строки"
```

---

### Task 4: Парсер — discovery и склейка базы

**Files:**
- Modify: `scripts/avito-parser/parser.py` — `parse_discovery` (формат групп), новые `discovery_stats`, `db_key`, `build_db`; `merge_into_db`; ветка discovery и построение `db` в `main`
- Test: `scripts/avito-parser/test_parser.py`

**Interfaces:**
- Consumes: `row_identity`, `canonicalize_row`, `build_catalog`, `pick_winner` из Task 1; существующие `build_stat(model, processor, ram, ssd, family, prices, buyout_override=0)`, `MIN_SAMPLES_DEFAULT`, `logger`.
- Produces:
  - `parse_discovery(...)` → `dict[(model, chip, ram, ssd) → list[(url, price)]]`;
  - `discovery_stats(tab_groups: list[dict], tab_name: str, catalog: dict, min_samples: int = MIN_SAMPLES_DEFAULT) -> list[dict]`;
  - `db_key(s: dict)`, `build_db(stats: list[dict], now: datetime = None) -> dict`;
  - `merge_into_db(db, new_stats) -> (new_count, updated_count)` — ключ `db_key`.

- [ ] **Step 1: Падающий тест**

В `scripts/avito-parser/test_parser.py` перед финальным итогом:

```python
# ─── GST-77: discovery и склейка базы ────────────────────────────────────────
from datetime import datetime as _dt

print("\n[GST-77] discovery — одна строка на реальную конфигурацию")
g_m1 = {("Mac Studio m1", "Apple M4 Max", 64, 1024): [("u1", 400000), ("u2", 410000)],
        ("Mac Studio m1", "Apple M1 Max", 32, 512): [("u9", 120000), ("u10", 125000)]}
g_m4 = {("Mac Studio m4", "Apple M4 Max", 64, 1024): [("u2", 410000), ("u3", 420000)]}
st = P.discovery_stats([g_m1, g_m4], "Mac Studio", catalog={}, min_samples=2)
m4 = [s for s in st if s["processor"] == "Apple M4 Max"]
check("M4 Max с двух вкладок — одна строка", len(m4) == 1)
check("имя по реальной модели, а не по вкладке", bool(m4) and m4[0]["model_name"] == "Mac Studio M4 Max")
check("объявление с двух вкладок посчитано один раз", bool(m4) and m4[0]["samples_count"] == 3)
check("M1 Max не смешан с M4 Max", any(s["model_name"] == "Mac Studio M1 Max" for s in st))
thin = P.discovery_stats([{("Mac Studio m2", "Apple M2 Max", 64, 1024): [("x", 1)]}],
                         "Mac Studio", catalog={}, min_samples=2)
check("мало объявлений — строки нет", thin == [])

print("\n[GST-77] база склеивается по правилу, а не «последний победил»")
older = {"model_name": "Mac Studio m1", "family": "Mac Studio", "processor": "Apple M4 Max",
         "ram": 64, "ssd": 1024, "median_price": 111, "samples_count": 40,
         "updated_at": "2026-03-01 10:00"}
fresher = {"model_name": "Mac Studio m4", "family": "Mac Studio", "processor": "Apple M4 Max",
           "ram": 64, "ssd": 1024, "median_price": 222, "samples_count": 7,
           "updated_at": "2026-09-20 10:00"}
db = P.build_db([fresher, older], now=_dt(2026, 9, 23))
check("две строки одной конфигурации → одна", len(db) == 1)
check("победила свежая по правилу, а не последняя в списке",
      list(db.values())[0]["median_price"] == 222)
agg = {"model_name": "MacBook Pro 14 (2023)", "processor": "", "ram": 0, "ssd": 0,
       "samples_count": 141}
check("сводка 0/0 сохраняется рядом", len(P.build_db([agg, fresher], now=_dt(2026, 9, 23))) == 2)
new = dict(fresher, median_price=333, model_name="Mac Studio M4 Max", updated_at="2026-09-23 09:00")
n, u = P.merge_into_db(db, [new])
check("новый прогон обновляет ту же конфигурацию",
      (n, u) == (0, 1) and list(db.values())[0]["median_price"] == 333)
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 scripts/avito-parser/test_parser.py`
Expected: `AttributeError: module 'parser' has no attribute 'discovery_stats'`

- [ ] **Step 3: Реализация**

Импорт рядом с `from common.classifier import classify`:

```python
from common.price_identity import row_identity, canonicalize_row, build_catalog, pick_winner
```

В `parse_discovery` строку `groups.setdefault(key, []).append(it["price"])` заменить на:

```python
            # GST-77: храним и адрес — одно объявление видно на нескольких вкладках
            # семейства, и при склейке по конфигурации его нельзя посчитать дважды.
            groups.setdefault(key, []).append((it.get("url") or "", it["price"]))
```

Новые функции сразу после `build_stat`:

```python
def discovery_stats(tab_groups: list[dict], tab_name: str, catalog: dict,
                    min_samples: int = MIN_SAMPLES_DEFAULT) -> list[dict]:
    """Группы всех discovery-вкладок семейства → строки базы, по одной на конфигурацию.

    GST-77: раньше каждая вкладка давала свои строки с подписью вкладки в имени, и
    Mac Studio M4 Max, найденный на вкладках «m1» и «m4», жил в базе двумя строками
    с разными ценами. Теперь выборки одной конфигурации объединяются (объявление с
    двух вкладок — один раз), а имя строки — по реальной модели.
    """
    merged: dict = {}
    for groups in tab_groups:
        for (m, p, r, s), items in groups.items():
            raw = {"model_name": m, "processor": p, "ram": r, "ssd": s}
            key = row_identity(raw) or (m, p, r, s)
            slot = merged.setdefault(key, {"row": canonicalize_row(raw, catalog),
                                           "by_url": {}, "anon": []})
            for url, price in items:
                if url:
                    slot["by_url"][url] = price
                else:
                    slot["anon"].append(price)
    stats = []
    for slot in merged.values():
        row = slot["row"]
        prices = list(slot["by_url"].values()) + slot["anon"]
        if len(prices) < min_samples:
            logger.info(f"   ⏭ {row['model_name']} | {row['processor']} {row['ram']}/{row['ssd']}: "
                        f"{len(prices)} цен < {min_samples}")
            continue
        stats.append(build_stat(row["model_name"], row["processor"], row["ram"], row["ssd"],
                                tab_name, prices))
    return stats


def db_key(s: dict):
    """Ключ строки в базе: идентичность конфигурации; у сводок 0/0 — прежний кортеж."""
    return row_identity(s) or (s["model_name"], s.get("processor", ""), s["ram"], s["ssd"])


def build_db(stats: list[dict], now: datetime = None) -> dict:
    """Существующая база → словарь по db_key.

    GST-77: если в файле лежат дубли одной конфигурации (база ещё не нормализована),
    оставляем строку по правилу приоритета, а не последнюю попавшуюся.
    """
    now = now or datetime.now()
    groups: dict = {}
    for s in stats:
        groups.setdefault(db_key(s), []).append(s)
    return {k: (v[0] if len(v) == 1 else pick_winner(v, now)) for k, v in groups.items()}
```

`merge_into_db` — ключ через `db_key`:

```python
def merge_into_db(
    db: dict, new_stats: list[dict]
) -> tuple[int, int]:
    new_count = updated_count = 0
    for s in new_stats:
        key = db_key(s)
        if key in db:
            updated_count += 1
        else:
            new_count += 1
        db[key] = s
    return new_count, updated_count
```

В `main` после `tabs_cfg = cfg["tabs"]`:

```python
    catalog = build_catalog(cfg)   # GST-77: канонические имена MacBook из вкладок direct
```

Там же построение `db` из `existing` заменить на:

```python
    db = build_db(existing.get("stats", []))
```

В ветке `else:` (discovery) цикл по `entries` заменить на:

```python
            else:
                tab_groups = []
                for idx, entry in enumerate(entries, 1):
                    if deadline and datetime.now() >= deadline:
                        logger.warning(f"⏱ Время вышло, прерываюсь на {idx}/{len(entries)}")
                        break

                    logger.info(f"\n[{tab_name} {idx}/{len(entries)}] {entry['model']}")
                    try:
                        tab_groups.append(ap_obj.parse_discovery(
                            entry, tab_name, args.max_pages, exclude_intel
                        ))
                    except Exception as e:
                        logger.error(f"   ❌ {entry['model']}: {e}")
                        continue
                # GST-77: одна строка на реальную конфигурацию по всем вкладкам семейства
                new_stats.extend(discovery_stats(tab_groups, tab_name, catalog))
```

- [ ] **Step 4: Тесты проходят**

Run: `python3 scripts/avito-parser/test_parser.py`
Expected: все пункты ✅, код выхода 0.

- [ ] **Step 5: Коммит**

```bash
git add scripts/avito-parser/parser.py scripts/avito-parser/test_parser.py
git commit -m "fix(gst-77): парсер пишет строки по реальной конфигурации и склеивает базу по идентичности"
```

---

### Task 5: Миграция базы

**Files:**
- Create: `scripts/price-sync/normalize_prices.py`
- Test: `scripts/price-sync/test_normalize.py`

**Interfaces:**
- Consumes: `row_identity`, `canonicalize_row`, `build_catalog`, `pick_winner`, `model_to_slug`, `age_days`, `FRESH_DAYS` из Task 1.
- Produces:
  - `normalize(stats: list[dict], catalog: dict, now: datetime) -> (list[dict], dict)` — отчёт с ключами `renamed`, `merged`, `stale`, `slug_changes` (`{"renamed": {old: new}, "split": [old, …]}`);
  - `migrate_overrides(overrides: dict, before: list[dict], catalog: dict) -> (dict, list, list)` — новые оверрайды, переехавшие ключи, неоднозначные ключи;
  - CLI: без флагов — сухой прогон; `--report путь.json`; `--apply`.

- [ ] **Step 1: Падающий тест**

`scripts/price-sync/test_normalize.py`:

```python
#!/usr/bin/env python3
"""Офлайн-тесты разовой нормализации базы цен (GST-77).

Запуск:  python3 scripts/price-sync/test_normalize.py
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))          # price-sync/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
from normalize_prices import normalize, migrate_overrides  # noqa: E402
from common.price_identity import build_catalog  # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


NOW = datetime(2026, 9, 23)
CAT = build_catalog({"tabs": {"MacBook": {"mode": "direct", "entries": [
    {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 8, "ssd": 256}]}}})


def r(name, proc, ram, ssd, med, n, upd, **kw):
    return {"model_name": name, "processor": proc, "ram": ram, "ssd": ssd, "median_price": med,
            "buyout_price": int(med * 0.8), "min_price": med, "max_price": med,
            "samples_count": n, "updated_at": upd, **kw}


BEFORE = [
    r("Mac Studio m1", "Apple M4 Max", 64, 1024, 399990, 3, "2026-09-10 21:21"),
    r("Mac Studio m4", "Apple M4 Max", 64, 1024, 620000, 7, "2026-09-16 19:25"),
    r("Mac Studio m1", "Apple M1 Ultra", 64, 1024, 279990, 3, "2026-07-14 20:06"),
    r("Mac mini M4 Pro", "Apple M4", 24, 512, 90000, 6, "2026-09-18 10:00", collector_synced=True),
    r("MacBook Air 13 (2020, M1)", "Apple M1", 8, 256, 45000, 13, "2026-09-19 05:10"),
    r("MacBook Air 13 M1", "Apple M1", 8, 256, 35000, 16, "2026-09-19 05:10"),
    r("MacBook Pro 14 (2023)", "", 0, 0, 93900, 141, "Thu Apr 23 16:02:18 2026"),
    r("mac mini m4", "Apple M4", 16, 256, 50000, 4, "2026-09-01 10:00", manual_override=True),
]
AFTER, REP = normalize(BEFORE, CAT, NOW)
by = {(s["model_name"], s["ram"], s["ssd"]): s for s in AFTER}

print("[1] Склейка и канонические имена")
check("строк стало меньше на склеенные", len(AFTER) == 6)
m4 = by.get(("Mac Studio M4 Max", 64, 1024))
check("M4 Max с двух вкладок — одна строка с реальным именем", m4 is not None)
check("победила свежая с выборкой (вкладка m4)", bool(m4) and m4["median_price"] == 620000)
m1u = by.get(("Mac Studio M1 Ultra", 64, 1024))
check("M1 Ultra отделён от M4 Max", bool(m1u) and m1u["processor"] == "Apple M1 Ultra")
mini = by.get(("Mac mini M4 Pro", 24, 512))
check("синк: уровень чипа вернулся в процессор", bool(mini) and mini["processor"] == "Apple M4 Pro")
check("флаг синка сохранён", bool(mini) and mini.get("collector_synced") is True)
air = by.get(("MacBook Air 13 (2020, M1)", 8, 256))
check("дубль Air M1 склеен под имя из каталога", air is not None and ("MacBook Air 13 M1", 8, 256) not in by)
check("из двух свежих победила большая выборка", bool(air) and air["samples_count"] == 16)
agg = by.get(("MacBook Pro 14 (2023)", 0, 0))
check("сводка 0/0 не тронута", agg == BEFORE[6])
ov = by.get(("Mac mini M4", 16, 256))
check("ручной оверрайд сохранил флаг", bool(ov) and ov.get("manual_override") is True)

print("\n[2] Адреса /ceny")
sc = REP["slug_changes"]
check("вкладка m4 переименована в M4 Max", sc["renamed"].get("mac-studio-m4") == "mac-studio-m4-max")
check("дубль Air M1 ведёт на канон", sc["renamed"].get("macbook-air-13-m1") == "macbook-air-13-2020-m1")
check("вкладка m1 распалась на несколько моделей", "mac-studio-m1" in sc["split"])
check("неизменные адреса в отчёт не попадают",
      "macbook-air-13-2020-m1" not in sc["renamed"] and "mac-mini-m4-pro" not in sc["renamed"])
check("отчёт знает о склейках", len(REP["merged"]) == 2)
check("устаревшая строка в отчёте, но не удалена",
      any(s["processor"] == "Apple M1 Ultra" for s in REP["stale"]) and m1u is not None)

print("\n[3] Ключи ручных оверрайдов")
new_ov, moved, ambiguous = migrate_overrides(
    {"__comment__": "x", "macbook air 13 m1|8|256": {"median": 1}, "mac mini m4|16|256": {"median": 2},
     "mac studio m1|64|1024": {"buyout": 3}},
    BEFORE, CAT)
check("ключ переехал на каноническое имя",
      new_ov.get("macbook air 13 (2020, m1)|8|256") == {"median": 1} and "macbook air 13 m1|8|256" not in new_ov)
check("совпадающий с каноном ключ остался", new_ov.get("mac mini m4|16|256") == {"median": 2})
check("служебный комментарий на месте", new_ov.get("__comment__") == "x")
check("переезд записан в отчёт", {"from": "macbook air 13 m1|8|256", "to": "macbook air 13 (2020, m1)|8|256"} in moved)
check("неоднозначный ключ не тронут", new_ov.get("mac studio m1|64|1024") == {"buyout": 3})
check("…и попал в отчёт", "mac studio m1|64|1024" in ambiguous)

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты нормализации прошли")
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 scripts/price-sync/test_normalize.py`
Expected: `ModuleNotFoundError: No module named 'normalize_prices'`

- [ ] **Step 3: Реализация**

`scripts/price-sync/normalize_prices.py`:

```python
#!/usr/bin/env python3
"""
Разовая нормализация базы цен (GST-77, docs/price-identity-GST-77.md).

Перераскладывает строки avito-prices.json по правильной идентичности, склеивает
дубли, ставит канонические имена и процессор с уровнем чипа, переводит ключи
ручных оверрайдов на новые имена. Сводки 0/0 не трогает.

Запуск:  python3 scripts/price-sync/normalize_prices.py                 # сухой прогон
         python3 scripts/price-sync/normalize_prices.py --report r.json # + отчёт в JSON
         python3 scripts/price-sync/normalize_prices.py --apply         # только после ревью отчёта!
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

SD = Path(__file__).resolve().parent
sys.path.insert(0, str(SD.parent))   # scripts/ (common.*)

from common.price_identity import (  # noqa: E402
    row_identity, canonicalize_row, build_catalog, pick_winner, model_to_slug,
    age_days, FRESH_DAYS,
)

DATA = SD / "../../public/data"
PRICES_FILE = Path(os.environ.get("PRICES_FILE_PATH", DATA / "avito-prices.json"))
CONFIG_FILE = Path(os.environ.get("PARSER_CONFIG_PATH", DATA / "parser-config.json"))
OVERRIDES_FILE = Path(os.environ.get("PRICE_OVERRIDES_PATH", DATA / "price-overrides.json"))

_BRIEF = ("model_name", "processor", "ram", "ssd", "median_price", "buyout_price",
          "samples_count", "updated_at")


def _brief(s):
    return {k: s.get(k) for k in _BRIEF}


def slug_changes(before, after, catalog):
    """Какие адреса /ceny исчезнут и куда вести.

    renamed — старая страница стала ровно одной новой; split — модель распалась
    на несколько (вкладка «Mac Studio m1» смешивала M1 Ultra и M4 Max): её ведём
    на индекс /ceny, а не на случайную из моделей.
    """
    after_slugs = {model_to_slug(s["model_name"]) for s in after}
    targets: dict = {}
    for s in before:
        old = model_to_slug(s["model_name"])
        if old in after_slugs:
            continue
        targets.setdefault(old, set()).add(model_to_slug(canonicalize_row(s, catalog)["model_name"]))
    out = {"renamed": {}, "split": []}
    for old, new in sorted(targets.items()):
        if len(new) == 1:
            out["renamed"][old] = next(iter(new))
        else:
            out["split"].append(old)
    return out


def normalize(stats, catalog, now):
    """→ (новые stats, отчёт). Чистая функция."""
    result, groups = [], {}
    for s in stats:
        key = row_identity(s)
        if key is None:
            result.append(dict(s))   # сводка 0/0 или неклассифицируемое — не трогаем
            continue
        groups.setdefault(key, []).append(s)

    renamed, merged = [], []
    for key, rows in groups.items():
        winner = rows[0] if len(rows) == 1 else pick_winner(rows, now)
        out = canonicalize_row(winner, catalog)
        result.append(out)
        if len(rows) > 1:
            merged.append({"key": str(key), "into": out["model_name"], "kept": _brief(winner),
                           "dropped": [_brief(r) for r in rows if r is not winner]})
        for r in rows:
            if (r.get("model_name"), r.get("processor")) != (out["model_name"], out["processor"]):
                renamed.append({"from": f"{r.get('model_name')} | {r.get('processor')}",
                                "to": f"{out['model_name']} | {out['processor']}"})
    # Устаревшие не удаляются (спека, п. 4) — только в отчёт; прячет их правило надёжной цены.
    stale = [_brief(s) for s in result if row_identity(s) is not None
             and (age_days(s.get("updated_at"), now) or 10 ** 6) > FRESH_DAYS]
    return result, {"renamed": renamed, "merged": merged, "stale": stale,
                    "slug_changes": slug_changes(stats, result, catalog)}


def migrate_overrides(overrides, before, catalog):
    """Ключ оверрайда «имя|ram|ssd» (имя в нижнем регистре, как в базе) → новое имя.

    Если под старым ключом лежат строки разных моделей (подпись вкладки общая),
    ключ не трогаем и сообщаем: переносить на случайную модель нельзя.
    """
    by_old: dict = {}
    for s in before:
        k = f"{str(s.get('model_name', '')).lower()}|{int(s.get('ram') or 0)}|{int(s.get('ssd') or 0)}"
        by_old.setdefault(k, []).append(s)
    out, moved, ambiguous = {}, [], []
    for k, v in overrides.items():
        rows = by_old.get(k)
        if k.startswith("__") or not rows:
            out[k] = v
            continue
        names = {canonicalize_row(s, catalog)["model_name"] for s in rows}
        if len(names) > 1:
            out[k] = v
            ambiguous.append(k)
            continue
        ram_ssd = k.split("|", 1)[1]
        nk = f"{names.pop().lower()}|{ram_ssd}"
        out[nk] = v
        if nk != k:
            moved.append({"from": k, "to": nk})
    return out, moved, ambiguous


def _write_json(path, data):
    tmp = path.parent / (path.name + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def _print_report(rep):
    print(f"Строк: {rep['rows']['before']} → {rep['rows']['after']}")
    print(f"Переименовано строк: {len(rep['renamed'])} | склеек: {len(rep['merged'])} | "
          f"старше {FRESH_DAYS} дней (не удаляются): {len(rep['stale'])}")
    print("\n— Склейки (что осталось ← что ушло):")
    for m in rep["merged"]:
        k = m["kept"]
        dropped = ", ".join(f"{d['model_name']} мед {d['median_price']} n {d['samples_count']}"
                            for d in m["dropped"])
        print(f"  {m['into']} {k['ram']}/{k['ssd']}: мед {k['median_price']} n {k['samples_count']}"
              f" ← {dropped}")
    sc = rep["slug_changes"]
    print(f"\n— Адреса /ceny: переименовано {len(sc['renamed'])}, распалось {len(sc['split'])}")
    for old, new in sc["renamed"].items():
        print(f"  /ceny/{old} → /ceny/{new}")
    for old in sc["split"]:
        print(f"  /ceny/{old} → /ceny (распалась на несколько моделей)")
    print(f"\n— Оверрайды: переехало {len(rep['overrides_moved'])}, "
          f"неоднозначных {len(rep['overrides_ambiguous'])}")
    for m in rep["overrides_moved"]:
        print(f"  {m['from']} → {m['to']}")
    for k in rep["overrides_ambiguous"]:
        print(f"  ⚠️ {k} — не тронут, нужен ручной разбор")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="записать в базу (только после ревью отчёта)")
    ap.add_argument("--report", default=None, help="сохранить отчёт в JSON")
    args = ap.parse_args()

    now = datetime.now()
    data = json.loads(PRICES_FILE.read_text(encoding="utf-8"))
    catalog = build_catalog(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
    before = data.get("stats", [])
    after, report = normalize(before, catalog, now)
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8")) if OVERRIDES_FILE.exists() else {}
    new_overrides, moved, ambiguous = migrate_overrides(overrides, before, catalog)
    report["overrides_moved"], report["overrides_ambiguous"] = moved, ambiguous
    report["rows"] = {"before": len(before), "after": len(after)}

    _print_report(report)
    if args.report:
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if not args.apply:
        print("\nСухой прогон: база не изменена. Запись — с --apply, после ревью отчёта.")
        return

    after.sort(key=lambda s: (s.get("family", ""), s["model_name"], s.get("processor", ""),
                              s["ram"], s["ssd"]))
    data["stats"] = after
    data["total_listings"] = sum(int(s.get("samples_count") or 0) for s in after)
    _write_json(PRICES_FILE, data)
    if moved:
        _write_json(OVERRIDES_FILE, new_overrides)
    print(f"\n✅ Записано: {PRICES_FILE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Тесты проходят**

Run: `python3 scripts/price-sync/test_normalize.py`
Expected: `✅ Все тесты нормализации прошли`

- [ ] **Step 5: Коммит**

```bash
git add scripts/price-sync/normalize_prices.py scripts/price-sync/test_normalize.py
git commit -m "feat(gst-77): разовая нормализация базы цен с сухим прогоном"
```

---

### Task 6: Сухой прогон на живой базе и ревью владельца

Код не пишется. Результат — отчёт и **решение владельца**. Без него Task 7 не начинается.

- [ ] **Step 1: Прогнать все наборы тестов**

```bash
for t in scripts/common/test_price_identity.py scripts/price-sync/test_sync.py \
         scripts/price-sync/test_normalize.py scripts/avito-parser/test_parser.py \
         scripts/hot-deals-scanner/test_logic.py scripts/common/test_canary.py \
         scripts/common/test_subscriptions.py scripts/negotiation-bot/test_bot.py \
         scripts/intake/test_intake.py scripts/quote-bot/test_quote.py; do
  printf '%s: ' "$(basename $t)"; python3 "$t" >/dev/null 2>&1 && echo ✅ || echo ❌
done
```

Expected: все ✅.

- [ ] **Step 2: Сухой прогон**

```bash
python3 scripts/price-sync/normalize_prices.py --report /tmp/claude-501/gst77-report.json
```

Expected: строк 246 → около 210 (237 строк с конфигурацией → 201, плюс 9 сводок), склеек около 23, в конце — «Сухой прогон: база не изменена».

- [ ] **Step 3: Показать владельцу**

Кратко: сколько строк склеено и переименовано; **все склейки MacBook, где изменилась медиана** — это основной товар; адреса `/ceny`, которые сменятся или распадутся; оверрайды. Особо — случаи, где из двух свежих строк победила бо́льшая выборка с заметно другой ценой (в тестовой фикстуре — Air M1 8/256: 35 000 вместо 45 000).

- [ ] **Step 4: Получить решение**

«Применяем» → Task 7. Если какую-то склейку владелец считает неверной — правка правила в Task 1 и повтор Task 6.

---

### Task 7: Применение, редиректы и выкатка

**Files:**
- Modify: `public/data/avito-prices.json`, `public/data/price-overrides.json` (если были переезды) — через `--apply`
- Modify: `src/data/seo-redirects.ts`, `next.config.ts`, `src/lib/price-pages.ts`

**Interfaces:**
- Consumes: отчёт `normalize_prices.py --report` — `slug_changes.renamed` и `slug_changes.split`; существующие `PRICE_SLUG_REDIRECTS` (GST-76).
- Produces: `PRICE_SLUGS_TO_INDEX: string[]` в `src/data/seo-redirects.ts`.

- [ ] **Step 1: Свежая база с main**

```bash
git fetch origin && git rebase origin/main
git log -1 --format='%h %ad' --date=iso origin/main -- public/data/avito-prices.json
```

Запомнить хэш: перед мержем (Step 7) он должен совпасть.

- [ ] **Step 2: Применить**

```bash
python3 scripts/price-sync/normalize_prices.py --apply --report /tmp/claude-501/gst77-apply.json
```

Сверить сводку с одобренной в Task 6. Если база на main успела обновиться и картина заметно другая — показать владельцу разницу до продолжения.

- [ ] **Step 3: Карта редиректов**

В `src/data/seo-redirects.ts` добавить после `PRICE_SLUG_REDIRECTS`:

```ts
/**
 * GST-77: ценовые страницы моделей, распавшихся на несколько. Вкладка поиска
 * «Mac Studio m1» смешивала M1 Ultra и M4 Max; после нормализации базы это разные
 * страницы, и ни одна из них не наследник старой — ведём на индекс /ceny.
 */
export const PRICE_SLUGS_TO_INDEX: string[] = [
];
```

Сгенерировать строки из отчёта и вставить: пары `renamed` — в `PRICE_SLUG_REDIRECTS` (пропуская уже присутствующие там ключи, например `macbook-air-m1` из GST-76), список `split` — в `PRICE_SLUGS_TO_INDEX`:

```bash
python3 - <<'PY'
import json, re
rep = json.load(open('/tmp/claude-501/gst77-apply.json'))['slug_changes']
have = set(re.findall(r"'([a-z0-9-]+)':", open('src/data/seo-redirects.ts', encoding='utf-8').read()))
print('// → PRICE_SLUG_REDIRECTS')
for old, new in sorted(rep['renamed'].items()):
    if old not in have:
        print(f"  '{old}': '{new}',")
print('// → PRICE_SLUGS_TO_INDEX')
for old in rep['split']:
    print(f"  '{old}',")
PY
```

- [ ] **Step 4: Редирект на индекс и фильтр страниц**

`next.config.ts` — импорт дополнить `PRICE_SLUGS_TO_INDEX`, а после блока `PRICE_SLUG_REDIRECTS` добавить:

```ts
      ...PRICE_SLUGS_TO_INDEX.map((slug) => ({
        source: `/ceny/${slug}`,
        destination: '/ceny',
        permanent: true,
      })),
```

`src/lib/price-pages.ts` — импорт дополнить `PRICE_SLUGS_TO_INDEX`, фильтр склеенных дублей заменить на:

```ts
    // Склеенные и распавшиеся адреса (GST-76/77) отдают 301 — страница не должна
    // попадать ни в список /ceny, ни в статическую сборку, ни в sitemap.
    .filter((m) => !(m.slug in PRICE_SLUG_REDIRECTS) && !PRICE_SLUGS_TO_INDEX.includes(m.slug));
```

- [ ] **Step 5: Проверка**

Все наборы Python-тестов из Task 6 Step 1 — ✅. Аудит дублей:

```bash
python3 - <<'PY'
import json, sys
from collections import Counter
sys.path.insert(0, 'scripts')
from common.price_identity import row_identity
rows = json.load(open('public/data/avito-prices.json'))['stats']
c = Counter(k for k in (row_identity(r) for r in rows) if k)
print('дублей идентичности:', sum(v - 1 for v in c.values() if v > 1))
PY
```

Expected: `дублей идентичности: 0`.

Сборка сайта в чистой копии (локальный `node_modules` на Рабочем столе сломан копиями iCloud):

```bash
W=/private/tmp/claude-501/-Users-a1111-Desktop-bestmac-avito-apple/2db040c6-328f-47e3-a8a6-55908b14d68c/scratchpad/build-gst77
rm -rf "$W" && mkdir -p "$W"
git ls-files -z --cached --others --exclude-standard | grep -zv ' 2\.' \
  | xargs -0 -I{} rsync -R "{}" "$W/"
cd "$W" && npm ci --no-audit --no-fund --loglevel=error && NEXT_TELEMETRY_DISABLED=1 npx next build
```

Поднять `npx next start -p 3918` и для каждого адреса из отчёта проверить: переименованный → 308 на новый, распавшийся → 308 на `/ceny`, новые страницы → 200, в `/sitemap.xml` старых адресов нет. Остановить сервер.

- [ ] **Step 6: Коммит**

```bash
git add public/data/avito-prices.json public/data/price-overrides.json \
        src/data/seo-redirects.ts next.config.ts src/lib/price-pages.ts
git commit -m "fix(gst-77): нормализованная база цен и редиректы распавшихся страниц /ceny"
```

- [ ] **Step 7: PR и мерж**

Перед мержем снова `git fetch origin` и сравнить хэш последнего коммита `public/data/avito-prices.json` на `origin/main` с запомненным в Step 1. Изменился — повторить Steps 1–6. Совпал — PR и мерж сразу: парсер коммитит цены раз в три дня, синк — ежедневно.

После мержа ничего вручную на VPS делать не нужно: `run_sync.sh` перед каждым прогоном подтягивает `main` (`git merge --ff-only`), и синк со сканером переходят на новый код сами. Парсер в GitHub Actions берёт код из `main`.

- [ ] **Step 8: Наблюдение**

Проверить на проде редиректы из отчёта. После ближайших прогонов синка (ежедневно) и парсера (раз в три дня) — снова аудит из Step 5 на свежем `main`: `дублей идентичности: 0`. Если парсер или синк размножил строки — разбор до следующего прогона.
