import type { Metadata } from 'next';
import MacbookAirM2vsM3 from '@/views/blog/MacbookAirM2vsM3';

export const metadata: Metadata = {
  title: 'MacBook Air M2 vs M3 — сравнение',
  description: 'Подробное сравнение MacBook Air M2 и M3. Что выбрать?',
  alternates: { canonical: '/blog/macbook-air-m2-vs-m3' },
};

export default function MacbookAirM2vsM3Page() {
  return <MacbookAirM2vsM3 />;
}
