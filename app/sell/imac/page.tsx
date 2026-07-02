import type { Metadata } from 'next';
import SellImac from '@/views/sell/SellImac';
import SellImacSeo from '@/components/seo/SellImacSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп iMac в Москве дорого — цены сегодня, выезд и вывоз | BestMac',
  description: 'Выкуп iMac 24 (M1–M4) и iMac 27 в Москве. Цены обновляются ежедневно по объявлениям Авито. Сами приедем, упакуем и вывезем — деньги сразу.',
  alternates: { canonical: '/sell/imac' },
};

export default async function SellImacPage() {
  const data = await loadAvitoPricesServer();
  return (
    <>
      <SellImac />
      {data && <SellImacSeo data={data} />}
    </>
  );
}
