#!/usr/bin/env bash
#
# Установщик сервисов BestMac на VPS (systemd).
# Поднимает 3 автоматических процесса:
#   1) bestmac-scanner.timer  — сканер ниже-рынка каждые 15 мин
#   2) bestmac-digest.timer   — вечерний дайджест раз в сутки (20:00)
#   3) bestmac-bot.service    — двусторонний бот переговоров (всегда онлайн)
#
# Запуск (из любого места, нужен sudo):
#   bash scripts/deploy/install.sh
#
# Идемпотентно: можно запускать повторно после git pull (перечитает юниты).

set -euo pipefail

# ─── Автоопределение окружения ───────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
PYTHON="$(command -v python3 || true)"
# Если рядом есть venv — используем его python
if [ -x "$REPO_DIR/.venv/bin/python3" ]; then
  PYTHON="$REPO_DIR/.venv/bin/python3"
elif [ -x "$REPO_DIR/venv/bin/python3" ]; then
  PYTHON="$REPO_DIR/venv/bin/python3"
fi

if [ -z "$PYTHON" ]; then
  echo "❌ python3 не найден. Установите Python 3.11+ и повторите."; exit 1
fi

echo "📂 Репозиторий : $REPO_DIR"
echo "👤 Пользователь: $RUN_USER"
echo "🐍 Python      : $PYTHON"
echo

if [ ! -f "$REPO_DIR/.env" ]; then
  echo "⚠️  Нет файла $REPO_DIR/.env"
  echo "    Скопируйте шаблон и заполните секреты:"
  echo "      cp scripts/deploy/.env.example .env  &&  nano .env"
  echo "    (без него бот и сканер не получат токены)"
  echo
fi

UNIT_DIR="/etc/systemd/system"
SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

write_unit() {  # $1 = имя файла, stdin = содержимое
  echo "  ✍️  $UNIT_DIR/$1"
  $SUDO tee "$UNIT_DIR/$1" >/dev/null
}

echo "🛠  Пишу systemd-юниты..."

# ── Бот переговоров: всегда онлайн ──
write_unit bestmac-bot.service <<EOF
[Unit]
Description=BestMac negotiation bot (Telegram two-way)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$REPO_DIR
ExecStart=$PYTHON scripts/negotiation-bot/bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ── Сканер: разовый прогон (запускается таймером) ──
write_unit bestmac-scanner.service <<EOF
[Unit]
Description=BestMac below-market scanner (one run)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$REPO_DIR
ExecStart=$PYTHON scripts/hot-deals-scanner/scanner_v2.py
EOF

write_unit bestmac-scanner.timer <<EOF
[Unit]
Description=Run BestMac scanner every 15 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF

# ── Дайджест: разовый прогон (раз в сутки) ──
write_unit bestmac-digest.service <<EOF
[Unit]
Description=BestMac daily digest of mid-tier lots
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$REPO_DIR
ExecStart=$PYTHON scripts/hot-deals-scanner/scanner_v2.py --digest
EOF

write_unit bestmac-digest.timer <<EOF
[Unit]
Description=Send BestMac digest once a day (server time 20:00)

[Timer]
OnCalendar=*-*-* 20:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo
echo "🔄 Перезагружаю systemd и включаю сервисы..."
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now bestmac-bot.service
$SUDO systemctl enable --now bestmac-scanner.timer
$SUDO systemctl enable --now bestmac-digest.timer

echo
echo "✅ Готово. Состояние:"
$SUDO systemctl --no-pager status bestmac-bot.service | head -5 || true
echo
echo "Полезные команды:"
echo "  журнал бота:        journalctl -u bestmac-bot.service -f"
echo "  журнал сканера:     journalctl -u bestmac-scanner.service -f"
echo "  когда след. сканы:  systemctl list-timers 'bestmac-*'"
echo
echo "👉 Последний шаг: напишите своему боту в Telegram /start (один раз),"
echo "   чтобы он запомнил ваш chat_id."
