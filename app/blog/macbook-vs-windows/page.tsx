import type { Metadata } from 'next';
import MacbookVsWindows from '@/views/blog/MacbookVsWindows';

export const metadata: Metadata = {
  title: 'MacBook vs Windows — что выбрать',
  description: 'Сравнение MacBook и Windows-ноутбуков. Плюсы и минусы каждой платформы.',
  alternates: { canonical: '/blog/macbook-vs-windows' },
};

export default function MacbookVsWindowsPage() {
  return <MacbookVsWindows />;
}
