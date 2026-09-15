"""
Подписки «конкретная конфигурация + моя предельная цена» (GST-73).

Зачем: обычные алерты отвечают на вопрос «где рынок ошибся» — лот проходит,
только если он заметно дешевле медианы. Но у владельца есть и второй вопрос:
«где то, что мне нужно, по моей цене». Лот за 45 000 ₽ при медиане 47 000 ₽
рыночной сделкой не считается и не придёт, хотя купить его готовы именно за
столько. Подписка закрывает этот второй вопрос.

Владение файлом: бот пишет (визард `/модель` → «🔔 Следить»), сканер читает на
каждом прогоне intake — та же схема, что у watchlist.json.

Модуль чистый: ни сети, ни Telegram. Пути к файлам приходят аргументами, чтобы
и бот, и сканер, и тесты работали с одной логикой.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

SUBSCRIPTIONS_FILE = Path(
    os.environ.get('SUBSCRIPTIONS_PATH', 'public/data/subscriptions.json'))

# Поля MacConfig, по которым различаем «такой же аппарат». Те же шесть, что и в
# scanner_v2.live_key — подписка обязана мыслить ровно теми же категориями, что
# и группировка рынка, иначе «точная конфигурация» означала бы разное в разных
# местах кода.
MATCH_FIELDS = ("family", "chip_gen", "chip_tier", "screen", "ram", "ssd")


def match_from_config(config) -> dict:
    """MacConfig → словарь критериев, ПРОПУСКАЯ неизвестное.

    В каталоге парсера RAM и SSD есть только у MacBook: записи iMac, Mac mini и
    Mac Studio описаны как «модель + чип». Классификатор отдаёт для них ram=0 и
    ssd=0 — это «не знаю», а не «ноль гигабайт». Записать такой ноль в критерии
    значило бы создать подписку, которая не совпадёт никогда.
    """
    out = {}
    for f in MATCH_FIELDS:
        v = getattr(config, f, None)
        if v is None:
            continue
        if f in ("ram", "ssd", "screen") and not v:
            continue        # 0 — «каталог не знает», а не реальное значение
        out[f] = v
    return out


def make_subscription(*, chat_id, model: str, label: str, match: dict,
                      max_price: int, url: str = "") -> dict:
    return {
        "id": uuid.uuid4().hex[:8],
        "chat_id": chat_id,
        "model": model,
        "label": label,
        "match": dict(match or {}),
        "max_price": int(max_price),
        "url": url,
        "active": True,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "hits": 0,
        "last_hit_at": None,
    }


def subscription_matches(sub: dict, config, price: int) -> bool:
    """Совпал ли лот с подпиской: цена не выше потолка и все ЗАДАННЫЕ критерии равны.

    Пустой набор критериев не совпадает ни с чем: подписка «вообще на всё»
    завалила бы владельца потоком и почти наверняка означала бы ошибку ввода,
    а не намерение.
    """
    if not sub or sub.get("active") is False:
        return False
    try:
        if int(price) > int(sub.get("max_price") or 0):
            return False
    except (TypeError, ValueError):
        return False

    criteria = {k: v for k, v in (sub.get("match") or {}).items() if v is not None}
    if not criteria:
        return False
    return all(getattr(config, field, None) == want for field, want in criteria.items())


def find_matches(subs: dict, config, price: int) -> list[dict]:
    """Все подписки, которые поднимает этот лот (их может быть несколько:
    одна конфигурация с разными потолками цены)."""
    return [s for s in (subs or {}).values() if subscription_matches(s, config, price)]


def load_subscriptions(path: Optional[Path] = None) -> dict:
    """Читает файл подписок. Любая беда с файлом → пустой словарь: отсутствие
    подписок не должно ронять ни бота, ни ночной прогон сканера."""
    p = Path(path or SUBSCRIPTIONS_FILE)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def record_hits(sub_ids, path: Optional[Path] = None) -> bool:
    """Отмечает срабатывание подписок (счётчик + время).

    Читает файл заново прямо перед записью и трогает ТОЛЬКО счётчики: пока
    сканер разбирал пачку карточек, владелец мог добавить или удалить подписку
    в боте, и затирать его правку своим устаревшим снимком нельзя. Подписка,
    которую успели удалить, просто пропускается.
    """
    ids = {i for i in (sub_ids or []) if i}
    if not ids:
        return False
    data = load_subscriptions(path)
    now = datetime.now().isoformat(timespec="seconds")
    touched = False
    for s in data.values():
        if s.get("id") in ids:
            s["hits"] = int(s.get("hits") or 0) + 1
            s["last_hit_at"] = now
            touched = True
    return save_subscriptions(data, path) if touched else False


def save_subscriptions(data: dict, path: Optional[Path] = None) -> bool:
    """Атомарная запись (tmp + replace): бот пишет, пока сканер может читать."""
    p = Path(path or SUBSCRIPTIONS_FILE)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.parent / (p.name + ".tmp")
        tmp.write_text(json.dumps(data or {}, ensure_ascii=False, indent=2),
                       encoding="utf-8")
        os.replace(tmp, p)
        return True
    except OSError:
        return False
