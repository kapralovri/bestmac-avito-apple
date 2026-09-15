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

print("\n[2] Новый лид из очереди — карточка «Лид на торг» отключена (GST-72)")
queue_path.write_text(json.dumps([{
    "id": "testlead1", "title": "MacBook Air M2 8/256", "asking": 70000,
    "target": 58000, "walk_away": 62000, "location": "Москва",
    "url": "https://avito.ru/x", "motivation_label": "🟡 умеренно мотивирован",
    "motivation_signals": ["висит 20 дн"], "history": [],
}], ensure_ascii=False), encoding="utf-8")
acts = bot.pull_new_leads()
check("карточка НЕ отправляется (не приносила пользы — отключена)", find_send(acts) == [])
check("conversation всё же создан (чтобы /веду-торг флоу не сломался, если вернём)",
      "testlead1" in bot.state["conversations"])

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
_btns10d = [cbd for row in (sent[0].get("buttons") or []) for _, cbd in row]
check("1 конфиг → сразу ссылка, без промежуточного выбора конфигурации",
      len(sent) == 1 and "imac-m1" in sent[0]["text"]
      and not any(cbd.startswith("mw:cfg:") for cbd in _btns10d))
check("и на этом экране тоже можно подписаться",
      any(cbd.startswith("sub:new:") for cbd in _btns10d))

print("[10e] /модель — визард: устаревший callback не роняет бота")
acts = cb(98, "mw:cfg:9:9:9")
check("некорректный индекс — вежливая ошибка, не исключение",
      any("начните заново" in a.get("text", "") for a in find_send(acts)))

# ─── 11. GST-73: выключатель мертвеца для домашнего коллектора ──────────────
# Браузерный сторож умирает вместе с Chrome; о том, что коллектор замолчал,
# достоверно может сообщить только сервер.
print("\n[11] Коллектор молчит — серверный алерт")
from bot import collector_deadman, in_quiet_hours

MIN = 60
_DAY = 14   # рабочий час, не тихие часы

check("тихие часы: 23:00 внутри окна 23→9", in_quiet_hours(23, 23, 9))
check("тихие часы: 03:00 внутри окна 23→9", in_quiet_hours(3, 23, 9))
check("тихие часы: 14:00 снаружи окна 23→9", not in_quiet_hours(14, 23, 9))
check("тихие часы отключаются равными границами", not in_quiet_hours(5, 0, 0))

_st = {}
_txt, _patch = collector_deadman(now=1000 * MIN, last_at=999 * MIN, state=_st, hour=_DAY)
check("свежая отправка → молчим", _txt is None)

_txt, _patch = collector_deadman(now=1000 * MIN, last_at=900 * MIN, state=_st, hour=_DAY)
check("молчит 100 мин → алерт", _txt is not None and "молчит" in _txt)
check("алерт помечает состояние «лежит»", _patch.get("collector_down") is True)
_st.update(_patch)

_txt, _patch = collector_deadman(now=1001 * MIN, last_at=900 * MIN, state=_st, hour=_DAY)
check("повтор в кулдаун не шлётся", _txt is None)

_txt, _patch = collector_deadman(now=1200 * MIN, last_at=900 * MIN, state=_st, hour=_DAY)
check("после кулдауна напоминает", _txt is not None)
_st.update(_patch)

_txt, _patch = collector_deadman(now=1300 * MIN, last_at=1299 * MIN, state=_st, hour=_DAY)
check("коллектор ожил → сообщение о восстановлении", _txt is not None and "снова" in _txt)
check("состояние «лежит» снято", _patch.get("collector_down") is False)
_st.update(_patch)

_txt, _patch = collector_deadman(now=1301 * MIN, last_at=1299 * MIN, state=_st, hour=_DAY)
check("после восстановления не спамит", _txt is None)

_txt, _patch = collector_deadman(now=1000 * MIN, last_at=900 * MIN, state={}, hour=2)
check("ночью молчание — норма, не будим", _txt is None)

