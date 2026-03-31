import type { Metadata } from 'next';
import Comparison from '@/views/Comparison';

export const metadata: Metadata = {
  title: 'Сравнение моделей MacBook — Air vs Pro',
  description: 'Сравните MacBook Air и MacBook Pro. Подробное сравнение характеристик, цен и возможностей.',
  alternates: { canonical: '/comparison' },
};

export default function ComparisonPage() {
  return <Comparison />;
}
