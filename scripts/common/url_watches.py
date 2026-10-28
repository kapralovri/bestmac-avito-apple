"""
Слежение за фильтром Авито — «присылай каждое новое объявление из этой ссылки»
(docs/avito-filter-watch.md). Владелец завёл для машин; работает для любого
поиска Авито, который собирает расширение.

Владение файлом url-watches.json: бот добавляет и удаляет фильтры, сканер
пишет их состояние (seen, базовая линия, журнал отправок), сервер приёма
отдаёт список URL расширению. Сканер сливает своё состояние с диском
(merge_state), чтобы не воскресить удалённый ботом фильтр.

Модуль чистый: ни сети, ни Telegram. Пути к файлам приходят аргументами.
"""

from __future__ import annotations

import html
import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit

URL_WATCHES_FILE = Path(os.environ.get('URL_WATCHES_PATH', 'public/data/url-watches.json'))

MAX_WATCHES = 10          # домашний Chrome держит вкладку на каждый фильтр
RATE_PER_HOUR = 20        # больше — фильтр слишком широкий
MAX_SEEN = 2000           # ссылок на фильтр; первая страница ~50

# Служебные параметры Авито: не меняют выдачу, но меняются от перехода к переходу.
_NOISE = {'context', 'cd', 'localpriority', 'p', 'presentationtype', 'radius', 'searchradius'}
_SORT_BY_DATE = '104'


def normalize_url(raw: str):
    """Ссылка на поиск Авито → (каноническая ссылка, ключ вкладки) или None.

    Каноническая ссылка: www.avito.ru, без служебных параметров, с сортировкой
    по дате — иначе новые объявления не попадут на первую страницу. Ключ —
    путь и значимые параметры без сортировки: по нему вкладка находит фильтр,
    даже если Авито дописал к адресу свои хвосты."""
    try:
        parts = urlsplit((raw or '').strip())
    except ValueError:
        return None
    host = (parts.hostname or '').lower()
    if parts.scheme not in ('http', 'https') or host not in ('www.avito.ru', 'avito.ru', 'm.avito.ru'):
        return None
    path = parts.path.rstrip('/') or '/'
    if path == '/':
        return None
    params = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=False)
              if k.lower() not in _NOISE and not k.lower().startswith('utm_')]
    significant = sorted((k, v) for k, v in params if k != 's')
    url = f"https://www.avito.ru{path}?" + urlencode(significant + [('s', _SORT_BY_DATE)])
    key = path + '|' + urlencode(significant)
    return url, key


_URL_RE = re.compile(r'https?://\S+')
_PRICE_RE = re.compile(r'\bдо\s+([\d\s.,]+)\s*(млн|м|тыс|т|к)?\b', re.I)


def _parse_amount(num: str, unit: Optional[str]) -> Optional[int]:
    s = num.replace(' ', '').replace(',', '.').rstrip('.')
    try:
        val = float(s)
    except ValueError:
        return None
    mult = {'млн': 1_000_000, 'м': 1_000_000, 'тыс': 1000, 'т': 1000, 'к': 1000}.get((unit or '').lower(), 1)
    out = int(round(val * mult))
    return out if out > 0 else None


def parse_filter_command(text: str) -> Optional[dict]:
    """«/filter <ссылка> [до <цена>] [название]» → {url, max_price, label} или None."""
    body = re.sub(r'^/\S+', '', (text or '').strip(), count=1).strip()
    m = _URL_RE.search(body)
    if not m:
        return None
    url = m.group(0)
    rest = (body[:m.start()] + ' ' + body[m.end():]).strip()
    max_price = None
    pm = _PRICE_RE.search(rest)
    if pm:
        max_price = _parse_amount(pm.group(1), pm.group(2))
        rest = (rest[:pm.start()] + ' ' + rest[pm.end():]).strip()
    return {'url': url, 'max_price': max_price, 'label': re.sub(r'\s+', ' ', rest).strip()}


