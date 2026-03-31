import type { Metadata } from 'next';
import SellMacMini from '@/views/sell/SellMacMini';

export const metadata: Metadata = {
  title: 'Продать Mac Mini в Москве — выкуп Mac Mini',
  description: 'Продать Mac Mini в Москве. Моментальная оценка, оплата на месте.',
  alternates: { canonical: '/sell/mac-mini' },
};

export default function SellMacMiniPage() {
  return <SellMacMini />;
}
