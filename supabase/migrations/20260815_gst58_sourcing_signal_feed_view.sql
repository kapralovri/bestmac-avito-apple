-- GST-58: read-model view joining sourcing_signal with human-readable model info.
-- Applied to Supabase project sxitdundeblljudxrvpa (migration gst58_sourcing_signal_feed_view).
-- Consumed by GET /api/sourcing/signals, the founder cabinet panel (GST-31),
-- and the Telegram push (GST-32). Consumers filter on is_recommended / confidence.
create or replace view public.sourcing_signal_feed as
select
  s.id,
  s.model_key,
  m.display_name,
  m.family,
  s.resale_median_rub,
  s.avito_buy_estimate_rub,
  s.target_buy_price_rub,
  s.expected_spread_rub,
  s.margin_threshold_rub,
  s.our_costs_rub,
  s.sample_size,
  s.demand_depth,
  s.sale_velocity,
  s.liquidity,
  s.expected_lead_time_days,
  s.is_hot,
  s.hotness_score,
  s.is_recommended,
  s.confidence,
  s.reason_code,
  s.status,
  s.computed_at
from public.sourcing_signal s
join public.models m on m.model_key = s.model_key;

comment on view public.sourcing_signal_feed is 'GST-58 read-model for sourcing signals (API/cabinet/Telegram). Filter is_recommended/confidence in the consumer.';
