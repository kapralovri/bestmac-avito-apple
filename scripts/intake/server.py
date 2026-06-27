#!/usr/bin/env python3
"""
Intake-сервер: принимает карточки Avito от домашнего расширения (через HTTPS-прокси
bestmac.ru/api/intake) и складывает в incoming-cards.json (дедуп по url).
Лёгкий, только stdlib. Токен-авторизация. Слушает localhost — наружу не торчит
(HTTPS-фронт делает Vercel/Caddy).

Запуск:  INTAKE_TOKEN=... python3 scripts/intake/server.py
Обработку карточек делает: scanner_v2.py --intake (по таймеру раз в 1-2 мин).
"""
import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PORT = int(os.environ.get('INTAKE_PORT', '8787'))
HOST = os.environ.get('INTAKE_HOST', '0.0.0.0')   # за Vercel-прокси; токен обязателен
TOKEN = os.environ.get('INTAKE_TOKEN', '')
INCOMING = Path(os.environ.get('INTAKE_CARDS_PATH', 'public/data/incoming-cards.json'))
MAX_CARDS = 3000


def _append(cards):
    cur = []
    if INCOMING.exists():
        try:
            cur = json.loads(INCOMING.read_text(encoding='utf-8')) or []
        except Exception:
            cur = []
    seen = {c.get('url') for c in cur}
    added = 0
    for c in cards:
        u = (c or {}).get('url')
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
    INCOMING.write_text(json.dumps(cur[-MAX_CARDS:], ensure_ascii=False), encoding='utf-8')
    return added


class Handler(BaseHTTPRequestHandler):
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
        if TOKEN and self.headers.get('x-intake-token', '') != TOKEN:
            return self._send(403, {'ok': False, 'error': 'token'})
        try:
            n = int(self.headers.get('content-length', 0))
            data = json.loads(self.rfile.read(n) or b'{}')
            cards = data.get('cards') or []
        except Exception:
            return self._send(400, {'ok': False, 'error': 'json'})
        added = _append(cards if isinstance(cards, list) else [])
        self._send(200, {'ok': True, 'added': added})

    def do_GET(self):  # healthcheck
        self._send(200, {'ok': True, 'service': 'bestmac-intake'})

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    if not TOKEN:
        print('⚠️ INTAKE_TOKEN не задан — приём открыт всем!')
    print(f'🛰 Intake-сервер на {HOST}:{PORT} → {INCOMING}')
    HTTPServer((HOST, PORT), Handler).serve_forever()
