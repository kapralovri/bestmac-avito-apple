#!/usr/bin/env python3
"""
Quote-бот — публичная витрина выкупа в Telegram (вместо мёртвого сайта).

Поток продавца:
  /start → «Оценить технику» → семейство → модель → RAM → SSD → состояние →
  комплект/iCloud → МГНОВЕННАЯ вилка выкупа → (по желанию фото) → телефон/курьер →
  заявка падает тебе (LEADS_CHAT_ID) + продавцу выдаётся реферальная ссылка (2000 ₽).

Гибрид по фото: можно приложить фото устройства и скриншот «Об этом маке» — в v1
они пересылаются оценщику (человек проверяет повреждения/модель). Авто-чтение фото
ИИ-зрением — v2 (нужен vision-ключ).

Отдельный публичный бот, свой токен QUOTE_BOT_TOKEN. Сетевой слой инъектируется —
FSM тестируется офлайн.

Запуск:  QUOTE_BOT_TOKEN=123:abc python3 scripts/quote-bot/bot.py
"""
from __future__ import annotations

import os
import sys
import json
import time
import html
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))            # quote-bot/
from quote_engine import (load_catalog, estimate, CONDITION_LABELS, FAMILIES)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("QuoteBot")


def _load_dotenv():
    here = Path(__file__).resolve()
    for base in [here.parent, here.parent.parent.parent, Path.cwd()]:
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

BOT_TOKEN     = os.environ.get('QUOTE_BOT_TOKEN', '')
LEADS_CHAT_ID = os.environ.get('LEADS_CHAT_ID', os.environ.get('OWNER_CHAT_ID', '')).strip()
STATE_FILE    = Path(os.environ.get('QUOTE_STATE_PATH', 'public/data/quote-state.json'))
PRICES_FILE   = os.environ.get('PRICES_FILE_PATH', 'public/data/avito-prices.json')
BUYOUT_FILE   = os.environ.get('BUYOUT_FILE_PATH', 'public/data/buyout.json')
REFERRAL_BONUS = os.environ.get('REFERRAL_BONUS', '2000')
BOT_USERNAME  = os.environ.get('QUOTE_BOT_USERNAME', '')   # для реф-ссылки
SITE_URL      = os.environ.get('SITE_URL', 'https://bestmac.ru')


def _money(n):
    return f"{int(n):,}".replace(",", " ")


# ─── Сетевой слой (инъектируется в тестах) ───────────────────────────────────
class TelegramTransport:
    def __init__(self, token):
        self.base = f"https://api.telegram.org/bot{token}"
        import requests as _r
        self._r = _r

    def get_updates(self, offset, timeout=25):
        try:
            return self._r.get(f"{self.base}/getUpdates",
                               params={"offset": offset, "timeout": timeout},
                               timeout=timeout + 10).json().get("result", [])
        except Exception as e:
            logger.error(f"getUpdates: {e}")
            return []

    def _post(self, method, payload):
        for attempt in range(1, 4):
            try:
                r = self._r.post(f"{self.base}/{method}", json=payload, timeout=15)
                try:
                    if r.json().get("ok", True):
                        return True
                except Exception:
                    return True
            except Exception as e:
                logger.warning(f"{method} сбой (попытка {attempt}): {e}")
            time.sleep(2 * attempt)
        logger.error(f"{method} НЕ доставлено")
        return False

    def send_message(self, chat_id, text, buttons=None, contact_btn=False):
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML",
                   "disable_web_page_preview": True}
        if buttons:
            def _btn(t, d):
                return {"text": t, "url": d} if str(d).startswith("http") else {"text": t, "callback_data": d}
            payload["reply_markup"] = {"inline_keyboard": [
                [_btn(t, d) for (t, d) in row] for row in buttons]}
        elif contact_btn:
            payload["reply_markup"] = {"resize_keyboard": True, "one_time_keyboard": True,
                "keyboard": [[{"text": "📞 Отправить мой номер", "request_contact": True}]]}
        return self._post("sendMessage", payload)

    def send_photo(self, chat_id, file_id, caption=None):
        return self._post("sendPhoto", {"chat_id": chat_id, "photo": file_id, "caption": caption or ""})

    def answer_callback(self, cb_id, text=None):
        return self._post("answerCallbackQuery", {"callback_query_id": cb_id, "text": text or ""})


