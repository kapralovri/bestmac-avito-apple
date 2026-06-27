#!/usr/bin/env python3
"""Офлайн-тесты intake-сервера: _append (дедуп, валидация цены, cap, атомарность)."""
import os
import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
import server  # noqa: E402


def run():
    tmp = Path(tempfile.mkdtemp()) / 'incoming.json'
    server.INCOMING = tmp

    # 1) базовое добавление + валидация
    added = server._append([
        {'url': 'u1', 'title': 'A', 'price': 100},
        {'url': 'u2', 'title': 'B', 'price': 0},      # цена 0 → отброс
        {'url': '', 'title': 'C', 'price': 50},        # нет url → отброс
        {'url': 'u3', 'title': 'D', 'price': '200'},   # строковая цена → int
        {'url': 'u5', 'title': 'E', 'price': 'abc'},   # битая цена → отброс
        None,                                          # мусор → отброс
        'junk',                                        # строка → отброс (не падаем!)
        42,                                            # число → отброс (не падаем!)
    ])
    assert added == 2, f'added={added}'
    data = json.loads(tmp.read_text(encoding='utf-8'))
    assert {c['url'] for c in data} == {'u1', 'u3'}
    assert next(c for c in data if c['url'] == 'u3')['price'] == 200

    # 2) дедуп по url между вызовами; дубль не перезаписывает цену
    added2 = server._append([
        {'url': 'u1', 'title': 'dup', 'price': 999},
        {'url': 'u4', 'title': 'F', 'price': 10},
    ])
    assert added2 == 1, f'added2={added2}'
    data = json.loads(tmp.read_text(encoding='utf-8'))
    assert len({c['url'] for c in data}) == 3
    assert next(c for c in data if c['url'] == 'u1')['price'] == 100

    # 3) обрезка длинных полей
    server._append([{'url': 'u6', 'title': 'Z' * 500, 'price': 5, 'date': 'D' * 80}])
    rec = next(c for c in json.loads(tmp.read_text(encoding='utf-8')) if c['url'] == 'u6')
    assert len(rec['title']) == 160 and len(rec['date']) == 40

    # 4) cap MAX_CARDS
    server.MAX_CARDS = 5
    server._append([{'url': f'x{i}', 'title': 'x', 'price': i + 1} for i in range(20)])
    data = json.loads(tmp.read_text(encoding='utf-8'))
    assert len(data) == 5, f'cap={len(data)}'

    # 5) атомарность: временный файл убран
    assert not tmp.with_suffix('.tmp').exists()

    print('✅ intake _append тесты прошли')


if __name__ == '__main__':
    run()
