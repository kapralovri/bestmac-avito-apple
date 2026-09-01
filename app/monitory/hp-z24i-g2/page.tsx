import type { Metadata } from 'next';
import HpZ24iG2 from '@/views/monitors/HpZ24iG2';

export const metadata: Metadata = {
  title: 'HP Z24i G2 б/у купить в Москве — 24" WUXGA 1920×1200, самовывоз',
  description:
    'Купить б/у монитор HP Z24i G2 24" IPS 1920×1200 (WUXGA, формат 16:10) в Москве. 25 шт в наличии, опт от 3 шт — 7 000 ₽. Самовывоз м. Киевская, проверка на месте.',
  alternates: { canonical: '/monitory/hp-z24i-g2' },
  openGraph: {
    title: 'Монитор HP Z24i G2 24" IPS 1920×1200 (WUXGA) — б/у, самовывоз',
    description:
      'Формат 16:10 — больше рабочей высоты, чем у Full HD. 25 шт в наличии, опт от 3 шт.',
    images: ['/images/monitors/hp-z24i-g2.jpg'],
    url: 'https://bestmac.ru/monitory/hp-z24i-g2',
  },
};

export default function HpZ24iG2Page() {
  return <HpZ24iG2 />;
}
