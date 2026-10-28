#!/usr/bin/env python3
"""Офлайн-тесты слежения за фильтром Авито (docs/avito-filter-watch.md).

Запуск:  python3 scripts/common/test_url_watches.py
"""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.url_watches import (                                   # noqa: E402
    normalize_url, parse_filter_command, make_watch, find_watch, decide,
    load_watches, save_watches, merge_state, watch_urls, alert_text,
    MAX_WATCHES, RATE_PER_HOUR,
)

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


OWNER = ("https://www.avito.ru/moskva_i_mo/avtomobili/s_probegom-ASgBAgICAUSGFMjmAQ?cd=1"
         "&context=H4sIAAAAAAAA_wF0AIv&f=ASgBAQECAkSGFMjmAfrwD&localPriority=0&s=104")

print("\n[1] Нормализация ссылки")
n = normalize_url(OWNER)
check("ссылка владельца принята", n is not None)
url, key = n
check("служебные context/cd/localPriority убраны", all(x not in url for x in ("context=", "cd=", "localPriority=")))
check("фильтр f и сортировка s=104 сохранены", "f=ASgBAQECAkSGFMjmAfrwD" in url and "s=104" in url)
u2, _ = normalize_url("https://www.avito.ru/moskva/avtomobili?q=camry&p=3")
check("нет сортировки → s=104, номер страницы убран", "s=104" in u2 and "p=3" not in u2)
u3, _ = normalize_url("https://www.avito.ru/moskva/avtomobili?q=camry&s=1")
check("другая сортировка → заменена на s=104", "s=104" in u3 and "s=1&" not in u3 + "&")
check("m.avito.ru → www", normalize_url("https://m.avito.ru/moskva/avtomobili?q=camry")[0].startswith("https://www.avito.ru/"))
check("не Авито → None", normalize_url("https://auto.ru/cars/") is None)
check("мусор → None", normalize_url("привет") is None)
_, k_a = normalize_url(OWNER)
_, k_b = normalize_url(OWNER.replace("cd=1&", "") + "&p=2")
check("одна вкладка — один ключ, как бы ни менялись служебные параметры", k_a == k_b)

print("\n[2] Команда /filter")
cmd = parse_filter_command(f"/filter {OWNER} до 5000000 Камри")
check("ссылка, цена и название", cmd and cmd["max_price"] == 5000000 and cmd["label"] == "Камри")
cmd = parse_filter_command(f"/filter {OWNER} до 5,5 млн")
check("«5,5 млн» понимается", cmd and cmd["max_price"] == 5500000 and cmd["label"] == "")
cmd = parse_filter_command(f"/filter {OWNER}")
check("без цены и названия", cmd and cmd["max_price"] is None and cmd["label"] == "")
check("без ссылки → None", parse_filter_command("/filter до 100") is None)

print("\n[3] Реестр и сопоставление вкладки")
tmp = Path(tempfile.mkdtemp()) / "w.json"
w = make_watch(chat_id=1, url=OWNER, max_price=5000000, label="Камри")
save_watches({w["id"]: w}, tmp)
ws = load_watches(tmp)
check("фильтр сохранён и прочитан", w["id"] in ws and ws[w["id"]]["label"] == "Камри")
check("список URL для расширения", watch_urls(ws) == [ws[w["id"]]["url"]])
check("вкладка с тем же фильтром (другие служебные параметры) находится",
      find_watch(ws, OWNER.replace("cd=1", "cd=0") + "&p=1") is not None)
check("чужая вкладка не находится", find_watch(ws, "https://www.avito.ru/all/noutbuki?q=macbook&s=104") is None)
check("пустой source_url не находится", find_watch(ws, "") is None)
check("без названия → «Фильтр»", make_watch(chat_id=1, url=OWNER, max_price=None, label="")["label"].startswith("Фильтр"))
check("лимит фильтров", MAX_WATCHES == 10)

print("\n[4] Решение по карточке")
NOW = 1_800_000_000
w = make_watch(chat_id=1, url=OWNER, max_price=5000000, label="Камри")
c1 = {"url": "https://www.avito.ru/a/1", "title": "Camry", "price": 4500000}
check("первая пачка — базовая линия, молча", decide(w, c1, NOW, baseline=True) == "baseline")
check("…и запомнена", c1["url"] in w["seen"])
check("повтор — пропуск", decide(w, c1, NOW, baseline=False) == "seen")
c2 = {"url": "https://www.avito.ru/a/2", "title": "Camry", "price": 4600000}
check("новое ниже потолка — отправить", decide(w, c2, NOW, baseline=False) == "send")
c3 = {"url": "https://www.avito.ru/a/3", "title": "Camry", "price": 5100000}
check("дороже потолка — молча", decide(w, c3, NOW, baseline=False) == "over_price")
w2 = make_watch(chat_id=1, url=OWNER, max_price=None, label="")
res = [decide(w2, {"url": f"https://www.avito.ru/b/{i}", "title": "x", "price": 1}, NOW + i, baseline=False)
       for i in range(RATE_PER_HOUR + 3)]
check(f"не больше {RATE_PER_HOUR} в час", res.count("send") == RATE_PER_HOUR)
check("первое превышение — одно предупреждение", res.count("rate_warn") == 1 and res.count("rate_limited") == 2)
check("через час — снова шлём",
      decide(w2, {"url": "https://www.avito.ru/b/x", "title": "x", "price": 1}, NOW + 3700, baseline=False) == "send")
check("seen ограничен", len(make_watch(chat_id=1, url=OWNER, max_price=None, label="")["seen"]) == 0)

print("\n[5] Слияние с диском: бот мог удалить или добавить фильтр за время прогона")
disk = {"keep": {"id": "keep", "seen": [], "baseline_done": False, "sent_log": []},
        "new": {"id": "new", "seen": [], "baseline_done": False, "sent_log": []}}
ours = {"keep": {"id": "keep", "seen": ["u"], "baseline_done": True, "sent_log": [1]},
        "gone": {"id": "gone", "seen": ["v"], "baseline_done": True, "sent_log": []}}
m = merge_state(ours, disk)
check("состояние перенесено на существующий фильтр", m["keep"]["seen"] == ["u"] and m["keep"]["baseline_done"])
check("удалённый ботом фильтр не воскрешён", "gone" not in m)
check("добавленный ботом фильтр сохранён", "new" in m)

print("\n[6] Текст сообщения")
t = alert_text(make_watch(chat_id=1, url=OWNER, max_price=None, label="Камри <b>"),
               {"url": "https://www.avito.ru/a/9", "title": "Toyota Camry <2019>", "price": 4450000})
check("машина — 🚗", t.startswith("🚗"))
check("название и заголовок экранированы", "Камри &lt;b&gt;" in t and "Camry &lt;2019&gt;" in t)
check("цена с пробелами", "4 450 000 ₽" in t)
check("ссылка на объявление", "https://www.avito.ru/a/9" in t)
t2 = alert_text(make_watch(chat_id=1, url="https://www.avito.ru/moskva/kvartiry?q=x", max_price=None, label="Квартиры"),
                {"url": "https://www.avito.ru/k/1", "title": "2-к", "price": 100})
check("не машина — 🔎", t2.startswith("🔎"))

print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты фильтров прошли")
