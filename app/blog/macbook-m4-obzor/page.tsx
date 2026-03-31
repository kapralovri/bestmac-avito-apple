import type { Metadata } from 'next';
import MacbookM4Obzor from '@/views/blog/MacbookM4Obzor';

export const metadata: Metadata = {
  title: 'Обзор MacBook M4 — стоит ли покупать | BestMac',
  description: 'Подробный обзор MacBook с чипом M4. Характеристики, тесты, цены.',
  alternates: { canonical: '/blog/macbook-m4-obzor' },
};

export default function MacbookM4ObzorPage() {
  return <MacbookM4Obzor />;
}
