import type { Metadata } from 'next';
import SellSeries from '@/views/sell/SellSeries';

export const metadata: Metadata = {
  title: 'Продать MacBook Pro в Москве — выкуп MacBook Pro',
  description: 'Продать MacBook Pro в Москве дорого. Выкуп всех моделей MacBook Pro: M1, M2, M3, M4. Моментальная оценка.',
  alternates: { canonical: '/sell/macbook-pro' },
};

export default function SellMacbookProPage() {
  return <SellSeries series="pro" />;
}
