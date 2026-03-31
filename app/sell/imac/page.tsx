import type { Metadata } from 'next';
import SellImac from '@/views/sell/SellImac';

export const metadata: Metadata = {
  title: 'Продать iMac в Москве — выкуп iMac',
  description: 'Продать iMac в Москве быстро и дорого. Моментальная оценка, оплата наличными.',
  alternates: { canonical: '/sell/imac' },
};

export default function SellImacPage() {
  return <SellImac />;
}
