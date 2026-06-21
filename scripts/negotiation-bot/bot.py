#!/usr/bin/env python3
"""
Двусторонний Telegram-бот переговоров (тот же бот, что шлёт сделки — теперь
принимает нажатия и пересланные ответы продавцов).

Петля:
  1) Сканер кладёт мотивированные лоты в очередь (negotiation-queue.json).
  2) Бот постит лот тебе с кнопкой «▶️ Веду торг».
  3) Жмёшь — бот (через common.negotiator) даёт открывающее сообщение продавцу.
  4) Ты отправляешь его продавцу (вручную) и жмёшь «✅ Отправил, жду ответ».
  5) Пересылаешь боту ответ продавца обычным текстом — бот даёт следующий ход.
  6) Когда сошлись в пределах потолка — «🤝 ГОТОВ К СДЕЛКЕ: X ₽» + контакты/логистика.

Использует Bot API напрямую (requests) и ТОТ ЖE токен бота — TELEGRAM_BOT_TOKEN.
Никаких новых зависимостей. Сетевой слой (TelegramTransport) тонкий и инъектируемый,
поэтому маршрутизация апдейтов тестируется офлайн.

Запуск:  TELEGRAM_BOT_TOKEN=123:abc python3 scripts/negotiation-bot/bot.py
"""

from __future__ import annotations

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Optional, Callable, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # scripts/

from common.negotiator import next_move, NegotiationMove

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NegotiationBot")


def _load_dotenv():
    """Минимальный загрузчик .env (рядом со скриптом, в корне репо или в cwd).
    Без зависимостей. НЕ перетирает уже заданные переменные окружения."""
    here = Path(__file__).resolve()
    bases = [here.parent, here.parent.parent.parent, Path.cwd()]   # bot/ , repo root, cwd
    for base in bases:
        envf = base / ".env"
        if not envf.exists():
            continue
        try:
            for line in envf.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass


_load_dotenv()

BOT_TOKEN   = os.environ.get('TELEGRAM_BOT_TOKEN', '')
STATE_FILE  = Path(os.environ.get('NEGOTIATION_STATE_PATH', 'public/data/negotiation-state.json'))
QUEUE_FILE  = Path(os.environ.get('NEGOTIATION_QUEUE_PATH', 'public/data/negotiation-queue.json'))
# Ограничить бота одним владельцем (твоим chat_id). Пусто — учится на первом /start.
OWNER_CHAT_ID = os.environ.get('OWNER_CHAT_ID', '').strip()


def _fmt(n) -> str:
    return f"{int(n):,}".replace(",", " ")


# ─── Тонкий сетевой слой (инъектируется в тестах) ────────────────────────────
class TelegramTransport:
    def __init__(self, token: str):
        self.base = f"https://api.telegram.org/bot{token}"
        import requests as _r
        self._r = _r

    def get_updates(self, offset: int, timeout: int = 25):
        try:
            resp = self._r.get(f"{self.base}/getUpdates",
                               params={"offset": offset, "timeout": timeout},
                               timeout=timeout + 10)
            return resp.json().get("result", [])
        except Exception as e:
            logger.error(f"getUpdates: {e}")
            return []

    def send_message(self, chat_id, text, buttons=None):
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML",
                   "disable_web_page_preview": False}
        if buttons:
            payload["reply_markup"] = {"inline_keyboard": [
                [{"text": t, "callback_data": d} for (t, d) in row] for row in buttons
            ]}
        for attempt in range(1, 4):
            try:
                r = self._r.post(f"{self.base}/sendMessage", json=payload, timeout=15)
                try:
                    ok = r.json().get("ok", True)
                except Exception:
                    ok = getattr(r, "ok", True)
                if ok:
                    return True
                logger.warning(f"sendMessage отклонён (попытка {attempt}): {str(r.text)[:160]}")
            except Exception as e:
                logger.warning(f"sendMessage сбой (попытка {attempt}): {e}")
            time.sleep(2 * attempt)
        logger.error("sendMessage НЕ доставлено после 3 попыток")
        return False

    def answer_callback(self, callback_id, text=None):
        try:
            self._r.post(f"{self.base}/answerCallbackQuery",
                         json={"callback_query_id": callback_id, "text": text or ""}, timeout=10)
        except Exception as e:
            logger.error(f"answerCallbackQuery: {e}")


