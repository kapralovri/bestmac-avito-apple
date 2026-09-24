import type { Metadata } from 'next';
import SellSeries from '@/views/sell/SellSeries';
import SellMacbookAirSeo from '@/components/seo/SellMacbookAirSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import FamilyModelLinks from '@/components/sell/FamilyModelLinks';

export const metadata: Metadata = {
  title: 'Продать макбук эйр в Москве — скупка MacBook Air, цены сегодня',
  description: 'Продать макбук эйр (MacBook Air 13 и 15, M1–M4) в Москве до 80% от рынка. Таблица цен обновляется ежедневно по объявлениям Авито. Оценка за 30 секунд, деньги сразу.',
  alternates: { canonical: '/sell/macbook-air' },
};

export default async function SellMacbookAirPage() {
  const data = await loadAvitoPricesServer();
  return (
    <>
      <SellSeries series="air" />
      <FamilyModelLinks family="MacBook Air" />
      {data && <SellMacbookAirSeo data={data} />}
    </>
  );
}
