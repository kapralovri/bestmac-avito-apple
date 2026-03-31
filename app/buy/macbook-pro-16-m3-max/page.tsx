import type { Metadata } from 'next';
import MacbookPro16M3Max from '@/views/longtail/MacbookPro16M3Max';

export const metadata: Metadata = {
  title: 'Купить MacBook Pro 16 M3 Max б/у в Москве | BestMac',
  description: 'MacBook Pro 16 M3 Max б/у с гарантией. Проверенные устройства.',
  alternates: { canonical: '/buy/macbook-pro-16-m3-max' },
};

export default function MacbookPro16M3MaxPage() {
  return <MacbookPro16M3Max />;
}
