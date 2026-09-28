#!/usr/bin/env python3
"""Офлайн-тесты разбора объявления DeepSeek (ai_review).

Запуск:  python3 scripts/common/test_ai_review.py
LLM подменяется функцией — ключ и сеть не нужны.
"""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.ai_review import review_lot, format_block, HARD_KINDS   # noqa: E402

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


DESC = ("Продаю MacBook Air M2, был залит чаем, после чистки работает. "
        "Небольшая царапина на крышке. Торг уместен, срочно — переезд.")


def llm(payload):
    """LLM-заглушка: возвращает заданный JSON-ответ и запоминает запрос."""
    def call(messages, max_tokens=600):
        llm.last = messages
        return payload if isinstance(payload, str) or payload is None else json.dumps(payload, ensure_ascii=False)
    return call


def lot(desc=DESC, **kw):
    base = dict(title="MacBook Air 13 M2 8/256", price=60000, median=75000,
                buyout=62000, desc=desc)
    base.update(kw)
    return base


print("\n[1] Серьёзная проблема с цитатой из описания → отсев")
r = review_lot(**lot(), llm_call=llm({
    "problems": [{"kind": "liquid", "severity": "hard", "quote": "был залит чаем"},
                 {"kind": "cosmetic", "severity": "minor", "quote": "Небольшая царапина на крышке"}],
    "bargain": {"signals": ["торг уместен", "срочно, переезд"], "open_price": 52000},
    "action": "Звонить сразу, предложить 52 000, спросить про клавиатуру",
}))
check("разбор получен", r is not None)
check("залитие → отсев", r.is_reject)
check("причина отсева — залитие", [p.kind for p in r.hard] == ["liquid"])
check("мелочь не отсеивает, но видна", [p.kind for p in r.minor] == ["cosmetic"])
check("в запросе к LLM есть описание", DESC in json.dumps(llm.last, ensure_ascii=False))

print("\n[2] Защита от выдуманного дефекта")
r = review_lot(**lot(desc="Идеальное состояние, АКБ 98%, чек и коробка."), llm_call=llm({
    "problems": [{"kind": "screen_crack", "severity": "hard", "quote": "трещина на экране"}],
    "bargain": {"signals": [], "open_price": None}, "action": "Брать",
}))
check("цитаты нет в описании → не отсеиваем", r is not None and not r.is_reject)
check("выдуманная проблема отброшена целиком", r.hard == [] and r.minor == [])

print("\n[3] Цитата сверяется без учёта регистра, пробелов и ё")
r = review_lot(**lot(desc="Стоит  MDM профиль ОРГАНИЗАЦИИ, iCloud отвязан"), llm_call=llm({
    "problems": [{"kind": "mdm", "severity": "hard", "quote": "стоит mdm профиль организации"}],
}))
check("MDM → отсев", r.is_reject and r.hard[0].kind == "mdm")

print("\n[4] Тип вне закрытого списка не отсеивает")
r = review_lot(**lot(), llm_call=llm({
    "problems": [{"kind": "ugly_color", "severity": "hard", "quote": "царапина на крышке"}],
}))
check("неизвестный тип → не отсев", not r.is_reject)
check("список жёстких типов: залитие, экран, MDM, iCloud, не включается, плата, на запчасти",
      {"liquid", "screen_crack", "mdm", "icloud_lock", "no_power", "logic_board", "parts"} <= set(HARD_KINDS))

print("\n[5] Цена первого предложения: только ниже цены лота и не выше цели выкупа")
r = review_lot(**lot(), llm_call=llm({"problems": [], "bargain": {"open_price": 70000}}))
check("выше цены лота → не предлагаем", r.open_price is None)
r = review_lot(**lot(price=66000), llm_call=llm({"problems": [], "bargain": {"open_price": 64000}}))
check("выше цели выкупа → срезаем до цели", r.open_price == 62000)
r = review_lot(**lot(), llm_call=llm({"problems": [], "bargain": {"open_price": "55 000"}}))
check("строка «55 000» понимается", r.open_price == 55000)

print("\n[6] Нет ответа, мусор, нет описания → разбора нет, лот идёт как раньше")
check("LLM вернул None", review_lot(**lot(), llm_call=llm(None)) is None)
check("LLM вернул не JSON", review_lot(**lot(), llm_call=llm("не знаю")) is None)
check("LLM упал", review_lot(**lot(), llm_call=lambda m, max_tokens=600: 1 / 0) is None)

print("\n[6b] Описание не прочитано → разбор по заголовку: новый/б/у и признаки фейка")
r = review_lot(**lot(desc="", title="Apple MacBook Air 13 M5 16/512 новый, чек"), llm_call=llm({
    "problems": [{"kind": "liquid", "severity": "hard", "quote": "был залит чаем"}],
    "listing": "new", "fake_signals": ["цена ниже рынка на 20%"],
}))
check("разбор по заголовку получен", r is not None and r.title_only)
check("дефект, которого нет в заголовке, не засчитан", not r.is_reject)
check("новый распознан", r.is_new is True)
b = format_block(r)
check("в блоке сказано, что разбор по заголовку", "по заголовку" in b)
check("в блоке пометка «новый»", "🆕" in b)
check("в блоке признаки фейка", "Признаки фейка" in b and "ниже рынка на 20%" in b)
check("без описания не обещаем «проблем нет»", "проблем в описании нет" not in b)
r = review_lot(**lot(desc="", title="MacBook Air M2 разбит экран"), llm_call=llm({
    "problems": [{"kind": "screen_crack", "severity": "hard", "quote": "разбит экран"}], "listing": "used"}))
check("дефект в самом заголовке → отсев и без описания", r.is_reject and r.is_new is False)

print("\n[7] Блок в алерте")
r = review_lot(**lot(), llm_call=llm({
    "problems": [{"kind": "cosmetic", "severity": "minor", "quote": "царапина на крышке"}],
    "bargain": {"signals": ["срочно <переезд>"], "open_price": 52000},
    "action": "Звонить <b>сразу</b>",
}))
b = format_block(r)
check("заголовок блока", b.startswith("🧠 <b>Разбор DeepSeek</b>"))
check("HTML из ответа экранирован", "&lt;b&gt;сразу&lt;/b&gt;" in b and "&lt;переезд&gt;" in b)
check("цена предложения с пробелом-разделителем", "52 000 ₽" in b)
check("мелочь показана", "царапина на крышке" in b)
check("пустой разбор → пустой блок", format_block(None) == "")

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты разбора DeepSeek прошли")
