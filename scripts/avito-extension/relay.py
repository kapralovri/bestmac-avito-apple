#!/usr/bin/env python3
"""
Локальный релей для домашнего коллектора на СТАРОМ Mac, где браузер не может открыть
HTTPS к Vercel/bestmac.ru (устаревший TLS / корневой сертификат).

Идея: http://127.0.0.1 Chrome считает «безопасным», поэтому расширение со страницы
Авито (https) может слать сюда без блокировки mixed-content и без TLS. Релей пересылает
карточки на VPS по обычному HTTP (без браузерного TLS — старый сертификат не мешает).

  Chrome (парсит Авито) → http://127.0.0.1:8765  →  relay.py  →  http://VPS:8787  → Telegram

Запуск на Mac:   python3 relay.py
В попапе расширения укажи endpoint:   http://127.0.0.1:8765/intake
"""
import os
import json
import functools
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

print = functools.partial(print, flush=True)   # сразу видеть активность в консоли

PORT = int(os.environ.get('RELAY_PORT', '8765'))
VPS_URL = os.environ.get('RELAY_VPS_URL', 'http://84.54.28.114:8787/intake')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-intake-token',
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        self._send(200, {'ok': True, 'service': 'bestmac-relay', 'vps': VPS_URL})

    def do_POST(self):
        try:
            n = int(self.headers.get('content-length', 0))
            data = json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            return self._send(400, {'ok': False, 'error': 'json'})
        token = data.get('token') or self.headers.get('x-intake-token', '')
        cards = data.get('cards') or []
        try:
            req = urllib.request.Request(
                VPS_URL,
                data=json.dumps({'cards': cards}).encode('utf-8'),
                headers={'content-type': 'application/json', 'x-intake-token': token},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                body = r.read().decode('utf-8', 'ignore')
                self._send(getattr(r, 'status', 200), json.loads(body) if body else {'ok': True})
            print("[relay] -> VPS: %d карточек отправлено" % len(cards))
        except urllib.error.HTTPError as e:
            print("[relay] VPS HTTP %d" % e.code)
            self._send(e.code, {'ok': False, 'error': 'vps %d' % e.code})
        except Exception as e:
            print("[relay] ошибка форварда: %s" % e)
            self._send(502, {'ok': False, 'error': 'forward: %s' % e})

    def log_message(self, *a):
        pass  # тихо (свои print'ы выше)


if __name__ == '__main__':
    print("BestMac relay: http://127.0.0.1:%d  ->  %s" % (PORT, VPS_URL))
    print("В попапе расширения укажи endpoint: http://127.0.0.1:%d/intake" % PORT)
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
