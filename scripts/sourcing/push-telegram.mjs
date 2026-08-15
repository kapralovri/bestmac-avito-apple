#!/usr/bin/env node
/**
 * GST-58 / GST-32 — Push the first live "докупать" sourcing signals to the founder via Telegram.
 *
 * Fastest delivery channel to the founder: no deploy required. Reads the live
 * read-model (public.sourcing_signal_feed) from Supabase project sxitdundeblljudxrvpa
 * and sends the top recommended signals to a Telegram chat via the Bot API.
 *
 * Reuses the EXISTING bot @bestmac_hunter_bot — no new bot, no new secrets.
 * Env is auto-loaded from the repo-root .env (same file bot.py reads), so on the
 * VPS where TELEGRAM_BOT_TOKEN / OWNER_CHAT_ID are already set, this "just works".
 *
 * Env (from .env or the shell; .env values do NOT override the shell):
 *   SUPABASE_URL                 https://sxitdundeblljudxrvpa.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service_role key (Supabase → Project Settings → API)
 *   TELEGRAM_BOT_TOKEN           уже прописан для @bestmac_hunter_bot
 *   OWNER_CHAT_ID                уже прописан для @bestmac_hunter_bot
 *
 * Optional env:
 *   SIGNAL_LIMIT   how many top signals to send (default 6)
 *   HOT_ONLY       '1' → only is_hot signals
 *   DRY_RUN        '1' → print the message to stdout, do NOT call Telegram
 *
 * Usage (on the VPS, .env already has all tokens):
 *   npm run sourcing:push            # отправить топ сигналов в @bestmac_hunter_bot
 *   HOT_ONLY=1 npm run sourcing:push # только горячие
 *   DRY_RUN=1 npm run sourcing:push  # показать сообщение в консоль, не отправлять
 */

import { createClient } from '@supabase/supabase-js';
import { loadDotenv } from './load-env.mjs';

// Переиспользуем тот же .env, где уже прописан токен @bestmac_hunter_bot
// (TELEGRAM_BOT_TOKEN / OWNER_CHAT_ID). Никаких новых секретов заводить не нужно.
loadDotenv();

// Публичные значения (НЕ секреты): URL проекта и anon-ключ. Роль anon имеет SELECT
// только на витрину public.sourcing_signal_feed (базовые таблицы закрыты RLS), поэтому
// ключ безопасно держать в коде — это тот же класс ключа, что уходит в браузер. Это
// убирает последний секрет из пути доставки: нужен лишь токен @bestmac_hunter_bot.
const DEFAULT_SUPABASE_URL = 'https://sxitdundeblljudxrvpa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4aXRkdW5kZWJsbGp1ZHhydnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDc5NDMsImV4cCI6MjA3MTg4Mzk0M30.fpLz-btlRmi4I6Hi5n4SGsHZX1F_FSn7tXSgI_yDmg4';

const {
  TELEGRAM_BOT_TOKEN,
  OWNER_CHAT_ID,
  SIGNAL_LIMIT,
  HOT_ONLY,
  DRY_RUN,
} = process.env;

// service_role по-прежнему поддерживается (переопределяет anon), но НЕ обязателен.
const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

const LIMIT = Number(SIGNAL_LIMIT) > 0 ? Number(SIGNAL_LIMIT) : 6;
const isDryRun = DRY_RUN === '1';

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function rub(n) {
  if (n === null || n === undefined) return '—';
  return `${Math.round(Number(n)).toLocaleString('ru-RU')} ₽`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchSignals() {
  // URL и ключ всегда есть: либо из окружения, либо публичные дефолты выше.
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from('sourcing_signal_feed')
    .select(
      'model_key, display_name, family, resale_median_rub, target_buy_price_rub, expected_spread_rub, sample_size, is_hot, confidence, is_recommended',
    )
    .eq('is_recommended', true)
    .order('is_hot', { ascending: false })
    .order('expected_spread_rub', { ascending: false, nullsFirst: false })
    .limit(LIMIT);

  if (HOT_ONLY === '1') query = query.eq('is_hot', true);

  const { data, error } = await query;
  if (error) die(`Запрос к Supabase упал: ${error.message}`);
  return data ?? [];
}

function renderMessage(signals) {
  if (!signals.length) {
    return '📉 <b>Сорсинг</b>: рекомендованных сигналов «докупать» сейчас нет (все ниже порога маржи).';
  }
  const lines = [];
  lines.push('🎯 <b>Сигналы «докупать» — живые данные Avito</b>');
  lines.push('');
  for (const s of signals) {
    const name = escapeHtml(s.display_name || s.model_key);
    const fire = s.is_hot ? ' 🔥' : '';
    lines.push(`<b>${name}</b>${fire}`);
    lines.push(
      `  ▸ Выкупать ≤ <b>${rub(s.target_buy_price_rub)}</b> · медиана ${rub(s.resale_median_rub)} · спред ~<b>${rub(s.expected_spread_rub)}</b> · выборка ${s.sample_size ?? '—'}`,
    );
  }
  lines.push('');
  lines.push('Канал: органический выкуп с Avito. Порог маржи 15 000 ₽, издержки 3 000 ₽/шт.');
  return lines.join('\n');
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !OWNER_CHAT_ID) {
    die('TELEGRAM_BOT_TOKEN и OWNER_CHAT_ID обязательны для отправки (или запусти с DRY_RUN=1).');
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: OWNER_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    die(`Telegram API вернул ошибку: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const signals = await fetchSignals();
  const message = renderMessage(signals);

  if (isDryRun) {
    console.log('--- DRY RUN (сообщение НЕ отправлено) ---\n');
    console.log(message);
    console.log(`\n--- ${signals.length} сигнал(ов) ---`);
    return;
  }

  await sendTelegram(message);
  console.log(`✅ Отправлено в Telegram: ${signals.length} сигнал(ов) → chat ${OWNER_CHAT_ID}`);
}

main().catch((e) => die(e?.stack || String(e)));
