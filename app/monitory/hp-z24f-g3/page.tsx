import type { Metadata } from 'next';
import HpZ24fG3 from '@/views/monitors/HpZ24fG3';

export const metadata: Metadata = {
  title: 'HP Z24f G3 б/у купить — 23.8" Full HD IPS, самовывоз Москва',
  description:
    'Купить б/у монитор HP Z24f G3 23.8" IPS Full HD в Москве. Единственный экземпляр, 9 000 ₽ (новый ~37 000 ₽). Алюминиевый корпус, daisy-chain DP, USB-хаб.',
  alternates: { canonical: '/monitory/hp-z24f-g3' },
  openGraph: {
    title: 'Монитор HP Z24f G3 23.8" IPS Full HD — б/у, самовывоз',
    description: 'Премиум Z-серия HP: алюминий, daisy-chain DP, USB-хаб. Единственный экземпляр.',
    images: ['/images/monitors/hp-z24f-g3.jpg'],
    url: 'https://bestmac.ru/monitory/hp-z24f-g3',
  },
};

export default function HpZ24fG3Page() {
  return <HpZ24fG3 />;
}
