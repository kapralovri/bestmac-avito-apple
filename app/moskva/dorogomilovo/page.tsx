import type { Metadata } from 'next';
import GeoDorogomilovo from '@/views/geo/Dorogomilovo';

export const metadata: Metadata = {
  title: 'MacBook в Дорогомилово — BestMac',
  description: 'Купить и продать MacBook в районе Дорогомилово. Офис BestMac на ул. Дениса Давыдова.',
  alternates: { canonical: '/moskva/dorogomilovo' },
};

export default function GeoDorogomilovoPage() {
  return <GeoDorogomilovo />;
}
