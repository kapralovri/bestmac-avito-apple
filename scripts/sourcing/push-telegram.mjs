#!/usr/bin/env node
/**
 * GST-58 / GST-32 — Push the first live "докупать" sourcing signals to the founder via Telegram.
 *
 * Fastest delivery channel to the founder: no deploy required. Reads the live
 * read-model (public.sourcing_signal_feed) from Supabase project sxitdundeblljudxrvpa
 * and sends the top recommended signals to a Telegram chat via the Bot API.
 *
 * Required env (secrets — supplied by the founder at runtime, never committed):
 *   SUPABASE_URL                 https://sxitdundeblljudxrvpa.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service_role key (Supabase → Project Settings → API)
 *   TELEGRAM_BOT_TOKEN           from @BotFather
 *   OWNER_CHAT_ID                founder's Telegram chat id (from @userinfobot)
 *
 * Optional env:
 *   SIGNAL_LIMIT   how many top signals to send (default 6)
 *   HOT_ONLY       '1' → only is_hot signals
 *   DRY_RUN        '1' → print the message to stdout, do NOT call Telegram
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TELEGRAM_BOT_TOKEN=... OWNER_CHAT_ID=... \
 *     node scripts/sourcing/push-telegram.mjs
 *   # dry-run (no secrets for Telegram needed, only Supabase):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DRY_RUN=1 node scripts/sourcing/push-telegram.mjs
 */

import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  OWNER_CHAT_ID,
  SIGNAL_LIMIT,
  HOT_ONLY,
  DRY_RUN,
} = process.env;

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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    die('SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны (Supabase → Project Settings → API).');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
