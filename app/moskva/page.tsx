import type { Metadata } from 'next';
import MoskvaIndex from '@/views/geo/MoskvaIndex';

export const metadata: Metadata = {
  title: 'Скупка и продажа MacBook в Москве | BestMac',
  description: 'BestMac — скупка и продажа MacBook в Москве. Все районы: Дорогомилово, Киевская, ЦАО.',
  alternates: { canonical: '/moskva' },
};

export default function MoskvaIndexPage() {
  return <MoskvaIndex />;
}
