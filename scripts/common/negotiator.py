"""
ИИ-переговорщик для выкупа: оценка мотивации продавца + ведение торга.

Это «мозг» — он НЕ шлёт сообщения и НЕ читает чат Авито. Принимает контекст лота,
историю диалога и последний ответ продавца → возвращает следующий ход
(текст сообщения + разбор состояния сделки). Отправку/приём обеспечивает внешний
слой (Telegram-бот + сессия Авито).

Стиль — честный продавец-консультант с навыками переговоров, НЕ манипулятор:
раппорт, аккуратное якорение, отзеркаливание срочности продавца, «оплата сразу
наличными сегодня», работа с возражениями, чёткий потолок цены. Враньё о товаре,
фейковый дефицит и давление на уязвимых — запрещены (это сжигает и лид, и аккаунт).

DeepSeek используется тем же ключом, что и co-pilot; при недоступности — детерми-
нированный фолбэк (шаблоны по стадии). LLM-вызов инъектируется (`llm_call`) — это
делает модуль тестируемым офлайн.
"""

from __future__ import annotations

import os
import re
import json
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Callable

logger = logging.getLogger("Negotiator")

DEEPSEEK_API_KEY  = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = os.environ.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').rstrip('/')
DEEPSEEK_MODEL    = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')


# ─── Оценка мотивации продавца («залежался» = готов отдать дёшево) ────────────
@dataclass
class MotivationReport:
    score: int                # 0..100 — готовность торговаться/сбрасывать цену
    signals: List[str] = field(default_factory=list)
    is_stale: bool = False

    @property
    def label(self) -> str:
        if self.score >= 70: return "🔥 очень мотивирован"
        if self.score >= 45: return "🟡 умеренно мотивирован"
        return "⚪ слабо мотивирован"


def motivation_score(*, days_listed=None, price_reduced=False, num_reductions=0,
                     urgent_words=None, reposted=False, asking=None, median=None) -> MotivationReport:
    """
    Считает мотивацию продавца по сигналам «залежалости».
    Чем дольше висит, чем больше снижений и срочности — тем выше готовность.
    """
    score = 0
    signals: List[str] = []
    urgent_words = urgent_words or []

    # 1) Возраст объявления — главный сигнал
    if days_listed is not None:
        if days_listed >= 45:
            score += 35; signals.append(f"висит {days_listed} дн (давно)")
        elif days_listed >= 30:
            score += 28; signals.append(f"висит {days_listed} дн")
        elif days_listed >= 21:
            score += 20; signals.append(f"висит {days_listed} дн")
        elif days_listed >= 14:
            score += 12; signals.append(f"висит {days_listed} дн")
        elif days_listed >= 7:
            score += 5

    # 2) Снижения цены — продавец уже двигается
    if price_reduced:
        score += 16; signals.append("снижал цену")
    if num_reductions >= 2:
        score += 10; signals.append(f"снижал {num_reductions}×")

    # 3) Срочность в тексте
    if urgent_words:
        score += 14; signals.append("срочные слова: " + ", ".join(urgent_words[:3]))

    # 4) Перевыставлялся (видели раньше — не продаётся)
    if reposted:
        score += 12; signals.append("перевыставлялся")

    # 5) Просит выше медианы и при этом залежался → созрел сбрасывать
    if asking and median and asking > median * 1.05 and (days_listed or 0) >= 14:
        score += 8; signals.append("просит выше рынка, но давно висит")

    is_stale = bool(days_listed and days_listed >= 14) or reposted
    return MotivationReport(score=min(score, 100), signals=signals, is_stale=is_stale)


# ─── Движок ведения торга ────────────────────────────────────────────────────
VALID_STAGES = {"opening", "negotiating", "deal_ready", "stalled", "rejected"}

