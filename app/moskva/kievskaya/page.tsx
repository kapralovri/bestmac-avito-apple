import type { Metadata } from 'next';
import GeoKievskaya from '@/views/geo/Kievskaya';

export const metadata: Metadata = {
  title: 'MacBook у метро Киевская',
  description: 'Купить и продать MacBook у метро Киевская. Офис BestMac в 5 минутах от метро.',
  alternates: { canonical: '/moskva/kievskaya' },
};

export default function GeoKievskayaPage() {
  return <GeoKievskaya />;
}
