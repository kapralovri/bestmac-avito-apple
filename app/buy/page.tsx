import type { Metadata } from 'next';
import Buy from '@/views/Buy';

export const metadata: Metadata = {
  title: 'Купить MacBook б/у в Москве — техника Apple с гарантией',
  description: 'Купить MacBook б/у в Москве в районах Дорогомилово, Киевская, ЦАО. Большой выбор техники Apple с гарантией.',
  alternates: { canonical: '/buy' },
};

export default function BuyPage() {
  return <Buy />;
}
