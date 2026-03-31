import type { Metadata } from 'next';
import KakProdatMacbookVygodno from '@/views/blog/KakProdatMacbookVygodno';

export const metadata: Metadata = {
  title: 'Как продать MacBook выгодно | BestMac',
  description: 'Советы как продать MacBook по лучшей цене. Подготовка, оценка стоимости.',
  alternates: { canonical: '/blog/kak-prodat-macbook-vygodno' },
};

export default function KakProdatMacbookVygodnoPage() {
  return <KakProdatMacbookVygodno />;
}
