#!/usr/bin/env python3
"""
Офлайн-тесты quote-бота: движок оценки + FSM-поток (без сети/токена).
Запуск:  python3 scripts/quote-bot/test_quote.py
"""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from quote_engine import load_catalog, estimate
from bot import QuoteBot

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


cat = load_catalog(str(ROOT / "public/data/avito-prices.json"),
                   str(ROOT / "public/data/buyout.json"))

# ─── 1. Движок оценки ─────────────────────────────────────────────────────────
print("\n[1] Движок оценки")
MODEL = "MacBook Air 13 (2020, M1)"
check("каталог загрузился (есть семейства)", len(cat.families) >= 1)
check("MacBook Air присутствует", "MacBook Air" in cat.families)
check("базовая цена Air M1 8/256 = 27000 (из buyout.json)", cat.base_price(MODEL, 8, 256) == 27000)

qA = estimate(cat, MODEL, 8, 256, condition="A")
check("грейд A: вилка вокруг базы", qA.low == 25650 and qA.high == 28350)
qB = estimate(cat, MODEL, 8, 256, condition="B")
check("грейд B ниже грейда A", qB.high < qA.low + 1 and qB.base == 27000)
qNoCharger = estimate(cat, MODEL, 8, 256, condition="A", has_charger=False)
check("без зарядки дешевле на ~1500", qNoCharger.high < qA.high)
qIcloud = estimate(cat, MODEL, 8, 256, condition="A", icloud_blocked=True)
check("iCloud привязан → 0", qIcloud.low == 0 and qIcloud.high == 0)
qMissing = estimate(cat, "Несуществующая модель", 8, 256)
check("нет в каталоге → found=False", qMissing.found is False)


# ─── 2. FSM-поток до заявки ────────────────────────────────────────────────────
print("\n[2] FSM: путь до заявки")

tmp = Path(tempfile.mkdtemp()) / "qs.json"
LEADS = "999000"
bot = QuoteBot(transport=object(), catalog=cat, state_path=tmp,
               leads_chat=LEADS, bot_username="bestmac_quote_bot", referral_bonus="2000")
CHAT = 555


def sends(acts):
    return [a for a in acts if a["t"] in ("send", "edit_or_send")]


def pick(chat, substr):
    """находит callback для опции по подстроке из текущего меню пользователя"""
    u = bot.users[str(chat)]
    for i, opt in enumerate(u["_menu"]):
        if substr.lower() in opt.lower():
            # определяем префикс по шагу
            return i
    return None


# /start с реферралом
acts = bot.handle_update({"update_id": 1, "message": {"chat": {"id": CHAT}, "text": "/start ref_42"}})
check("на /start есть приветствие с кнопкой", any("Оценить" in s["text"] for s in sends(acts)))
check("реферал захвачен", bot.users[str(CHAT)]["ref"] == "42")

# Оценить → семейство
acts = bot.handle_update({"update_id": 2, "callback_query": {"id": "1", "data": "go:family", "message": {"chat": {"id": CHAT}}}})
fi = pick(CHAT, "MacBook Air")
check("меню семейств содержит MacBook Air", fi is not None)
acts = bot.handle_update({"update_id": 3, "callback_query": {"id": "2", "data": f"f:{fi}", "message": {"chat": {"id": CHAT}}}})
mi = pick(CHAT, "(2020, M1)")
check("меню моделей содержит Air M1 2020", mi is not None)
acts = bot.handle_update({"update_id": 4, "callback_query": {"id": "3", "data": f"m:{mi}", "message": {"chat": {"id": CHAT}}}})
ri = pick(CHAT, "8 ГБ")
check("меню RAM содержит 8 ГБ", ri is not None)
acts = bot.handle_update({"update_id": 5, "callback_query": {"id": "4", "data": f"r:{ri}", "message": {"chat": {"id": CHAT}}}})
si = pick(CHAT, "256")
check("меню SSD содержит 256", si is not None)
acts = bot.handle_update({"update_id": 6, "callback_query": {"id": "5", "data": f"s:{si}", "message": {"chat": {"id": CHAT}}}})
check("после SSD спрашивает состояние", any("состояние" in s["text"].lower() for s in sends(acts)))
acts = bot.handle_update({"update_id": 7, "callback_query": {"id": "6", "data": "c:A", "message": {"chat": {"id": CHAT}}}})
check("экран комплекта показывает вилку ₽", any("₽" in s["text"] for s in sends(acts)))

# фото в процессе
acts = bot.handle_update({"update_id": 8, "message": {"chat": {"id": CHAT}, "photo": [{"file_id": "AAA"}]}})
check("фото принято", any("Фото добавлено" in s["text"] for s in sends(acts)))

# тоггл «без зарядки» пересчитывает
acts = bot.handle_update({"update_id": 9, "callback_query": {"id": "7", "data": "tg:charger", "message": {"chat": {"id": CHAT}}}})
check("тоггл зарядки → пересчёт (есть ₽)", any("₽" in s["text"] for s in sends(acts)))

# к заявке → контакт
acts = bot.handle_update({"update_id": 10, "callback_query": {"id": "8", "data": "go:contact", "message": {"chat": {"id": CHAT}}}})
check("просит оставить номер", any("номер" in s["text"].lower() for s in sends(acts)))
check("шаг = contact", bot.users[str(CHAT)]["step"] == "contact")

# отправка контакта → заявка
acts = bot.handle_update({"update_id": 11, "message": {"chat": {"id": CHAT}, "from": {"first_name": "Иван"},
                          "contact": {"phone_number": "+79990000000", "first_name": "Иван"}}})
leads = [a for a in acts if a["t"] == "send" and a["chat"] == LEADS]
check("заявка ушла в LEADS-чат", len(leads) == 1 and "ЗАЯВКА НА ВЫКУП" in leads[0]["text"])
check("в заявке есть телефон", "+79990000000" in leads[0]["text"])
check("в заявке учтено фото (1)", "Фото: 1" in leads[0]["text"])
check("в заявке отмечен реферал 42", "42" in leads[0]["text"])
photo_fwd = [a for a in acts if a["t"] == "photo" and a["chat"] == LEADS]
check("фото переслано оценщику", len(photo_fwd) == 1)
client_msg = [a for a in acts if a["t"] == "send" and a["chat"] == CHAT]
check("клиенту — подтверждение + реф-ссылка", any("Заявка принята" in s["text"] and "ref_" in s["text"] for s in client_msg))


print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты quote-бота прошли")
