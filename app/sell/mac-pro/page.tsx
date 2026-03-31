import type { Metadata } from 'next';
import SellMacPro from '@/views/sell/SellMacPro';

export const metadata: Metadata = {
  title: 'Продать Mac Pro в Москве — выкуп Mac Pro | BestMac',
  description: 'Продать Mac Pro в Москве. Оценка стоимости, быстрый выкуп.',
  alternates: { canonical: '/sell/mac-pro' },
};

export default function SellMacProPage() {
  return <SellMacPro />;
}
