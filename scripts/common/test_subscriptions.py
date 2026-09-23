#!/usr/bin/env python3
"""Офлайн-тесты подписок «модель + моя цена» (GST-73).

Запуск:  python3 scripts/common/test_subscriptions.py
Сеть и Telegram здесь не трогаются — логика сопоставления чистая.
"""
import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.classifier import classify                                  # noqa: E402
from common.subscriptions import (                                      # noqa: E402
    load_subscriptions, save_subscriptions, make_subscription,
    subscription_matches, find_matches, match_from_config, record_hits,
)

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


AIR15 = classify("MacBook Air 15 (2023, M2)", {'ram': 8, 'ssd': 256})
AIR15_16 = classify("MacBook Air 15 (2023, M2)", {'ram': 16, 'ssd': 512})
AIR13_M1 = classify("MacBook Air 13 (2020, M1)", {'ram': 8, 'ssd': 256})
IMAC24 = classify("imac 24 m1")


def sub(match, price=45000):
    return make_subscription(chat_id=1, model="тест", label="тест",
                             match=match, max_price=price, url="u")


# ─── 1. Точное совпадение конфигурации ───────────────────────────────────────
print("\n[1] Сопоставление конфигурации")

s = sub(match_from_config(AIR15))
check("та же конфигурация и цена ниже → совпало", subscription_matches(s, AIR15, 40000))
check("та же конфигурация, цена ровно потолок → совпало",
      subscription_matches(s, AIR15, 45000))
check("цена выше потолка → мимо", not subscription_matches(s, AIR15, 45001))
check("другая память → мимо", not subscription_matches(s, AIR15_16, 40000))
check("другой чип/экран → мимо", not subscription_matches(s, AIR13_M1, 40000))

# ─── 2. Частичный match: каталог не знает RAM/SSD у iMac ─────────────────────
print("\n[2] Частичный match (iMac без памяти в каталоге)")

m_imac = match_from_config(IMAC24)
check("неизвестные поля в match не попали", "ram" not in m_imac and "ssd" not in m_imac)
check("известные поля попали", m_imac.get("family") == "iMac" and m_imac.get("screen") == 24)

s_imac = sub(m_imac, price=60000)
imac_ram = classify("imac 24 m1", {'ram': 16, 'ssd': 512})
check("подписка на iMac ловит лот с любой памятью",
      subscription_matches(s_imac, imac_ram, 55000))
check("подписка на iMac не ловит MacBook", not subscription_matches(s_imac, AIR15, 55000))

# ─── 3. Пустой match не должен ловить всё подряд ─────────────────────────────
print("\n[3] Страховка от подписки-ловушки")

check("пустой match не совпадает ни с чем", not subscription_matches(sub({}), AIR15, 10000))
check("match только из None не совпадает",
      not subscription_matches(sub({"family": None}), AIR15, 10000))

# ─── 4. find_matches по набору подписок ──────────────────────────────────────
print("\n[4] Выборка сработавших подписок")

subs = {
    "a": sub(match_from_config(AIR15), 45000),
    "b": sub(match_from_config(AIR15), 30000),      # тот же аппарат, цена жёстче
    "c": sub(match_from_config(AIR13_M1), 45000),
}
hits = find_matches(subs, AIR15, 40000)
check("сработала только подписка с подходящим потолком", len(hits) == 1)
check("сработала именно «a»", hits and hits[0]["id"] == subs["a"]["id"])
check("дешёвый лот поднимает обе подписки на эту конфигурацию",
      len(find_matches(subs, AIR15, 29000)) == 2)
check("неактивные подписки игнорируются",
      len(find_matches({"a": {**subs["a"], "active": False}}, AIR15, 10000)) == 0)

# ─── 5. Хранилище ────────────────────────────────────────────────────────────
print("\n[5] Чтение и запись файла")

_d = Path(tempfile.mkdtemp()) / "subs.json"
check("нет файла → пустой словарь", load_subscriptions(_d) == {})
save_subscriptions(subs, _d)
check("после записи читается обратно", set(load_subscriptions(_d)) == set(subs))
check("файл — валидный JSON", isinstance(json.loads(_d.read_text(encoding="utf-8")), dict))

_bad = Path(tempfile.mkdtemp()) / "broken.json"
_bad.write_text("{не json", encoding="utf-8")
check("битый файл не роняет бота", load_subscriptions(_bad) == {})

check("у подписки есть id и дата", bool(subs["a"]["id"]) and bool(subs["a"]["created_at"]))
check("id уникальны", subs["a"]["id"] != subs["b"]["id"])

# ─── 6. Учёт срабатываний не затирает правки бота ────────────────────────────
print("\n[6] record_hits")

record_hits([subs["a"]["id"]], _d)
_after = load_subscriptions(_d)
check("счётчик вырос", _after["a"]["hits"] == 1)
check("время срабатывания записано", _after["a"]["last_hit_at"] is not None)
check("соседние подписки не тронуты", _after["b"]["hits"] == 0)

# Пока сканер разбирал пачку, владелец добавил подписку в боте — она обязана
# пережить запись счётчиков (сканер перечитывает файл прямо перед записью).
_live = load_subscriptions(_d)
_live["z"] = sub(match_from_config(AIR15), 99000)
save_subscriptions(_live, _d)
record_hits([subs["a"]["id"]], _d)
_after2 = load_subscriptions(_d)
check("подписка, добавленная во время прогона, выжила", "z" in _after2)
check("счётчик всё же обновился", _after2["a"]["hits"] == 2)
check("удалённая подписка игнорируется", record_hits(["нет-такой"], _d) is False)
check("пустой список — не пишем", record_hits([], _d) is False)


print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты подписок прошли")
