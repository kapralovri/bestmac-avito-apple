import type { VercelRequest, VercelResponse } from '@vercel/node';
import { estimatePrice } from '../util/estimate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  // Загружаем данные из публичного ассета, чтобы не зависеть от includeFiles
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || 'bestmac.ru';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  let data: any[] = [];
  try {
    const r = await fetch(`${proto}://${host}/data/buyout.json`);
    if (r.ok) data = await r.json() as any[];
  } catch { }
  const result = estimatePrice(req.body || {}, data || []);
  res.status(200).json(result);
}
