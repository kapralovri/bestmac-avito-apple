# Sourcing engine (demand-driven "докупать" signals) — GST-28 / GST-58

Turns real Avito market data into buy signals: for each liquid model, the max price
we can pay (`target_buy_price`) to still clear a minimum net margin, plus the expected
spread at the current market buy price.

## Ground truth (as of GST-58, 2026-08-15)

- **DB layer is real and live.** Supabase `sxitdundeblljudxrvpa`, migrations
  `gst35_sourcing_avito_only`, `gst47_lock_sourcing_status_rpc`,
  `gst58_sourcing_signal_feed_view`. Tables: `models`, `model_market_stats`,
  `sourcing_signal`, `trades`, `deal_scores`, `listings`.
- **The application engine referenced by earlier issues did NOT exist in this repo.**
  Commits `7aeb854` / `9e6a904`, `packages/scoring/src/sourcing`, `qa/sourcing-v2-tests/`
  are absent from every branch and from history. GST-58 rebuilds the middle layer here,
  in the product repo, from the real DB schema up.

## Pipeline

1. `scripts/sourcing/build-signals.mjs` reads `public/data/avito-prices.json`
   (per-model median / min / max / buyout price / sample count from live Avito listings).
2. It computes `model_market_stats` + `sourcing_signal` rows and emits SQL (`--sql`)
   or JSON (`--json`). `SOURCING_AS_OF=YYYY-MM-DD` sets the freshness reference.
3. Rows are upserted into Supabase (currently via the reviewed seed; on deploy, wire
   the script to run with `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`).
4. `GET /api/sourcing/signals` serves the feed from the `sourcing_signal_feed` view.
5. `POST /api/sourcing/signals/{id}/status` transitions status via the guarded RPC
   `set_sourcing_signal_status` (manual founder action, no auto-purchase).

## Economics (per model)

```
resale_median      = median_price                                   (real)
avito_buy_estimate = buyout_price                                   (real going buy price)
our_costs          = 3000 ₽    (diagnostics + payment + relisting; assumption)
margin_threshold   = 15000 ₽   (min absolute net margin to recommend; schema default)
target_buy_price   = resale_median − our_costs − margin_threshold   (max we can pay)
expected_spread    = resale_median − avito_buy_estimate − our_costs (net at market buy price)
```

`reason_code` precedence: `needs_cost_config` → `stale_market` (> 60d) →
`low_sample` (< 30) → `below_absolute_margin` (spread < threshold) → `ok`.
`is_recommended` requires `reason_code='ok'` and `expected_spread ≥ margin_threshold`
and `target_buy_price > 0` (satisfies CHECK `sourcing_signal_recommend_consistent`).

## Integrity guarantees

- **F1 fix (was HIGH):** the engine never emits `resale_median_rub ≤ 0`, so it cannot
  violate CHECK `sourcing_signal_resale_pos` on the low-sample branch. Guarded at both
  the market-stat and signal steps.
- **No fabricated fields.** `sale_velocity`, `liquidity`, `avg_days_to_sell`,
  `expected_lead_time_days` are left `NULL` — we do not yet have real turnover/velocity
  or supply-channel data, so we do not invent it. `demand_depth` = active-listing count.

## First live run (2026-08-15)

209 market rows computed; **15 recommended signals (6 hot)**, 185 `low_sample`,
9 `below_absolute_margin`, 0 CHECK violations. The 15 recommended signals are seeded
into the live DB. Top: MacBook Pro 16 (2024) — target buy ≤ 177 000 ₽, spread ~36 000 ₽,
n=166.

## Remaining last mile

- **Deploy** (GST-49): set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel and
  deploy `main` so the two routes go live. Code is ready; only env + deploy remain.
- **Telegram** (GST-32) and **cabinet panel** (GST-31): consume the feed / status routes.
- **Freshness**: the current market snapshot is from 2026-07-04. Re-run the Avito parser
  and re-run the engine on a schedule to keep signals fresh (avoid `stale_market`).
- **Full seed**: `scripts/sourcing/seed.generated.sql` holds all 209 rows for reference;
  regenerate anytime with `SOURCING_AS_OF=<date> node scripts/sourcing/build-signals.mjs --sql`.
