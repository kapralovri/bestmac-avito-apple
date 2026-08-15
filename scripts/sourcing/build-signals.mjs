#!/usr/bin/env node
/**
 * GST-58 / GST-28 — Demand-driven sourcing engine (Avito-only v2).
 *
 * Turns REAL market data (public/data/avito-prices.json — per-model median /
 * min / max / buyout price / sample count aggregated from live Avito listings)
 * into `model_market_stats` + `sourcing_signal` rows for Supabase project
 * `sxitdundeblljudxrvpa` (schema: migrations gst35_sourcing_avito_only,
 * gst47_lock_sourcing_status_rpc).
 *
 * Economics (per model):
 *   resale_median        = median_price                       (real)
 *   avito_buy_estimate   = buyout_price                        (real, going buy price)
 *   our_costs            = OUR_COSTS_RUB                       (diagnostics + payment + listing; assumption)
 *   margin_threshold     = MARGIN_THRESHOLD_RUB               (min absolute net margin to recommend)
 *   target_buy_price     = resale_median - our_costs - margin_threshold   (max we can pay and still clear threshold)
 *   expected_spread      = resale_median - avito_buy_estimate - our_costs (net spread if we source at the current market buy price)
 *
 * Honesty guarantees:
 *   - F1 guard: never emits resale_median_rub <= 0 (violates CHECK sourcing_signal_resale_pos).
 *   - sale_velocity / liquidity / avg_days_to_sell / expected_lead_time_days are left NULL:
 *     we do NOT have real turnover/velocity or channel data yet, so we do not fabricate them.
 *   - is_recommended is only set true when reason_code='ok' AND expected_spread >= margin_threshold
 *     AND target_buy_price > 0 (satisfies CHECK sourcing_signal_recommend_consistent).
 *
 * Usage:
 *   node scripts/sourcing/build-signals.mjs --sql   > seed.sql   # emit INSERT SQL for review / manual apply
 *   node scripts/sourcing/build-signals.mjs --json           # emit computed rows as JSON (inspection)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../../public/data/avito-prices.json');

// --- Business constants (documented assumptions) ---
const OUR_COSTS_RUB = 3000;         // per-unit diagnostics + payment processing + relisting
const MARGIN_THRESHOLD_RUB = 15000; // matches schema default sourcing_signal.margin_threshold_rub
const MIN_SAMPLE = 30;              // below this, confidence is low
const STALE_DAYS = 60;              // market snapshot older than this => stale_market

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

// A "catch-all" bucket is a row where the parser could NOT resolve the exact
// configuration (processor + RAM + SSD all empty). Its median blends different
// chips / RAM / SSD tiers into one number — e.g. "MacBook Pro 16 (2024)" mixes
// the M4 Pro 24/512 base (~160k) with the M4 Max 128GB (~320k), producing a
// meaningless median of 195k. Buying against that median loses money on the
// cheap configs. These buckets must NEVER drive a buy target or a hot signal.
export function isCatchAllBucket(row) {
  const hasProc = String(row.processor || '').trim().length > 0;
  const hasRam = Number(row.ram) > 0;
  const hasSsd = Number(row.ssd) > 0;
  return !hasProc && !hasRam && !hasSsd;
}

export function buildModelKey(row, used) {
  const parts = [slugify(row.model_name)];
  if (row.processor && String(row.processor).trim()) parts.push(slugify(row.processor));
  if (row.ram && Number(row.ram) > 0) parts.push(`${Number(row.ram)}gb`);
  if (row.ssd && Number(row.ssd) > 0) parts.push(`${Number(row.ssd)}ssd`);
  let key = parts.join('-');
  let n = 2;
  const base = key;
  while (used.has(key)) key = `${base}-${n++}`; // guarantee uniqueness (PK model_key)
  used.add(key);
  return key;
}

// Config identity shared by an aggregate stat row and any individual listing of
// that config. Normalised (trim/lower) so the parser's per-listing tuple lines up
// with the stat that seeds the signal. Keep in lockstep with buildModelKey inputs.
export function configKey(row) {
  return [
    String(row.model_name).trim().toLowerCase(),
    String(row.processor || '').trim().toLowerCase(),
    Number(row.ram) || 0,
    Number(row.ssd) || 0,
  ].join('|');
}

// The rows that actually seed the engine, each tagged with its model_key, in the
// SAME order and with the SAME `used`-set dedup as seeding. Single source of truth
// for model_key — reused by build-listings.mjs so listing keys never drift from
// signal keys. Skips F1 (median<=0) and catch-all buckets (see isCatchAllBucket).
export function eligibleRows(stats) {
  const used = new Set();
  const out = [];
  let skippedCatchAll = 0;
  for (const row of stats) {
    const median = Number(row.median_price) || 0;
    if (median <= 0) continue;
    if (isCatchAllBucket(row)) { skippedCatchAll++; continue; }
    out.push({ row, modelKey: buildModelKey(row, used) });
  }
  out.skippedCatchAll = skippedCatchAll;
  return out;
}

// Map: config identity -> model_key, for joining listings to signals.
export function buildModelKeyMap(stats) {
  const map = new Map();
  for (const { row, modelKey } of eligibleRows(stats)) map.set(configKey(row), modelKey);
  return map;
}

function computeSignal(row, marketAgeDays) {
  const resaleMedian = Number(row.median_price) || 0;
  const buyEstimate = Number(row.buyout_price) || 0;
  const samples = Number(row.samples_count) || 0;

  // F1 guard: resale_median must be > 0 (CHECK sourcing_signal_resale_pos).
  if (resaleMedian <= 0) return null;

  const targetRaw = resaleMedian - OUR_COSTS_RUB - MARGIN_THRESHOLD_RUB;
  const targetBuyPrice = targetRaw > 0 ? targetRaw : null; // CHECK targetbuy_pos: >0 or NULL
  const expectedSpread = buyEstimate > 0 ? resaleMedian - buyEstimate - OUR_COSTS_RUB : null;

  const confidence = samples >= MIN_SAMPLE ? 'ok' : 'low_confidence';

  // reason_code precedence (most-blocking first)
  let reason;
  if (buyEstimate <= 0) reason = 'needs_cost_config';
  else if (marketAgeDays > STALE_DAYS) reason = 'stale_market';
  else if (samples < MIN_SAMPLE) reason = 'low_sample';
  else if (expectedSpread === null || expectedSpread < MARGIN_THRESHOLD_RUB) reason = 'below_absolute_margin';
  else reason = 'ok';

  const isRecommended =
    reason === 'ok' && targetBuyPrice !== null && expectedSpread !== null && expectedSpread >= MARGIN_THRESHOLD_RUB;

  // hotness: demand (samples) x margin richness. Only meaningful for recommended signals.
  const hotnessScore = isRecommended
    ? Math.round((samples / 50) * (expectedSpread / 1000) * 100) / 100
    : null;
  const isHot = isRecommended && samples >= 50 && expectedSpread >= 20000;

  return {
    resale_median_rub: resaleMedian,
    avito_buy_estimate_rub: buyEstimate > 0 ? buyEstimate : null,
    sale_velocity: null,        // no real velocity data yet — not fabricated
    liquidity: null,            // no real turnover data yet — not fabricated
    demand_depth: samples,      // active-listing count as demand-depth proxy
    sample_size: samples,
    our_costs_rub: OUR_COSTS_RUB,
    margin_threshold_rub: MARGIN_THRESHOLD_RUB,
    target_buy_price_rub: targetBuyPrice,
    expected_spread_rub: expectedSpread,
    expected_lead_time_days: null, // channel registry not built yet
    is_hot: isHot,
    hotness_score: hotnessScore,
    is_recommended: isRecommended,
    confidence,
    reason_code: reason,
    status: 'new',
  };
}

function main() {
  const mode = process.argv.includes('--json') ? 'json' : 'sql';
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const stats = Array.isArray(raw.stats) ? raw.stats : [];
  const generatedAt = raw.generated_at ? String(raw.generated_at).replace(' ', 'T') : null;
  // market age relative to the dataset's own generated_at vs the newest per-row updated_at we can parse.
  // We keep it simple & deterministic: age from generated_at to a fixed "as of" passed via env, else 0.
  const asOf = process.env.SOURCING_AS_OF ? new Date(process.env.SOURCING_AS_OF) : null;
  const gen = generatedAt ? new Date(generatedAt) : null;
  const marketAgeDays = asOf && gen ? Math.round((asOf - gen) / 86400000) : 0;

  const marketRows = [];
  const signalRows = [];

  // GST-60: catch-all buckets and F1 (median<=0) are excluded inside eligibleRows,
  // the single source of truth for model_key (also used by build-listings.mjs).
  const eligible = eligibleRows(stats);
  const skippedCatchAll = eligible.skippedCatchAll;
  for (const { row, modelKey } of eligible) {
    const median = Number(row.median_price) || 0;
    const spread = (Number(row.max_price) || 0) - (Number(row.min_price) || 0);
    marketRows.push({
      model_key: modelKey,
      median_price_rub: median,
      spread_rub: spread >= 0 ? spread : null,
      turnover_rate: 0,       // NOT NULL; unknown -> 0
      avg_days_to_sell: null, // no real data
      sample_size: Number(row.samples_count) || 0,
      updated_at: generatedAt,
    });
    const sig = computeSignal(row, marketAgeDays);
    if (sig) signalRows.push({ model_key: modelKey, ...sig });
  }

  if (mode === 'json') {
    process.stdout.write(JSON.stringify({ marketAgeDays, skippedCatchAll, marketRows, signalRows }, null, 2));
    return;
  }
  process.stdout.write(emitSql(marketRows, signalRows, generatedAt));
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function emitSql(marketRows, signalRows, generatedAt) {
  const mkTs = generatedAt ? `'${generatedAt}'::timestamptz` : 'now()';
  let out = '-- GST-58 sourcing seed (generated by scripts/sourcing/build-signals.mjs from real Avito market data)\n';
  out += 'begin;\n';
  // model_market_stats
  const mkCols = ['model_key', 'median_price_rub', 'spread_rub', 'turnover_rate', 'avg_days_to_sell', 'sample_size', 'updated_at'];
  out += `insert into public.model_market_stats (${mkCols.join(', ')}) values\n`;
  out += marketRows
    .map((r) => `  (${sqlVal(r.model_key)}, ${sqlVal(r.median_price_rub)}, ${sqlVal(r.spread_rub)}, ${sqlVal(r.turnover_rate)}, ${sqlVal(r.avg_days_to_sell)}, ${sqlVal(r.sample_size)}, ${mkTs})`)
    .join(',\n');
  out += '\non conflict (model_key) do update set median_price_rub=excluded.median_price_rub, spread_rub=excluded.spread_rub, sample_size=excluded.sample_size, updated_at=excluded.updated_at;\n\n';
  // sourcing_signal
  const sgCols = ['model_key', 'resale_median_rub', 'avito_buy_estimate_rub', 'sale_velocity', 'liquidity', 'demand_depth', 'sample_size', 'our_costs_rub', 'margin_threshold_rub', 'target_buy_price_rub', 'expected_spread_rub', 'expected_lead_time_days', 'is_hot', 'hotness_score', 'is_recommended', 'confidence', 'reason_code', 'status'];
  out += `insert into public.sourcing_signal (${sgCols.join(', ')}) values\n`;
  out += signalRows
    .map((r) => `  (${sqlVal(r.model_key)}, ${sqlVal(r.resale_median_rub)}, ${sqlVal(r.avito_buy_estimate_rub)}, ${sqlVal(r.sale_velocity)}, ${sqlVal(r.liquidity)}, ${sqlVal(r.demand_depth)}, ${sqlVal(r.sample_size)}, ${sqlVal(r.our_costs_rub)}, ${sqlVal(r.margin_threshold_rub)}, ${sqlVal(r.target_buy_price_rub)}, ${sqlVal(r.expected_spread_rub)}, ${sqlVal(r.expected_lead_time_days)}, ${sqlVal(r.is_hot)}, ${sqlVal(r.hotness_score)}, ${sqlVal(r.is_recommended)}, ${sqlVal(r.confidence)}, ${sqlVal(r.reason_code)}, ${sqlVal(r.status)})`)
    .join(',\n');
  out += ';\ncommit;\n';
  return out;
}

// Run as a script, but stay importable (build-listings.mjs reuses the exports above).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
