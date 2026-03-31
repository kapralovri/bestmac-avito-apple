import type { Metadata } from 'next';
import Pickup from '@/views/Pickup';

export const metadata: Metadata = {
  title: 'Самовывоз — BestMac',
  description: 'Как добраться до офиса BestMac. Адрес: Москва, ул. Дениса Давыдова 3, м. Киевская.',
  alternates: { canonical: '/pickup' },
};

export default function PickupPage() {
  return <Pickup />;
}
