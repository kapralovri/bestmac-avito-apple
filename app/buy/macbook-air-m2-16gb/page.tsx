import type { Metadata } from 'next';
import MacbookAirM2Buy from '@/views/longtail/MacbookAirM2Buy';

export const metadata: Metadata = {
  title: 'Купить MacBook Air M2 16GB б/у в Москве | BestMac',
  description: 'MacBook Air M2 16GB б/у с гарантией. Проверенные устройства в наличии.',
  alternates: { canonical: '/buy/macbook-air-m2-16gb' },
};

export default function MacbookAirM2BuyPage() {
  return <MacbookAirM2Buy />;
}
