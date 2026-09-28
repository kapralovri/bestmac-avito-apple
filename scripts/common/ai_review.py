"""
Разбор объявления DeepSeek: серьёзные проблемы, мелочи, признаки торга, что делать.

Зачем: правила по стоп-словам (common/condition.py) ловят типовые формулировки,
но продавцы пишут по-разному («попал кофе», «стоит профиль компании»). DeepSeek
читает описание целиком. Владелец решил: явные проблемы (залит, треснул экран,
MDM и т. п.) — отсев, остальное — подсказка в алерте.

Защита от выдумок: серьёзная проблема засчитывается, только если её тип из
закрытого списка HARD_KINDS и модель процитировала фразу, которая ДЕЙСТВИТЕЛЬНО
есть в тексте объявления. Нет цитаты — нет проблемы.

Разбор — надстройка: нет ключа, сеть упала, пришёл мусор → None, и лот идёт по
старому пути (правила решают сами). LLM-вызов инъектируется (`llm_call`), как в
negotiator: тесты работают без ключа и сети.
"""

from __future__ import annotations

import html
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Callable, List, Optional

from common.negotiator import _deepseek_call, _strip_json

logger = logging.getLogger("AiReview")

# Серьёзные проблемы, из-за которых лот не нужен владельцу ни за какие деньги.
HARD_KINDS = {
    "liquid":       "залит",
    "screen_crack": "разбит или треснул экран, полосы, пятна",
    "mdm":          "MDM / профиль организации",
    "icloud_lock":  "привязан к iCloud / блокировка активации",
    "no_power":     "не включается / не загружается",
    "logic_board":  "неисправна или ремонтировалась плата",
    "parts":        "на запчасти / донор",
}

MAX_QUOTE_LEN = 160
MAX_SIGNALS = 4

_SYSTEM = (
    "Ты помогаешь скупщику б/у MacBook в Москве разбирать объявления Авито. "
    "Ответь ТОЛЬКО JSON-объектом без пояснений:\n"
    '{"problems": [{"kind": "...", "severity": "hard|minor", "quote": "..."}], '
    '"bargain": {"signals": ["..."], "open_price": число или null}, '
    '"listing": "new|used|unknown", "fake_signals": ["..."], '
    '"action": "одна короткая фраза, что сделать скупщику"}\n'
    "Правила:\n"
    "- problems — только то, что прямо написано в объявлении. quote — ДОСЛОВНАЯ "
    "фраза из текста объявления (3–15 слов). Не выдумывай и не додумывай.\n"
    "- severity=hard только для типов: "
    + "; ".join(f"{k} — {v}" for k, v in HARD_KINDS.items())
    + ". Всё остальное (царапины, износ АКБ, мелкий ремонт, нет коробки) — "
    "severity=minor, kind — любое короткое слово на английском.\n"
    "- bargain.signals — признаки, что продавец готов уступить (торг, срочно, "
    "переезд, снижена цена) или наоборот («без торга»). Коротко, по-русски.\n"
    "- bargain.open_price — разумная первая цена предложения в рублях: ниже цены "
    "объявления и не выше цели выкупа. null, если торговаться не стоит.\n"
    "- listing — new, если аппарат новый (запечатан, не активирован, «новый» в "
    "значении нераспакованного), used — б/у, unknown — непонятно.\n"
    "- fake_signals — признаки фейкового объявления: цена сильно ниже рынка, "
    "давление сроком («цена действительна один день»), предоплата, уход в "
    "мессенджеры, шаблонный текст. Пусто, если признаков нет.\n"
    "- Если description пустой — описание прочитать не удалось: суди только по "
    "заголовку и цене, problems — только из заголовка.\n"
    "- action — по-русски, до 15 слов."
)


@dataclass
class Problem:
    kind: str
    quote: str


@dataclass
class AiReview:
    hard: List[Problem] = field(default_factory=list)
    minor: List[Problem] = field(default_factory=list)
    signals: List[str] = field(default_factory=list)
    open_price: Optional[int] = None
    action: str = ""
    is_new: Optional[bool] = None      # None — непонятно
    fake: List[str] = field(default_factory=list)
    title_only: bool = False           # описание не прочитано, разбор по заголовку

    @property
    def is_reject(self) -> bool:
        return bool(self.hard)

    def reason(self) -> str:
        return "; ".join(f"{HARD_KINDS.get(p.kind, p.kind)}: «{p.quote}»" for p in self.hard)


