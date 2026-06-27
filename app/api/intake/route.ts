import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// HTTPS-фронт для домашнего расширения: принимает карточки Avito и форвардит
// на VPS intake-сервер (он не имеет TLS). Токен-авторизация + CORS для расширения.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-intake-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-intake-token') || '';
  if (!process.env.INTAKE_TOKEN || token !== process.env.INTAKE_TOKEN) {
    return NextResponse.json({ ok: false, error: 'token' }, { status: 403, headers: CORS });
  }
  const vps = process.env.INTAKE_VPS_URL; // напр. http://84.54.28.114:8787/intake
  if (!vps) {
    return NextResponse.json({ ok: false, error: 'no vps url' }, { status: 500, headers: CORS });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'json' }, { status: 400, headers: CORS });
  }
  try {
    const r = await fetch(vps, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-token': token },
      body: JSON.stringify(body),
      // короткий таймаут, чтобы не висеть
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({ ok: true }));
    return NextResponse.json(j, { status: r.status, headers: CORS });
  } catch {
    return NextResponse.json({ ok: false, error: 'forward' }, { status: 502, headers: CORS });
  }
}
