import type { Metadata } from 'next';
import MacbookPro14M3 from '@/views/longtail/MacbookPro14M3';

export const metadata: Metadata = {
  title: 'Купить MacBook Pro 14 M3 б/у в Москве | BestMac',
  description: 'MacBook Pro 14 M3 б/у с гарантией. Проверенные устройства в наличии.',
  alternates: { canonical: '/buy/macbook-pro-14-m3' },
};

export default function MacbookPro14M3Page() {
  return <MacbookPro14M3 />;
}
