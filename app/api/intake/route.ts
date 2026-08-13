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
// на VPS intake-сервер. Токен-авторизация (заголовок x-intake-token) + CORS,
// сужённый до origin страницы, где работает расширение (по умолчанию avito.ru).

// Расширение шлёт карточки из content-script на странице поиска Avito, поэтому
// Origin запроса = origin этой страницы (https://www.avito.ru). Держим allowlist
// в env, чтобы менять без релиза; по умолчанию — оба хоста Avito.
const DEFAULT_ORIGINS = 'https://www.avito.ru,https://m.avito.ru';
const ALLOWED_ORIGINS = new Set(
  (process.env.INTAKE_ALLOWED_ORIGINS || DEFAULT_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

// CORS-заголовки под конкретный Origin: отражаем его только если он в allowlist,
// иначе не ставим Access-Control-Allow-Origin (браузер заблокирует чтение ответа).
// Vary: Origin — чтобы CDN не закэшировал ответ одного origin для другого.
function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-intake-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get('origin'));
  // Тело читаем как текст и парсим вручную: расширение может слать content-type
  // text/plain (простой запрос), поэтому не полагаемся на req.json().
  let body: { cards?: unknown };
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'json' }, { status: 400, headers: cors });
  }
  // Токен — только из заголовка поверх HTTPS (из тела больше не читаем: P0-3).
  const token = req.headers.get('x-intake-token') || '';
  if (!tokenOk(token, process.env.INTAKE_TOKEN)) {
    return NextResponse.json({ ok: false, error: 'token' }, { status: 403, headers: cors });
  }
  const vps = process.env.INTAKE_VPS_URL; // напр. https://intake.bestmac.ru/intake
  if (!vps) {
    return NextResponse.json({ ok: false, error: 'no vps url' }, { status: 500, headers: cors });
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
    return NextResponse.json(j, { status: r.status, headers: cors });
  } catch {
    return NextResponse.json({ ok: false, error: 'forward' }, { status: 502, headers: cors });
  }
}
