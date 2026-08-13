#!/usr/bin/env bash
#
# Ставит TLS-фронт (Caddy) перед intake-сервером на VPS (GST-10, P0-3).
# Идемпотентно: можно запускать повторно после git pull.
#
#   Caddy :443 (Let's Encrypt, intake.bestmac.ru)  ──proxy──▶  127.0.0.1:8787 (server.py)
#
# Предусловия (сделать один раз ВРУЧНУЮ):
#   1. DNS: A-запись intake.bestmac.ru → IP этого VPS (напр. 84.54.28.114).
#   2. Открыт порт 443 (и 80 для ACME-челленджа) в ufw/панели хостера.
#   3. Порт 8787 закрыт наружу (server.py слушает 127.0.0.1 по умолчанию).
#
# Запуск:  sudo bash scripts/intake/setup-tls.sh [домен]
#          домен по умолчанию — intake.bestmac.ru
set -euo pipefail

DOMAIN="${1:-intake.bestmac.ru}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "🌐 Домен intake : $DOMAIN"

# ─── 1. Установка Caddy (официальный репозиторий) ────────────────────────────
if ! command -v caddy >/dev/null 2>&1; then
  echo "📦 Ставлю Caddy из официального репозитория..."
  $SUDO apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y caddy
else
  echo "✅ Caddy уже установлен: $(caddy version)"
fi

# ─── 2. Раскладываем Caddyfile ───────────────────────────────────────────────
# Подставляем домен из аргумента (на случай не-дефолтного поддомена).
echo "📝 Пишу /etc/caddy/Caddyfile (домен: $DOMAIN)"
$SUDO mkdir -p /var/log/caddy
$SUDO sed "s/intake\.bestmac\.ru/${DOMAIN}/g" "$SCRIPT_DIR/Caddyfile" \
  | $SUDO tee /etc/caddy/Caddyfile >/dev/null

# ─── 3. Проверяем конфиг и перезагружаем ─────────────────────────────────────
echo "🔎 Проверяю конфиг..."
$SUDO caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

echo "🔄 Перезагружаю Caddy..."
$SUDO systemctl enable caddy
$SUDO systemctl reload caddy 2>/dev/null || $SUDO systemctl restart caddy

echo
echo "✅ Готово. Проверка (после выпуска сертификата — до минуты):"
echo "   curl -s https://${DOMAIN}/ | head"
echo "   (ожидается {\"ok\": true, \"service\": \"bestmac-intake\"})"
echo
echo "👉 Не забудь на Vercel выставить INTAKE_VPS_URL=https://${DOMAIN}/intake и сделать redeploy."
