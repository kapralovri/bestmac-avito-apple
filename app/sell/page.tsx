import type { Metadata } from 'next';
import Sell from '@/views/Sell';
import SellPricesSeo from '@/components/SellPricesSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп MacBook в Москве дорого — оценка онлайн за 30 секунд | BestMac',
  description:
    'Выкуп MacBook (Air, Pro), iMac и Mac mini в Москве до 80% от рынка. Цены обновляются ежедневно по 3000+ объявлениям Авито. Онлайн-калькулятор, деньги за 30 минут, выезд по Москве.',
  alternates: { canonical: '/sell' },
};

export default async function SellPage() {
  // При null калькулятор дозагрузит данные на клиенте (фолбэк)
  const data = await loadAvitoPricesServer();
  return (
    <>
      <Sell initialData={data} />
      {data && <SellPricesSeo data={data} />}
    </>
  );
}
