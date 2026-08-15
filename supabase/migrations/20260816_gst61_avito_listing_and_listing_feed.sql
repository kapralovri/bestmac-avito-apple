-- GST-61: persist individual Avito listings + expose a listing-level feed.
-- Applied to Supabase project sxitdundeblljudxrvpa (migration gst61_avito_listing_and_listing_feed).
-- Makes the model-level sourcing signal clickable: for each recommended model,
-- concrete live lots priced <= target_buy_price, ranked by per-unit profit.
-- Seeded by scripts/sourcing/build-listings.mjs from public/data/avito-listings.json
-- (parser output). Consumed by the Telegram push (GST-32/GST-61) and cabinet (GST-31).

-- 1. Raw listing store. One row per Avito ad URL (natural key). model_key is the
--    engine's key (buildModelKey) so we can join to sourcing_signal. No hard FK:
--    the parser sees more configs than get recommended; the feed view filters.
create table if not exists public.avito_listing (
  id            uuid primary key default gen_random_uuid(),
  model_key     text        not null,
  url           text        not null unique,
  price_rub     integer     not null check (price_rub > 0),
  title         text,
  seen_at       timestamptz not null,            -- last time the parser saw this ad live
  first_seen_at timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists avito_listing_model_key_idx on public.avito_listing (model_key);
create index if not exists avito_listing_seen_at_idx    on public.avito_listing (seen_at desc);

-- Base table closed by RLS with no policies (same posture as sourcing_signal /
-- model_market_stats): anon/authenticated cannot read it directly, only via the view.
alter table public.avito_listing enable row level security;

comment on table public.avito_listing is
  'GST-61: individual Avito ads (url, model_key, price, seen_at). Seeded by scripts/sourcing/build-listings.mjs from public/data/avito-listings.json (parser output). Freshness = seen_at; stale ads filtered by sourcing_listing_feed.';

-- 2. Listing feed: recommended models -> live lots cheaper than the buy target,
--    ranked by per-unit profit, freshness-gated. Mirrors sourcing_signal_feed's
--    anon-SELECT posture (view runs with owner rights; base table RLS-closed).
create or replace view public.sourcing_listing_feed as
select
  l.id,
  l.model_key,
  m.display_name,
  m.family,
  l.url,
  l.price_rub,
  l.title,
  l.seen_at,
  s.resale_median_rub,
  s.target_buy_price_rub,
  s.our_costs_rub,
  (s.resale_median_rub - l.price_rub - coalesce(s.our_costs_rub, 0))::numeric as unit_profit_rub,
  s.is_hot,
  row_number() over (
    partition by l.model_key
    order by (s.resale_median_rub - l.price_rub - coalesce(s.our_costs_rub, 0)) desc, l.seen_at desc
  ) as profit_rank
from public.avito_listing l
join public.sourcing_signal s on s.model_key = l.model_key
join public.models          m on m.model_key = l.model_key
where s.is_recommended = true
  and s.target_buy_price_rub is not null
  and l.price_rub <= s.target_buy_price_rub
  and l.seen_at >= now() - interval '48 hours';   -- freshness window (parser runs ~daily)

comment on view public.sourcing_listing_feed is
  'GST-61: live Avito lots for recommended models, price<=target_buy, ranked by unit_profit, seen within 48h. anon-SELECTable read-model for Telegram/cabinet.';

grant select on public.sourcing_listing_feed to anon, authenticated;

-- Defense-in-depth (migration gst61_lock_avito_listing_base_table): close the base
-- table to anon/authenticated entirely. RLS already returns 0 rows to them, but this
-- also removes avito_listing from the GraphQL schema. Reads go ONLY through the view.
revoke all on public.avito_listing from anon, authenticated;
