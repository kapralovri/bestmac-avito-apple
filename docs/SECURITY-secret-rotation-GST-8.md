# GST-8 · Ротация и вычистка закоммиченных секретов (P0)

Статус: **рабочее дерево вычищено** (этот PR). Ротация у провайдеров и вычистка
истории с force-push — **требуют владельца репозитория / доступа к провайдерам**.

## Что было закоммичено (скомпрометировано)

| Секрет | Где в HEAD (до этого PR) | В истории |
|---|---|---|
| Прокси `host:port:user:pass` (`46.161.28.47:33348:…`) | `.replit` → `PROXY_URL` | да |
| Avito Client Secret (`EImm…li4`) | `AVITO_SETUP.md` | да |

Оба значения уже в командной/публичной истории GitHub → считать
скомпрометированными. Порядок обязателен: **сначала ротация, потом вычистка**.

## Шаг 1 — Ротация у провайдеров (владелец, СНАЧАЛА)

- [ ] **Прокси** (провайдер 46.161.28.47): сгенерировать новый логин/пароль
      (или новый прокси), старые — отозвать.
- [ ] **Avito**: кабинет https://developers.avito.ru → приложение → сбросить
      Client Secret. Старый секрет станет невалидным.

## Шаг 2 — Перенести новые значения в секреты (владелец)

Реальные значения — **только** в env/секретах, никогда в git:

- **Replit**: Tools → Secrets → `PROXY_URL = host:port:user:pass`.
- **VPS/CI**: переменные окружения `PROXY_URL`, `VITE_AVITO_CLIENT_ID`,
  `VITE_AVITO_CLIENT_SECRET` (см. `.env.example`, `scripts/deploy/.env.example`).
- **Локально**: `.env.local` (уже в `.gitignore`).

Код уже читает их из env: `os.environ['PROXY_URL']`,
`import.meta.env.VITE_AVITO_CLIENT_SECRET`. После ротации значения менять только
в секретах — правок кода не требуется.

## Шаг 3 — Вычистка истории + force-push (владелец, ПОСЛЕ ротации)

⚠️ Перепишет все хеши коммитов и сломает открытые ветки/PR. Согласовать со всеми
контрибьюторами, они переклонируют репозиторий. Делать только после ротации
(Шаг 1) — иначе бессмысленно.

```bash
# 1. Свежий bare-клон
git clone --mirror https://github.com/kapralovri/bestmac-avito-apple.git
cd bestmac-avito-apple.git

# 2. Файл замен (git-filter-repo)
cat > /tmp/gst8-replacements.txt <<'EOF'
46.161.28.47:33348:s2CLdF5uXB:dCYAAdWF7Y==>***REMOVED-PROXY***
EImmFaJKSPO6fY0Bpe4SivPvxdIP8--WqzCEzli4==>***REMOVED-AVITO-SECRET***
EOF

# 3. Вычистить из всей истории
pip install git-filter-repo
git filter-repo --replace-text /tmp/gst8-replacements.txt

# 4. Force-push всех веток и тегов
git push --force --mirror origin

# 5. rm /tmp/gst8-replacements.txt
```

После push: все контрибьюторы делают заново `git clone` (старые клоны содержат
секреты в reflog/пакетах). Проверить, что GitHub не кеширует старые коммиты по
прямым SHA — при необходимости обратиться в поддержку GitHub для очистки кеша.

## Проверка

```bash
git grep -n "s2CLdF5uXB\|EImmFaJKSPO6fY0Bpe4SivPvxdIP8" $(git rev-list --all) | head
# → пусто = история чистая
```
