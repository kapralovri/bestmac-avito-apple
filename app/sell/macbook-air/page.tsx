import type { Metadata } from 'next';
import SellSeries from '@/views/sell/SellSeries';

export const metadata: Metadata = {
  title: 'Продать MacBook Air в Москве — выкуп MacBook Air | BestMac',
  description: 'Продать MacBook Air в Москве дорого. Выкуп всех моделей MacBook Air: M1, M2, M3, M4. Моментальная оценка.',
  alternates: { canonical: '/sell/macbook-air' },
};

export default function SellMacbookAirPage() {
  return <SellSeries series="air" />;
}
