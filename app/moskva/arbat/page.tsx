import type { Metadata } from 'next';
import GeoArbat from '@/views/geo/Arbat';

export const metadata: Metadata = {
  title: 'MacBook на Арбате — BestMac',
  description: 'Купить и продать MacBook рядом с Арбатом. BestMac — 10 минут пешком.',
  alternates: { canonical: '/moskva/arbat' },
};

export default function GeoArbatPage() {
  return <GeoArbat />;
}
