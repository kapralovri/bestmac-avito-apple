import type { Metadata } from 'next';
import SellBroken from '@/views/sell/SellBroken';

export const metadata: Metadata = {
  title: 'Продать сломанный макбук — скупка неисправных MacBook в Москве',
  description: 'Продать сломанный макбук в Москве: разбитый экран, после залития, не включается, на запчасти. Оценка по фото за 15 минут, оплата сразу.',
  alternates: { canonical: '/sell/broken' },
};

export default function SellBrokenPage() {
  return <SellBroken />;
}