_txt, _patch = collector_deadman(now=1000 * MIN, last_at=None, state={}, hour=_DAY)
check("коллектор ни разу не запускался → не будим", _txt is None)

# ─── 12. GST-73: подписки «модель + моя цена» ────────────────────────────────
print("\n[12] Подписки: визард → цена → список → удаление")
from common.subscriptions import load_subscriptions

_subs_path = tmp / "subscriptions.json"
botmod.SUBSCRIPTIONS_FILE = _subs_path
_uid = [900]


def msg(chat, text):
    _uid[0] += 1
    return bot2.handle_update({"update_id": _uid[0],
                               "message": {"chat": {"id": chat}, "text": text}})

acts = msg(777, "/подписки")
check("пустой список — понятное сообщение",
      any("подписок" in a.get("text", "").lower() for a in find_send(acts)))

# Кнопка «🔔 Следить» живёт на экране выбранной конфигурации визарда /модель.
acts = cb(777, "mw:fam:0")
acts = cb(777, "mw:mdl:0:0")
_cfg_screen = cb(777, "mw:cfg:0:0:0")
_btns = [b for a in find_send(_cfg_screen) for row in (a.get("buttons") or []) for b in row]
check("на экране конфигурации есть кнопка подписки",
      any(cbd.startswith("sub:new:") for _, cbd in _btns))

acts = cb(777, "sub:new:0:0:0")
check("бот спрашивает цену", any("цену" in a.get("text", "").lower() for a in find_send(acts)))

acts = msg(777, "не число")
check("мусорный ввод — вежливая просьба, не создание подписки",
      any("цен" in a.get("text", "").lower() for a in find_send(acts)))
check("подписка пока не создана", load_subscriptions(_subs_path) == {})

acts = msg(777, "45 000")
_saved = load_subscriptions(_subs_path)
check("подписка создана", len(_saved) == 1)
_sub = list(_saved.values())[0]
check("цена разобрана с пробелами", _sub["max_price"] == 45000)
check("критерии заполнены из каталога", bool(_sub["match"].get("family")))
check("подтверждение отправлено",
      any("45 000" in a.get("text", "").replace(" ", " ") for a in find_send(acts)))

acts = msg(777, "обычный текст")
check("режим ожидания цены снят", not any("цену" in a.get("text", "").lower()
                                          for a in find_send(acts)))

acts = msg(777, "/подписки")
_sends = find_send(acts)
check("подписка видна в списке", any(_sub["model"] in a.get("text", "") for a in _sends))
_del = [cbd for a in _sends for row in (a.get("buttons") or []) for _, cbd in row
        if cbd.startswith("sub:del:")]
check("у подписки есть кнопка удаления", bool(_del))

acts = cb(777, _del[0])
check("подписка удалена", load_subscriptions(_subs_path) == {})

# Отмена ввода цены не должна оставлять бота в залипшем режиме.
cb(777, "sub:new:0:0:0")
acts = msg(777, "/отмена")
check("ввод цены отменяется", any("отмен" in a.get("text", "").lower() for a in find_send(acts)))
acts = msg(777, "77000")
check("после отмены число не создаёт подписку", load_subscriptions(_subs_path) == {})

# Разбор цены: число из фразы — не бюджет на Mac.
from bot import parse_price
check("«45 000» → 45000", parse_price("45 000") == 45000)
check("«45к» → 45000", parse_price("45к") == 45000)
check("«45000₽» → 45000", parse_price("45000₽") == 45000)
check("«MacBook Air 13» не цена", parse_price("MacBook Air 13") is None)
check("грош не цена", parse_price("50") is None)
check("пустой ввод не цена", parse_price("") is None)

# Команда во время ожидания цены не должна залипать в этом режиме.
cb(777, "sub:new:0:0:0")
acts = msg(777, "/подписки")
check("команда вырывает из режима ввода цены",
      any("Активных подписок нет" in a.get("text", "") for a in find_send(acts)))
acts = msg(777, "50000")
check("после команды число уже не создаёт подписку", load_subscriptions(_subs_path) == {})

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты бота прошли")
