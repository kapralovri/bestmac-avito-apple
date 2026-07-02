import type { Metadata } from 'next';
import MoskvaIndex from '@/views/geo/MoskvaIndex';

export const metadata: Metadata = {
  title: 'Скупка MacBook по районам Москвы — выезд в день обращения | BestMac',
  description: 'Выездная скупка MacBook по всем районам Москвы и ближнего Подмосковья: Дорогомилово, ЦАО, Химки, Мытищи. Приедем в день обращения, оценка на месте, деньги сразу.',
  alternates: { canonical: '/moskva' },
};

export default function MoskvaIndexPage() {
  return <MoskvaIndex />;
}
