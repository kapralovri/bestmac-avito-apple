import type { Metadata } from 'next';
import Business from '@/views/Business';

export const metadata: Metadata = {
  title: 'Техника Apple для бизнеса — корпоративные поставки | BestMac',
  description: 'Техника Apple для юридических лиц с документами. Корпоративные поставки MacBook, iMac. Безналичный расчёт, договор, акты.',
  alternates: { canonical: '/business' },
};

export default function BusinessPage() {
  return <Business />;
}
