import type { Metadata } from 'next';
import MacbookBrokenScreen from '@/views/longtail/MacbookBrokenScreen';

export const metadata: Metadata = {
  title: 'Продать MacBook с разбитым экраном',
  description: 'Выкуп MacBook с разбитым экраном в Москве. Оценка и выкуп на месте.',
  alternates: { canonical: '/sell/macbook-broken-screen' },
};

export default function MacbookBrokenScreenPage() {
  return <MacbookBrokenScreen />;
}
