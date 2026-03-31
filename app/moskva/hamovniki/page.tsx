import type { Metadata } from 'next';
import GeoHamovniki from '@/views/geo/Hamovniki';

export const metadata: Metadata = {
  title: 'MacBook в Хамовниках — BestMac',
  description: 'Купить и продать MacBook в Хамовниках. BestMac рядом с вами.',
  alternates: { canonical: '/moskva/hamovniki' },
};

export default function GeoHamovnikiPage() {
  return <GeoHamovniki />;
}
