#!/usr/bin/env python3
"""
Разовая авторизация Telethon (создаёт файл сессии для монитора чатов).
Запускать ИНТЕРАКТИВНО (нужно ввести телефон и код из Telegram):

  TG_API_ID=12345 TG_API_HASH=abc... python3 scripts/tg-leads/login.py

api_id/api_hash берутся на https://my.telegram.org → API development tools.
После успеха появится файл bestmac.session — его читает monitor.py.
"""
import os
import sys

try:
    from telethon.sync import TelegramClient
except ImportError:
    print("❌ Сначала: pip install telethon"); sys.exit(1)

api_id = os.environ.get("TG_API_ID")
api_hash = os.environ.get("TG_API_HASH")
session = os.environ.get("TG_SESSION", "bestmac")

if not (api_id and api_hash):
    print("❌ Задай TG_API_ID и TG_API_HASH (см. my.telegram.org)"); sys.exit(1)

with TelegramClient(session, int(api_id), api_hash) as client:
    me = client.get_me()
    print(f"✅ Авторизован как @{me.username or me.first_name}. Сессия: {session}.session")
