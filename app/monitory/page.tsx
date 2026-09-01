import type { Metadata } from 'next';
import MonitoryHub from '@/views/monitors/MonitoryHub';

export const metadata: Metadata = {
  title: 'Б/у мониторы HP, Lenovo в Москве — купить с самовывозом',
  description:
    'Купить б/у монитор HP или Lenovo в Москве. IPS, Full HD/QHD/WUXGA, проверка при получении, без предоплаты. Самовывоз м. Киевская. Опт от 3 шт.',
  alternates: { canonical: '/monitory' },
  openGraph: {
    title: 'Б/у мониторы HP и Lenovo — самовывоз в Москве',
    description:
      'Проверенные офисные мониторы HP и Lenovo бу. Full HD, QHD, WUXGA. Самовывоз в Москве, без предоплаты.',
    images: ['/images/monitors/hero-monitors.jpg'],
    url: 'https://bestmac.ru/monitory',
  },
};

export default function MonitoryPage() {
  return <MonitoryHub />;
}