_SYSTEM_PROMPT = (
    "Ты — опытный частный покупатель техники Apple в Москве, который вежливо и по-человечески "
    "договаривается о покупке б/у Mac для последующей перепродажи. У тебя навыки переговоров и "
    "бытовой психологии, но ты ЧЕСТЕН: не врёшь о товаре, не выдумываешь дефицит, не давишь на "
    "людей в трудной ситуации. Принципы:\n"
    "• Раппорт: тёплое, человеческое начало, обращение на «вы».\n"
    "• Отзеркаливай мотивацию продавца (переезд/апгрейд/срочно) и опирайся на неё мягко.\n"
    "• Якорь: первое предложение — у потолка_минус, оставляя место продавцу согласиться выше, "
    "но НЕ выше walk_away.\n"
    "• Ценность мгновенной сделки: оплата сразу наличными, забор сегодня, без торга по мелочам.\n"
    "• Работа с возражениями коротко и по делу, без агрессии.\n"
    "• Никогда не предлагай больше walk_away. Если продавец не опускается до walk_away — мягко "
    "выходи (stage=stalled), без обид.\n"
    "Отвечай СТРОГО одним JSON-объектом без markdown:\n"
    '{"message": "<текст продавцу, по-русски, 1-3 предложения>", '
    '"stage": "opening|negotiating|deal_ready|stalled|rejected", '
    '"deal_ready": true|false, '
    '"agreed_price": <число или null>, '
    '"motivation": "<кратко: что движет продавцом>", '
    '"rationale": "<1 фраза для покупателя: почему такой ход>"}'
)


@dataclass
class NegotiationMove:
    message: str
    stage: str
    deal_ready: bool
    agreed_price: Optional[int]
    walk_away_price: int
    motivation: str = ""
    rationale: str = ""
    via_llm: bool = False


def _fmt(n) -> str:
    return f"{int(n):,}".replace(",", " ")


def _deepseek_call(messages, max_tokens=400) -> Optional[str]:
    """Дефолтный LLM-вызов (DeepSeek). None при отсутствии ключа/ошибке."""
    if not DEEPSEEK_API_KEY:
        return None
    try:
        import requests as std_requests
        r = std_requests.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "content-type": "application/json"},
            json={"model": DEEPSEEK_MODEL, "max_tokens": max_tokens, "messages": messages},
            timeout=30,
        )
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"DeepSeek negotiator fail: {e}")
        return None


def _strip_json(text: str) -> Optional[dict]:
    """Вытаскивает JSON-объект из ответа LLM (срезает ```-ограждения и мусор)."""
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(?:json)?", "", t).strip()
    t = re.sub(r"```$", "", t).strip()
    # Берём первый сбалансированный {...}
    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(t[start:end + 1])
    except (ValueError, json.JSONDecodeError):
        return None


# Регексы для фолбэка-разбора ответа продавца
_PRICE_RE = re.compile(r"(\d[\d\s]{3,})\s*(?:р|₽|руб|т\.?р|к\b)?", re.I)
_AGREE_RE = re.compile(r"\b(давай|договорились|согласен|идёт|идет|ок\b|окей|беру|пишите|приезжай|можно)\b", re.I)
_REFUSE_RE = re.compile(r"\b(не отдам|только за|без торга|дорого не|цена окончательн|не интересн|продан)\b", re.I)


def _parse_seller_reply(reply: str, target: int, walk_away: int):
    """Грубый детерминированный разбор ответа продавца для фолбэка.
    Возвращает (named_price|None, agreed: bool, refused: bool)."""
    named = None
    low = (reply or "").lower()
    m = _PRICE_RE.search(low.replace("\xa0", " "))
    if m:
        digits = re.sub(r"\s", "", m.group(1))
        try:
            val = int(digits)
            # «50к» / «50 т.р» → тысячи
            if val < 1000 and ("к" in low or "т.р" in low or "тыс" in low):
                val *= 1000
            if 5000 <= val <= 2_000_000:
                named = val
        except ValueError:
            pass
    agreed = bool(_AGREE_RE.search(low))
    refused = bool(_REFUSE_RE.search(low))
    return named, agreed, refused


