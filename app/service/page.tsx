import type { Metadata } from 'next';
import Service from '@/views/Service';

export const metadata: Metadata = {
  title: 'Сервис и ремонт MacBook в Москве',
  description: 'Диагностика и ремонт MacBook в Москве. Замена экрана, клавиатуры, батареи. Гарантия на работы.',
  alternates: { canonical: '/service' },
};

export default function ServicePage() {
  return <Service />;
}
