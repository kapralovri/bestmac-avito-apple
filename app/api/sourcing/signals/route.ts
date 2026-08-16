import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GST-49 / GST-28: read-only feed of demand-driven sourcing signals ("докупать").
// Data comes from the sourcing engine (scripts/sourcing/build-signals.mjs) via the
// public.sourcing_signal_feed view. Server-side only — uses the service role key.

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const supabase = db();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
  }

  // ?recommended=1 → only actionable signals (default); ?all=1 → whole feed (cabinet).
  const url = new URL(req.url);
  const onlyRecommended = url.searchParams.get('all') !== '1';

  let query = supabase
    .from('sourcing_signal_feed')
    .select(
      'id, model_key, display_name, family, resale_median_rub, avito_buy_estimate_rub, target_buy_price_rub, expected_spread_rub, margin_threshold_rub, sample_size, demand_depth, expected_lead_time_days, is_hot, hotness_score, is_recommended, confidence, reason_code, status, computed_at',
    )
    .order('is_hot', { ascending: false })
    .order('expected_spread_rub', { ascending: false, nullsFirst: false });

  if (onlyRecommended) query = query.eq('is_recommended', true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed', detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: data?.length ?? 0, signals: data ?? [] });
}