def _fallback_move(*, title, asking, target, walk_away, location, seller_reply) -> NegotiationMove:
    """Детерминированный ход без LLM."""
    short = (title or "устройство")[:60]
    if not seller_reply:
        # Открытие: якорим у target
        msg = (f"Здравствуйте! Интересует ваш «{short}». Готов купить за {_fmt(target)} ₽, "
               f"оплата сразу наличными, могу подъехать сегодня. Ещё актуально?")
        return NegotiationMove(msg, "opening", False, None, walk_away,
                               motivation="", rationale="якорь у целевой цены", via_llm=False)

    named, agreed, refused = _parse_seller_reply(seller_reply, target, walk_away)

    if named is not None and named <= walk_away:
        msg = (f"Отлично, {_fmt(named)} ₽ — беру. Оплата наличными сразу, заберу сегодня/завтра. "
               f"Куда и во сколько удобно подъехать?")
        return NegotiationMove(msg, "deal_ready", True, named, walk_away,
                               motivation="готов отдать в пределах потолка",
                               rationale="цена в пределах walk_away — закрываем", via_llm=False)

    if agreed and asking and asking <= walk_away:
        msg = (f"Супер, договорились за {_fmt(asking)} ₽. Оплата наличными сразу, заберу сегодня. "
               f"Куда подъехать?")
        return NegotiationMove(msg, "deal_ready", True, int(asking), walk_away,
                               rationale="продавец согласен в пределах потолка", via_llm=False)

    if refused:
        # Один шаг к потолку, иначе выходим
        if walk_away >= (named or asking or walk_away):
            msg = (f"Понимаю. Максимум, который могу предложить с оплатой сразу и забором сегодня — "
                   f"{_fmt(walk_away)} ₽. Если ок — приеду в удобное время.")
            return NegotiationMove(msg, "negotiating", False, None, walk_away,
                                   rationale="финальный оффер у потолка", via_llm=False)
        msg = "Понял, спасибо! Если передумаете по цене — напишите, предложение в силе."
        return NegotiationMove(msg, "stalled", False, None, walk_away,
                               rationale="выше потолка — мягкий выход", via_llm=False)

    # Контр-оффер между target и walk_away
    counter = min(walk_away, int((target + walk_away) / 2))
    msg = (f"Спасибо за ответ! Готов {_fmt(counter)} ₽ с оплатой сразу и забором сегодня — "
           f"это честная цена за быструю сделку без хлопот. Договоримся?")
    return NegotiationMove(msg, "negotiating", False, None, walk_away,
                           rationale="контр-оффер между целью и потолком", via_llm=False)


def next_move(*, title, asking, target, walk_away, location="",
              history: Optional[List[dict]] = None, seller_reply: Optional[str] = None,
              llm_call: Optional[Callable] = None) -> NegotiationMove:
    """
    Главная функция: возвращает следующий ход переговоров.

    title       — заголовок лота
    asking      — текущая цена продавца
    target      — целевая цена покупки (стартовый якорь)
    walk_away   — потолок: выше не покупаем
    history     — список реплик [{"role": "buyer"/"seller", "text": ...}]
    seller_reply— последний ответ продавца (None = открытие диалога)
    llm_call    — функция(messages)->str|None для инъекции (по умолчанию DeepSeek)
    """
    history = history or []
    call = llm_call if llm_call is not None else _deepseek_call

    user_ctx = (
        f"Лот: {title}\n"
        f"Цена продавца: {asking} ₽\n"
        f"Моя целевая цена (якорь): {target} ₽\n"
        f"Потолок (walk_away, выше НЕ покупаю): {walk_away} ₽\n"
        f"Локация: {location or 'Москва'}\n"
        f"История диалога: {json.dumps(history, ensure_ascii=False) if history else 'пусто (первый контакт)'}\n"
        f"Последний ответ продавца: {seller_reply or '— (это первое сообщение)'}\n"
        "Сформулируй следующий ход."
    )
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_ctx},
    ]

    raw = None
    try:
        raw = call(messages)
    except Exception as e:
        logger.error(f"negotiator llm_call raised: {e}")

    data = _strip_json(raw) if raw else None
    if not data or not data.get("message"):
        return _fallback_move(title=title, asking=asking, target=target,
                              walk_away=walk_away, location=location, seller_reply=seller_reply)

    stage = data.get("stage") if data.get("stage") in VALID_STAGES else "negotiating"
    agreed = data.get("agreed_price")
    try:
        agreed = int(agreed) if agreed is not None else None
    except (ValueError, TypeError):
        agreed = None

    deal_ready = bool(data.get("deal_ready"))
    # Страховка: не объявляем сделку, если согласованная цена выше потолка
    if deal_ready and agreed is not None and agreed > walk_away:
        deal_ready = False
        stage = "negotiating"

    return NegotiationMove(
        message=str(data["message"]).strip(),
        stage=stage,
        deal_ready=deal_ready,
        agreed_price=agreed,
        walk_away_price=walk_away,
        motivation=str(data.get("motivation", "")),
        rationale=str(data.get("rationale", "")),
        via_llm=True,
    )
