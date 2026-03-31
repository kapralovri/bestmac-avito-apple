import type { Metadata } from 'next';
import Sell from '@/views/Sell';

export const metadata: Metadata = {
  title: 'Продать MacBook в Москве дорого | Скупка макбуков б/у — BestMac',
  description: 'Выкуп Apple MacBook (Pro, Air) за 30 минут. Онлайн-калькулятор оценки стоимости по рынку. Платим наличными или на карту. Скупка старых и сломанных макбуков в Москве.',
  alternates: { canonical: '/sell' },
  keywords: 'продать macbook, скупка macbook москва, продать макбук дорого, скупка apple macbook, где продать macbook, выкуп macbook бу',
};

export default function SellPage() {
  return <Sell />;
}
