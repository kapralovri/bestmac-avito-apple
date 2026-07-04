#!/usr/bin/env python3
"""
Intake-сервер: принимает карточки Avito от домашнего расширения (через HTTPS-прокси
bestmac.ru/api/intake) и складывает в incoming-cards.json (дедуп по url).
Лёгкий, только stdlib. По умолчанию слушает 0.0.0.0 (чтобы дотянулся Vercel-форвард) —
наружу открыт, безопасность обеспечивают ОБЯЗАТЕЛЬНЫЙ токен + фаервол. HTTPS даёт
фронт (Vercel/Caddy). Без INTAKE_TOKEN сервер не стартует.

Запуск:  INTAKE_TOKEN=... python3 scripts/intake/server.py
Обработку карточек делает: scanner_v2.py --intake (по таймеру раз в 1-2 мин).
"""
import os
import sys
import time
import hmac
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

PORT = int(os.environ.get('INTAKE_PORT', '8787'))
HOST = os.environ.get('INTAKE_HOST', '0.0.0.0')   # за Vercel-прокси; токен обязателен
TOKEN = os.environ.get('INTAKE_TOKEN', '')
INCOMING = Path(os.environ.get('INTAKE_CARDS_PATH', 'public/data/incoming-cards.json'))
STATS = Path(os.environ.get('INTAKE_STATS_PATH', 'public/data/intake-stats.json'))
MAX_CARDS = 3000
MAX_BODY = 2 * 1024 * 1024   # 2 МБ — защита от раздувания памяти


def _bump_stats(n_received, n_added):
    """Пульс приёмника для кнопки «Статус» в боте: когда последняя отправка от
    расширения и сколько карточек за окно времени."""
    try:
        s = json.loads(STATS.read_text(encoding='utf-8')) if STATS.exists() else {}
        if not isinstance(s, dict):
            s = {}
    except Exception:
        s = {}
    now = time.time()
    s['last_at'] = now
    s['received_total'] = int(s.get('received_total', 0)) + n_received
    s['added_total'] = int(s.get('added_total', 0)) + n_added
    rec = s.get('recent') if isinstance(s.get('recent'), list) else []
    rec.append([now, n_received])
    s['recent'] = rec[-1000:]
    try:
        tmp = STATS.parent / (STATS.name + '.tmp')
        STATS.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(s), encoding='utf-8')
        os.replace(tmp, STATS)
    except Exception:
        pass


def _append(cards):
    cur = []
    if INCOMING.exists():
        try:
            cur = json.loads(INCOMING.read_text(encoding='utf-8')) or []
        except Exception:
            cur = []
    seen = {c.get('url') for c in cur if isinstance(c, dict)}
    added = 0
    for c in cards:
        if not isinstance(c, dict):
            continue          # мусор (строка/число) — пропускаем, не роняем всю пачку
        u = c.get('url')
        if not u or u in seen:
            continue
        try:
            price = int(c.get('price') or 0)
        except (ValueError, TypeError):
            price = 0
        if price <= 0:
            continue
        cur.append({'url': str(u), 'title': str(c.get('title', ''))[:160],
                    'price': price, 'date': str(c.get('date', ''))[:40]})
        seen.add(u)
        added += 1
    INCOMING.parent.mkdir(parents=True, exist_ok=True)
    # Атомарная запись: процессор делает os.replace параллельно — без tmp можно
    # отдать ему усечённый JSON или потерять карточки.
    tmp = INCOMING.with_suffix('.tmp')
    tmp.write_text(json.dumps(cur[-MAX_CARDS:], ensure_ascii=False), encoding='utf-8')
    os.replace(tmp, INCOMING)
    return added


# _append/_bump_stats делают read-modify-write файлов; в многопоточном сервере
# параллельные POST могли бы терять карточки — сериализуем записи.
_WRITE_LOCK = Lock()


class Handler(BaseHTTPRequestHandler):
    # Таймаут сокета на запрос: молчащий клиент (порт-сканер, оборванное соединение)
    # раньше вешал однопоточный сервер НАВСЕГДА — сервис жив, но не отвечает
    # (инцидент 04.07: ConnectionResetError + зависание в recv).
    timeout = 20
    def _send(self, code, obj):
        b = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        if self.path.split('?')[0] != '/intake':
            return self._send(404, {'ok': False})
        # .encode() с обеих сторон: compare_digest на str падает на не-ASCII токене
        if not hmac.compare_digest(self.headers.get('x-intake-token', '').encode('utf-8'),
                                   TOKEN.encode('utf-8')):
            return self._send(403, {'ok': False, 'error': 'token'})
        try:
            n = int(self.headers.get('content-length', 0))
        except (ValueError, TypeError):
            return self._send(400, {'ok': False, 'error': 'length'})
        if n > MAX_BODY:
            return self._send(413, {'ok': False, 'error': 'too large'})
        try:
            data = json.loads(self.rfile.read(n) or b'{}')
            cards = data.get('cards') or []
        except Exception:
            return self._send(400, {'ok': False, 'error': 'json'})
        card_list = cards if isinstance(cards, list) else []
        with _WRITE_LOCK:
            added = _append(card_list)
            try:
                _bump_stats(len(card_list), added)
            except Exception:
                pass
        self._send(200, {'ok': True, 'added': added})

    def do_GET(self):  # healthcheck
        self._send(200, {'ok': True, 'service': 'bestmac-intake'})

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    if not TOKEN:
        # Fail-safe: сервер слушает наружу (0.0.0.0) — без токена приём был бы открыт всем.
        sys.exit('❌ INTAKE_TOKEN не задан — отказ запуска (иначе приём открыт всем).')
    print(f'🛰 Intake-сервер на {HOST}:{PORT} → {INCOMING}')
    # ThreadingHTTPServer: медленный/молчащий клиент больше не блокирует остальных
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
