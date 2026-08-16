/**
 * GST-56 — Минимальный загрузчик .env без зависимостей.
 *
 * Зеркалит поведение scripts/negotiation-bot/bot.py::_load_dotenv: читает .env
 * из корня репозитория (и из cwd) и заполняет ТОЛЬКО те переменные, которых ещё
 * нет в окружении (НЕ перетирает уже заданные). Благодаря этому закупочные
 * сигналы переиспользуют ТОТ ЖЕ .env, где уже прописан токен бота
 * @bestmac_hunter_bot (TELEGRAM_BOT_TOKEN / OWNER_CHAT_ID) — без новых секретов.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function loadDotenv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, '../..'); // scripts/sourcing -> repo root
  const candidates = [resolve(repoRoot, '.env'), resolve(process.cwd(), '.env')];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    try {
      for (const raw of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const idx = line.indexOf('=');
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (key && process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      /* .env нечитаем — молча продолжаем на голом process.env */
    }
  }
}
