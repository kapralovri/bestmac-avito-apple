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


print("\n[9] collector_status_text — статус домашнего коллектора")
_sd = tmp.parent
_rx = _sd / "intake-stats.json"
_pr = _sd / "intake-proc-stats.json"
_now = 1_000_000.0
_rx.write_text(_json.dumps({
    "last_at": _now - 120,                                  # 2 мин назад → 🟢
    "recent": [[_now - 100, 50], [_now - 7200, 40], [_now - 100000, 20]],
}))
_pr.write_text(_json.dumps({
    "last_run_at": _now - 60, "last_cards": 58, "last_candidates": 2,
    "last_alerts": 1, "alerts_total": 3, "last_alert_at": _now - 200,
}))
_st = botmod.collector_status_text(now=_now, intake_stats=_rx, proc_stats=_pr)
check("вердикт 🟢 при свежей отправке", "🟢" in _st)
check("окно 1ч = 50", "за 1ч — 50" in _st)
check("окно 24ч = 90", "за 24ч — 90" in _st)
check("показан разбор 58 карт", "58 карт" in _st)
check("алертов всего 3", "Алертов всего: 3" in _st)
_st2 = botmod.collector_status_text(now=_now, intake_stats=_sd / "nope1.json", proc_stats=_sd / "nope2.json")
check("нет данных → 🔴 молчит", "🔴" in _st2 and "молчит" in _st2)
_rx.write_text(_json.dumps({"last_at": _now - 5000, "recent": []}))   # >1ч назад
_st3 = botmod.collector_status_text(now=_now, intake_stats=_rx, proc_stats=_sd / "nope2.json")
check("отправка >1ч назад → 🔴", "🔴" in _st3)


print("\n[10] /модель — GST-72 живой поиск по модели")
botmod.MODELS_CONFIG_FILE = tmp / "models-config.json"  # фикстура, не реальный каталог
botmod.MODELS_CONFIG_FILE.write_text(_json.dumps({"entries": [
    {"family": "MacBook", "model_name": "MacBook Air 13 (2020, M1)",
     "url": "https://www.avito.ru/moskva_i_mo/noutbuki/noutbuki/test-m1"},
]}), encoding="utf-8")
bot2 = NegotiationBot(DummyTx(), state_path=tmp / "state2.json", queue_path=tmp / "queue2.json",
                      owner_chat_id=777, llm_call=fake_llm)
acts = bot2.handle_update({"update_id": 90, "message": {"chat": {"id": 777}, "text": "/модель"}})
_sent90 = find_send(acts)
check("без аргумента — визард с кнопками семей",
      len(_sent90) == 1 and _sent90[0].get("buttons") and len(_sent90[0]["buttons"]) == 4)

_prev_token = botmod.GH_DISPATCH_TOKEN
botmod.GH_DISPATCH_TOKEN = ""
acts = bot2.handle_update({"update_id": 91, "message": {
    "chat": {"id": 777}, "text": "/модель MacBook Pro 14 M3 Pro 18/512"}})
check("без GH_DISPATCH_TOKEN — понятная ошибка, не падает",
      any("GH_DISPATCH_TOKEN" in a.get("text", "") for a in find_send(acts)))
check("свободный текст без точного совпадения — без ссылки на мониторинг",
      not any("мониторить" in a.get("text", "") for a in find_send(acts)))

print("[10b] /модель — точное совпадение с конфигурацией → ссылка на мониторинг")
acts = bot2.handle_update({"update_id": 92, "message": {
    "chat": {"id": 777}, "text": "/модель macbook air 13 2020 m1"}})
sent = find_send(acts)
check("два сообщения: ссылка на мониторинг + живой поиск", len(sent) == 2)
check("есть точная ссылка на Avito", any("test-m1" in a.get("text", "") for a in sent))
check("объяснено про расширение", any("BestMac Collector" in a.get("text", "") for a in sent))
botmod.GH_DISPATCH_TOKEN = _prev_token

print("\n[10c] /модель — визард кнопками: семья → модель → конфиг (2 конфига)")
botmod.PARSER_CONFIG_FILE = tmp / "parser-config.json"
botmod.PARSER_CONFIG_FILE.write_text(_json.dumps({"tabs": {
    "MacBook": {"mode": "direct", "entries": [
        {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 8, "ssd": 256,
         "url": "https://www.avito.ru/x/8-256", "buyout_price": 30000},
        {"model": "MacBook Air 13 (2020, M1)", "processor": "Apple M1", "ram": 16, "ssd": 256,
         "url": "https://www.avito.ru/x/16-256"},
    ]},
    "iMac": {"mode": "discovery", "entries": [
        {"model": "imac 24", "processor": "m1", "url": "https://www.avito.ru/x/imac-m1"},
    ]},
}}), encoding="utf-8")


def cb(uid, data):
    return bot2.handle_update({"update_id": uid, "callback_query": {
        "id": f"cb{uid}", "data": data, "message": {"chat": {"id": 777}}}})


acts = cb(93, "mw:fam:0")  # MacBook
sent = find_send(acts)
check("шаг 2: список моделей MacBook", len(sent) == 1 and len(sent[0].get("buttons", [])) == 1)
check("кнопка модели ведёт на mw:mdl:0:0", sent[0]["buttons"][0][0][1] == "mw:mdl:0:0")

acts = cb(94, "mw:mdl:0:0")  # MacBook Air 13 (2020, M1) — 2 конфига
sent = find_send(acts)
check("шаг 3: список конфигов (2 варианта)", len(sent) == 1 and len(sent[0].get("buttons", [])) == 2)

acts = cb(95, "mw:cfg:0:0:0")  # 8/256, с выкупом
sent = find_send(acts)
check("финал: ссылка на конкретный конфиг", any("8-256" in a.get("text", "") for a in sent))
check("выкуп показан", any("Выкуп" in a.get("text", "") for a in sent))

print("[10d] /модель — визард: модель с 1 конфигом сразу даёт ссылку (без лишнего шага)")
acts = cb(96, "mw:fam:1")  # iMac
sent = find_send(acts)
acts = cb(97, "mw:mdl:1:0")  # imac 24 — единственный конфиг
sent = find_send(acts)
check("1 конфиг → сразу ссылка, без промежуточной клавиатуры",
      len(sent) == 1 and not sent[0].get("buttons") and "imac-m1" in sent[0]["text"])

print("[10e] /модель — визард: устаревший callback не роняет бота")
acts = cb(98, "mw:cfg:9:9:9")
check("некорректный индекс — вежливая ошибка, не исключение",
      any("начните заново" in a.get("text", "") for a in find_send(acts)))

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты бота прошли")
