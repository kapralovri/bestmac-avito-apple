#!/usr/bin/env python3
"""
Офлайн-тесты логики детектора (без сети/браузера/капчи).
Покрывают: анализ состояния, робастную статистику рынка, оценку сделки и скоринг.

Запуск:  python3 scripts/hot-deals-scanner/test_logic.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent))          # hot-deals-scanner/

from common.condition import analyze_condition
from common.market import robust_stats, assess_deal
# scanner_v2 импортирует playwright только в __main__, score_deal — модульная функция
from scanner_v2 import (score_deal, live_key, parse_generated_at, should_alert_stale,
                        MIN_MARGIN, SCAM_FLOOR)
from common.classifier import classify
from common.negotiator import motivation_score, next_move
from datetime import datetime, timedelta
import json as _json

_fails = []


def check(name, cond):
    print(("  ✅ " if cond else "  ❌ ") + name)
    if not cond:
        _fails.append(name)


# ─── 1. Анализ состояния ─────────────────────────────────────────────────────
print("\n[1] Состояние (condition)")

r = analyze_condition("MacBook Air M2, идеальное состояние, на гарантии, чек и коробка")
check("чистый+гарантия → ok", r.verdict == "ok")
check("чистый → положительный вклад", r.score_delta > 0)
check("позитивные сигналы пойманы", len(r.positives) >= 1)

r = analyze_condition("MacBook Pro 16, аккумулятор вздулся, нужна замена")
check("вздутая батарея → reject", r.verdict == "reject")

r = analyze_condition("iMac 24, не включается, на запчасти")
check("не включается / запчасти → reject", r.verdict == "reject")

r = analyze_condition("MacBook, привязан к iCloud, обход активации")
check("iCloud-привязка → reject", r.verdict == "reject")

r = analyze_condition("MacBook Air, состояние хорошее, акб 88%, 130 циклов")
check("АКБ 88% / 130 циклов → ok", r.verdict == "ok")
check("здоровье АКБ распознано", r.battery_health == 88)
check("циклы распознаны", r.cycles == 130)

r = analyze_condition("MacBook Pro, ёмкость аккумулятора 74%")
check("АКБ 74% → reject (< порога 80)", r.verdict == "reject")

r = analyze_condition("MacBook Air, акб 83%")
check("АКБ 83% → suspect (80..84)", r.verdict == "suspect")

r = analyze_condition("MacBook Pro, есть царапины на крышке, небольшая вмятина")
check("косметика → suspect", r.verdict == "suspect")

r = analyze_condition("Mac Studio M2 Max, 1200 циклов")
check("1200 циклов → reject (> 1000)", r.verdict == "reject")

r = analyze_condition("MacBook Pro 14, меняли матрицу")
check("замена матрицы → reject", r.verdict == "reject")

r = analyze_condition("Macbook pro 14 m1pro 16/512 минус дисплей")
check("«минус дисплей» → reject", r.verdict == "reject")

r = analyze_condition("MacBook Air, без экрана, на корпус")
check("«без экрана» → reject", r.verdict == "reject")

r = analyze_condition("MacBook Pro 13 M1, под восстановление, не включается")
check("«под восстановление» → reject", r.verdict == "reject")
r = analyze_condition("iMac 27, аппарат на восстановление")
check("«на восстановление» → reject", r.verdict == "reject")

r = analyze_condition("MacBook Air 13 M3 16/256, отличное состояние")
check("обычный чистый лот без слов-маркеров → ok", r.verdict == "ok")


# ─── 2. Робастная статистика живого рынка ────────────────────────────────────
print("\n[2] Живой рынок (robust_stats / assess_deal)")

prices = [70000, 72000, 73000, 75000, 76000, 78000, 80000, 82000, 90000]
st = robust_stats(prices)
check("median считается", st.median == 76000)
check("P20 ниже медианы", st.p20 < st.median)
check("n верное", st.n == len(prices))

# Выброс-скам должен отсекаться при n>=8
st2 = robust_stats(prices + [1000])
check("скам-выброс (1000₽) не утянул медиану", abs(st2.median - 76000) < 5000)

check("пустая выборка → None", robust_stats([]) is None)

# Сделка: 60000 при медиане 76000 = −21% → сделка (порог 12%), не скам (>55%*median=41800)
a = assess_deal(60000, st, min_margin=0.12, scam_floor=0.55)
check("−21% ниже медианы → сделка", a.is_deal and not a.is_suspicious)

# Почти по рынку: 73000 при медиане 76000 = −4% → не сделка
a = assess_deal(73000, st, min_margin=0.12, scam_floor=0.55)
check("−4% → не сделка (мало маржи)", not a.is_deal)

# Слишком дёшево: 30000 при медиане 76000 = ниже 55% порога → подозрительно
a = assess_deal(30000, st, min_margin=0.12, scam_floor=0.55)
check("−61% → подозрительно (скам-зона)", a.is_suspicious and not a.is_deal)


# ─── 3. Скоринг сделки ───────────────────────────────────────────────────────
print("\n[3] Скоринг (score_deal)")

st = robust_stats([70000, 72000, 74000, 76000, 78000, 80000, 82000, 84000])  # median 77000
buyout = int(st.median * 0.80)  # 61600

cond_clean = analyze_condition("идеальное состояние, на гарантии, чек, коробка, акб 95%")
a_good = assess_deal(60000, st, min_margin=0.12, scam_floor=0.55)   # −22%, ниже выкупа
score_good = score_deal(60000, st, buyout, cond_clean, is_private=True,
                        is_moscow=True, minutes_ago=20, assess=a_good)
check("чистый лот ниже выкупа → проходит порог 60", score_good >= 60)

# Тот же ценник, но состояние suspect (косметика) → ниже
cond_susp = analyze_condition("есть царапины и вмятина, потёртости")
score_susp = score_deal(60000, st, buyout, cond_susp, is_private=True,
                        is_moscow=True, minutes_ago=20, assess=a_good)
check("suspect состояние топит скор ниже чистого", score_susp < score_good)

# Подозрительно дёшево без позитивных сигналов → −50 антифрод, не должен быть «горячим»
a_scam = assess_deal(30000, st, min_margin=0.12, scam_floor=0.55)
cond_blank = analyze_condition("продаю макбук, торг")
score_scam = score_deal(30000, st, buyout, cond_blank, is_private=True,
                        is_moscow=True, minutes_ago=20, assess=a_scam)
check("подозрительно дёшево без чистоты → антифрод топит ниже чистого", score_scam < score_good)

# Лот по рынку (нет маржи) → низкий скор
a_market = assess_deal(76000, st, min_margin=0.12, scam_floor=0.55)
score_market = score_deal(76000, st, buyout, cond_clean, is_private=False,
                          is_moscow=True, minutes_ago=600, assess=a_market)
check("цена по рынку → не горячий лот", score_market < 60)

# перекупщик: ниже скор + детектор
from scanner_v2 import is_reseller
check("180 отзывов → перекуп", is_reseller(180, "Частное лицо") is True)
check("12 отзывов → не перекуп", is_reseller(12, "Частное лицо") is False)
check("Магазин → перекуп", is_reseller(None, "Магазин") is True)
cond_plain = analyze_condition("обычный макбук, рабочий")           # ok, без позитивов
a_mid = assess_deal(65000, st, min_margin=0.12, scam_floor=0.55)    # ~−16%, не упрётся в потолок
score_mid = score_deal(65000, st, buyout, cond_plain, is_private=False,
                       is_moscow=True, minutes_ago=600, assess=a_mid)
score_mid_res = score_deal(65000, st, buyout, cond_plain, is_private=False,
                           is_moscow=True, minutes_ago=600, assess=a_mid, reseller=True)
check("перекуп: скор ниже, чем у частника", score_mid_res < score_mid)


# ─── 4. Ключ живой выборки (группировка «такой же аппарат») ──────────────────
print("\n[4] live_key группировка")

c1 = classify("MacBook Air 13 M3 16/256")
c2 = classify("Apple Macbook Air 13 M3 16/256 ГБ")
c3 = classify("MacBook Air 13 M3 16/512")
check("одинаковая конфигурация → один ключ", live_key(c1) == live_key(c2))
check("разный SSD → разные ключи", live_key(c1) != live_key(c3))


# ─── 5. Дохлый-выключатель: свежесть базы цен ────────────────────────────────
print("\n[5] Контроль свежести базы цен")

check("парсинг '2026-06-09 20:53'", parse_generated_at("2026-06-09 20:53") == datetime(2026, 6, 9, 20, 53))
check("парсинг с секундами", parse_generated_at("2026-06-09 20:53:10") == datetime(2026, 6, 9, 20, 53, 10))
check("мусорный формат → None", parse_generated_at("вчера") is None)
check("пусто → None", parse_generated_at(None) is None)

now = datetime(2026, 6, 18, 12, 0, 0)
# Свежо (10 ч) → не алертим
check("10 ч < порога 36 → молчим", should_alert_stale(10, None, now, 36, 12) is False)
# Застряло (216 ч = 9 дней), алертов не было → шлём
check("216 ч, не было алертов → шлём", should_alert_stale(216, None, now, 36, 12) is True)
# Застряло, но алерт был 2 ч назад (кулдаун 12 ч) → молчим
recent = (now - timedelta(hours=2)).isoformat()
check("кулдаун: алерт 2 ч назад → молчим", should_alert_stale(216, recent, now, 36, 12) is False)
# Застряло, алерт был 13 ч назад (кулдаун прошёл) → шлём снова
old = (now - timedelta(hours=13)).isoformat()
check("кулдаун прошёл (13 ч) → шлём снова", should_alert_stale(216, old, now, 36, 12) is True)
# Файла нет (age = inf) → шлём
check("база отсутствует (inf) → шлём", should_alert_stale(float('inf'), None, now, 36, 12) is True)


# ─── 6. Мотивация продавца ───────────────────────────────────────────────────
print("\n[6] Мотивация продавца (motivation_score)")

fresh = motivation_score(days_listed=2)
stale = motivation_score(days_listed=40, price_reduced=True, num_reductions=2,
                         urgent_words=["срочно"], reposted=True)
check("свежее объявление → низкая мотивация", fresh.score < 30)
check("залежалое + снижения + срочно → высокая", stale.score >= 70)
check("залежалое помечено is_stale", stale.is_stale is True)
check("сигналы перечислены", len(stale.signals) >= 3)


# ─── 7. Переговорщик ─────────────────────────────────────────────────────────
print("\n[7] Переговорщик (next_move)")

# Без LLM (llm_call возвращает None) → детерминированный фолбэк
def _no_llm(_messages):
    return None

# Открытие: якорим у target
mv = next_move(title="MacBook Air M2 8/256", asking=70000, target=58000,
               walk_away=62000, seller_reply=None, llm_call=_no_llm)
check("открытие → stage opening", mv.stage == "opening")
check("открытие → не сделка", mv.deal_ready is False)
check("в сообщении есть целевая цена", "58 000" in mv.message)

# Продавец называет цену в пределах потолка → сделка
mv = next_move(title="MacBook Air M2", asking=70000, target=58000, walk_away=62000,
               seller_reply="давай за 60000 и забирай", llm_call=_no_llm)
check("цена ниже потолка → deal_ready", mv.deal_ready is True)
check("согласованная цена распознана (60000)", mv.agreed_price == 60000)

# Продавец просит выше потолка и без торга → не сделка, мягкий выход/контр
mv = next_move(title="MacBook Air M2", asking=70000, target=58000, walk_away=62000,
               seller_reply="только за 69000, без торга, цена окончательная", llm_call=_no_llm)
check("выше потолка без торга → не сделка", mv.deal_ready is False)
check("стадия stalled/negotiating", mv.stage in ("stalled", "negotiating"))

# LLM-путь: инъектируем фейковую модель, проверяем разбор JSON
def _fake_llm(_messages):
    return '```json\n{"message":"Договорились, 61000 беру","stage":"deal_ready",' \
           '"deal_ready":true,"agreed_price":61000,"motivation":"переезд","rationale":"в потолке"}\n```'

mv = next_move(title="MacBook Pro 14 M3", asking=120000, target=95000, walk_away=105000,
               seller_reply="ладно, 61000", llm_call=_fake_llm)
check("LLM JSON распарсен → via_llm", mv.via_llm is True)
check("LLM deal_ready проброшен", mv.deal_ready is True and mv.agreed_price == 61000)
check("LLM мотивация распознана", mv.motivation == "переезд")

# Страховка: LLM объявил сделку ВЫШЕ потолка → движок отменяет
def _fake_llm_overpriced(_messages):
    return '{"message":"беру за 130000","stage":"deal_ready","deal_ready":true,' \
           '"agreed_price":130000,"motivation":"x","rationale":"y"}'

mv = next_move(title="MacBook Pro 14", asking=130000, target=95000, walk_away=105000,
               seller_reply="130000 крайняя", llm_call=_fake_llm_overpriced)
check("сделка выше потолка отменяется движком", mv.deal_ready is False)

# Битый ответ LLM → фолбэк
mv = next_move(title="iMac 24 M3", asking=90000, target=72000, walk_away=78000,
               seller_reply="а сколько дадите?", llm_call=lambda m: "бла-бла без json")
check("мусорный LLM-ответ → фолбэк (via_llm False)", mv.via_llm is False and bool(mv.message))


# ─── 8. Фильтр Intel-MacBook (перекуп) ───────────────────────────────────────
print("\n[8] Не берём MacBook на Intel; iMac Intel 2017+ допустим")
from common.config import EXCLUDE_INTEL_FAMILIES


def _excluded_intel(title):
    c = classify(title)
    return c.family in EXCLUDE_INTEL_FAMILIES and c.chip_gen == "Intel"


check("MacBook Pro Core i5 → исключён", _excluded_intel("MacBook Pro 13 2015 Core i5 8/256"))
check("MacBook Air i5 → исключён", _excluded_intel("MacBook Air 13 2017 i5 8/256"))
check("MacBook Pro M1 Pro → НЕ исключён", not _excluded_intel("MacBook Pro 14 M1 Pro 16/512"))
check("iMac Intel 2019 → НЕ исключён (решает год)", not _excluded_intel("iMac 27 2019 Core i5 16/512"))


# ─── 9. Реестр объявлений (охотник за залежавшимися) ─────────────────────────
print("\n[9] Реестр: возраст и снижение цены")
from scanner_v2 import AvitoScannerV2

now9 = datetime(2026, 6, 20, 12, 0, 0)
e_old = {"first_seen": (now9 - timedelta(days=20)).isoformat(), "max_age_days": 0}
e_disp = {"first_seen": now9.isoformat(), "max_age_days": 18}
check("возраст по first_seen (20 дн)", AvitoScannerV2._entry_days(e_old, now9) == 20)
check("возраст по выдаче (18 дн), даже если first_seen свежий", AvitoScannerV2._entry_days(e_disp, now9) == 18)
check("снижение цены 80k→68k = 15%", abs(AvitoScannerV2._entry_drop(
    {"first_price": 80000, "last_price": 68000}) - 0.15) < 0.01)
check("без снижения → 0", AvitoScannerV2._entry_drop({"first_price": 80000, "last_price": 80000}) == 0.0)


# ─── 10. Дашборд здоровья ────────────────────────────────────────────────────
print("\n[10] Дашборд здоровья (compute_health)")
from scanner_v2 import compute_health

sample = [
    "2026-06-20 13:00:40,000 - INFO - 🎬 Запуск",
    "2026-06-20 13:01:02,000 - INFO -    📊 MacBook Air: 100 лотов → 25 живых конфигов",
    "2026-06-20 13:01:10,000 - INFO -    ✅ [78] Macbook Air | 55000₽ | −18% к медиане (db) | ok",
    "2026-06-20 13:01:20,000 - INFO -    ⛔ битый | минус дисплей",
    "2026-06-20 13:01:30,000 - WARNING -    ⚠️ iMac: 0 объявл. — похоже на троттлинг, пере-прогрев",
    "2026-06-20 13:01:35,000 - INFO - [ШАГ 1] ✅ RuCaptcha ответила",
    "2026-06-20 13:02:00,000 - INFO - 🏁 Готово. Уведомлений: 2",
]
H = compute_health(sample)
check("прогонов = 1", H["runs"] == 1)
check("уведомлений = 2", H["notif"] == 2)
check("кандидатов = 1", H["cands"] == 1)
check("отсеяно по состоянию = 1", H["rejects"] == 1)
check("троттлинг = 1", H["throttle"] == 1)
check("капча = 1", H["captcha"] == 1)
check("семейство MacBook Air учтено", H["fam"].get("MacBook Air") == 1)


# ─── 11. Вотчлист (⭐ Слежу) ──────────────────────────────────────────────────
print("\n[11] Вотчлист: триггеры повторного показа")
from scanner_v2 import watch_triggers

now11 = datetime(2026, 6, 27, 12, 0, 0)
drop_e = {"last_alert_price": 80000, "added_at": now11.isoformat()}
check("снижение 80k→75k (−6%) → drop", "drop" in watch_triggers(drop_e, 75000, now11))
check("78k (−2.5%) → без drop", "drop" not in watch_triggers(drop_e, 78000, now11))
old_e = {"watch_price": 80000, "added_at": (now11 - timedelta(days=15)).isoformat()}
check("висит 15 дней → 2wk", "2wk" in watch_triggers(old_e, 80000, now11))
fresh_e = {"watch_price": 80000, "added_at": (now11 - timedelta(days=5)).isoformat()}
check("висит 5 дней → без 2wk", "2wk" not in watch_triggers(fresh_e, 80000, now11))
done_e = {"watch_price": 80000, "added_at": (now11 - timedelta(days=20)).isoformat(), "alerted_2wk": True}
check("уже сигналили 2wk → не повторяем", "2wk" not in watch_triggers(done_e, 80000, now11))


# ─── 12. Intake: process_cards (мозг от домашнего расширения) ────────────────
print("\n[12] Intake: process_cards (заглушённый браузер)")
import scanner_v2 as _sv
from scanner_v2 import AvitoScannerV2, clean_url, is_reseller

_sv.time.sleep = lambda *a, **k: None   # без задержек в тесте

s = AvitoScannerV2(None)
s.seen = set()
_stats = robust_stats([100000] * 12)    # медиана 100k (заглушка)
# конфиг с 8 ГБ имитирует «нет в базе цен» (рынок None)
s._market_for = lambda cfg, comps: ((None, 'none') if cfg.ram == 8 else (_stats, 'db'))
s._db_stat = lambda cfg: None           # → выкуп = медиана×BUYOUT_FACTOR
s._start_browser = lambda: None
s._warmup = lambda: None
s._close = lambda: None
s._save_seen = lambda: None

_deep = {
    'deal':     {'is_private': True,  'seller_type': 'Частное лицо', 'seller_reviews': 3,
                 'location': 'Москва', 'desc_text': 'идеальное состояние, акб 100%, коробка, чек'},
    'reseller': {'is_private': False, 'seller_type': 'Магазин',      'seller_reviews': 250,
                 'location': 'Москва', 'desc_text': 'отличное состояние, полный комплект'},
    'broken':   {'is_private': True,  'seller_type': 'Частное лицо', 'seller_reviews': 1,
                 'location': 'Москва', 'desc_text': 'не включается, разбит экран'},
}
_base = {'cycles': None, 'is_urgent': False, 'specs': {}, 'price_reduced': False}

def _fake_deep(url):
    for k, v in _deep.items():
        if k in url:
            return {**_base, **v}
    return {**_base, 'is_private': True, 'seller_type': 'Частное лицо',
            'seller_reviews': 1, 'location': 'Москва', 'desc_text': 'хорошее состояние'}
s.deep_analyze = _fake_deep

_notif, _enq = [], []
s.notify = lambda c: _notif.append(c['url'])
s._send_copilot = lambda c: None
s._enqueue_lead = lambda c, **kw: _enq.append(c['url'])

cards = [
    {'url': 'https://www.avito.ru/deal_1',     'title': 'MacBook Air 13 M2 16/512 ГБ', 'price': 75000},
    {'url': 'https://www.avito.ru/reseller_1', 'title': 'MacBook Pro 14 M3 18/512',    'price': 75000},
    {'url': 'https://www.avito.ru/broken_1',   'title': 'MacBook Air 13 M2 16/256',    'price': 70000},
    {'url': 'https://www.avito.ru/fair_1',     'title': 'MacBook Air 13 M2 16/256',    'price': 96000},
    {'url': 'https://www.avito.ru/nobase_1',   'title': 'MacBook Air 13 M1 8/256',     'price': 60000},
]
s.process_cards(cards)

check("чистая сделка → уведомление", 'https://www.avito.ru/deal_1' in _notif)
check("чистая сделка → в очередь бота", 'https://www.avito.ru/deal_1' in _enq)
check("перекуп → уведомление есть", 'https://www.avito.ru/reseller_1' in _notif)
check("перекуп → в очередь НЕ кладём", 'https://www.avito.ru/reseller_1' not in _enq)
check("дефект (не включается/разбит) → отсеян", 'https://www.avito.ru/broken_1' not in _notif)
check("не низ рынка (−4%) → отсеян", 'https://www.avito.ru/fair_1' not in _notif)
check("нет в базе → не уведомляем", 'https://www.avito.ru/nobase_1' not in _notif)
check("нет в базе → НЕ помечен seen (ловит резервный сканер)",
      clean_url('https://www.avito.ru/nobase_1') not in s.seen)
check("обработанные (кроме nobase) помечены seen",
      all(clean_url(c['url']) in s.seen for c in cards if 'nobase' not in c['url']))


# ─── 13. Слияние вотчлиста при гонке с ботом ─────────────────────────────────
print("\n[13] merge_watchlist (бот добавил/удалил за прогон --watch)")
from scanner_v2 import merge_watchlist

snap = {                                                       # наш снимок после прогона
    'B': {'added_at': 't_b', 'last_alert_price': 70000, 'alerted_2wk': True},  # обновили поля
    'D': {'added_at': 't_d', 'alerted_2wk': True},             # был у нас
    'E': {'added_at': 't_e_old', 'alerted_2wk': True},         # будет пере-добавлен
}
disk13 = {                                                     # что на диске сейчас (бот менял)
    'A': {'added_at': 't_a'},                                  # мы его сняли (продан)
    'B': {'added_at': 't_b', 'last_alert_price': 80000},       # бот не трогал
    'C': {'added_at': 't_c'},                                  # бот ДОБАВИЛ ⭐
    'E': {'added_at': 't_e_new'},                              # бот пере-добавил заново
    # D бот УДАЛИЛ 👎 — его тут нет
}
fin = merge_watchlist(snap, {'A'}, disk13)
check("проданный A — убран", 'A' not in fin)
check("добавленный ботом C — сохранён", 'C' in fin)
check("удалённый ботом D — не воскрешён", 'D' not in fin)
check("наше обновление цены B перенесено", fin['B'].get('last_alert_price') == 70000)
check("наш alerted_2wk B перенесён", fin['B'].get('alerted_2wk') is True)
check("пере-добавленный E — свежий экземпляр", fin['E'].get('added_at') == 't_e_new')
check("пере-добавленный E — НЕ затёрт нашим alerted_2wk", fin['E'].get('alerted_2wk') is not True)


# ─── 14. drain_incoming (атомарный забор + дедуп intake-пачки) ────────────────
print("\n[14] drain_incoming (--intake)")
from scanner_v2 import drain_incoming
import tempfile as _tmp

_d = Path(_tmp.mkdtemp())
_miss = _d / "nope.json"
check("нет файла → ([], None)", drain_incoming(_miss) == ([], None))

_inc = _d / "incoming.json"
_inc.write_text(_json.dumps([
    {"url": "a", "price": 1}, {"url": "a", "price": 2},   # дубль url
    {"url": "b", "price": 3}, {"url": "", "price": 4},     # пустой url
    "мусор", None,                                          # не-dict
]), encoding="utf-8")
_u, _p = drain_incoming(_inc)
check("дедуп по url → 2 уникальных", [c["url"] for c in _u] == ["a", "b"])
check("исходный файл забран (переименован)", not _inc.exists() and _p.exists())

_bad = _d / "bad.json"
_bad.write_text("{не json", encoding="utf-8")
_ub, _pb = drain_incoming(_bad)
check("битый JSON → [] + proc для очистки", _ub == [] and _pb is not None)

# восстановление после падения: остаток в .processing.json подхватывается
_d2 = Path(_tmp.mkdtemp())
_inc2 = _d2 / "incoming.json"
_proc2 = _d2 / "incoming.processing.json"
_proc2.write_text(_json.dumps([{"url": "old", "price": 1}]), encoding="utf-8")   # упавший прогон
_inc2.write_text(_json.dumps([{"url": "new", "price": 2}, {"url": "old", "price": 9}]), encoding="utf-8")
_u2, _p2 = drain_incoming(_inc2)
check("остаток+свежие объединены и дедуплены", sorted(c["url"] for c in _u2) == ["new", "old"])
check("объединённая пачка зафиксирована в proc", _p2.exists())
check("proc переживёт падение (содержит обе)", sorted(c["url"] for c in _json.loads(_p2.read_text())) == ["new", "old"])
# только остаток (свежих нет) — тоже восстанавливаем
_d3 = Path(_tmp.mkdtemp())
_inc3 = _d3 / "incoming.json"
(_d3 / "incoming.processing.json").write_text(_json.dumps([{"url": "z", "price": 5}]), encoding="utf-8")
_u3, _p3 = drain_incoming(_inc3)
check("только остаток → восстановлен", [c["url"] for c in _u3] == ["z"])


# ─── 15. _build_candidate: run-путь с живыми компами ─────────────────────────
print("\n[15] _build_candidate: ветка живых компов (run-путь)")
# Покрываем единственную ветку, которой нет в [12]: comps_for возвращает НЕпустые
# живые компы (как из buckets в run()); проверяем, что свою цену исключаем и что
# исходный bucket не мутируется (lambda отдаёт копию).
s2 = AvitoScannerV2(None)
s2.seen = set()
s2._save_seen = lambda: None
s2._start_browser = lambda: None
s2._db_stat = lambda cfg: None
_stats2 = robust_stats([100000] * 12)
_recv = {}
def _mkt(cfg, comps):
    _recv['comps'] = list(comps)
    return (_stats2, 'live')
s2._market_for = _mkt
s2.deep_analyze = lambda url: {
    'cycles': None, 'is_urgent': False, 'price_reduced': False,
    'specs': {'ram': 16, 'ssd': 512, 'diagonal': 13},   # есть спеки → сработает re-classify
    'is_private': True, 'seller_type': 'Частное лицо', 'seller_reviews': 2,
    'location': 'Москва', 'desc_text': 'идеальное состояние, акб 100%'}

_L15 = {'url': 'https://www.avito.ru/run_1', 'raw_url': 'https://www.avito.ru/run_1',
        'title': 'MacBook Air 13 M2 16/512', 'snippet': '', 'price': 75000,
        'minutes_ago': 0, 'age_str': 'недавно', 'item_text': 'macbook air 13 m2 16/512'}
_cfg15 = classify(_L15['title'], {'ram': 16, 'ssd': 512})
_bucket15 = [70000, 75000, 90000, 100000, 110000]      # включает саму цену 75000
_buckets15 = {live_key(_cfg15): list(_bucket15)}
_assess15 = assess_deal(75000, _stats2, min_margin=MIN_MARGIN, scam_floor=SCAM_FLOOR)

_cand15 = s2._build_candidate(_L15, _cfg15, _stats2, 'live', _assess15,
                              comps_for=lambda c: list(_buckets15.get(live_key(c), [])))
check("кандидат построен (живой путь)", _cand15 is not None and _cand15['url'] == 'https://www.avito.ru/run_1')
check("ветка живых компов сработала", 70000 in _recv.get('comps', []))
check("свою цену из компов исключили", 75000 not in _recv.get('comps', []))
check("исходный bucket НЕ мутирован (копия)", 75000 in _buckets15[live_key(_cfg15)])
check("seen помечен до сети", 'https://www.avito.ru/run_1' in s2.seen)


# ─── 16. run_intake: proc удаляется только при успехе ────────────────────────
print("\n[16] run_intake: удаление proc только при успехе + восстановление")
from scanner_v2 import run_intake

_d4 = Path(_tmp.mkdtemp())
_inc4 = _d4 / "incoming.json"
_proc4 = _d4 / "incoming.processing.json"

_inc4.write_text(_json.dumps([{"url": "s1", "price": 1}]), encoding="utf-8")
_got = []
_n, _ok = run_intake(_inc4, lambda u: _got.append([c["url"] for c in u]))
check("успех: пачка обработана", _n == 1 and _ok and _got == [["s1"]])
check("успех: proc удалён", not _proc4.exists())

_inc4.write_text(_json.dumps([{"url": "s2", "price": 2}]), encoding="utf-8")
def _boom(u):
    raise RuntimeError("browser fail")
_n2, _ok2 = run_intake(_inc4, _boom)
check("краш: ok=False", (not _ok2) and _n2 == 1)
check("краш: proc сохранён для повтора", _proc4.exists())

_got2 = []
_n3, _ok3 = run_intake(_inc4, lambda u: _got2.append([c["url"] for c in u]))
check("повтор: восстановил сохранённую пачку", _ok3 and _got2 == [["s2"]])
check("повтор: proc удалён после успеха", not _proc4.exists())

_n4, _ok4 = run_intake(_d4 / "none.json", lambda u: None)
check("пусто → (0, True)", _n4 == 0 and _ok4)


# ─── 17. _listing_status: active / removed / unknown ─────────────────────────
print("\n[17] _listing_status (снято vs не распарсили)")
s17 = AvitoScannerV2(None)
def _ls(html):
    s17._load_page = lambda url: html
    return s17._listing_status("u")
check("снято с публикации → removed", _ls("<html><body>Объявление снято с публикации</body></html>") == ('removed', None))
check("itemprop price → active", _ls('<html><body><span itemprop="price" content="75000">75 000 ₽</span></body></html>') == ('active', 75000))
check("фолбэк item-price → active", _ls('<html><body><div data-marker="item-price">90 000 ₽</div></body></html>') == ('active', 90000))
check("жив, но цены нет → unknown", _ls("<html><body>MacBook Air, отличное состояние</body></html>") == ('unknown', None))
check("страница не загрузилась → unknown", _ls("") == ('unknown', None))
check("'продано' в описании активного лота → НЕ removed",
      _ls('<html><body><span itemprop="price" content="80000">80 000 ₽</span>'
          '<div data-marker="item-description">комплект полный, ничего не продано отдельно</div>'
          '</body></html>') == ('active', 80000))

# ─── 18. run_watch_check: removed убираем, unknown оставляем, active триггерит ─
print("\n[18] run_watch_check (оркестрация)")
import scanner_v2 as _sv18
_wd = Path(_tmp.mkdtemp())
_wf = _wd / "watchlist.json"
_sv18.WATCHLIST_FILE = _wf
_now18 = datetime.now().isoformat()
_wf.write_text(_json.dumps({
    "https://www.avito.ru/sold": {"url": "https://www.avito.ru/sold", "title": "S", "watch_price": 80000, "added_at": _now18},
    "https://www.avito.ru/unk":  {"url": "https://www.avito.ru/unk",  "title": "U", "watch_price": 80000, "added_at": _now18},
    "https://www.avito.ru/drop": {"url": "https://www.avito.ru/drop", "title": "D", "last_alert_price": 80000, "added_at": _now18},
}, ensure_ascii=False), encoding="utf-8")

s18 = AvitoScannerV2(None)
s18._start_browser = lambda: None
s18._warmup = lambda: None
s18._close = lambda: None
s18._save_seen = lambda: None
_statuses = {"https://www.avito.ru/sold": ('removed', None),
             "https://www.avito.ru/unk": ('unknown', None),
             "https://www.avito.ru/drop": ('active', 75000)}   # −6% от 80k → drop
s18._listing_status = lambda url: _statuses[url]
_releads = []
s18._enqueue_watch_relead = lambda e, price, reason: _releads.append((e['url'], reason))
s18.run_watch_check()

_after = _json.loads(_wf.read_text(encoding="utf-8"))
check("removed → убран из вотчлиста", "https://www.avito.ru/sold" not in _after)
check("unknown → оставлен (трекинг не потерян)", "https://www.avito.ru/unk" in _after)
check("active с падением → relead", ("https://www.avito.ru/drop", "drop") in _releads)
check("unknown НЕ релиднут", not any(u == "https://www.avito.ru/unk" for u, _ in _releads))
check("drop: last_alert_price обновлён", _after["https://www.avito.ru/drop"].get("last_alert_price") == 75000)


# ─── 19. notify: тег «из браузера» для лотов от расширения ────────────────────
print("\n[19] notify: тег источника (Chrome-коллектор)")
import scanner_v2 as _svN
from common.condition import analyze_condition as _ac
_svN.TELEGRAM_URL = "http://x"          # чтобы notify не вышел рано
sN = AvitoScannerV2(None)
_cap = {}
sN._send_telegram = lambda text, log: _cap.update(text=text)
_base_c = {'kind': 'fire', 'score': 80, 'title': 'Mac mini M4 16/256', 'price': 40000,
           'median': 50000, 'p20': 45000, 'n_comps': 10, 'buyout': 40000,
           'condition': _ac("отличное состояние"), 'ram': 16, 'ssd': 256, 'diagonal': None,
           'url': 'https://www.avito.ru/x', 'age_str': '1 час', 'location': 'Москва',
           'seller_type': 'Частное лицо', 'seller_reviews': 3, 'is_private': True,
           'reseller': False, 'urgent': False}
sN.notify({**_base_c, 'source_kind': 'browser'})
check("браузерный лот → тег «из браузера»", 'из браузера' in _cap.get('text', ''))
_cap.clear()
sN.notify({**_base_c})
check("лот от VPS-сканера → без тега", 'из браузера' not in _cap.get('text', ''))


# ─── Итог ────────────────────────────────────────────────────────────────────
print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты прошли")
