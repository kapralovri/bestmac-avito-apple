import { readFile } from 'fs/promises';
import path from 'path';
import type { AvitoPricesData } from '@/types/avito-prices';

/**
 * Серверное чтение базы цен (только для серверных компонентов/страниц).
 * Данные попадают в SSR-HTML при сборке; каждый пуш парсера/коллектора
 * перевыкатывает сайт на Vercel — HTML всегда со свежими ценами.
 */
export async function loadAvitoPricesServer(): Promise<AvitoPricesData | null> {
  try {
    const filePath = path.join(process.cwd(), 'public/data/avito-prices.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as AvitoPricesData;
  } catch {
    return null;
  }
}
