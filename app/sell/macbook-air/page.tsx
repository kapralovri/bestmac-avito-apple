import type { Metadata } from 'next';
import SellSeries from '@/views/sell/SellSeries';
import SellMacbookAirSeo from '@/components/seo/SellMacbookAirSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп MacBook Air в Москве дорого — цены сегодня (M1–M4) | BestMac',
  description: 'Выкуп MacBook Air 13 и 15 (M1, M2, M3, M4) в Москве до 80% от рынка. Таблица цен обновляется ежедневно по объявлениям Авито. Оценка за 30 секунд, деньги сразу.',
  alternates: { canonical: '/sell/macbook-air' },
};

export default async function SellMacbookAirPage() {
  const data = await loadAvitoPricesServer();
  return (
    <>
      <SellSeries series="air" />
      {data && <SellMacbookAirSeo data={data} />}
    </>
  );
}
