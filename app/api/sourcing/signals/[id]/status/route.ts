import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GST-49 / GST-28: manual status transition for a sourcing signal.
// Founder-driven only — NO auto-purchase. Delegates to the guarded RPC
// public.set_sourcing_signal_status, which enforces the legal transition graph:
//   new          -> acknowledged | dismissed
//   acknowledged -> acted        | dismissed
// Illegal transition -> 409 illegal_transition; unknown id -> 404.

const ALLOWED = new Set(['acknowledged', 'dismissed', 'acted']);

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = db();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
  }

  let body: { status?: unknown };
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const next = typeof body.status === 'string' ? body.status : '';
  if (!ALLOWED.has(next)) {
    return NextResponse.json({ ok: false, error: 'bad_status' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('set_sourcing_signal_status', {
    p_signal_id: id,
    p_next: next,
  });

  if (error) {
    const msg = error.message || '';
    if (/illegal .* transition/i.test(msg)) {
      return NextResponse.json({ ok: false, error: 'illegal_transition' }, { status: 409 });
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: 'rpc_failed', detail: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: data ?? next });
}
