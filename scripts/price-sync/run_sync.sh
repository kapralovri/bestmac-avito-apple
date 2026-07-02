#!/usr/bin/env bash
# Ежедневный автосинк базы цен из накопителя коллектора (VPS).
# Обновляет avito-prices.json → коммит → push в main → Vercel перевыкатывает сайт.
# При невозможности запушить (нет deploy-ключа / гонка с парсером) аккуратно
# откатывает СВОЙ коммит, чтобы не ломать будущие git pull.
set -u
cd /opt/bestmac

PY=.venv/bin/python
[ -x "$PY" ] || PY=python3

# подтянуть свежий main до синка (парсер мог закоммитить ночью)
git fetch origin main >/dev/null 2>&1 && git merge --ff-only origin/main >/dev/null 2>&1

$PY scripts/price-sync/sync_from_collector.py --apply || exit 1

if git diff --quiet -- public/data/avito-prices.json; then
    echo "sync: изменений нет"
    exit 0
fi

git add public/data/avito-prices.json
git -c user.name="bestmac-sync" -c user.email="sync@bestmac.ru" \
    commit -m "chore: sync prices from collector [skip ci]" >/dev/null

for i in 1 2 3; do
    if git push origin main >/dev/null 2>&1; then
        echo "sync: запушено (попытка $i)"
        exit 0
    fi
    # возможно, парсер запушил параллельно — перебазируемся и пробуем снова
    git pull --rebase origin main >/dev/null 2>&1 || { git rebase --abort >/dev/null 2>&1; break; }
done

# push не удался (например, deploy-ключ ещё не добавлен) — откатываем свой коммит,
# возвращая файл к origin-состоянию (наши данные пересчитаются завтра заново)
git reset HEAD~1 >/dev/null 2>&1
git checkout -- public/data/avito-prices.json 2>/dev/null
echo "sync: push не удался — коммит откачен, попробуем в следующий раз" >&2
exit 1