def _norm(s: str) -> str:
    s = str(s or "").lower().replace("ё", "е")
    s = re.sub(r"[«»\"'“”.,!?;:()\-–—]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _to_int(v) -> Optional[int]:
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    digits = re.sub(r"\D", "", str(v))
    return int(digits) if digits else None


def _parse(data: dict, source_text: str, price: int, buyout: int) -> AiReview:
    src = _norm(source_text)
    out = AiReview()
    for p in data.get("problems") or []:
        if not isinstance(p, dict):
            continue
        quote = str(p.get("quote") or "").strip()[:MAX_QUOTE_LEN]
        q = _norm(quote)
        if len(q) < 3 or q not in src:
            continue   # цитаты нет в объявлении — модель додумала, не верим
        kind = str(p.get("kind") or "").strip().lower()
        item = Problem(kind=kind, quote=quote)
        if kind in HARD_KINDS and p.get("severity") == "hard":
            out.hard.append(item)
        else:
            out.minor.append(item)

    bargain = data.get("bargain") if isinstance(data.get("bargain"), dict) else {}
    out.signals = [str(s).strip()[:80] for s in (bargain.get("signals") or [])
                   if str(s).strip()][:MAX_SIGNALS]
    offer = _to_int(bargain.get("open_price"))
    if offer and 0 < offer < price:
        out.open_price = min(offer, buyout) if buyout else offer
    out.action = str(data.get("action") or "").strip()[:200]
    listing = str(data.get("listing") or "").strip().lower()
    out.is_new = True if listing == "new" else (False if listing == "used" else None)
    out.fake = [str(s).strip()[:100] for s in (data.get("fake_signals") or [])
                if str(s).strip()][:MAX_SIGNALS]
    return out


def review_lot(*, title: str, price: int, median: Optional[int], buyout: Optional[int],
               desc: str, llm_call: Optional[Callable] = None) -> Optional[AiReview]:
    """Разбор лота DeepSeek. None — разбора нет (нет ключа/ответа).
    Без описания (капча) — разбор по заголовку и цене: новый/б/у, признаки фейка;
    отсеять можно только по дефекту, написанному в самом заголовке."""
    desc = (desc or "").strip()
    call = llm_call if llm_call is not None else _deepseek_call
    lot = {"title": title, "price": price, "market_median": median,
           "buyout_target": buyout, "description": desc}
    messages = [{"role": "system", "content": _SYSTEM},
                {"role": "user", "content": json.dumps(lot, ensure_ascii=False)}]
    try:
        raw = call(messages, max_tokens=600)
    except Exception as e:   # noqa: BLE001 — разбор необязателен
        logger.error(f"DeepSeek review fail: {e}")
        return None
    data = _strip_json(raw) if isinstance(raw, str) else None
    if not isinstance(data, dict):
        return None
    review = _parse(data, f"{title} {desc}", int(price), int(buyout or 0))
    review.title_only = not desc
    return review


def _rub(n: int) -> str:
    return f"{int(n):,}".replace(",", " ") + " ₽"


def format_block(r: Optional[AiReview]) -> str:
    """HTML-блок для Telegram. Текст модели экранируется."""
    if r is None:
        return ""
    e = html.escape
    lines = ["🧠 <b>Разбор DeepSeek</b>"
             + (" <i>(описание не прочитано — по заголовку)</i>" if r.title_only else "")]
    if r.is_new:
        lines.append("🆕 Похоже, новый — сравнивай с ценами новых")
    if r.fake:
        lines.append("🚩 Признаки фейка: " + "; ".join(e(f) for f in r.fake))
    if r.minor:
        lines.append("⚠️ " + "; ".join(e(p.quote) for p in r.minor))
    elif not r.hard and not r.title_only:
        lines.append("✅ Серьёзных проблем в описании нет")
    if r.signals:
        lines.append("💬 Торг: " + ", ".join(e(s) for s in r.signals))
    if r.open_price:
        lines.append(f"💵 Предложить: <b>{_rub(r.open_price)}</b>")
    if r.action:
        lines.append("👉 " + e(r.action))
    return "\n".join(lines)
