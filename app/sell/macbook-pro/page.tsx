import type { Metadata } from 'next';
import SellSeries from '@/views/sell/SellSeries';
import SellMacbookProSeo from '@/components/seo/SellMacbookProSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп MacBook Pro в Москве дорого — цены сегодня (14/16, M1–M5) | BestMac',
  description: 'Выкуп MacBook Pro 13/14/16 (M1–M5, Pro и Max) в Москве до 80% от рынка. Таблица цен обновляется ежедневно по объявлениям Авито. Оценка за 30 секунд, деньги сразу.',
  alternates: { canonical: '/sell/macbook-pro' },
};

export default async function SellMacbookProPage() {
  const data = await loadAvitoPricesServer();
  return (
    <>
      <SellSeries series="pro" />
      {data && <SellMacbookProSeo data={data} />}
    </>
  );
}
