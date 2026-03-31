import type { Metadata } from 'next';
import SellBroken from '@/views/sell/SellBroken';

export const metadata: Metadata = {
  title: 'Продать сломанный MacBook — выкуп нерабочих',
  description: 'Выкупаем сломанные MacBook в любом состоянии. Честная оценка, оплата сразу.',
  alternates: { canonical: '/sell/broken' },
};

export default function SellBrokenPage() {
  return <SellBroken />;
}
