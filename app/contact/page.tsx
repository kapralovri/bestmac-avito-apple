import type { Metadata } from 'next';
import Contact from '@/views/Contact';

export const metadata: Metadata = {
  title: 'Контакты — Москва, Дорогомилово',
  description: 'Контакты BestMac. Адрес: Москва, ул. Дениса Давыдова 3. Телефон, Telegram, карта проезда.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <Contact />;
}