def _load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


# ─── Бот ─────────────────────────────────────────────────────────────────────
class QuoteBot:
    def __init__(self, transport, catalog, state_path=STATE_FILE,
                 leads_chat=None, bot_username="", referral_bonus="2000",
                 site_url="https://bestmac.ru"):
        self.tx = transport
        self.cat = catalog
        self.state_path = Path(state_path)
        self.leads_chat = leads_chat
        self.bot_username = bot_username
        self.referral_bonus = referral_bonus
        self.site_url = site_url
        st = _load_json(self.state_path, {})
        self.offset = st.get("offset", 0)
        self.users = st.get("users", {})      # chat_id(str) -> session

    def _save(self):
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump({"offset": self.offset, "users": self.users}, f, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"save: {e}")

    def _u(self, chat_id):
        return self.users.setdefault(str(chat_id), {
            "step": "new", "photos": [], "has_charger": True, "has_box": True,
            "icloud_blocked": False, "condition": "A", "ref": None, "cycles": 0,
        })

    # ── рендеры экранов (возвращают (text, buttons)) ──────────────────────────
    def _greet(self):
        return ("👋 <b>BestMac — оценка и выкуп вашего Mac за минуту.</b>\n"
                "Узнайте цену, не выходя из дома: курьер заберёт технику, деньги сразу, "
                "договор, <b>сертифицированное стирание данных</b>.\n\n"
                "Нажмите «Оценить» — это займёт минуту.\n"
                "💡 Можно просто прислать <b>фото устройства</b> и <b>скриншот «Об этом маке»</b> — "
                "оценщик учтёт их при подтверждении цены.",
                [[("▶️ Оценить мой Mac", "go:family")],
                 [("🌐 О сервисе — bestmac.ru", SITE_URL)]])

    def _menu(self, u, kind, options, prompt, back=None):
        u["_menu"] = options
        rows = [[(opt[:38], f"{kind}:{i}")] for i, opt in enumerate(options)]
        if back:
            rows.append([("⬅️ Назад", back)])
        return prompt, rows

    def _extras_screen(self, u):
        q = estimate(self.cat, u["model"], u["ram"], u["ssd"],
                     condition=u["condition"], has_charger=u["has_charger"],
                     has_box=u["has_box"], icloud_blocked=u["icloud_blocked"])
        ch = "✅ с зарядкой" if u["has_charger"] else "❌ без зарядки"
        bx = "✅ с коробкой" if u["has_box"] else "❌ без коробки"
        ic = "🔒 iCloud привязан" if u["icloud_blocked"] else "🔓 iCloud отвязан"
        text = (f"💻 <b>{html.escape(u['model'])}</b> • {u['ram']}/{u['ssd']} ГБ\n"
                f"🩹 Состояние: {CONDITION_LABELS.get(u['condition'])}\n\n"
                f"💰 Предварительно: <b>{q.vilka()}</b>\n"
                "Уточните комплект — цена пересчитается:")
        rows = [
            [(ch, "tg:charger"), (bx, "tg:box")],
            [(ic, "tg:icloud")],
            [("✅ Всё верно — оставить заявку", "go:contact")],
            [("⬅️ Изменить состояние", "go:condition")],
        ]
        return text, rows

    # ── обработка апдейта ─────────────────────────────────────────────────────
    def handle_update(self, upd):
        self.offset = max(self.offset, upd.get("update_id", 0) + 1)
        if "callback_query" in upd:
            return self._on_cb(upd["callback_query"])
        if "message" in upd:
            return self._on_msg(upd["message"])
        return []

    def _on_msg(self, msg):
        chat_id = msg.get("chat", {}).get("id")
        if not chat_id:
            return []
        u = self._u(chat_id)

        # фото — принимаем на любом шаге
        if msg.get("photo"):
            fid = msg["photo"][-1]["file_id"]
            u["photos"].append(fid)
            self._save()
            return [{"t": "send", "chat": chat_id,
                     "text": f"📷 Фото добавлено ({len(u['photos'])}). Можно ещё; "
                             "оценщик учтёт их при подтверждении."}]

        # контакт (кнопка «отправить номер») или текст с телефоном
        contact = msg.get("contact")
        text = (msg.get("text") or "").strip()
        if text.startswith("/start"):
            parts = text.split(maxsplit=1)
            if len(parts) > 1 and parts[1].startswith("ref_"):
                u["ref"] = parts[1][4:]
            u["step"] = "new"
            self._save()
            g_text, g_btn = self._greet()
            return [{"t": "send", "chat": chat_id, "text": g_text, "btn": g_btn}]

        if u.get("step") == "contact" and (contact or text):
            phone = contact.get("phone_number") if contact else text
            name = (contact.get("first_name", "") if contact else
                    msg.get("from", {}).get("first_name", ""))
            return self._finish(chat_id, u, phone, name)

        # прочее
        return [{"t": "send", "chat": chat_id,
                 "text": "Нажмите «Оценить технику», чтобы начать 👇",
                 "btn": [[("▶️ Оценить технику", "go:family")]]}]

    def _on_cb(self, cb):
        chat_id = cb.get("message", {}).get("chat", {}).get("id")
        data = cb.get("data", "")
        u = self._u(chat_id)
        acts = [{"t": "ack", "id": cb.get("id")}]
        scope, _, val = data.partition(":")

        if data == "go:family":
            u["step"] = "family"
            text, rows = self._menu(u, "f", sorted(self.cat.families.keys()),
                                    "Выберите тип устройства:")
            acts.append({"t": "send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if scope == "f":
            fam = u["_menu"][int(val)]
            u["family"] = fam; u["step"] = "model"
            text, rows = self._menu(u, "m", self.cat.models(fam),
                                    f"{fam} — выберите модель:", back="go:family")
            acts.append({"t": "send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if scope == "m":
            u["model"] = u["_menu"][int(val)]; u["step"] = "ram"
            rams = self.cat.rams(u["model"])
            text, rows = self._menu(u, "r", [f"{r} ГБ ОЗУ" for r in rams],
                                    "Оперативная память:", back="go:family")
            u["_rams"] = rams
            acts.append({"t": "send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if scope == "r":
            u["ram"] = u["_rams"][int(val)]; u["step"] = "ssd"
            ssds = self.cat.storages(u["model"], u["ram"])
            text, rows = self._menu(u, "s", [f"{s} ГБ SSD" for s in ssds],
                                    "Накопитель:", back="go:family")
            u["_ssds"] = ssds
            acts.append({"t": "send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if scope == "s":
            u["ssd"] = u["_ssds"][int(val)]; u["step"] = "condition"
            return self._ask_condition(chat_id, u, acts)

        if data == "go:condition":
            return self._ask_condition(chat_id, u, acts)

        if scope == "c":   # condition chosen
            u["condition"] = val; u["step"] = "extras"
            text, rows = self._extras_screen(u)
            acts.append({"t": "send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if scope == "tg":  # toggle charger/box/icloud
            if val == "charger": u["has_charger"] = not u["has_charger"]
            elif val == "box":   u["has_box"] = not u["has_box"]
            elif val == "icloud": u["icloud_blocked"] = not u["icloud_blocked"]
            text, rows = self._extras_screen(u)
            acts.append({"t": "edit_or_send", "chat": chat_id, "text": text, "btn": rows})
            self._save(); return acts

        if data == "go:contact":
            u["step"] = "contact"
            q = estimate(self.cat, u["model"], u["ram"], u["ssd"], condition=u["condition"],
                         has_charger=u["has_charger"], has_box=u["has_box"],
                         icloud_blocked=u["icloud_blocked"])
            acts.append({"t": "send", "chat": chat_id,
                         "text": (f"💰 Ваша предварительная цена: <b>{q.vilka()}</b>\n\n"
                                  "Оставьте номер — оценщик подтвердит цену и согласует "
                                  "удобное время курьера (деньги сразу, договор, стирание данных).\n"
                                  "📷 Можно приложить фото устройства и скриншот «Об этом маке»."),
                         "contact": True})
            self._save(); return acts

        return acts

    def _ask_condition(self, chat_id, u, acts):
        u["step"] = "condition"
        rows = [[(CONDITION_LABELS["A"], "c:A")],
                [(CONDITION_LABELS["B"], "c:B")],
                [(CONDITION_LABELS["C"], "c:C")]]
        acts.append({"t": "send", "chat": chat_id,
                     "text": "Оцените состояние корпуса/экрана:", "btn": rows})
        self._save(); return acts

    def _finish(self, chat_id, u, phone, name):
        q = estimate(self.cat, u["model"], u["ram"], u["ssd"], condition=u["condition"],
                     has_charger=u["has_charger"], has_box=u["has_box"],
                     icloud_blocked=u["icloud_blocked"])
        ref_line = f"\n🔗 Пришёл по рефералу: {u['ref']}" if u.get("ref") else ""
        lead = (
            "🆕 <b>ЗАЯВКА НА ВЫКУП</b>\n"
            f"💻 {html.escape(u.get('model','?'))} • {u.get('ram')}/{u.get('ssd')} ГБ\n"
            f"🩹 Состояние: {u.get('condition')}"
            f" • {'с зар.' if u['has_charger'] else 'без зар.'}"
            f" • {'с короб.' if u['has_box'] else 'без короб.'}"
            f" • {'iCloud привязан' if u['icloud_blocked'] else 'iCloud отвязан'}\n"
            f"💰 Предв. оценка: <b>{q.vilka()}</b>\n"
            f"👤 {html.escape(name or '')} • 📞 {html.escape(str(phone))}\n"
            f"📷 Фото: {len(u['photos'])}{ref_line}"
        )
        acts = []
        if self.leads_chat:
            acts.append({"t": "send", "chat": self.leads_chat, "text": lead})
            for fid in u["photos"]:
                acts.append({"t": "photo", "chat": self.leads_chat, "file_id": fid})
        # подтверждение клиенту + реферальная ссылка
        ref_link = (f"https://t.me/{self.bot_username}?start=ref_{chat_id}"
                    if self.bot_username else "(ссылка появится после настройки)")
        acts.append({"t": "send", "chat": chat_id,
                     "text": ("✅ Заявка принята! Оценщик BestMac свяжется с вами в ближайшее время, "
                              "подтвердит цену и согласует курьера.\n\n"
                              f"🎁 Приведите друга — <b>{self.referral_bonus} ₽ вам и ему</b> после сделки:\n"
                              f"{ref_link}\n\n"
                              f"🌐 Подробнее о сервисе: {self.site_url}"),
                     "btn": [[("🌐 bestmac.ru", self.site_url)]]})
        # сброс сессии (реферал сохраняем)
        ref = u.get("ref")
        self.users[str(chat_id)] = {"step": "done", "photos": [], "has_charger": True,
                                    "has_box": True, "icloud_blocked": False,
                                    "condition": "A", "ref": ref, "cycles": 0}
        self._save()
        return acts

    # ── исполнение ────────────────────────────────────────────────────────────
    def _exec(self, acts):
        for a in acts:
            if a["t"] in ("send", "edit_or_send"):
                self.tx.send_message(a["chat"], a["text"], a.get("btn"), a.get("contact", False))
            elif a["t"] == "photo":
                self.tx.send_photo(a["chat"], a["file_id"])
            elif a["t"] == "ack":
                self.tx.answer_callback(a["id"])

    def run_forever(self, poll_timeout=25):
        logger.info("🤖 Quote-бот запущен (long-polling)")
        while True:
            updates = self.tx.get_updates(self.offset, timeout=poll_timeout)
            for upd in updates:
                try:
                    self._exec(self.handle_update(upd))
                except Exception as e:
                    logger.error(f"handle_update: {e}")
            self._save()
            if not updates:
                time.sleep(1)


if __name__ == "__main__":
    if not BOT_TOKEN:
        print("❌ QUOTE_BOT_TOKEN не задан"); sys.exit(1)
    cat = load_catalog(PRICES_FILE, BUYOUT_FILE)
    logger.info(f"📚 Каталог: {sum(len(v) for v in cat.families.values())} моделей, "
                f"{len(cat.base)} конфигов")
    QuoteBot(TelegramTransport(BOT_TOKEN), cat,
             leads_chat=LEADS_CHAT_ID or None,
             bot_username=BOT_USERNAME, referral_bonus=REFERRAL_BONUS,
             site_url=SITE_URL).run_forever()
