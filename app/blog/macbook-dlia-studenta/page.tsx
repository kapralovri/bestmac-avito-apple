import type { Metadata } from 'next';
import MacbookDliaStudenta from '@/views/blog/MacbookDliaStudenta';

export const metadata: Metadata = {
  title: 'MacBook для студента — какой выбрать',
  description: 'Лучшие модели MacBook для учёбы. Советы по выбору для студентов.',
  alternates: { canonical: '/blog/macbook-dlia-studenta' },
};

export default function MacbookDliaStudentaPage() {
  return <MacbookDliaStudenta />;
}
