import { NextRequest, NextResponse } from 'next/server';
import { estimatePrice } from '../../../../api/util/estimate';

export async function POST(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'bestmac.ru';
  const proto = request.headers.get('x-forwarded-proto') || 'https';

  let data: any[] = [];
  try {
    const r = await fetch(`${proto}://${host}/data/buyout.json`);
    if (r.ok) data = await r.json() as any[];
  } catch { }

  const body = await request.json().catch(() => ({}));
  const result = estimatePrice(body, data || []);
  return NextResponse.json(result);
}
