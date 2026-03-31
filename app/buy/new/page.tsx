import type { Metadata } from 'next';
import BuyNew from '@/views/BuyNew';

export const metadata: Metadata = {
  title: 'Новая техника Apple — MacBook, iPhone, iMac | BestMac',
  description: 'Купить новую технику Apple по конкурентным ценам. MacBook Air M4, MacBook Pro, iMac, iPhone. Официальные поставки с гарантией.',
  alternates: { canonical: '/buy/new' },
};

export default function BuyNewPage() {
  return <BuyNew />;
}