def make_watch(*, chat_id, url: str, max_price: Optional[int], label: str) -> dict:
    norm = normalize_url(url)
    if norm is None:
        raise ValueError('not an avito search url')
    canon, key = norm
    return {
        'id': uuid.uuid4().hex[:8],
        'chat_id': chat_id,
        'label': label.strip()[:40] or f"Фильтр {datetime.now().strftime('%d.%m %H:%M')}",
        'url': canon,
        'key': key,
        'max_price': int(max_price) if max_price else None,
        'created_at': datetime.now().isoformat(timespec='seconds'),
        'baseline_done': False,
        'seen': [],
        'sent_log': [],
        'warned_at': 0,
    }


def load_watches(path: Path = URL_WATCHES_FILE) -> dict:
    try:
        data = json.loads(Path(path).read_text(encoding='utf-8'))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_watches(watches: dict, path: Path = URL_WATCHES_FILE) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(watches, ensure_ascii=False), encoding='utf-8')
    os.replace(tmp, path)


def watch_urls(watches: dict) -> list:
    """Список URL для расширения: по вкладке на фильтр."""
    return [w['url'] for w in watches.values() if isinstance(w, dict) and w.get('url')]


def find_watch(watches: dict, source_url: str) -> Optional[dict]:
    norm = normalize_url(source_url or '')
    if norm is None:
        return None
    key = norm[1]
    return next((w for w in watches.values() if isinstance(w, dict) and w.get('key') == key), None)


def decide(watch: dict, card: dict, now: float, *, baseline: bool) -> str:
    """Что делать с карточкой фильтра. Меняет состояние фильтра (seen, sent_log).

    baseline — фильтр ещё не прошёл первую пачку: всё, что уже висело на
    странице, запоминаем молча. Возвращает: baseline | seen | over_price |
    send | rate_warn | rate_limited."""
    url = card.get('url')
    seen = watch.setdefault('seen', [])
    if url in seen:
        return 'seen'
    seen.append(url)
    del seen[:-MAX_SEEN]
    if baseline:
        return 'baseline'
    cap = watch.get('max_price')
    if cap and int(card.get('price') or 0) > int(cap):
        return 'over_price'
    log = [t for t in watch.get('sent_log', []) if now - t < 3600]
    if len(log) >= RATE_PER_HOUR:
        watch['sent_log'] = log
        if now - float(watch.get('warned_at') or 0) >= 3600:
            watch['warned_at'] = now
            return 'rate_warn'
        return 'rate_limited'
    log.append(now)
    watch['sent_log'] = log
    return 'send'


_STATE_FIELDS = ('seen', 'baseline_done', 'sent_log', 'warned_at')


def merge_state(ours: dict, disk: dict) -> dict:
    """Наше состояние после прогона + актуальный состав с диска. Диск решает,
    какие фильтры есть (бот мог удалить или добавить); мы переносим только
    поля состояния на фильтры, которые всё ещё существуют."""
    final = {k: dict(v) for k, v in disk.items() if isinstance(v, dict)}
    for wid, w in ours.items():
        if wid in final:
            for f in _STATE_FIELDS:
                if f in w:
                    final[wid][f] = w[f]
    return final


def _rub(n) -> str:
    return f"{int(n):,}".replace(',', ' ') + ' ₽'


def alert_text(watch: dict, card: dict) -> str:
    icon = '🚗' if '/avtomobili' in (watch.get('url') or '') else '🔎'
    e = html.escape
    return (f"{icon} <b>Новое в фильтре «{e(watch.get('label') or '')}»</b>\n"
            f"{e(card.get('title') or '')}\n"
            f"💰 <b>{_rub(card.get('price') or 0)}</b>\n"
            f"🔗 <a href='{e(card.get('url') or '')}'>Открыть на Авито</a>")


def rate_warn_text(watch: dict) -> str:
    return (f"⚠️ Фильтр «{html.escape(watch.get('label') or '')}» слишком широкий: "
            f"больше {RATE_PER_HOUR} новых объявлений за час. Присылаю первые "
            f"{RATE_PER_HOUR} в час — сузьте фильтр на Авито и пришлите ссылку заново.")
