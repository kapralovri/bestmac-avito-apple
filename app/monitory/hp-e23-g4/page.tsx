import type { Metadata } from 'next';
import HpE23G4 from '@/views/monitors/HpE23G4';

export const metadata: Metadata = {
  title: 'HP E23 G4 б/у — 23" Full HD IPS, недорого, Москва',
  description:
    'Купить б/у монитор HP E23 G4 23" IPS Full HD в Москве. 3 шт в наличии, от 6 500 ₽ — самый доступный монитор в линейке. Полная эргономика, USB-хаб, VGA.',
  alternates: { canonical: '/monitory/hp-e23-g4' },
  openGraph: {
    title: 'Монитор HP E23 G4 23" IPS Full HD — б/у, недорого',
    description: 'Самый доступный монитор линейки. Полная эргономика, USB-хаб, VGA. 3 шт в наличии.',
    images: ['/images/monitors/hp-e23-g4.jpg'],
    url: 'https://bestmac.ru/monitory/hp-e23-g4',
  },
};

export default function HpE23G4Page() {
  return <HpE23G4 />;
}
