import type { Metadata } from 'next';
import KakVybratMacbook2024 from '@/views/blog/KakVybratMacbook2024';

export const metadata: Metadata = {
  title: 'Как выбрать MacBook в 2026 году — полный гид',
  description: 'Подробный гид по выбору MacBook. Сравнение Air и Pro, помощь в выборе.',
  alternates: { canonical: '/blog/kak-vybrat-macbook-2024' },
};

export default function KakVybratMacbook2024Page() {
  return <KakVybratMacbook2024 />;
}
