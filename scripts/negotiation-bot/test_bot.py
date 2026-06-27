#!/usr/bin/env python3
"""
Офлайн-тесты маршрутизации бота переговоров (без сети/токена).
handle_update / pull_new_leads — чистые: возвращают список действий, который
в проде исполняет транспорт. Здесь проверяем действия и переходы состояния.

Запуск:  python3 scripts/negotiation-bot/test_bot.py
"""
import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent))          # negotiation-bot/

from bot import NegotiationBot

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


def find_send(actions):
    return [a for a in actions if a.get("type") == "send"]


# Фейковый LLM: открытие vs закрытие сделки
def fake_llm(messages):
    user = messages[-1]["content"]
    if "это первое сообщение" in user:
        return ('{"message":"Здравствуйте! Интересует ваш макбук, готов 58000 ₽ сразу.",'
                '"stage":"opening","deal_ready":false,"agreed_price":null,'
                '"motivation":"","rationale":"якорь"}')
    return ('{"message":"Отлично, 60000 беру, заберу сегодня!","stage":"deal_ready",'
            '"deal_ready":true,"agreed_price":60000,"motivation":"переезд","rationale":"в потолке"}')


tmp = Path(tempfile.mkdtemp())
state_path = tmp / "state.json"
queue_path = tmp / "queue.json"


class DummyTx:
    pass


bot = NegotiationBot(DummyTx(), state_path=state_path, queue_path=queue_path,
                     owner_chat_id=None, llm_call=fake_llm)

print("\n[1] /start регистрирует владельца")
acts = bot.handle_update({"update_id": 1, "message": {"chat": {"id": 555}, "text": "/start"}})
check("на /start есть приветствие", any("подключён" in a.get("text", "") for a in find_send(acts)))
check("owner_chat_id сохранён", str(bot.state["owner_chat_id"]) == "555")

print("\n[2] Новый лид из очереди постится с кнопкой")
queue_path.write_text(json.dumps([{
    "id": "testlead1", "title": "MacBook Air M2 8/256", "asking": 70000,
    "target": 58000, "walk_away": 62000, "location": "Москва",
    "url": "https://avito.ru/x", "motivation_label": "🟡 умеренно мотивирован",
    "motivation_signals": ["висит 20 дн"], "history": [],
}], ensure_ascii=False), encoding="utf-8")
acts = bot.pull_new_leads()
sends = find_send(acts)
check("лид запостен", len(sends) == 1 and "Лид на торг" in sends[0]["text"])
check("есть кнопка «Веду торг»", any("lead:testlead1:start" in d for row in sends[0]["buttons"] for (_, d) in row))
check("conversation создан", "testlead1" in bot.state["conversations"])

print("\n[3] «Веду торг» → открывающее сообщение")
acts = bot.handle_update({"update_id": 2, "callback_query": {
    "id": "cb1", "data": "lead:testlead1:start", "message": {"chat": {"id": 555}}}})
sends = find_send(acts)
check("есть answer_callback", any(a.get("type") == "answer_callback" for a in acts))
check("прислан текст продавцу", sends and "Отправь продавцу" in sends[0]["text"])
check("active_lead установлен", bot.state["active_lead"] == "testlead1")
check("есть кнопка «Отправил»", any("conv:testlead1:sent" in d for row in sends[0]["buttons"] for (_, d) in row))

print("\n[4] «Отправил» → просьба переслать ответ")
acts = bot.handle_update({"update_id": 3, "callback_query": {
    "id": "cb2", "data": "conv:testlead1:sent", "message": {"chat": {"id": 555}}}})
check("просит переслать ответ", any("Перешли" in a.get("text", "") for a in find_send(acts)))

print("\n[5] Пересланный ответ продавца → сделка готова")
acts = bot.handle_update({"update_id": 4, "message": {"chat": {"id": 555}, "text": "давай за 60000"}})
sends = find_send(acts)
check("объявлена готовность к сделке", sends and "ГОТОВ К СДЕЛКЕ" in sends[0]["text"])
check("в сделке зафиксирована цена 60 000", sends and "60 000" in sends[0]["text"])
check("active_lead сброшен", bot.state["active_lead"] is None)
check("стадия diалога = deal_ready", bot.state["conversations"]["testlead1"]["stage"] == "deal_ready")

print("\n[6] Чужой чат игнорируется")
acts = bot.handle_update({"update_id": 5, "message": {"chat": {"id": 999}, "text": "привет"}})
check("сообщение чужого не обрабатывается", find_send(acts) == [])

print("\n[7] Текст без активного диалога → подсказка")
acts = bot.handle_update({"update_id": 6, "message": {"chat": {"id": 555}, "text": "60000"}})
check("подсказка про «Веду торг»", any("Веду торг" in a.get("text", "") for a in find_send(acts)))

print("\n[8] ⭐ Слежу → запись в вотчлист; 👎 → удаление")
import bot as botmod
import json as _json
botmod.WATCHLIST_FILE = tmp.parent / "watchlist.json"
if botmod.WATCHLIST_FILE.exists():
    botmod.WATCHLIST_FILE.unlink()
acts = bot.handle_update({"update_id": 7, "callback_query": {"id": "w1", "data": "lead:testlead1:watch", "message": {"chat": {"id": 555}}}})
check("⭐ ответ «Слежу»", any("Слежу" in a.get("text", "") for a in find_send(acts)))
wl = _json.loads(botmod.WATCHLIST_FILE.read_text()) if botmod.WATCHLIST_FILE.exists() else {}
check("лот добавлен в вотчлист", any("avito.ru/x" in u for u in wl))
check("в записи есть watch_price и added_at", bool(wl) and all(k in list(wl.values())[0] for k in ("watch_price", "added_at")))
acts = bot.handle_update({"update_id": 8, "callback_query": {"id": "s1", "data": "lead:testlead1:skip", "message": {"chat": {"id": 555}}}})
check("👎 ответ «Не интересно»", any("Не интересно" in a.get("text", "") for a in find_send(acts)))
wl2 = _json.loads(botmod.WATCHLIST_FILE.read_text()) if botmod.WATCHLIST_FILE.exists() else {}
check("👎 убрал лот из вотчлиста", not any("avito.ru/x" in u for u in wl2))


print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты бота прошли")
