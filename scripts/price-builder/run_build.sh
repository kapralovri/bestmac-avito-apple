#!/usr/bin/env bash
# run_build.sh — пошаговая сборка / обновление базы цен
#
# Использование:
#   ./run_build.sh seed      — первоначальная сборка (все семейства, --clean)
#   ./run_build.sh update    — плановое обновление цен (все семейства, мержим)
#   ./run_build.sh macbook   — только MacBook (мержим)
#   ./run_build.sh imac      — только iMac (мержим)
#
# Переменные окружения:
#   RUCAPTCHA_API_KEY — обязательна
#   MAX_PAGES         — страниц на модель (по умолчанию: 2 для update, 3 для seed)
#   TIME_LIMIT        — мягкий лимит в минутах (по умолчанию: 120)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER="$SCRIPT_DIR/builder.py"

if [[ -z "${RUCAPTCHA_API_KEY:-}" ]]; then
  echo "❌ Задайте RUCAPTCHA_API_KEY"
  exit 1
fi

MODE="${1:-update}"
TIME_LIMIT="${TIME_LIMIT:-120}"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/build_$(date +%Y%m%d_%H%M%S).log"

run_builder() {
  local extra_args=("$@")
  python3 "$BUILDER" \
    --time-limit "$TIME_LIMIT" \
    "${extra_args[@]}" \
    2>&1 | tee -a "$LOG_FILE"
}

echo "=== Price Builder — режим: $MODE | $(date) ===" | tee "$LOG_FILE"

case "$MODE" in

  seed)
    # Первоначальная сборка: чистим базу, парсим по 3 страницы
    MAX_PAGES="${MAX_PAGES:-3}"
    echo "🌱 Начальная сборка (3 стр/модель, --clean)" | tee -a "$LOG_FILE"
    run_builder --max-pages "$MAX_PAGES" --clean --family MacBook
    run_builder --max-pages "$MAX_PAGES"           --family iMac
    run_builder --max-pages "$MAX_PAGES"           --family "Mac mini"
    run_builder --max-pages "$MAX_PAGES"           --family "Mac Studio"
    ;;

  update)
    # Плановое обновление: мержим, 2 страницы — быстро и дёшево
    MAX_PAGES="${MAX_PAGES:-2}"
    echo "🔄 Обновление цен (2 стр/модель, мерж)" | tee -a "$LOG_FILE"
    run_builder --max-pages "$MAX_PAGES" --family MacBook
    run_builder --max-pages "$MAX_PAGES" --family iMac
    run_builder --max-pages "$MAX_PAGES" --family "Mac mini"
    run_builder --max-pages "$MAX_PAGES" --family "Mac Studio"
    ;;

  macbook)
    MAX_PAGES="${MAX_PAGES:-2}"
    run_builder --max-pages "$MAX_PAGES" --family MacBook
    ;;

  imac)
    MAX_PAGES="${MAX_PAGES:-2}"
    run_builder --max-pages "$MAX_PAGES" --family iMac
    ;;

  mini)
    MAX_PAGES="${MAX_PAGES:-2}"
    run_builder --max-pages "$MAX_PAGES" --family "Mac mini"
    ;;

  studio)
    MAX_PAGES="${MAX_PAGES:-2}"
    run_builder --max-pages "$MAX_PAGES" --family "Mac Studio"
    ;;

  *)
    echo "Неизвестный режим: $MODE"
    echo "Доступные: seed | update | macbook | imac | mini | studio"
    exit 1
    ;;
esac

echo "✅ Готово. Лог: $LOG_FILE"
