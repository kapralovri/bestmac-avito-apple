import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import Sell from '@/views/Sell';
import SellPricesSeo from '@/components/SellPricesSeo';
import type { AvitoPricesData } from '@/types/avito-prices';

export const metadata: Metadata = {
  title: 'Выкуп MacBook в Москве дорого — оценка онлайн за 30 секунд | BestMac',
  description:
    'Выкуп MacBook (Air, Pro), iMac и Mac mini в Москве до 80% от рынка. Цены обновляются ежедневно по 3000+ объявлениям Авито. Онлайн-калькулятор, деньги за 30 минут, выезд по Москве.',
  alternates: { canonical: '/sell' },
};

// Цены читаются на сервере при сборке: контент и таблицы попадают в SSR-HTML.
// Файл public/data/avito-prices.json обновляется ежедневно (парсер + коллектор),
// каждый пуш перевыкатывает сайт на Vercel — данные в HTML всегда свежие.
async function loadPrices(): Promise<AvitoPricesData | null> {
  try {
    const filePath = path.join(process.cwd(), 'public/data/avito-prices.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as AvitoPricesData;
  } catch {
    return null; // калькулятор дозагрузит данные на клиенте (фолбэк)
  }
}

export default async function SellPage() {
  const data = await loadPrices();
  return (
    <>
      <Sell initialData={data} />
      {data && <SellPricesSeo data={data} />}
    </>
  );
}
