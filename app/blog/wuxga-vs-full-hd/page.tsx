import type { Metadata } from 'next';
import WuxgaVsFullHd from '@/views/blog/WuxgaVsFullHd';

export const metadata: Metadata = {
  title: 'WUXGA или Full HD: в чём разница для монитора 24 дюйма',
  description:
    'Чем WUXGA 1920×1200 (16:10) отличается от Full HD 1920×1080 (16:9) и какой монитор выбрать для работы с кодом, таблицами и документами.',
  alternates: { canonical: '/blog/wuxga-vs-full-hd' },
};

export default function WuxgaVsFullHdPage() {
  return <WuxgaVsFullHd />;
}
