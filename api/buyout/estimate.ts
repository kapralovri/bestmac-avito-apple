import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { estimatePrice } from '../util/estimate';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const dataPath = path.join(process.cwd(), 'public', 'data', 'buyout.json');
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf-8')) : [];
  const result = estimatePrice(req.body || {}, data);
  res.status(200).json(result);
}

