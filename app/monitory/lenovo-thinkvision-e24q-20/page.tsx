import type { Metadata } from 'next';
import LenovoE24q20 from '@/views/monitors/LenovoE24q20';

export const metadata: Metadata = {
  title: 'Lenovo ThinkVision E24q-20 б/у — 23.8" QHD с регулировкой высоты',
  description:
    'Купить б/у монитор Lenovo ThinkVision E24q-20 23.8" IPS 2560×1440 (QHD) в Москве. Осталось всего 2 шт, 10 000 ₽. Полная эргономика: высота, pivot, встроенные колонки.',
  alternates: { canonical: '/monitory/lenovo-thinkvision-e24q-20' },
  openGraph: {
    title: 'Монитор Lenovo ThinkVision E24q-20 23.8" IPS QHD — б/у, pivot',
    description: 'QHD + полная эргономика: высота до 155 мм, pivot, колонки. Осталось 2 шт.',
    images: ['/images/monitors/lenovo-e24q-20.jpg'],
    url: 'https://bestmac.ru/monitory/lenovo-thinkvision-e24q-20',
  },
};

export default function LenovoE24q20Page() {
  return <LenovoE24q20 />;
}
