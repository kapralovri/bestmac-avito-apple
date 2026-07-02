import type { Metadata } from 'next';
import SellMacMini from '@/views/sell/SellMacMini';
import SellMacMiniSeo from '@/components/seo/SellMacMiniSeo';
import { loadAvitoPricesServer } from '@/lib/server-prices';

export const metadata: Metadata = {
  title: 'Выкуп Mac mini в Москве дорого — цены сегодня | BestMac',
  description: 'Выкуп Mac mini (M1, M2, M4) в Москве до 80% от рынка. Цены обновляются ежедневно по объявлениям Авито. Оценка онлайн за 30 секунд, деньги сразу.',
  alternates: { canonical: '/sell/mac-mini' },
};

export default async function SellMacMiniPage() {
  const data = await loadAvitoPricesServer();
  return (
    <>
      <SellMacMini />
      {data && <SellMacMiniSeo data={data} />}
    </>
  );
}
