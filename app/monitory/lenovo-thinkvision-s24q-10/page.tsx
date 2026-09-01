import type { Metadata } from 'next';
import LenovoS24q10 from '@/views/monitors/LenovoS24q10';

export const metadata: Metadata = {
  title: 'Lenovo ThinkVision S24q-10 б/у — 23.8" QHD, купить в Москве',
  description:
    'Купить б/у монитор Lenovo ThinkVision S24q-10 23.8" IPS 2560×1440 (QHD) в Москве. 5 шт в наличии, 7 500 ₽. Тонкие рамки, самовывоз, проверка при получении.',
  alternates: { canonical: '/monitory/lenovo-thinkvision-s24q-10' },
  openGraph: {
    title: 'Монитор Lenovo ThinkVision S24q-10 23.8" IPS QHD — б/у',
    description: 'QHD 2560×1440, тонкие рамки. 5 шт в наличии, 7 500 ₽. Самовывоз в Москве.',
    images: ['/images/monitors/lenovo-s24q-10.jpg'],
    url: 'https://bestmac.ru/monitory/lenovo-thinkvision-s24q-10',
  },
};

export default function LenovoS24q10Page() {
  return <LenovoS24q10 />;
}
