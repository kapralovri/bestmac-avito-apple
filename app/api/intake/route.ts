import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// сравнение токена в постоянное время (паритет с hmac.compare_digest на VPS)
function tokenOk(got: string, want: string | undefined): boolean {
  if (!want) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
  // Тело читаем как текст и парсим вручную: расширение шлёт content-type text/plain,
  // чтобы запрос был «простым» (без CORS-preflight на старом Chrome).
  let body: { token?: unknown; cards?: unknown };
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'json' }, { status: 400, headers: CORS });
  }
  // токен из тела (простой запрос) или из заголовка (обратная совместимость)
  const token = (typeof body.token === 'string' ? body.token : '') || req.headers.get('x-intake-token') || '';
  if (!tokenOk(token, process.env.INTAKE_TOKEN)) {
    return NextResponse.json({ ok: false, error: 'token' }, { status: 403, headers: CORS });
  }
  const vps = process.env.INTAKE_VPS_URL; // напр. http://84.54.28.114:8787/intake
  if (!vps) {
    return NextResponse.json({ ok: false, error: 'no vps url' }, { status: 500, headers: CORS });
  }
  const cards = Array.isArray(body.cards) ? body.cards : [];
  try {
    const r = await fetch(vps, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-token': token },
      body: JSON.stringify({ cards }),
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({ ok: true }));
    return NextResponse.json(j, { status: r.status, headers: CORS });
  } catch {
    return NextResponse.json({ ok: false, error: 'forward' }, { status: 502, headers: CORS });
  }
}