# ─── Хранилище состояния ─────────────────────────────────────────────────────
def _load_json(path: Path, default):
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def _save_json(path: Path, data):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"save {path}: {e}")


# ─── Бот ─────────────────────────────────────────────────────────────────────
class NegotiationBot:
    """Чистая маршрутизация апдейтов. handle_update/pull_new_leads возвращают
    списки действий — их выполняет внешний цикл (или тест проверяет напрямую)."""

    def __init__(self, transport, state_path=STATE_FILE, queue_path=QUEUE_FILE,
                 owner_chat_id=None, llm_call: Optional[Callable] = None):
        self.tx = transport
        self.state_path = Path(state_path)
        self.queue_path = Path(queue_path)
        self.llm_call = llm_call
        self.state = _load_json(self.state_path, {
            "offset": 0, "owner_chat_id": owner_chat_id, "conversations": {},
            "active_lead": None, "posted_leads": [],
        })
        if owner_chat_id and not self.state.get("owner_chat_id"):
            self.state["owner_chat_id"] = owner_chat_id

    # ── helpers ──────────────────────────────────────────────────────────────
    def _save(self):
        _save_json(self.state_path, self.state)

    def _is_owner(self, chat_id) -> bool:
        owner = self.state.get("owner_chat_id")
        return owner is None or str(chat_id) == str(owner)

    def _conv_buttons(self, lead_id):
        return [[("✅ Отправил, жду ответ", f"conv:{lead_id}:sent")],
                [("✏️ Другой вариант", f"conv:{lead_id}:redraft"),
                 ("🛑 Стоп", f"conv:{lead_id}:stop")]]

    def _draft(self, lead, seller_reply=None) -> NegotiationMove:
        return next_move(
            title=lead["title"], asking=lead["asking"], target=lead["target"],
            walk_away=lead["walk_away"], location=lead.get("location", ""),
            history=lead.get("history", []), seller_reply=seller_reply,
            llm_call=self.llm_call,
        )

    def _lead_card(self, lead) -> str:
        mot = lead.get("motivation_label", "")
        sig = lead.get("motivation_signals", [])
        sig_line = ("\n🧭 " + "; ".join(sig[:4])) if sig else ""
        src = lead.get("source")
        link_label = "Открыть в Telegram" if src == "tg" else "Открыть на Avito"
        src_badge = " 📲" if src == "tg" else (" 🕰" if src == "stale" else "")
        return (
            f"🧲 <b>Лид на торг</b>{src_badge} {mot}\n"
            f"💻 {lead['title']}\n"
            f"💰 Цена продавца: {_fmt(lead['asking'])} ₽\n"
            f"🎯 Твоя цель: {_fmt(lead['target'])} ₽ • 🧱 потолок: {_fmt(lead['walk_away'])} ₽"
            f"{sig_line}\n"
            f"🔗 <a href=\"{lead.get('url','')}\">{link_label}</a>"
        )

    # ── приём новых лидов из очереди ─────────────────────────────────────────
    def pull_new_leads(self) -> List[dict]:
        """Читает очередь, постит лиды, которых ещё не показывали. Возвращает действия."""
        actions = []
        owner = self.state.get("owner_chat_id")
        if not owner:
            return actions   # пока не знаем кому слать — ждём /start
        queue = _load_json(self.queue_path, [])
        posted = set(self.state.get("posted_leads", []))
        changed = False
        for lead in queue:
            lid = lead.get("id")
            if not lid or lid in posted:
                continue
            actions.append({"type": "send", "chat_id": owner,
                            "text": self._lead_card(lead),
                            "buttons": [[("▶️ Веду торг", f"lead:{lid}:start"),
                                         ("⏭ Пропустить", f"lead:{lid}:skip")]]})
            # сохраняем лот в conversations, чтобы потом достать по id
            self.state["conversations"][lid] = {
                "lead": lead, "history": [], "stage": "queued",
                "active": False, "agreed_price": None,
            }
            posted.add(lid)
            changed = True
        if changed:
            self.state["posted_leads"] = list(posted)[-500:]
            self._save()
        return actions

    # ── обработка входящего апдейта ──────────────────────────────────────────
    def handle_update(self, update: dict) -> List[dict]:
        self.state["offset"] = max(self.state.get("offset", 0), update.get("update_id", 0) + 1)
        if "callback_query" in update:
            return self._handle_callback(update["callback_query"])
        if "message" in update:
            return self._handle_message(update["message"])
        return []

    def _handle_message(self, msg: dict) -> List[dict]:
        chat_id = msg.get("chat", {}).get("id")
        text = (msg.get("text") or "").strip()
        if not chat_id:
            return []

        # /start — регистрируем владельца
        if text.startswith("/start"):
            if not self.state.get("owner_chat_id"):
                self.state["owner_chat_id"] = chat_id
            self._save()
            return [{"type": "send", "chat_id": chat_id,
                     "text": "✅ Бот переговоров подключён. Лоты на торг буду присылать сюда.\n"
                             "Жми «▶️ Веду торг», отправляй продавцу мой текст, "
                             "а его ответы — пересылай мне обычным сообщением."}]

        if not self._is_owner(chat_id):
            return []   # игнорируем чужих

        if text.startswith("/help"):
            return [{"type": "send", "chat_id": chat_id,
                     "text": "Петля: ▶️ Веду торг → отправляешь мой текст продавцу → "
                             "«✅ Отправил» → пересылаешь мне ответ продавца → я даю следующий ход."}]

        # Обычный текст = ответ продавца для активного диалога
        active = self.state.get("active_lead")
        if not active or active not in self.state["conversations"]:
            return [{"type": "send", "chat_id": chat_id,
                     "text": "Нет активного диалога. Жми «▶️ Веду торг» на нужном лоте."}]
        return self._advance(active, seller_reply=text)

    def _handle_callback(self, cq: dict) -> List[dict]:
        data = cq.get("data", "")
        cq_id = cq.get("id")
        chat_id = cq.get("message", {}).get("chat", {}).get("id")
        actions: List[dict] = [{"type": "answer_callback", "id": cq_id}]

        if chat_id and not self._is_owner(chat_id):
            return actions

        parts = data.split(":")
        if len(parts) != 3:
            return actions
        scope, lid, verb = parts
        conv = self.state["conversations"].get(lid)
        if not conv:
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": "Лид не найден (возможно, перезапуск). Дождись нового."})
            return actions

        if scope == "lead" and verb == "start":
            self.state["active_lead"] = lid
            conv["active"] = True
            mv = self._draft(conv["lead"])
            conv["stage"] = mv.stage
            conv["lead"].setdefault("history", []).append({"role": "buyer", "text": mv.message})
            self._save()
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": f"✍️ <b>Отправь продавцу:</b>\n<pre>{_esc(mv.message)}</pre>\n"
                                    f"🧠 {mv.rationale}",
                            "buttons": self._conv_buttons(lid)})
            return actions

        if scope == "lead" and verb == "skip":
            conv["stage"] = "skipped"
            self._save()
            actions.append({"type": "send", "chat_id": chat_id, "text": "⏭ Пропущено."})
            return actions

        if scope == "conv" and verb == "sent":
            self.state["active_lead"] = lid
            self._save()
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": "👍 Жду. Перешли сюда ответ продавца обычным сообщением."})
            return actions

        if scope == "conv" and verb == "redraft":
            self.state["active_lead"] = lid
            last_seller = _last_seller(conv["lead"].get("history", []))
            mv = self._draft(conv["lead"], seller_reply=last_seller)
            actions.append({"type": "send", "chat_id": chat_id,
                            "text": f"✍️ <b>Вариант:</b>\n<pre>{_esc(mv.message)}</pre>",
                            "buttons": self._conv_buttons(lid)})
            return actions

        if scope == "conv" and verb == "stop":
            conv["active"] = False
            conv["stage"] = "stopped"
            if self.state.get("active_lead") == lid:
                self.state["active_lead"] = None
            self._save()
            actions.append({"type": "send", "chat_id": chat_id, "text": "🛑 Диалог остановлен."})
            return actions

        return actions

    def _advance(self, lid, seller_reply) -> List[dict]:
        conv = self.state["conversations"][lid]
        lead = conv["lead"]
        owner = self.state.get("owner_chat_id")
        lead.setdefault("history", []).append({"role": "seller", "text": seller_reply})
        mv = self._draft(lead, seller_reply=seller_reply)
        conv["stage"] = mv.stage
        conv["agreed_price"] = mv.agreed_price
        lead["history"].append({"role": "buyer", "text": mv.message})
        actions = []

        if mv.deal_ready:
            conv["active"] = False
            self.state["active_lead"] = None
            actions.append({"type": "send", "chat_id": owner,
                            "text": (f"🤝 <b>ГОТОВ К СДЕЛКЕ: {_fmt(mv.agreed_price or lead['asking'])} ₽</b>\n"
                                     f"💻 {lead['title']}\n"
                                     f"📍 {lead.get('location','—')}\n"
                                     f"✍️ Финальное сообщение продавцу:\n<pre>{_esc(mv.message)}</pre>\n"
                                     f"🔗 <a href=\"{lead.get('url','')}\">Объявление</a>")})
        elif mv.stage in ("stalled", "rejected"):
            conv["active"] = False
            self.state["active_lead"] = None
            actions.append({"type": "send", "chat_id": owner,
                            "text": (f"🚪 Похоже, тупик ({mv.stage}). Мягкий выход:\n"
                                     f"<pre>{_esc(mv.message)}</pre>")})
        else:
            actions.append({"type": "send", "chat_id": owner,
                            "text": f"✍️ <b>Ответь продавцу:</b>\n<pre>{_esc(mv.message)}</pre>\n"
                                    f"🧠 {mv.rationale}",
                            "buttons": self._conv_buttons(lid)})
        self._save()
        return actions

    # ── исполнение действий через транспорт ──────────────────────────────────
    def _exec(self, actions: List[dict]):
        for a in actions:
            if a["type"] == "send":
                self.tx.send_message(a["chat_id"], a["text"], a.get("buttons"))
            elif a["type"] == "answer_callback":
                self.tx.answer_callback(a["id"], a.get("text"))

    def run_forever(self, poll_timeout=25):
        logger.info("🤖 Бот переговоров запущен (long-polling)")
        while True:
            self._exec(self.pull_new_leads())
            updates = self.tx.get_updates(self.state.get("offset", 0), timeout=poll_timeout)
            for upd in updates:
                try:
                    self._exec(self.handle_update(upd))
                except Exception as e:
                    logger.error(f"handle_update: {e}")
            self._save()
            if not updates:
                time.sleep(1)


def _esc(s: str) -> str:
    import html
    return html.escape(s or "")


def _last_seller(history) -> Optional[str]:
    for h in reversed(history or []):
        if h.get("role") == "seller":
            return h.get("text")
    return None


if __name__ == "__main__":
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN не задан"); sys.exit(1)
    bot = NegotiationBot(TelegramTransport(BOT_TOKEN),
                         owner_chat_id=OWNER_CHAT_ID or None)
    bot.run_forever()
