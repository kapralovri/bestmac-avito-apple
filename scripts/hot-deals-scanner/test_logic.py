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
from scanner_v2 import score_deal, live_key, parse_generated_at, should_alert_stale
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
check("чистый лот ниже выкупа → проходит порог 75", score_good >= 75)

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
check("подозрительно дёшево без чистоты → ниже порога 75", score_scam < 75)

# Лот по рынку (нет маржи) → низкий скор
a_market = assess_deal(76000, st, min_margin=0.12, scam_floor=0.55)
score_market = score_deal(76000, st, buyout, cond_clean, is_private=False,
                          is_moscow=True, minutes_ago=600, assess=a_market)
check("цена по рынку → не горячий лот", score_market < 75)


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


# ─── Итог ────────────────────────────────────────────────────────────────────
print()
if _fails:
    print(f"❌ ПРОВАЛЕНО {len(_fails)}: " + "; ".join(_fails))
    sys.exit(1)
print("✅ Все тесты прошли")
