import type { Metadata } from 'next';
import Sell from '@/views/Sell';

export const metadata: Metadata = {
  title: 'Продать MacBook в Москве дорого | Скупка макбуков б/у',
  description: 'Выкуп Apple MacBook (Pro, Air) за 30 минут. Онлайн-калькулятор оценки стоимости по рынку. Платим наличными или на карту. Скупка старых и сломанных макбуков в Москве.',
  alternates: { canonical: '/sell' },
};

export default function SellPage() {
  return <Sell />;
}
